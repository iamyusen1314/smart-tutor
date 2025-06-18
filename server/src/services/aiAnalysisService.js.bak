/**
 * AI学习分析服务
 * @description 使用千问大模型生成个性化学习建议和分析报告
 */

const axios = require('axios')

// AI分析配置
const AI_ANALYSIS_CONFIG = {
  apiKey: process.env.DASHSCOPE_API_KEY || 'sk-a791758fe21c4a719b2c632d5345996f',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model: 'qwen-max',
  temperature: 0.3, // 稍高一些，保持分析的多样性
  max_tokens: 3000,
  timeout: 180000 // 增加到3分钟
}

/**
 * 生成个性化学习建议
 * @param {Object} learningData 学习数据
 * @returns {Promise<Object>} AI生成的学习建议
 */
async function generatePersonalizedAdvice(learningData) {
  const {
    userId,
    subject,
    grade,
    recentAccuracy,
    timeSpent,
    commonMistakes,
    learningHistory,
    weakPoints
  } = learningData

  const prompt = buildAnalysisPrompt({
    type: 'learning_advice',
    subject,
    grade,
    recentAccuracy,
    timeSpent,
    commonMistakes,
    learningHistory,
    weakPoints
  })

  try {
    const aiResponse = await callAIAnalysis(prompt)
    return parseAIAdvice(aiResponse, subject)
  } catch (error) {
    console.error('AI学习建议生成失败:', error)
    throw error
  }
}

/**
 * 生成知识点分析报告
 * @param {Object} studyData 学习数据
 * @returns {Promise<Object>} AI生成的知识点分析
 */
async function generateKnowledgeAnalysis(studyData) {
  const {
    subject,
    grade,
    wrongAnswers,
    correctAnswers,
    questionTypes,
    timeSpentPerQuestion
  } = studyData

  const prompt = buildAnalysisPrompt({
    type: 'knowledge_analysis',
    subject,
    grade,
    wrongAnswers,
    correctAnswers,
    questionTypes,
    timeSpentPerQuestion
  })

  try {
    const aiResponse = await callAIAnalysis(prompt)
    return parseKnowledgeAnalysis(aiResponse, subject)
  } catch (error) {
    console.error('AI知识点分析失败:', error)
    throw error
  }
}

/**
 * 生成下次学习计划
 * @param {Object} planData 计划数据
 * @returns {Promise<Object>} AI生成的学习计划
 */
async function generateLearningPlan(planData) {
  const {
    userId,
    currentLevel,
    weeklyGoal,
    availableTime,
    preferredSubjects,
    weakAreas,
    recentProgress
  } = planData

  const prompt = buildAnalysisPrompt({
    type: 'learning_plan',
    currentLevel,
    weeklyGoal,
    availableTime,
    preferredSubjects,
    weakAreas,
    recentProgress
  })

  try {
    const aiResponse = await callAIAnalysis(prompt)
    return parseLearningPlan(aiResponse)
  } catch (error) {
    console.error('AI学习计划生成失败:', error)
    throw error
  }
}

/**
 * 构建分析提示词
 * @param {Object} params 分析参数
 * @returns {string} 分析提示词
 */
function buildAnalysisPrompt(params) {
  const { type, subject, grade } = params
  
  const basePrompt = `你是一位具有20年教学经验的资深小学教育专家和学习分析师。请基于提供的学习数据，生成专业、个性化、可操作的分析和建议。

【分析要求】
1. 分析必须客观、准确、有针对性
2. 建议要具体可操作，适合${grade || '小学'}年级学生
3. 语言要温和鼓励，避免负面表达
4. 必须考虑儿童心理发展特点
5. 回复格式要结构化，便于解析

`

  switch (type) {
    case 'learning_advice':
      return basePrompt + buildLearningAdvicePrompt(params)
    
    case 'knowledge_analysis':
      return basePrompt + buildKnowledgeAnalysisPrompt(params)
    
    case 'learning_plan':
      return basePrompt + buildLearningPlanPrompt(params)
    
    default:
      throw new Error(`未知的分析类型: ${type}`)
  }
}

/**
 * 构建学习建议提示词
 */
function buildLearningAdvicePrompt(params) {
  const { subject, grade, recentAccuracy, timeSpent, commonMistakes, learningHistory, weakPoints } = params
  
  return `
【任务】生成个性化学习建议

【学生基本信息】
- 学科：${getSubjectName(subject)}
- 年级：${grade}年级

【学习表现数据】
- 近期正确率：${recentAccuracy}%
- 平均学习时间：${timeSpent}分钟/次
- 常见错误：${Array.isArray(commonMistakes) ? commonMistakes.join('、') : '暂无'}
- 薄弱环节：${Array.isArray(weakPoints) ? weakPoints.join('、') : '暂无'}

【学习历史】
${learningHistory || '暂无详细历史记录'}

【输出要求】
请严格按照以下JSON格式输出分析结果：

{
  "overallAssessment": "总体评价（80字以内）",
  "strengths": ["优势1", "优势2", "优势3"],
  "weaknesses": ["需要改进的地方1", "需要改进的地方2"],
  "specificAdvice": {
    "daily": ["每日建议1", "每日建议2", "每日建议3"],
    "weekly": ["周度建议1", "周度建议2"],
    "methodology": ["学习方法建议1", "学习方法建议2"]
  },
  "focusAreas": ["重点关注知识点1", "重点关注知识点2"],
  "encouragement": "鼓励话语（50字以内）"
}
`
}

/**
 * 构建知识点分析提示词
 */
function buildKnowledgeAnalysisPrompt(params) {
  const { subject, grade, wrongAnswers, correctAnswers, questionTypes } = params
  
  return `
【任务】生成知识点掌握情况分析

【学习数据】
- 学科：${getSubjectName(subject)}
- 年级：${grade}年级
- 错误题目：${Array.isArray(wrongAnswers) ? wrongAnswers.length : 0}题
- 正确题目：${Array.isArray(correctAnswers) ? correctAnswers.length : 0}题
- 题目类型分布：${JSON.stringify(questionTypes || {})}

【错误题目详情】
${Array.isArray(wrongAnswers) ? wrongAnswers.map((q, i) => `${i+1}. ${q.question || q} - 错误原因：${q.reason || '未知'}`).join('\n') : '暂无'}

【输出要求】
请严格按照以下JSON格式输出分析结果：

{
  "knowledgePointAnalysis": {
    "masteredPoints": ["已掌握的知识点1", "已掌握的知识点2"],
    "weakPoints": ["薄弱知识点1", "薄弱知识点2"],
    "criticalPoints": ["急需加强的知识点1", "急需加强的知识点2"]
  },
  "mistakePatterns": ["错误模式1", "错误模式2"],
  "improvementSuggestions": {
    "immediate": ["立即改进建议1", "立即改进建议2"],
    "longTerm": ["长期改进建议1", "长期改进建议2"]
  },
  "practiceRecommendations": ["练习建议1", "练习建议2", "练习建议3"]
}
`
}

/**
 * 构建学习计划提示词
 */
function buildLearningPlanPrompt(params) {
  const { currentLevel, weeklyGoal, availableTime, preferredSubjects, weakAreas, recentProgress } = params
  
  return `
【任务】制定个性化学习计划

【学生情况】
- 当前水平：${currentLevel || '中等'}
- 周度目标：${weeklyGoal || '稳步提升'}
- 可用时间：每周${availableTime || 5}小时
- 偏好学科：${Array.isArray(preferredSubjects) ? preferredSubjects.join('、') : '暂无特别偏好'}
- 薄弱领域：${Array.isArray(weakAreas) ? weakAreas.join('、') : '暂无'}

【近期进步情况】
${recentProgress || '暂无详细记录'}

【输出要求】
请严格按照以下JSON格式输出学习计划：

{
  "weeklyPlan": {
    "monday": {"subject": "学科", "duration": "时长", "focus": "重点内容"},
    "tuesday": {"subject": "学科", "duration": "时长", "focus": "重点内容"},
    "wednesday": {"subject": "学科", "duration": "时长", "focus": "重点内容"},
    "thursday": {"subject": "学科", "duration": "时长", "focus": "重点内容"},
    "friday": {"subject": "学科", "duration": "时长", "focus": "重点内容"},
    "saturday": {"subject": "学科", "duration": "时长", "focus": "重点内容"},
    "sunday": {"subject": "休息或复习", "duration": "时长", "focus": "总结回顾"}
  },
  "priorityGoals": ["本周优先目标1", "本周优先目标2"],
  "dailyRoutine": ["每日固定安排1", "每日固定安排2"],
  "milestones": {
    "week1": "第一周目标",
    "week2": "第二周目标",
    "month1": "一个月目标"
  }
}
`
}

/**
 * 调用AI分析服务
 * @param {string} prompt 分析提示词
 * @returns {Promise<string>} AI分析结果
 */
async function callAIAnalysis(prompt) {
  if (!AI_ANALYSIS_CONFIG.apiKey) {
    throw new Error('缺少AI分析API配置')
  }

  console.log('调用AI学习分析服务...')

  try {
    const response = await axios.post(
      `${AI_ANALYSIS_CONFIG.baseUrl}/chat/completions`,
      {
        model: AI_ANALYSIS_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的教育数据分析师和小学教学专家，擅长个性化学习分析和建议生成。你的分析必须准确、专业、具有可操作性。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: AI_ANALYSIS_CONFIG.temperature,
        max_tokens: AI_ANALYSIS_CONFIG.max_tokens,
        top_p: 0.9
      },
      {
        headers: {
          'Authorization': `Bearer ${AI_ANALYSIS_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: AI_ANALYSIS_CONFIG.timeout // 使用配置中的超时时间
      }
    )

    if (!response.data.choices || response.data.choices.length === 0) {
      throw new Error('AI分析服务返回数据格式错误')
    }

    const aiResponse = response.data.choices[0].message.content.trim()
    console.log('AI分析结果生成成功')

    return aiResponse

  } catch (error) {
    console.error('AI分析服务调用失败:', error.message)
    throw error
  }
}

/**
 * 解析AI学习建议
 * @param {string} aiResponse AI原始回复
 * @param {string} subject 学科
 * @returns {Object} 解析后的建议
 */
function parseAIAdvice(aiResponse, subject) {
  try {
    // 尝试解析JSON
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        ...parsed,
        source: 'ai_generated',
        subject,
        timestamp: new Date().toISOString()
      }
    }
  } catch (error) {
    console.warn('AI建议JSON解析失败，使用文本解析:', error.message)
  }

  // 文本解析作为备选方案
  return {
    overallAssessment: aiResponse.substring(0, 200),
    strengths: ['AI分析正在处理中...'],
    weaknesses: ['AI分析正在处理中...'],
    specificAdvice: {
      daily: ['请稍后查看详细建议'],
      weekly: ['请稍后查看详细建议'],
      methodology: ['请稍后查看详细建议']
    },
    focusAreas: ['待AI分析完成'],
    encouragement: '继续加油学习！',
    source: 'ai_generated_fallback',
    subject,
    timestamp: new Date().toISOString()
  }
}

/**
 * 解析AI知识点分析
 * @param {string} aiResponse AI原始回复
 * @param {string} subject 学科
 * @returns {Object} 解析后的分析
 */
function parseKnowledgeAnalysis(aiResponse, subject) {
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        ...parsed,
        source: 'ai_generated',
        subject,
        timestamp: new Date().toISOString()
      }
    }
  } catch (error) {
    console.warn('AI知识点分析JSON解析失败:', error.message)
  }

  // 备选方案
  return {
    knowledgePointAnalysis: {
      masteredPoints: ['AI分析中...'],
      weakPoints: ['AI分析中...'],
      criticalPoints: ['AI分析中...']
    },
    mistakePatterns: ['AI分析中...'],
    improvementSuggestions: {
      immediate: ['AI分析中...'],
      longTerm: ['AI分析中...']
    },
    practiceRecommendations: ['AI分析中...'],
    source: 'ai_generated_fallback',
    subject,
    timestamp: new Date().toISOString()
  }
}

/**
 * 解析AI学习计划
 * @param {string} aiResponse AI原始回复
 * @returns {Object} 解析后的计划
 */
function parseLearningPlan(aiResponse) {
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        ...parsed,
        source: 'ai_generated',
        timestamp: new Date().toISOString()
      }
    }
  } catch (error) {
    console.warn('AI学习计划JSON解析失败:', error.message)
  }

  // 备选方案
  return {
    weeklyPlan: {
      monday: {subject: "数学", duration: "30分钟", focus: "基础练习"},
      tuesday: {subject: "语文", duration: "30分钟", focus: "阅读理解"},
      wednesday: {subject: "英语", duration: "30分钟", focus: "单词学习"},
      thursday: {subject: "数学", duration: "30分钟", focus: "应用题"},
      friday: {subject: "语文", duration: "30分钟", focus: "写作练习"},
      saturday: {subject: "复习", duration: "45分钟", focus: "本周总结"},
      sunday: {subject: "休息", duration: "自由安排", focus: "放松娱乐"}
    },
    priorityGoals: ['AI计划生成中...'],
    dailyRoutine: ['AI计划生成中...'],
    milestones: {
      week1: 'AI计划生成中...',
      week2: 'AI计划生成中...',
      month1: 'AI计划生成中...'
    },
    source: 'ai_generated_fallback',
    timestamp: new Date().toISOString()
  }
}

/**
 * 获取学科中文名称
 * @param {string} subject 学科英文名
 * @returns {string} 学科中文名
 */
function getSubjectName(subject) {
  const subjectNames = {
    math: '数学',
    chinese: '语文',  
    english: '英语'
  }
  return subjectNames[subject] || subject
}

module.exports = {
  generatePersonalizedAdvice,
  generateKnowledgeAnalysis,
  generateLearningPlan
} 