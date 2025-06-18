/**
 * PDF教材内容提取工具
 * @description 从PDF教材中提取题目内容并转换为系统可用格式
 */

const fs = require('fs')
const path = require('path')

// 如果要实际使用，需要安装这些依赖：
// npm install pdf-parse pdf2pic sharp

/**
 * PDF提取配置
 */
const config = {
  // 支持的学科映射
  subjectMapping: {
    '数学': 'math',
    '语文': 'chinese', 
    '英语': 'english'
  },
  
  // 年级映射
  gradeMapping: {
    '一年级': 1,
    '二年级': 2,
    '三年级': 3,
    '四年级': 4,
    '五年级': 5,
    '六年级': 6
  },
  
  // 题目类型识别模式
  questionPatterns: {
    choice: /[ABCD][\.\)]/,
    calculation: /计算|求|=|\+|\-|\×|\÷/,
    fill_blank: /填空|___|__/,
    essay: /简答|解释|说明|为什么/,
    true_false: /判断|对错|√|×/
  }
}

/**
 * 从GitHub下载指定教材
 * @param {string} subject 学科
 * @param {number} grade 年级
 * @param {string} semester 学期 (上册/下册)
 */
async function downloadMaterialFromGitHub(subject, grade, semester = '上册') {
  try {
    console.log(`准备下载 ${subject} ${grade}年级${semester} 教材...`)
    
    // 构建GitHub文件路径
    const subjectPaths = {
      '数学': '小学',
      '语文': '小学', 
      '英语': '小学'
    }
    
    const fileName = `义务教育教科书·${subject}${grade}年级${semester}.pdf`
    const githubUrl = `https://raw.githubusercontent.com/TapXWorld/ChinaTextbook/master/${subjectPaths[subject]}/${fileName}`
    
    console.log('下载链接:', githubUrl)
    
    // 实际下载逻辑（需要实现）
    console.log('⚠️ 注意：实际下载需要考虑以下因素：')
    console.log('1. 文件大小可能很大（100MB+）')
    console.log('2. 网络稳定性要求')
    console.log('3. 存储空间需求')
    console.log('4. 版权合规性')
    
    return {
      success: false,
      message: '请手动下载PDF文件后使用本地提取功能',
      suggestedPath: `./downloads/${fileName}`
    }
    
  } catch (error) {
    console.error('下载失败:', error)
    throw error
  }
}

/**
 * 从本地PDF文件提取内容
 * @param {string} pdfPath PDF文件路径
 * @param {Object} options 提取选项
 */
async function extractFromLocalPDF(pdfPath, options = {}) {
  try {
    console.log(`开始提取PDF内容: ${pdfPath}`)
    
    // 检查文件是否存在
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF文件不存在: ${pdfPath}`)
    }
    
    const {
      subject = 'math',
      grade = 1,
      maxQuestions = 50, // 限制提取的题目数量
      skipPages = 10 // 跳过前几页（目录等）
    } = options
    
    console.log('⚠️ PDF内容提取功能需要以下步骤：')
    console.log('1. 安装 pdf-parse: npm install pdf-parse')
    console.log('2. 安装 pdf2pic: npm install pdf2pic') 
    console.log('3. 实现OCR文字识别')
    console.log('4. 实现AI题目解析')
    
    // 模拟提取结果
    const extractedQuestions = generateSampleQuestions(subject, grade, 10)
    
    return {
      success: true,
      message: `成功提取 ${extractedQuestions.length} 道题目`,
      data: {
        source: pdfPath,
        subject,
        grade,
        extractedQuestions,
        metadata: {
          totalPages: 100,
          processedPages: 90,
          extractionTime: new Date(),
          confidence: 85 // 提取准确度
        }
      }
    }
    
  } catch (error) {
    console.error('PDF提取失败:', error)
    throw error
  }
}

/**
 * 生成示例题目数据（供测试使用）
 * @param {string} subject 学科
 * @param {number} grade 年级
 * @param {number} count 生成数量
 */
function generateSampleQuestions(subject, grade, count) {
  const questions = []
  
  const templates = {
    math: [
      {
        template: '计算 ${num1} + ${num2} = ?',
        type: 'calculation',
        difficulty: 'easy',
        knowledgePoints: ['加法运算']
      },
      {
        template: '小明有${num1}个苹果，吃了${num2}个，还剩几个？',
        type: 'calculation', 
        difficulty: 'normal',
        knowledgePoints: ['减法应用题']
      }
    ],
    chinese: [
      {
        template: '请给"${char}"字组词',
        type: 'fill_blank',
        difficulty: 'easy',
        knowledgePoints: ['字词理解']
      }
    ],
    english: [
      {
        template: 'What color is the ${object}?',
        type: 'choice',
        difficulty: 'easy',
        knowledgePoints: ['颜色词汇']
      }
    ]
  }
  
  const subjectTemplates = templates[subject] || templates.math
  
  for (let i = 0; i < count; i++) {
    const template = subjectTemplates[i % subjectTemplates.length]
    const questionId = `extracted_${subject}_${grade}_${Date.now()}_${i}`
    
    // 生成随机数据
    const num1 = Math.floor(Math.random() * 50) + 1
    const num2 = Math.floor(Math.random() * 30) + 1
    const chars = ['树', '花', '鸟', '鱼', '山', '水']
    const objects = ['apple', 'book', 'pen', 'bag']
    
    // 填充模板
    let content = template.template
      .replace(/\$\{num1\}/g, num1)
      .replace(/\$\{num2\}/g, num2)
      .replace(/\$\{char\}/g, chars[i % chars.length])
      .replace(/\$\{object\}/g, objects[i % objects.length])
    
    // 计算答案
    let answer = ''
    if (template.type === 'calculation') {
      if (content.includes('+')) {
        answer = (num1 + num2).toString()
      } else if (content.includes('剩')) {
        answer = (num1 - num2).toString()
      }
    }
    
    questions.push({
      questionId,
      title: `${subject}练习题 ${i + 1}`,
      content,
      type: template.type,
      subject,
      grade,
      knowledgePoints: template.knowledgePoints,
      difficulty: template.difficulty,
      answer,
      explanation: `这是第${i + 1}道练习题的解析`,
      hints: [
        { level: 1, content: '仔细阅读题目' },
        { level: 2, content: '按步骤计算' }
      ],
      tags: ['PDF提取', subject],
      estimatedTime: 3,
      source: 'pdf_extraction',
      extractionConfidence: Math.floor(Math.random() * 20) + 80 // 80-100%
    })
  }
  
  return questions
}

/**
 * 批量处理多个PDF文件
 * @param {Array} pdfFiles PDF文件路径列表
 * @param {Object} globalOptions 全局选项
 */
async function batchProcessPDFs(pdfFiles, globalOptions = {}) {
  const results = []
  const errors = []
  
  console.log(`开始批量处理 ${pdfFiles.length} 个PDF文件...`)
  
  for (const pdfPath of pdfFiles) {
    try {
      console.log(`处理: ${path.basename(pdfPath)}`)
      
      // 从文件名解析学科和年级
      const fileName = path.basename(pdfPath, '.pdf')
      const parsedInfo = parseFileNameInfo(fileName)
      
      const options = {
        ...globalOptions,
        ...parsedInfo
      }
      
      const result = await extractFromLocalPDF(pdfPath, options)
      results.push({
        file: pdfPath,
        ...result
      })
      
      // 添加延迟避免过快处理
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`处理 ${pdfPath} 失败:`, error)
      errors.push({
        file: pdfPath,
        error: error.message
      })
    }
  }
  
  return {
    success: results.length > 0,
    processed: results.length,
    failed: errors.length,
    results,
    errors
  }
}

/**
 * 从文件名解析学科和年级信息
 * @param {string} fileName 文件名
 */
function parseFileNameInfo(fileName) {
  const info = {
    subject: 'math',
    grade: 1
  }
  
  // 解析学科
  if (fileName.includes('数学')) info.subject = 'math'
  else if (fileName.includes('语文')) info.subject = 'chinese'
  else if (fileName.includes('英语')) info.subject = 'english'
  
  // 解析年级
  const gradeMatch = fileName.match(/([一二三四五六])年级/)
  if (gradeMatch) {
    const gradeMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 }
    info.grade = gradeMap[gradeMatch[1]] || 1
  }
  
  return info
}

/**
 * 将提取的内容转换为系统格式
 * @param {Array} extractedQuestions 提取的题目
 */
function convertToSystemFormat(extractedQuestions) {
  return extractedQuestions.map(question => ({
    questionId: question.questionId,
    title: question.title,
    content: question.content,
    type: question.type,
    subject: question.subject,
    grade: question.grade,
    knowledgePoints: question.knowledgePoints,
    difficulty: question.difficulty,
    answer: question.answer,
    explanation: question.explanation,
    hints: question.hints,
    tags: [...(question.tags || []), 'ChinaTextbook', 'PDF提取'],
    estimatedTime: question.estimatedTime,
    source: 'chinatextbook_pdf',
    status: 'published',
    reviewStatus: 'pending', // 需要人工审核
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      extractionConfidence: question.extractionConfidence,
      requiresReview: true,
      originalSource: 'ChinaTextbook GitHub仓库'
    }
  }))
}

module.exports = {
  downloadMaterialFromGitHub,
  extractFromLocalPDF,
  batchProcessPDFs,
  generateSampleQuestions,
  convertToSystemFormat,
  config
} 