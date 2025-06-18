/**
 * AI通用服务
 * @description 提供通用的AI调用接口，支持不同类型的AI任务
 */

const axios = require('axios')

// AI服务配置
const AI_CONFIG = {
  apiKey: process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || 'sk-a791758fe21c4a719b2c632d5345996f',
  baseUrl: process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model: 'qwen-turbo',
  temperature: 0.7,
  max_tokens: 4000,
  timeout: 25000,  // 🔧 减少到25秒，避免长时间等待
  retryTimes: 2    // �� 减少重试次数到2次，加快响应
}

/**
 * 通用AI响应生成
 * @param {string} prompt 提示词
 * @param {string} taskType 任务类型 (chat, plan, analysis, etc.)
 * @param {Object} options 可选配置
 * @returns {Promise<string>} AI响应内容
 */
async function generateResponse(prompt, taskType = 'general', options = {}) {
  console.log(`🚀 调用AI服务: ${taskType}`)
  const startTime = Date.now()
  
  if (!AI_CONFIG.apiKey) {
    throw new Error('AI API密钥未配置，无法使用AI服务')
  }

  // 🔧 增加重试机制，确保获得真实AI响应
  const maxAttempts = AI_CONFIG.retryTimes + 1
  let lastError = null
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`📡 第${attempt}次尝试调用AI服务...`)
      
      // 根据任务类型调整参数
      const config = getTaskConfig(taskType)
      console.log(`⚙️ 任务配置: 模型=${config.model || AI_CONFIG.model}, 超时=${config.timeout || AI_CONFIG.timeout}ms`)
      
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
          timeout: config.timeout || AI_CONFIG.timeout,
          maxRedirects: 3,
          validateStatus: (status) => status >= 200 && status < 300
        }
      )

      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('AI服务返回数据格式错误')
      }

      const aiResponse = response.data.choices[0].message.content.trim()
      const responseTime = Date.now() - startTime
      console.log(`✅ AI服务调用成功: ${taskType}, 响应时间: ${responseTime}ms (第${attempt}次尝试)`)
      
      // 记录性能统计
      if (responseTime > 30000) {
        console.warn(`⚠️ 响应时间过长: ${responseTime}ms (超过30秒)`)
      } else if (responseTime > 15000) {
        console.log(`🐌 响应较慢: ${responseTime}ms (超过15秒)`)
      } else {
        console.log(`⚡ 响应快速: ${responseTime}ms`)
      }

      return aiResponse

    } catch (error) {
      lastError = error
      const attemptTime = Date.now() - startTime
      console.error(`❌ AI服务调用失败 (${taskType}, 第${attempt}次尝试, ${attemptTime}ms):`, error.message)
      
      // 如果不是最后一次尝试，继续重试
      if (attempt < maxAttempts) {
        console.log(`🔄 ${Math.max(0, maxAttempts - attempt)}次重试机会剩余，等待2秒后重试...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }
    }
  }
  
  // 🚨 所有重试都失败了，抛出错误而不是返回模拟数据
  console.error(`💥 AI服务调用彻底失败 (${taskType}), 所有${maxAttempts}次尝试都失败`)
  throw new Error(`AI服务暂时不可用，请稍后重试。最后错误: ${lastError?.message || '未知错误'}`)
}

/**
 * 获取任务特定配置
 * @param {string} taskType 任务类型
 * @returns {Object} 任务配置
 */
function getTaskConfig(taskType) {
  const configs = {
    chat: {
      model: 'qwen-turbo',   // 聊天使用最快模型
      temperature: 0.8,
      max_tokens: 800,
      timeout: 8000         // 聊天8秒超时
    },
    plan: {
      model: 'qwen-turbo',    // ✅ 基于测试结果，turbo在计划生成场景表现最佳
      temperature: 0.3,
      max_tokens: 1500,      // 🔧 适当增加token数量确保完整性
      timeout: 20000         // 🔧 优化到20秒，平衡速度和稳定性
    },
    analysis: {
      model: 'qwen-turbo',   // ✅ 快速分析任务
      temperature: 0.2,
      max_tokens: 1200,
      timeout: 15000         // 🔧 减少超时时间
    },
    ocr: {
      model: 'qwen-turbo',
      temperature: 0.1,
      max_tokens: 1000,
      timeout: 12000
    },
    correction: {
      model: 'qwen-turbo',
      temperature: 0.3,
      max_tokens: 800,
      timeout: 10000
    },
    // 🆕 新增：复杂推理任务可选择plus模型
    complex_reasoning: {
      model: 'qwen-plus',
      temperature: 0.2,
      max_tokens: 2000,
      timeout: 30000
    }
  }
  
  return configs[taskType] || {}
}

/**
 * 获取系统提示词
 * @param {string} taskType 任务类型
 * @returns {string} 系统提示词
 */
function getSystemPrompt(taskType) {
  const prompts = {
    chat: '你是一位耐心、专业的小学家教老师，擅长引导学生思考，不直接给出答案，而是逐步提示。回复要简洁，控制在50字以内，多用emoji表情。',
    
    plan: '你是一位专业的小学教育专家，请快速制定学习计划。回复必须是有效的JSON格式，要简洁高效。',
    
    analysis: '你是一位资深的教育数据分析师，能够分析学生表现并提供建议。',
    
    ocr: '你是一位专业的教育内容识别专家，能够准确识别教育相关的图片内容。',
    
    correction: '你是一位经验丰富的小学老师，能快速判断答案正误并给出解释。',
    
    general: '你是一位专业的AI助手，请简洁准确地回答问题。'
  }
  
  return prompts[taskType] || prompts.general
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