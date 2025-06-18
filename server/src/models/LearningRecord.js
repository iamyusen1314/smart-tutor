/**
 * 学习记录数据模型
 * @description 存储学生的学习记录，用于生成学习报告和统计分析
 */

const mongoose = require('mongoose')

/**
 * 学习记录数据模式
 */
const learningRecordSchema = new mongoose.Schema({
  // 记录唯一标识
  recordId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // 关联用户
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // 关联学习计划
  planId: {
    type: String,
    required: true,
    index: true
  },
  
  // 题目信息
  question: {
    type: String,
    required: true,
    maxlength: [500, '题目内容不能超过500个字符']
  },
  
  // 学生输入（原始）
  studentInput: {
    type: String,
    required: true,
    maxlength: [1000, '学生输入不能超过1000个字符']
  },
  
  // 首次答案（用于统计）
  firstAnswer: {
    type: String,
    maxlength: [200, '首次答案不能超过200个字符']
  },
  
  // 最终答案
  finalAnswer: {
    type: String,
    maxlength: [200, '最终答案不能超过200个字符']
  },
  
  // 答案正确性
  isCorrect: {
    type: Boolean,
    default: null  // null表示未作答或AI交互，true/false表示正确/错误
  },
  
  // AI响应
  aiResponse: {
    type: String,
    maxlength: [2000, 'AI响应不能超过2000个字符']
  },
  
  // 学科信息
  subject: {
    type: String,
    enum: ['math', 'chinese', 'english', 'general'],
    default: 'math',
    index: true
  },
  
  // 年级
  grade: {
    type: Number,
    min: 1,
    max: 6,
    default: 1
  },
  
  // 答案验证详情
  answerVerification: {
    studentAnswer: { type: mongoose.Schema.Types.Mixed },
    correctAnswer: { type: mongoose.Schema.Types.Mixed },
    reason: { type: String },
    explanation: { type: String }
  },
  
  // AI交互记录
  aiInteractions: [{
    type: { type: String }, // hint, encouragement, explanation等
    content: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  
  // 学习上下文
  learningContext: {
    currentStep: { type: String },
    sessionId: { type: String },
    questionType: { type: String },
    difficultyLevel: { type: String, enum: ['easy', 'normal', 'hard'] }
  },
  
  // ✅ 添加交互模式和统计标记字段
  currentMode: {
    type: String,
    enum: ['answer', 'chat', 'instant_voice'],
    required: true,
    index: true
  },
  
  countedInStatistics: {
    type: Boolean,
    required: true,
    default: false,
    index: true
  },
  
  // 时间记录
  timestamps: {
    started: { type: Date, default: Date.now },
    completed: { type: Date },
    duration: { type: Number } // 毫秒
  },
  
  // 元数据
  metadata: {
    ipAddress: { type: String },
    userAgent: { type: String },
    deviceInfo: { type: Object }
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v
      delete ret._id
      return ret
    }
  },
  toObject: { virtuals: true }
})

/**
 * 虚拟属性 - 记录ID
 */
learningRecordSchema.virtual('id').get(function() {
  return this._id.toHexString()
})

/**
 * 虚拟属性 - 是否为有效答案（用于统计）
 */
learningRecordSchema.virtual('isValidAnswer').get(function() {
  return this.isCorrect !== null
})

/**
 * 虚拟属性 - 答题用时（秒）
 */
learningRecordSchema.virtual('answerTimeSeconds').get(function() {
  return this.timestamps.duration ? Math.round(this.timestamps.duration / 1000) : 0
})

/**
 * 索引定义
 */
learningRecordSchema.index({ userId: 1, planId: 1 })
learningRecordSchema.index({ userId: 1, createdAt: -1 })
learningRecordSchema.index({ planId: 1, createdAt: -1 })
learningRecordSchema.index({ subject: 1, grade: 1 })
learningRecordSchema.index({ isCorrect: 1 })
learningRecordSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }) // 90天后自动删除

/**
 * 中间件 - 保存前处理
 */
learningRecordSchema.pre('save', function(next) {
  // 如果是新记录，设置完成时间
  if (this.isNew && !this.timestamps.completed) {
    this.timestamps.completed = new Date()
  }
  
  // 计算答题用时
  if (this.timestamps.started && this.timestamps.completed) {
    this.timestamps.duration = this.timestamps.completed - this.timestamps.started
  }
  
  next()
})

/**
 * 实例方法 - 标记为正确
 * @param {*} studentAnswer - 学生答案
 * @param {*} correctAnswer - 正确答案
 * @param {string} reason - 验证原因
 */
learningRecordSchema.methods.markCorrect = function(studentAnswer, correctAnswer, reason = '') {
  this.isCorrect = true
  this.answerVerification = {
    studentAnswer,
    correctAnswer,
    reason,
    explanation: '答案正确！'
  }
  return this.save()
}

/**
 * 实例方法 - 标记为错误
 * @param {*} studentAnswer - 学生答案
 * @param {*} correctAnswer - 正确答案
 * @param {string} reason - 验证原因
 */
learningRecordSchema.methods.markIncorrect = function(studentAnswer, correctAnswer, reason = '') {
  this.isCorrect = false
  this.answerVerification = {
    studentAnswer,
    correctAnswer,
    reason,
    explanation: '答案错误，请再试一次。'
  }
  return this.save()
}

/**
 * 实例方法 - 添加AI交互
 * @param {string} type - 交互类型
 * @param {string} content - 交互内容
 */
learningRecordSchema.methods.addAIInteraction = function(type, content) {
  this.aiInteractions.push({
    type,
    content,
    timestamp: new Date()
  })
  return this.save()
}

/**
 * 静态方法 - 创建学习记录
 * @param {Object} recordData - 记录数据
 * @returns {Promise<LearningRecord>} 创建的记录对象
 */
learningRecordSchema.statics.createRecord = function(recordData) {
  const recordId = `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  return this.create({
    ...recordData,
    recordId,
    timestamps: {
      started: new Date(),
      ...recordData.timestamps
    }
  })
}

/**
 * 静态方法 - 获取学习计划的记录
 * @param {string} planId - 学习计划ID
 * @param {Object} options - 查询选项
 * @returns {Promise<LearningRecord[]>} 学习记录列表
 */
learningRecordSchema.statics.getByPlan = function(planId, options = {}) {
  const query = { planId }
  
  if (options.userId) {
    query.userId = options.userId
  }
  
  if (options.isCorrect !== undefined) {
    query.isCorrect = options.isCorrect
  }
  
  if (options.subject) {
    query.subject = options.subject
  }
  
  // 时间范围过滤
  if (options.startDate || options.endDate) {
    query.createdAt = {}
    if (options.startDate) {
      query.createdAt.$gte = options.startDate
    }
    if (options.endDate) {
      query.createdAt.$lte = options.endDate
    }
  }
  
  return this.find(query)
    .sort({ createdAt: options.sortDesc ? -1 : 1 })
    .limit(options.limit || 1000)
    .skip(options.skip || 0)
}

/**
 * 静态方法 - 获取用户今日学习记录
 * @param {string} userId - 用户ID
 * @param {string} planId - 学习计划ID（可选）
 * @returns {Promise<LearningRecord[]>} 今日学习记录
 */
learningRecordSchema.statics.getTodayRecords = function(userId, planId = null) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const query = {
    userId,
    createdAt: {
      $gte: today,
      $lt: tomorrow
    }
  }
  
  if (planId) {
    query.planId = planId
  }
  
  return this.find(query).sort({ createdAt: 1 })
}

/**
 * 静态方法 - 获取学习统计
 * @param {string} userId - 用户ID
 * @param {Object} options - 统计选项
 * @returns {Promise<Object>} 统计数据
 */
learningRecordSchema.statics.getStatistics = async function(userId, options = {}) {
  const query = { userId }
  
  if (options.planId) {
    query.planId = options.planId
  }
  
  if (options.subject) {
    query.subject = options.subject
  }
  
  // 时间范围
  if (options.startDate || options.endDate) {
    query.createdAt = {}
    if (options.startDate) {
      query.createdAt.$gte = options.startDate
    }
    if (options.endDate) {
      query.createdAt.$lte = options.endDate
    }
  }
  
  const records = await this.find(query)
  
  // 计算统计数据
  const validAnswers = records.filter(r => r.isCorrect !== null)
  const correctAnswers = records.filter(r => r.isCorrect === true)
  const wrongAnswers = records.filter(r => r.isCorrect === false)
  const aiInteractions = records.filter(r => r.isCorrect === null)
  
  const stats = {
    totalRecords: records.length,
    validAnswerCount: validAnswers.length,
    correctCount: correctAnswers.length,
    wrongCount: wrongAnswers.length,
    aiInteractionCount: aiInteractions.length,
    accuracy: validAnswers.length > 0 ? Math.round((correctAnswers.length / validAnswers.length) * 100) : 0,
    
    // 学科分布
    subjectDistribution: {},
    
    // 时间分布
    timeDistribution: {
      hourly: {},
      daily: {},
      weekly: {}
    },
    
    // 答题用时统计
    timeStats: {
      average: 0,
      median: 0,
      min: 0,
      max: 0
    }
  }
  
  // 学科分布统计
  const subjects = ['math', 'chinese', 'english']
  subjects.forEach(subject => {
    const subjectRecords = validAnswers.filter(r => r.subject === subject)
    const subjectCorrect = subjectRecords.filter(r => r.isCorrect === true)
    
    stats.subjectDistribution[subject] = {
      total: subjectRecords.length,
      correct: subjectCorrect.length,
      accuracy: subjectRecords.length > 0 ? 
        Math.round((subjectCorrect.length / subjectRecords.length) * 100) : 0
    }
  })
  
  // 答题用时统计
  const durations = records.map(r => r.answerTimeSeconds).filter(d => d > 0)
  if (durations.length > 0) {
    stats.timeStats.average = Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
    stats.timeStats.min = Math.min(...durations)
    stats.timeStats.max = Math.max(...durations)
    
    // 计算中位数
    const sortedDurations = durations.sort((a, b) => a - b)
    const mid = Math.floor(sortedDurations.length / 2)
    stats.timeStats.median = sortedDurations.length % 2 === 0 ? 
      Math.round((sortedDurations[mid - 1] + sortedDurations[mid]) / 2) : 
      sortedDurations[mid]
  }
  
  return stats
}

/**
 * 静态方法 - 清理过期记录
 * @param {number} days - 保留天数
 * @returns {Promise<Object>} 清理结果
 */
learningRecordSchema.statics.cleanupOldRecords = async function(days = 90) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  
  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate }
  })
  
  return {
    deletedCount: result.deletedCount,
    cutoffDate
  }
}

module.exports = mongoose.model('LearningRecord', learningRecordSchema) 