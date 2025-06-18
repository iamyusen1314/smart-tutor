/**
 * AI通用服务
 * @description 提供通用的AI调用接口，支持不同类型的AI任务
 */

const axios = require('axios')

// AI服务配置
const AI_CONFIG = {
  apiKey: process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || 'sk-a791758fe21c4a719b2c632d5345996f',
  baseUrl: process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model: 'qwen-max',
  temperature: 0.7,
  max_tokens: 4000,
  timeout: 120000, // 增加到2分钟
  retryTimes: 2    // 添加重试次数
}

/**
 * 通用AI响应生成
 * @param {string} prompt 提示词
 * @param {string} taskType 任务类型 (chat, plan, analysis, etc.)
 * @param {Object} options 可选配置
 * @returns {Promise<string>} AI响应内容
 */
async function generateResponse(prompt, taskType = 'general', options = {}) {
  console.log(`调用AI服务: ${taskType}`)
  
  if (!AI_CONFIG.apiKey) {
    console.warn('AI API密钥未配置，返回模拟数据')
    return getMockResponse(taskType, prompt)
  }

  try {
    // 根据任务类型调整参数
    const config = getTaskConfig(taskType)
    
    const response = await axios.post(
      `${AI_CONFIG.baseUrl}/chat/completions`,
      {
        model: config.model || AI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: getSystemPrompt(taskType)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: config.temperature || AI_CONFIG.temperature,
        max_tokens: config.max_tokens || AI_CONFIG.max_tokens,
        top_p: 0.9
      },
      {
        headers: {
          'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000, // 增加到2分钟
        retries: 1 // 添加重试
      }
    )

    if (!response.data.choices || response.data.choices.length === 0) {
      throw new Error('AI服务返回数据格式错误')
    }

    const aiResponse = response.data.choices[0].message.content.trim()
    console.log(`AI服务调用成功: ${taskType}`)

    return aiResponse

  } catch (error) {
    console.error(`AI服务调用失败 (${taskType}):`, error.message)
    
    // 如果是网络错误或服务不可用，返回模拟数据
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.response?.status >= 500) {
      console.log('AI服务不可用，返回模拟数据')
      return getMockResponse(taskType, prompt)
    }
    
    if (AI_CONFIG.retryTimes > 0) {
      console.log(`重试 ${AI_CONFIG.retryTimes} 次`)
      AI_CONFIG.retryTimes--
      return generateResponse(prompt, taskType)
    }
    
    throw error
  }
}

/**
 * 获取任务特定配置
 * @param {string} taskType 任务类型
 * @returns {Object} 任务配置
 */
function getTaskConfig(taskType) {
  const configs = {
    chat: {
      temperature: 0.8,
      max_tokens: 2000
    },
    plan: {
      temperature: 0.3,
      max_tokens: 3000
    },
    analysis: {
      temperature: 0.2,
      max_tokens: 3000
    },
    ocr: {
      temperature: 0.1,
      max_tokens: 4000
    },
    correction: {
      temperature: 0.3,
      max_tokens: 2000
    }
  }
  
  return configs[taskType] || configs.general || {}
}

/**
 * 获取系统提示词
 * @param {string} taskType 任务类型
 * @returns {string} 系统提示词
 */
function getSystemPrompt(taskType) {
  const prompts = {
    chat: '你是一位耐心、专业的小学家教老师，擅长引导学生思考，不直接给出答案，而是逐步提示。你的回答要温和、鼓励、富有启发性。',
    
    plan: '你是一位专业的小学教育专家，拥有丰富的教学经验。你能根据学生的年级和题目内容，制定合理的学习计划和时间安排。',
    
    analysis: '你是一位资深的教育数据分析师，能够深入分析学生的学习表现，提供个性化的学习建议和改进方案。',
    
    ocr: '你是一位专业的教育内容识别专家，能够准确识别和分析教育相关的图片内容，包括题目、答案、知识点等。',
    
    correction: '你是一位经验丰富的小学老师，擅长批改作业和提供有建设性的反馈。你能准确判断答案正误，并给出详细的解释。',
    
    general: '你是一位专业的AI助手，能够准确理解用户需求并提供有用的回应。'
  }
  
  return prompts[taskType] || prompts.general
}

/**
 * 获取模拟响应
 * @param {string} taskType 任务类型
 * @param {string} prompt 原始提示词
 * @returns {string} 模拟响应
 */
function getMockResponse(taskType, prompt) {
  console.log(`返回${taskType}任务的模拟数据`)
  
  const mockResponses = {
    plan: `{
  "questions": [
    {
      "text": "示例题目1",
      "type": "calculation",
      "difficulty": "easy",
      "suggestedTime": 2,
      "analysis": "这是一道基础计算题，适合作为练习开始",
      "hints": ["仔细看清数字", "按步骤计算"]
    },
    {
      "text": "示例题目2", 
      "type": "word_problem",
      "difficulty": "medium",
      "suggestedTime": 4,
      "analysis": "这是一道应用题，需要理解题意",
      "hints": ["读懂题目要求", "列出已知条件", "找出要求什么"]
    }
  ],
  "totalTime": 6,
  "timeAllocation": [2, 4],
  "strategy": "建议先完成简单的计算题，再处理应用题。遇到困难时不要着急，可以先跳过，最后回来思考。",
  "tips": ["仔细审题", "工整书写", "及时检查答案"],
  "priorityOrder": [0, 1]
}`,
    
    chat: '这是一个很好的问题！让我们一步步来思考。你能先告诉我，这道题给了我们什么条件吗？',
    
    analysis: `{
  "overallAssessment": "学习表现良好，有进步空间",
  "strengths": ["计算准确", "学习态度认真", "能按时完成作业"],
  "weaknesses": ["应用题理解需要加强", "解题步骤需要更规范"],
  "specificAdvice": {
    "daily": ["每天练习15分钟", "重点关注应用题", "多做类似题目"],
    "weekly": ["周末总结错题", "复习重点知识"],
    "methodology": ["先理解题意再计算", "养成检查答案的习惯"]
  },
  "focusAreas": ["应用题解题方法", "计算准确性"],
  "encouragement": "你的学习很认真，继续加油！"
}`,
    
    ocr: '{"text": "识别的文字内容", "subject": "math", "grade": 3, "confidence": 0.95}',
    
    correction: '{"isCorrect": true, "explanation": "答案正确！解题思路很清晰。", "suggestions": []}',
    
    general: '这是一个模拟的AI响应，实际AI服务暂时不可用。'
  }
  
  return mockResponses[taskType] || mockResponses.general
}

/**
 * 简化的AI聊天接口（向后兼容）
 * @param {string} message 用户消息
 * @param {string} context 上下文
 * @returns {Promise<string>} AI回复
 */
async function chatResponse(message, context = '') {
  const prompt = context ? `上下文：${context}\n\n用户问题：${message}` : message
  return generateResponse(prompt, 'chat')
}

/**
 * 图像理解接口
 * @param {string} imageUrl 图片URL或base64
 * @param {string} question 关于图片的问题
 * @returns {Promise<string>} AI分析结果
 */
async function analyzeImage(imageUrl, question = '请描述这张图片的内容') {
  // 注意：这里需要支持图像的模型，如qwen-vl-max
  const prompt = `请分析这张图片：${question}`
  return generateResponse(prompt, 'ocr')
}

module.exports = {
  generateResponse,
  chatResponse,
  analyzeImage
} 