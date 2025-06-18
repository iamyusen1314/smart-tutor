/**
 * 教材数据管理路由
 * @description 处理教材数据的导入、管理和查询
 */

const express = require('express')
const multer = require('multer')
const xlsx = require('xlsx')
const router = express.Router()

// 引入数据模型
const Question = require('../models/Question')
const Plan = require('../models/Plan')
const User = require('../models/User')

// 引入PDF处理工具
const pdfExtractor = require('../utils/pdfExtractor')

// 配置文件上传
const upload = multer({
  dest: 'uploads/materials/',
  fileFilter: (req, file, cb) => {
    // 允许Excel、JSON、CSV和PDF文件
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/json' ||
        file.mimetype === 'text/csv' ||
        file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('只支持Excel(.xlsx)、JSON、CSV和PDF文件'))
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB限制（支持大PDF文件）
  }
})

/**
 * @api {post} /api/materials/upload 上传教材数据文件
 * @apiDescription 支持Excel、JSON、CSV格式的教材数据批量导入
 */
router.post('/upload', upload.single('materialFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: '请上传教材数据文件' 
      })
    }

    const { subject, grade, source = 'manual' } = req.body

    // 验证必需参数
    if (!subject || !grade) {
      return res.status(400).json({
        success: false,
        message: '请指定学科和年级'
      })
    }

    let materialData = []
    const filePath = req.file.path
    const fileType = req.file.mimetype

    // 根据文件类型解析数据
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
      // 解析Excel文件
      const workbook = xlsx.readFile(filePath)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      materialData = xlsx.utils.sheet_to_json(worksheet)
    } else if (fileType.includes('json')) {
      // 解析JSON文件
      const fs = require('fs')
      const jsonData = fs.readFileSync(filePath, 'utf8')
      materialData = JSON.parse(jsonData)
    } else if (fileType.includes('csv')) {
      // 解析CSV文件
      const csv = require('csv-parser')
      const fs = require('fs')
      materialData = await new Promise((resolve, reject) => {
        const results = []
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', reject)
      })
    }

    // 验证和标准化数据
    const validatedData = await validateAndNormalizeMaterials(materialData, subject, grade)
    
    // 批量创建题目
    const createdQuestions = await Question.insertMany(validatedData.questions)
    
    // 创建教材学习计划
    if (validatedData.plans && validatedData.plans.length > 0) {
      const createdPlans = await Plan.insertMany(validatedData.plans)
    }

    // 清理上传的临时文件
    const fs = require('fs')
    fs.unlinkSync(filePath)

    res.json({
      success: true,
      message: '教材数据导入成功',
      data: {
        importedQuestions: createdQuestions.length,
        importedPlans: validatedData.plans?.length || 0,
        source,
        subject,
        grade
      }
    })

  } catch (error) {
    console.error('教材数据导入失败:', error)
    res.status(500).json({
      success: false,
      message: '教材数据导入失败',
      error: error.message
    })
  }
})

/**
 * @api {post} /api/materials/manual 手动录入教材内容
 * @apiDescription 手动录入单个题目或教材内容
 */
router.post('/manual', async (req, res) => {
  try {
    const {
      title,
      content,
      type,
      subject,
      grade,
      knowledgePoints,
      difficulty,
      answer,
      explanation,
      hints,
      solutionSteps,
      options, // 选择题选项
      tags,
      estimatedTime
    } = req.body

    // 生成题目ID
    const questionId = `${subject}_${grade}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 创建题目
    const questionData = {
      questionId,
      title,
      content,
      type,
      subject,
      grade,
      knowledgePoints: knowledgePoints || [],
      difficulty: difficulty || 'normal',
      answer,
      explanation,
      hints: hints || [],
      solutionSteps: solutionSteps || [],
      options: options || [],
      tags: tags || [],
      estimatedTime: estimatedTime || 5,
      source: 'manual',
      createdBy: req.user?.id || 'system',
      status: 'published',
      reviewStatus: 'approved'
    }

    const question = await Question.create(questionData)

    res.json({
      success: true,
      message: '教材内容录入成功',
      data: question
    })

  } catch (error) {
    console.error('手动录入失败:', error)
    res.status(500).json({
      success: false,
      message: '录入失败',
      error: error.message
    })
  }
})

/**
 * @api {get} /api/materials/template 下载导入模板
 * @apiDescription 下载教材数据导入的Excel模板
 */
router.get('/template', (req, res) => {
  try {
    // 创建模板数据
    const templateData = [
      {
        '题目标题': '示例：计算题',
        '题目内容': '计算 25 + 37 = ?',
        '题目类型': 'calculation', // choice, fill_blank, calculation, essay, true_false
        '学科': 'math', // math, chinese, english
        '年级': 2,
        '知识点': '两位数加法,进位加法', // 用逗号分隔多个知识点
        '难度': 'normal', // easy, normal, hard
        '答案': '62',
        '解析': '先算个位：5+7=12，写2进1；再算十位：2+3+1=6，所以答案是62',
        '提示1': '先从个位开始计算',
        '提示2': '注意进位',
        '提示3': '检查计算结果',
        '标签': '计算,加法,进位', // 用逗号分隔
        '预估用时': 3, // 分钟
        '选项A': '', // 选择题选项，非选择题留空
        '选项B': '',
        '选项C': '',
        '选项D': '',
        '正确选项': '' // 选择题的正确选项(A/B/C/D)，非选择题留空
      }
    ]

    // 创建工作簿
    const wb = xlsx.utils.book_new()
    const ws = xlsx.utils.json_to_sheet(templateData)
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 15 }, // 题目标题
      { wch: 30 }, // 题目内容
      { wch: 12 }, // 题目类型
      { wch: 8 },  // 学科
      { wch: 6 },  // 年级
      { wch: 20 }, // 知识点
      { wch: 8 },  // 难度
      { wch: 15 }, // 答案
      { wch: 40 }, // 解析
      { wch: 20 }, // 提示1
      { wch: 20 }, // 提示2
      { wch: 20 }, // 提示3
      { wch: 15 }, // 标签
      { wch: 8 },  // 预估用时
      { wch: 15 }, // 选项A
      { wch: 15 }, // 选项B
      { wch: 15 }, // 选项C
      { wch: 15 }, // 选项D
      { wch: 8 }   // 正确选项
    ]

    xlsx.utils.book_append_sheet(wb, ws, '教材导入模板')

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="material_import_template.xlsx"')

    // 写入响应
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })
    res.send(buffer)

  } catch (error) {
    console.error('模板下载失败:', error)
    res.status(500).json({
      success: false,
      message: '模板下载失败',
      error: error.message
    })
  }
})

/**
 * @api {get} /api/materials/search 搜索教材内容
 * @apiDescription 根据条件搜索已导入的教材内容
 */
router.get('/search', async (req, res) => {
  try {
    const {
      subject,
      grade,
      knowledgePoint,
      difficulty,
      type,
      keyword,
      page = 1,
      limit = 20
    } = req.query

    // 构建查询条件
    const query = { status: 'published' }
    
    if (subject) query.subject = subject
    if (grade) query.grade = parseInt(grade)
    if (difficulty) query.difficulty = difficulty
    if (type) query.type = type
    if (knowledgePoint) query.knowledgePoints = { $in: [knowledgePoint] }
    
    // 关键词搜索
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { content: { $regex: keyword, $options: 'i' } },
        { tags: { $in: [new RegExp(keyword, 'i')] } }
      ]
    }

    // 执行查询
    const questions = await Question.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v')

    const total = await Question.countDocuments(query)

    res.json({
      success: true,
      data: {
        questions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })

  } catch (error) {
    console.error('教材搜索失败:', error)
    res.status(500).json({
      success: false,
      message: '搜索失败',
      error: error.message
    })
  }
})

/**
 * @api {get} /api/materials/stats 获取教材统计信息
 * @apiDescription 获取已导入教材的统计信息
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await Question.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: {
            subject: '$subject',
            grade: '$grade'
          },
          count: { $sum: 1 },
          difficulties: { $push: '$difficulty' },
          types: { $push: '$type' },
          knowledgePoints: { $push: '$knowledgePoints' }
        }
      },
      {
        $group: {
          _id: '$_id.subject',
          grades: {
            $push: {
              grade: '$_id.grade',
              count: '$count',
              difficulties: '$difficulties',
              types: '$types',
              knowledgePoints: '$knowledgePoints'
            }
          },
          totalCount: { $sum: '$count' }
        }
      }
    ])

    // 计算总体统计
    const overallStats = await Question.aggregate([
      { $match: { status: 'published' } },
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          subjects: { $addToSet: '$subject' },
          grades: { $addToSet: '$grade' },
          avgEstimatedTime: { $avg: '$estimatedTime' }
        }
      }
    ])

    res.json({
      success: true,
      data: {
        bySubject: stats,
        overall: overallStats[0] || {
          totalQuestions: 0,
          subjects: [],
          grades: [],
          avgEstimatedTime: 0
        }
      }
    })

  } catch (error) {
    console.error('统计信息获取失败:', error)
    res.status(500).json({
      success: false,
      message: '统计信息获取失败',
      error: error.message
    })
  }
})

/**
 * @api {post} /api/materials/pdf-extract 从PDF教材提取题目内容
 * @apiDescription 从上传的PDF教材文件中提取题目内容并导入到系统
 */
router.post('/pdf-extract', upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: '请上传PDF教材文件' 
      })
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: '请上传PDF格式的文件'
      })
    }

    const { subject = 'math', grade = 1, maxQuestions = 50 } = req.body

    // 验证必需参数
    if (!subject || !grade) {
      return res.status(400).json({
        success: false,
        message: '请指定学科和年级'
      })
    }

    console.log(`开始处理PDF文件: ${req.file.originalname}`)
    
    // 提取PDF内容
    const extractionResult = await pdfExtractor.extractFromLocalPDF(req.file.path, {
      subject,
      grade: parseInt(grade),
      maxQuestions: parseInt(maxQuestions)
    })

    if (!extractionResult.success) {
      return res.status(500).json({
        success: false,
        message: 'PDF内容提取失败',
        error: extractionResult.message
      })
    }

    // 转换为系统格式
    const systemQuestions = pdfExtractor.convertToSystemFormat(
      extractionResult.data.extractedQuestions
    )

    // 批量创建题目
    const createdQuestions = await Question.insertMany(systemQuestions)

    // 清理上传的临时文件
    const fs = require('fs')
    fs.unlinkSync(req.file.path)

    res.json({
      success: true,
      message: `成功从PDF提取并导入 ${createdQuestions.length} 道题目`,
      data: {
        extractedQuestions: createdQuestions.length,
        source: 'pdf_extraction',
        pdfFile: req.file.originalname,
        subject,
        grade,
        metadata: extractionResult.data.metadata,
        preview: createdQuestions.slice(0, 3) // 返回前3道题目作为预览
      }
    })

  } catch (error) {
    console.error('PDF提取失败:', error)
    res.status(500).json({
      success: false,
      message: 'PDF内容提取失败',
      error: error.message
    })
  }
})

/**
 * @api {post} /api/materials/github-download 从GitHub下载教材
 * @apiDescription 从ChinaTextbook仓库下载指定教材并提取内容
 */
router.post('/github-download', async (req, res) => {
  try {
    const { subject, grade, semester = '上册' } = req.body

    // 验证必需参数
    if (!subject || !grade) {
      return res.status(400).json({
        success: false,
        message: '请指定学科和年级'
      })
    }

    console.log(`准备从GitHub下载: ${subject} ${grade}年级${semester}`)

    // 尝试下载教材
    const downloadResult = await pdfExtractor.downloadMaterialFromGitHub(
      subject, 
      parseInt(grade), 
      semester
    )

    if (!downloadResult.success) {
      return res.json({
        success: false,
        message: downloadResult.message,
        suggestions: [
          '1. 手动从GitHub下载PDF文件',
          '2. 使用本地PDF上传功能',
          '3. 使用Excel导入功能手动录入题目'
        ],
        githubUrl: `https://github.com/TapXWorld/ChinaTextbook`,
        suggestedPath: downloadResult.suggestedPath
      })
    }

    // 如果下载成功，进行内容提取
    // 这部分代码在实际实现时会处理下载后的PDF

    res.json({
      success: true,
      message: '教材下载成功',
      data: downloadResult
    })

  } catch (error) {
    console.error('GitHub下载失败:', error)
    res.status(500).json({
      success: false,
      message: 'GitHub教材下载失败',
      error: error.message
    })
  }
})

/**
 * @api {post} /api/materials/batch-pdf 批量处理PDF文件
 * @apiDescription 批量处理多个PDF教材文件
 */
router.post('/batch-pdf', upload.array('pdfFiles', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '请上传至少一个PDF文件' 
      })
    }

    console.log(`开始批量处理 ${req.files.length} 个PDF文件`)

    const pdfPaths = req.files.map(file => file.path)
    const globalOptions = {
      maxQuestions: parseInt(req.body.maxQuestions) || 50
    }

    // 批量处理PDF
    const batchResult = await pdfExtractor.batchProcessPDFs(pdfPaths, globalOptions)

    // 将所有提取的题目转换并保存
    let totalCreated = 0
    const allResults = []

    for (const result of batchResult.results) {
      if (result.success && result.data.extractedQuestions.length > 0) {
        const systemQuestions = pdfExtractor.convertToSystemFormat(
          result.data.extractedQuestions
        )
        
        const createdQuestions = await Question.insertMany(systemQuestions)
        totalCreated += createdQuestions.length
        
        allResults.push({
          file: result.file,
          created: createdQuestions.length,
          subject: result.data.subject,
          grade: result.data.grade
        })
      }
    }

    // 清理临时文件
    const fs = require('fs')
    req.files.forEach(file => {
      try {
        fs.unlinkSync(file.path)
      } catch (err) {
        console.warn('清理临时文件失败:', file.path)
      }
    })

    res.json({
      success: true,
      message: `批量处理完成，共创建 ${totalCreated} 道题目`,
      data: {
        totalProcessed: batchResult.processed,
        totalFailed: batchResult.failed,
        totalCreated,
        results: allResults,
        errors: batchResult.errors
      }
    })

  } catch (error) {
    console.error('批量PDF处理失败:', error)
    res.status(500).json({
      success: false,
      message: '批量PDF处理失败',
      error: error.message
    })
  }
})

/**
 * 验证和标准化教材数据
 * @param {Array} rawData - 原始数据
 * @param {string} subject - 学科
 * @param {number} grade - 年级
 * @returns {Object} 验证后的数据
 */
async function validateAndNormalizeMaterials(rawData, subject, grade) {
  const validatedQuestions = []
  const validatedPlans = []
  const errors = []

  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i]
    
    try {
      // 验证必需字段
      if (!item['题目内容'] && !item.content) {
        errors.push(`第${i + 1}行：缺少题目内容`)
        continue
      }

      if (!item['答案'] && !item.answer) {
        errors.push(`第${i + 1}行：缺少答案`)
        continue
      }

      // 生成唯一ID
      const questionId = `${subject}_${grade}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // 处理知识点
      let knowledgePoints = []
      const knowledgePointsStr = item['知识点'] || item.knowledgePoints || ''
      if (knowledgePointsStr) {
        knowledgePoints = knowledgePointsStr.split(',').map(point => point.trim()).filter(point => point)
      }

      // 处理提示
      const hints = []
      for (let j = 1; j <= 3; j++) {
        const hintKey = `提示${j}`
        const hintContent = item[hintKey] || item[`hint${j}`]
        if (hintContent && hintContent.trim()) {
          hints.push({
            level: j,
            content: hintContent.trim()
          })
        }
      }

      // 处理选择题选项
      let options = []
      if ((item['题目类型'] || item.type) === 'choice') {
        const optionKeys = ['A', 'B', 'C', 'D']
        const correctOption = item['正确选项'] || item.correctOption
        
        optionKeys.forEach(key => {
          const optionContent = item[`选项${key}`] || item[`option${key}`]
          if (optionContent && optionContent.trim()) {
            options.push({
              key,
              content: optionContent.trim(),
              isCorrect: key === correctOption
            })
          }
        })
      }

      // 处理标签
      let tags = []
      const tagsStr = item['标签'] || item.tags || ''
      if (tagsStr) {
        tags = tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag)
      }

      // 构建题目数据
      const questionData = {
        questionId,
        title: item['题目标题'] || item.title || `${subject}题目_${i + 1}`,
        content: item['题目内容'] || item.content,
        type: item['题目类型'] || item.type || 'calculation',
        subject: subject,
        grade: parseInt(grade),
        knowledgePoints,
        difficulty: item['难度'] || item.difficulty || 'normal',
        answer: item['答案'] || item.answer,
        explanation: item['解析'] || item.explanation || '',
        hints,
        options,
        tags,
        estimatedTime: parseInt(item['预估用时'] || item.estimatedTime || 5),
        source: 'import',
        status: 'published',
        reviewStatus: 'approved',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      validatedQuestions.push(questionData)

    } catch (error) {
      errors.push(`第${i + 1}行数据处理失败: ${error.message}`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`数据验证失败:\n${errors.join('\n')}`)
  }

  return {
    questions: validatedQuestions,
    plans: validatedPlans
  }
}

module.exports = router 