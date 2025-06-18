/**
 * 🔐 数据结构校验工具
 * 提供API请求参数验证、响应数据格式验证等功能
 */

/**
 * 🔧 基础字段验证器
 */
const validators = {
  // 用户ID验证
  userId: (value) => {
    if (!value || typeof value !== 'string') return false
    if (value.length < 3 || value.length > 50) return false
    return /^[a-zA-Z0-9_-]+$/.test(value)
  },
  
  // 学科验证
  subject: (value) => {
    const validSubjects = ['math', 'chinese', 'english', 'science']
    return validSubjects.includes(value)
  },
  
  // 年级验证
  grade: (value) => {
    const grade = parseInt(value)
    return Number.isInteger(grade) && grade >= 1 && grade <= 6
  },
  
  // 计划ID验证 - 🔧 修复：允许更短的planId（如mock、test等）
  planId: (value) => {
    if (!value || typeof value !== 'string') return false
    return value.length >= 3 && value.length <= 100 && /^[a-zA-Z0-9_-]+$/.test(value)
  },
  
  // 题目文本验证
  question: (value) => {
    if (!value || typeof value !== 'string') return false
    return value.length >= 5 && value.length <= 1000
  },
  
  // 学生输入验证
  studentInput: (value) => {
    if (!value || typeof value !== 'string') return false
    return value.length >= 1 && value.length <= 500
  },
  
  // 学习步骤验证 - 🔧 修复：支持更多学习步骤类型
  currentStep: (value) => {
    const validSteps = [
      'understanding',    // 理解阶段
      'analyzing',       // 分析阶段
      'calculation',     // 计算阶段
      'thinking',        // 思考阶段
      'solving',         // 解答阶段
      'verification',    // 验证阶段
      'checking',        // 检查阶段
      'completed',       // 完成阶段
      'correct',         // 答案正确 🔧 新增
      'incorrect',       // 答案错误 🔧 新增
      'understood',      // 已理解 🔧 新增
      'hint_requested',  // 请求提示
      'voice_chat',      // 语音聊天
      'ai_tutoring',     // AI辅导模式 🔧 新增
      'guidance_needed', // 需要引导 🔧 新增
      'correction_needed', // 需要纠正 🔧 新增
      'voice_input',     // 语音输入
      'voice_response',  // 语音回复
      'error',           // 错误状态
      'retry'            // 重试状态
    ]
    return !value || validSteps.includes(value)
  },
  
  // 物品ID验证
  itemId: (value) => {
    if (!value || typeof value !== 'string') return false
    return /^[a-z_]+$/.test(value) && value.length <= 50
  },
  
  // 数量验证
  quantity: (value) => {
    const num = parseInt(value)
    return Number.isInteger(num) && num >= 1 && num <= 100
  },
  
  // 弱点类型验证
  targetWeakness: (value) => {
    if (!value || typeof value !== 'string') return false
    return value.length >= 2 && value.length <= 100
  }
}

/**
 * 🔧 AI聊天请求验证
 * @param {Object} requestData 请求数据
 * @returns {Object} 验证结果
 */
function validateAIChatRequest(requestData) {
  const errors = []
  const { question, studentInput, subject, grade, userId, planId, currentStep } = requestData
  
  // 必需字段验证
  if (!validators.question(question)) {
    errors.push('question字段无效：必须是5-1000字符的有效题目')
  }
  
  if (!validators.studentInput(studentInput)) {
    errors.push('studentInput字段无效：必须是1-500字符的有效输入')
  }
  
  if (!validators.subject(subject)) {
    errors.push('subject字段无效：必须是math/chinese/english/science之一')
  }
  
  if (!validators.grade(grade)) {
    errors.push('grade字段无效：必须是1-6之间的整数')
  }
  
  // 可选字段验证
  if (userId && !validators.userId(userId)) {
    errors.push('userId字段无效：必须是3-50字符的字母数字组合')
  }
  
  if (planId && !validators.planId(planId)) {
    errors.push('planId字段无效：必须是3-100字符的有效计划ID')
  }
  
  if (currentStep && !validators.currentStep(currentStep)) {
    errors.push('currentStep字段无效：必须是有效的学习步骤')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: sanitizeAIChatData(requestData)
  }
}

/**
 * 🔧 游戏中心请求验证
 * @param {Object} requestData 请求数据
 * @returns {Object} 验证结果
 */
function validateGameRequest(requestData) {
  const errors = []
  const { userId, itemId, quantity } = requestData
  
  // 用户ID验证（必需）
  if (!validators.userId(userId)) {
    errors.push('userId字段无效：必须是3-50字符的字母数字组合')
  }
  
  // 物品购买验证
  if (itemId !== undefined && !validators.itemId(itemId)) {
    errors.push('itemId字段无效：必须是有效的物品ID')
  }
  
  if (quantity !== undefined && !validators.quantity(quantity)) {
    errors.push('quantity字段无效：必须是1-100之间的整数')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: sanitizeGameData(requestData)
  }
}

/**
 * 🔧 专题练习生成验证
 * @param {Object} requestData 请求数据
 * @returns {Object} 验证结果
 */
function validatePracticeGenerationRequest(requestData) {
  const errors = []
  const { userId, targetWeakness, subject, grade } = requestData
  
  // 必需字段验证
  if (!validators.userId(userId)) {
    errors.push('userId字段无效：必须是3-50字符的字母数字组合')
  }
  
  if (!validators.targetWeakness(targetWeakness)) {
    errors.push('targetWeakness字段无效：必须是2-100字符的有效弱点描述')
  }
  
  if (!validators.subject(subject)) {
    errors.push('subject字段无效：必须是math/chinese/english/science之一')
  }
  
  if (!validators.grade(grade)) {
    errors.push('grade字段无效：必须是1-6之间的整数')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: sanitizePracticeData(requestData)
  }
}

/**
 * 🔧 学习报告请求验证
 * @param {Object} requestData 请求数据
 * @returns {Object} 验证结果
 */
function validateReportRequest(requestData) {
  const errors = []
  const { planId, userId } = requestData
  
  // 计划ID验证（可选）- 🔧 修复：允许不传planId，此时返回最新学习记录
  if (planId && !validators.planId(planId)) {
    errors.push('planId字段无效：必须是3-100字符的有效计划ID')
  }
  
  // 用户ID验证（可选）
  if (userId && !validators.userId(userId)) {
    errors.push('userId字段无效：必须是3-50字符的字母数字组合')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: sanitizeReportData(requestData)
  }
}

/**
 * 🔧 数据清理函数
 */
function sanitizeAIChatData(data) {
  return {
    question: String(data.question || '').trim().slice(0, 1000),
    studentInput: String(data.studentInput || '').trim().slice(0, 500),
    subject: String(data.subject || 'math').toLowerCase(),
    grade: parseInt(data.grade) || 1,
    userId: String(data.userId || '').trim() || `anonymous_${Date.now()}`,
    planId: String(data.planId || '').trim() || null,
    currentStep: String(data.currentStep || '').trim() || null
  }
}

function sanitizeGameData(data) {
  return {
    userId: String(data.userId || '').trim(),
    itemId: String(data.itemId || '').trim() || null,
    quantity: parseInt(data.quantity) || 1
  }
}

function sanitizePracticeData(data) {
  return {
    userId: String(data.userId || '').trim(),
    targetWeakness: String(data.targetWeakness || '').trim(),
    subject: String(data.subject || 'math').toLowerCase(),
    grade: parseInt(data.grade) || 1,
    planId: String(data.planId || '').trim() || null
  }
}

function sanitizeReportData(data) {
  return {
    planId: data.planId ? String(data.planId).trim() : null, // 🔧 修复：空planId设为null而不是空字符串
    userId: String(data.userId || '').trim() || null
  }
}

/**
 * 🔧 响应数据验证
 * @param {Object} responseData 响应数据
 * @param {string} apiType API类型
 * @returns {Object} 验证结果
 */
function validateResponseData(responseData, apiType) {
  const errors = []
  
  try {
    // 检查基本结构
    if (!responseData || typeof responseData !== 'object') {
      errors.push('响应数据必须是有效的对象')
      return { isValid: false, errors }
    }
    
    // 检查success字段
    if (typeof responseData.success !== 'boolean') {
      errors.push('success字段必须是布尔值')
    }
    
    // 根据API类型验证特定字段
    switch (apiType) {
      case 'ai-chat':
        validateAIChatResponse(responseData, errors)
        break
      case 'game':
        validateGameResponse(responseData, errors)
        break
      case 'report':
        validateReportResponse(responseData, errors)
        break
    }
    
  } catch (error) {
    errors.push(`响应数据验证异常: ${error.message}`)
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 🔧 AI聊天响应验证
 */
function validateAIChatResponse(responseData, errors) {
  if (responseData.success) {
    if (!responseData.data || typeof responseData.data !== 'object') {
      errors.push('成功响应必须包含data对象')
    } else {
      const { aiResponse, nextStep, isComplete } = responseData.data
      
      if (!aiResponse || typeof aiResponse !== 'string') {
        errors.push('aiResponse必须是有效字符串')
      }
      
      if (nextStep && typeof nextStep !== 'string') {
        errors.push('nextStep必须是字符串或null')
      }
      
      if (typeof isComplete !== 'boolean') {
        errors.push('isComplete必须是布尔值')
      }
    }
  }
}

/**
 * 🔧 游戏响应验证
 */
function validateGameResponse(responseData, errors) {
  if (responseData.success && responseData.data) {
    // 验证游戏档案结构
    const gameProfile = responseData.data
    
    if (typeof gameProfile.level !== 'number') {
      errors.push('level必须是数字')
    }
    
    if (typeof gameProfile.experience !== 'number') {
      errors.push('experience必须是数字')
    }
    
    if (typeof gameProfile.coins !== 'number') {
      errors.push('coins必须是数字')
    }
  }
}

/**
 * 🔧 报告响应验证
 */
function validateReportResponse(responseData, errors) {
  if (responseData.success && responseData.data) {
    const reportData = responseData.data
    
    if (typeof reportData.accuracy !== 'number') {
      errors.push('accuracy必须是数字')
    }
    
    if (!Array.isArray(reportData.questions)) {
      errors.push('questions必须是数组')
    }
  }
}

/**
 * 🔧 中间件：API请求验证
 * @param {string} validationType 验证类型
 * @returns {Function} Express中间件
 */
function createValidationMiddleware(validationType) {
  return (req, res, next) => {
    let validationResult
    
    // 合并query和body参数
    const requestData = { ...req.query, ...req.body }
    
    switch (validationType) {
      case 'ai-chat':
        validationResult = validateAIChatRequest(requestData)
        break
      case 'game':
        validationResult = validateGameRequest(requestData)
        break
      case 'practice':
        validationResult = validatePracticeGenerationRequest(requestData)
        break
      case 'report':
        validationResult = validateReportRequest(requestData)
        break
      default:
        return res.status(400).json({
          success: false,
          error: '未知的验证类型',
          timestamp: Date.now()
        })
    }
    
    if (!validationResult.isValid) {
      console.error(`❌ 数据验证失败 (${validationType}):`, validationResult.errors)
      return res.status(400).json({
        success: false,
        error: '请求数据验证失败',
        details: validationResult.errors,
        timestamp: Date.now()
      })
    }
    
    // 将清理后的数据附加到请求对象
    req.validatedData = validationResult.sanitizedData
    console.log(`✅ 数据验证通过 (${validationType})`)
    
    next()
  }
}

module.exports = {
  // 验证函数
  validateAIChatRequest,
  validateGameRequest,
  validatePracticeGenerationRequest,
  validateReportRequest,
  validateResponseData,
  
  // 中间件
  createValidationMiddleware,
  
  // 工具函数
  validators,
  sanitizeAIChatData,
  sanitizeGameData,
  sanitizePracticeData,
  sanitizeReportData
} 