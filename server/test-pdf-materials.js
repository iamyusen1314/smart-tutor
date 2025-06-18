/**
 * PDF教材处理功能测试脚本
 * @description 测试从GitHub ChinaTextbook仓库处理PDF教材的功能
 */

const fs = require('fs')
const path = require('path')
const axios = require('axios')

// 测试配置
const config = {
  baseURL: 'http://localhost:3000/api/materials',
  testDataDir: './test-data/pdfs',
  downloadDir: './downloads/github-pdfs'
}

/**
 * 初始化测试环境
 */
async function initializeTest() {
  console.log('🔧 初始化PDF教材处理测试环境...')
  
  // 创建测试目录
  const dirs = [config.testDataDir, config.downloadDir]
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      console.log(`✅ 创建目录: ${dir}`)
    }
  })
  
  console.log('🔧 测试环境初始化完成\n')
}

/**
 * 测试GitHub下载功能
 */
async function testGitHubDownload() {
  console.log('📥 测试从GitHub下载教材...')
  
  const testCases = [
    { subject: '数学', grade: 1, semester: '上册' },
    { subject: '语文', grade: 2, semester: '下册' },
    { subject: '英语', grade: 3, semester: '上册' }
  ]
  
  for (const testCase of testCases) {
    try {
      console.log(`正在测试: ${testCase.subject} ${testCase.grade}年级${testCase.semester}`)
      
      const response = await axios.post(`${config.baseURL}/github-download`, testCase)
      
      if (response.data.success) {
        console.log(`✅ ${testCase.subject}教材下载成功`)
      } else {
        console.log(`⚠️  ${testCase.subject}教材下载提示: ${response.data.message}`)
        if (response.data.suggestions) {
          console.log('建议方案:')
          response.data.suggestions.forEach((suggestion, index) => {
            console.log(`   ${index + 1}. ${suggestion}`)
          })
        }
      }
      
    } catch (error) {
      console.error(`❌ ${testCase.subject}教材下载失败:`, error.response?.data?.message || error.message)
    }
    
    console.log('')
  }
}

/**
 * 创建模拟PDF文件用于测试
 */
async function createMockPDFFiles() {
  console.log('📄 创建模拟PDF文件用于测试...')
  
  const mockFiles = [
    '数学一年级上册.pdf',
    '语文二年级下册.pdf',
    '英语三年级上册.pdf'
  ]
  
  const mockPdfContent = Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(这是一个测试PDF文件) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000208 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
303
%%EOF`)
  
  for (const fileName of mockFiles) {
    const filePath = path.join(config.testDataDir, fileName)
    fs.writeFileSync(filePath, mockPdfContent)
    console.log(`✅ 创建模拟PDF: ${fileName}`)
  }
  
  console.log('📄 模拟PDF文件创建完成\n')
}

/**
 * 测试PDF文件上传和提取功能
 */
async function testPDFExtraction() {
  console.log('🔍 测试PDF内容提取功能...')
  
  const testFiles = fs.readdirSync(config.testDataDir).filter(file => file.endsWith('.pdf'))
  
  if (testFiles.length === 0) {
    console.log('⚠️  没有找到测试PDF文件，正在创建...')
    await createMockPDFFiles()
    return testPDFExtraction()
  }
  
  for (const fileName of testFiles) {
    try {
      const filePath = path.join(config.testDataDir, fileName)
      
      // 解析文件名获取学科和年级
      const fileInfo = parseFileName(fileName)
      console.log(`正在处理: ${fileName}`)
      console.log(`解析信息: 学科=${fileInfo.subject}, 年级=${fileInfo.grade}`)
      
      // 模拟文件上传
      const FormData = require('form-data')
      const form = new FormData()
      form.append('pdfFile', fs.createReadStream(filePath))
      form.append('subject', fileInfo.subject)
      form.append('grade', fileInfo.grade)
      form.append('maxQuestions', '20')
      
      const response = await axios.post(`${config.baseURL}/pdf-extract`, form, {
        headers: {
          ...form.getHeaders()
        }
      })
      
      if (response.data.success) {
        console.log(`✅ 成功提取 ${response.data.data.extractedQuestions} 道题目`)
        console.log(`📊 提取信息:`)
        console.log(`   - 来源文件: ${response.data.data.pdfFile}`)
        console.log(`   - 学科: ${response.data.data.subject}`)
        console.log(`   - 年级: ${response.data.data.grade}`)
        
        if (response.data.data.preview) {
          console.log(`📝 题目预览:`)
          response.data.data.preview.forEach((question, index) => {
            console.log(`   ${index + 1}. ${question.title}: ${question.content}`)
          })
        }
      } else {
        console.log(`❌ PDF提取失败: ${response.data.message}`)
      }
      
    } catch (error) {
      console.error(`❌ 处理 ${fileName} 失败:`, error.response?.data?.message || error.message)
    }
    
    console.log('')
  }
}

/**
 * 测试批量PDF处理
 */
async function testBatchPDFProcessing() {
  console.log('📦 测试批量PDF处理功能...')
  
  const testFiles = fs.readdirSync(config.testDataDir).filter(file => file.endsWith('.pdf'))
  
  if (testFiles.length < 2) {
    console.log('⚠️  需要至少2个PDF文件进行批量测试')
    return
  }
  
  try {
    const FormData = require('form-data')
    const form = new FormData()
    
    // 添加多个PDF文件
    testFiles.slice(0, 3).forEach(fileName => {
      const filePath = path.join(config.testDataDir, fileName)
      form.append('pdfFiles', fs.createReadStream(filePath))
    })
    
    form.append('maxQuestions', '15')
    
    console.log(`正在批量处理 ${Math.min(testFiles.length, 3)} 个PDF文件...`)
    
    const response = await axios.post(`${config.baseURL}/batch-pdf`, form, {
      headers: {
        ...form.getHeaders()
      }
    })
    
    if (response.data.success) {
      console.log(`✅ 批量处理成功`)
      console.log(`📊 处理结果:`)
      console.log(`   - 成功处理: ${response.data.data.totalProcessed} 个文件`)
      console.log(`   - 失败文件: ${response.data.data.totalFailed} 个`)
      console.log(`   - 创建题目: ${response.data.data.totalCreated} 道`)
      
      if (response.data.data.results.length > 0) {
        console.log(`📋 详细结果:`)
        response.data.data.results.forEach((result, index) => {
          console.log(`   ${index + 1}. ${path.basename(result.file)}: ${result.created} 道题目`)
        })
      }
      
      if (response.data.data.errors.length > 0) {
        console.log(`❌ 错误信息:`)
        response.data.data.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${path.basename(error.file)}: ${error.error}`)
        })
      }
    } else {
      console.log(`❌ 批量处理失败: ${response.data.message}`)
    }
    
  } catch (error) {
    console.error('❌ 批量处理出错:', error.response?.data?.message || error.message)
  }
  
  console.log('')
}

/**
 * 测试搜索PDF提取的内容
 */
async function testSearchExtractedContent() {
  console.log('🔍 测试搜索PDF提取的内容...')
  
  try {
    const searchParams = new URLSearchParams({
      keyword: 'PDF提取',
      page: 1,
      limit: 5
    })
    
    const response = await axios.get(`${config.baseURL}/search?${searchParams}`)
    
    if (response.data.success) {
      const { questions, pagination } = response.data.data
      console.log(`✅ 找到 ${pagination.total} 条PDF提取的内容`)
      
      if (questions.length > 0) {
        console.log('📋 搜索结果:')
        questions.forEach((question, index) => {
          console.log(`   ${index + 1}. [${question.subject}-${question.grade}年级] ${question.title}`)
          console.log(`      类型: ${question.type}, 难度: ${question.difficulty}`)
          console.log(`      来源: ${question.source}`)
        })
      }
    } else {
      console.log(`❌ 搜索失败: ${response.data.message}`)
    }
    
  } catch (error) {
    console.error('❌ 搜索出错:', error.response?.data?.message || error.message)
  }
  
  console.log('')
}

/**
 * 解析文件名获取学科和年级信息
 * @param {string} fileName 文件名
 */
function parseFileName(fileName) {
  const info = {
    subject: 'math',
    grade: 1
  }
  
  // 解析学科
  if (fileName.includes('数学')) info.subject = 'math'
  else if (fileName.includes('语文')) info.subject = 'chinese'
  else if (fileName.includes('英语')) info.subject = 'english'
  
  // 解析年级
  const gradeMatch = fileName.match(/([一二三四五六]|\d)年级/)
  if (gradeMatch) {
    const gradeMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 }
    const gradeStr = gradeMatch[1]
    info.grade = gradeMap[gradeStr] || parseInt(gradeStr) || 1
  }
  
  return info
}

/**
 * 显示GitHub仓库使用说明
 */
function showGitHubUsageGuide() {
  console.log('📚 GitHub ChinaTextbook 仓库使用指南')
  console.log('=' .repeat(50))
  console.log('')
  console.log('🔗 仓库地址: https://github.com/TapXWorld/ChinaTextbook')
  console.log('')
  console.log('📂 仓库结构:')
  console.log('├── 小学/')
  console.log('│   ├── 义务教育教科书·数学一年级上册.pdf')
  console.log('│   ├── 义务教育教科书·数学一年级下册.pdf')
  console.log('│   ├── 义务教育教科书·语文一年级上册.pdf')
  console.log('│   └── ...')
  console.log('├── 初中/')
  console.log('└── 高中/')
  console.log('')
  console.log('📋 推荐使用方式:')
  console.log('1. 手动下载需要的PDF文件')
  console.log('2. 使用本系统的PDF上传功能')
  console.log('3. 让AI自动提取题目内容')
  console.log('4. 人工审核和完善提取结果')
  console.log('')
}

/**
 * 主测试函数
 */
async function runPDFMaterialsTest() {
  console.log('🎯 PDF教材处理功能测试')
  console.log('=' .repeat(50))
  console.log('')
  
  try {
    // 显示使用指南
    showGitHubUsageGuide()
    
    // 初始化测试环境
    await initializeTest()
    
    console.log('🎉 PDF教材处理功能准备完成！')
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runPDFMaterialsTest()
}

module.exports = {
  runPDFMaterialsTest,
  testGitHubDownload,
  testPDFExtraction,
  testBatchPDFProcessing,
  testSearchExtractedContent,
  config
} 