/**
 * OCR (光学字符识别) 路由
 * @description 使用阿里云千问VL-OCR模型进行图像文字识别 - 完全按照官方示例
 */

const express = require('express')
const axios = require('axios')
const multer = require('multer')
const sharp = require('sharp')
const fs = require('fs').promises
const path = require('path')
const logger = require('../config/logger')
const router = express.Router()

// 配置multer用于文件上传
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('只支持 JPEG, PNG, JPG, WebP 格式的图片'))
    }
  }
})

// DashScope配置 - 按照官方示例
const DASHSCOPE_CONFIG = {
  apiKey: process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || 'sk-a791758fe21c4a719b2c632d5345996f',
  baseURL: 'https://dashscope.aliyuncs.com',
  timeout: 120000, // 2分钟超时
  // 官方OCR模型
  model: 'qwen-vl-ocr-latest'
}

/**
 * @route   GET /api/ocr/status
 * @desc    获取OCR服务状态
 * @access  Public
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      ocr: 'qwen-vl-ocr-latest',
      status: 'online',
      provider: 'DashScope',
      features: [
        '数学题目识别',
        '手写文字识别', 
        '印刷文字识别',
        '图片自动旋转',
        '高精度OCR',
        '信息抽取'
      ],
      limits: {
        maxPixels: 6422528,
        minPixels: 3136,
        supportedFormats: ['JPEG', 'PNG', 'WebP'],
        maxFileSize: '10MB'
      }
    }
  })
})

/**
 * @route   GET /api/ocr/test  
 * @desc    简单的OCR测试接口
 * @access  Public
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: '官方OCR服务运行正常',
    config: {
      model: 'qwen-vl-ocr-latest',
      maxPixels: 6422528,
      minPixels: 3136,
      enableRotate: true,
      task: 'key_information_extraction'
    },
    timestamp: new Date().toISOString()
  })
})

/**
 * 🔑 核心OCR识别接口 - 优化版，提高识别准确率
 * POST /api/ocr/recognize
 */
router.post('/recognize', async (req, res) => {
  try {
    console.log('=== 🤖 增强OCR识别请求开始 ===')
    console.log('📨 完整请求体检查:', {
      hasBody: !!req.body,
      bodyType: typeof req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      contentType: req.headers['content-type']
    })
    
    const { imageData, format } = req.body
    
    console.log('🔍 详细数据检查:', {
      hasImageData: !!imageData,
      imageDataType: typeof imageData,
      imageDataLength: imageData ? imageData.length : 0,
      format: format,
      imageDataPreview: imageData ? imageData.substring(0, 50) + '...' : 'N/A'
    })
    
    if (!imageData) {
      console.error('❌ 缺少图片数据，请求体:', req.body)
      return res.status(400).json({
        success: false,
        error: '缺少图片数据'
      })
    }

    if (!imageData || imageData.length === 0) {
      console.error('❌ 图片数据为空')
      return res.status(400).json({
        success: false,
        error: '图片数据为空'
      })
    }

    console.log('📊 请求数据统计:', {
      format: format,
      dataSize: Math.round(imageData.length / 1024) + 'KB',
      model: DASHSCOPE_CONFIG.model
    })

    // 🎯 新增：可选的多题目分离预处理 (不影响现有功能)
    const { enableQuestionSplit } = req.body
    if (enableQuestionSplit === true) {
      console.log('🔍 [多题目分离] 启用题目分离模式...')
      
      try {
        // 步骤1：检测题目区域
        const questionRegions = await detectQuestionRegionsWithAliyun(imageData)
        
        if (questionRegions.length > 1) {
          console.log('📊 [多题目分离] 检测到', questionRegions.length, '个题目区域，开始分别处理...')
          
          // 步骤2：分别对每个区域进行OCR
          const regionOCRResults = []
          
          for (let i = 0; i < questionRegions.length; i++) {
            const region = questionRegions[i]
            console.log(`🔄 [多题目分离] 处理第${i + 1}个区域:`, region.region)
            
            try {
              // 针对特定区域的OCR prompt
              const regionPrompt = `你是一个专业的OCR识别专家。请仔细识别这张图片中${region.region === 'top_half' ? '上半部分' : region.region === 'bottom_half' ? '下半部分' : region.region === 'left_half' ? '左半部分' : region.region === 'right_half' ? '右半部分' : ''}的文字内容，特别注意：

1. 🔢 数学题目：请完整识别数学表达式、运算符号、数字
2. ✏️ 手写文字：请识别手写的数字、汉字和英文  
3. 📝 印刷文字：请识别印刷体文字内容
4. 🎯 重点关注：只识别${region.description || region.region}区域的内容，忽略其他区域

请输出这个区域的完整题目内容，如果该区域没有题目则输出"无题目"：`

              // 构建区域OCR请求
              const regionRequestData = {
                model: DASHSCOPE_CONFIG.model,
                input: {
                  messages: [
                    {
                      role: "system",
                      content: [{
                        text: "你是一个专业的OCR识别助手，专门识别图片特定区域的数学题目。"
                      }]
                    },
                    {
                      role: "user", 
                      content: [
                        {
                          image: imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`
                        },
                        {
                          text: regionPrompt
                        }
                      ]
                    }
                  ]
                },
                parameters: {
                  max_tokens: 1000,
                  temperature: 0.1,
                  image_params: {
                    min_pixels: 3136,
                    max_pixels: 6422528, 
                    enable_rotate: true,
                    max_image_width: 2048,
                    max_image_height: 2048
                  }
                }
              }

              // 发送区域OCR请求
              const regionResponse = await axios.post(
                `${DASHSCOPE_CONFIG.baseURL}/api/v1/services/aigc/multimodal-generation/generation`,
                regionRequestData,
                {
                  headers: {
                    'Authorization': `Bearer ${DASHSCOPE_CONFIG.apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  },
                  timeout: DASHSCOPE_CONFIG.timeout
                }
              )

              if (regionResponse.status === 200 && regionResponse.data?.output?.choices?.[0]?.message?.content) {
                const regionOcrText = regionResponse.data.output.choices[0].message.content
                
                // 过滤无效结果
                if (regionOcrText && regionOcrText.trim() !== '' && !regionOcrText.includes('无题目')) {
                  regionOCRResults.push({
                    success: true,
                    regionInfo: region,
                    data: {
                      ocrText: regionOcrText.trim(),
                      subject: detectSubject(regionOcrText),
                      grade: detectGrade(regionOcrText),
                      confidence: calculateConfidence(regionOcrText),
                      model: DASHSCOPE_CONFIG.model,
                      timestamp: new Date().toISOString()
                    }
                  })
                  
                  console.log(`✅ [多题目分离] 第${i + 1}个区域识别成功:`, regionOcrText.substring(0, 50) + '...')
                } else {
                  console.log(`⚠️ [多题目分离] 第${i + 1}个区域无有效内容`)
                }
              }
              
            } catch (regionError) {
              console.error(`❌ [多题目分离] 第${i + 1}个区域识别失败:`, regionError.message)
              regionOCRResults.push({
                success: false,
                regionInfo: region,
                error: regionError.message
              })
            }
          }
          
          // 步骤3：如果有成功的区域识别结果，返回合并结果
          if (regionOCRResults.some(result => result.success)) {
            console.log('🎉 [多题目分离] 多区域识别完成，返回分离结果')
            
            const mergedResult = mergeMultiRegionOCRResults(regionOCRResults)
            
            return res.json({
              success: true,
              data: mergedResult
            })
          } else {
            console.log('⚠️ [多题目分离] 所有区域识别失败，回退到原有流程')
          }
        } else {
          console.log('📊 [多题目分离] 只检测到1个题目区域，回退到原有流程')
        }
        
      } catch (multiQuestionError) {
        console.error('❌ [多题目分离] 预处理失败，回退到原有流程:', multiQuestionError.message)
      }
    }

    // 🔑 原有OCR流程（保持完全不变，确保向后兼容）
    console.log('🔄 [单题目OCR] 执行原有OCR流程...')

    // 🔑 使用增强的OCR提示词，提高识别准确率
    const enhancedPrompt = `你是一个专业的OCR识别专家。请仔细识别这张图片中的所有文字内容，特别注意：

1. 🔢 数学题目：请完整识别数学表达式、运算符号、数字
2. ✏️ 手写文字：请识别手写的数字、汉字和英文
3. 📝 印刷文字：请识别印刷体文字内容  
4. 📐 图形标注：注意几何图形中的标注文字
5. 📋 表格内容：如果有表格，请逐行识别

请按以下格式输出：
- 每行一个完整的题目或文本内容
- 保持数学表达式的完整性
- 如果是选择题，包含选项内容
- 忽略明显的噪点或无意义字符

开始识别：`

    // 🔑 构建增强的请求数据
    const requestData = {
      model: DASHSCOPE_CONFIG.model,
      
      input: {
        messages: [
          {
            role: "system",
            content: [
              {
                text: "你是一个专业的OCR识别助手，专门识别小学数学作业。请仔细识别图片中的文字内容，特别关注数学题目。"
              }
            ]
          },
                      {
              role: "user", 
              content: [
                {
                  // 🔑 使用完整的data URL格式
                  image: imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`
                },
                {
                  text: enhancedPrompt
                }
              ]
            }
        ]
      },
      
      // 🔑 优化参数配置
      parameters: {
        max_tokens: 2000,
        temperature: 0.1,  // 降低随机性，提高准确率
        // 添加图片处理参数
        image_params: {
          min_pixels: 3136,
          max_pixels: 6422528, 
          enable_rotate: true,
          max_image_width: 2048,
          max_image_height: 2048
        }
      }
    }

    console.log('📤 发送增强OCR请求到DashScope...')
    console.log('🎯 使用模型:', requestData.model)
    console.log('📊 请求大小:', Math.round(JSON.stringify(requestData).length / 1024) + 'KB')

    // 发送请求到DashScope
    const response = await axios.post(
      `${DASHSCOPE_CONFIG.baseURL}/api/v1/services/aigc/multimodal-generation/generation`,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: DASHSCOPE_CONFIG.timeout
      }
    )

    console.log('📥 DashScope响应状态:', response.status)
    console.log('📝 响应数据:', JSON.stringify(response.data, null, 2))

    if (response.status === 200 && response.data) {
      // 🔑 改进的结果解析
      const choice = response.data.output?.choices?.[0]
      if (choice && choice.message) {
        let ocrText = ''
        
        // 处理不同的响应格式
        if (typeof choice.message.content === 'string') {
          ocrText = choice.message.content
        } else if (Array.isArray(choice.message.content)) {
          // 提取文本内容
          const textContents = choice.message.content
            .filter(item => item.text)
            .map(item => item.text)
          ocrText = textContents.join('\n')
        } else if (choice.message.content?.text) {
          ocrText = choice.message.content.text
        }

        // 🔑 改进的文本处理
        // 🧹 首先清理OCR文本，移除干扰文字
        const cleanedOcrText = await cleanOcrText(ocrText)
        console.log('🧹 [单图OCR] 文本清理完成:', {
          原始长度: ocrText.length,
          清理后长度: cleanedOcrText.length,
          清理效果: cleanedOcrText.substring(0, 100) + '...'
        })
        
        const processedText = enhancedProcessOCRText(cleanedOcrText)
        
        // 🔑 智能检测学科和年级
        const detectedSubject = detectSubject(cleanedOcrText)
        const detectedGrade = detectGrade(cleanedOcrText)
        
        // 🎯 智能题目类型分类
        const questionClassification = classifyQuestionType(processedText, detectedSubject)
        
        console.log('✅ 增强OCR识别成功')
        console.log('📝 处理后识别结果:', processedText)
        console.log('🎓 检测到学科:', detectedSubject)
        console.log('📚 检测到年级:', detectedGrade)
        console.log('🎯 题目类型:', questionClassification.questionType.name)
        console.log('🚀 处理策略:', questionClassification.processingStrategy.method)

        return res.json({
          success: true,
          data: {
            ocrText: processedText,
            subject: detectedSubject,
            grade: detectedGrade,
            confidence: calculateConfidence(ocrText),
            model: DASHSCOPE_CONFIG.model,
            timestamp: new Date().toISOString(),
            requestId: response.data.request_id,
            rawText: ocrText, // 保留原始文本用于调试
            
            // 🎯 新增：题目类型智能分析结果
            questionAnalysis: {
              type: questionClassification.questionType.key,
              name: questionClassification.questionType.name,
              level: questionClassification.questionType.level,
              interaction: questionClassification.questionType.interaction,
              confidence: questionClassification.questionType.confidence,
              difficulty: questionClassification.questionType.difficulty,
              processingStrategy: questionClassification.processingStrategy,
              features: questionClassification.questionType.features || [],
              needsVerification: questionClassification.questionType.needsVerification || false
            },
            
            // 🔑 学习计划生成字段（优化）
            estimatedTotalTime: Math.max(processedText.length * 2, 5),
            questionCount: processedText.length,
            
            // 🚀 交互优化建议
            interactionRecommendation: {
              current: '使用AI聊天进行学习',
              optimal: questionClassification.processingStrategy.description,
              userExperience: questionClassification.processingStrategy.userExperience || '标准文本交互',
              technicalRequirement: questionClassification.processingStrategy.implementation || 'ready'
            }
          }
        })
      }
    }

    throw new Error('DashScope返回格式异常')

  } catch (error) {
    console.error('❌ 增强OCR识别失败:', error)
    
    if (error.response) {
      console.error('📤 请求数据:', error.config?.data ? '数据长度: ' + error.config.data.length : '无数据')
      console.error('📥 错误响应:', error.response.data)
      console.error('📊 响应状态:', error.response.status)
      
      // 处理特定错误
      if (error.response.data?.code === 'InvalidParameter.DataInspection') {
        return res.status(400).json({
          success: false,
          error: '图片数据检查失败，请尝试压缩图片或更换图片',
          code: 'DATA_INSPECTION_FAILED',
          details: error.response.data.message
        })
      }
    }

    return res.status(500).json({
      success: false,
      error: 'OCR识别服务暂时不可用',
      details: error.message
    })
  }
})

/**
 * 🔑 文件上传OCR接口 - 增强版
 * POST /api/ocr/upload
 */
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    console.log('=== 📁 文件上传增强OCR识别开始 ===')
    
    // 🔧 支持测试模式：允许直接传递测试文本
    if (req.body.mockOCRText) {
      console.log('🧪 使用测试模式，直接处理文本:', req.body.mockOCRText.substring(0, 50) + '...')
      
      const testText = req.body.mockOCRText
      const processedText = enhancedProcessOCRText(testText)
      const detectedSubject = detectSubject(testText)
      const detectedGrade = detectGrade(testText)
      
      // 🎯 智能题目类型分类
      const questionClassification = classifyQuestionType(processedText, detectedSubject)
      
      return res.json({
        success: true,
        data: {
          ocrText: processedText,
          subject: detectedSubject,
          grade: detectedGrade,
          confidence: calculateConfidence(testText),
          model: 'test-mode',
          timestamp: new Date().toISOString(),
          requestId: 'test-' + Date.now(),
          
          // 🎯 题目类型智能分析结果
          questionAnalysis: {
            type: questionClassification.questionType.key,
            name: questionClassification.questionType.name,
            level: questionClassification.questionType.level,
            interaction: questionClassification.questionType.interaction,
            confidence: questionClassification.questionType.confidence,
            difficulty: questionClassification.questionType.difficulty,
            processingStrategy: questionClassification.processingStrategy,
            features: questionClassification.questionType.features || [],
            needsVerification: questionClassification.questionType.needsVerification || false
          },
          rawText: testText,
          estimatedTotalTime: Math.max(processedText.length * 2, 5),
          questionCount: processedText.length,
          fileInfo: {
            originalname: 'test-file',
            size: testText.length
          }
        }
      })
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '没有上传文件'
      })
    }

    console.log('📊 上传文件信息:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: Math.round(req.file.size / 1024) + 'KB'
    })

    // 读取文件并转换为base64
    const imageBuffer = await fs.readFile(req.file.path)
    const base64Image = imageBuffer.toString('base64')

    console.log('📄 文件读取完成:', {
      bufferSize: Math.round(imageBuffer.length / 1024) + 'KB',
      base64Length: base64Image.length
    })

    // 🎯 保留图片文件以支持图文验证，不删除原始文件
    // 🔧 修复：使用绝对路径保存到正确的server/uploads目录
    const permanentPath = path.join(__dirname, '../../uploads', req.file.filename + path.extname(req.file.originalname))
    await fs.rename(req.file.path, permanentPath).catch(console.warn)
    console.log('📸 图片已保存到:', permanentPath)

    // 🔑 使用增强的OCR提示词
    const enhancedPrompt = `你是一个专业的OCR识别专家。请仔细识别这张图片中的所有文字内容，特别注意：

1. 🔢 数学题目：请完整识别数学表达式、运算符号、数字
2. ✏️ 手写文字：请识别手写的数字、汉字和英文
3. 📝 印刷文字：请识别印刷体文字内容  
4. 📐 图形标注：注意几何图形中的标注文字
5. 📋 表格内容：如果有表格，请逐行识别

请按以下格式输出：
- 每行一个完整的题目或文本内容
- 保持数学表达式的完整性
- 如果是选择题，包含选项内容
- 忽略明显的噪点或无意义字符

开始识别：`

    // 🔑 构建增强的请求数据
    const requestData = {
      model: DASHSCOPE_CONFIG.model,
      
      input: {
        messages: [
          {
            role: "system",
            content: [
              {
                text: "你是一个专业的OCR识别助手，专门识别小学数学作业。请仔细识别图片中的文字内容，特别关注数学题目。"
              }
            ]
          },
          {
            role: "user", 
            content: [
              {
                // 🔑 使用完整的data URL格式
                image: `data:image/jpeg;base64,${base64Image}`
              },
              {
                text: enhancedPrompt
              }
            ]
          }
        ]
      },
      
      // 🔑 优化参数配置
      parameters: {
        max_tokens: 2000,
        temperature: 0.1,  // 降低随机性，提高准确率
        // 添加图片处理参数
        image_params: {
          min_pixels: 3136,
          max_pixels: 6422528, 
          enable_rotate: true,
          max_image_width: 2048,
          max_image_height: 2048
        }
      }
    }

    console.log('📤 发送增强OCR请求到DashScope...')
    console.log('🎯 使用模型:', requestData.model)

    // 发送请求到DashScope
    const response = await axios.post(
      `${DASHSCOPE_CONFIG.baseURL}/api/v1/services/aigc/multimodal-generation/generation`,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: DASHSCOPE_CONFIG.timeout
      }
    )

    console.log('📥 DashScope响应状态:', response.status)

    if (response.status === 200 && response.data) {
      // 🔑 改进的结果解析
      const choice = response.data.output?.choices?.[0]
      if (choice && choice.message) {
        let ocrText = ''
        
        // 处理不同的响应格式
        if (typeof choice.message.content === 'string') {
          ocrText = choice.message.content
        } else if (Array.isArray(choice.message.content)) {
          // 提取文本内容
          const textContents = choice.message.content
            .filter(item => item.text)
            .map(item => item.text)
          ocrText = textContents.join('\n')
        } else if (choice.message.content?.text) {
          ocrText = choice.message.content.text
        }

        // 🔑 改进的文本处理
        // 🧹 首先清理OCR文本，移除干扰文字
        const cleanedOcrText = await cleanOcrText(ocrText)
        console.log('🧹 [单图OCR] 文本清理完成:', {
          原始长度: ocrText.length,
          清理后长度: cleanedOcrText.length,
          清理效果: cleanedOcrText.substring(0, 100) + '...'
        })
        
        const processedText = enhancedProcessOCRText(cleanedOcrText)
        
        // 🔑 智能检测学科和年级
        const detectedSubject = detectSubject(cleanedOcrText)
        const detectedGrade = detectGrade(cleanedOcrText)
        
        console.log('✅ 文件上传增强OCR识别成功')
        console.log('📝 处理后识别结果:', processedText)
        console.log('🎓 检测到学科:', detectedSubject)
        console.log('📚 检测到年级:', detectedGrade)
        console.log('📸 图片保存路径:', permanentPath)

        return res.json({
          success: true,
          data: {
            ocrText: processedText,
            subject: detectedSubject,
            grade: detectedGrade,
            confidence: calculateConfidence(ocrText),
            model: DASHSCOPE_CONFIG.model,
            timestamp: new Date().toISOString(),
            requestId: response.data.request_id,
            rawText: ocrText, // 保留原始文本用于调试
            
            // 🔑 添加学习计划生成需要的额外字段
            estimatedTotalTime: Math.max(processedText.length * 2, 5), // 基于题目数量估算时间
            questionCount: processedText.length,
            
            fileInfo: {
              originalname: req.file.originalname,
              size: req.file.size
            },
            
            // 🎯 新增：图片文件路径，支持图文验证 - 返回完整HTTP URL  
            // 🔧 修复：提取文件名生成正确的URL路径
            imagePath: `http://8.134.252.224:3000/uploads/${req.file.filename + path.extname(req.file.originalname)}`
          }
        })
      }
    }

    throw new Error('DashScope返回格式异常')

  } catch (error) {
    console.error('❌ 文件上传增强OCR识别失败:', error)
    
    // 清理失败的临时文件
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.warn)
    }

    if (error.response) {
      console.error('📥 错误响应:', error.response.data)
      console.error('📊 响应状态:', error.response.status)
      
      // 处理特定错误
      if (error.response.data?.code === 'InvalidParameter.DataInspection') {
        return res.status(400).json({
          success: false,
          error: '图片数据检查失败，请尝试压缩图片或更换图片',
          code: 'DATA_INSPECTION_FAILED',
          details: error.response.data.message
        })
      }
      
      // 🔧 处理账户欠费错误
      if (error.response.data?.code === 'Arrearage') {
        return res.status(503).json({
          success: false,
          error: 'OCR服务暂时不可用，请稍后重试',
          code: 'SERVICE_UNAVAILABLE',
          details: '服务账户状态异常，正在处理中...',
          fallback: '建议手动输入题目或稍后重试'
        })
      }
    }

    return res.status(500).json({
      success: false,
      error: '文件处理失败',
      details: error.message
    })
  }
})

/**
 * 🆕 批量文件上传OCR接口 - 多图片支持
 * POST /api/ocr/upload-batch
 * @description 支持最多10张图片同时识别，完全向后兼容
 */
router.post('/upload-batch', upload.array('images', 10), async (req, res) => {
  try {
    console.log('=== 📁 批量文件上传OCR识别开始 ===')
    
    // 📊 验证上传的文件
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有上传文件',
        code: 'NO_FILES'
      })
    }

    // 🔒 安全检查：文件数量限制
    if (req.files.length > 10) {
      return res.status(400).json({
        success: false,
        error: '最多支持10张图片同时上传',
        code: 'TOO_MANY_FILES'
      })
    }

    console.log(`📊 批量上传文件信息: ${req.files.length}个文件`)
    req.files.forEach((file, index) => {
      console.log(`  文件${index + 1}: ${file.originalname} (${Math.round(file.size / 1024)}KB)`)
    })

    // 🔄 逐个处理文件
    const results = []
    let successCount = 0
    
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i]
      
      try {
        console.log(`🔄 处理第${i + 1}张图片: ${file.originalname}`)
        
        // 读取文件并转换为base64
        const imageBuffer = await fs.readFile(file.path)
        const base64Image = imageBuffer.toString('base64')

        // 🔑 调用现有的OCR识别逻辑（复用已验证的代码）
        const ocrResult = await performSingleOCR(base64Image, file.originalname)
        
        results.push({
          fileIndex: i,
          fileName: file.originalname,
          fileSize: file.size,
          success: true,
          data: {
            ocrText: ocrResult.ocrText,
            subject: ocrResult.subject,
            grade: ocrResult.grade,
            confidence: ocrResult.confidence,
            model: ocrResult.model,
            timestamp: new Date().toISOString(),
            questionCount: ocrResult.questionCount,
            questionAnalysis: ocrResult.questionAnalysis || {
              type: 'calculation',
              name: '计算题',
              level: 1,
              confidence: 0
            }
          }
        })
        
        successCount++
        console.log(`✅ 第${i + 1}张图片识别成功`)
        
        // 🎯 保留图片文件以支持图文验证
        const permanentPath = path.join('uploads', file.filename + path.extname(file.originalname))
        await fs.rename(file.path, permanentPath).catch(console.warn)
        console.log(`📸 第${i + 1}张图片已保存到:`, permanentPath)
        
      } catch (error) {
        console.error(`❌ 第${i + 1}张图片识别失败:`, error.message)
        
        results.push({
          fileIndex: i,
          fileName: file.originalname,
          fileSize: file.size,
          success: false,
          error: error.message || '图片识别失败'
        })
        
        // 清理失败的临时文件
        await fs.unlink(file.path).catch(console.warn)
      }
    }

    // 🎯 智能合并多图片结果
    const mergedAnalysis = mergeBatchResults(results)
    
    // 📊 返回批量处理结果
    console.log(`📊 批量OCR识别完成: ${successCount}/${req.files.length} 成功`)
    console.log(`🎯 整体学科识别: ${mergedAnalysis.subject}`)
    console.log(`🎯 整体题目类型: ${mergedAnalysis.questionType}`)
    
    res.json({
      success: true,
      data: {
        totalCount: req.files.length,
        successCount: successCount,
        failedCount: req.files.length - successCount,
        results: results,
        
        // 🎯 新增：整体分析结果
        mergedAnalysis: mergedAnalysis
      },
      message: `批量识别完成: ${successCount}/${req.files.length} 成功`
    })

  } catch (error) {
    console.error('❌ 批量文件上传OCR识别失败:', error)
    
    // 清理所有临时文件
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path).catch(console.warn)
      })
    }
    
    res.status(500).json({
      success: false,
      error: '批量OCR识别失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * 🔧 提取的单个OCR识别逻辑 - 复用现有验证代码
 * @param {string} base64Image - base64编码的图片
 * @param {string} fileName - 文件名
 * @returns {Promise<Object>} OCR识别结果
 */
async function performSingleOCR(base64Image, fileName = 'unknown') {
  // 🔑 使用与现有API相同的增强提示词
  const enhancedPrompt = `你是一个专业的OCR识别专家。请仔细识别这张图片中的所有文字内容，特别注意：

1. 🔢 数学题目：请完整识别数学表达式、运算符号、数字
2. ✏️ 手写文字：请识别手写的数字、汉字和英文
3. 📝 印刷文字：请识别印刷体文字内容  
4. 📐 图形标注：注意几何图形中的标注文字
5. 📋 表格内容：如果有表格，请逐行识别

请按以下格式输出：
- 每行一个完整的题目或文本内容
- 保持数学表达式的完整性
- 如果是选择题，包含选项内容
- 忽略明显的噪点或无意义字符

开始识别：`

  // 🔑 构建请求数据（与现有API保持一致）
  const requestData = {
    model: DASHSCOPE_CONFIG.model,
    input: {
      messages: [
        {
          role: "system",
          content: [
            {
              text: "你是一个专业的OCR识别助手，专门识别小学数学作业。请仔细识别图片中的文字内容，特别关注数学题目。"
            }
          ]
        },
        {
          role: "user", 
          content: [
            {
              image: `data:image/jpeg;base64,${base64Image}`
            },
            {
              text: enhancedPrompt
            }
          ]
        }
      ]
    },
    parameters: {
      max_tokens: 2000,
      temperature: 0.1,
      image_params: {
        min_pixels: 3136,
        max_pixels: 6422528, 
        enable_rotate: true,
        max_image_width: 2048,
        max_image_height: 2048
      }
    }
  }

  // 发送请求到DashScope
  const response = await axios.post(
    `${DASHSCOPE_CONFIG.baseURL}/api/v1/services/aigc/multimodal-generation/generation`,
    requestData,
    {
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: DASHSCOPE_CONFIG.timeout
    }
  )

  if (response.status === 200 && response.data) {
    const choice = response.data.output?.choices?.[0]
    if (choice && choice.message) {
      let ocrText = ''
      
      // 处理不同的响应格式
      if (typeof choice.message.content === 'string') {
        ocrText = choice.message.content
      } else if (Array.isArray(choice.message.content)) {
        const textContents = choice.message.content
          .filter(item => item.text)
          .map(item => item.text)
        ocrText = textContents.join('\n')
      } else if (choice.message.content?.text) {
        ocrText = choice.message.content.text
      }

      // 🔑 使用增强的文本处理和检测逻辑
      // 🧹 首先清理OCR文本，移除干扰文字
      const cleanedOcrText = await cleanOcrText(ocrText)
      console.log('🧹 [批量OCR] 文本清理完成:', {
        原始长度: ocrText.length,
        清理后长度: cleanedOcrText.length,
        清理效果: cleanedOcrText.substring(0, 100) + '...'
      })
      
      const processedText = enhancedProcessOCRText(cleanedOcrText)
      const detectedSubject = detectSubject(cleanedOcrText)
      const detectedGrade = detectGrade(cleanedOcrText)
      
      // 🎯 智能题目类型分类
      const questionClassification = classifyQuestionType(processedText, detectedSubject)
      
      return {
        ocrText: processedText,
        rawText: ocrText,
        subject: detectedSubject,
        grade: detectedGrade,
        confidence: calculateConfidence(ocrText),
        model: DASHSCOPE_CONFIG.model,
        requestId: response.data.request_id,
        questionCount: processedText.length,
        fileName: fileName,
        
        // 🎯 新增：题目类型智能分析结果
        questionAnalysis: {
          type: questionClassification.questionType.key,
          name: questionClassification.questionType.name,
          level: questionClassification.questionType.level,
          interaction: questionClassification.questionType.interaction,
          confidence: questionClassification.questionType.confidence,
          difficulty: questionClassification.questionType.difficulty,
          processingStrategy: questionClassification.processingStrategy,
          features: questionClassification.questionType.features || [],
          needsVerification: questionClassification.questionType.needsVerification || false
        }
      }
    }
  }
  
  throw new Error('OCR识别失败：无法解析响应数据')
}

/**
 * 🎯 智能合并批量识别结果
 * @param {Array} results - 单个图片的识别结果数组
 * @returns {Object} 合并后的整体分析结果
 */
function mergeBatchResults(results) {
  console.log('🎯 [批量合并] 开始智能合并多图片结果...')
  
  const successResults = results.filter(r => r.success && r.data)
  
  if (successResults.length === 0) {
    return {
      subject: 'math',
      grade: 1,
      questionType: 'unknown',
      confidence: 0,
      totalImages: results.length,
      successImages: 0,
      combinedText: '',
      reasoning: '无有效识别结果'
    }
  }
  
  // 📊 统计学科投票
  const subjectVotes = {}
  const gradeVotes = {}
  const questionTypeVotes = {}
  const allTexts = []
  let totalConfidence = 0
  
  successResults.forEach(result => {
    const data = result.data
    
    // 学科投票（加权）
    const subjectWeight = (data.confidence || 50) / 100
    subjectVotes[data.subject] = (subjectVotes[data.subject] || 0) + subjectWeight
    
    // 年级投票
    gradeVotes[data.grade] = (gradeVotes[data.grade] || 0) + 1
    
    // 题目类型投票
    if (data.questionAnalysis) {
      const qType = data.questionAnalysis.name
      questionTypeVotes[qType] = (questionTypeVotes[qType] || 0) + 1
    }
    
    // 合并文本
    if (data.ocrText) {
      allTexts.push(`[图片${result.fileIndex + 1}] ${data.ocrText}`)
    }
    
    totalConfidence += data.confidence || 50
  })
  
  // 🏆 确定最终学科（投票 + 智能判断）
  const topSubject = Object.entries(subjectVotes)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'math'
  
  // 🏆 确定最终年级
  const topGrade = Object.entries(gradeVotes)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 1
  
  // 🏆 确定最终题目类型
  const topQuestionType = Object.entries(questionTypeVotes)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || '计算题'
  
  // 📝 合并所有文本进行二次验证
  const combinedText = allTexts.join('\n')
  const secondarySubject = detectSubject(combinedText)
  const secondaryClassification = classifyQuestionType(combinedText, secondarySubject)
  
  // 🧠 智能决策：投票结果 vs 二次分析
  let finalSubject = topSubject
  let finalQuestionType = topQuestionType
  
  // 如果二次分析与投票结果差异较大，进行智能权衡
  if (secondarySubject !== topSubject) {
    console.log(`🔄 [学科冲突] 投票结果:${topSubject} vs 二次分析:${secondarySubject}`)
    
    // 计算置信度差异，选择更可靠的结果
    const voteConfidence = subjectVotes[topSubject] || 0
    const secondaryConfidence = secondaryClassification.questionType.confidence / 100
    
    if (secondaryConfidence > voteConfidence * 1.2) {
      finalSubject = secondarySubject
      console.log(`✅ [学科决策] 采用二次分析结果: ${secondarySubject}`)
    } else {
      console.log(`✅ [学科决策] 保持投票结果: ${topSubject}`)
    }
  }
  
  if (secondaryClassification.questionType.name !== topQuestionType) {
    console.log(`🔄 [题型冲突] 投票结果:${topQuestionType} vs 二次分析:${secondaryClassification.questionType.name}`)
    finalQuestionType = secondaryClassification.questionType.name
  }
  
  const avgConfidence = Math.round(totalConfidence / successResults.length)
  
  const mergedResult = {
    subject: finalSubject,
    grade: parseInt(topGrade),
    questionType: finalQuestionType,
    confidence: avgConfidence,
    totalImages: results.length,
    successImages: successResults.length,
    combinedText: combinedText,
    
    // 🎯 详细分析结果
    analysisDetails: {
      subjectVotes: subjectVotes,
      gradeVotes: gradeVotes,
      questionTypeVotes: questionTypeVotes,
      secondaryAnalysis: {
        subject: secondarySubject,
        questionType: secondaryClassification.questionType.name,
        confidence: secondaryClassification.questionType.confidence
      },
      reasoning: `基于${successResults.length}张图片的综合分析，学科识别置信度${avgConfidence}%`
    },
    
    // 🚀 处理建议
    processingRecommendation: secondaryClassification.processingStrategy
  }
  
  console.log(`✅ [批量合并] 最终结果: ${finalSubject} - ${finalQuestionType} (置信度${avgConfidence}%)`)
  
  return mergedResult
}

/**
 * 处理OCR识别文本
 * @param {string} rawText 原始识别文本
 * @returns {string[]} 处理后的文本行数组
 */
function processOCRText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return ['未识别到有效文字内容']
  }

  // 清理和分割文本
  const lines = rawText
    .split(/[\n\r]+/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => !line.match(/^[。，！？\s]*$/)) // 过滤只有标点的行

  // 如果没有有效行，返回原文本
  if (lines.length === 0) {
    return [rawText.trim()]
  }

  // 合并过短的行（可能是OCR错误分割）
  const mergedLines = []
  let currentLine = ''

  for (let line of lines) {
    if (line.length < 10 && currentLine.length > 0) {
      currentLine += ' ' + line
    } else {
      if (currentLine) {
        mergedLines.push(currentLine)
      }
      currentLine = line
    }
  }
  
  if (currentLine) {
    mergedLines.push(currentLine)
  }

  return mergedLines.length > 0 ? mergedLines : [rawText.trim()]
}

/**
 * 🔧 增强的OCR文本处理函数
 * @param {string} text - 原始OCR结果
 * @returns {string[]} 处理后的文本数组
 */
function enhancedProcessOCRText(text) {
  if (!text || typeof text !== 'string') {
    return ['未识别到有效文字内容']
  }

  // 基本清理
  let processed = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n+/g, '\n')
    .trim()

  // 如果处理后为空
  if (!processed) {
    return ['未识别到有效文字内容']
  }

  // 🔑 增强处理逻辑
  processed = processed
    // 修正常见的OCR错误
    .replace(/[oO](?=\d)/g, '0')  // O替换为0（在数字前）
    .replace(/(?<=\d)[oO]/g, '0') // O替换为0（在数字后）
    .replace(/[Il1](?=\d)/g, '1') // I或l替换为1（在数字前）
    .replace(/(?<=\d)[Il]/g, '1') // I或l替换为1（在数字后）
    
    // 修正数学符号
    .replace(/×/g, '×')
    .replace(/÷/g, '÷')
    .replace(/=/g, '=')
    .replace(/\+/g, '+')
    .replace(/-/g, '-')
    
    // 清理多余空白
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\s+\n/g, '\n')
    
    // 移除明显的噪音字符
    .replace(/[^\u4e00-\u9fa5\w\s\d\+\-\×\÷\=\(\)\[\]\{\}\.\,\?\!\:\;]/g, '')

  // 🔧 智能分割：根据内容类型进行不同的分割策略
  let textArray = []
  
  if (processed.includes('=')) {
    // 数学题目：按等号分割并重新组织
    console.log('🔢 检测到数学题目，使用数学题分割策略')
    
    // 🔑 修复：先去除题目编号和前缀，再进行分割
    // 匹配模式：数字编号 + 空格 + 数学表达式
    let cleanedText = processed
      // 去除题目编号：匹配 "数字. " 或 "数字) " 开头的模式
      .replace(/^\s*\d+[\.\)]\s+/gm, '')  // 去除 "1. " 或 "1) " 形式的编号
      .replace(/(\s|^)\d{1,2}\s+(?=\d+\s*[+\-×÷])/g, '$1')  // 去除 " 12 8+7=" 中的 "12 "
      // 🔑 新增：处理行中间的编号，如 "8+7= 2. 9+3=" 中的 "2. "
      .replace(/\s+\d+[\.\)]\s+(?=\d+\s*[+\-×÷])/g, ' ')  // 去除中间的编号
      // 🔑 新增：处理中文编号，如 "第1题："
      .replace(/第\d+题[：:]\s*/g, '')
      // 🔑 关键修复：去除题目前缀，防止重复统计
      .replace(/(^|\s)(题目[：:]?\s*|数学题目[：:]?\s*|Question:\s*)/g, '$1')  // 去除题目前缀
    
    console.log('🧹 清理编号后的文本:', cleanedText.substring(0, 100) + '...')
    
    // 方法1：按等号分割
    const parts = cleanedText.split(/\s*=\s*/)
    
    for (let i = 0; i < parts.length; i++) {
      let question = parts[i].trim()
      
      // 🔑 修复：智能重构题目
      if (i < parts.length - 1) {
        // 不是最后一个部分，添加等号
        question += ' ='
      } else {
        // 最后一个部分，可能是答案或不完整的题目
        if (question && parts[i-1]) {
          // 如果有前一个部分，可能需要合并
          const prevPart = parts[i-1].trim()
          if (prevPart && !prevPart.includes('+') && !prevPart.includes('-') && !prevPart.includes('×') && !prevPart.includes('÷')) {
            // 前一个部分不是完整表达式，跳过当前部分
            continue
          }
        }
        
        // 检查当前部分是否是完整的数学表达式
        if (question.includes('+') || question.includes('-') || question.includes('×') || question.includes('÷')) {
          if (!question.includes('=')) {
            question += ' ='
          }
        } else {
          // 不是表达式，可能是答案，跳过
          continue
        }
      }
      
      // 🔑 进一步清理：去除可能残留的编号
      question = question
        .replace(/^\s*\d{1,2}[\.\)]\s*/, '')  // 去除开头的编号
        .replace(/^\s*\d{1,2}\s+/, '')        // 去除开头的数字空格
        .trim()
      
      // 验证题目有效性
      if (question.length > 3 && 
          question.includes('=') && 
          (question.includes('+') || question.includes('-') || question.includes('×') || question.includes('÷'))) {
        textArray.push(question)
      }
    }
    
    // 如果分割失败，尝试另一种方法：按数学题模式匹配
    if (textArray.length === 0) {
      console.log('🔄 等号分割失败，尝试正则模式匹配分割')
      
      // 🔑 更强的正则模式：匹配数学表达式，自动忽略编号
      const mathPattern = /(?:\d+[\.\)]\s*)?(\d+\s*[+\-×÷]\s*\d+(?:\s*[+\-×÷]\s*\d+)*)\s*=?\s*/g
      const matches = cleanedText.match(mathPattern)
      
      if (matches) {
        textArray = matches
          .map(match => {
            // 清理匹配结果
            let cleaned = match
              .replace(/^\d+[\.\)]\s*/, '')  // 去除编号
              .replace(/^\d{1,2}\s+/, '')    // 去除开头数字
              .trim()
            
            // 确保有等号
            if (!cleaned.includes('=')) {
              cleaned += ' ='
            }
            
            return cleaned
          })
          .filter(item => item.length > 3 && 
                         (item.includes('+') || item.includes('-') || item.includes('×') || item.includes('÷')))
      }
    }
    
    // 🔑 第三种方法：如果还是失败，尝试按行分割再清理
    if (textArray.length === 0) {
      console.log('🔄 正则匹配失败，尝试按行分割再清理')
      
      const lines = cleanedText.split(/[\n\r]+/)
      textArray = lines
        .map(line => {
          line = line.trim()
          
          // 去除编号
          line = line
            .replace(/^\s*\d+[\.\)]\s*/, '')
            .replace(/^\s*\d{1,2}\s+/, '')
            .trim()
          
          // 确保有等号
          if (line && (line.includes('+') || line.includes('-') || line.includes('×') || line.includes('÷'))) {
            if (!line.includes('=')) {
              line += ' ='
            }
            return line
          }
          return null
        })
        .filter(item => item && item.length > 3)
    }
  }
  
  // 如果数学题分割失败，或者不是数学题，使用通用分割
  if (textArray.length === 0) {
    console.log('📝 使用通用文本分割策略')
    textArray = processed
      .split(/[\n。.]+/)
      .map(line => line.trim())
      .filter(line => line.length > 0)
  }

  // 🔑 最终清理：确保所有题目都没有编号和前缀残留
  textArray = textArray.map(item => {
    return item
      .replace(/^\s*\d+[\.\)]\s*/, '')  // 去除 "1. " 形式
      .replace(/^\s*\d{1,2}\s+/, '')    // 去除 "12 " 形式
      .replace(/^(题目[：:]?\s*|数学题目[：:]?\s*|Question:\s*)/g, '')  // 🔑 去除题目前缀
      .replace(/\s+/g, ' ')             // 标准化空格
      .trim()
  }).filter(item => item.length > 1)

  // 🔑 关键修复：去重处理，解决题目重复统计问题
  const uniqueTextArray = []
  const seenQuestions = new Set()
  
  textArray.forEach(item => {
    // 标准化题目文本用于比较（去除空格差异）
    const normalizedItem = item.replace(/\s+/g, '').toLowerCase()
    
    if (!seenQuestions.has(normalizedItem)) {
      seenQuestions.add(normalizedItem)
      uniqueTextArray.push(item)
    } else {
      console.log('🔍 发现重复题目，已去除:', item)
    }
  })
  
  textArray = uniqueTextArray

  // 最终检查：如果分割结果为空，使用原始文本
  if (textArray.length === 0) {
    textArray = [processed]
  }

  console.log('📋 分割结果预览:', textArray.slice(0, 3))
  console.log('📊 最终题目数量:', textArray.length)
  
  return textArray.filter(item => item && item.trim().length > 0)
}

/**
 * 🔧 计算OCR识别置信度
 * @param {string} text - 识别文本
 * @returns {number} 置信度（0-1）
 */
function calculateConfidence(text) {
  if (!text || typeof text !== 'string') {
    return 0
  }

  let confidence = 0.5 // 基础置信度

  // 根据文本长度调整
  if (text.length > 10) confidence += 0.1
  if (text.length > 50) confidence += 0.1
  if (text.length > 100) confidence += 0.1

  // 检查是否包含数字（数学题的特征）
  if (/\d/.test(text)) confidence += 0.1

  // 检查是否包含数学符号
  if (/[+\-×÷=]/.test(text)) confidence += 0.1

  // 检查是否包含中文字符
  if (/[\u4e00-\u9fa5]/.test(text)) confidence += 0.1

  // 检查行数（多行通常意味着更好的识别）
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  if (lines.length > 1) confidence += 0.1
  if (lines.length > 3) confidence += 0.1

  return Math.min(confidence, 0.99) // 最高99%
}

/**
 * 🧹 OCR文本智能清理函数 - 新版本（方案A）
 * @param {string} text 原始OCR文本
 * @returns {string} 清理后的文本
 */
async function cleanOcrText(text) {
  // 🚀 直接使用AI智能清理
  return await cleanOcrTextWithAI(text)
}

/**
 * 🤖 AI智能OCR文本清理函数 - 方案A：LLM智能清理
 * 让AI模型智能理解OCR文本内容，区分题目内容和干扰文字
 * @param {string} text 原始OCR文本
 * @returns {string} AI清理后的文本
 */
async function cleanOcrTextWithAI(text) {
  if (!text || typeof text !== 'string') {
    return ''
  }
  
  console.log('🤖 [AI智能清理] 开始处理OCR文本...')
  console.log('🔍 [原始文本]:', text.substring(0, 200) + (text.length > 200 ? '...' : ''))
  
  try {
    // 🎯 构建智能清理提示词
    const cleaningPrompt = `你是专业的教育OCR文本清理专家。请智能清理以下OCR识别的教育题目文本，移除UI按钮、页码、时间戳等干扰信息，保留纯净的题目内容。

原始OCR文本：
"${text}"

清理要求：
1. **保留所有题目相关内容**：问题描述、选项(A/B/C/D)、数字、公式、图表说明等
2. **移除界面干扰元素**：
   - UI按钮：撤销、确定、提交、保存、上一题、下一题等
   - 页码数字：如15、35、55等单独出现的数字
   - 时间戳：如10:01、09:30等时间格式
   - 练习状态：如"达标练习 未完成:5"等
   - 导航元素：返回、前进、编辑等操作按钮
3. **保持题目结构**：维持原有的问题格式和选项排列
4. **智能判断**：如果无法确定是否为干扰信息，倾向于保留

请直接输出清理后的纯净题目文本，不要添加任何解释或说明：`

    // 🚀 调用qwen-turbo进行智能清理
    const cleanedResult = await callQwenForOCRCleaning(cleaningPrompt)
    
    if (cleanedResult && cleanedResult.trim().length > 0) {
      const cleanedText = cleanedResult.trim()
      
      // 🔍 清理效果验证
      const originalLength = text.length
      const cleanedLength = cleanedText.length
      const reductionPercent = Math.round((1 - cleanedLength/originalLength) * 100)
      
      console.log(`✅ [AI智能清理] 清理完成:`)
      console.log(`   原始长度: ${originalLength}字符`)
      console.log(`   清理后长度: ${cleanedLength}字符`)
      console.log(`   干扰文字移除: ${reductionPercent}%`)
      console.log(`   清理结果: "${cleanedText.substring(0, 100)}${cleanedText.length > 100 ? '...' : ''}"`)
      
      // 🛡️ 安全检查：如果AI清理过度（超过70%内容被删除），使用保守方案
      if (reductionPercent > 70) {
        console.log('⚠️ [AI清理] 内容删除过多，启用保守清理')
        return cleanOcrTextConservative(text)
      }
      
      return cleanedText
    } else {
      console.log('⚠️ [AI清理] AI返回空结果，使用保守清理')
      return cleanOcrTextConservative(text)
    }
    
  } catch (error) {
    console.error('❌ [AI清理] AI智能清理失败:', error.message)
    console.log('🔄 [AI清理] 降级到保守清理方案')
    return cleanOcrTextConservative(text)
  }
}

/**
 * 🚀 调用qwen-turbo进行OCR文本清理
 * @param {string} prompt 清理提示词
 * @returns {Promise<string>} 清理后的文本
 */
async function callQwenForOCRCleaning(prompt) {
  const axios = require('axios')
  
  const requestData = {
    model: 'qwen-turbo',
    messages: [
      {
        role: 'system',
        content: '你是专业的教育OCR文本清理专家，擅长智能识别和移除UI干扰元素，保留纯净的题目内容。请直接输出清理结果，不要添加任何解释。'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.1, // 低温度确保稳定输出
    max_tokens: 1000
  }
  
  const startTime = Date.now()
  
  try {
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || 'sk-a791758fe21c4a719b2c632d5345996f'}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15秒超时
      }
    )
    
    const responseTime = Date.now() - startTime
    const cleanedText = response.data.choices[0].message.content.trim()
    
    console.log(`🤖 [AI清理] qwen-turbo调用成功，响应时间: ${responseTime}ms`)
    
    return cleanedText
    
  } catch (error) {
    console.error('❌ [AI清理] qwen-turbo调用失败:', error.message)
    throw error
  }
}

/**
 * 🛡️ 保守OCR清理方案（AI失败时的备选方案）
 * @param {string} text 原始文本
 * @returns {string} 保守清理后的文本
 */
function cleanOcrTextConservative(text) {
  console.log('🛡️ [保守清理] 启用保守清理方案')
  
  let cleanedText = text
  
  // 🔧 只移除最明显的干扰文字，保守操作
  const conservativePatterns = [
    /\d{1,2}:\d{2}/g,                    // 时间戳：10:01
    /达标练习\s*未完成:\d+/g,            // 练习状态
    /上一题|下一题/g,                     // 导航按钮
    /撤销|确定/g,                        // UI按钮
    /\s+\d{2,3}$/g,                     // 行尾的页码数字
  ]
  
  conservativePatterns.forEach((pattern, index) => {
    const beforeClean = cleanedText
    cleanedText = cleanedText.replace(pattern, ' ')
    if (beforeClean !== cleanedText) {
      console.log(`🛡️ [保守清理] 规则${index+1}生效`)
    }
  })
  
  // 标准化空格
  cleanedText = cleanedText.replace(/\s+/g, ' ').trim()
  
  console.log(`✅ [保守清理] 清理完成: ${text.length} → ${cleanedText.length}字符`)
  
  return cleanedText
}

/**
 * 🧠 智能干扰词检测器（基于机器学习项目思路）
 * @param {string} word 单词
 * @param {string} context 上下文
 * @returns {boolean} 是否为干扰词
 */
function isInterferenceWord(word, context) {
  // 页码特征
  if (/^\d{1,3}$/.test(word) && word.length <= 3) {
    // 检查是否在题目上下文中
    const isInQuestionContext = /[？?=]/.test(context) || /[ABCD]\s*[\.、]/.test(context)
    if (!isInQuestionContext) {
      return true  // 很可能是页码
    }
  }
  
  // UI元素特征
  if (['撤销', '确定', '上一题', '下一题'].includes(word)) {
    return true
  }
  
  // 时间戳特征
  if (/^\d{1,2}:\d{2}$/.test(word)) {
    return true
  }
  
  return false
}

/**
 * 🔍 智能检测学科 - 增强版 (v2.0)
 * @param {string} text - OCR识别的文本
 * @returns {string} 学科类型: 'math', 'chinese', 'english'
 */
function detectSubject(text) {
  if (!text || typeof text !== 'string') {
    return 'math' // 默认数学
  }

  // 🧹 文本已经在外部被清理，直接使用
  const cleanedText = text
  console.log('🔍 [学科识别v2.0] 使用已清理的文本进行识别')
  
  // 🔢 数学相关关键词和模式 - 🚀 大幅增强数学识别
  const mathPatterns = [
    // 基础运算
    { pattern: /\d+\s*[+\-×÷]\s*\d+/, weight: 3, name: '数学运算' },
    { pattern: /=\s*\d+/, weight: 2, name: '等式' },
    { pattern: /[+\-×÷]\s*\d+/, weight: 2, name: '运算符' },
    
    // 🎯 选择题强特征（超高权重）
    { pattern: /[ABCD]\s*[、．.]\s*[\u4e00-\u9fa5\d]/, weight: 10, name: 'ABCD选项' },
    { pattern: /A.*B.*[CD]/, weight: 8, name: 'ABC选项序列' },
    { pattern: /①.*②.*③/, weight: 8, name: '数字选项' },
    { pattern: /选一选|选择题|选.*选/, weight: 10, name: '选择题标识' },
    { pattern: /哪[个一种].*[?？]/, weight: 8, name: '逻辑判断' },
    
    // 🧠 数学思维和逻辑特征
    { pattern: /左.*右|上.*下|前.*后/, weight: 6, name: '空间方位' },
    { pattern: /小朋友.*[?？]|.*小朋友/, weight: 5, name: '小朋友问题' },
    { pattern: /几个|多少|第几/, weight: 4, name: '数量概念' },
    { pattern: /比.*多|比.*少/, weight: 4, name: '比较概念' },
    { pattern: /连一连|连线|配对/, weight: 6, name: '连线题' },
    
    // 数学术语
    { pattern: /求|计算|解|答案|得/, weight: 3, name: '数学术语' },
    { pattern: /加|减|乘|除|等于/, weight: 3, name: '运算术语' },
    { pattern: /面积|周长|体积|长度/, weight: 4, name: '几何术语' },
    { pattern: /图形|形状|圆|方|三角/, weight: 3, name: '几何图形' },
    
    // 教学标识
    { pattern: /思维|逻辑|推理|判断/, weight: 4, name: '思维训练' },
    { pattern: /达标练习|练习.*题/, weight: 3, name: '数学练习' },
  ]

  // 🇨🇳 语文相关关键词（收紧范围，避免误判）
  const chinesePatterns = [
    { pattern: /阅读理解|文章|段落分析/, weight: 8, name: '阅读理解' },
    { pattern: /作文|写作|日记|书信|写话/, weight: 8, name: '写作类' },
    { pattern: /古诗|诗歌|文言文|现代文/, weight: 8, name: '文学体裁' },
    { pattern: /拼音|声调|韵母|声母/, weight: 7, name: '拼音专项' },
    { pattern: /笔画|部首|偏旁|汉字结构/, weight: 7, name: '汉字结构' },
    { pattern: /标点符号|修辞|比喻|拟人/, weight: 6, name: '语法修辞' },
    { pattern: /背诵|朗读|默写|听写/, weight: 6, name: '语文技能' },
    { pattern: /成语故事|词语解释|造句/, weight: 5, name: '词汇语法' },
    { pattern: /课文|语文书|语文课/, weight: 8, name: '语文明确标识' },
  ]

  // 🇬🇧 英语相关关键词
  const englishPatterns = [
    { pattern: /[a-zA-Z]{4,}/, weight: 2, name: '英文单词' },
    { pattern: /reading|writing|listening|speaking/i, weight: 6, name: '英语技能' },
    { pattern: /grammar|vocabulary|sentence/i, weight: 6, name: '语法词汇' },
    { pattern: /english|hello|what|how/i, weight: 5, name: '英语标识' },
  ]

  // 计算各学科的匹配分数
  let mathScore = 0
  let chineseScore = 0
  let englishScore = 0

  // 检查数学模式（带权重）
  mathPatterns.forEach(item => {
    const matches = cleanedText.match(item.pattern)
    if (matches) {
      const score = matches.length * item.weight
      mathScore += score
      console.log(`🎯 [数学匹配] ${item.name}: +${score}分 (${matches.length}次×${item.weight})`)
    }
  })

  // 检查语文模式
  chinesePatterns.forEach(item => {
    const matches = cleanedText.match(item.pattern)
    if (matches) {
      const score = matches.length * item.weight
      chineseScore += score
      console.log(`📖 [语文匹配] ${item.name}: +${score}分`)
    }
  })

  // 检查英语模式
  englishPatterns.forEach(item => {
    const matches = cleanedText.match(item.pattern)
    if (matches) {
      const score = matches.length * item.weight
      englishScore += score
      console.log(`🔤 [英语匹配] ${item.name}: +${score}分`)
    }
  })

  // 🔑 特殊加权逻辑
  
  // 数字和运算符检测
  const numberCount = (cleanedText.match(/\d/g) || []).length
  const operatorCount = (cleanedText.match(/[+\-×÷=]/g) || []).length
  if (numberCount > 2 && operatorCount > 0) {
    const bonus = Math.min(numberCount + operatorCount * 2, 15)
    mathScore += bonus
    console.log(`🔢 [运算检测] 数字${numberCount}个+运算符${operatorCount}个: +${bonus}分`)
  }

  // 🚀 超强选择题检测
  const hasMultipleChoice = /[ABCD]\s*[、．.]|A.*B.*[CD]|①.*②.*③/.test(cleanedText)
  const hasChoiceWords = /选一选|选择题|选.*选|哪[个一种].*[?？]/.test(cleanedText)
  
  if (hasMultipleChoice || hasChoiceWords) {
    mathScore += 30  // 超高权重，选择题强烈倾向数学
    console.log('🎯 [选择题检测] 强选择题特征: +30分')
  }

  // 📚 中文字符分析（更谨慎的处理）
  const chineseCharCount = (cleanedText.match(/[\u4e00-\u9fa5]/g) || []).length
  const totalCharCount = cleanedText.replace(/\s/g, '').length
  const chineseRatio = totalCharCount > 0 ? chineseCharCount / totalCharCount : 0
  
  // 只有在明确的语文特征且无数学特征时才大幅加语文分
  const hasStrongMathFeatures = hasMultipleChoice || hasChoiceWords || mathScore > 20
  if (chineseRatio > 0.7 && !hasStrongMathFeatures && chineseScore > 10) {
    const bonus = Math.round(chineseRatio * 15)
    chineseScore += bonus
    console.log(`📖 [高中文比例] 语文特征明显: +${bonus}分`)
  }

  // 英文字符检测
  const englishCharCount = (cleanedText.match(/[a-zA-Z]/g) || []).length
  if (englishCharCount > 20) {
    englishScore += 12
    console.log(`🔤 [英文检测] 大量英文字符: +12分`)
  }

  console.log('📊 [学科识别v2.0] 最终分数:', { 
    math: mathScore, 
    chinese: chineseScore, 
    english: englishScore,
    stats: { 
      numberCount, 
      operatorCount, 
      chineseCharCount, 
      englishCharCount,
      chineseRatio: `${(chineseRatio * 100).toFixed(1)}%`,
      hasMultipleChoice,
      hasChoiceWords,
      cleanedLength: cleanedText.length
    }
  })

  // 🏆 最终决策（数学优先策略）
  if (mathScore >= chineseScore && mathScore >= englishScore) {
    console.log(`✅ [学科识别] 识别为: 数学 (${mathScore}分) - 优势:${mathScore-Math.max(chineseScore,englishScore)}分`)
    return 'math'
  } else if (chineseScore >= englishScore) {
    console.log(`✅ [学科识别] 识别为: 语文 (${chineseScore}分) - 优势:${chineseScore-Math.max(mathScore,englishScore)}分`)
    return 'chinese'
  } else {
    console.log(`✅ [学科识别] 识别为: 英语 (${englishScore}分) - 优势:${englishScore-Math.max(mathScore,chineseScore)}分`)
    return 'english'
  }
}

/**
 * 📚 智能检测年级
 * @param {string} text - OCR识别的文本
 * @returns {number} 年级 (1-6)
 */
function detectGrade(text) {
  if (!text || typeof text !== 'string') {
    return 3 // 默认三年级
  }

  // 🔢 根据数学内容复杂度判断年级
  const mathComplexityIndicators = {
    1: [/\d\s*[+\-]\s*\d\s*=/, /10以内/, /1\+1/, /2\+3/],                     // 一年级：10以内加减
    2: [/\d{2}\s*[+\-]\s*\d/, /100以内/, /进位/, /退位/],                      // 二年级：100以内加减
    3: [/\d+\s*[×÷]\s*\d/, /乘法/, /除法/, /九九表/, /乘法口诀/],              // 三年级：乘除法
    4: [/\d{3,}/, /万/, /千/, /角度/, /面积/, /周长/],                        // 四年级：大数、几何初步
    5: [/小数/, /分数/, /\d+\.\d+/, /约分/, /通分/, /体积/],                  // 五年级：小数分数
    6: [/百分数/, /%/, /比例/, /圆/, /扇形/, /立体图形/]                       // 六年级：百分数比例
  }

  // 📝 根据语文内容判断年级
  const chineseComplexityIndicators = {
    1: [/拼音/, /aoe/, /认字/, /笔画/, /一二三/],
    2: [/看图写话/, /短文/, /词语/, /造句/],
    3: [/段落/, /自然段/, /中心句/, /阅读理解/],
    4: [/修辞/, /比喻/, /拟人/, /作文/],
    5: [/说明文/, /议论文/, /文言文入门/],
    6: [/古诗词/, /名著/, /文学常识/]
  }

  // 计算各年级匹配分数
  const gradeScores = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }

  // 检查数学复杂度
  Object.keys(mathComplexityIndicators).forEach(grade => {
    mathComplexityIndicators[grade].forEach(pattern => {
      if (text.match(pattern)) {
        gradeScores[grade] += 2
      }
    })
  })

  // 检查语文复杂度
  Object.keys(chineseComplexityIndicators).forEach(grade => {
    chineseComplexityIndicators[grade].forEach(pattern => {
      if (text.match(pattern)) {
        gradeScores[grade] += 2
      }
    })
  })

  // 🔍 基于数字大小判断年级
  const numbers = text.match(/\d+/g) || []
  if (numbers.length > 0) {
    const maxNumber = Math.max(...numbers.map(n => parseInt(n)))
    
    if (maxNumber <= 10) gradeScores[1] += 3
    else if (maxNumber <= 100) gradeScores[2] += 3
    else if (maxNumber <= 1000) gradeScores[3] += 2
    else if (maxNumber <= 10000) gradeScores[4] += 2
    else gradeScores[5] += 1
  }

  // 🔤 基于文字复杂度判断
  const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  if (chineseCharCount > 0) {
    if (chineseCharCount <= 20) gradeScores[1] += 1
    else if (chineseCharCount <= 50) gradeScores[2] += 1
    else if (chineseCharCount <= 100) gradeScores[3] += 1
    else gradeScores[4] += 1
  }

  console.log('📊 年级检测分数:', gradeScores)

  // 找出得分最高的年级
  let maxGrade = 3 // 默认三年级
  let maxScore = gradeScores[3]

  Object.keys(gradeScores).forEach(grade => {
    if (gradeScores[grade] > maxScore) {
      maxScore = gradeScores[grade]
      maxGrade = parseInt(grade)
    }
  })

  return maxGrade
}

/**
 * 🎯 题目类型智能分类器 - 核心交互引擎
 * @param {string} text - 清理后的OCR文本
 * @param {string} subject - 学科类型
 * @returns {Object} 题目分类结果和交互策略
 */
function classifyQuestionType(text, subject = 'math') {
  if (!text || typeof text !== 'string') {
    return getDefaultQuestionType()
  }

  console.log('🎯 [题目分类] 开始智能分类题目类型...')
  
  const cleanedText = text.replace(/\s+/g, ' ').trim()
  
  // 🏗️ 题目类型定义及交互策略
  const questionTypes = {
    // Level 1: 基础文本题型（当前已支持）
    'calculation': {
      level: 1,
      name: '计算题',
      interaction: 'text_input',
      confidence: 0,
      patterns: [
        { regex: /\d+\s*[+\-×÷]\s*\d+\s*=\s*[?？_]/, weight: 10, desc: '标准运算式' },
        { regex: /\d+\s*[+\-×÷]\s*\d+/, weight: 8, desc: '数学运算' },
        { regex: /=\s*[?？_]/, weight: 6, desc: '等式求解' },
        { regex: /计算|求|解/, weight: 4, desc: '计算指令' }
      ],
      features: ['数字运算', '等号', '求解符号'],
      difficulty: 'easy',
      processingTime: 'fast'
    },

    'fill_blank': {
      level: 1,
      name: '填空题',
      interaction: 'text_input',
      confidence: 0,
      patterns: [
        { regex: /__+|___+|（\s*）|\(\s*\)/g, weight: 10, desc: '填空符号' },
        { regex: /[填写].*[在到].*[上中里]/, weight: 6, desc: '填空指令' },
        { regex: /空白处|横线上/, weight: 8, desc: '填空位置' }
      ],
      features: ['空白符号', '填写指令'],
      difficulty: 'easy',
      processingTime: 'fast'
    },

    // Level 2: 智能选择题型（需要实现）
    'multiple_choice': {
      level: 2,
      name: '选择题',
      interaction: 'choice_selection',
      confidence: 0,
      patterns: [
        { regex: /[ABCD]\s*[、．.]\s*[\u4e00-\u9fa5\d]/, weight: 12, desc: 'ABCD选项格式' },
        { regex: /A.*B.*[CD]/, weight: 10, desc: 'ABC选项序列' },
        { regex: /①.*②.*③/, weight: 10, desc: '数字选项序列' },
        { regex: /选一选|选择.*正确|选择.*答案/, weight: 8, desc: '选择指令' },
        { regex: /哪[个一种].*[正确对错]/, weight: 6, desc: '选择性问句' }
      ],
      features: ['选项标识', '选择指令', '逻辑判断'],
      difficulty: 'medium',
      processingTime: 'medium',
      subTypes: {
        'single_choice': '单选题',
        'multiple_choice': '多选题',
        'true_false': '判断题'
      }
    },

    // Level 3: 复杂交互题型（需要设计交互方案）
    'connection': {
      level: 3,
      name: '连线题',
      interaction: 'connection_drawing',
      confidence: 0,
      patterns: [
        { regex: /连一连|连线|连接/, weight: 12, desc: '连线指令' },
        { regex: /用线连接|画线连/, weight: 10, desc: '连线描述' },
        { regex: /左边.*右边|上面.*下面/, weight: 8, desc: '位置对应' },
        { regex: /配对|对应|匹配/, weight: 6, desc: '配对概念' }
      ],
      features: ['连线指令', '位置描述', '配对关系'],
      difficulty: 'hard',
      processingTime: 'slow',
      complexityLevel: 'high'
    },

    'drag_drop': {
      level: 3,
      name: '拖拽题',
      interaction: 'drag_and_drop',
      confidence: 0,
      patterns: [
        { regex: /拖拽|拖动|移动.*到/, weight: 10, desc: '拖拽指令' },
        { regex: /放到.*位置|拖到.*框/, weight: 8, desc: '拖拽目标' },
        { regex: /排列|排序|整理/, weight: 6, desc: '排序指令' }
      ],
      features: ['拖拽指令', '位置移动', '排序整理'],
      difficulty: 'hard',
      processingTime: 'slow',
      complexityLevel: 'high'
    },

    'drawing': {
      level: 3,
      name: '绘图题',
      interaction: 'canvas_drawing',
      confidence: 0,
      patterns: [
        { regex: /画.*图|绘制|标出/, weight: 10, desc: '绘图指令' },
        { regex: /在图上.*[画标]|图中.*[画标]/, weight: 8, desc: '图上操作' },
        { regex: /圆.*标记|线段.*画/, weight: 6, desc: '几何绘制' }
      ],
      features: ['绘图指令', '图形操作', '几何绘制'],
      difficulty: 'very_hard',
      processingTime: 'very_slow',
      complexityLevel: 'very_high'
    }
  }

  // 🔍 分析文本，计算各类型置信度
  Object.keys(questionTypes).forEach(typeKey => {
    const type = questionTypes[typeKey]
    let confidence = 0
    
    type.patterns.forEach(pattern => {
      const matches = cleanedText.match(pattern.regex)
      if (matches) {
        const score = matches.length * pattern.weight
        confidence += score
        console.log(`🔍 [${type.name}] 匹配 "${pattern.desc}": +${score}分`)
      }
    })
    
    type.confidence = confidence
  })

  // 🏆 确定最佳匹配类型
  const sortedTypes = Object.entries(questionTypes)
    .sort(([,a], [,b]) => b.confidence - a.confidence)
    .filter(([,type]) => type.confidence > 0)

  console.log('📊 [题目分类] 置信度排序:', 
    sortedTypes.map(([key, type]) => `${type.name}:${type.confidence}分`).join(', ')
  )

  // 🎯 智能决策逻辑
  let selectedType = null
  let processingStrategy = null

  if (sortedTypes.length > 0) {
    const [topTypeKey, topType] = sortedTypes[0]
    
    // 高置信度直接采用
    if (topType.confidence >= 10) {
      selectedType = { key: topTypeKey, ...topType }
    }
    // 中等置信度需要进一步验证
    else if (topType.confidence >= 6) {
      selectedType = { key: topTypeKey, ...topType }
      selectedType.needsVerification = true
    }
    // 低置信度使用备选方案
    else {
      selectedType = getBestFallbackType(cleanedText, subject)
    }
  } else {
    selectedType = getBestFallbackType(cleanedText, subject)
  }

  // 🚀 生成处理策略
  processingStrategy = generateProcessingStrategy(selectedType, cleanedText, subject)

  const result = {
    questionType: selectedType,
    processingStrategy: processingStrategy,
    allTypes: questionTypes,
    analysisDetails: {
      inputText: cleanedText,
      subject: subject,
      textLength: cleanedText.length,
      timestamp: new Date().toISOString()
    }
  }

  console.log(`✅ [题目分类] 最终识别: ${selectedType.name} (Level ${selectedType.level}, 置信度:${selectedType.confidence})`)
  console.log(`🎯 [处理策略] ${processingStrategy.method} - ${processingStrategy.description}`)

  return result
}

/**
 * 🔄 获取备选题目类型（当主要识别失败时）
 */
function getBestFallbackType(text, subject) {
  console.log('🔄 [备选方案] 使用智能备选方案...')
  
  // 基于学科和文本特征的智能备选
  if (subject === 'math') {
    // 数学题默认为计算题，除非明显是其他类型
    if (text.includes('选') || /[ABCD]/.test(text)) {
      return {
        key: 'multiple_choice',
        level: 2,
        name: '选择题',
        interaction: 'choice_selection',
        confidence: 5,
        fallback: true
      }
    } else {
      return {
        key: 'calculation',
        level: 1,
        name: '计算题',
        interaction: 'text_input',
        confidence: 5,
        fallback: true
      }
    }
  } else {
    // 其他学科默认为填空题
    return {
      key: 'fill_blank',
      level: 1,
      name: '填空题',
      interaction: 'text_input',
      confidence: 3,
      fallback: true
    }
  }
}

/**
 * 🚀 生成题目处理策略
 */
function generateProcessingStrategy(questionType, text, subject) {
  const strategies = {
    // Level 1: 当前系统已支持
    1: {
      method: 'current_ai_chat',
      description: '使用现有AI聊天系统处理',
      implementation: 'ready',
      userExperience: '文本输入 → AI判断 → 结果反馈',
      technicalComplexity: 'low'
    },
    
    // Level 2: 需要实现智能选择题界面
    2: {
      method: 'intelligent_choice_ui',
      description: '智能选择题交互界面',
      implementation: 'needs_development',
      userExperience: '选项展示 → 点击选择 → 智能判断 → 结果反馈',
      technicalComplexity: 'medium',
      requiredFeatures: [
        '选项解析提取',
        '点击选择界面',
        '答案智能匹配',
        '结果可视化反馈'
      ]
    },
    
    // Level 3: 需要设计复杂交互方案
    3: {
      method: 'advanced_interaction_engine',
      description: '高级交互引擎（分步实现）',
      implementation: 'requires_design',
      userExperience: '图形界面 → 手势操作 → 智能识别 → 结果验证',
      technicalComplexity: 'high',
      requiredFeatures: [
        '图形界面框架',
        '手势识别系统',
        '坐标智能分析',
        '结果验证算法'
      ],
      developmentApproach: 'incremental' // 分阶段实现
    }
  }

  const strategy = strategies[questionType.level] || strategies[1]
  
  // 🎯 针对具体题目类型的优化策略
  if (questionType.key === 'connection') {
    strategy.specificApproach = {
      phase1: '文本描述转换（立即可实现）',
      phase2: '简化点击选择（短期目标）',
      phase3: '真实连线交互（长期目标）'
    }
  }

  return strategy
}

/**
 * 📋 获取默认题目类型
 */
function getDefaultQuestionType() {
  return {
    questionType: {
      key: 'calculation',
      level: 1,
      name: '计算题',
      interaction: 'text_input',
      confidence: 0,
      fallback: true
    },
    processingStrategy: {
      method: 'current_ai_chat',
      description: '使用现有AI聊天系统处理',
      implementation: 'ready'
    }
  }
}

// ================================================================
// 🎯 连线题智能处理模块 - 分阶段实现方案
// ================================================================

/**
 * 🔗 连线题智能处理器 - 核心创新解决方案
 * @param {string} ocrText - OCR识别的原始文本
 * @param {Object} questionAnalysis - 题目分类分析结果
 * @returns {Object} 连线题处理方案
 */
function processConnectionQuestion(ocrText, questionAnalysis) {
  console.log('🔗 [连线题处理] 开始智能分析连线题...')
  
  // 🧹 使用已清理的文本（外部已处理）
  const cleanedText = ocrText
  
  // 🎯 第一步：解析连线题结构
  const connectionStructure = parseConnectionStructure(cleanedText)
  
  // 🚀 第二步：生成多阶段处理方案
  const processingPhases = generateConnectionProcessingPhases(connectionStructure, questionAnalysis)
  
  // 📱 第三步：选择最适合的当前实现方案
  const currentSolution = selectOptimalCurrentSolution(processingPhases, connectionStructure)
  
  const result = {
    connectionStructure: connectionStructure,
    processingPhases: processingPhases,
    currentSolution: currentSolution,
    implementationPlan: {
      immediate: currentSolution,
      shortTerm: processingPhases.phase2,
      longTerm: processingPhases.phase3
    },
    metadata: {
      textComplexity: connectionStructure.complexity,
      estimatedDevelopmentTime: calculateDevelopmentTime(processingPhases),
      userExperienceScore: calculateUXScore(currentSolution),
      commercialViability: assessCommercialViability(processingPhases)
    }
  }
  
  console.log(`✅ [连线题处理] 分析完成: 复杂度${connectionStructure.complexity}, 推荐方案${currentSolution.method}`)
  return result
}

/**
 * 🧩 解析连线题结构
 */
function parseConnectionStructure(text) {
  console.log('🧩 [结构解析] 分析连线题组成要素...')
  
  const structure = {
    leftItems: [],
    rightItems: [],
    connections: [],
    instructions: '',
    complexity: 'unknown',
    confidence: 0
  }
  
  // 🔍 提取连线指令
  const instructionPatterns = [
    /连一连|连线|用线连接|画线连接/,
    /把.*和.*连起来/,
    /将.*与.*相连/
  ]
  
  instructionPatterns.forEach(pattern => {
    const match = text.match(pattern)
    if (match) {
      structure.instructions = match[0]
      structure.confidence += 20
    }
  })
  
  // 🎯 识别左右对应项目
  const leftRightPatterns = [
    { pattern: /左边.*?[:：]\s*(.*?)(?=右边|$)/, side: 'left' },
    { pattern: /右边.*?[:：]\s*(.*?)(?=左边|$)/, side: 'right' },
    { pattern: /上面.*?[:：]\s*(.*?)(?=下面|$)/, side: 'left' },
    { pattern: /下面.*?[:：]\s*(.*?)(?=上面|$)/, side: 'right' }
  ]
  
  leftRightPatterns.forEach(({ pattern, side }) => {
    const match = text.match(pattern)
    if (match && match[1]) {
      const items = match[1].split(/[,，、]/).filter(item => item.trim())
      if (side === 'left') {
        structure.leftItems = items.map(item => item.trim())
      } else {
        structure.rightItems = items.map(item => item.trim())
      }
      structure.confidence += 15
    }
  })
  
  // 🔢 智能提取数字/字母选项（如A、B、C对应1、2、3）
  const optionPatterns = [
    { pattern: /[ABCD][\s.、]*([^ABCD\n]{1,20})/g, side: 'left' },
    { pattern: /[①②③④⑤⑥][\s.、]*([^①-⑥\n]{1,20})/g, side: 'right' },
    { pattern: /[1234567890][\s.、）)]*([^0-9\n]{1,20})/g, side: 'right' }
  ]
  
  optionPatterns.forEach(({ pattern, side }) => {
    const matches = Array.from(text.matchAll(pattern))
    if (matches.length >= 2) {
      const items = matches.map(match => match[1].trim()).filter(item => item.length > 0)
      if (items.length >= 2) {
        if (side === 'left' && structure.leftItems.length === 0) {
          structure.leftItems = items
          structure.confidence += 10
        } else if (side === 'right' && structure.rightItems.length === 0) {
          structure.rightItems = items
          structure.confidence += 10
        }
      }
    }
  })
  
  // 📊 评估复杂度
  const totalItems = structure.leftItems.length + structure.rightItems.length
  if (totalItems >= 8) {
    structure.complexity = 'high'
  } else if (totalItems >= 4) {
    structure.complexity = 'medium'  
  } else if (totalItems >= 2) {
    structure.complexity = 'low'
  } else {
    structure.complexity = 'unknown'
  }
  
  console.log(`📊 [结构解析] 左侧${structure.leftItems.length}项, 右侧${structure.rightItems.length}项, 复杂度${structure.complexity}`)
  console.log(`🎯 [项目识别] 左侧: ${structure.leftItems.join(', ')}`)
  console.log(`🎯 [项目识别] 右侧: ${structure.rightItems.join(', ')}`)
  
  return structure
}

/**
 * 🚀 生成连线题多阶段处理方案
 */
function generateConnectionProcessingPhases(structure, questionAnalysis) {
  return {
    // 📝 阶段1：文本描述转换（立即实现）
    phase1: {
      method: 'text_description_conversion',
      name: '文本描述转换法',
      description: '将连线题转换为文本描述形式，用AI理解和判断',
      implementation: 'immediate',
      developmentTime: '0天（立即可用）',
      userExperience: {
        interaction: '学生用文字描述连线想法',
        example: '"我认为A应该连接到2，因为..."',
        feedback: 'AI分析描述的正确性并给出指导',
        satisfaction: 70
      },
      technicalComplexity: 'very_low',
      advantages: [
        '立即可用，无需额外开发',
        '充分利用现有AI能力',
        '培养学生表达能力',
        '适合所有复杂度的连线题'
      ],
      limitations: [
        '交互体验不如可视化',
        '需要学生有一定表达能力'
      ]
    },
    
    // 🎮 阶段2：简化点击选择（短期目标）
    phase2: {
      method: 'simplified_click_selection',
      name: '智能点击选择法',
      description: '将连线转换为多个选择题，用户点击选择对应关系',
      implementation: 'short_term',
      developmentTime: '3-5天',
      userExperience: {
        interaction: '点击选择对应关系',
        example: '"A对应什么？" [1] [2] [3] [4]',
        feedback: '立即显示对错和正确答案',
        satisfaction: 85
      },
      technicalComplexity: 'medium',
      requiredFeatures: [
        '连线项目智能解析',
        '动态选择题生成',
        '点击选择界面',
        '结果可视化反馈'
      ],
      advantages: [
        '用户体验大幅提升',
        '技术实现相对简单',
        '完全适配移动端',
        '支持部分正确评分'
      ],
      limitations: [
        '不是真正的连线交互',
        '大量连线项目时界面复杂'
      ]
    },
    
    // 🎨 阶段3：真实连线交互（长期目标）
    phase3: {
      method: 'real_connection_drawing',
      name: '真实连线绘制法',
      description: '完整的图形化连线交互，支持手指/鼠标绘制连线',
      implementation: 'long_term',
      developmentTime: '15-20天',
      userExperience: {
        interaction: '手指拖拽绘制连线',
        example: '从左侧项目拖拽到右侧对应项目',
        feedback: '实时连线效果+智能判断结果',
        satisfaction: 95
      },
      technicalComplexity: 'high',
      requiredFeatures: [
        'Canvas图形绘制引擎',
        '触摸手势识别系统',
        '连线路径智能分析',
        '碰撞检测算法',
        '美观的动画效果',
        '撤销重做功能'
      ],
      advantages: [
        '最佳用户体验',
        '真实模拟纸质练习',
        '支持复杂连线题',
        '具有强商业竞争力'
      ],
      limitations: [
        '开发复杂度高',
        '需要专业图形界面技能',
        '设备性能要求较高'
      ]
    }
  }
}

/**
 * 🎯 选择最适合的当前实现方案
 */
function selectOptimalCurrentSolution(phases, structure) {
  console.log('🎯 [方案选择] 根据当前条件选择最优方案...')
  
  // 基于复杂度和可行性选择方案
  if (structure.complexity === 'high' || structure.leftItems.length === 0) {
    // 复杂题目或解析失败：使用文本描述法
    return {
      ...phases.phase1,
      reasoning: '题目复杂度高或解析困难，推荐使用文本描述法确保准确性',
      confidence: 90
    }
  } else if (structure.complexity === 'medium') {
    // 中等复杂度：推荐文本描述法，提示未来升级空间
    return {
      ...phases.phase1,
      reasoning: '中等复杂度题目，当前使用文本法，后续可升级为点击选择',
      confidence: 85,
      upgradeRecommendation: phases.phase2
    }
  } else {
    // 简单题目：使用文本描述法，强烈建议升级
    return {
      ...phases.phase1,
      reasoning: '简单连线题，适合快速升级到点击选择法提升体验',
      confidence: 80,
      upgradeRecommendation: phases.phase2,
      upgradePriority: 'high'
    }
  }
}

/**
 * ⏱️ 计算开发时间
 */
function calculateDevelopmentTime(phases) {
  return {
    phase1: 0, // 立即可用
    phase2: 5, // 3-5天
    phase3: 18, // 15-20天
    total: 23,
    unit: 'days'
  }
}

/**
 * 📊 计算用户体验分数
 */
function calculateUXScore(solution) {
  const baseScore = solution.userExperience?.satisfaction || 70
  const complexityPenalty = solution.technicalComplexity === 'very_low' ? 0 : 10
  return Math.max(baseScore - complexityPenalty, 50)
}

/**
 * 💰 评估商业可行性
 */
function assessCommercialViability(phases) {
  return {
    immediate: {
      cost: 'zero',
      timeToMarket: 'immediate',
      competitiveness: 'medium',
      userSatisfaction: 'good'
    },
    shortTerm: {
      cost: 'low',
      timeToMarket: '1_week',
      competitiveness: 'high',
      userSatisfaction: 'excellent'
    },
    longTerm: {
      cost: 'medium',
      timeToMarket: '3_weeks',
      competitiveness: 'industry_leading',
      userSatisfaction: 'exceptional'
    },
    recommendation: '建议采用分阶段实施：立即启用阶段1，同时开发阶段2，规划阶段3'
  }
}

/**
 * 🎯 阿里云版面分析 - 检测多题目区域 (新增功能，不影响现有代码)
 * @param {string} imageData - base64图片数据
 * @returns {Promise<Array>} 题目区域数组
 */
async function detectQuestionRegionsWithAliyun(imageData) {
  try {
    console.log('🔍 [版面分析] 开始检测题目区域...')
    
    // 构建阿里云版面分析请求
    const layoutRequestData = {
      model: 'qwen-vl-ocr-latest',
      input: {
        messages: [
          {
            role: "system",
            content: [{
              text: "你是一个专业的文档版面分析专家。请分析图片中是否包含多个独立的题目，并识别每个题目的大致位置区域。"
            }]
          },
          {
            role: "user", 
            content: [
              {
                image: imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`
              },
              {
                text: `请分析这张图片：
1. 图片中有几个独立的题目？
2. 每个题目大致在图片的哪个区域？

请按以下格式回答：
题目数量：X个
题目1位置：上半部分/下半部分/左半部分/右半部分/全图
题目2位置：上半部分/下半部分/左半部分/右半部分/全图
...

如果只有1个题目或题目无法明确分离，请回答：题目数量：1个`
              }
            ]
          }
        ]
      },
      parameters: {
        max_tokens: 500,
        temperature: 0.1
      }
    }

    // 发送版面分析请求
    const response = await axios.post(
      `${DASHSCOPE_CONFIG.baseURL}/api/v1/services/aigc/multimodal-generation/generation`,
      layoutRequestData,
      {
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    )

    if (response.status === 200 && response.data?.output?.choices?.[0]?.message?.content) {
      const analysisResult = response.data.output.choices[0].message.content
      console.log('📊 [版面分析] AI分析结果:', analysisResult)
      
      // 解析分析结果
      const questionRegions = parseLayoutAnalysisResult(analysisResult)
      
      console.log('✅ [版面分析] 检测到', questionRegions.length, '个题目区域')
      return questionRegions
    }
    
    console.log('⚠️ [版面分析] 分析结果格式异常，回退到单题目模式')
    return [{ region: 'full', confidence: 1.0 }]
    
  } catch (error) {
    console.error('❌ [版面分析] 失败:', error.message)
    // 安全回退：如果版面分析失败，按单题目处理
    return [{ region: 'full', confidence: 1.0 }]
  }
}

/**
 * 🔧 解析版面分析结果
 * @param {string} analysisText - AI分析文本
 * @returns {Array} 题目区域数组
 */
function parseLayoutAnalysisResult(analysisText) {
  const regions = []
  
  try {
    // 提取题目数量
    const countMatch = analysisText.match(/题目数量[：:]\s*(\d+)个?/i)
    const questionCount = countMatch ? parseInt(countMatch[1]) : 1
    
    if (questionCount <= 1) {
      return [{ region: 'full', confidence: 1.0 }]
    }
    
    // 解析每个题目的位置
    const positionMatches = analysisText.match(/题目\d+位置[：:]\s*([^\n\r]+)/gi)
    
    if (positionMatches && positionMatches.length > 1) {
      positionMatches.forEach((match, index) => {
        const positionText = match.split(/[：:]/)[1].trim()
        let region = 'full'
        let confidence = 0.8
        
        if (positionText.includes('上半部分') || positionText.includes('上部')) {
          region = 'top_half'
          confidence = 0.9
        } else if (positionText.includes('下半部分') || positionText.includes('下部')) {
          region = 'bottom_half'
          confidence = 0.9
        } else if (positionText.includes('左半部分') || positionText.includes('左部')) {
          region = 'left_half'
          confidence = 0.8
        } else if (positionText.includes('右半部分') || positionText.includes('右部')) {
          region = 'right_half'
          confidence = 0.8
        }
        
        regions.push({
          region: region,
          confidence: confidence,
          questionIndex: index + 1,
          description: positionText
        })
      })
    }
    
    // 如果解析失败，按题目数量平均分割
    if (regions.length === 0 && questionCount > 1) {
      if (questionCount === 2) {
        regions.push({ region: 'top_half', confidence: 0.7, questionIndex: 1 })
        regions.push({ region: 'bottom_half', confidence: 0.7, questionIndex: 2 })
      } else {
        // 多于2个题目时，回退到单题目模式
        regions.push({ region: 'full', confidence: 1.0 })
      }
    }
    
  } catch (error) {
    console.error('❌ [版面分析] 结果解析失败:', error.message)
    return [{ region: 'full', confidence: 1.0 }]
  }
  
  return regions.length > 0 ? regions : [{ region: 'full', confidence: 1.0 }]
}

/**
 * 🖼️ 根据区域裁剪图片数据 (模拟实现)
 * @param {string} imageData - 原始图片base64
 * @param {Object} regionInfo - 区域信息
 * @returns {string} 裁剪后的图片base64
 */
async function cropImageByRegion(imageData, regionInfo) {
  // 注意：这是一个简化实现
  // 在实际使用中，这里应该使用图像处理库（如sharp）来真正裁剪图片
  // 现在暂时返回原图，但标记了区域信息
  
  console.log('🖼️ [图片裁剪] 模拟裁剪区域:', regionInfo.region)
  
  // TODO: 在后续版本中，这里会实现真正的图片裁剪
  // 现在为了不破坏现有功能，先返回原图并在prompt中指定区域
  return imageData
}

/**
 * 🔄 合并多区域OCR结果
 * @param {Array} ocrResults - 多个OCR结果
 * @returns {Object} 合并后的结果
 */
function mergeMultiRegionOCRResults(ocrResults) {
  console.log('🔄 [结果合并] 开始合并', ocrResults.length, '个OCR结果')
  
  // 合并文本内容
  const combinedTexts = ocrResults
    .filter(result => result.success && result.data.ocrText)
    .map(result => result.data.ocrText)
  
  if (combinedTexts.length === 0) {
    throw new Error('所有区域OCR识别都失败')
  }
  
  // 使用第一个成功结果作为基础
  const baseResult = ocrResults.find(result => result.success)
  
  // 合并结果
  const mergedResult = {
    ...baseResult.data,
    ocrText: combinedTexts, // 返回数组，保持题目分离
    questionCount: combinedTexts.length,
    
    // 新增：多题目模式标识
    isMultiQuestion: true,
    questionRegions: ocrResults.map((result, index) => ({
      questionIndex: index + 1,
      text: result.success ? result.data.ocrText : '',
      region: result.regionInfo || 'unknown',
      confidence: result.success ? result.data.confidence : 0
    })),
    
    // 合并的总体信息
    totalConfidence: ocrResults.reduce((sum, result) => 
      sum + (result.success ? result.data.confidence : 0), 0) / ocrResults.length
  }
  
  console.log('✅ [结果合并] 完成，共', combinedTexts.length, '个题目')
  return mergedResult
}

module.exports = router 