/**
 * 调试直接回复功能
 */

// 复制相关函数来本地调试
function intelligentAnswerExtraction(studentInput) {
  if (!studentInput || typeof studentInput !== 'string') {
    return {
      hasNumber: false,
      extractedNumbers: [],
      primaryAnswer: null,
      confidenceLevel: 'none',
      intentType: 'unknown'
    }
  }
  
  const input = studentInput.trim()
  
  // 1. 提取所有数字（包括小数、分数）
  const numberPatterns = [
    /(\d+\.?\d*)/g,  // 小数
    /(\d+\/\d+)/g,   // 分数
    /([一二三四五六七八九十]+)/g  // 中文数字
  ]
  
  let allNumbers = []
  numberPatterns.forEach(pattern => {
    const matches = input.match(pattern)
    if (matches) {
      allNumbers.push(...matches)
    }
  })
  
  // 2. 识别答案表达意图
  const intentPatterns = {
    answer_confirmation: [
      /(?:老师|teacher).*?(\d+\.?\d*).*?(?:对不对|对吗|是吗|正确吗)/i,
      /(?:我觉得|我认为|我想).*?(?:是|答案是).*?(\d+\.?\d*)/i,
      /(?:答案|结果).*?(?:是|应该是|可能是).*?(\d+\.?\d*)/i,
      /(?:会不会|是不是|应该是).*?(\d+\.?\d*)/i,
      /(\d+\.?\d*).*?(?:对不对|对吗|是吗|正确吗)/i,
      /(\d+\.?\d*).*?(?:吧|呢|啊|吗)/i
    ],
    direct_answer: [
      /^(\d+\.?\d*)$/,  // 纯数字
      /(?:等于|=).*?(\d+\.?\d*)/i,
      /(\d+\.?\d*)(?:$|[。！!])/  // 数字结尾
    ],
    calculation_attempt: [
      /(\d+\.?\d*).*?(?:\+|\-|\*|×|÷|\/)/,
      /(?:\+|\-|\*|×|÷|\/).*?(\d+\.?\d*)/
    ]
  }
  
  let primaryAnswer = null
  let intentType = 'unclear'
  let confidenceLevel = 'low'
  
  // 3. 按优先级识别意图和答案
  for (const [intent, patterns] of Object.entries(intentPatterns)) {
    for (const pattern of patterns) {
      const match = input.match(pattern)
      if (match) {
        const numberMatch = match[1] || match[0]
        if (numberMatch && /\d/.test(numberMatch)) {
          primaryAnswer = convertToNumber(numberMatch)
          intentType = intent
          
          // 设置置信度
          if (intent === 'answer_confirmation') {
            confidenceLevel = 'high'  // "老师12对不对"这种表达置信度最高
          } else if (intent === 'direct_answer') {
            confidenceLevel = 'medium'
          } else {
            confidenceLevel = 'low'
          }
          
          break
        }
      }
    }
    if (primaryAnswer !== null) break
  }
  
  // 4. 如果没有明确意图，但有数字，使用第一个数字
  if (primaryAnswer === null && allNumbers.length > 0) {
    primaryAnswer = convertToNumber(allNumbers[0])
    intentType = 'number_mentioned'
    confidenceLevel = 'low'
  }
  
  return {
    hasNumber: primaryAnswer !== null,
    extractedNumbers: allNumbers.map(convertToNumber).filter(n => n !== null),
    primaryAnswer,
    confidenceLevel,
    intentType,
    originalInput: input
  }
}

function convertToNumber(str) {
  if (!str) return null
  
  // 处理中文数字
  const chineseNumbers = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
  }
  
  if (chineseNumbers[str]) {
    return chineseNumbers[str]
  }
  
  // 处理分数
  if (str.includes('/')) {
    const parts = str.split('/')
    if (parts.length === 2) {
      const numerator = parseFloat(parts[0])
      const denominator = parseFloat(parts[1])
      if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
        return numerator / denominator
      }
    }
  }
  
  // 处理普通数字和小数
  const num = parseFloat(str)
  return isNaN(num) ? null : num
}

function calculateMathAnswer(question) {
  if (!question || typeof question !== 'string') {
    return null
  }
  
  // 清理题目
  const cleanQuestion = question.trim().replace(/[=＝\s]+$/, '')
  
  // 简单的数学表达式计算
  const mathPatterns = [
    // 加法: a + b
    {
      pattern: /(\d+(?:\.\d+)?)\s*[+＋]\s*(\d+(?:\.\d+)?)/,
      operation: (a, b) => a + b
    },
    // 减法: a - b  
    {
      pattern: /(\d+(?:\.\d+)?)\s*[-－]\s*(\d+(?:\.\d+)?)/,
      operation: (a, b) => a - b
    },
    // 乘法: a × b 或 a * b
    {
      pattern: /(\d+(?:\.\d+)?)\s*[×*]\s*(\d+(?:\.\d+)?)/,
      operation: (a, b) => a * b
    },
    // 除法: a ÷ b 或 a / b
    {
      pattern: /(\d+(?:\.\d+)?)\s*[÷/]\s*(\d+(?:\.\d+)?)/,
      operation: (a, b) => b !== 0 ? a / b : null
    }
  ]
  
  for (const { pattern, operation } of mathPatterns) {
    const match = cleanQuestion.match(pattern)
    if (match) {
      const a = parseFloat(match[1])
      const b = parseFloat(match[2])
      if (!isNaN(a) && !isNaN(b)) {
        const result = operation(a, b)
        return result !== null ? Math.round(result * 100) / 100 : null
      }
    }
  }
  
  return null
}

// 测试用例
const testCases = [
  '老师15对不对',
  '老师12对不对', 
  '我觉得答案是15',
  '我觉得答案是20'
]

console.log('=== 🔧 调试直接回复功能 ===\n')

console.log('1️⃣ 测试题目: "7+8 ="')
const question = '7+8 ='
const correctAnswer = calculateMathAnswer(question)
console.log(`   计算结果: ${correctAnswer}`)

console.log('\n2️⃣ 测试意图识别:')
testCases.forEach(input => {
  const detection = intelligentAnswerExtraction(input)
  console.log(`   输入: "${input}"`)
  console.log(`   结果: 意图=${detection.intentType}, 答案=${detection.primaryAnswer}, 置信度=${detection.confidenceLevel}`)
  
  // 模拟直接回复逻辑
  if (detection.intentType === 'answer_confirmation' && detection.primaryAnswer !== null) {
    if (correctAnswer !== null) {
      const isAnswerCorrect = Math.abs(detection.primaryAnswer - correctAnswer) < 0.01
      const directResponse = isAnswerCorrect 
        ? `对的！答案就是${correctAnswer}，你算对了，很棒！`
        : `这个答案不对哦，正确答案是${correctAnswer}，再想想看吧！`
      
      console.log(`   🎯 应该生成的直接回复: "${directResponse}"`)
    } else {
      console.log(`   ❌ 无法计算正确答案`)
    }
  } else {
    console.log(`   ⚠️ 不符合答案确认模式`)
  }
  console.log('   ---')
})

console.log('\n=== 📊 调试结论 ===')
console.log('检查以上输出，看看哪一步出了问题：')
console.log('1. calculateMathAnswer 是否返回正确结果？')
console.log('2. intelligentAnswerExtraction 是否正确识别意图？')
console.log('3. 直接回复逻辑是否应该生成？') 