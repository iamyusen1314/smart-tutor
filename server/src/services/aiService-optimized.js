/**
 * AI通用服务 - 优化版本
 * @description 提供通用的AI调用接口，支持不同类型的AI任务
 */

const axios = require('axios')

// AI服务配置
const AI_CONFIG = {
  apiKey: process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || 'sk-a791758fe21c4a719b2c632d5345996f',
  baseUrl: process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model: 'qwen-plus', // 使用更快的模型
  temperature: 0.7,
  max_tokens: 4000,
  timeout: 30000, // 减少到30秒
  retryTimes: 2
}

/**
 * 通用AI响应生成 - 优化版本
 * @param {string} prompt 提示词
 * @param {string} taskType 任务类型 (chat, plan, analysis, etc.)
 * @param {Object} options 可选配置
 * @returns {Promise<string>} AI响应内容
 */
async function generateResponse(prompt, taskType = 'general', options = {}) {
  console.log(`🤖 调用AI服务: ${taskType}`)
  
  if (!AI_CONFIG.apiKey) {
    console.warn('⚠️ AI API密钥未配置，返回模拟数据')
    return getMockResponse(taskType, prompt)
  }

  // 尝试快速优先模式
  const fastMode = options.fastMode !== false
  let currentModel = fastMode ? 'qwen-turbo' : (options.model || AI_CONFIG.model)
  
  for (let attempt = 0; attempt <= AI_CONFIG.retryTimes; attempt++) {
    try {
      console.log(`📡 第${attempt + 1}次尝试，使用模型: ${currentModel}`)
      
      // 根据任务类型调整参数
      const config = getTaskConfig(taskType)
      
      const response = await axios.post(
        `${AI_CONFIG.baseUrl}/chat/completions`,
        {
          model: currentModel,
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
          timeout: fastMode ? 20000 : AI_CONFIG.timeout // 快速模式使用更短超时
        }
      )

      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('AI服务返回数据格式错误')
      }

      const aiResponse = response.data.choices[0].message.content.trim()
      console.log(`✅ AI服务调用成功: ${taskType}，模型: ${currentModel}`)
      return aiResponse

    } catch (error) {
      console.error(`❌ AI服务调用失败 (${taskType}, 第${attempt + 1}次尝试):`, error.message)
      
      // 如果是超时且还有重试机会，尝试更快的模型
      if ((error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') && attempt < AI_CONFIG.retryTimes) {
        if (currentModel === 'qwen-max') {
          currentModel = 'qwen-plus'
          console.log('🔄 超时，切换到更快的模型: qwen-plus')
          continue
        } else if (currentModel === 'qwen-plus') {
          currentModel = 'qwen-turbo'
          console.log('🔄 超时，切换到最快的模型: qwen-turbo')
          continue
        }
      }
      
      // 最后一次尝试失败，返回模拟数据
      if (attempt === AI_CONFIG.retryTimes) {
        console.log('🎭 AI服务失败，使用传统方法生成数据')
        return getMockResponse(taskType, prompt)
      }
    }
  }
}

/**
 * 获取任务特定配置
 */
function getTaskConfig(taskType) {
  const configs = {
    chat: {
      temperature: 0.8,
      max_tokens: 1500
    },
    plan: {
      temperature: 0.3,
      max_tokens: 2500
    },
    analysis: {
      temperature: 0.2,
      max_tokens: 2000
    },
    ocr: {
      temperature: 0.1,
      max_tokens: 3000
    },
    correction: {
      temperature: 0.3,
      max_tokens: 1500
    }
  }
  
  return configs[taskType] || {}
}

/**
 * 获取系统提示词
 */
function getSystemPrompt(taskType) {
  const prompts = {
    chat: '你是一位耐心、专业的小学家教老师，擅长引导学生思考，不直接给出答案，而是逐步提示。',
    
    plan: '你是一位专业的小学教育专家，请简洁高效地制定学习计划。回复必须是有效的JSON格式。',
    
    analysis: '你是一位资深的教育数据分析师，能够快速分析学生表现并提供建议。',
    
    ocr: '你是一位专业的教育内容识别专家，能够准确识别教育相关的图片内容。',
    
    correction: '你是一位经验丰富的小学老师，能快速判断答案正误并给出解释。',
    
    general: '你是一位专业的AI助手，请简洁准确地回答问题。'
  }
  
  return prompts[taskType] || prompts.general
}

/**
 * 获取模拟响应 - 优化版本
 */
function getMockResponse(taskType, prompt) {
  console.log(`🎭 返回${taskType}任务的模拟数据`)
  
  const mockResponses = {
    plan: `{
  "questions": [
    {
      "text": "第一道题目",
      "type": "基础计算",
      "difficulty": "easy",
      "suggestedTime": 3,
      "analysis": "这是一道基础练习题，帮助巩固计算能力",
      "hints": ["认真看清数字", "按步骤计算", "记得检查答案"]
    },
    {
      "text": "第二道题目",
      "type": "应用题",
      "difficulty": "medium",
      "suggestedTime": 5,
      "analysis": "这道应用题需要理解题意并列式计算",
      "hints": ["仔细读题", "找出关键信息", "列出算式"]
    }
  ],
  "totalTime": 8,
  "timeAllocation": [3, 5],
  "strategy": "建议先完成基础计算题建立信心，再处理应用题。遇到困难可以先跳过，最后回来思考。",
  "tips": ["保持耐心", "仔细审题", "工整书写", "及时检查"],
  "priorityOrder": [0, 1]
}`,
    
    chat: '这是一个很好的问题！让我们一步步来思考。你能先告诉我，题目给了我们什么信息吗？',
    
    analysis: `{
  "overallAssessment": "学习表现不错，继续努力",
  "strengths": ["学习态度认真", "基础知识掌握较好"],
  "weaknesses": ["解题速度需要提升", "应用题理解有待加强"],
  "specificAdvice": {
    "daily": ["每天练习20分钟", "重点练习薄弱环节"],
    "weekly": ["周末复习重点内容", "整理错题"],
    "methodology": ["先理解再计算", "养成检查习惯"]
  },
  "focusAreas": ["计算准确性", "应用题理解"],
  "encouragement": "你的进步很明显，继续加油！"
}`,
    
    general: '这是一个模拟响应，AI服务暂时不可用。'
  }
  
  return mockResponses[taskType] || mockResponses.general
}

/**
 * 快速聊天接口
 */
async function chatResponse(message, context = '') {
  const prompt = context ? `上下文：${context}\n\n用户问题：${message}` : message
  return generateResponse(prompt, 'chat', { fastMode: true })
}

/**
 * 快速计划生成
 */
async function generatePlan(prompt) {
  return generateResponse(prompt, 'plan', { fastMode: false, model: 'qwen-plus' })
}

module.exports = {
  generateResponse,
  generatePlan,
  chatResponse
} 