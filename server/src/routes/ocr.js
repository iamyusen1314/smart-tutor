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
  apiKey: process.env.DASHSCOPE_API_KEY || 'sk-a791758fe21c4a719b2c632d5345996f',
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
        const processedText = enhancedProcessOCRText(ocrText)
        
        // 🔑 智能检测学科和年级
        const detectedSubject = detectSubject(ocrText)
        const detectedGrade = detectGrade(ocrText)
        
        console.log('✅ 增强OCR识别成功')
        console.log('📝 处理后识别结果:', processedText)
        console.log('🎓 检测到学科:', detectedSubject)
        console.log('📚 检测到年级:', detectedGrade)

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
            questionCount: processedText.length
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

    // 清理临时文件
    await fs.unlink(req.file.path).catch(console.warn)

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
        const processedText = enhancedProcessOCRText(ocrText)
        
        // 🔑 智能检测学科和年级
        const detectedSubject = detectSubject(ocrText)
        const detectedGrade = detectGrade(ocrText)
        
        console.log('✅ 文件上传增强OCR识别成功')
        console.log('📝 处理后识别结果:', processedText)
        console.log('🎓 检测到学科:', detectedSubject)
        console.log('📚 检测到年级:', detectedGrade)

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
            }
          }
        })
      }
    }

    throw new Error('DashScope返回格式异常')

  } catch (error) {
    console.error('❌ 文件上传增强OCR识别失败:', error)
    
    // 清理临时文件
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
    
    // 🔑 修复：先去除题目编号，再进行分割
    // 匹配模式：数字编号 + 空格 + 数学表达式
    let cleanedText = processed
      // 去除题目编号：匹配 "数字. " 或 "数字) " 开头的模式
      .replace(/^\s*\d+[\.\)]\s+/gm, '')  // 去除 "1. " 或 "1) " 形式的编号
      .replace(/(\s|^)\d{1,2}\s+(?=\d+\s*[+\-×÷])/g, '$1')  // 去除 " 12 8+7=" 中的 "12 "
      // 🔑 新增：处理行中间的编号，如 "8+7= 2. 9+3=" 中的 "2. "
      .replace(/\s+\d+[\.\)]\s+(?=\d+\s*[+\-×÷])/g, ' ')  // 去除中间的编号
      // 🔑 新增：处理中文编号，如 "第1题："
      .replace(/第\d+题[：:]\s*/g, '')
    
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

  // 🔑 最终清理：确保所有题目都没有编号残留
  textArray = textArray.map(item => {
    return item
      .replace(/^\s*\d+[\.\)]\s*/, '')  // 去除 "1. " 形式
      .replace(/^\s*\d{1,2}\s+/, '')    // 去除 "12 " 形式
      .replace(/\s+/g, ' ')             // 标准化空格
      .trim()
  }).filter(item => item.length > 1)

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
 * 🎓 智能检测学科类型
 * @param {string} text - OCR识别的文本
 * @returns {string} 学科类型 (math/chinese/english)
 */
function detectSubject(text) {
  if (!text || typeof text !== 'string') {
    return 'math' // 默认数学
  }

  const textLower = text.toLowerCase()
  
  // 🔢 数学相关关键词和模式
  const mathPatterns = [
    /\d+\s*[+\-×÷]\s*\d+/,                    // 数学运算表达式
    /=\s*\d+/,                                // 等号加数字
    /\d+\s*=\s*$/,                           // 数字等号结尾
    /[+\-×÷]\s*\d+/,                         // 运算符加数字
    /\(\s*\d+/,                              // 括号内数字
    /\d+\s*\)/,                              // 数字加括号
    /求|计算|解|答案|得/,                      // 数学术语
    /加|减|乘|除|等于/,                       // 中文数学运算
    /面积|周长|体积|长度|宽度|高度/,           // 几何术语
    /分数|小数|整数|负数/,                     // 数字类型
    /方程|函数|图形|角度/,                     // 高级数学概念
  ]

  // 🇨🇳 语文相关关键词
  const chinesePatterns = [
    /阅读|理解|文章|段落|句子/,
    /作文|写作|日记|书信/,
    /古诗|诗歌|文言文|现代文/,
    /字词|拼音|笔画|部首/,
    /标点|修辞|比喻|拟人/,
    /主题|中心|大意|感受/,
    /背诵|朗读|默写/,
    /成语|词语|造句/
  ]

  // 🇬🇧 英语相关关键词
  const englishPatterns = [
    /[a-zA-Z]{3,}/,                          // 3个或以上字母的英文单词
    /reading|writing|listening|speaking/i,    // 英语技能
    /grammar|vocabulary|sentence/i,           // 语法词汇
    /translation|translate/i,                 // 翻译相关
    /english|abc|hello|what|how|where/i,     // 常见英语词汇
    /apple|book|cat|dog|house/i,             // 小学英语单词
  ]

  // 计算各学科的匹配分数
  let mathScore = 0
  let chineseScore = 0
  let englishScore = 0

  // 检查数学模式
  mathPatterns.forEach(pattern => {
    const matches = text.match(pattern)
    if (matches) {
      mathScore += matches.length
    }
  })

  // 检查语文模式
  chinesePatterns.forEach(pattern => {
    const matches = text.match(pattern)
    if (matches) {
      chineseScore += matches.length
    }
  })

  // 检查英语模式
  englishPatterns.forEach(pattern => {
    const matches = text.match(pattern)
    if (matches) {
      englishScore += matches.length
    }
  })

  // 🔑 特殊判断逻辑
  
  // 如果包含大量数字和运算符，很可能是数学
  const numberCount = (text.match(/\d/g) || []).length
  const operatorCount = (text.match(/[+\-×÷=]/g) || []).length
  if (numberCount > 5 && operatorCount > 2) {
    mathScore += 10
  }

  // 如果包含大量中文字符，可能是语文
  const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  if (chineseCharCount > 10) {
    chineseScore += 5
  }

  // 如果包含大量英文字母，可能是英语
  const englishCharCount = (text.match(/[a-zA-Z]/g) || []).length
  if (englishCharCount > 10) {
    englishScore += 5
  }

  console.log('📊 学科检测分数:', { 
    math: mathScore, 
    chinese: chineseScore, 
    english: englishScore,
    stats: { numberCount, operatorCount, chineseCharCount, englishCharCount }
  })

  // 返回得分最高的学科
  if (mathScore >= chineseScore && mathScore >= englishScore) {
    return 'math'
  } else if (chineseScore >= englishScore) {
    return 'chinese'
  } else {
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



module.exports = router 