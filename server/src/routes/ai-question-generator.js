/**
 * AI题目生成路由
 * 基于千问大模型，根据学生学习行为和年级教材动态生成个性化题目
 */
const express = require('express')
const router = express.Router()

// AI模型配置 - 根据场景选择不同模型
const AI_MODELS = {
  // 实时聊天 - 快速响应
  CHAT: {
    model: 'qwen-plus',
    maxTokens: 800,
    temperature: 0.7,
    expectedResponseTime: '1-2秒'
  },
  
  // 题目生成 - 高质量
  QUESTION_GENERATION: {
    model: 'qwen-max',
    maxTokens: 2000,
    temperature: 0.8,
    expectedResponseTime: '3-8秒'
  },
  
  // 深度分析 - 最强推理
  DEEP_ANALYSIS: {
    model: 'qwen-max',
    maxTokens: 3000,
    temperature: 0.6,
    expectedResponseTime: '5-10秒'
  },
  
  // 快速辅助 - 极速响应
  QUICK_ASSIST: {
    model: 'qwen-turbo',
    maxTokens: 500,
    temperature: 0.5,
    expectedResponseTime: '0.5-1秒'
  }
}

/**
 * 根据场景获取AI模型配置
 */
function getModelConfig(scenario) {
  return AI_MODELS[scenario] || AI_MODELS.CHAT
}

/**
 * 调用千问大模型 - 支持多模型选择
 */
async function callQianwenModel(prompt, scenario = 'CHAT') {
  const config = getModelConfig(scenario)
  console.log(`🤖 使用${config.model}模型 (${scenario}场景，预期响应时间: ${config.expectedResponseTime})`)
  
  const startTime = Date.now()
  
  // 模拟千问API调用
  try {
    // 实际项目中这里会调用真实的千问API
    await new Promise(resolve => {
      // 根据模型类型模拟不同的响应时间
      let delay
      switch (config.model) {
        case 'qwen-turbo':
          delay = 500 + Math.random() * 1000 // 0.5-1.5秒
          break
        case 'qwen-plus':
          delay = 1000 + Math.random() * 2000 // 1-3秒
          break
        case 'qwen-max':
          delay = 3000 + Math.random() * 5000 // 3-8秒
          break
        default:
          delay = 1500
      }
      setTimeout(resolve, delay)
    })
    
    const responseTime = Date.now() - startTime
    console.log(`⚡ ${config.model}模型响应时间: ${responseTime}ms`)
    
    return {
      success: true,
      model: config.model,
      responseTime,
      choices: [{
        message: {
          content: generateMockResponse(prompt, scenario)
        }
      }]
    }
  } catch (error) {
    console.error(`❌ ${config.model}模型调用失败:`, error)
    throw error
  }
}

/**
 * 基于OCR分析结果生成相关练习题
 * POST /api/ai-generator/generate-practice
 */
router.post('/generate-practice', async (req, res) => {
  try {
    const { 
      ocrData,           // OCR识别的题目内容
      studentProfile,    // 学生档案（年级、学科偏好、学习历史）
      learningHistory,   // 最近的学习记录
      weakPoints        // 薄弱知识点
    } = req.body

    console.log('🎯 AI生成练习题请求:', {
      student: studentProfile?.grade,
      subject: ocrData?.subject,
      weakPointsCount: weakPoints?.length || 0
    })

    // 构建AI提示词
    const prompt = buildGenerationPrompt(ocrData, studentProfile, learningHistory, weakPoints)
    
    // 调用千问大模型
    const aiResponse = await callQianwenModel(prompt, 'QUESTION_GENERATION')
    
    // 解析AI响应，提取题目
    const aiGenerationResult = parseAIResponse(aiResponse.choices[0].message.content, ocrData, studentProfile)
    
    // 保存生成的题目到数据库
    const savedQuestions = await saveGeneratedQuestions(aiGenerationResult.questions, {
      studentId: studentProfile.userId,
      generationContext: {
        triggerType: 'OCR识别',
        description: `基于${ocrData.subject}学科的OCR内容生成`,
        ocrContent: ocrData.analyzedContent,
        weakPoints: weakPoints?.map(wp => wp.knowledgePoint) || []
      }
    })

    // 生成AI学习洞察
    const aiInsights = generateLearningInsights(weakPoints, learningHistory, ocrData.subject)

    res.json({
      success: true,
      message: `AI成功生成${savedQuestions.length}道个性化练习题`,
      data: {
        questions: savedQuestions,
        generationContext: {
          triggerType: 'OCR识别',
          description: `基于${ocrData.subject}学科的OCR内容生成`,
          weakPoints: weakPoints?.map(wp => wp.knowledgePoint) || []
        },
        aiInsights: aiInsights,
        strategy: aiGenerationResult.strategy,
        tips: aiGenerationResult.tips,
        totalTime: aiGenerationResult.totalTime,
        timeAllocation: aiGenerationResult.timeAllocation,
        model: aiResponse.model,
        responseTime: aiResponse.responseTime,
        metadata: {
          generationTime: new Date().toISOString(),
          modelUsed: 'qwen-max',
          promptTokens: prompt.length,
          responseTokens: aiResponse.choices[0].message.content.length
        }
      }
    })

  } catch (error) {
    console.error('❌ AI生成练习题失败:', error)
    res.status(500).json({
      success: false,
      message: 'AI生成练习题失败',
      error: error.message,
      fallback: '请尝试使用传统题库模式'
    })
  }
})

/**
 * 重新生成题目（当现有题目效果不佳时）
 * POST /api/ai-generator/regenerate
 */
router.post('/regenerate', async (req, res) => {
  try {
    const { questionId, reason, currentAccuracy } = req.body

    console.log('🔄 重新生成题目请求:', { questionId, reason, currentAccuracy })

    // 获取原题目信息
    const originalQuestion = await getQuestionById(questionId)
    if (!originalQuestion) {
      throw new Error('原题目不存在')
    }

    // 基于失败原因调整生成策略
    const adjustedPrompt = buildRegenerationPrompt(originalQuestion, reason, currentAccuracy)
    
    // 调用AI重新生成
    const aiResponse = await callQianwenModel(adjustedPrompt, 'QUESTION_GENERATION')
    const newQuestions = parseAIResponse(aiResponse.choices[0].message.content, originalQuestion.subject, originalQuestion.grade)

    res.json({
      success: true,
      message: 'AI重新生成题目请求已处理',
      data: {
        newQuestions: newQuestions,
        reason: reason,
        improvement: getImprovementStrategy(reason)
      }
    })

  } catch (error) {
    console.error('❌ 重新生成题目失败:', error)
    res.status(500).json({
      success: false,
      message: '重新生成题目失败',
      error: error.message
    })
  }
})

/**
 * 获取生成历史
 * GET /api/ai-generator/history
 */
router.get('/history', async (req, res) => {
  try {
    const { studentId, subject, limit = 20, page = 1 } = req.query

    const history = await getGenerationHistory({
      studentId,
      subject,
      limit: parseInt(limit),
      page: parseInt(page)
    })

    res.json({
      success: true,
      data: history.questions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(history.total / limit),
        pageSize: parseInt(limit),
        totalItems: history.total
      }
    })

  } catch (error) {
    console.error('❌ 获取生成历史失败:', error)
    res.status(500).json({
      success: false,
      message: '获取生成历史失败',
      error: error.message
    })
  }
})

/**
 * 获取生成统计
 * GET /api/ai-generator/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { dateFrom, dateTo, subject } = req.query

    const stats = await getGenerationStats({
      dateFrom,
      dateTo,
      subject
    })

    res.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('❌ 获取生成统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取生成统计失败',
      error: error.message
    })
  }
})

/**
 * 测试AI生成
 * POST /api/ai-generator/test
 */
router.post('/test', async (req, res) => {
  try {
    const testData = req.body || {
      ocrData: {
        analyzedContent: '3 × 4 = ?',
        subject: 'math',
        grade: 3,
        knowledgePoints: ['乘法运算']
      },
      studentProfile: {
        userId: 'test_student',
        grade: 3,
        preferredSubjects: ['math'],
        averageAccuracy: 0.75
      },
      learningHistory: [],
      weakPoints: [
        { knowledgePoint: '乘法运算', errorRate: 0.4 }
      ]
    }

    console.log('🧪 测试AI生成，测试数据:', testData)

    // 使用模拟数据测试
    const mockResponse = generateMockQuestions(testData)

    res.json({
      success: true,
      message: 'AI生成测试成功',
      data: mockResponse
    })

  } catch (error) {
    console.error('❌ AI生成测试失败:', error)
    res.status(500).json({
      success: false,
      message: 'AI生成测试失败',
      error: error.message
    })
  }
})

/**
 * AI聊天答疑接口 - 使用快速模型
 * POST /api/ai-generator/chat-tutoring
 */
router.post('/chat-tutoring', async (req, res) => {
  try {
    const { question, studentInput, chatHistory, urgency = 'normal' } = req.body
    
    // 根据紧急程度选择模型
    let scenario
    if (urgency === 'urgent' || studentInput?.length < 20) {
      scenario = 'QUICK_ASSIST' // 简单问题用turbo
    } else {
      scenario = 'CHAT' // 一般对话用plus
    }
    
    console.log(`💬 AI聊天答疑 (${scenario}模式):`, {
      question: question?.substring(0, 50) + '...',
      studentInput: studentInput?.substring(0, 30) + '...',
      urgency
    })
    
    // 构建聊天prompt
    const prompt = buildChatPrompt(question, studentInput, chatHistory)
    
    // 调用快速响应模型
    const aiResponse = await callQianwenModel(prompt, scenario)
    
    const responseData = {
      success: true,
      aiResponse: aiResponse.choices[0].message.content,
      model: aiResponse.model,
      responseTime: aiResponse.responseTime,
      scenario,
      timestamp: new Date().toISOString()
    }
    
    res.json(responseData)
    
  } catch (error) {
    console.error('❌ AI聊天答疑失败:', error)
    res.status(500).json({
      success: false,
      message: 'AI聊天服务暂时不可用，请稍后重试',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * 生成深度学习分析报告 - 使用最强模型
 * POST /api/ai-generator/generate-report
 */
router.post('/generate-report', async (req, res) => {
  try {
    const { learningData, timeRange = '7d' } = req.body
    
    console.log('📊 生成深度分析报告:', {
      dataPoints: learningData?.length || 0,
      timeRange
    })
    
    // 构建分析prompt
    const prompt = buildAnalysisPrompt(learningData, timeRange)
    
    // 使用最强模型进行深度分析
    const aiResponse = await callQianwenModel(prompt, 'DEEP_ANALYSIS')
    
    // 解析分析结果
    const analysisResult = parseAnalysisResponse(aiResponse.choices[0].message.content)
    
    res.json({
      success: true,
      data: {
        ...analysisResult,
        model: aiResponse.model,
        responseTime: aiResponse.responseTime,
        generatedAt: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ 深度分析报告生成失败:', error)
    res.status(500).json({
      success: false,
      message: '分析报告生成失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// ==================== 辅助函数 ====================

/**
 * 构建AI生成提示词
 */
function buildGenerationPrompt(ocrData, studentProfile, learningHistory, weakPoints) {
  const grade = studentProfile?.grade || 3
  const subject = ocrData?.subject || 'math'
  const subjectNames = { math: '数学', chinese: '语文', english: '英语' }
  
  let prompt = `你是一位专业的小学${subjectNames[subject]}老师，请根据以下信息为学生生成个性化练习题：

学生信息：
- 年级：${grade}年级
- 学科：${subjectNames[subject]}
- 学习风格：${studentProfile?.learningStyle || '视觉型'}
- 平均正确率：${(studentProfile?.averageAccuracy * 100 || 75).toFixed(0)}%

当前学习内容（OCR识别）：
"${ocrData?.analyzedContent || ''}"

`

  // 添加薄弱知识点信息
  if (weakPoints && weakPoints.length > 0) {
    prompt += `薄弱知识点：
${weakPoints.map(wp => `- ${wp.knowledgePoint}（错误率：${(wp.errorRate * 100).toFixed(0)}%）`).join('\n')}

`
  }

  // 添加学习历史信息
  if (learningHistory && learningHistory.length > 0) {
    const recentErrors = learningHistory
      .slice(0, 3)
      .filter(h => h.accuracy < 0.7)
      .map(h => h.topicType || '未知题型')
    
    if (recentErrors.length > 0) {
      prompt += `最近遇到困难的题型：${recentErrors.join('、')}

`
    }
  }

  prompt += `请生成3-5道循序渐进的练习题，要求：

1. 内容要求：
   - 符合${grade}年级${subjectNames[subject]}教学大纲
   - 与OCR识别的内容相关
   - 针对学生的薄弱点进行强化
   - 难度递增：简单→中等→稍难

2. 题目格式：
   - 每道题包含：题目内容、选项（如果是选择题）、正确答案、详细解析
   - 标注难度等级：easy/medium/hard
   - 标注对应知识点
   - 估计解题时间（分钟）

3. 教学原则：
   - 启发式引导，不直接给答案
   - 图文并茂，适合小学生理解
   - 联系生活实际，增加趣味性

请按以下JSON格式返回：
{
  "questions": [
    {
      "content": "题目内容",
      "type": "choice/calculation/fill_blank/application",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "answer": "正确答案",
      "explanation": "详细解析",
      "difficulty": "easy/medium/hard",
      "knowledgePoints": ["知识点1", "知识点2"],
      "estimatedTime": 2,
      "hints": ["提示1", "提示2"]
    }
  ]
}`

  return prompt
}

/**
 * 解析AI响应 - 修复版本
 */
function parseAIResponse(aiResponse, ocrData, studentProfile) {
  try {
    console.log('🔍 正在解析AI响应，响应类型:', typeof aiResponse)
    console.log('📝 AI响应内容预览:', typeof aiResponse === 'string' ? aiResponse.substring(0, 100) + '...' : '[对象]')
    
    let parsed
    
    // 🔑 修复：检查响应类型并正确处理
    if (typeof aiResponse === 'string') {
      // 如果是字符串，尝试JSON解析
      parsed = JSON.parse(aiResponse)
    } else if (typeof aiResponse === 'object' && aiResponse !== null) {
      // 如果已经是对象，直接使用
      parsed = aiResponse
    } else {
      throw new Error(`无效的AI响应类型: ${typeof aiResponse}`)
    }
    
    console.log('✅ AI响应解析成功，题目数量:', parsed.questions?.length || 0)
    
    // 验证解析后的数据结构
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('AI响应缺少questions数组')
    }
    
    // 为每个题目添加元数据
    const questions = parsed.questions.map((q, index) => ({
      ...q,
      id: `ai_${Date.now()}_${index}`,
      isAIGenerated: true,
      subject: ocrData?.subject || 'math',
      grade: studentProfile?.grade || 3,
      generatedAt: new Date().toISOString(),
      studentId: studentProfile?.userId,
      usageStats: {
        attempts: 0,
        accuracy: 0,
        avgTime: q.estimatedTime || 2
      }
    }))

    // 返回完整的AI数据，包括策略和建议
    return {
      questions: questions,
      totalTime: parsed.totalTime || questions.reduce((sum, q) => sum + (q.estimatedTime || 2), 0),
      timeAllocation: parsed.timeAllocation || questions.map(q => q.estimatedTime || 2),
      strategy: parsed.strategy || '采用循序渐进的学习方法，先从基础练习开始',
      tips: parsed.tips || ['认真审题', '仔细计算', '检查答案']
    }
    
  } catch (error) {
    console.error('❌ 解析AI响应失败:', error)
    console.log('🔧 使用备用题目生成方案')
    
    // 返回备用题目
    const fallbackQuestions = generateFallbackQuestions(ocrData, studentProfile)
    return {
      questions: fallbackQuestions,
      totalTime: fallbackQuestions.length * 2,
      timeAllocation: fallbackQuestions.map(() => 2),
      strategy: '采用循序渐进的学习方法，先从基础练习开始',
      tips: ['认真审题', '仔细计算', '检查答案']
    }
  }
}

/**
 * 保存生成的题目（模拟数据库操作）
 */
async function saveGeneratedQuestions(questions, metadata) {
  // TODO: 实现真实的数据库保存
  console.log('💾 保存AI生成的题目到数据库...')
  
  // 模拟保存延迟
  await new Promise(resolve => setTimeout(resolve, 200))
  
  // 为题目添加数据库ID和生成上下文
  return questions.map(q => ({
    ...q,
    _id: `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    generationContext: metadata.generationContext,
    createdAt: new Date().toISOString()
  }))
}

/**
 * 生成学习洞察
 */
function generateLearningInsights(weakPoints, learningHistory, subject) {
  const insights = []
  
  if (weakPoints && weakPoints.length > 0) {
    const topWeakPoint = weakPoints[0]
    insights.push(`发现您在"${topWeakPoint.knowledgePoint}"方面需要加强，错误率达${(topWeakPoint.errorRate * 100).toFixed(0)}%`)
  }
  
  if (learningHistory && learningHistory.length > 0) {
    const avgAccuracy = learningHistory.reduce((sum, h) => sum + (h.accuracy || 0), 0) / learningHistory.length
    if (avgAccuracy < 0.7) {
      insights.push('建议您先巩固基础知识，再逐步提高难度')
    } else if (avgAccuracy > 0.85) {
      insights.push('您的基础很扎实，可以尝试一些有挑战性的题目')
    }
  }
  
  // 添加学科特定建议
  const subjectTips = {
    math: '数学学习要多做练习，培养逻辑思维',
    chinese: '语文学习要多读多写，增加词汇量',
    english: '英语学习要多听多说，培养语感'
  }
  
  if (subjectTips[subject]) {
    insights.push(subjectTips[subject])
  }
  
  return insights
}

/**
 * 生成模拟题目（用于测试）
 */
function generateMockQuestions(testData) {
  const { ocrData, studentProfile } = testData
  
  return {
    questions: [
      {
        id: 'mock_1',
        content: "根据您拍照的内容，我们为您准备了这道练习题：如果3×4=12，那么12÷3等于多少？",
        type: "calculation",
        answer: "4",
        explanation: "除法是乘法的逆运算。因为3×4=12，所以12÷3=4。",
        difficulty: "easy",
        knowledgePoints: ["除法运算", "乘除法关系"],
        estimatedTime: 2,
        hints: ["想想除法和乘法的关系", "12里面有几个3？"],
        isAIGenerated: true,
        subject: ocrData?.subject || 'math',
        grade: studentProfile?.grade || 3,
        generatedAt: new Date().toISOString(),
        usageStats: {
          attempts: 0,
          accuracy: 0,
          avgTime: 2
        }
      },
      {
        id: 'mock_2',
        content: "小红买了4包糖，每包有3颗，一共买了多少颗糖？",
        type: "application",
        answer: "12颗",
        explanation: "这是乘法应用题。4包×3颗/包=12颗糖。",
        difficulty: "medium",
        knowledgePoints: ["乘法应用", "生活实际"],
        estimatedTime: 3,
        hints: ["每包3颗，4包是多少颗？", "用乘法计算"],
        isAIGenerated: true,
        subject: ocrData?.subject || 'math',
        grade: studentProfile?.grade || 3,
        generatedAt: new Date().toISOString(),
        usageStats: {
          attempts: 0,
          accuracy: 0,
          avgTime: 3
        }
      }
    ],
    generationContext: {
      triggerType: 'API测试',
      description: '基于测试数据生成的模拟题目',
      weakPoints: testData.weakPoints?.map(wp => wp.knowledgePoint) || []
    },
    aiInsights: [
      '这是AI生成的测试题目，旨在验证系统功能',
      '实际使用时会根据真实的学习数据生成更精准的题目'
    ]
  }
}

/**
 * 生成备用题目
 */
function generateFallbackQuestions(ocrData, studentProfile) {
  return [
    {
      id: `fallback_${Date.now()}`,
      content: "请完成这道基础练习题：2 + 3 = ?",
      type: "calculation",
      answer: "5",
      explanation: "这是基础加法：2 + 3 = 5",
      difficulty: "easy",
      knowledgePoints: ["基础加法"],
      estimatedTime: 1,
      isAIGenerated: true,
      subject: ocrData?.subject || 'math',
      grade: studentProfile?.grade || 3
    }
  ]
}

/**
 * 生成模拟AI响应 - 根据场景和提示词返回相应的JSON格式响应
 */
function generateMockResponse(prompt, scenario) {
  console.log(`🎭 生成${scenario}场景的模拟AI响应`)
  
  // 根据不同场景生成不同格式的响应
  switch (scenario) {
    case 'QUESTION_GENERATION':
      // 🔑 修复：确保返回正确格式的JSON字符串
      const questionResponse = {
        questions: [
          {
            content: "小明买了3包糖果，每包有8颗，一共买了多少颗糖果？",
            type: "application",
            options: [],
            answer: "24颗",
            explanation: "这是一道乘法应用题。3包糖果，每包8颗，用乘法计算：3 × 8 = 24颗。",
            difficulty: "medium",
            knowledgePoints: ["乘法运算", "应用题"],
            estimatedTime: 3,
            hints: ["想一想，每包8颗，3包是多少颗？", "可以用乘法来计算"]
          },
          {
            content: "计算：15 ÷ 3 = ?",
            type: "calculation",
            options: [],
            answer: "5",
            explanation: "15除以3等于5。可以这样想：5 × 3 = 15，所以15 ÷ 3 = 5。",
            difficulty: "easy",
            knowledgePoints: ["除法运算"],
            estimatedTime: 2,
            hints: ["想想几乘以3等于15？", "除法是乘法的逆运算"]
          },
          {
            content: "小红有20元钱，买了一本书花了12元，还剩多少钱？",
            type: "application",
            options: [],
            answer: "8元",
            explanation: "这是减法应用题。小红原来有20元，花了12元，用减法计算：20 - 12 = 8元。",
            difficulty: "easy",
            knowledgePoints: ["减法运算", "应用题"],
            estimatedTime: 2,
            hints: ["原来有20元，花了12元，用什么方法计算？", "想想减法的意义"]
          }
        ],
        totalTime: 7,
        timeAllocation: [3, 2, 2],
        strategy: "根据您当前的学习水平，我为您安排了由易到难的练习顺序。先从应用题开始培养数学思维，再巩固基础运算，最后通过实际问题加深理解。",
        tips: [
          "做应用题时要仔细读题，找出关键信息",
          "计算时可以先在心里想一想答案大概是多少",
          "遇到困难不要着急，可以画图或用实物来帮助理解"
        ]
      }
      
      console.log('🎯 生成QUESTION_GENERATION响应，题目数量:', questionResponse.questions.length)
      return JSON.stringify(questionResponse)
      
    case 'CHAT':
    case 'QUICK_ASSIST':
      return "你好！我是你的AI小老师。我看到你提出了问题，让我来帮助你一步步解决。请告诉我你遇到了什么困难，我会耐心引导你找到答案的。"
      
    case 'DEEP_ANALYSIS':
      return JSON.stringify({
        overallAssessment: "学生整体表现良好，在基础运算方面较为扎实",
        strengths: ["基础加减法熟练", "对简单应用题理解正确"],
        weaknesses: ["乘除法运算需要加强", "复杂应用题分析能力有待提高"],
        improvementSuggestions: {
          immediate: ["加强乘法口诀练习", "多做简单的乘除法题目"],
          longTerm: ["培养数学思维能力", "提高解题分析能力"]
        },
        focusAreas: ["乘除法运算", "应用题分析"],
        practiceRecommendations: ["每天练习10道乘除法", "结合生活实际理解应用题"]
      })
      
    default:
      return "AI服务正在为您分析，请稍等..."
  }
}

// 还需要添加其他缺失的函数
function buildRegenerationPrompt(originalQuestion, reason, currentAccuracy) {
  return `请基于原题目重新生成一道类似的题目：${originalQuestion.content}。原因：${reason}，当前正确率：${currentAccuracy}`
}

function getImprovementStrategy(reason) {
  const strategies = {
    'too_easy': '增加题目难度，添加更多计算步骤',
    'too_hard': '降低题目难度，提供更多提示',
    'unclear': '优化题目表述，使语言更清晰'
  }
  return strategies[reason] || '根据学生反馈调整题目'
}

function buildChatPrompt(question, studentInput, chatHistory) {
  let prompt = `你是一位耐心的小学老师，正在与学生对话。`
  
  if (question) {
    prompt += `\n学生遇到的题目：${question}`
  }
  
  if (studentInput) {
    prompt += `\n学生的想法/回答：${studentInput}`
  }
  
  if (chatHistory && chatHistory.length > 0) {
    prompt += `\n之前的对话历史：${chatHistory.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}`
  }
  
  prompt += `\n请以鼓励和引导的方式回复学生，不要直接给出答案，而是引导学生思考。`
  
  return prompt
}

function buildAnalysisPrompt(learningData, timeRange) {
  return `请分析学生在${timeRange}内的学习数据：${JSON.stringify(learningData)}`
}

function parseAnalysisResponse(aiResponse) {
  try {
    return JSON.parse(aiResponse)
  } catch (error) {
    return {
      overallAssessment: aiResponse,
      strengths: ["数据分析中..."],
      weaknesses: ["数据分析中..."],
      improvementSuggestions: {
        immediate: ["数据分析中..."],
        longTerm: ["数据分析中..."]
      }
    }
  }
}

// 模拟数据库查询函数
async function getQuestionById(id) {
  return {
    id: id,
    subject: 'math',
    grade: 3,
    content: '模拟题目内容'
  }
}

async function getGenerationHistory(params) {
  return {
    questions: [],
    total: 0
  }
}

async function getGenerationStats(params) {
  return {
    totalGenerated: 156,
    todayGenerated: 12,
    avgAccuracy: 0.78,
    activeStudents: 23
  }
}

module.exports = router