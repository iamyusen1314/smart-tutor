/**
 * AI聊天答疑路由
 * 专门用于小程序实时AI答疑功能
 * 使用千问plus/turbo模型确保快速响应
 */
const express = require('express')
const axios = require('axios') // ✅ 修复：添加axios导入
const router = express.Router()
const { createValidationMiddleware } = require('../utils/dataValidator')

// 🔧 新增：导入学习记录数据库模型
const LearningRecord = require('../models/LearningRecord')

// 模型配置 - 优化响应速度
const CHAT_MODELS = {
  // 快速问答 - qwen-turbo (保持高速响应)
  QUICK: {
    model: 'qwen-turbo',
    maxTokens: 500,
    temperature: 0.5,
    expectedResponseTime: '0.5-1秒',
    scenarios: ['简单问候', '基础计算', '是非判断', '鼓励话语', '快速提示']
  },
  
  // ✅ 标准对话 - 升级到qwen-plus (核心AI辅导功能)
  STANDARD: {
    model: 'qwen-plus',
    maxTokens: 1000,
    temperature: 0.7,
    expectedResponseTime: '2-5秒',
    scenarios: ['解题引导', '思路提示', '概念解释', '学习建议', '多轮对话', '个性化辅导']
  },
  
  // ✅ 深度分析 - 升级到qwen-plus (复杂推理优化)
  DEEP: {
    model: 'qwen-plus',
    maxTokens: 1800,
    temperature: 0.6,
    expectedResponseTime: '5-8秒',
    scenarios: ['复杂证明', '多步推理', '深度分析', '学习报告生成']
  }
}

// ==================== 多学科支持配置 ====================

/**
 * 学科配置信息
 */
const SUBJECTS_CONFIG = {
  math: {
    name: '数学',
    icon: '🔢',
    description: '数学计算、逻辑思维、应用题',
    grades: [1, 2, 3, 4, 5, 6],
    skillTypes: ['计算', '逻辑', '应用', '几何', '统计'],
    commonErrors: ['计算错误', '概念不清', '应用题理解困难', '单位换算错误']
  },
  chinese: {
    name: '语文',
    icon: '📖',
    description: '拼音、汉字、阅读理解、写作表达',
    grades: [1, 2, 3, 4, 5, 6],
    skillTypes: ['拼音', '汉字', '词汇', '阅读', '写作', '古诗'],
    commonErrors: ['拼音错误', '错别字', '理解偏差', '表达不清', '标点错误']
  },
  english: {
    name: '英语',
    icon: '🔤',
    description: '字母、单词、语法、口语表达',
    grades: [1, 2, 3, 4, 5, 6],
    skillTypes: ['字母', '单词', '语法', '听力', '口语', '阅读'],
    commonErrors: ['发音错误', '单词拼写错误', '语法混乱', '时态错误', '理解困难']
  },
  science: {
    name: '科学',
    icon: '🔬',
    description: '自然科学、实验观察、科学思维',
    grades: [3, 4, 5, 6],
    skillTypes: ['观察', '实验', '分类', '推理', '记录'],
    commonErrors: ['观察不细致', '结论草率', '概念混淆', '实验步骤错误']
  }
}

/**
 * 获取学科配置
 */
function getSubjectConfig(subject) {
  return SUBJECTS_CONFIG[subject] || SUBJECTS_CONFIG.math
}

/**
 * 🎯 多学科AI系统提示词模板
 */
const SUBJECT_SYSTEM_PROMPTS = {
  math: `你是一位专业的小学数学AI家教老师，擅长用启发式方法教学。

🎯 核心原则：
- 绝对不直接给出答案，要引导学生自己思考
- 使用生活实例帮助理解数学概念
- 鼓励学生用画图、数数等方法解题
- 语言要简单易懂，多用emoji增加趣味性

📚 教学策略：
1. 理解阶段：帮助学生理解题目在问什么
2. 分析阶段：引导学生找出已知条件和未知条件
3. 思路阶段：提示解题方法，但不直接说出步骤
4. 验算阶段：鼓励学生检查自己的答案

💡 回复要求：
- 每次回复控制在30-50字
- 多使用🍎🐶🚗等生活化emoji
- 用"想想看"、"试试看"等启发性语言
- 如果学生答对了，要热情表扬并总结方法`,

  chinese: `你是一位亲切的小学语文AI老师，善于培养学生的语言文字能力。

🎯 核心原则：
- 注重培养学生的语感和文字理解能力
- 通过故事、儿歌等方式让学习更有趣
- 耐心纠正发音、书写、理解等问题
- 鼓励学生多表达，建立语言自信

📚 教学策略：
1. 拼音：通过口型演示和比喻帮助记忆
2. 汉字：讲解字的来历和结构，加深印象
3. 阅读：引导学生理解文章内容和情感
4. 表达：鼓励学生用自己的话说出想法

💡 回复要求：
- 语言温和亲切，多用"小朋友"等称呼
- 使用📚📝✏️🌟等学习相关emoji
- 适当使用比喻和故事来解释
- 表扬时要具体说出好在哪里`,

  english: `你是一位友善的小学英语AI老师，专注于培养学生的英语兴趣。

🎯 核心原则：
- 创造轻松愉快的英语学习氛围
- 通过游戏、歌曲等方式学习英语
- 鼓励学生大胆开口说英语
- 及时纠正发音和语法，但要保护学生自信心

📚 教学策略：
1. 字母：通过字母歌和形象记忆
2. 单词：结合图片和动作来记忆
3. 句子：从简单日常用语开始
4. 语法：用简单规律和例子说明

💡 回复要求：
- 中英文结合，适当使用简单英语
- 使用🌈🎵🎮🏆等活泼emoji
- 鼓励学生"Good job!"、"Try again!"
- 可以教一些简单的英文表扬语`,

  science: `你是一位充满好奇心的小学科学AI老师，善于激发学生的探索欲望。

🎯 核心原则：
- 培养学生的观察能力和科学思维
- 通过实验和现象来解释科学原理
- 鼓励学生提出问题和假设
- 用简单语言解释复杂的科学概念

📚 教学策略：
1. 观察：引导学生仔细观察现象
2. 提问：鼓励学生思考"为什么"
3. 实验：设计简单安全的小实验
4. 总结：帮助学生归纳科学规律

💡 回复要求：
- 语言充满好奇心和探索精神
- 使用🔬🌱⚡🌍等科学emoji
- 多用"你发现了什么？"、"猜猜看"
- 表扬学生的观察和思考能力`
}

/**
 * 🎙️ 语音聊天专用提示词模板（不含emoji）
 */
const VOICE_CHAT_PROMPTS = {
  math: `你是一位专业的小学数学AI家教老师，擅长用启发式方法教学。

核心原则：
- 绝对不直接给出答案，要引导学生自己思考
- 使用生活实例帮助理解数学概念
- 鼓励学生用画图、数数等方法解题
- 语言要简单易懂，适合语音播放

教学策略：
1. 理解阶段：帮助学生理解题目在问什么
2. 分析阶段：引导学生找出已知条件和未知条件
3. 思路阶段：提示解题方法，但不直接说出步骤
4. 验算阶段：鼓励学生检查自己的答案

语音回复要求：
- 每次回复控制在30-50字
- 不使用任何emoji或特殊符号
- 用"想想看"、"试试看"等启发性语言
- 如果学生答对了，要热情表扬并总结方法
- 语言自然流畅，适合听觉理解`,

  chinese: `你是一位亲切的小学语文AI老师，善于培养学生的语言文字能力。

核心原则：
- 注重培养学生的语感和文字理解能力
- 通过故事、儿歌等方式让学习更有趣
- 耐心纠正发音、书写、理解等问题
- 鼓励学生多表达，建立语言自信

教学策略：
1. 拼音：通过口型演示和比喻帮助记忆
2. 汉字：讲解字的来历和结构，加深印象
3. 阅读：引导学生理解文章内容和情感
4. 表达：鼓励学生用自己的话说出想法

语音回复要求：
- 语言温和亲切，多用"小朋友"等称呼
- 不使用emoji，用温暖的语言表达
- 适当使用比喻和故事来解释
- 表扬时要具体说出好在哪里
- 语音要亲切自然，易于理解`,

  english: `你是一位友善的小学英语AI老师，专注于培养学生的英语兴趣。

核心原则：
- 创造轻松愉快的英语学习氛围
- 通过游戏、歌曲等方式学习英语
- 鼓励学生大胆开口说英语
- 及时纠正发音和语法，但要保护学生自信心

教学策略：
1. 字母：通过字母歌和形象记忆
2. 单词：结合图片和动作来记忆
3. 句子：从简单日常用语开始
4. 语法：用简单规律和例子说明

语音回复要求：
- 中英文结合，适当使用简单英语
- 不使用emoji，用语言表达鼓励
- 鼓励学生"Good job!"、"Try again!"
- 可以教一些简单的英文表扬语
- 语音要活泼友好，激发学习兴趣`,

  science: `你是一位充满好奇心的小学科学AI老师，善于激发学生的探索欲望。

核心原则：
- 培养学生的观察能力和科学思维
- 通过实验和现象来解释科学原理
- 鼓励学生提出问题和假设
- 用简单语言解释复杂的科学概念

教学策略：
1. 观察：引导学生仔细观察现象
2. 提问：鼓励学生思考"为什么"
3. 实验：设计简单安全的小实验
4. 总结：帮助学生归纳科学规律

语音回复要求：
- 语言充满好奇心和探索精神
- 不使用emoji，用生动的语言描述
- 多用"你发现了什么？"、"猜猜看"
- 表扬学生的观察和思考能力
- 语音要充满热情，激发探索欲望`
}

/**
 * 智能选择AI模型
 */
function selectChatModel(question, studentInput, chatHistory = []) {
  const inputLength = (studentInput || '').length
  const questionComplexity = analyzeQuestionComplexity(question)
  const contextLength = chatHistory.length
  
  // 简单问题或短输入 → 快速模型
  if (inputLength < 15 || isSimpleQuery(studentInput)) {
    return CHAT_MODELS.QUICK
  }
  
  // 复杂数学证明或长篇推理 → 深度模型
  if (questionComplexity === 'high' && contextLength > 5) {
    return CHAT_MODELS.DEEP
  }
  
  // 大部分情况 → 标准模型
  return CHAT_MODELS.STANDARD
}

/**
 * 分析问题复杂度
 */
function analyzeQuestionComplexity(question) {
  if (!question) return 'low'
  
  const complexKeywords = ['证明', '推导', '分析', '解释为什么', '如何理解']
  const mediumKeywords = ['计算', '解方程', '画图', '列式']
  const simpleKeywords = ['是', '对吗', '等于', '多少']
  
  if (complexKeywords.some(kw => question.includes(kw))) return 'high'
  if (mediumKeywords.some(kw => question.includes(kw))) return 'medium'
  return 'low'
}

/**
 * 判断是否为简单查询
 */
function isSimpleQuery(input) {
  if (!input) return true
  
  const simplePatterns = [
    /^(是|不是|对|错|好|不好)/,
    /^(谢谢|感谢|知道了|明白了)/,
    /^(你好|老师好|再见)/,
    /^\d+$/,  // 纯数字
    /^[+-=×÷\d\s]+$/  // 简单运算
  ]
  
  return simplePatterns.some(pattern => pattern.test(input.trim()))
}

/**
 * 真正调用千问大模型API - 不使用任何模拟数据
 */
async function callChatModel(prompt, modelConfig) {
  const startTime = Date.now()
  
  // API配置
  const API_CONFIG = {
    apiKey: process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || 'sk-a791758fe21c4a719b2c632d5345996f',
    baseUrl: process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    timeout: getTimeoutByModel(modelConfig.model)
  }
  
  if (!API_CONFIG.apiKey) {
    console.error('❌ AI API密钥未配置')
    throw new Error('AI API密钥未配置，无法提供真实AI服务')
  }

  try {
    console.log(`🤖 调用${modelConfig.model}模型进行AI辅导...`)
    
    const response = await axios.post(
      `${API_CONFIG.baseUrl}/chat/completions`,
      {
        model: modelConfig.model,
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(modelConfig.subject || 'math', modelConfig.isVoiceChat || false)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: modelConfig.temperature || 0.7,
        max_tokens: modelConfig.maxTokens || 800,
        top_p: 0.9
      },
      {
        headers: {
          'Authorization': `Bearer ${API_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: API_CONFIG.timeout
      }
    )

    if (!response.data.choices || response.data.choices.length === 0) {
      throw new Error('AI服务返回数据格式错误')
    }

    const responseTime = Date.now() - startTime
    const content = response.data.choices[0].message.content.trim()
    
    console.log(`✅ ${modelConfig.model} 响应成功: ${responseTime}ms`)
    
    return {
      model: modelConfig.model,
      responseTime,
      content: content
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error(`❌ ${modelConfig.model} 调用失败 (${responseTime}ms):`, error.message)
    
    // 🚨 直接抛出错误，不返回模拟数据，确保只使用真实AI响应
    throw new Error(`AI模型 ${modelConfig.model} 调用失败: ${error.message}`)
  }
}

/**
 * 🎯 构建多学科AI家教系统提示词 - 支持语音/文字模式
 */
function buildSystemPrompt(subject = 'math', isVoiceChat = false) {
  const subjectConfig = getSubjectConfig(subject)
  
  // 根据交互类型选择不同的提示词模板
  let subjectPrompt
  if (isVoiceChat) {
    // 语音聊天：不使用emoji，专注于清晰的语音表达
    subjectPrompt = VOICE_CHAT_PROMPTS[subject] || VOICE_CHAT_PROMPTS.math
  } else {
    // 文字聊天：使用emoji，增强视觉效果
    subjectPrompt = SUBJECT_SYSTEM_PROMPTS[subject] || SUBJECT_SYSTEM_PROMPTS.math
  }
  
  // 添加通用的AI家教原则
  let commonPrinciples
  if (isVoiceChat) {
    // 语音模式：不使用emoji
    commonPrinciples = `

绝对禁止：
- 直接说出完整答案
- 批评或否定学生的想法
- 使用过于复杂的术语
- 提供超出年龄理解能力的解释
- 使用任何emoji表情符号（语音播放需要）

学科信息：
- 当前学科：${subjectConfig.name}
- 学科描述：${subjectConfig.description}
- 常见技能：${subjectConfig.skillTypes.join('、')}

语音聊天特别要求：
- 回复必须简洁清晰，适合语音播放
- 不使用任何emoji或特殊符号
- 语言要自然流畅，适合听觉理解

记住：你的目标是启发学生思考，而不是替学生思考！`
  } else {
    // 文字模式：可以使用emoji
    commonPrinciples = `

🚫 绝对禁止：
- 直接说出完整答案
- 批评或否定学生的想法
- 使用过于复杂的术语
- 提供超出年龄理解能力的解释

📋 学科信息：
- 当前学科：${subjectConfig.name} ${subjectConfig.icon}
- 学科描述：${subjectConfig.description}
- 常见技能：${subjectConfig.skillTypes.join('、')}

记住：你的目标是启发学生思考，而不是替学生思考！`
  }

  return subjectPrompt + commonPrinciples
}

/**
 * 根据模型获取超时时间
 */
function getTimeoutByModel(model) {
  const timeouts = {
    'qwen-turbo': 15000,   // 15秒 - 保持快速响应
    'qwen-plus': 30000,    // 30秒 - ✅ 升级后增加超时时间
    'qwen-max': 40000      // 40秒 - 预留配置
  }
  return timeouts[model] || 30000  // ✅ 默认超时调整为30秒
}

/**
 * AI答疑接口 - 小程序专用
 * POST /api/ai-chat/tutoring
 */
router.post('/tutoring', createValidationMiddleware('ai-chat'), async (req, res) => {
  try {
    const { 
      question,      // 当前题目
      studentInput,  // 学生输入
      chatHistory,   // 聊天历史
      subject,       // 学科
      grade,         // 年级
      currentStep,   // 当前学习步骤
      currentMode,   // 🔧 新增：当前交互模式 (answer/chat/instant_voice)
      userId,        // 学生用户ID
      planId         // 学习计划ID
    } = req.body
    
    console.log('💬 AI答疑请求:', {
      question: question?.substring(0, 50) + '...',
      studentInput: studentInput?.substring(0, 30) + '...',
      subject,
      grade,
      currentStep,
      currentMode, // 🔧 新增：显示交互模式
      userId,
      planId
    })
    
    // 🎙️ 检测是否为语音聊天
    const isVoiceChat = currentStep === 'voice_chat' || currentStep === 'ai_tutoring'
    console.log(`🎙️ 交互类型: ${isVoiceChat ? '语音聊天' : '文字聊天'}`)
    
    // 🔧 智能答案提取和意图识别（放在最前面）- 支持多学科
    const answerDetection = intelligentAnswerExtraction(studentInput, subject)
    console.log('🔍 智能答案检测:', {
      studentInput,
      hasAnswer: answerDetection.hasAnswer,
      extractedAnswers: answerDetection.extractedAnswers,
      answerConfidenceLevel: answerDetection.confidenceLevel,
      intentType: answerDetection.intentType,
      answerType: answerDetection.answerType,
      question,
      subject,
      grade
    })
    
    // 🚨 特殊处理：当学生给出明确答案时，进行直接回复（在AI调用之前）
    let directResponse = null
    if (answerDetection.hasAnswer && answerDetection.primaryAnswer !== null && 
        answerDetection.confidenceLevel !== 'none' && 
        ['answer_confirmation', 'direct_answer'].includes(answerDetection.intentType)) {
      
      console.log(`🎯 学生${answerDetection.answerType}答案检测：学生回答 "${answerDetection.primaryAnswer}"`)
      
      if (subject === 'math' && answerDetection.answerType === 'number') {
        // 数学题使用精确计算
        const correctAnswer = calculateMathAnswer(question)
        console.log(`📊 正确答案: ${correctAnswer}，学生答案: ${answerDetection.primaryAnswer}`)
        
        if (correctAnswer !== null) {
          const isAnswerCorrect = Math.abs(answerDetection.primaryAnswer - correctAnswer) < 0.01
          
          if (isAnswerCorrect) {
            // 🎉 答对了：给予肯定和表扬
            directResponse = isVoiceChat 
              ? `太棒了！${answerDetection.primaryAnswer}是正确答案，你真聪明！`
              : `太棒了！${answerDetection.primaryAnswer}是正确答案，你真聪明！🎉`
          } else {
            // ❌ 答错了：给出引导，绝不说出正确答案
            directResponse = isVoiceChat
              ? `这个答案不对哦，再仔细想想，你可以用数手指的方法试试看！`
              : `这个答案不对哦，再仔细想想，你可以用数手指的方法试试看！💭`
          }
          
          console.log(`✅ 直接回复生成完成: "${directResponse}"`)
        }
      } else {
        // 非数学科目暂时不进行直接回复，由AI处理
        console.log(`📝 ${subject}科目检测到答案，将由AI进行智能处理`)
      }
    }
    
    // 智能选择模型
    const modelConfig = selectChatModel(question, studentInput, chatHistory)
    console.log(`🤖 选择模型: ${modelConfig.model} (${modelConfig.expectedResponseTime})`)
    
    // 🚨 根据是否有直接回复决定是否调用AI
    let aiResponse
    if (directResponse) {
      // 使用直接生成的回复，避免AI的"不直接给答案"限制
      console.log('🎯 使用直接回复，跳过AI模型调用')
      aiResponse = {
        content: directResponse,
        model: 'direct-response',
        responseTime: 0,
        finishReason: 'answer_confirmation'
      }
    } else {
      // 构建提示词 - 包含意图识别信息
      const prompt = buildTutoringPrompt(question, studentInput, chatHistory, subject, grade, isVoiceChat, answerDetection)
      
      // 调用AI模型 - 传递语音聊天标识
      modelConfig.subject = subject
      modelConfig.isVoiceChat = isVoiceChat
      aiResponse = await callChatModel(prompt, modelConfig)
    }
    
    // ✅ 修复：只在answer模式下进行答案验证
    let answerVerification = null
    const nextStep = analyzeNextStep(currentStep, studentInput, aiResponse.content)
    
    // 🎯 核心修复：根据交互模式决定是否验证答案
    console.log(`🎯 交互模式分析: currentMode="${currentMode}"`)
    const isAnswerMode = currentMode === 'answer'
    const isChatMode = currentMode === 'chat' 
    const isVoiceMode = currentMode === 'instant_voice'
    
    if (isAnswerMode && answerDetection.hasAnswer) {
      // ✅ 只有answer模式且有答案时才验证
      console.log('🔧 answer模式：开始调用答案验证函数...')
      answerVerification = await verifyStudentAnswer(question, studentInput, subject, grade, answerDetection)
      console.log('✅ 答案验证完成:', answerVerification)
    } else if (isAnswerMode && !answerDetection.hasAnswer) {
      // ✅ answer模式但没有有效答案
      console.log('⚠️ answer模式：学生输入不包含有效答案，标记为错误')
      answerVerification = { 
        isCorrect: false,
        reason: subject === 'math' ? 'no_numerical_answer' : 'no_clear_answer',
        studentAnswer: studentInput,
        explanation: '学生未提供有效答案'
      }
    } else {
      // ✅ chat/instant_voice模式：不进行答案验证
      console.log(`💬 ${currentMode}模式：不进行答案验证，仅记录交互`)
      answerVerification = null
    }
    
    // 判断是否完成 - 基于真实答案验证
    const isComplete = nextStep === 'correct' || (answerVerification && answerVerification.isCorrect === true)
    
    // 🔧 核心修复：根据交互模式决定记录类型
    console.log(`🎯 继续使用之前定义的交互模式变量`)
    
    // ✅ 使用之前定义的变量：isAnswerMode, isChatMode, isVoiceMode
    const isInteractionMode = isChatMode || isVoiceMode
    
    console.log(`📊 是否计入统计: ${isAnswerMode} (${isAnswerMode ? '独立答题模式' : '交互记录模式'})`)
    
    let learningRecord = null
    let existingRecord = null
    
    if (isAnswerMode) {
      // 🎯 独立答题模式：检查是否已存在该问题的学习记录
      try {
        // 🔧 修复：使用优化的学习记录查询方法
        const mongoose = require('mongoose')
        if (mongoose.connection.readyState !== 1) {
          console.warn('⚠️ 数据库未连接，跳过学习记录检查，使用内存模式')
          existingRecord = null
        } else {
          // 🔧 使用新的优化查询方法，大幅减少超时概率
          existingRecord = await LearningRecord.findExistingRecord(
            userId || 'anonymous',
            planId || 'default',
            question,
            30 // 30分钟时间窗口
          )
        }
        
        console.log(`📋 现有记录检查: ${existingRecord ? '存在' : '不存在'}`)
      } catch (dbError) {
        console.error('❌ 数据库查询失败:', dbError.message)
        // 🚨 修复：移除优雅降级，确保数据库问题被明确报告
        throw new Error(`数据库查询失败，请检查数据库连接: ${dbError.message}`)
      }
    } else if (isInteractionMode) {
      // ✅ 新增：AI交互模式也需要检查现有记录以追加交互历史
      try {
        const mongoose = require('mongoose')
        if (mongoose.connection.readyState !== 1) {
          console.warn('⚠️ 数据库未连接，跳过交互记录检查')
          existingRecord = null
        } else {
          existingRecord = await LearningRecord.findExistingRecord(
            userId || 'anonymous',
            planId || 'default', 
            question,
            60 // 交互模式使用更长的时间窗口
          )
        }
        
        console.log(`📋 ${currentMode}模式交互记录检查: ${existingRecord ? '找到现有记录' : '无现有记录'}`)
      } catch (dbError) {
        console.error('❌ 交互记录查询失败:', dbError.message)
        // 🚨 修复：移除优雅降级，确保数据库问题被明确报告
        throw new Error(`交互记录查询失败，请检查数据库连接: ${dbError.message}`)
      }
    }
    
    // ✅ 修正后交互类型判断
    const isFirstAnswerSubmission = isAnswerMode && !existingRecord && answerVerification !== null
    const isFollowUpAnswerConversation = isAnswerMode && existingRecord !== null
    const isNewInteractionRecord = isInteractionMode && !existingRecord  
    const isFollowUpInteraction = isInteractionMode && existingRecord !== null
    
    if (isFirstAnswerSubmission) {
      // 🎯 首次答题提交：创建新的学习记录（计入统计）
      const statusDisplay = answerVerification && answerVerification.isCorrect === true ? '✅正确' : '❌错误'
      console.log(`📝 首次答题提交：${question} -> ${studentInput} (${statusDisplay})`)
      
      learningRecord = {
        userId: userId || 'anonymous',
        planId: planId || 'default',
        question,
        studentInput, // 原始学生输入
        firstAnswer: studentInput, // 记录首次答案
        finalAnswer: studentInput, // 最终判定答案
        aiResponse: aiResponse.content,
        subject: subject || 'math',
        grade: grade || 1,
        // ✅ 添加关键字段
        currentMode: currentMode,
        countedInStatistics: true, // answer模式计入统计
        currentStep,
        nextStep,
        isComplete,
        // 🔧 答案验证信息（只在首次答题时设置，后续不变）
        answerVerification: answerVerification || { isCorrect: false, reason: 'no_answer_provided' },
        isCorrect: answerVerification ? answerVerification.isCorrect : false, // 最终判定结果
        studentAnswer: answerVerification ? answerVerification.studentAnswer : studentInput,
        correctAnswer: answerVerification ? answerVerification.correctAnswer : null,
        model: aiResponse.model,
        responseTime: aiResponse.responseTime,
        timestamp: new Date().toISOString(),
        sessionId: req.sessionID || generateSessionId(),
        // 🔧 新增：对话历史跟踪
        conversationHistory: [{
          type: answerVerification.isCorrect === true ? 'correct_answer' : 'incorrect_answer',
          input: studentInput,
          response: aiResponse.content,
          timestamp: new Date().toISOString()
        }],
        answerSubmitted: true // 🔧 修改：所有首次提交都算作已提交答案
      }
      
      await saveLearningRecord(learningRecord)
      
    } else if (isFollowUpAnswerConversation) {
      // 🎯 答题后续对话：更新现有记录，不改变答案验证结果
      const statusDisplay = existingRecord.isCorrect === true ? '✅正确' : 
                           existingRecord.isCorrect === false ? '❌错误' : 
                           '⚪未作答'
      console.log(`💬 答题后续对话：${question} -> "${studentInput}" (答题结果已固定: ${statusDisplay})`)
      
      // 更新对话历史，但不改变答案验证结果
      if (!existingRecord.conversationHistory) {
        existingRecord.conversationHistory = []
      }
      
      existingRecord.conversationHistory.push({
        type: 'follow_up_conversation',
        input: studentInput,
        response: aiResponse.content,
        timestamp: new Date().toISOString()
      })
      
      // 更新最新的AI回复和交互时间
      existingRecord.lastAiResponse = aiResponse.content
      existingRecord.lastInteractionTime = new Date().toISOString()
      existingRecord.conversationCount = (existingRecord.conversationCount || 1) + 1
      
      // 重要：不创建新记录，不改变isCorrect值
      learningRecord = existingRecord
      
    } else if (isNewInteractionRecord) {
      // ✅ 新增：AI交互首次记录（不计入对错统计，但记录交互行为）
      console.log(`💬 ${currentMode}模式新交互：${question} -> "${studentInput}" (记录交互行为，不计入统计)`)
      
      learningRecord = {
        userId: userId || 'anonymous',
        planId: planId || 'default',
        question,
        studentInput, // 原始学生输入
        firstAnswer: null, // 交互模式不记录答案
        finalAnswer: null, // 交互模式不记录答案
        aiResponse: aiResponse.content,
        subject: subject || 'math',
        grade: grade || 1,
        currentMode: currentMode,
        countedInStatistics: false, // 交互模式不计入统计
        currentStep,
        nextStep,
        isComplete: false, // 交互模式不产生完成状态
        // ✅ 交互模式不记录答案验证信息
        answerVerification: null,
        isCorrect: null, // 交互模式不判断对错
        studentAnswer: null,
        correctAnswer: null,
        model: aiResponse.model,
        responseTime: aiResponse.responseTime,
        timestamp: new Date().toISOString(),
        sessionId: req.sessionID || generateSessionId(),
        // ✅ 记录交互历史用于学习建议分析
        conversationHistory: [{
          type: 'ai_interaction',
          input: studentInput,
          response: aiResponse.content,
          timestamp: new Date().toISOString(),
          interactionMode: currentMode
        }],
        answerSubmitted: false, // 交互模式不提交答案
        interactionCount: 1 // 交互次数统计
      }
      
      await saveLearningRecord(learningRecord)
      
    } else if (isFollowUpInteraction) {
      // ✅ 新增：AI交互后续记录（追加到现有交互记录）
      console.log(`💬 ${currentMode}模式后续交互：${question} -> "${studentInput}" (更新交互历史)`)
      
      // 更新现有记录的交互历史
      if (!existingRecord.conversationHistory) {
        existingRecord.conversationHistory = []
      }
      
      existingRecord.conversationHistory.push({
        type: 'ai_interaction',
        input: studentInput,
        response: aiResponse.content,
        timestamp: new Date().toISOString(),
        interactionMode: currentMode
      })
      
      // 更新交互统计
      existingRecord.lastAiResponse = aiResponse.content
      existingRecord.lastInteractionTime = new Date().toISOString()
      existingRecord.interactionCount = (existingRecord.interactionCount || 1) + 1
      
      // 保存更新的记录
      await saveLearningRecord(existingRecord)
      learningRecord = existingRecord
    } else {
      // 🔧 兜底处理：确保chat/instant_voice模式的交互记录不会被遗漏
      if (isChatMode || isVoiceMode) {
        console.warn(`⚠️ ${currentMode}模式兜底处理：前面条件都不满足，强制创建交互记录`)
        console.warn(`⚠️ 调试信息: isAnswerMode=${isAnswerMode}, isInteractionMode=${isInteractionMode}, existingRecord=${!!existingRecord}`)
        
        // 强制创建交互记录，确保PRD要求的交互行为记录不会丢失
        learningRecord = {
          userId: userId || 'anonymous',
          planId: planId || 'default',
          question,
          studentInput, // 原始学生输入
          firstAnswer: null, // 交互模式不记录答案
          finalAnswer: null, // 交互模式不记录答案
          aiResponse: aiResponse.content,
          subject: subject || 'math',
          grade: grade || 1,
          currentMode: currentMode,
          countedInStatistics: false, // 交互模式不计入统计
          currentStep,
          nextStep,
          isComplete: false, // 交互模式不产生完成状态
          // ✅ 交互模式不记录答案验证信息
          answerVerification: null,
          isCorrect: null, // 交互模式不判断对错
          studentAnswer: null,
          correctAnswer: null,
          model: aiResponse.model,
          responseTime: aiResponse.responseTime,
          timestamp: new Date().toISOString(),
          sessionId: req.sessionID || generateSessionId(),
          // ✅ 记录交互历史用于学习建议分析
          conversationHistory: [{
            type: 'ai_interaction_fallback',
            input: studentInput,
            response: aiResponse.content,
            timestamp: new Date().toISOString(),
            interactionMode: currentMode,
            note: '兜底逻辑创建的交互记录' // 标记这是兜底创建的
          }],
          answerSubmitted: false, // 交互模式不提交答案
          interactionCount: 1, // 交互次数统计
          isFallbackRecord: true // 标记为兜底记录，便于调试
        }
        
        await saveLearningRecord(learningRecord)
        console.log(`✅ ${currentMode}模式兜底交互记录已创建`)
      } else if (!isAnswerMode) {
        // 记录其他未处理的模式，便于调试
        console.warn(`⚠️ 未知交互模式: currentMode="${currentMode}", 跳过学习记录创建`)
      }
    }
    
    // 🎮 修正：触发游戏化奖励（仅限独立答题模式）
    if (userId && userId !== 'anonymous' && isAnswerMode) {
      try {
        // 判断问题难度和学习质量
        const difficulty = assessQuestionDifficulty(question, subject, grade)
        const isCorrectAnswer = evaluateStudentAnswer(studentInput, question, subject)
        
        // 构建AI聊天数据
        const chatData = {
          subject: subject || 'math',
          questionsAsked: 1,
          helpfulResponse: true,
          difficulty: difficulty,
          isCorrectAnswer: isCorrectAnswer,
          usedAiHelp: false // 独立答题模式，不算AI帮助
        }
        
        // 调用游戏系统API（内部调用）
        const gameService = require('../services/gameService')
        const gameResult = await gameService.syncAiChatToGame(userId, chatData)
        
        console.log(`🎮 独立答题游戏奖励已触发: 经验+${gameResult.expGained}, 金币+${gameResult.coinsGained}`)
        
      } catch (gameError) {
        // 游戏奖励失败不影响主要功能
        console.warn('⚠️ 游戏奖励触发失败:', gameError.message)
      }
    } else if (userId && userId !== 'anonymous' && isInteractionMode) {
      console.log(`💬 ${currentMode}模式不触发游戏奖励（仅记录互动）`)
    }
    
    // 🎯 如果学习完成，生成学习统计
    if (isComplete && userId && planId) {
      await generateCompletionSummary(userId, planId, chatHistory, learningRecord)
    }
    
    res.json({
      success: true,
      data: {
        aiResponse: aiResponse.content,
        currentStep: nextStep,
        responseType: determineResponseType(studentInput, aiResponse.content),
        isComplete,
        model: aiResponse.model,
        responseTime: aiResponse.responseTime,
        timestamp: new Date().toISOString(),
        sessionId: learningRecord?.sessionId || generateSessionId(), // 🔧 处理聊天模式下的sessionId
        currentMode: currentMode, // 🔧 返回当前模式
        countedInStatistics: isAnswerMode, // 🔧 返回是否计入统计
        // ✅ 修复：根据交互模式正确返回isCorrect字段
        isCorrect: isAnswerMode ? 
                   (answerVerification ? answerVerification.isCorrect : false) : 
                   null, // 交互模式始终返回null
        answerVerification: answerVerification // 包含完整的验证信息
      }
    })
    
  } catch (error) {
    console.error('❌ AI答疑失败:', error)
    res.status(500).json({
      success: false,
      message: 'AI老师正在认真思考中，请稍后再试',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * AI欢迎和学习建议接口 - 根据PRD要求生成个性化学习建议
 * POST /api/ai-chat/welcome-guidance
 */
router.post('/welcome-guidance', async (req, res) => {
  try {
    const { question, subject, grade, studentLevel, sessionId, planId } = req.body
    
    console.log('🎯 AI学习建议请求:', {
      question: question?.substring(0, 50) + '...',
      subject,
      grade,
      studentLevel,
      sessionId
    })
    
    // 参数验证
    if (!question || !subject || !grade) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：题目、学科或年级'
      })
    }
    
    try {
      // 使用标准模型生成个性化学习建议
      const modelConfig = CHAT_MODELS.STANDARD
      modelConfig.subject = subject
      
      // 构建AI学习建议提示词
      const prompt = buildWelcomeGuidancePrompt(question, subject, grade, studentLevel)
      
      const aiResponse = await callChatModel(prompt, modelConfig)
      
      // 解析AI响应，提取不同类型的建议
      const guidance = parseWelcomeGuidance(aiResponse.content, subject)
      
      res.json({
        success: true,
        data: {
          welcomeMessage: guidance.welcomeMessage,
          learningTips: guidance.learningTips,
          questionGuidance: guidance.questionGuidance,
          model: aiResponse.model,
          responseTime: aiResponse.responseTime,
          sessionId: sessionId
        }
      })
      
    } catch (aiError) {
      console.warn('⚠️ AI服务调用失败，使用默认建议:', aiError.message)
      
      // 使用默认的学科特定建议作为备用
      const defaultGuidance = getDefaultSubjectGuidance(subject, grade, question)
      
      res.json({
        success: true,
        data: {
          welcomeMessage: defaultGuidance.welcomeMessage,
          learningTips: defaultGuidance.learningTips,
          questionGuidance: defaultGuidance.questionGuidance,
          model: 'default',
          responseTime: 0,
          sessionId: sessionId,
          isDefault: true
        }
      })
    }
    
  } catch (error) {
    console.error('❌ AI学习建议生成失败:', error)
    res.status(500).json({
      success: false,
      message: '学习建议生成失败，请重试',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * 答案检查接口 - 使用快速模型
 * POST /api/ai-chat/check-answer
 */
router.post('/check-answer', async (req, res) => {
  try {
    const { question, answer, studentAnswer, subject, grade } = req.body
    
    // 🔧 修复参数解构问题 - 支持answer或studentAnswer字段
    const finalAnswer = answer || studentAnswer || ''
    const finalQuestion = question || ''
    const finalSubject = subject || 'math'
    const finalGrade = grade || '1'
    
    console.log('✅ 答案检查请求:', {
      question: finalQuestion?.substring(0, 50) + '...',
      answer: finalAnswer,
      subject: finalSubject,
      grade: finalGrade
    })
    
    // 参数验证
    if (!finalQuestion.trim() || !finalAnswer.trim()) {
      return res.status(400).json({
        success: false,
        message: '题目和答案不能为空'
      })
    }
    
    // 使用快速模型检查答案
    const modelConfig = CHAT_MODELS.QUICK
    modelConfig.subject = finalSubject
    const prompt = buildAnswerCheckPrompt(finalQuestion, finalAnswer, finalSubject, finalGrade)
    
    const aiResponse = await callChatModel(prompt, modelConfig)
    
    // 解析检查结果
    const checkResult = parseAnswerCheckResult(aiResponse.content, finalAnswer)
    
    res.json({
      success: true,
      data: {
        isCorrect: checkResult.isCorrect,
        feedback: checkResult.feedback,
        correctAnswer: checkResult.correctAnswer,
        explanation: checkResult.explanation,
        model: aiResponse.model,
        responseTime: aiResponse.responseTime
      }
    })
    
  } catch (error) {
    console.error('❌ 答案检查失败:', error)
    res.status(500).json({
      success: false,
      message: '答案检查失败，请重试',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * 智能提示接口 - 使用快速模型
 * POST /api/ai-chat/hint
 */
router.post('/hint', async (req, res) => {
  try {
    const { question, context, subject, grade } = req.body
    
    console.log('💡 智能提示请求:', { question: question?.substring(0, 50) + '...', subject, grade })
    
    // 使用快速模型生成提示
    const modelConfig = CHAT_MODELS.QUICK
    modelConfig.subject = subject
    const subjectConfig = getSubjectConfig(subject)
    const prompt = `请为这道${grade}年级${subjectConfig.name}题提供一个简短的思路提示：

题目：${question}
当前情况：${context}

要求：
1. 不直接给答案
2. 给出关键思路
3. 20字以内
4. 启发式引导
5. 使用适合${subjectConfig.name}学科的语言风格`
    
    const aiResponse = await callChatModel(prompt, modelConfig)
    
    res.json({
      success: true,
      data: {
        hint: aiResponse.content,
        model: aiResponse.model,
        responseTime: aiResponse.responseTime
      }
    })
    
  } catch (error) {
    console.error('❌ 智能提示失败:', error)
    res.status(500).json({
      success: false,
      message: '正在思考提示，请稍后...',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// 🔧 已删除重复的error-guidance路由定义，保留文件末尾的完整实现

/**
 * 鼓励话语接口 - 使用真实AI模型生成个性化鼓励  
 * POST /api/ai-chat/encourage
 */
router.post('/encourage', async (req, res) => {
  try {
    const { performance, progress, subject } = req.body
    
    console.log('🌟 鼓励话语请求:', { performance, progress, subject })
    
    // 使用真实AI生成个性化鼓励话语
    const modelConfig = CHAT_MODELS.QUICK
    modelConfig.subject = subject
    const subjectConfig = getSubjectConfig(subject)
    const prompt = `根据学生的${subjectConfig.name}学习表现生成一句鼓励话语：

学科：${subjectConfig.name} ${subjectConfig.icon}
表现：${performance}
进度：${progress}

要求：
1. 简短温暖，15字以内
2. 符合小学生心理
3. 个性化鼓励
4. 使用适合${subjectConfig.name}的emoji
5. 体现${subjectConfig.name}学科特色`
    
    const aiResponse = await callChatModel(prompt, modelConfig)
    
    res.json({
      success: true,
      data: {
        encouragement: aiResponse.content,
        model: aiResponse.model,
        responseTime: aiResponse.responseTime
      }
    })
    
  } catch (error) {
    console.error('❌ 鼓励话语失败:', error)
    res.status(500).json({
      success: false,
      message: '网络波动，请稍后重试',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * 模型速度测试接口
 * GET /api/ai-chat/test-speed
 */
router.get('/test-speed', async (req, res) => {
  try {
    const { modelType = 'standard' } = req.query
    
    console.log('⚡ 模型速度测试:', modelType)
    
    let modelConfig
    switch (modelType) {
      case 'quick':
        modelConfig = CHAT_MODELS.QUICK
        break
      case 'deep':
        modelConfig = CHAT_MODELS.DEEP
        break
      default:
        modelConfig = CHAT_MODELS.STANDARD
    }
    
    const testPrompt = `请简短地回复"测试成功"，并说明当前使用的是${modelConfig.model}模型。`
    
    const aiResponse = await callChatModel(testPrompt, modelConfig)
    
    res.json({
      success: true,
      data: {
        model: aiResponse.model,
        responseTime: aiResponse.responseTime,
        expectedTime: modelConfig.expectedResponseTime,
        content: aiResponse.content,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ 速度测试失败:', error)
    res.status(500).json({
      success: false,
      message: '速度测试失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * 聊天历史接口
 * GET /api/ai-chat/history
 */
router.get('/history', async (req, res) => {
  try {
    const { userId, sessionId, limit = 20 } = req.query
    
    console.log('📝 聊天历史请求:', { userId, sessionId, limit })
    
    // 模拟聊天历史数据
    const mockHistory = Array.from({ length: Math.min(limit, 10) }, (_, index) => ({
      id: `msg_${Date.now()}_${index}`,
      type: index % 2 === 0 ? 'user' : 'ai',
      content: index % 2 === 0 ? `学生问题 ${index + 1}` : `AI回复 ${index + 1}`,
      timestamp: new Date(Date.now() - (10 - index) * 60000).toISOString(),
      model: index % 2 === 0 ? null : 'qwen-plus'
    }))
    
    res.json({
      success: true,
      data: {
        history: mockHistory,
        total: mockHistory.length,
        sessionId: sessionId || 'default_session'
      }
    })
    
  } catch (error) {
    console.error('❌ 聊天历史获取失败:', error)
    res.status(500).json({
      success: false,
      message: '历史记录获取失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * 构建答疑提示词 - 支持语音/文字模式和意图识别
 */
function buildTutoringPrompt(question, studentInput, chatHistory, subject, grade, isVoiceChat = false, answerDetection = null) {
  // 🔧 根据学生意图调整AI回复策略
  let intentGuidance = ''
  
  if (answerDetection && answerDetection.intentType === 'answer_confirmation') {
    // 学生在寻求答案确认（如"老师12对不对"）
    intentGuidance = `
⚠️ 重要：学生正在寻求答案确认！学生说"${studentInput}"，提供了答案"${answerDetection.primaryAnswer}"

🚨 特殊处理模式：答案确认模式
- 学生不是在请求解题思路，而是在询问答案对错
- 必须直接回答对错，不要给解题步骤
- 如果答案是15（7+8的正确答案）：直接说"对的！答案就是15"
- 如果答案不是15：直接说"这个答案不对哦，正确答案是15"
- 禁止给出计算引导，直接给答案评价`
  } else if (answerDetection && answerDetection.intentType === 'direct_answer') {
    // 学生直接给出答案
    intentGuidance = `
学生意图分析：学生直接提供了答案"${answerDetection.primaryAnswer}"。

特殊指导：
- 对学生的答案进行验证和反馈
- 重点关注答案的正确性
- 给出相应的表扬或指导`
  } else {
    // 其他情况，如请求帮助、表达困惑等
    intentGuidance = `
学生意图分析：学生可能在寻求解题帮助或表达困惑。

特殊指导：
- 提供启发式引导，不直接给答案
- 用提问方式引导学生思考
- 分步骤引导学生理解题目`
  }
  
  // 根据交互类型调整回复要求
  let responseRequirements
  if (isVoiceChat) {
    responseRequirements = `
${intentGuidance}

语音聊天回复要求：
- 语言简单易懂，适合${grade}年级学生
- 控制在30-50字以内
- 不使用任何emoji或特殊符号（适合语音播放）
- 语言要自然流畅，适合听觉理解
- 语调要亲切，像真正的老师在面对面交流`
  } else {
    responseRequirements = `
${intentGuidance}

文字聊天回复要求：
- 语言简单易懂，适合${grade}年级学生
- 控制在50字以内
- 使用适当的emoji增强趣味性
- 语气要鼓励和引导性`
  }

  let prompt = `你是一位专业的小学${subject}老师，正在为${grade}年级学生提供答疑辅导。

当前题目：${question}

学生说："${studentInput}"

聊天历史：
${chatHistory?.map(msg => `${msg.role}: ${msg.content}`).join('\n') || '无'}

${responseRequirements}`

  return prompt
}

/**
 * 构建答案检查提示词
 */
function buildAnswerCheckPrompt(question, answer, subject, grade) {
  // 🔧 修复参数名称匹配问题
  const prompt = `请检查这道${grade}年级${subject}题的答案是否正确：

题目：${question}
学生答案：${answer}

请判断对错，并给出简短反馈。记住：
- 如果答案正确，表扬学生
- 如果答案错误，给出鼓励和提示
- 语言要适合小学生理解`

  // 🐛 添加调试信息
  console.log('🔍 答案检查提示词调试:', {
    question,
    answer,
    subject,
    grade,
    prompt: prompt.substring(0, 200) + '...'
  })
  
  return prompt
}

/**
 * 🔧 修复：分析学习步骤，加入真实答案验证
 */
function analyzeNextStep(currentStep, studentInput, aiResponse) {
  // 如果学生明确给出了数字答案，需要进行答案验证
  const numberMatch = studentInput.match(/\d+/)
  if (numberMatch && (aiResponse.includes('正确') || aiResponse.includes('对了') || aiResponse.includes('很好'))) {
    return 'correct'
  }
  
  if (numberMatch && (aiResponse.includes('错') || aiResponse.includes('不对') || aiResponse.includes('再试试'))) {
    return 'incorrect'
  }
  
  if (studentInput && studentInput.includes('明白了')) {
    return 'understood'
  }
  
  if (currentStep === 'understanding' && aiResponse.includes('想想')) {
    return 'thinking'
  }
  
  if (currentStep === 'thinking' && aiResponse.includes('试试')) {
    return 'solving'
  }
  
  return currentStep || 'understanding'
}

/**
 * 确定回复类型
 */
function determineResponseType(studentInput, aiResponse) {
  if (aiResponse.includes('很好') || aiResponse.includes('正确')) {
    return 'praise'
  }
  
  if (aiResponse.includes('想想') || aiResponse.includes('?')) {
    return 'question'
  }
  
  if (aiResponse.includes('试试') || aiResponse.includes('尝试')) {
    return 'guidance'
  }
  
  return 'explanation'
}

/**
 * 解析答案检查结果
 */
function parseAnswerCheckResult(aiContent, studentAnswer) {
  const isCorrect = aiContent.includes('正确') || aiContent.includes('对')
  
  return {
    isCorrect,
    feedback: aiContent,
    correctAnswer: isCorrect ? studentAnswer : null,
    explanation: aiContent
  }
}

// ==================== 学习数据管理函数 ====================

// 🔧 注释掉：不再使用内存存储，已改为数据库存储
// let globalLearningRecords = []
let sessionSummaries = new Map()

/**
 * 生成会话ID
 */
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 🔧 优化：保存学习记录 - 增强容错能力和超时控制
 */
async function saveLearningRecord(record) {
  // 🚨 修复：移除优雅降级，确保数据库连接和保存问题被明确报告
  try {
    // 检查数据库连接状态
    const mongoose = require('mongoose')
    if (mongoose.connection.readyState !== 1) {
      throw new Error('数据库连接未建立，无法保存学习记录')
    }
    
    // 🔧 增强：数据保存重试机制 - 最多重试3次
    let saveAttempts = 0
    const maxRetries = 3
    let learningRecord = null
    
    while (saveAttempts < maxRetries) {
      try {
        saveAttempts++
        console.log(`📝 尝试保存学习记录 (第${saveAttempts}次)...`)
        
        // 🔧 使用优化的数据库模型创建学习记录（带超时控制）
        learningRecord = await Promise.race([
          LearningRecord.createRecord({
            userId: record.userId || 'anonymous',
            planId: record.planId || 'default',
            question: record.question,
            studentInput: record.studentInput,
            firstAnswer: record.firstAnswer || record.studentInput,
            finalAnswer: record.finalAnswer || record.studentInput,
            isCorrect: record.isCorrect,
            aiResponse: record.aiResponse,
            subject: record.subject || 'math',
            grade: record.grade || 1,
            // ✅ 添加关键字段
            currentMode: record.currentMode || 'chat',
            countedInStatistics: record.countedInStatistics || false,
            answerVerification: record.answerVerification || {
              studentAnswer: record.studentAnswer,
              correctAnswer: record.correctAnswer,
              reason: record.reason || '',
              explanation: record.explanation || ''
            },
            learningContext: {
              currentStep: record.currentStep,
              sessionId: record.sessionId,
              questionType: record.questionType || 'practice',
              difficultyLevel: record.difficultyLevel || 'normal'
            },
            timestamps: {
              started: record.timestamp || new Date(),
              completed: new Date(),
              duration: record.responseTime || 0
            }
          }),
          // 🔧 10秒超时保护（增加超时时间提高成功率）
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('数据库保存超时')), 10000)
          )
        ])
        
        // 保存成功，跳出重试循环
        console.log(`✅ 学习记录保存成功 (第${saveAttempts}次尝试): ${learningRecord.recordId}`)
        break
        
      } catch (saveError) {
        console.error(`❌ 第${saveAttempts}次保存尝试失败:`, saveError.message)
        
        if (saveAttempts >= maxRetries) {
          // 🚨 重试次数已用完，抛出错误而不是降级
          throw new Error(`学习记录保存失败，已重试${maxRetries}次: ${saveError.message}`)
        }
        
        // 等待1秒后重试
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    // 返回兼容格式的记录对象
    return {
      id: learningRecord?.recordId,
      userId: learningRecord?.userId,
      planId: learningRecord?.planId,
      question: learningRecord?.question,
      studentInput: learningRecord?.studentInput,
      firstAnswer: learningRecord?.firstAnswer,
      finalAnswer: learningRecord?.finalAnswer,
      isCorrect: learningRecord?.isCorrect,
      aiResponse: learningRecord?.aiResponse,
      subject: learningRecord?.subject,
      grade: learningRecord?.grade,
      studentAnswer: learningRecord?.answerVerification?.studentAnswer,
      correctAnswer: learningRecord?.answerVerification?.correctAnswer,
      sessionId: learningRecord?.learningContext?.sessionId,
      timestamp: learningRecord?.createdAt,
      responseTime: learningRecord?.timestamps?.duration || 0,
      savedToDatabase: true,
      ...record  // 保留其他原有字段
    }
    
  } catch (error) {
    console.error('❌ 学习记录保存彻底失败:', error.message)
    
    // 🚨 修复：移除优雅降级，直接抛出错误
    // 这样前端和用户能明确知道保存失败，可以选择重试
    throw new Error(`学习记录保存失败: ${error.message}`)
  }
}

/**
 * 生成学习完成总结 - 🔧 修改为数据库查询
 */
async function generateCompletionSummary(userId, planId, chatHistory, finalRecord) {
  try {
    console.log(`🎯 生成学习完成总结: userId=${userId}, planId=${planId}`)
    
    // 🔧 修改：从数据库获取本次会话的所有记录
    // 🔧 修复：检查finalRecord是否存在且有sessionId
    if (!finalRecord || !finalRecord.sessionId) {
      console.warn('⚠️ 无效的finalRecord或sessionId，跳过学习完成总结')
      return null
    }
    
    const sessionRecords = await LearningRecord.find({
      userId: userId,
      planId: planId,
      'learningContext.sessionId': finalRecord.sessionId
    }).sort({ createdAt: 1 })  // 按时间顺序排序
    
    // 转换为兼容格式
    const compatibleRecords = sessionRecords.map(record => ({
      userId: record.userId,
      planId: record.planId,
      question: record.question,
      studentInput: record.studentInput,
      firstAnswer: record.firstAnswer,
      finalAnswer: record.finalAnswer,
      isCorrect: record.isCorrect,
      aiResponse: record.aiResponse,
      subject: record.subject,
      grade: record.grade,
      studentAnswer: record.answerVerification?.studentAnswer,
      correctAnswer: record.answerVerification?.correctAnswer,
      sessionId: record.learningContext?.sessionId,
      timestamp: record.createdAt,
      responseTime: record.timestamps?.duration || 0
    }))
    
    // 🔧 修复：只统计有实际数字答案的记录
    const answeredQuestions = compatibleRecords.filter(r => r.isCorrect !== null)
    const totalQuestions = answeredQuestions.length
    const correctAnswers = compatibleRecords.filter(r => r.isCorrect === true).length
    const wrongAnswers = compatibleRecords.filter(r => r.isCorrect === false).length
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
    
    console.log('📊 统计计算调试:', {
      总记录数: compatibleRecords.length,
      有效答案记录数: answeredQuestions.length,
      正确答案数: correctAnswers,
      错误答案数: wrongAnswers,
      计算正确率: accuracy
    })
    const totalTime = compatibleRecords.reduce((sum, r) => sum + (r.responseTime || 0), 0)
    
    // 分析常见错误
    const mistakes = analyzeSessionMistakes(compatibleRecords)
    
    // 🎯 任务2预备：分析学习弱点
    const weaknessAnalysis = await analyzeStudentWeaknesses(compatibleRecords, finalRecord.subject, finalRecord.grade)
    
    const summary = {
      userId,
      planId,
      sessionId: finalRecord.sessionId,
      subject: finalRecord.subject,
      grade: finalRecord.grade,
      completedAt: new Date().toISOString(),
      statistics: {
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        accuracy,
        totalTime: Math.round(totalTime / 1000), // 转换为秒
        averageResponseTime: totalQuestions > 0 ? Math.round(totalTime / totalQuestions) : 0
      },
      mistakes,
      weaknessAnalysis,
      records: compatibleRecords.map(r => ({
        question: r.question,
        studentInput: r.studentInput,
        aiResponse: r.aiResponse,
        isCorrect: r.isCorrect, // 🔧 修复：使用真实的答案验证结果
        studentAnswer: r.studentAnswer,
        correctAnswer: r.correctAnswer,
        timestamp: r.timestamp
      }))
    }
    
    // 保存会话总结
    sessionSummaries.set(`${userId}_${planId}_${finalRecord.sessionId}`, summary)
    
    console.log(`✅ 学习完成总结生成: 准确率${accuracy}%, 总用时${summary.statistics.totalTime}秒`)
    
    // 🚀 任务2：生成定制化专题练习（基于答题错误）
    if (weaknessAnalysis && weaknessAnalysis.length > 0) {
      await generateCustomizedPractice(userId, weaknessAnalysis, finalRecord.subject, finalRecord.grade)
    }
    
    // ✅ 新增：任务3：生成基于AI交互的学习建议
    try {
      const interactionAdvice = await generateLearningAdviceFromInteractions(
        userId, 
        planId, 
        finalRecord.subject, 
        finalRecord.grade
      )
      
      if (interactionAdvice) {
        summary.learningAdvice = interactionAdvice
        console.log(`✅ AI交互学习建议已生成: ${interactionAdvice.knowledgeWeaknesses.length}个薄弱点, ${interactionAdvice.customizedQuestions.length}道定制题目`)
      }
    } catch (adviceError) {
      console.warn('⚠️ AI交互学习建议生成失败:', adviceError.message)
    }
    
    return summary
  } catch (error) {
    console.error('❌ 学习完成总结生成失败:', error)
    throw error
  }
}

/**
 * 分析会话中的错误模式
 */
function analyzeSessionMistakes(sessionRecords) {
  const mistakes = []
  
  sessionRecords.forEach(record => {
    // 🔧 修复：基于真实答案验证判断错误
    if (record.isCorrect === false) {
      // 分析错误类型
      const errorType = classifyMistake(record.question, record.studentInput, record.subject)
      mistakes.push({
        question: record.question,
        studentAnswer: record.studentInput,
        errorType,
        subject: record.subject,
        aiGuidance: record.aiResponse,
        correctAnswer: record.correctAnswer, // 🔧 新增：正确答案
        timestamp: record.timestamp
      })
    }
  })
  
  return mistakes
}

/**
 * 🎯 多学科错误分类
 */
function classifyMistake(question, studentInput, subject = 'math') {
  const input = (studentInput || '').toLowerCase()
  const quest = (question || '').toLowerCase()
  
  switch (subject) {
    case 'math':
      return classifyMathMistake(quest, input)
    case 'chinese':
      return classifyChineseMistake(quest, input)
    case 'english':
      return classifyEnglishMistake(quest, input)
    case 'science':
      return classifyScienceMistake(quest, input)
    default:
      return '其他错误'
  }
}

/**
 * 数学错误分类
 */
function classifyMathMistake(question, input) {
  if (question.includes('+') || question.includes('加')) {
    if (input.includes('不知道') || input.includes('不会')) return '加法概念不清'
    return '加法计算错误'
  }
  
  if (question.includes('-') || question.includes('减')) {
    if (input.includes('不知道') || input.includes('不会')) return '减法概念不清'
    return '减法计算错误'
  }
  
  if (question.includes('×') || question.includes('乘')) {
    return '乘法计算错误'
  }
  
  if (question.includes('÷') || question.includes('除')) {
    return '除法计算错误'
  }
  
  if (question.includes('应用题') || question.includes('小明') || question.includes('小红')) {
    return '应用题理解困难'
  }
  
  if (question.includes('几何') || question.includes('图形')) {
    return '几何概念模糊'
  }
  
  return '数学基础薄弱'
}

/**
 * 语文错误分类
 */
function classifyChineseMistake(question, input) {
  if (question.includes('拼音') || question.includes('读音')) {
    return '拼音掌握不熟'
  }
  
  if (question.includes('汉字') || question.includes('写字') || question.includes('笔画')) {
    return '汉字书写困难'
  }
  
  if (question.includes('组词') || question.includes('词语')) {
    return '词汇量不足'
  }
  
  if (question.includes('阅读') || question.includes('理解') || question.includes('短文')) {
    return '阅读理解困难'
  }
  
  if (question.includes('造句') || question.includes('表达')) {
    return '表达能力欠缺'
  }
  
  if (question.includes('古诗') || question.includes('背诵')) {
    return '记忆能力待提高'
  }
  
  return '语文基础待加强'
}

/**
 * 英语错误分类
 */
function classifyEnglishMistake(question, input) {
  if (question.includes('字母') || question.includes('letter')) {
    return '字母认识不清'
  }
  
  if (question.includes('单词') || question.includes('word')) {
    return '单词记忆困难'
  }
  
  if (question.includes('发音') || question.includes('读') || question.includes('pronunciation')) {
    return '发音不准确'
  }
  
  if (question.includes('语法') || question.includes('grammar')) {
    return '语法规则混乱'
  }
  
  if (question.includes('翻译') || question.includes('理解')) {
    return '理解能力不足'
  }
  
  if (question.includes('对话') || question.includes('口语')) {
    return '口语表达困难'
  }
  
  return '英语基础薄弱'
}

/**
 * 科学错误分类
 */
function classifyScienceMistake(question, input) {
  if (question.includes('观察') || question.includes('看到')) {
    return '观察能力待提高'
  }
  
  if (question.includes('实验') || question.includes('操作')) {
    return '实验操作不当'
  }
  
  if (question.includes('分类') || question.includes('归纳')) {
    return '分类思维欠缺'
  }
  
  if (question.includes('原因') || question.includes('为什么')) {
    return '因果关系理解困难'
  }
  
  if (question.includes('预测') || question.includes('猜测')) {
    return '科学推理能力不足'
  }
  
  return '科学思维待培养'
}

/**
 * 🎯 任务2：分析学生学习弱点
 */
async function analyzeStudentWeaknesses(sessionRecords, subject, grade) {
  try {
    console.log('🔍 分析学生学习弱点...')
    
    const weaknesses = []
    const errorPatterns = {}
    
    // 🔧 修复：基于真实答案验证统计错误模式
    sessionRecords.forEach(record => {
      if (record.isCorrect === false) {
        const errorType = classifyMistake(record.question, record.studentInput, subject)
        errorPatterns[errorType] = (errorPatterns[errorType] || 0) + 1
      }
    })
    
    // 生成弱点分析
    Object.entries(errorPatterns).forEach(([errorType, count]) => {
      if (count >= 2) { // 出现2次以上认为是弱点
        weaknesses.push({
          type: errorType,
          frequency: count,
          severity: count >= 3 ? 'high' : 'medium',
          description: getWeaknessDescription(errorType),
          practiceRecommendation: getPracticeRecommendation(errorType, subject, grade)
        })
      }
    })
    
    console.log(`✅ 识别到${weaknesses.length}个学习弱点`)
    
    return weaknesses
  } catch (error) {
    console.error('❌ 学习弱点分析失败:', error)
    return []
  }
}

/**
 * 🎯 获取多学科弱点描述
 */
function getWeaknessDescription(errorType) {
  // 数学学科描述
  const mathDescriptions = {
    '加法概念不清': '对加法的基本概念理解不够清晰，需要加强基础概念学习',
    '加法计算错误': '加法计算过程中容易出错，需要多练习基础计算',
    '减法概念不清': '对减法的基本概念理解不够，建议从生活实例入手',
    '减法计算错误': '减法计算准确性需要提高，特别是退位减法',
    '乘法计算错误': '乘法口诀掌握不熟练，需要加强记忆和练习',
    '除法计算错误': '除法概念理解困难，建议从分组实例开始学习',
    '应用题理解困难': '对文字应用题的理解能力需要加强，建议多练习题意分析',
    '几何概念模糊': '对图形和空间概念理解不清晰，需要加强直观教学',
    '数学基础薄弱': '数学基础知识掌握不扎实，需要系统性复习'
  }
  
  // 语文学科描述
  const chineseDescriptions = {
    '拼音掌握不熟': '拼音基础知识掌握不够扎实，需要加强声母韵母练习',
    '汉字书写困难': '汉字笔画顺序和结构掌握不好，需要规范书写练习',
    '词汇量不足': '词汇积累较少，建议多阅读增加词汇量',
    '阅读理解困难': '对文章内容理解能力不足，需要提高阅读技巧',
    '表达能力欠缺': '语言表达能力有待提高，建议多练习口语和写作',
    '记忆能力待提高': '对古诗词等需要记忆的内容掌握不好，需要改进记忆方法',
    '语文基础待加强': '语文基础知识需要系统性学习和巩固'
  }
  
  // 英语学科描述
  const englishDescriptions = {
    '字母认识不清': '对英语字母的认识和书写还不够熟练，需要加强基础练习',
    '单词记忆困难': '英语单词记忆有困难，建议使用图像和联想记忆法',
    '发音不准确': '英语发音需要改进，建议多听多模仿标准发音',
    '语法规则混乱': '对英语语法规则理解模糊，需要系统学习基础语法',
    '理解能力不足': '对英语句子和短文理解困难，需要加强阅读练习',
    '口语表达困难': '英语口语表达能力不足，建议多练习日常对话',
    '英语基础薄弱': '英语基础知识掌握不扎实，需要从基础开始学习'
  }
  
  // 科学学科描述
  const scienceDescriptions = {
    '观察能力待提高': '科学观察能力需要加强，建议多做观察记录练习',
    '实验操作不当': '实验操作技能需要提高，建议在老师指导下多练习',
    '分类思维欠缺': '对事物分类和归纳的逻辑思维需要培养',
    '因果关系理解困难': '对现象背后的原因理解不够深入，需要加强思考训练',
    '科学推理能力不足': '科学推理和预测能力需要通过更多实践来培养',
    '科学思维待培养': '科学思维方式需要逐步建立和完善'
  }
  
  // 合并所有描述
  const allDescriptions = {
    ...mathDescriptions,
    ...chineseDescriptions, 
    ...englishDescriptions,
    ...scienceDescriptions,
    '其他错误': '学习过程中遇到一些困难，需要个性化指导'
  }
  
  return allDescriptions[errorType] || allDescriptions['其他错误']
}

/**
 * 🎯 获取多学科练习建议
 */
function getPracticeRecommendation(errorType, subject, grade) {
  // 数学学科建议
  const mathRecommendations = {
    '加法概念不清': `多用实物演示加法过程，如用苹果、积木等帮助理解`,
    '加法计算错误': `每天练习10道以内的加法题，掌握进位加法技巧`,
    '减法概念不清': `通过"拿走"游戏理解减法含义，从具体到抽象`,
    '减法计算错误': `重点练习退位减法，可以用数轴辅助理解`,
    '乘法计算错误': `背诵乘法口诀表，通过游戏和歌曲加强记忆`,
    '除法计算错误': `用分组游戏理解除法概念，多练习简单除法运算`,
    '应用题理解困难': `先从简单一步应用题开始，培养读题和分析能力`,
    '几何概念模糊': `多观察生活中的图形，用拼图游戏培养空间想象力`,
    '数学基础薄弱': `从基础概念开始系统复习，每天练习基础计算题`
  }
  
  // 语文学科建议
  const chineseRecommendations = {
    '拼音掌握不熟': `每天练习拼音拼读，用拼音卡片和口诀帮助记忆`,
    '汉字书写困难': `按笔画顺序练习写字，用田字格规范书写`,
    '词汇量不足': `每天积累3-5个新词语，通过阅读增加词汇量`,
    '阅读理解困难': `从简单短文开始，学会找关键信息和主要内容`,
    '表达能力欠缺': `多练习看图说话，鼓励用完整句子表达想法`,
    '记忆能力待提高': `用图像联想和反复朗读的方法背诵古诗词`,
    '语文基础待加强': `系统学习拼音、汉字基础，多读适合年级的课外书`
  }
  
  // 英语学科建议  
  const englishRecommendations = {
    '字母认识不清': `每天练习字母书写，通过字母歌加强记忆`,
    '单词记忆困难': `用图片和动作帮助记忆单词，制作单词卡片`,
    '发音不准确': `多听标准发音，跟读英语儿歌和简单对话`,
    '语法规则混乱': `从最基本的句型开始学习，多练习造句`,
    '理解能力不足': `从简单的英语故事书开始阅读，逐步提高`,
    '口语表达困难': `每天练习简单的英语对话，不怕说错`,
    '英语基础薄弱': `从字母和基础单词开始，建立英语学习兴趣`
  }
  
  // 科学学科建议
  const scienceRecommendations = {
    '观察能力待提高': `每天观察身边的自然现象，记录观察日记`,
    '实验操作不当': `在安全前提下多做简单科学小实验`,
    '分类思维欠缺': `练习对生活中的物品进行分类，培养逻辑思维`,
    '因果关系理解困难': `多问"为什么"，培养对现象背后原因的思考`,
    '科学推理能力不足': `通过观察现象进行预测，验证猜想`,
    '科学思维待培养': `培养好奇心，多观察、多思考、多提问`
  }
  
  // 根据学科选择对应建议
  let recommendations = mathRecommendations
  if (subject === 'chinese') recommendations = chineseRecommendations
  else if (subject === 'english') recommendations = englishRecommendations
  else if (subject === 'science') recommendations = scienceRecommendations
  
  const defaultRecommendation = `${grade}年级${getSubjectConfig(subject).name}综合复习`
  return recommendations[errorType] || defaultRecommendation
}

/**
 * 🚀 任务2：生成定制化专题练习
 */
async function generateCustomizedPractice(userId, weaknessAnalysis, subject, grade) {
  try {
    console.log('🎯 开始生成定制化专题练习...')
    
    for (const weakness of weaknessAnalysis) {
      // 生成针对性练习题 - 🔧 修复：传递userId参数
      const practiceSet = await generatePracticeQuestions(weakness, subject, grade, userId)
      
      // 保存到专题练习系统
      await saveToPracticeModule(userId, practiceSet)
      
      // 同步到后台题库
      await syncToQuestionBank(practiceSet)
      
      console.log(`✅ 为"${weakness.type}"生成${practiceSet.questions.length}道练习题`)
    }
    
    console.log('🎉 定制化专题练习生成完成')
    
  } catch (error) {
    console.error('❌ 定制化专题练习生成失败:', error)
  }
}

/**
 * 🎯 获取多学科练习题模板
 */
function getQuestionTemplates(subject, weaknessType) {
  // 数学题模板
  const mathTemplates = {
    '加法概念不清': [
      `小明有{a}个苹果，又买了{b}个，一共有多少个？`,
      `{a} + {b} = ?`,
      `把{a}和{b}合在一起是多少？`,
      `公园里有{a}只小鸟，又飞来{b}只，现在有多少只？`,
      `妈妈买了{a}个橘子和{b}个香蕉，一共买了多少个水果？`
    ],
    '减法概念不清': [
      `小红有{a}颗糖，吃了{b}颗，还剩多少颗？`,
      `{a} - {b} = ?`,
      `从{a}里面去掉{b}是多少？`,
      `树上有{a}个苹果，摘下{b}个，还剩多少个？`,
      `停车场有{a}辆车，开走了{b}辆，还有多少辆？`
    ],
    '乘法计算错误': [
      `{a}个盒子，每个盒子有{b}个球，一共有多少个球？`,
      `{a} × {b} = ?`,
      `{a}行苹果，每行{b}个，一共有多少个苹果？`
    ],
    '应用题理解困难': [
      `班级有{a}个男生，{b}个女生，一共有多少个学生？`,
      `妈妈买了{a}个橘子，分给小朋友{b}个，还剩多少个？`,
      `书店有{a}本故事书，{b}本科学书，故事书比科学书多多少本？`
    ]
  }
  
  // 语文题模板
  const chineseTemplates = {
    '拼音掌握不熟': [
      `请写出"妈妈"的拼音`,
      `"xiǎo péng yǒu"是哪几个汉字？`,
      `给下面的字注音：家、学、校`,
      `拼读：b-à-ba读作什么？`,
      `选择正确的拼音：老师 (lǎo shī / láo shī)`
    ],
    '汉字书写困难': [
      `请写出"水"字的笔画顺序`,
      `"木"字加一笔可以变成什么字？`,
      `照样子写字：大→小，上→？`,
      `用"小"字组词（至少写两个）`,
      `补全汉字：氵+工=？`
    ],
    '词汇量不足': [
      `用"快乐"造句`,
      `写出三个表示动物的词语`,
      `"高兴"的近义词是什么？`,
      `选择合适的词语填空：天气很（热/冷）`,
      `照样子写词语：又大又圆  又（ ）又（ ）`
    ],
    '阅读理解困难': [
      `小猫在院子里玩球。问：小猫在哪里玩？`,
      `春天来了，花儿开了。这句话描写的是什么季节？`,
      `妈妈给我买了一本书。问：谁买了书？`,
      `太阳从东方升起。问：太阳从哪个方向升起？`,
      `小鸟在树上唱歌。问：小鸟在做什么？`
    ]
  }
  
  // 英语题模板
  const englishTemplates = {
    '字母认识不清': [
      `写出字母A的大小写形式`,
      `按字母表顺序排列：d, b, c, a`,
      `找出元音字母：b, a, f, e, k`,
      `写出字母M的小写形式`,
      `下面哪个是字母R的正确写法？`
    ],
    '单词记忆困难': [
      `"cat"是什么意思？`,
      `"苹果"用英语怎么说？`,
      `选择正确答案：dog表示（狗/猫）`,
      `写出three的中文意思`,
      `补全单词：b_ok（书）`
    ],
    '发音不准确': [
      `读出单词：hello`,
      `"thank you"怎么读？`,
      `选择/æ/音：cat, cake, car`,
      `跟读：Good morning!`,
      `哪个单词读音相同：see, tea, key`
    ],
    '口语表达困难': [
      `用英语介绍自己：My name is...`,
      `如何用英语说"再见"？`,
      `完成对话：Hello! - （ ）`,
      `用英语说"这是一支笔"`,
      `如何问别人的名字？`
    ]
  }
  
  // 科学题模板
  const scienceTemplates = {
    '观察能力待提高': [
      `观察一片叶子，说出它的形状和颜色`,
      `比较苹果和橘子有什么不同？`,
      `看看窗外，今天的天气怎么样？`,
      `观察水的三种状态：固体、液体、气体`,
      `找找教室里有哪些圆形的物品？`
    ],
    '实验操作不当': [
      `做实验时应该注意什么安全问题？`,
      `如何正确使用放大镜观察物体？`,
      `种植植物需要准备哪些材料？`,
      `测量物体长度时应该怎么做？`,
      `混合红色和黄色会得到什么颜色？`
    ],
    '分类思维欠缺': [
      `把动物分类：猫、鱼、鸟、狗`,
      `水果和蔬菜有什么区别？`,
      `把交通工具分类：汽车、飞机、自行车、轮船`,
      `哪些材料能浮在水面上？`,
      `把物品按软硬分类：石头、海绵、木头、棉花`
    ]
  }
  
  // 根据学科返回对应模板
  if (subject === 'chinese') return chineseTemplates[weaknessType] || chineseTemplates['词汇量不足']
  if (subject === 'english') return englishTemplates[weaknessType] || englishTemplates['单词记忆困难']
  if (subject === 'science') return scienceTemplates[weaknessType] || scienceTemplates['观察能力待提高']
  
  // 默认返回数学模板
  return mathTemplates[weaknessType] || mathTemplates['加法概念不清']
}

/**
 * 生成练习题
 */
async function generatePracticeQuestions(weakness, subject, grade, userId = null) {
  // 🔧 修复变量作用域 - 确保userId参数正确传递
  const currentUserId = userId || `anonymous_${Date.now()}`
  console.log(`🎯 生成练习题: userId=${currentUserId}, subject=${subject}, grade=${grade}`)
  
  // 🎯 多学科练习题模板
  const templates = getQuestionTemplates(subject, weakness.type)
  const questions = []
  
  // 🎯 生成5道多学科练习题
  for (let i = 0; i < 5; i++) {
    const template = templates[i % templates.length]
    let questionText = template
    let answer = '请仔细思考'
    
    // 根据学科生成不同类型的题目和答案
    if (subject === 'math') {
      const a = Math.floor(Math.random() * 10) + 1
      const b = Math.floor(Math.random() * 5) + 1
      questionText = template.replace('{a}', a).replace('{b}', b)
      
      // 根据弱点类型计算答案
      if (weakness.type.includes('加法')) answer = (a + b).toString()
      else if (weakness.type.includes('减法')) answer = (a - b).toString()
      else if (weakness.type.includes('乘法')) answer = (a * b).toString()
      else if (weakness.type.includes('除法')) answer = Math.floor(a / b).toString()
      else answer = (a + b).toString() // 默认加法
      
    } else if (subject === 'chinese') {
      // 语文题目答案示例
      const chineseAnswers = {
        '请写出"妈妈"的拼音': 'mā ma',
        '"xiǎo péng yǒu"是哪几个汉字？': '小朋友',
        '给下面的字注音：家、学、校': 'jiā、xué、xiào',
        '用"快乐"造句': '我今天很快乐',
        '写出三个表示动物的词语': '小猫、小狗、小鸟'
      }
      answer = chineseAnswers[template] || '根据题目要求作答'
      
    } else if (subject === 'english') {
      // 英语题目答案示例
      const englishAnswers = {
        '"cat"是什么意思？': '猫',
        '"苹果"用英语怎么说？': 'apple',
        '写出字母A的大小写形式': 'A, a',
        '如何用英语说"再见"？': 'Goodbye / Bye',
        '用英语介绍自己：My name is...': 'My name is [你的名字]'
      }
      answer = englishAnswers[template] || '请用英语回答'
      
    } else if (subject === 'science') {
      // 科学题目答案示例
      const scienceAnswers = {
        '观察一片叶子，说出它的形状和颜色': '叶子是绿色的，形状像椭圆形',
        '比较苹果和橘子有什么不同？': '苹果是圆的，橘子是橙色的',
        '把动物分类：猫、鱼、鸟、狗': '陆地动物：猫、狗；水中动物：鱼；空中动物：鸟',
        '做实验时应该注意什么安全问题？': '要小心，不要弄伤自己，听老师的指导'
      }
      answer = scienceAnswers[template] || '仔细观察并思考'
    }
    
    questions.push({
      id: `practice_${Date.now()}_${i}`,
      text: questionText,
      answer: answer,
      type: weakness.type,
      difficulty: grade <= 2 ? 'easy' : 'medium',
      subject,
      grade,
      subjectIcon: getSubjectConfig(subject).icon
    })
  }
  
  return {
    id: `practice_set_${Date.now()}`,
    weaknessType: weakness.type,
    subject,
    grade,
    questions,
    createdAt: new Date().toISOString(),
    source: 'ai_analysis'
  }
}

/**
 * 保存到专题练习模块
 */
async function saveToPracticeModule(userId, practiceSet) {
  try {
    // 这里应该调用专题练习模块的API
    console.log(`📚 保存专题练习到练习模块: userId=${userId}, practiceId=${practiceSet.id}`)
    
    // 模拟保存到本地存储
    if (!global.practiceStorage) {
      global.practiceStorage = new Map()
    }
    
    const key = `${userId}_${practiceSet.id}`
    global.practiceStorage.set(key, {
      userId,
      practiceSet,
      savedAt: new Date().toISOString()
    })
    
    console.log(`✅ 专题练习已保存: ${key}`)
    return true
  } catch (error) {
    console.error('❌ 保存专题练习失败:', error)
    return false
  }
}

/**
 * 同步到后台题库
 */
async function syncToQuestionBank(practiceSet) {
  try {
    // 这里应该调用后台题库API
    console.log(`📊 同步到后台题库: ${practiceSet.questions.length}道题`)
    
    // 模拟同步到全局题库
    if (!global.questionBank) {
      global.questionBank = []
    }
    
    practiceSet.questions.forEach(question => {
      global.questionBank.push({
        ...question,
        practiceSetId: practiceSet.id,
        addedAt: new Date().toISOString()
      })
    })
    
    console.log(`✅ ${practiceSet.questions.length}道题已同步到题库`)
    return true
  } catch (error) {
    console.error('❌ 同步到题库失败:', error)
    return false
  }
}

/**
 * 获取学习记录（供学习报告使用）- 🔧 修改为数据库查询
 */
async function getLearningRecordsByPlan(planId) {
  try {
    const records = await LearningRecord.getByPlan(planId, { sortDesc: false })
    
    // 转换为兼容格式
    return records.map(record => ({
      id: record.recordId,
      userId: record.userId,
      planId: record.planId,
      question: record.question,
      studentInput: record.studentInput,
      firstAnswer: record.firstAnswer,
      finalAnswer: record.finalAnswer,
      isCorrect: record.isCorrect,
      aiResponse: record.aiResponse,
      subject: record.subject,
      grade: record.grade,
      studentAnswer: record.answerVerification?.studentAnswer,
      correctAnswer: record.answerVerification?.correctAnswer,
      sessionId: record.learningContext?.sessionId,
      timestamp: record.createdAt,
      responseTime: record.timestamps?.duration || 0
    }))
  } catch (error) {
    console.error('❌ 获取学习记录失败:', error)
    return []
  }
}

/**
 * 获取会话总结（供学习报告使用）
 */
function getSessionSummary(userId, planId, sessionId) {
  const key = `${userId}_${planId}_${sessionId}`
  return sessionSummaries.get(key)
}

/**
 * 🎓 多学科支持API
 * GET /api/ai-chat/subjects
 */
router.get('/subjects', async (req, res) => {
  try {
    const { grade } = req.query
    
    console.log('🎓 获取学科配置信息')
    
    // 获取所有学科配置
    const subjects = Object.keys(SUBJECTS_CONFIG).map(key => {
      const config = SUBJECTS_CONFIG[key]
      
      // 检查年级是否支持该学科
      const isSupported = !grade || config.grades.includes(parseInt(grade))
      
      return {
        key,
        ...config,
        isSupported,
        totalGrades: config.grades.length,
        errorTypes: config.commonErrors.length,
        skillCount: config.skillTypes.length
      }
    })
    
    // 按支持的年级排序
    const sortedSubjects = subjects.sort((a, b) => {
      if (grade) {
        // 如果指定了年级，优先显示支持的学科
        if (a.isSupported && !b.isSupported) return -1
        if (!a.isSupported && b.isSupported) return 1
      }
      return a.name.localeCompare(b.name)
    })
    
    res.json({
      success: true,
      data: {
        subjects: sortedSubjects,
        total: subjects.length,
        supportedCount: subjects.filter(s => s.isSupported).length,
        gradeFilter: grade ? parseInt(grade) : null
      },
      message: `获取${subjects.length}个学科配置成功`
    })
    
  } catch (error) {
    console.error('❌ 获取学科配置失败:', error)
    res.status(500).json({
      success: false,
      message: '获取学科配置失败',
      error: error.message
    })
  }
})

/**
 * 🎯 获取学科弱点分析 - 🔧 修改为数据库查询
 * GET /api/ai-chat/weaknesses/:subject
 */
router.get('/weaknesses/:subject', async (req, res) => {
  try {
    const { subject } = req.params
    const { grade, userId } = req.query
    
    console.log(`🎯 分析${subject}学科弱点: userId=${userId}, grade=${grade}`)
    
    const subjectConfig = getSubjectConfig(subject)
    
    // 获取用户的学习记录 - 🔧 修改为数据库查询
    let userRecords = []
    if (userId) {
      const dbRecords = await LearningRecord.find({ 
        userId: userId, 
        subject: subject 
      }).sort({ createdAt: -1 }).lean()
      
      // 转换为兼容格式
      userRecords = dbRecords.map(record => ({
        userId: record.userId,
        planId: record.planId,
        question: record.question,
        studentInput: record.studentInput,
        isCorrect: record.isCorrect,
        subject: record.subject,
        grade: record.grade,
        studentAnswer: record.answerVerification?.studentAnswer,
        correctAnswer: record.answerVerification?.correctAnswer,
        timestamp: record.createdAt
      }))
    }
    
    // 分析弱点
    const weaknessAnalysis = userRecords.length > 0 
      ? await analyzeStudentWeaknesses(userRecords, subject, parseInt(grade) || 1)
      : []
    
    // 获取该学科的常见错误类型
    const commonErrors = subjectConfig.commonErrors.map(errorType => ({
      type: errorType,
      description: getWeaknessDescription(errorType),
      recommendation: getPracticeRecommendation(errorType, subject, parseInt(grade) || 1),
      frequency: weaknessAnalysis.find(w => w.type === errorType)?.frequency || 0
    }))
    
    res.json({
      success: true,
      data: {
        subject: subjectConfig,
        weaknessAnalysis,
        commonErrors,
        userStats: {
          totalRecords: userRecords.length,
          recentRecords: userRecords.slice(-5),
          hasData: userRecords.length > 0
        }
      },
      message: `${subjectConfig.name}学科弱点分析完成`
    })
    
  } catch (error) {
    console.error('❌ 学科弱点分析失败:', error)
    res.status(500).json({
      success: false,
      message: '学科弱点分析失败',
      error: error.message
    })
  }
})

/**
 * 🧪 测试端点：检查学习记录 - 🔧 修改为数据库查询
 * GET /api/ai-chat/debug-records
 */
router.get('/debug-records', async (req, res) => {
  try {
    const { planId } = req.query
    
    console.log('🧪 调试：检查学习记录')
    
    // 获取数据库中的记录总数
    const totalRecords = await LearningRecord.countDocuments()
    console.log('📊 全局记录总数:', totalRecords)
    console.log('🔍 会话总结数量:', sessionSummaries.size)
    
    if (planId) {
      const records = await getLearningRecordsByPlan(planId)
      console.log(`📝 计划${planId}的记录数:`, records.length)
      
      res.json({
        success: true,
        data: {
          totalRecords,
          planRecords: records.length,
          sessionSummaries: sessionSummaries.size,
          records: records.map(r => ({
            id: r.id,
            userId: r.userId,
            planId: r.planId,
            question: r.question?.substring(0, 50) + '...',
            studentInput: r.studentInput,
            isComplete: r.isComplete,
            timestamp: r.timestamp,
            sessionId: r.sessionId
          })),
          recentRecords: records.slice(-5).map(r => ({
            planId: r.planId,
            userId: r.userId,
            question: r.question?.substring(0, 30) + '...',
            timestamp: r.timestamp,
            isCorrect: r.isCorrect,  // 🔧 添加答案验证结果
            studentAnswer: r.studentAnswer,
            correctAnswer: r.correctAnswer
          }))
        }
      })
    } else {
      // 获取最近的记录
      const recentRecords = await LearningRecord.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
      
      const formattedRecords = recentRecords.map(record => ({
        id: record.recordId,
        userId: record.userId,
        planId: record.planId,
        question: record.question?.substring(0, 50) + '...',
        studentInput: record.studentInput,
        timestamp: record.createdAt,
        isCorrect: record.isCorrect,  // 🔧 添加答案验证结果
        studentAnswer: record.answerVerification?.studentAnswer,
        correctAnswer: record.answerVerification?.correctAnswer,
        answerVerification: record.answerVerification
      }))
      
      res.json({
        success: true,
        data: {
          totalRecords,
          sessionSummaries: sessionSummaries.size,
          recentRecords: formattedRecords
        }
      })
    }
    
  } catch (error) {
    console.error('❌ 调试记录检查失败:', error)
    res.status(500).json({
      success: false,
      message: '调试记录检查失败',
      error: error.message
    })
  }
})

/**
 * 🎯 任务2：专题练习生成API
 * POST /api/ai-chat/generate-practice
 */
router.post('/generate-practice', createValidationMiddleware('practice'), async (req, res) => {
  try {
    const { userId, planId, targetWeakness, subject, grade, practiceCount = 5 } = req.body
    
    console.log('🎯 生成定制化专题练习:', { userId, planId, targetWeakness, subject, grade })
    
    // 参数验证
    if (!userId || !subject || !grade) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：userId, subject, grade'
      })
    }
    
    let weaknessToTarget = null
    
    // 如果指定了特定弱点，直接生成
    if (targetWeakness) {
      weaknessToTarget = {
        type: targetWeakness,
        frequency: 3,
        severity: 'high',
        description: getWeaknessDescription(targetWeakness),
        practiceRecommendation: getPracticeRecommendation(targetWeakness, subject, grade)
      }
    } else {
      // 否则分析用户的学习记录找出弱点 - 🔧 修改为数据库查询
      const dbRecords = await LearningRecord.find({ userId: userId }).sort({ createdAt: -1 }).lean()
      
      // 转换为兼容格式
      const userRecords = dbRecords.map(record => ({
        userId: record.userId,
        planId: record.planId,
        question: record.question,
        studentInput: record.studentInput,
        isCorrect: record.isCorrect,
        subject: record.subject,
        grade: record.grade,
        studentAnswer: record.answerVerification?.studentAnswer,
        correctAnswer: record.answerVerification?.correctAnswer,
        timestamp: record.createdAt
      }))
      
      if (userRecords.length > 0) {
        const weaknessAnalysis = await analyzeStudentWeaknesses(userRecords, subject, grade)
        weaknessToTarget = weaknessAnalysis.length > 0 ? weaknessAnalysis[0] : null
      }
    }
    
    // 如果没有找到弱点，生成通用练习
    if (!weaknessToTarget) {
      weaknessToTarget = {
        type: '基础概念',
        frequency: 1,
        severity: 'medium',
        description: `${grade}年级${subject}基础概念练习`,
        practiceRecommendation: `${grade}年级${subject}基础强化训练`
      }
    }
    
    // 生成练习题集
    const practiceSet = await generatePracticeQuestions(weaknessToTarget, subject, grade, userId)
    
    // 🔥 使用AI增强练习题生成
    const aiEnhancedPractice = await enhancePracticeWithAI(practiceSet, targetWeakness, subject, grade, userId)
    
    // 保存到练习系统
    await saveToPracticeModule(userId, aiEnhancedPractice)
    
    console.log(`✅ 专题练习生成成功: ${aiEnhancedPractice.questions.length}道题`)
    
    // 同步到后台题库
    await syncToQuestionBank(aiEnhancedPractice)
    
    res.json({
      success: true,
      data: {
        practiceId: aiEnhancedPractice.id,
        userId,
        weaknessType: weaknessToTarget.type,
        subject,
        grade,
        practiceCount: aiEnhancedPractice.questions.length,
        questions: aiEnhancedPractice.questions,
        analysis: {
          targetWeakness: weaknessToTarget,
          aiRecommendations: aiEnhancedPractice.aiRecommendations,
          estimatedTime: `${aiEnhancedPractice.questions.length * 2}-${aiEnhancedPractice.questions.length * 3}分钟`,
          difficulty: aiEnhancedPractice.difficulty
        },
        createdAt: aiEnhancedPractice.createdAt,
        source: 'ai_analysis'
      },
      message: `为"${weaknessToTarget.type}"生成${aiEnhancedPractice.questions.length}道专题练习`
    })
    
  } catch (error) {
    console.error('❌ 专题练习生成失败:', error)
    res.status(500).json({
      success: false,
      message: '专题练习生成失败，请稍后重试',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * 🔥 使用AI增强练习题生成
 */
async function enhancePracticeWithAI(practiceSet, targetWeakness, subject, grade, userId) {
  try {
    console.log('🤖 AI增强练习题生成中...')
    
    // 🎯 构建多学科AI提示词
    const subjectConfig = getSubjectConfig(subject)
    const prompt = buildSubjectSpecificPrompt(subject, practiceSet.weaknessType, grade, subjectConfig)
    
    function buildSubjectSpecificPrompt(subject, weaknessType, grade, config) {
      const baseInfo = `请为${grade}年级学生生成5道针对"${weaknessType}"的${config.name}练习题。

学生弱点分析：
- 类型：${weaknessType}
- 年级：${grade}年级  
- 学科：${config.name} ${config.icon}
- 学科特点：${config.description}`

      let specificRequirements = ''
      let exampleFormat = ''
      
      if (subject === 'math') {
        specificRequirements = `
数学学科要求：
1. 题目难度适合${grade}年级学生的计算能力
2. 针对"${weaknessType}"进行强化训练
3. 包含应用题、计算题等不同题型
4. 答案要准确，步骤要清晰
5. 用生活实例帮助理解`
        
        exampleFormat = `{
  "questions": [
    {
      "text": "小明有3个苹果，又买了2个，一共有多少个？",
      "answer": "5", 
      "explanation": "3+2=5，把两部分合在一起就是加法",
      "type": "应用题",
      "difficulty": "easy"
    }
  ],
  "recommendations": ["多练习简单的加法题", "用手指或实物帮助理解加法"],
  "difficulty": "easy"
}`
        
      } else if (subject === 'chinese') {
        specificRequirements = `
语文学科要求：
1. 题目语言简单易懂，适合${grade}年级阅读水平
2. 针对"${weaknessType}"设计专项练习
3. 包含拼音、汉字、词汇、阅读等题型
4. 注重语言文字的实际运用
5. 培养语感和表达能力`
        
        exampleFormat = `{
  "questions": [
    {
      "text": "请写出'小朋友'的拼音",
      "answer": "xiǎo péng yǒu", 
      "explanation": "要注意声调，'小'是三声，'朋'是二声，'友'是三声",
      "type": "拼音练习",
      "difficulty": "easy"
    }
  ],
  "recommendations": ["多练习拼音拼读", "可以用拼音卡片辅助学习"],
  "difficulty": "easy"
}`
        
      } else if (subject === 'english') {
        specificRequirements = `
英语学科要求：
1. 题目适合${grade}年级英语启蒙水平
2. 针对"${weaknessType}"进行专项训练
3. 包含字母、单词、简单句型等内容
4. 注重听说读写基础技能
5. 保持学习英语的兴趣和信心`
        
        exampleFormat = `{
  "questions": [
    {
      "text": "'苹果'用英语怎么说？",
      "answer": "apple", 
      "explanation": "apple读作/ˈæpl/，是我们常见的水果单词",
      "type": "单词学习",
      "difficulty": "easy"
    }
  ],
  "recommendations": ["多听英语单词发音", "可以用图片帮助记忆单词"],
  "difficulty": "easy"
}`
        
      } else if (subject === 'science') {
        specificRequirements = `
科学学科要求：
1. 题目贴近${grade}年级学生的生活经验
2. 针对"${weaknessType}"培养科学思维
3. 包含观察、实验、思考等科学方法
4. 鼓励提问和探索精神
5. 用简单语言解释科学现象`
        
        exampleFormat = `{
  "questions": [
    {
      "text": "观察一个苹果，说出它有哪些特征？",
      "answer": "苹果是圆形的，红色或绿色，摸起来光滑，有甜味", 
      "explanation": "观察要用眼睛看、手摸、鼻子闻，从不同角度了解物体",
      "type": "观察练习",
      "difficulty": "easy"
    }
  ],
  "recommendations": ["多观察身边的事物", "培养好奇心，多问为什么"],
  "difficulty": "easy"
}`
      }
      
      return `${baseInfo}

${specificRequirements}

请按照以下JSON格式返回：
${exampleFormat}`
    }
    
    // 使用快速模型生成
    const modelConfig = CHAT_MODELS.STANDARD
    const aiResponse = await callChatModel(prompt, modelConfig)
    
    // 解析AI响应
    let aiData = null
    try {
      // 尝试提取JSON
      const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        aiData = JSON.parse(jsonMatch[0])
      }
    } catch (parseError) {
      console.warn('⚠️ AI响应解析失败，使用默认题目')
    }
    
    // 如果AI生成成功，使用AI题目；否则使用默认题目
    if (aiData && aiData.questions && aiData.questions.length > 0) {
      console.log(`✅ AI生成${aiData.questions.length}道练习题`)
      
      return {
        ...practiceSet,
        userId,
        questions: aiData.questions.map((q, index) => ({
          id: `ai_practice_${Date.now()}_${index}`,
          text: q.text,
          answer: q.answer,
          explanation: q.explanation || '请仔细思考解题步骤',
          type: q.type || practiceSet.weaknessType,
          difficulty: q.difficulty || (grade <= 2 ? 'easy' : 'medium'),
          subject,
          grade,
          source: 'ai_generated'
        })),
        aiRecommendations: aiData.recommendations || [
          '多练习类似题目，加强理解',
          '遇到困难及时询问老师或家长'
        ],
        difficulty: aiData.difficulty || 'medium',
        enhancedByAI: true
      }
    } else {
      console.log('⚠️ AI生成失败，使用模板题目')
      return {
        ...practiceSet,
        userId,
        aiRecommendations: [
          `加强${practiceSet.weaknessType}的练习`,
          '多做类似题目提高熟练度',
          '遇到问题及时寻求帮助'
        ],
        difficulty: grade <= 2 ? 'easy' : 'medium',
        enhancedByAI: false
      }
    }
    
  } catch (error) {
    console.error('❌ AI增强练习题生成失败:', error)
    
    // 返回基础练习题
    return {
      ...practiceSet,
      userId,
      aiRecommendations: [
        '多练习基础题目',
        '循序渐进提高能力'
      ],
      difficulty: 'medium',
      enhancedByAI: false
    }
  }
}

/**
 * 评估问题难度
 * @param {string} question 问题内容
 * @param {string} subject 学科
 * @param {number} grade 年级
 * @returns {string} 难度等级 (easy, medium, hard)
 */
function assessQuestionDifficulty(question, subject, grade) {
  // 简单的难度评估逻辑
  const questionLength = question.length
  const complexWords = ['为什么', '如何', '分析', '解释', '证明', '推导', '计算', '比较', '判断']
  const hasComplexWords = complexWords.some(word => question.includes(word))
  
  if (grade <= 2) {
    return hasComplexWords ? 'medium' : 'easy'
  } else if (grade <= 4) {
    return hasComplexWords ? 'hard' : (questionLength > 50 ? 'medium' : 'easy')
  } else {
    return hasComplexWords && questionLength > 100 ? 'hard' : 
           (hasComplexWords || questionLength > 50 ? 'medium' : 'easy')
  }
}

/**
 * 评估学生答案正确性
 * @param {string} studentAnswer 学生答案
 * @param {string} question 问题
 * @param {string} subject 学科
 * @returns {boolean} 是否答对
 */
function evaluateStudentAnswer(studentAnswer, question, subject) {
  // 简化的答案评估逻辑
  const positiveIndicators = ['对', '是', '正确', '好', '对的', '没错', '明白', '会了', '懂了']
  const negativeIndicators = ['不知道', '不会', '错', '不对', '不懂', '不明白', '难', '帮我']
  
  const answer = studentAnswer.toLowerCase()
  
  const hasPositive = positiveIndicators.some(word => answer.includes(word))
  const hasNegative = negativeIndicators.some(word => answer.includes(word))
  
  // 如果包含数字或数学表达式，认为是尝试回答
  const hasNumbers = /\d/.test(answer)
  const hasMathExpression = /[+\-*/=]/.test(answer)
  
  if (hasNegative) return false
  if (hasPositive) return true
  if (hasNumbers || hasMathExpression) return true
  
  // 针对不同学科的评估逻辑
  if (subject === 'chinese') {
    // 语文答案可能包含汉字、拼音等
    const hasChineseChars = /[\u4e00-\u9fa5]/.test(answer)
    const hasPinyin = /[aeiouāáǎàēéěèīíǐìōóǒòūúǔùüǖǘǚǜ]/.test(answer)
    return hasChineseChars || hasPinyin
  } else if (subject === 'english') {
    // 英语答案可能包含英文字母
    const hasEnglish = /[a-zA-Z]/.test(answer)
    return hasEnglish && answer.length > 1
  }
  
  // 默认认为有内容的回答是正向的
  return answer.trim().length > 3
}

/**
 * 🔧 智能答案提取和意图识别
 * 根据学科类型识别不同的答案表达方式：
 * 数学: "老师12对不对", "我觉得是15", 纯数字答案
 * 语文: "是苹果", "这个字读作...", 中文词语
 * 英语: "apple", "是a还是an", 英文单词
 * 科学: "是液体", "因为...", 概念性答案
 */
function intelligentAnswerExtraction(studentInput, subject = 'math') {
  if (!studentInput || typeof studentInput !== 'string') {
    return {
      hasAnswer: false,
      extractedAnswers: [],
      primaryAnswer: null,
      confidenceLevel: 'none',
      intentType: 'unknown',
      answerType: 'unknown'
    }
  }
  
  const input = studentInput.trim()
  
  // 根据学科类型进行不同的答案检测
  if (subject === 'math') {
    return extractMathAnswer(input)
  } else if (subject === 'chinese') {
    return extractChineseAnswer(input)
  } else if (subject === 'english') {
    return extractEnglishAnswer(input)
  } else if (subject === 'science') {
    return extractScienceAnswer(input)
  } else {
    // 默认使用数学检测逻辑
    return extractMathAnswer(input)
  }
}

/**
 * 🔧 数学答案检测（保持原有逻辑）
 */
function extractMathAnswer(input) {
  // 1. 提取所有数字（包括小数、分数、中文数字）
  const numberPatterns = [
    /(\d+\.?\d*)/g,  // 阿拉伯数字和小数
    /(\d+\/\d+)/g,   // 分数
    /([零一二三四五六七八九十]{1,3})/g  // 中文数字（支持复合）
  ]
  
  let allNumbers = []
  numberPatterns.forEach(pattern => {
    const matches = input.match(pattern)
    if (matches) {
      allNumbers.push(...matches)
    }
  })
  
  // 2. 识别答案表达意图（支持阿拉伯数字和中文数字）
  const intentPatterns = {
    answer_confirmation: [
      /(?:老师|teacher).*?(\d+\.?\d*|[零一二三四五六七八九十]{1,3}).*?(?:对不对|对吗|是吗|正确吗)/i,
      /(?:我觉得|我认为|我想).*?(?:是|答案是).*?(\d+\.?\d*|[零一二三四五六七八九十]{1,3})/i,
      /(?:答案|结果).*?(?:是|应该是|可能是).*?(\d+\.?\d*|[零一二三四五六七八九十]{1,3})/i,
      /(?:会不会|是不是|应该是).*?(\d+\.?\d*|[零一二三四五六七八九十]{1,3})/i,
      /(\d+\.?\d*|[零一二三四五六七八九十]{1,3}).*?(?:对不对|对吗|是吗|正确吗)/i,
      /(\d+\.?\d*|[零一二三四五六七八九十]{1,3}).*?(?:吧|呢|啊|吗)/i
    ],
    direct_answer: [
      /^(\d+\.?\d*|[零一二三四五六七八九十]{1,3})$/,  // 纯数字（阿拉伯或中文）
      /(?:等于|=).*?(\d+\.?\d*|[零一二三四五六七八九十]{1,3})/i,
      /(\d+\.?\d*|[零一二三四五六七八九十]{1,3})(?:$|[。！!])/  // 数字结尾
    ],
    calculation_attempt: [
      /(\d+\.?\d*|[零一二三四五六七八九十]{1,3}).*?(?:\+|\-|\*|×|÷|\/)/,
      /(?:\+|\-|\*|×|÷|\/).*?(\d+\.?\d*|[零一二三四五六七八九十]{1,3})/
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
        console.log(`🎯 意图匹配: ${intent}, 模式: ${pattern}, 匹配到: "${numberMatch}"`)
        
        // 检查是否包含数字或中文数字
        if (numberMatch && (/\d/.test(numberMatch) || /[零一二三四五六七八九十]/.test(numberMatch))) {
          primaryAnswer = convertToNumber(numberMatch)
          console.log(`🔢 数字转换: "${numberMatch}" -> ${primaryAnswer}`)
          
          if (primaryAnswer !== null) {
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
    hasAnswer: primaryAnswer !== null,
    extractedAnswers: allNumbers.map(convertToNumber).filter(n => n !== null),
    primaryAnswer,
    confidenceLevel,
    intentType,
    answerType: 'number',
    originalInput: input
  }
}

/**
 * 🔧 语文答案检测
 */
function extractChineseAnswer(input) {
  const chinesePatterns = {
    answer_confirmation: [
      /(?:老师|是不是).*?([是否]|[\u4e00-\u9fa5]{1,10}).*?(?:对不对|对吗|是吗|正确吗)/i,
      /(?:我觉得|我认为|我想).*?(?:是|答案是).*?([\u4e00-\u9fa5]{1,20})/i,
      /(?:答案|结果).*?(?:是|应该是).*?([\u4e00-\u9fa5]{1,20})/i,
      /([\u4e00-\u9fa5]{1,20}).*?(?:对不对|对吗|是吗|正确吗)/i
    ],
    direct_answer: [
      /^([\u4e00-\u9fa5]{1,20})$/,  // 纯中文
      /(?:是|读作).*?([\u4e00-\u9fa5]{1,20})/i,
      /([\u4e00-\u9fa5]{1,20})(?:[。！!]|$)/  // 中文结尾
    ],
    pinyin_answer: [
      /([a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùüǖǘǚǜ]+)/g  // 拼音
    ]
  }
  
  let primaryAnswer = null
  let intentType = 'unclear'
  let confidenceLevel = 'low'
  let answerType = 'chinese'
  
  // 检测中文答案
  for (const [intent, patterns] of Object.entries(chinesePatterns)) {
    for (const pattern of patterns) {
      const match = input.match(pattern)
      if (match) {
        const answerMatch = match[1]
        if (answerMatch && answerMatch.length > 0) {
          primaryAnswer = answerMatch.trim()
          intentType = intent
          
          if (intent === 'pinyin_answer') {
            answerType = 'pinyin'
            confidenceLevel = 'medium'
          } else if (intent === 'answer_confirmation') {
            confidenceLevel = 'high'
          } else {
            confidenceLevel = 'medium'
          }
          
          break
        }
      }
    }
    if (primaryAnswer !== null) break
  }
  
  // 如果没找到明确答案，检查是否包含中文字符
  if (primaryAnswer === null) {
    const chineseChars = input.match(/[\u4e00-\u9fa5]+/g)
    if (chineseChars && chineseChars.length > 0) {
      primaryAnswer = chineseChars[0]
      intentType = 'chinese_mentioned'
      confidenceLevel = 'low'
    }
  }
  
  return {
    hasAnswer: primaryAnswer !== null,
    extractedAnswers: [primaryAnswer].filter(a => a !== null),
    primaryAnswer,
    confidenceLevel,
    intentType,
    answerType,
    originalInput: input
  }
}

/**
 * 🔧 英语答案检测
 */
function extractEnglishAnswer(input) {
  const englishPatterns = {
    answer_confirmation: [
      /(?:老师|是不是|is it).*?([a-zA-Z]+).*?(?:对不对|对吗|是吗|correct)/i,
      /(?:我觉得|我认为|I think).*?(?:是|is|答案是).*?([a-zA-Z]+)/i,
      /(?:答案|answer).*?(?:是|is).*?([a-zA-Z]+)/i,
      /([a-zA-Z]+).*?(?:对不对|对吗|是吗|correct)/i
    ],
    direct_answer: [
      /^([a-zA-Z]+)$/,  // 纯英文单词
      /(?:is|读作|means).*?([a-zA-Z]+)/i,
      /([a-zA-Z]+)(?:[。！!]|$)/  // 英文结尾
    ],
    spelling_answer: [
      /([a-zA-Z]+-[a-zA-Z]+)/,  // 连字符单词
      /([A-Z]{2,})/,  // 全大写缩写
    ]
  }
  
  let primaryAnswer = null
  let intentType = 'unclear'
  let confidenceLevel = 'low'
  let answerType = 'english'
  
  // 检测英语答案
  for (const [intent, patterns] of Object.entries(englishPatterns)) {
    for (const pattern of patterns) {
      const match = input.match(pattern)
      if (match) {
        const answerMatch = match[1]
        if (answerMatch && answerMatch.length > 0) {
          primaryAnswer = answerMatch.toLowerCase().trim()
          intentType = intent
          
          if (intent === 'answer_confirmation') {
            confidenceLevel = 'high'
          } else {
            confidenceLevel = 'medium'
          }
          
          break
        }
      }
    }
    if (primaryAnswer !== null) break
  }
  
  // 如果没找到明确答案，检查是否包含英文字母
  if (primaryAnswer === null) {
    const englishWords = input.match(/[a-zA-Z]+/g)
    if (englishWords && englishWords.length > 0) {
      // 过滤掉常见的中文拼音和无意义单词
      const meaningfulWords = englishWords.filter(word => 
        word.length > 1 && 
        !['wo', 'de', 'shi', 'ni', 'ta', 'zhe', 'na', 'le', 'ma'].includes(word.toLowerCase())
      )
      if (meaningfulWords.length > 0) {
        primaryAnswer = meaningfulWords[0].toLowerCase()
        intentType = 'english_mentioned'
        confidenceLevel = 'low'
      }
    }
  }
  
  return {
    hasAnswer: primaryAnswer !== null,
    extractedAnswers: [primaryAnswer].filter(a => a !== null),
    primaryAnswer,
    confidenceLevel,
    intentType,
    answerType,
    originalInput: input
  }
}

/**
 * 🔧 科学答案检测
 */
function extractScienceAnswer(input) {
  const sciencePatterns = {
    answer_confirmation: [
      /(?:老师|是不是).*?(液体|固体|气体|植物|动物|金属|非金属).*?(?:对不对|对吗|是吗)/i,
      /(?:我觉得|我认为).*?(?:是|答案是).*?(因为|由于|所以)(.*?)$/i,
      /(?:会|能|可以|不会|不能|不可以).*?(?:对不对|对吗|是吗)/i,
      /(是|不是|会|不会|能|不能|可以|不可以).*?(?:对不对|对吗|是吗)/i
    ],
    direct_answer: [
      /^(液体|固体|气体|植物|动物|金属|非金属|酸性|碱性|中性)$/,
      /^(是|不是|会|不会|能|不能|可以|不可以)$/,
      /(?:因为|由于|所以)(.*?)$/i,
      /(.*?)(?:所以|因此|导致)/i
    ],
    explanation_answer: [
      /因为(.*?)$/i,
      /由于(.*?)$/i,
      /这是因为(.*?)$/i
    ]
  }
  
  let primaryAnswer = null
  let intentType = 'unclear'
  let confidenceLevel = 'low'
  let answerType = 'science'
  
  // 检测科学答案
  for (const [intent, patterns] of Object.entries(sciencePatterns)) {
    for (const pattern of patterns) {
      const match = input.match(pattern)
      if (match) {
        const answerMatch = match[1] || match[0]
        if (answerMatch && answerMatch.length > 0) {
          primaryAnswer = answerMatch.trim()
          intentType = intent
          
          if (intent === 'explanation_answer') {
            answerType = 'explanation'
            confidenceLevel = 'high'
          } else if (intent === 'answer_confirmation') {
            confidenceLevel = 'high'
          } else {
            confidenceLevel = 'medium'
          }
          
          break
        }
      }
    }
    if (primaryAnswer !== null) break
  }
  
  // 如果没找到明确答案，检查是否包含科学关键词
  if (primaryAnswer === null) {
    const scienceKeywords = ['液体', '固体', '气体', '植物', '动物', '金属', '非金属', 
                           '酸性', '碱性', '中性', '化学', '物理', '生物', '实验']
    const foundKeyword = scienceKeywords.find(keyword => input.includes(keyword))
    if (foundKeyword) {
      primaryAnswer = foundKeyword
      intentType = 'science_mentioned'
      confidenceLevel = 'low'
    } else if (input.length > 5) {
      // 如果输入较长，可能是解释性回答
      primaryAnswer = input
      intentType = 'general_response'
      answerType = 'explanation'
      confidenceLevel = 'low'
    }
  }
  
  return {
    hasAnswer: primaryAnswer !== null,
    extractedAnswers: [primaryAnswer].filter(a => a !== null),
    primaryAnswer,
    confidenceLevel,
    intentType,
    answerType,
    originalInput: input
  }
}

/**
 * 🔧 辅助函数：转换各种数字格式为数值
 */
function convertToNumber(str) {
  if (!str) return null
  
  // 处理中文数字
  const result = convertChineseNumber(str)
  if (result !== null) {
    return result
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

/**
 * 🔧 中文数字转换函数
 * 支持一到九十九的中文数字转换
 */
function convertChineseNumber(str) {
  if (!str) return null
  
  const chineseDigits = {
    '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
  }
  
  // 直接匹配单字数字
  if (chineseDigits.hasOwnProperty(str)) {
    return chineseDigits[str]
  }
  
  // 处理复合中文数字（十一到九十九）
  if (str.includes('十')) {
    // 十一, 十二, ..., 十九
    if (str.length === 2 && str.startsWith('十')) {
      const unit = str.charAt(1)
      if (chineseDigits.hasOwnProperty(unit) && chineseDigits[unit] > 0) {
        return 10 + chineseDigits[unit]
      }
    }
    
    // 二十, 三十, ..., 九十
    if (str.length === 2 && str.endsWith('十')) {
      const tens = str.charAt(0)
      if (chineseDigits.hasOwnProperty(tens) && chineseDigits[tens] > 1) {
        return chineseDigits[tens] * 10
      }
    }
    
    // 二十一, 二十二, ..., 九十九
    if (str.length === 3 && str.charAt(1) === '十') {
      const tens = str.charAt(0)
      const unit = str.charAt(2)
      if (chineseDigits.hasOwnProperty(tens) && chineseDigits.hasOwnProperty(unit) && 
          chineseDigits[tens] > 1 && chineseDigits[unit] > 0) {
        return chineseDigits[tens] * 10 + chineseDigits[unit]
      }
    }
  }
  
  return null
}

/**
 * 🔧 增强答案验证功能 - 支持多学科
 */
async function verifyStudentAnswer(question, studentInput, subject = 'math', grade = 1, answerDetection = null) {
  try {
    // 🔧 使用智能检测结果
    let studentAnswer = null
    
    if (answerDetection && answerDetection.primaryAnswer !== null) {
      studentAnswer = answerDetection.primaryAnswer
    } else {
      return { isCorrect: false, reason: 'no_answer_provided' }
    }
    
    // 根据学科使用不同的验证策略
    if (subject === 'math') {
      return verifyMathAnswer(question, studentAnswer, grade)
    } else if (subject === 'chinese') {
      return await verifyChineseAnswer(question, studentAnswer, grade)
    } else if (subject === 'english') {
      return await verifyEnglishAnswer(question, studentAnswer, grade)
    } else if (subject === 'science') {
      return await verifyScienceAnswer(question, studentAnswer, grade)
    } else {
      // 默认使用AI验证
      return await verifyWithAI(question, studentAnswer, subject, grade)
    }
    
  } catch (error) {
    console.error('❌ 答案验证失败:', error)
    return { isCorrect: false, reason: 'verification_failed' }
  }
}

/**
 * 🔧 数学答案验证 - 精确计算
 */
function verifyMathAnswer(question, studentAnswer, grade) {
  // 对于数学题，尝试精确计算
  const correctAnswer = calculateMathAnswer(question)
  if (correctAnswer !== null) {
    const isCorrect = Math.abs(studentAnswer - correctAnswer) < 0.01
    return {
      isCorrect,
      studentAnswer,
      correctAnswer,
      reason: isCorrect ? 'correct_calculation' : 'wrong_calculation',
      subject: 'math'
    }
  }
  
  // 如果无法计算，返回未知
  return {
    isCorrect: false,
    studentAnswer,
    reason: 'calculation_failed',
    subject: 'math'
  }
}

/**
 * 🔧 语文答案验证 - AI智能判断
 */
async function verifyChineseAnswer(question, studentAnswer, grade) {
  try {
    const prompt = `请判断这道${grade}年级语文题的答案是否正确：

题目：${question}
学生答案：${studentAnswer}

请简短回答：
1. 正确/错误
2. 简要说明理由（30字以内）

格式：正确，理由...
或：错误，理由...`

    const aiResponse = await callChatModel(prompt, { model: 'qwen-turbo', maxTokens: 150 })
    const result = parseAnswerCheckResult(aiResponse.content, studentAnswer)
    
    return {
      isCorrect: result.isCorrect,
      studentAnswer,
      aiExplanation: result.explanation,
      reason: 'ai_verified',
      subject: 'chinese'
    }
  } catch (error) {
    console.error('❌ 语文答案验证失败:', error)
    return { isCorrect: false, reason: 'verification_failed', subject: 'chinese' }
  }
}

/**
 * 🔧 英语答案验证 - AI智能判断
 */
async function verifyEnglishAnswer(question, studentAnswer, grade) {
  try {
    const prompt = `Please check if this Grade ${grade} English answer is correct:

Question: ${question}
Student Answer: ${studentAnswer}

Please respond briefly:
1. Correct/Incorrect
2. Brief explanation (within 30 words)

Format: Correct, because...
Or: Incorrect, because...`

    const aiResponse = await callChatModel(prompt, { model: 'qwen-turbo', maxTokens: 150 })
    const result = parseAnswerCheckResult(aiResponse.content, studentAnswer)
    
    return {
      isCorrect: result.isCorrect,
      studentAnswer,
      aiExplanation: result.explanation,
      reason: 'ai_verified',
      subject: 'english'
    }
  } catch (error) {
    console.error('❌ 英语答案验证失败:', error)
    return { isCorrect: false, reason: 'verification_failed', subject: 'english' }
  }
}

/**
 * 🔧 科学答案验证 - AI智能判断
 */
async function verifyScienceAnswer(question, studentAnswer, grade) {
  try {
    const prompt = `请判断这道${grade}年级科学题的答案是否正确：

题目：${question}
学生答案：${studentAnswer}

请简短回答：
1. 正确/错误
2. 简要说明理由（50字以内）

格式：正确，理由...
或：错误，理由...`

    const aiResponse = await callChatModel(prompt, { model: 'qwen-turbo', maxTokens: 200 })
    const result = parseAnswerCheckResult(aiResponse.content, studentAnswer)
    
    return {
      isCorrect: result.isCorrect,
      studentAnswer,
      aiExplanation: result.explanation,
      reason: 'ai_verified',
      subject: 'science'
    }
  } catch (error) {
    console.error('❌ 科学答案验证失败:', error)
    return { isCorrect: false, reason: 'verification_failed', subject: 'science' }
  }
}

/**
 * 🔧 通用AI答案验证
 */
async function verifyWithAI(question, studentAnswer, subject, grade) {
  try {
    const prompt = buildAnswerCheckPrompt(question, studentAnswer.toString(), subject, grade)
    const aiResponse = await callChatModel(prompt, { model: 'qwen-turbo', maxTokens: 150 })
    const checkResult = parseAnswerCheckResult(aiResponse.content, studentAnswer.toString())
    
    return {
      isCorrect: checkResult.isCorrect,
      studentAnswer,
      aiExplanation: checkResult.explanation,
      reason: 'ai_verified',
      subject
    }
  } catch (error) {
    console.error('❌ AI答案验证失败:', error)
    return { isCorrect: false, reason: 'verification_failed', subject }
  }
}

/**
 * 🔧 新增：计算数学题的正确答案
 */
function calculateMathAnswer(question) {
  try {
    // 移除中文字符，保留数字和运算符
    const mathExpression = question.replace(/[^\d+\-×÷\*\/\(\)\.\s]/g, '')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .trim()
    
    // 安全地计算表达式
    if (/^[\d+\-*\/\(\)\.\s]+$/.test(mathExpression)) {
      return eval(mathExpression)
    }
    
    return null
  } catch (error) {
    console.error('数学计算失败:', error)
    return null
  }
}

/**
 * 🔧 测试API - 手动添加学习记录 - 🔧 修改为数据库存储
 * @route POST /api/ai-chat/add-manual-record
 */
router.post('/add-manual-record', async (req, res) => {
  try {
    const record = req.body
    
    // 验证必要字段
    if (!record.question || !record.studentInput) {
      return res.status(400).json({
        success: false,
        error: '缺少必要字段: question, studentInput'
      })
    }
    
    // 使用数据库存储
    const savedRecord = await saveLearningRecord({
      userId: record.userId || 'test-user',
      planId: record.planId || 'test-plan',
      question: record.question,
      studentInput: record.studentInput,
      isCorrect: record.isCorrect,
      subject: record.subject || 'math',
      grade: record.grade || 1,
      timestamp: record.timestamp || new Date().toISOString(),
      responseTime: record.responseTime || 0
    })
    
    console.log(`🔧 手动添加学习记录: ${record.question} -> isCorrect: ${record.isCorrect}`)
    
    res.json({
      success: true,
      message: '学习记录已添加到数据库',
      recordId: savedRecord.id,
      data: savedRecord
    })
    
  } catch (error) {
    console.error('❌ 手动添加记录失败:', error)
    res.status(500).json({
      success: false,
      error: '添加记录失败',
      details: error.message
    })
  }
})

// 导出路由和工具函数 - 🔧 移除globalLearningRecords引用
/**
 * 🎯 构建AI欢迎和学习建议提示词 - 根据PRD要求
 */
function buildWelcomeGuidancePrompt(question, subject, grade, studentLevel = 'beginner') {
  const subjectConfig = getSubjectConfig(subject)
  
  const prompt = `你是一位专业的小学${subjectConfig.name}AI老师，现在需要为${grade}年级学生生成个性化的学习建议。

当前题目：${question}
学科：${subjectConfig.name} ${subjectConfig.icon}
年级：${grade}年级
学生水平：${studentLevel}

请按以下格式提供学习建议：

欢迎消息：[一句温暖的欢迎话语，体现${subjectConfig.name}学科特色，20字以内]

学习建议：
1. [第一条学习建议，针对这道题的解题策略，25字以内]
2. [第二条学习建议，关于${subjectConfig.name}学科的学习方法，25字以内]  
3. [第三条学习建议，鼓励和心理建设，25字以内]

题目引导：[对当前题目的具体引导，启发学生思考而不直接给答案，30字以内]

要求：
- 语言要适合${grade}年级学生理解
- 体现${subjectConfig.name}学科的学习特点
- 个性化、具体、实用
- 使用温和鼓励的语气
- 符合AI家教的专业形象
- 严格按照格式输出，方便解析`

  return prompt
}

/**
 * 🔧 解析AI欢迎和学习建议响应
 */
function parseWelcomeGuidance(aiContent, subject) {
  try {
    const lines = aiContent.split('\n').filter(line => line.trim())
    
    let welcomeMessage = ''
    let learningTips = []
    let questionGuidance = ''
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      if (trimmedLine.includes('欢迎消息：') || trimmedLine.includes('欢迎话语：')) {
        welcomeMessage = trimmedLine.split('：')[1]?.trim() || trimmedLine.split(':')[1]?.trim()
      } else if (trimmedLine.match(/^\d+\./)) {
        // 匹配学习建议（1. 2. 3.）
        const tip = trimmedLine.replace(/^\d+\./, '').trim()
        if (tip) learningTips.push(tip)
      } else if (trimmedLine.includes('题目引导：') || trimmedLine.includes('引导：')) {
        questionGuidance = trimmedLine.split('：')[1]?.trim() || trimmedLine.split(':')[1]?.trim()
      }
    }
    
    // 如果解析失败，使用默认值
    if (!welcomeMessage || learningTips.length === 0 || !questionGuidance) {
      console.warn('⚠️ AI响应解析不完整，使用默认建议')
      return getDefaultSubjectGuidance(subject, 3, '')
    }
    
    return {
      welcomeMessage: welcomeMessage || `嗨！我是你的${getSubjectConfig(subject).name}小助手！`,
      learningTips: learningTips.length > 0 ? learningTips : ['认真读题，理解题意', '一步步来思考', '不懂就问老师'],
      questionGuidance: questionGuidance || '让我们来看看这道题，你有什么想法吗？'
    }
    
  } catch (error) {
    console.error('❌ AI建议解析失败:', error)
    return getDefaultSubjectGuidance(subject, 3, '')
  }
}

/**
 * 📚 获取默认的学科特定建议（备用方案）
 */
function getDefaultSubjectGuidance(subject, grade, question) {
  const subjectConfig = getSubjectConfig(subject)
  
  const defaultGuidance = {
    math: {
      welcomeMessage: `嗨！我是你的数学小助手，让我们一起攻克这道题吧！`,
      learningTips: [
        '💡 先读懂题意，找出已知条件和要求什么',
        '🎯 可以试试画图或列式来帮助思考',
        '✨ 我会一步步引导你，不用担心做错！'
      ],
      questionGuidance: '🤔 这道数学题看起来有趣，你能告诉我题目在问什么吗？'
    },
    chinese: {
      welcomeMessage: `你好，小朋友！我是语文老师，一起来探索汉字的奥秘吧！`,
      learningTips: [
        '📖 仔细读题，理解每个字词的意思',
        '💭 联系生活经验，想想类似的情况',
        '🌟 用自己的话说出想法，我会帮你整理'
      ],
      questionGuidance: '📝 这道语文题，你先读一遍，有不认识的字吗？'
    },
    english: {
      welcomeMessage: `Hello! 我是你的英语小伙伴，Let's learn English together!`,
      learningTips: [
        '🔤 先看懂单词，再理解句子意思',
        '🎵 可以读出声来，培养语感',
        '🏆 不要害怕说错，练习是最好的老师！'
      ],
      questionGuidance: '🔤 Look at this English question, 你能读懂吗？'
    },
    science: {
      welcomeMessage: `嗨！我是科学探索者，让我们一起发现科学的奥秘！`,
      learningTips: [
        '🔬 仔细观察题目描述的现象或实验',
        '🤔 想想"为什么会这样？"',
        '⚡ 大胆猜想，我们一起验证想法！'
      ],
      questionGuidance: '🔬 让我们观察这个科学问题，你发现了什么？'
    }
  }
  
  return defaultGuidance[subject] || defaultGuidance.math
}

/**
 * ✅ 新增：基于AI交互记录生成学习建议（第二部分功能）
 * 使用qwen-max分析chat和instant_voice模式的交互记录
 */
async function generateLearningAdviceFromInteractions(userId, planId, subject, grade) {
  try {
    console.log(`🧠 分析AI交互记录生成学习建议: userId=${userId}, planId=${planId}`)
    
    // 🔍 获取所有交互记录（chat和instant_voice模式）
    const interactionRecords = await LearningRecord.find({
      userId: userId,
      planId: planId,
      currentMode: { $in: ['chat', 'instant_voice'] },
      countedInStatistics: false // 确保是交互记录而非答题记录
    }).sort({ createdAt: 1 })
    
    if (interactionRecords.length === 0) {
      console.log('⚠️ 没有找到AI交互记录，跳过学习建议生成')
      return null
    }
    
    console.log(`📊 找到${interactionRecords.length}条AI交互记录`)
    
    // 🔧 提取交互对话历史
    const interactionHistory = []
    interactionRecords.forEach(record => {
      // 添加学生的问题/困惑
      interactionHistory.push({
        role: 'student',
        content: record.studentInput,
        question: record.question,
        timestamp: record.createdAt,
        mode: record.currentMode
      })
      
      // 添加AI的回复
      interactionHistory.push({
        role: 'ai_tutor', 
        content: record.aiResponse,
        question: record.question,
        timestamp: record.createdAt,
        mode: record.currentMode
      })
    })
    
    // 🤖 使用qwen-max分析交互记录
    const analysisPrompt = buildInteractionAnalysisPrompt(interactionHistory, subject, grade)
    
    // 使用最强模型进行深度分析
    const modelConfig = {
      model: 'qwen-max', // 使用最强模型分析
      temperature: 0.7,
      timeout: 30000, // 允许更长时间分析
      subject: subject
    }
    
    console.log('🤖 调用qwen-max分析学习交互记录...')
    const aiResponse = await callChatModel(analysisPrompt, modelConfig)
    
    // 🧩 解析AI分析结果
    const advice = parseInteractionAnalysis(aiResponse.content, subject, grade)
    
    // 🎯 生成定制化练习题目
    const customizedQuestions = await generateCustomizedQuestionsFromAdvice(advice, subject, grade, userId)
    
    const learningAdvice = {
      userId,
      planId,
      subject,
      grade,
      generatedAt: new Date().toISOString(),
      interactionCount: interactionRecords.length,
      analysisModel: 'qwen-max',
      responseTime: aiResponse.responseTime,
      
      // 🧠 学习建议核心内容
      knowledgeWeaknesses: advice.knowledgeWeaknesses || [],
      learningRecommendations: advice.learningRecommendations || [],
      practiceStrategies: advice.practiceStrategies || [],
      nextLearningGoals: advice.nextLearningGoals || [],
      
      // 🎯 定制化练习题目
      customizedQuestions: customizedQuestions,
      
      // 📊 交互统计分析
      interactionStats: {
        totalInteractions: interactionRecords.length,
        chatModeCount: interactionRecords.filter(r => r.currentMode === 'chat').length,
        voiceModeCount: interactionRecords.filter(r => r.currentMode === 'instant_voice').length,
        mostFrequentIssues: extractFrequentIssues(interactionHistory),
        learningPatterns: analyzeLearningPatterns(interactionHistory)
      }
    }
    
    // 💾 保存学习建议到专题练习模块
    if (customizedQuestions && customizedQuestions.length > 0) {
      await saveToPracticeModule(userId, {
        title: `基于AI交互的${getSubjectConfig(subject).name}专题练习`,
        subject: subject,
        grade: grade,
        source: 'ai_interaction_analysis',
        generatedAt: new Date(),
        questions: customizedQuestions,
        learningAdvice: learningAdvice
      })
      
      console.log(`✅ 已生成${customizedQuestions.length}道定制化练习题并输出到专题练习`)
    }
    
    console.log(`✅ 学习建议生成完成: 发现${advice.knowledgeWeaknesses.length}个知识薄弱点`)
    
    return learningAdvice
    
  } catch (error) {
    console.error('❌ 学习建议生成失败:', error)
    return null
  }
}

/**
 * 🔧 构建交互分析提示词
 */
function buildInteractionAnalysisPrompt(interactionHistory, subject, grade) {
  const subjectConfig = getSubjectConfig(subject)
  
  // 🔧 格式化交互历史
  const formattedHistory = interactionHistory.map((item, index) => {
    const roleLabel = item.role === 'student' ? '学生' : 'AI老师'
    const modeLabel = item.mode === 'chat' ? '文字咨询' : '语音咨询'
    return `${index + 1}. [${roleLabel}-${modeLabel}] 题目: ${item.question}\n   内容: ${item.content}`
  }).join('\n\n')
  
  return `你是一位专业的${grade}年级${subjectConfig.name}学习分析专家。请深度分析以下学生与AI家教的交互记录，生成个性化学习建议。

=== 学生基本信息 ===
学科: ${subjectConfig.name} ${subjectConfig.icon}
年级: ${grade}年级
交互记录数: ${interactionHistory.length}条

=== 交互记录详情 ===
${formattedHistory}

=== 分析任务 ===
请从以下角度深度分析学生的学习状况：

1. **知识薄弱点识别** - 分析学生在哪些知识点上频繁寻求帮助
2. **学习方式偏好** - 观察学生更偏向文字咨询还是语音咨询
3. **思维模式分析** - 判断学生的思考习惯和解题思路
4. **学习建议制定** - 针对发现的问题提出具体改进建议
5. **练习方向规划** - 设计有针对性的练习内容

=== 输出要求 ===
请以JSON格式输出分析结果：
{
  "knowledgeWeaknesses": [
    {
      "area": "知识点名称",
      "severity": "high/medium/low",
      "evidence": "支撑证据",
      "description": "详细描述"
    }
  ],
  "learningRecommendations": [
    {
      "type": "学习方法建议",
      "priority": "high/medium/low", 
      "description": "具体建议内容",
      "implementation": "实施方法"
    }
  ],
  "practiceStrategies": [
    {
      "strategy": "练习策略",
      "targetWeakness": "针对的薄弱点",
      "methods": ["方法1", "方法2"],
      "timeAllocation": "建议练习时间"
    }
  ],
  "nextLearningGoals": [
    {
      "goal": "学习目标",
      "timeframe": "时间框架", 
      "steps": ["步骤1", "步骤2"],
      "success_criteria": "成功标准"
    }
  ]
}`
}

/**
 * 🧩 解析AI交互分析结果
 */
function parseInteractionAnalysis(aiContent, subject, grade) {
  try {
    // 尝试提取JSON内容
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const analysisResult = JSON.parse(jsonMatch[0])
      return analysisResult
    }
    
    // 如果JSON解析失败，使用文本解析
    console.warn('⚠️ JSON解析失败，使用文本解析模式')
    return parseInteractionAnalysisFromText(aiContent, subject, grade)
    
  } catch (error) {
    console.error('❌ 交互分析结果解析失败:', error)
    return getDefaultInteractionAnalysis(subject, grade)
  }
}

/**
 * 🔧 文本模式解析交互分析
 */
function parseInteractionAnalysisFromText(aiContent, subject, grade) {
  const subjectConfig = getSubjectConfig(subject)
  
  return {
    knowledgeWeaknesses: [{
      area: `${subjectConfig.name}基础概念`,
      severity: 'medium',
      evidence: '学生在交互中表现出理解困难',
      description: `需要加强${subjectConfig.name}基础知识的掌握`
    }],
    learningRecommendations: [{
      type: '个性化辅导',
      priority: 'high',
      description: `建议针对${subjectConfig.name}学科特点进行专项练习`,
      implementation: '每日15-20分钟集中练习'
    }],
    practiceStrategies: [{
      strategy: '渐进式练习',
      targetWeakness: `${subjectConfig.name}基础`,
      methods: ['基础概念复习', '逐步提升难度'],
      timeAllocation: '每日20分钟'
    }],
    nextLearningGoals: [{
      goal: `掌握${grade}年级${subjectConfig.name}核心知识点`,
      timeframe: '2-3周',
      steps: ['复习基础', '练习应用', '综合提升'],
      success_criteria: '能够独立解答相应年级题目'
    }]
  }
}

/**
 * 🔧 默认交互分析（兜底方案）
 */
function getDefaultInteractionAnalysis(subject, grade) {
  const subjectConfig = getSubjectConfig(subject)
  
  return {
    knowledgeWeaknesses: [],
    learningRecommendations: [{
      type: '基础巩固',
      priority: 'medium',
      description: `继续加强${subjectConfig.name}基础知识学习`,
      implementation: '保持每日练习习惯'
    }],
    practiceStrategies: [],
    nextLearningGoals: []
  }
}

/**
 * 🎯 基于学习建议生成定制化题目
 */
async function generateCustomizedQuestionsFromAdvice(advice, subject, grade, userId = null) {
  try {
    if (!advice.knowledgeWeaknesses || advice.knowledgeWeaknesses.length === 0) {
      console.log('⚠️ 没有发现知识薄弱点，跳过题目生成')
      return []
    }
    
    const customizedQuestions = []
    
    // 为每个薄弱点生成练习题
    for (const weakness of advice.knowledgeWeaknesses.slice(0, 3)) { // 最多处理3个薄弱点
      const questions = await generatePracticeQuestions(weakness, subject, grade, userId)
      customizedQuestions.push(...questions)
    }
    
    console.log(`✅ 基于学习建议生成${customizedQuestions.length}道定制化题目`)
    
    return customizedQuestions.slice(0, 10) // 限制最多10道题
    
  } catch (error) {
    console.error('❌ 定制化题目生成失败:', error)
    return []
  }
}

/**
 * 📊 提取频繁问题
 */
function extractFrequentIssues(interactionHistory) {
  const issueKeywords = {}
  
  interactionHistory
    .filter(item => item.role === 'student')
    .forEach(item => {
      const content = item.content.toLowerCase()
      
      // 识别常见问题关键词
      const keywords = ['不知道', '不会', '不懂', '怎么', '为什么', '帮我', '不理解']
      keywords.forEach(keyword => {
        if (content.includes(keyword)) {
          issueKeywords[keyword] = (issueKeywords[keyword] || 0) + 1
        }
      })
    })
  
  // 返回频次最高的3个问题
  return Object.entries(issueKeywords)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([keyword, count]) => ({ keyword, count }))
}

/**
 * 🔍 分析学习模式
 */
function analyzeLearningPatterns(interactionHistory) {
  const patterns = {
    preferredMode: 'chat', // 默认文字模式
    questionFrequency: 'low', // 提问频率
    independenceLevel: 'medium' // 独立性水平
  }
  
  const chatCount = interactionHistory.filter(item => item.mode === 'chat').length
  const voiceCount = interactionHistory.filter(item => item.mode === 'instant_voice').length
  
  // 判断偏好模式
  patterns.preferredMode = voiceCount > chatCount ? 'voice' : 'chat'
  
  // 判断提问频率
  const totalQuestions = interactionHistory.filter(item => item.role === 'student').length
  if (totalQuestions > 10) patterns.questionFrequency = 'high'
  else if (totalQuestions > 5) patterns.questionFrequency = 'medium'
  else patterns.questionFrequency = 'low'
  
  // 判断独立性（基于求助频率）
  const helpRequests = interactionHistory.filter(item => 
    item.role === 'student' && 
    (item.content.includes('帮我') || item.content.includes('不会') || item.content.includes('不知道'))
  ).length
  
  if (helpRequests > totalQuestions * 0.7) patterns.independenceLevel = 'low'
  else if (helpRequests > totalQuestions * 0.3) patterns.independenceLevel = 'medium'
  else patterns.independenceLevel = 'high'
  
  return patterns
}

/**
 * 🎯 任务2：专题练习生成API
 * POST /api/ai-chat/generate-practice
 */
router.post('/generate-practice', createValidationMiddleware('practice'), async (req, res) => {
  try {
    const { userId, planId, targetWeakness, subject, grade, practiceCount = 5 } = req.body
    
    console.log('🎯 生成定制化专题练习:', { userId, planId, targetWeakness, subject, grade })
    
    // 参数验证
    if (!userId || !subject || !grade) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：userId, subject, grade'
      })
    }
    
    let weaknessToTarget = null
    
    // 如果指定了特定弱点，直接生成
    if (targetWeakness) {
      weaknessToTarget = {
        type: targetWeakness,
        frequency: 3,
        severity: 'high',
        description: getWeaknessDescription(targetWeakness),
        practiceRecommendation: getPracticeRecommendation(targetWeakness, subject, grade)
      }
    } else {
      // 否则分析用户的学习记录找出弱点 - 🔧 修改为数据库查询
      const dbRecords = await LearningRecord.find({ userId: userId }).sort({ createdAt: -1 }).lean()
      
      // 转换为兼容格式
      const userRecords = dbRecords.map(record => ({
        userId: record.userId,
        planId: record.planId,
        question: record.question,
        studentInput: record.studentInput,
        isCorrect: record.isCorrect,
        subject: record.subject,
        grade: record.grade,
        studentAnswer: record.answerVerification?.studentAnswer,
        correctAnswer: record.answerVerification?.correctAnswer,
        timestamp: record.createdAt
      }))
      
      if (userRecords.length > 0) {
        const weaknessAnalysis = await analyzeStudentWeaknesses(userRecords, subject, grade)
        weaknessToTarget = weaknessAnalysis.length > 0 ? weaknessAnalysis[0] : null
      }
    }
    
    // 如果没有找到弱点，生成通用练习
    if (!weaknessToTarget) {
      weaknessToTarget = {
        type: '基础概念',
        frequency: 1,
        severity: 'medium',
        description: `${grade}年级${subject}基础概念练习`,
        practiceRecommendation: `${grade}年级${subject}基础强化训练`
      }
    }
    
    // 生成练习题集
    const practiceSet = await generatePracticeQuestions(weaknessToTarget, subject, grade, userId)
    
    // 🔥 使用AI增强练习题生成
    const aiEnhancedPractice = await enhancePracticeWithAI(practiceSet, targetWeakness, subject, grade, userId)
    
    // 保存到练习系统
    await saveToPracticeModule(userId, aiEnhancedPractice)
    
    console.log(`✅ 专题练习生成成功: ${aiEnhancedPractice.questions.length}道题`)
    
    // 同步到后台题库
    await syncToQuestionBank(aiEnhancedPractice)
    
    res.json({
      success: true,
      data: {
        practiceId: aiEnhancedPractice.id,
        userId,
        weaknessType: weaknessToTarget.type,
        subject,
        grade,
        practiceCount: aiEnhancedPractice.questions.length,
        questions: aiEnhancedPractice.questions,
        analysis: {
          targetWeakness: weaknessToTarget,
          aiRecommendations: aiEnhancedPractice.aiRecommendations,
          estimatedTime: `${aiEnhancedPractice.questions.length * 2}-${aiEnhancedPractice.questions.length * 3}分钟`,
          difficulty: aiEnhancedPractice.difficulty
        },
        createdAt: aiEnhancedPractice.createdAt,
        source: 'ai_analysis'
      },
      message: `为"${weaknessToTarget.type}"生成${aiEnhancedPractice.questions.length}道专题练习`
    })
    
  } catch (error) {
    console.error('❌ 专题练习生成失败:', error)
    res.status(500).json({
      success: false,
      message: '专题练习生成失败，请稍后重试',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * 🔥 使用AI增强练习题生成
 */
async function enhancePracticeWithAI(practiceSet, targetWeakness, subject, grade, userId) {
  try {
    console.log('🤖 AI增强练习题生成中...')
    
    // 🎯 构建多学科AI提示词
    const subjectConfig = getSubjectConfig(subject)
    const prompt = buildSubjectSpecificPrompt(subject, practiceSet.weaknessType, grade, subjectConfig)
    
    function buildSubjectSpecificPrompt(subject, weaknessType, grade, config) {
      const baseInfo = `请为${grade}年级学生生成5道针对"${weaknessType}"的${config.name}练习题。

学生弱点分析：
- 类型：${weaknessType}
- 年级：${grade}年级  
- 学科：${config.name} ${config.icon}
- 学科特点：${config.description}`

      let specificRequirements = ''
      let exampleFormat = ''
      
      if (subject === 'math') {
        specificRequirements = `
数学学科要求：
1. 题目难度适合${grade}年级学生的计算能力
2. 针对"${weaknessType}"进行强化训练
3. 包含应用题、计算题等不同题型
4. 答案要准确，步骤要清晰
5. 用生活实例帮助理解`
        
        exampleFormat = `{
  "questions": [
    {
      "text": "小明有3个苹果，又买了2个，一共有多少个？",
      "answer": "5", 
      "explanation": "3+2=5，把两部分合在一起就是加法",
      "type": "应用题",
      "difficulty": "easy"
    }
  ],
  "recommendations": ["多练习简单的加法题", "用手指或实物帮助理解加法"],
  "difficulty": "easy"
}`
        
      } else if (subject === 'chinese') {
        specificRequirements = `
语文学科要求：
1. 题目语言简单易懂，适合${grade}年级阅读水平
2. 针对"${weaknessType}"设计专项练习
3. 包含拼音、汉字、词汇、阅读等题型
4. 注重语言文字的实际运用
5. 培养语感和表达能力`
        
        exampleFormat = `{
  "questions": [
    {
      "text": "请写出'小朋友'的拼音",
      "answer": "xiǎo péng yǒu", 
      "explanation": "要注意声调，'小'是三声，'朋'是二声，'友'是三声",
      "type": "拼音练习",
      "difficulty": "easy"
    }
  ],
  "recommendations": ["多练习拼音拼读", "可以用拼音卡片辅助学习"],
  "difficulty": "easy"
}`
        
      } else if (subject === 'english') {
        specificRequirements = `
英语学科要求：
1. 题目适合${grade}年级英语启蒙水平
2. 针对"${weaknessType}"进行专项训练
3. 包含字母、单词、简单句型等内容
4. 注重听说读写基础技能
5. 保持学习英语的兴趣和信心`
        
        exampleFormat = `{
  "questions": [
    {
      "text": "'苹果'用英语怎么说？",
      "answer": "apple", 
      "explanation": "apple读作/ˈæpl/，是我们常见的水果单词",
      "type": "单词学习",
      "difficulty": "easy"
    }
  ],
  "recommendations": ["多听英语单词发音", "可以用图片帮助记忆单词"],
  "difficulty": "easy"
}`
        
      } else if (subject === 'science') {
        specificRequirements = `
科学学科要求：
1. 题目贴近${grade}年级学生的生活经验
2. 针对"${weaknessType}"培养科学思维
3. 包含观察、实验、思考等科学方法
4. 鼓励提问和探索精神
5. 用简单语言解释科学现象`
        
        exampleFormat = `{
  "questions": [
    {
      "text": "观察一个苹果，说出它有哪些特征？",
      "answer": "苹果是圆形的，红色或绿色，摸起来光滑，有甜味", 
      "explanation": "观察要用眼睛看、手摸、鼻子闻，从不同角度了解物体",
      "type": "观察练习",
      "difficulty": "easy"
    }
  ],
  "recommendations": ["多观察身边的事物", "培养好奇心，多问为什么"],
  "difficulty": "easy"
}`
      }
      
      return `${baseInfo}

${specificRequirements}

请按照以下JSON格式返回：
${exampleFormat}`
    }
    
    // 使用快速模型生成
    const modelConfig = CHAT_MODELS.STANDARD
    const aiResponse = await callChatModel(prompt, modelConfig)
    
    // 解析AI响应
    let aiData = null
    try {
      // 尝试提取JSON
      const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        aiData = JSON.parse(jsonMatch[0])
      }
    } catch (parseError) {
      console.warn('⚠️ AI响应解析失败，使用默认题目')
    }
    
    // 如果AI生成成功，使用AI题目；否则使用默认题目
    if (aiData && aiData.questions && aiData.questions.length > 0) {
      console.log(`✅ AI生成${aiData.questions.length}道练习题`)
      
      return {
        ...practiceSet,
        userId,
        questions: aiData.questions.map((q, index) => ({
          id: `ai_practice_${Date.now()}_${index}`,
          text: q.text,
          answer: q.answer,
          explanation: q.explanation || '请仔细思考解题步骤',
          type: q.type || practiceSet.weaknessType,
          difficulty: q.difficulty || (grade <= 2 ? 'easy' : 'medium'),
          subject,
          grade,
          source: 'ai_generated'
        })),
        aiRecommendations: aiData.recommendations || [
          '多练习类似题目，加强理解',
          '遇到困难及时询问老师或家长'
        ],
        difficulty: aiData.difficulty || 'medium',
        enhancedByAI: true
      }
    } else {
      console.log('⚠️ AI生成失败，使用模板题目')
      return {
        ...practiceSet,
        userId,
        aiRecommendations: [
          `加强${practiceSet.weaknessType}的练习`,
          '多做类似题目提高熟练度',
          '遇到问题及时寻求帮助'
        ],
        difficulty: grade <= 2 ? 'easy' : 'medium',
        enhancedByAI: false
      }
    }
    
  } catch (error) {
    console.error('❌ AI增强练习题生成失败:', error)
    
    // 返回基础练习题
    return {
      ...practiceSet,
      userId,
      aiRecommendations: [
        '多练习基础题目',
        '循序渐进提高能力'
      ],
      difficulty: 'medium',
      enhancedByAI: false
    }
  }
}

/**
 * 评估问题难度
 * @param {string} question 问题内容
 * @param {string} subject 学科
 * @param {number} grade 年级
 * @returns {string} 难度等级 (easy, medium, hard)
 */
function assessQuestionDifficulty(question, subject, grade) {
  // 简单的难度评估逻辑
  const questionLength = question.length
  const complexWords = ['为什么', '如何', '分析', '解释', '证明', '推导', '计算', '比较', '判断']
  const hasComplexWords = complexWords.some(word => question.includes(word))
  
  if (grade <= 2) {
    return hasComplexWords ? 'medium' : 'easy'
  } else if (grade <= 4) {
    return hasComplexWords ? 'hard' : (questionLength > 50 ? 'medium' : 'easy')
  } else {
    return hasComplexWords && questionLength > 100 ? 'hard' : 
           (hasComplexWords || questionLength > 50 ? 'medium' : 'easy')
  }
}

/**
 * 评估学生答案正确性
 * @param {string} studentAnswer 学生答案
 * @param {string} question 问题
 * @param {string} subject 学科
 * @returns {boolean} 是否答对
 */
function evaluateStudentAnswer(studentAnswer, question, subject) {
  // 简化的答案评估逻辑
  const positiveIndicators = ['对', '是', '正确', '好', '对的', '没错', '明白', '会了', '懂了']
  const negativeIndicators = ['不知道', '不会', '错', '不对', '不懂', '不明白', '难', '帮我']
  
  const answer = studentAnswer.toLowerCase()
  
  const hasPositive = positiveIndicators.some(word => answer.includes(word))
  const hasNegative = negativeIndicators.some(word => answer.includes(word))
  
  // 如果包含数字或数学表达式，认为是尝试回答
  const hasNumbers = /\d/.test(answer)
  const hasMathExpression = /[+\-*/=]/.test(answer)
  
  if (hasNegative) return false
  if (hasPositive) return true
  if (hasNumbers || hasMathExpression) return true
  
  // 针对不同学科的评估逻辑
  if (subject === 'chinese') {
    // 语文答案可能包含汉字、拼音等
    const hasChineseChars = /[\u4e00-\u9fa5]/.test(answer)
    const hasPinyin = /[aeiouāáǎàēéěèīíǐìōóǒòūúǔùüǖǘǚǜ]/.test(answer)
    return hasChineseChars || hasPinyin
  } else if (subject === 'english') {
    // 英语答案可能包含英文字母
    const hasEnglish = /[a-zA-Z]/.test(answer)
    return hasEnglish && answer.length > 1
  }
  
  // 默认认为有内容的回答是正向的
  return answer.trim().length > 3
}

/**
 * 🔧 智能答案提取和意图识别
 * 根据学科类型识别不同的答案表达方式：
 * 数学: "老师12对不对", "我觉得是15", 纯数字答案
 * 语文: "是苹果", "这个字读作...", 中文词语
 * 英语: "apple", "是a还是an", 英文单词
 * 科学: "是液体", "因为...", 概念性答案
 */
function intelligentAnswerExtraction(studentInput, subject = 'math') {
  if (!studentInput || typeof studentInput !== 'string') {
    return {
      hasAnswer: false,
      extractedAnswers: [],
      primaryAnswer: null,
      confidenceLevel: 'none',
      intentType: 'unknown',
      answerType: 'unknown'
    }
  }
  
  const input = studentInput.trim()
  
  // 根据学科类型进行不同的答案检测
  if (subject === 'math') {
    return extractMathAnswer(input)
  } else if (subject === 'chinese') {
    return extractChineseAnswer(input)
  } else if (subject === 'english') {
    return extractEnglishAnswer(input)
  } else if (subject === 'science') {
    return extractScienceAnswer(input)
  } else {
    // 默认使用数学检测逻辑
    return extractMathAnswer(input)
  }
}

/**
 * 🔧 数学答案检测（保持原有逻辑）
 */
function extractMathAnswer(input) {
  // 1. 提取所有数字（包括小数、分数、中文数字）
  const numberPatterns = [
    /(\d+\.?\d*)/g,  // 阿拉伯数字和小数
    /(\d+\/\d+)/g,   // 分数
    /([零一二三四五六七八九十]{1,3})/g  // 中文数字（支持复合）
  ]
  
  let allNumbers = []
  numberPatterns.forEach(pattern => {
    const matches = input.match(pattern)
    if (matches) {
      allNumbers.push(...matches)
    }
  })
  
  // 2. 识别答案表达意图（支持阿拉伯数字和中文数字）
  const intentPatterns = {
    answer_confirmation: [
      /(?:老师|teacher).*?(\d+\.?\d*|[零一二三四五六七八九十]{1,3}).*?(?:对不对|对吗|是吗|正确吗)/i,
      /(?:我觉得|我认为|我想).*?(?:是|答案是).*?(\d+\.?\d*|[零一二三四五六七八九十]{1,3})/i,
      /(?:答案|结果).*?(?:是|应该是|可能是).*?(\d+\.?\d*|[零一二三四五六七八九十]{1,3})/i,
      /(?:会不会|是不是|应该是).*?(\d+\.?\d*|[零一二三四五六七八九十]{1,3})/i,
      /(\d+\.?\d*|[零一二三四五六七八九十]{1,3}).*?(?:对不对|对吗|是吗|正确吗)/i,
      /(\d+\.?\d*|[零一二三四五六七八九十]{1,3}).*?(?:吧|呢|啊|吗)/i
    ],
    direct_answer: [
      /^(\d+\.?\d*|[零一二三四五六七八九十]{1,3})$/,  // 纯数字（阿拉伯或中文）
      /(?:等于|=).*?(\d+\.?\d*|[零一二三四五六七八九十]{1,3})/i,
      /(\d+\.?\d*|[零一二三四五六七八九十]{1,3})(?:$|[。！!])/  // 数字结尾
    ],
    calculation_attempt: [
      /(\d+\.?\d*|[零一二三四五六七八九十]{1,3}).*?(?:\+|\-|\*|×|÷|\/)/,
      /(?:\+|\-|\*|×|÷|\/).*?(\d+\.?\d*|[零一二三四五六七八九十]{1,3})/
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
        console.log(`🎯 意图匹配: ${intent}, 模式: ${pattern}, 匹配到: "${numberMatch}"`)
        
        // 检查是否包含数字或中文数字
        if (numberMatch && (/\d/.test(numberMatch) || /[零一二三四五六七八九十]/.test(numberMatch))) {
          primaryAnswer = convertToNumber(numberMatch)
          console.log(`🔢 数字转换: "${numberMatch}" -> ${primaryAnswer}`)
          
          if (primaryAnswer !== null) {
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
    hasAnswer: primaryAnswer !== null,
    extractedAnswers: allNumbers.map(convertToNumber).filter(n => n !== null),
    primaryAnswer,
    confidenceLevel,
    intentType,
    answerType: 'number',
    originalInput: input
  }
}

/**
 * 🔧 语文答案检测
 */
function extractChineseAnswer(input) {
  const chinesePatterns = {
    answer_confirmation: [
      /(?:老师|是不是).*?([是否]|[\u4e00-\u9fa5]{1,10}).*?(?:对不对|对吗|是吗|正确吗)/i,
      /(?:我觉得|我认为|我想).*?(?:是|答案是).*?([\u4e00-\u9fa5]{1,20})/i,
      /(?:答案|结果).*?(?:是|应该是).*?([\u4e00-\u9fa5]{1,20})/i,
      /([\u4e00-\u9fa5]{1,20}).*?(?:对不对|对吗|是吗|正确吗)/i
    ],
    direct_answer: [
      /^([\u4e00-\u9fa5]{1,20})$/,  // 纯中文
      /(?:是|读作).*?([\u4e00-\u9fa5]{1,20})/i,
      /([\u4e00-\u9fa5]{1,20})(?:[。！!]|$)/  // 中文结尾
    ],
    pinyin_answer: [
      /([a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùüǖǘǚǜ]+)/g  // 拼音
    ]
  }
  
  let primaryAnswer = null
  let intentType = 'unclear'
  let confidenceLevel = 'low'
  let answerType = 'chinese'
  
  // 检测中文答案
  for (const [intent, patterns] of Object.entries(chinesePatterns)) {
    for (const pattern of patterns) {
      const match = input.match(pattern)
      if (match) {
        const answerMatch = match[1]
        if (answerMatch && answerMatch.length > 0) {
          primaryAnswer = answerMatch.trim()
          intentType = intent
          
          if (intent === 'pinyin_answer') {
            answerType = 'pinyin'
            confidenceLevel = 'medium'
          } else if (intent === 'answer_confirmation') {
            confidenceLevel = 'high'
          } else {
            confidenceLevel = 'medium'
          }
          
          break
        }
      }
    }
    if (primaryAnswer !== null) break
  }
  
  // 如果没找到明确答案，检查是否包含中文字符
  if (primaryAnswer === null) {
    const chineseChars = input.match(/[\u4e00-\u9fa5]+/g)
    if (chineseChars && chineseChars.length > 0) {
      primaryAnswer = chineseChars[0]
      intentType = 'chinese_mentioned'
      confidenceLevel = 'low'
    }
  }
  
  return {
    hasAnswer: primaryAnswer !== null,
    extractedAnswers: [primaryAnswer].filter(a => a !== null),
    primaryAnswer,
    confidenceLevel,
    intentType,
    answerType,
    originalInput: input
  }
}

/**
 * 🔧 英语答案检测
 */
function extractEnglishAnswer(input) {
  const englishPatterns = {
    answer_confirmation: [
      /(?:老师|是不是|is it).*?([a-zA-Z]+).*?(?:对不对|对吗|是吗|correct)/i,
      /(?:我觉得|我认为|I think).*?(?:是|is|答案是).*?([a-zA-Z]+)/i,
      /(?:答案|answer).*?(?:是|is).*?([a-zA-Z]+)/i,
      /([a-zA-Z]+).*?(?:对不对|对吗|是吗|correct)/i
    ],
    direct_answer: [
      /^([a-zA-Z]+)$/,  // 纯英文单词
      /(?:is|读作|means).*?([a-zA-Z]+)/i,
      /([a-zA-Z]+)(?:[。！!]|$)/  // 英文结尾
    ],
    spelling_answer: [
      /([a-zA-Z]+-[a-zA-Z]+)/,  // 连字符单词
      /([A-Z]{2,})/,  // 全大写缩写
    ]
  }
  
  let primaryAnswer = null
  let intentType = 'unclear'
  let confidenceLevel = 'low'
  let answerType = 'english'
  
  // 检测英语答案
  for (const [intent, patterns] of Object.entries(englishPatterns)) {
    for (const pattern of patterns) {
      const match = input.match(pattern)
      if (match) {
        const answerMatch = match[1]
        if (answerMatch && answerMatch.length > 0) {
          primaryAnswer = answerMatch.toLowerCase().trim()
          intentType = intent
          
          if (intent === 'answer_confirmation') {
            confidenceLevel = 'high'
          } else {
            confidenceLevel = 'medium'
          }
          
          break
        }
      }
    }
    if (primaryAnswer !== null) break
  }
  
  // 如果没找到明确答案，检查是否包含英文字母
  if (primaryAnswer === null) {
    const englishWords = input.match(/[a-zA-Z]+/g)
    if (englishWords && englishWords.length > 0) {
      // 过滤掉常见的中文拼音和无意义单词
      const meaningfulWords = englishWords.filter(word => 
        word.length > 1 && 
        !['wo', 'de', 'shi', 'ni', 'ta', 'zhe', 'na', 'le', 'ma'].includes(word.toLowerCase())
      )
      if (meaningfulWords.length > 0) {
        primaryAnswer = meaningfulWords[0].toLowerCase()
        intentType = 'english_mentioned'
        confidenceLevel = 'low'
      }
    }
  }
  
  return {
    hasAnswer: primaryAnswer !== null,
    extractedAnswers: [primaryAnswer].filter(a => a !== null),
    primaryAnswer,
    confidenceLevel,
    intentType,
    answerType,
    originalInput: input
  }
}

/**
 * 🔧 科学答案检测
 */
function extractScienceAnswer(input) {
  const sciencePatterns = {
    answer_confirmation: [
      /(?:老师|是不是).*?(液体|固体|气体|植物|动物|金属|非金属).*?(?:对不对|对吗|是吗)/i,
      /(?:我觉得|我认为).*?(?:是|答案是).*?(因为|由于|所以)(.*?)$/i,
      /(?:会|能|可以|不会|不能|不可以).*?(?:对不对|对吗|是吗)/i,
      /(是|不是|会|不会|能|不能|可以|不可以).*?(?:对不对|对吗|是吗)/i
    ],
    direct_answer: [
      /^(液体|固体|气体|植物|动物|金属|非金属|酸性|碱性|中性)$/,
      /^(是|不是|会|不会|能|不能|可以|不可以)$/,
      /(?:因为|由于|所以)(.*?)$/i,
      /(.*?)(?:所以|因此|导致)/i
    ],
    explanation_answer: [
      /因为(.*?)$/i,
      /由于(.*?)$/i,
      /这是因为(.*?)$/i
    ]
  }
  
  let primaryAnswer = null
  let intentType = 'unclear'
  let confidenceLevel = 'low'
  let answerType = 'science'
  
  // 检测科学答案
  for (const [intent, patterns] of Object.entries(sciencePatterns)) {
    for (const pattern of patterns) {
      const match = input.match(pattern)
      if (match) {
        const answerMatch = match[1] || match[0]
        if (answerMatch && answerMatch.length > 0) {
          primaryAnswer = answerMatch.trim()
          intentType = intent
          
          if (intent === 'explanation_answer') {
            answerType = 'explanation'
            confidenceLevel = 'high'
          } else if (intent === 'answer_confirmation') {
            confidenceLevel = 'high'
          } else {
            confidenceLevel = 'medium'
          }
          
          break
        }
      }
    }
    if (primaryAnswer !== null) break
  }
  
  // 如果没找到明确答案，检查是否包含科学关键词
  if (primaryAnswer === null) {
    const scienceKeywords = ['液体', '固体', '气体', '植物', '动物', '金属', '非金属', 
                           '酸性', '碱性', '中性', '化学', '物理', '生物', '实验']
    const foundKeyword = scienceKeywords.find(keyword => input.includes(keyword))
    if (foundKeyword) {
      primaryAnswer = foundKeyword
      intentType = 'science_mentioned'
      confidenceLevel = 'low'
    } else if (input.length > 5) {
      // 如果输入较长，可能是解释性回答
      primaryAnswer = input
      intentType = 'general_response'
      answerType = 'explanation'
      confidenceLevel = 'low'
    }
  }
  
  return {
    hasAnswer: primaryAnswer !== null,
    extractedAnswers: [primaryAnswer].filter(a => a !== null),
    primaryAnswer,
    confidenceLevel,
    intentType,
    answerType,
    originalInput: input
  }
}

/**
 * 🔧 辅助函数：转换各种数字格式为数值
 */
function convertToNumber(str) {
  if (!str) return null
  
  // 处理中文数字
  const result = convertChineseNumber(str)
  if (result !== null) {
    return result
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

/**
 * 🔧 中文数字转换函数
 * 支持一到九十九的中文数字转换
 */
function convertChineseNumber(str) {
  if (!str) return null
  
  const chineseDigits = {
    '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
  }
  
  // 直接匹配单字数字
  if (chineseDigits.hasOwnProperty(str)) {
    return chineseDigits[str]
  }
  
  // 处理复合中文数字（十一到九十九）
  if (str.includes('十')) {
    // 十一, 十二, ..., 十九
    if (str.length === 2 && str.startsWith('十')) {
      const unit = str.charAt(1)
      if (chineseDigits.hasOwnProperty(unit) && chineseDigits[unit] > 0) {
        return 10 + chineseDigits[unit]
      }
    }
    
    // 二十, 三十, ..., 九十
    if (str.length === 2 && str.endsWith('十')) {
      const tens = str.charAt(0)
      if (chineseDigits.hasOwnProperty(tens) && chineseDigits[tens] > 1) {
        return chineseDigits[tens] * 10
      }
    }
    
    // 二十一, 二十二, ..., 九十九
    if (str.length === 3 && str.charAt(1) === '十') {
      const tens = str.charAt(0)
      const unit = str.charAt(2)
      if (chineseDigits.hasOwnProperty(tens) && chineseDigits.hasOwnProperty(unit) && 
          chineseDigits[tens] > 1 && chineseDigits[unit] > 0) {
        return chineseDigits[tens] * 10 + chineseDigits[unit]
      }
    }
  }
  
  return null
}

/**
 * 🔧 增强答案验证功能 - 支持多学科
 */
async function verifyStudentAnswer(question, studentInput, subject = 'math', grade = 1, answerDetection = null) {
  try {
    // 🔧 使用智能检测结果
    let studentAnswer = null
    
    if (answerDetection && answerDetection.primaryAnswer !== null) {
      studentAnswer = answerDetection.primaryAnswer
    } else {
      return { isCorrect: false, reason: 'no_answer_provided' }
    }
    
    // 根据学科使用不同的验证策略
    if (subject === 'math') {
      return verifyMathAnswer(question, studentAnswer, grade)
    } else if (subject === 'chinese') {
      return await verifyChineseAnswer(question, studentAnswer, grade)
    } else if (subject === 'english') {
      return await verifyEnglishAnswer(question, studentAnswer, grade)
    } else if (subject === 'science') {
      return await verifyScienceAnswer(question, studentAnswer, grade)
    } else {
      // 默认使用AI验证
      return await verifyWithAI(question, studentAnswer, subject, grade)
    }
    
  } catch (error) {
    console.error('❌ 答案验证失败:', error)
    return { isCorrect: false, reason: 'verification_failed' }
  }
}

/**
 * 🔧 数学答案验证 - 精确计算
 */
function verifyMathAnswer(question, studentAnswer, grade) {
  // 对于数学题，尝试精确计算
  const correctAnswer = calculateMathAnswer(question)
  if (correctAnswer !== null) {
    const isCorrect = Math.abs(studentAnswer - correctAnswer) < 0.01
    return {
      isCorrect,
      studentAnswer,
      correctAnswer,
      reason: isCorrect ? 'correct_calculation' : 'wrong_calculation',
      subject: 'math'
    }
  }
  
  // 如果无法计算，返回未知
  return {
    isCorrect: false,
    studentAnswer,
    reason: 'calculation_failed',
    subject: 'math'
  }
}

/**
 * 🔧 语文答案验证 - AI智能判断
 */
async function verifyChineseAnswer(question, studentAnswer, grade) {
  try {
    const prompt = `请判断这道${grade}年级语文题的答案是否正确：

题目：${question}
学生答案：${studentAnswer}

请简短回答：
1. 正确/错误
2. 简要说明理由（30字以内）

格式：正确，理由...
或：错误，理由...`

    const aiResponse = await callChatModel(prompt, { model: 'qwen-turbo', maxTokens: 150 })
    const result = parseAnswerCheckResult(aiResponse.content, studentAnswer)
    
    return {
      isCorrect: result.isCorrect,
      studentAnswer,
      aiExplanation: result.explanation,
      reason: 'ai_verified',
      subject: 'chinese'
    }
  } catch (error) {
    console.error('❌ 语文答案验证失败:', error)
    return { isCorrect: false, reason: 'verification_failed', subject: 'chinese' }
  }
}

/**
 * 🔧 英语答案验证 - AI智能判断
 */
async function verifyEnglishAnswer(question, studentAnswer, grade) {
  try {
    const prompt = `Please check if this Grade ${grade} English answer is correct:

Question: ${question}
Student Answer: ${studentAnswer}

Please respond briefly:
1. Correct/Incorrect
2. Brief explanation (within 30 words)

Format: Correct, because...
Or: Incorrect, because...`

    const aiResponse = await callChatModel(prompt, { model: 'qwen-turbo', maxTokens: 150 })
    const result = parseAnswerCheckResult(aiResponse.content, studentAnswer)
    
    return {
      isCorrect: result.isCorrect,
      studentAnswer,
      aiExplanation: result.explanation,
      reason: 'ai_verified',
      subject: 'english'
    }
  } catch (error) {
    console.error('❌ 英语答案验证失败:', error)
    return { isCorrect: false, reason: 'verification_failed', subject: 'english' }
  }
}

/**
 * 🔧 科学答案验证 - AI智能判断
 */
async function verifyScienceAnswer(question, studentAnswer, grade) {
  try {
    const prompt = `请判断这道${grade}年级科学题的答案是否正确：

题目：${question}
学生答案：${studentAnswer}

请简短回答：
1. 正确/错误
2. 简要说明理由（50字以内）

格式：正确，理由...
或：错误，理由...`

    const aiResponse = await callChatModel(prompt, { model: 'qwen-turbo', maxTokens: 200 })
    const result = parseAnswerCheckResult(aiResponse.content, studentAnswer)
    
    return {
      isCorrect: result.isCorrect,
      studentAnswer,
      aiExplanation: result.explanation,
      reason: 'ai_verified',
      subject: 'science'
    }
  } catch (error) {
    console.error('❌ 科学答案验证失败:', error)
    return { isCorrect: false, reason: 'verification_failed', subject: 'science' }
  }
}

/**
 * 🔧 通用AI答案验证
 */
async function verifyWithAI(question, studentAnswer, subject, grade) {
  try {
    const prompt = buildAnswerCheckPrompt(question, studentAnswer.toString(), subject, grade)
    const aiResponse = await callChatModel(prompt, { model: 'qwen-turbo', maxTokens: 150 })
    const checkResult = parseAnswerCheckResult(aiResponse.content, studentAnswer.toString())
    
    return {
      isCorrect: checkResult.isCorrect,
      studentAnswer,
      aiExplanation: checkResult.explanation,
      reason: 'ai_verified',
      subject
    }
  } catch (error) {
    console.error('❌ AI答案验证失败:', error)
    return { isCorrect: false, reason: 'verification_failed', subject }
  }
}

/**
 * 🔧 新增：计算数学题的正确答案
 */
function calculateMathAnswer(question) {
  try {
    // 移除中文字符，保留数字和运算符
    const mathExpression = question.replace(/[^\d+\-×÷\*\/\(\)\.\s]/g, '')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .trim()
    
    // 安全地计算表达式
    if (/^[\d+\-*\/\(\)\.\s]+$/.test(mathExpression)) {
      return eval(mathExpression)
    }
    
    return null
  } catch (error) {
    console.error('数学计算失败:', error)
    return null
  }
}

/**
 * 🔧 测试API - 手动添加学习记录 - 🔧 修改为数据库存储
 * @route POST /api/ai-chat/add-manual-record
 */
router.post('/add-manual-record', async (req, res) => {
  try {
    const record = req.body
    
    // 验证必要字段
    if (!record.question || !record.studentInput) {
      return res.status(400).json({
        success: false,
        error: '缺少必要字段: question, studentInput'
      })
    }
    
    // 使用数据库存储
    const savedRecord = await saveLearningRecord({
      userId: record.userId || 'test-user',
      planId: record.planId || 'test-plan',
      question: record.question,
      studentInput: record.studentInput,
      isCorrect: record.isCorrect,
      subject: record.subject || 'math',
      grade: record.grade || 1,
      timestamp: record.timestamp || new Date().toISOString(),
      responseTime: record.responseTime || 0
    })
    
    console.log(`🔧 手动添加学习记录: ${record.question} -> isCorrect: ${record.isCorrect}`)
    
    res.json({
      success: true,
      message: '学习记录已添加到数据库',
      recordId: savedRecord.id,
      data: savedRecord
    })
    
  } catch (error) {
    console.error('❌ 手动添加记录失败:', error)
    res.status(500).json({
      success: false,
      error: '添加记录失败',
      details: error.message
    })
  }
})

/**
 * 🎯 构建AI欢迎和学习建议提示词 - 根据PRD要求
 */
function buildWelcomeGuidancePrompt(question, subject, grade, studentLevel = 'beginner') {
  const subjectConfig = getSubjectConfig(subject)
  
  const prompt = `你是一位专业的小学${subjectConfig.name}AI老师，现在需要为${grade}年级学生生成个性化的学习建议。

当前题目：${question}
学科：${subjectConfig.name} ${subjectConfig.icon}
年级：${grade}年级
学生水平：${studentLevel}

请按以下格式提供学习建议：

欢迎消息：[一句温暖的欢迎话语，体现${subjectConfig.name}学科特色，20字以内]

学习建议：
1. [第一条学习建议，针对这道题的解题策略，25字以内]
2. [第二条学习建议，关于${subjectConfig.name}学科的学习方法，25字以内]  
3. [第三条学习建议，鼓励和心理建设，25字以内]

题目引导：[对当前题目的具体引导，启发学生思考而不直接给答案，30字以内]

要求：
- 语言要适合${grade}年级学生理解
- 体现${subjectConfig.name}学科的学习特点
- 个性化、具体、实用
- 使用温和鼓励的语气
- 符合AI家教的专业形象
- 严格按照格式输出，方便解析`

  return prompt
}

/**
 * 🔧 解析AI欢迎和学习建议响应
 */
function parseWelcomeGuidance(aiContent, subject) {
  try {
    const lines = aiContent.split('\n').filter(line => line.trim())
    
    let welcomeMessage = ''
    let learningTips = []
    let questionGuidance = ''
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      if (trimmedLine.includes('欢迎消息：') || trimmedLine.includes('欢迎话语：')) {
        welcomeMessage = trimmedLine.split('：')[1]?.trim() || trimmedLine.split(':')[1]?.trim()
      } else if (trimmedLine.match(/^\d+\./)) {
        // 匹配学习建议（1. 2. 3.）
        const tip = trimmedLine.replace(/^\d+\./, '').trim()
        if (tip) learningTips.push(tip)
      } else if (trimmedLine.includes('题目引导：') || trimmedLine.includes('引导：')) {
        questionGuidance = trimmedLine.split('：')[1]?.trim() || trimmedLine.split(':')[1]?.trim()
      }
    }
    
    // 如果解析失败，使用默认值
    if (!welcomeMessage || learningTips.length === 0 || !questionGuidance) {
      console.warn('⚠️ AI响应解析不完整，使用默认建议')
      return getDefaultSubjectGuidance(subject, 3, '')
    }
    
    return {
      welcomeMessage: welcomeMessage || `嗨！我是你的${getSubjectConfig(subject).name}小助手！`,
      learningTips: learningTips.length > 0 ? learningTips : ['认真读题，理解题意', '一步步来思考', '不懂就问老师'],
      questionGuidance: questionGuidance || '让我们来看看这道题，你有什么想法吗？'
    }
    
  } catch (error) {
    console.error('❌ AI建议解析失败:', error)
    return getDefaultSubjectGuidance(subject, 3, '')
  }
}

/**
 * 📚 获取默认的学科特定建议（备用方案）
 */
function getDefaultSubjectGuidance(subject, grade, question) {
  const subjectConfig = getSubjectConfig(subject)
  
  const defaultGuidance = {
    math: {
      welcomeMessage: `嗨！我是你的数学小助手，让我们一起攻克这道题吧！`,
      learningTips: [
        '💡 先读懂题意，找出已知条件和要求什么',
        '🎯 可以试试画图或列式来帮助思考',
        '✨ 我会一步步引导你，不用担心做错！'
      ],
      questionGuidance: '🤔 这道数学题看起来有趣，你能告诉我题目在问什么吗？'
    },
    chinese: {
      welcomeMessage: `你好，小朋友！我是语文老师，一起来探索汉字的奥秘吧！`,
      learningTips: [
        '📖 仔细读题，理解每个字词的意思',
        '💭 联系生活经验，想想类似的情况',
        '🌟 用自己的话说出想法，我会帮你整理'
      ],
      questionGuidance: '📝 这道语文题，你先读一遍，有不认识的字吗？'
    },
    english: {
      welcomeMessage: `Hello! 我是你的英语小伙伴，Let's learn English together!`,
      learningTips: [
        '🔤 先看懂单词，再理解句子意思',
        '🎵 可以读出声来，培养语感',
        '🏆 不要害怕说错，练习是最好的老师！'
      ],
      questionGuidance: '🔤 Look at this English question, 你能读懂吗？'
    },
    science: {
      welcomeMessage: `嗨！我是科学探索者，让我们一起发现科学的奥秘！`,
      learningTips: [
        '🔬 仔细观察题目描述的现象或实验',
        '🤔 想想"为什么会这样？"',
        '⚡ 大胆猜想，我们一起验证想法！'
      ],
      questionGuidance: '🔬 让我们观察这个科学问题，你发现了什么？'
    }
  }
  
  return defaultGuidance[subject] || defaultGuidance.math
}

/**
 * ✅ 新增：基于AI交互记录生成学习建议（第二部分功能）
 * 使用qwen-max分析chat和instant_voice模式的交互记录
 */
async function generateLearningAdviceFromInteractions(userId, planId, subject, grade) {
  try {
    console.log(`🧠 分析AI交互记录生成学习建议: userId=${userId}, planId=${planId}`)
    
    // 🔍 获取所有交互记录（chat和instant_voice模式）
    const interactionRecords = await LearningRecord.find({
      userId: userId,
      planId: planId,
      currentMode: { $in: ['chat', 'instant_voice'] },
      countedInStatistics: false // 确保是交互记录而非答题记录
    }).sort({ createdAt: 1 })
    
    if (interactionRecords.length === 0) {
      console.log('⚠️ 没有找到AI交互记录，跳过学习建议生成')
      return null
    }
    
    console.log(`📊 找到${interactionRecords.length}条AI交互记录`)
    
    // 🔧 提取交互对话历史
    const interactionHistory = []
    interactionRecords.forEach(record => {
      // 添加学生的问题/困惑
      interactionHistory.push({
        role: 'student',
        content: record.studentInput,
        question: record.question,
        timestamp: record.createdAt,
        mode: record.currentMode
      })
      
      // 添加AI的回复
      interactionHistory.push({
        role: 'ai_tutor', 
        content: record.aiResponse,
        question: record.question,
        timestamp: record.createdAt,
        mode: record.currentMode
      })
    })
    
    // 🤖 使用qwen-max分析交互记录
    const analysisPrompt = buildInteractionAnalysisPrompt(interactionHistory, subject, grade)
    
    // 使用最强模型进行深度分析
    const modelConfig = {
      model: 'qwen-max', // 使用最强模型分析
      temperature: 0.7,
      timeout: 30000, // 允许更长时间分析
      subject: subject
    }
    
    console.log('🤖 调用qwen-max分析学习交互记录...')
    const aiResponse = await callChatModel(analysisPrompt, modelConfig)
    
    // 🧩 解析AI分析结果
    const advice = parseInteractionAnalysis(aiResponse.content, subject, grade)
    
    // 🎯 生成定制化练习题目
    const customizedQuestions = await generateCustomizedQuestionsFromAdvice(advice, subject, grade, userId)
    
    const learningAdvice = {
      userId,
      planId,
      subject,
      grade,
      generatedAt: new Date().toISOString(),
      interactionCount: interactionRecords.length,
      analysisModel: 'qwen-max',
      responseTime: aiResponse.responseTime,
      
      // 🧠 学习建议核心内容
      knowledgeWeaknesses: advice.knowledgeWeaknesses || [],
      learningRecommendations: advice.learningRecommendations || [],
      practiceStrategies: advice.practiceStrategies || [],
      nextLearningGoals: advice.nextLearningGoals || [],
      
      // 🎯 定制化练习题目
      customizedQuestions: customizedQuestions,
      
      // 📊 交互统计分析
      interactionStats: {
        totalInteractions: interactionRecords.length,
        chatModeCount: interactionRecords.filter(r => r.currentMode === 'chat').length,
        voiceModeCount: interactionRecords.filter(r => r.currentMode === 'instant_voice').length,
        mostFrequentIssues: extractFrequentIssues(interactionHistory),
        learningPatterns: analyzeLearningPatterns(interactionHistory)
      }
    }
    
    // 💾 保存学习建议到专题练习模块
    if (customizedQuestions && customizedQuestions.length > 0) {
      await saveToPracticeModule(userId, {
        title: `基于AI交互的${getSubjectConfig(subject).name}专题练习`,
        subject: subject,
        grade: grade,
        source: 'ai_interaction_analysis',
        generatedAt: new Date(),
        questions: customizedQuestions,
        learningAdvice: learningAdvice
      })
      
      console.log(`✅ 已生成${customizedQuestions.length}道定制化练习题并输出到专题练习`)
    }
    
    console.log(`✅ 学习建议生成完成: 发现${advice.knowledgeWeaknesses.length}个知识薄弱点`)
    
    return learningAdvice
    
  } catch (error) {
    console.error('❌ 学习建议生成失败:', error)
    return null
  }
}

/**
 * 🔧 构建交互分析提示词
 */
function buildInteractionAnalysisPrompt(interactionHistory, subject, grade) {
  const subjectConfig = getSubjectConfig(subject)
  
  // 🔧 格式化交互历史
  const formattedHistory = interactionHistory.map((item, index) => {
    const roleLabel = item.role === 'student' ? '学生' : 'AI老师'
    const modeLabel = item.mode === 'chat' ? '文字咨询' : '语音咨询'
    return `${index + 1}. [${roleLabel}-${modeLabel}] 题目: ${item.question}\n   内容: ${item.content}`
  }).join('\n\n')
  
  return `你是一位专业的${grade}年级${subjectConfig.name}学习分析专家。请深度分析以下学生与AI家教的交互记录，生成个性化学习建议。

=== 学生基本信息 ===
学科: ${subjectConfig.name} ${subjectConfig.icon}
年级: ${grade}年级
交互记录数: ${interactionHistory.length}条

=== 交互记录详情 ===
${formattedHistory}

=== 分析任务 ===
请从以下角度深度分析学生的学习状况：

1. **知识薄弱点识别** - 分析学生在哪些知识点上频繁寻求帮助
2. **学习方式偏好** - 观察学生更偏向文字咨询还是语音咨询
3. **思维模式分析** - 判断学生的思考习惯和解题思路
4. **学习建议制定** - 针对发现的问题提出具体改进建议
5. **练习方向规划** - 设计有针对性的练习内容

=== 输出要求 ===
请以JSON格式输出分析结果：
{
  "knowledgeWeaknesses": [
    {
      "area": "知识点名称",
      "severity": "high/medium/low",
      "evidence": "支撑证据",
      "description": "详细描述"
    }
  ],
  "learningRecommendations": [
    {
      "type": "学习方法建议",
      "priority": "high/medium/low", 
      "description": "具体建议内容",
      "implementation": "实施方法"
    }
  ],
  "practiceStrategies": [
    {
      "strategy": "练习策略",
      "targetWeakness": "针对的薄弱点",
      "methods": ["方法1", "方法2"],
      "timeAllocation": "建议练习时间"
    }
  ],
  "nextLearningGoals": [
    {
      "goal": "学习目标",
      "timeframe": "时间框架", 
      "steps": ["步骤1", "步骤2"],
      "success_criteria": "成功标准"
    }
  ]
}`
}

/**
 * 🧩 解析AI交互分析结果
 */
function parseInteractionAnalysis(aiContent, subject, grade) {
  try {
    // 尝试提取JSON内容
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const analysisResult = JSON.parse(jsonMatch[0])
      return analysisResult
    }
    
    // 如果JSON解析失败，使用文本解析
    console.warn('⚠️ JSON解析失败，使用文本解析模式')
    return parseInteractionAnalysisFromText(aiContent, subject, grade)
    
  } catch (error) {
    console.error('❌ 交互分析结果解析失败:', error)
    return getDefaultInteractionAnalysis(subject, grade)
  }
}

/**
 * 🔧 文本模式解析交互分析
 */
function parseInteractionAnalysisFromText(aiContent, subject, grade) {
  const subjectConfig = getSubjectConfig(subject)
  
  return {
    knowledgeWeaknesses: [{
      area: `${subjectConfig.name}基础概念`,
      severity: 'medium',
      evidence: '学生在交互中表现出理解困难',
      description: `需要加强${subjectConfig.name}基础知识的掌握`
    }],
    learningRecommendations: [{
      type: '个性化辅导',
      priority: 'high',
      description: `建议针对${subjectConfig.name}学科特点进行专项练习`,
      implementation: '每日15-20分钟集中练习'
    }],
    practiceStrategies: [{
      strategy: '渐进式练习',
      targetWeakness: `${subjectConfig.name}基础`,
      methods: ['基础概念复习', '逐步提升难度'],
      timeAllocation: '每日20分钟'
    }],
    nextLearningGoals: [{
      goal: `掌握${grade}年级${subjectConfig.name}核心知识点`,
      timeframe: '2-3周',
      steps: ['复习基础', '练习应用', '综合提升'],
      success_criteria: '能够独立解答相应年级题目'
    }]
  }
}

/**
 * 🔧 默认交互分析（兜底方案）
 */
function getDefaultInteractionAnalysis(subject, grade) {
  const subjectConfig = getSubjectConfig(subject)
  
  return {
    knowledgeWeaknesses: [],
    learningRecommendations: [{
      type: '基础巩固',
      priority: 'medium',
      description: `继续加强${subjectConfig.name}基础知识学习`,
      implementation: '保持每日练习习惯'
    }],
    practiceStrategies: [],
    nextLearningGoals: []
  }
}

/**
 * 🎯 基于学习建议生成定制化题目
 */
async function generateCustomizedQuestionsFromAdvice(advice, subject, grade, userId = null) {
  try {
    if (!advice.knowledgeWeaknesses || advice.knowledgeWeaknesses.length === 0) {
      console.log('⚠️ 没有发现知识薄弱点，跳过题目生成')
      return []
    }
    
    const customizedQuestions = []
    
    // 为每个薄弱点生成练习题
    for (const weakness of advice.knowledgeWeaknesses.slice(0, 3)) { // 最多处理3个薄弱点
      const questions = await generatePracticeQuestions(weakness, subject, grade, userId)
      customizedQuestions.push(...questions)
    }
    
    console.log(`✅ 基于学习建议生成${customizedQuestions.length}道定制化题目`)
    
    return customizedQuestions.slice(0, 10) // 限制最多10道题
    
  } catch (error) {
    console.error('❌ 定制化题目生成失败:', error)
    return []
  }
}

/**
 * 📊 提取频繁问题
 */
function extractFrequentIssues(interactionHistory) {
  const issueKeywords = {}
  
  interactionHistory
    .filter(item => item.role === 'student')
    .forEach(item => {
      const content = item.content.toLowerCase()
      
      // 识别常见问题关键词
      const keywords = ['不知道', '不会', '不懂', '怎么', '为什么', '帮我', '不理解']
      keywords.forEach(keyword => {
        if (content.includes(keyword)) {
          issueKeywords[keyword] = (issueKeywords[keyword] || 0) + 1
        }
      })
    })
  
  // 返回频次最高的3个问题
  return Object.entries(issueKeywords)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([keyword, count]) => ({ keyword, count }))
}

/**
 * 🔍 分析学习模式
 */
function analyzeLearningPatterns(interactionHistory) {
  const patterns = {
    preferredMode: 'chat', // 默认文字模式
    questionFrequency: 'low', // 提问频率
    independenceLevel: 'medium' // 独立性水平
  }
  
  const chatCount = interactionHistory.filter(item => item.mode === 'chat').length
  const voiceCount = interactionHistory.filter(item => item.mode === 'instant_voice').length
  
  // 判断偏好模式
  patterns.preferredMode = voiceCount > chatCount ? 'voice' : 'chat'
  
  // 判断提问频率
  const totalQuestions = interactionHistory.filter(item => item.role === 'student').length
  if (totalQuestions > 10) patterns.questionFrequency = 'high'
  else if (totalQuestions > 5) patterns.questionFrequency = 'medium'
  else patterns.questionFrequency = 'low'
  
  // 判断独立性（基于求助频率）
  const helpRequests = interactionHistory.filter(item => 
    item.role === 'student' && 
    (item.content.includes('帮我') || item.content.includes('不会') || item.content.includes('不知道'))
  ).length
  
  if (helpRequests > totalQuestions * 0.7) patterns.independenceLevel = 'low'
  else if (helpRequests > totalQuestions * 0.3) patterns.independenceLevel = 'medium'
  else patterns.independenceLevel = 'high'
  
  return patterns
}

/**
 * ❌ 错误答案指导接口 - 使用qwen turbo提供针对性指导
 */
router.post('/error-guidance', async (req, res) => {
  try {
    const { question, wrongAnswer, subject, grade, userId, planId } = req.body
    
    console.log('❌ 错误答案指导请求:', {
      question,
      wrongAnswer,
      subject,
      grade,
      userId: userId?.slice(0, 10) + '...'
    })
    
    // 构建错误指导的专门prompt
    const guidancePrompt = `你是一位耐心的小学${getSubjectName(subject)}老师，学生答错了题目。请分析错误原因并给出指导。

题目：${question}
学生答案：${wrongAnswer}
年级：${grade}年级
学科：${getSubjectName(subject)}

请按以下方式回复（控制在100字以内）：
1. 简短指出错误点
2. 提供正确的解题思路
3. 给出鼓励性建议

要求：
- 语言简洁易懂，符合${grade}年级学生理解水平
- 不要直接给出答案，而是引导思考
- 语气温和鼓励，不要责备
- 重点在于让学生理解方法`

    // 使用qwen turbo模型提供快速指导
    const API_CONFIG = {
      apiKey: process.env.DASHSCOPE_API_KEY || 'sk-a791758fe21c4a719b2c632d5345996f',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      timeout: 10000 // qwen turbo使用10秒超时，快速响应
    }
    
    console.log('🤖 调用qwen turbo生成错误指导...')
    
    const response = await axios.post(
      `${API_CONFIG.baseUrl}/chat/completions`,
      {
        model: 'qwen-turbo', // 使用qwen turbo模型，速度更快
        messages: [
          {
            role: 'system',
            content: '你是一位专业的小学教师，擅长分析学生错误并提供针对性指导。'
          },
          {
            role: 'user',
            content: guidancePrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
        top_p: 0.8
      },
      {
        headers: {
          'Authorization': `Bearer ${API_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: API_CONFIG.timeout
      }
    )
    
    if (response.data?.choices?.[0]?.message?.content) {
      const guidance = response.data.choices[0].message.content.trim()
      
      console.log('✅ qwen turbo错误指导生成成功')
      console.log('📝 指导内容预览:', guidance.substring(0, 50) + '...')
      
      // 记录错误指导事件（可选）
      try {
        const guidanceRecord = {
          userId: userId || 'anonymous',
          planId: planId || 'default',
          question,
          wrongAnswer,
          guidance,
          subject,
          grade,
          timestamp: new Date(),
          model: 'qwen-turbo',
          type: 'error_guidance'
        }
        
        // 可以选择是否保存指导记录
        console.log('📊 错误指导记录已生成（暂未保存到数据库）')
        
      } catch (recordError) {
        console.warn('⚠️ 错误指导记录保存失败:', recordError.message)
      }
      
      res.json({
        success: true,
        data: {
          guidance: guidance,
          model: 'qwen-turbo',
          timestamp: new Date().toISOString()
        },
        message: '错误指导生成成功'
      })
      
    } else {
      throw new Error('qwen turbo响应格式异常')
    }
    
  } catch (error) {
    console.error('❌ 错误指导生成失败:', error)
    
    // 提供fallback指导
    const fallbackGuidance = generateFallbackGuidance(req.body.subject, req.body.grade)
    
    res.json({
      success: true,
      data: {
        guidance: fallbackGuidance,
        model: 'fallback',
        timestamp: new Date().toISOString()
      },
      message: '使用备用指导'
    })
  }
})

/**
 * 生成备用错误指导（当AI服务不可用时）
 */
function generateFallbackGuidance(subject, grade) {
  const guidanceTemplates = {
    math: [
      '数学题要仔细看清楚数字和运算符号哦！',
      '试试重新计算一遍，一步一步来！',
      '检查一下计算过程，可能有小错误！'
    ],
    chinese: [
      '语文题要细心读题，理解题目意思！',
      '重新读一遍题目，找找关键信息！',
      '想想我们学过的知识，再试试看！'
    ],
    english: [
      '英语题要注意单词拼写和语法哦！',
      '回想一下我们学过的单词和句型！',
      '仔细看看题目要求，再想想答案！'
    ]
  }
  
  const templates = guidanceTemplates[subject] || guidanceTemplates.math
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)]
  
  return `${randomTemplate}不要着急，慢慢思考，你一定能做对的！`
}

/**
 * 获取学科中文名称
 */
function getSubjectName(subject) {
  const names = {
    math: '数学',
    chinese: '语文', 
    english: '英语'
  }
  return names[subject] || '数学'
}

/**
 * 🔍 调试接口：查看数据库中的所有学习记录
 */
router.get('/debug-records', async (req, res) => {
  try {
    console.log('🔍 调试接口：查询所有学习记录')
    
    const records = await LearningRecord.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
    
    console.log(`📊 找到 ${records.length} 条学习记录`)
    
    res.json({
      success: true,
      records: records,
      count: records.length,
      message: `找到 ${records.length} 条学习记录`
    })
    
  } catch (error) {
    console.error('❌ 查询学习记录失败:', error)
    res.status(500).json({
      success: false,
      message: '查询学习记录失败: ' + error.message
    })
  }
})

/**
 * 🔍 调试接口：查询特定用户的学习记录
 */
router.post('/query-user-records', async (req, res) => {
  try {
    const { userId, planId } = req.body
    console.log('🔍 调试接口：查询用户学习记录', { userId, planId })
    
    let query = {}
    if (userId) query.userId = userId
    if (planId) query.planId = planId
    
    const records = await LearningRecord.find(query)
      .sort({ createdAt: -1 })
      .lean()
    
    console.log(`📊 找到 ${records.length} 条匹配记录`)
    
    res.json({
      success: true,
      records: records,
      count: records.length,
      query: query,
      message: `找到 ${records.length} 条匹配记录`
    })
    
  } catch (error) {
    console.error('❌ 查询用户记录失败:', error)
    res.status(500).json({
      success: false,
      message: '查询用户记录失败: ' + error.message
    })
  }
})

module.exports = router
module.exports.getLearningRecordsByPlan = getLearningRecordsByPlan
module.exports.getSessionSummary = getSessionSummary
// 🔧 注释掉：不再需要导出内存存储
// module.exports.globalLearningRecords = globalLearningRecords
module.exports.sessionSummaries = sessionSummaries 