/**
 * 学习会话数据模型
 * @description 管理用户当前的学习会话，替代前端本地存储
 */

const mongoose = require('mongoose')

/**
 * 题目状态数据模式
 */
const questionStatusSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'skipped', 'timeout'],
    default: 'not_started'
  },
  studentAnswer: { type: String, default: '' },
  isCorrect: { type: Boolean, default: null },
  attempts: { type: Number, default: 0 },
  hintsUsed: { type: Number, default: 0 },
  timeSpent: { type: Number, default: 0 }, // 秒
  startedAt: { type: Date },
  completedAt: { type: Date },
  aiInteractions: [{
    type: { type: String }, // 'hint', 'guidance', 'correction'
    content: { type: String },
    timestamp: { type: Date, default: Date.now }
  }]
}, { _id: false })

/**
 * 学习会话数据模式
 */
const learningSessionSchema = new mongoose.Schema({
  // 会话标识
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // 关联用户和计划
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  planId: {
    type: String,
    required: true,
    index: true
  },
  
  // 会话基本信息
  subject: {
    type: String,
    required: true,
    enum: ['math', 'chinese', 'english']
  },
  
  grade: {
    type: Number,
    required: true,
    min: 1,
    max: 6
  },
  
  // 学习内容
  questions: [questionStatusSchema],
  
  // 学习进度
  progress: {
    currentQuestionIndex: { type: Number, default: 0 },
    totalQuestions: { type: Number, required: true },
    completedQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    skippedQuestions: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 } // 百分比
  },
  
  // 会话状态
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'abandoned'],
    default: 'active',
    index: true
  },
  
  // 时间记录
  startedAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  totalDuration: { type: Number, default: 0 }, // 秒
  
  // 学习设置
  settings: {
    allowSkip: { type: Boolean, default: false },
    showHints: { type: Boolean, default: true },
    timeLimit: { type: Number, default: 0 }, // 分钟，0表示无限制
    currentMode: {
      type: String,
      enum: ['answer', 'chat', 'instant_voice'],
      default: 'answer'
    }
  },
  
  // 设备和环境信息
  deviceInfo: {
    platform: { type: String },
    version: { type: String },
    networkType: { type: String }
  },
  
  // 数据同步标记
  syncStatus: {
    lastSyncAt: { type: Date, default: Date.now },
    needsSync: { type: Boolean, default: false },
    syncVersion: { type: Number, default: 1 }
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
 * 虚拟属性 - 会话ID
 */
learningSessionSchema.virtual('id').get(function() {
  return this._id.toHexString()
})

/**
 * 虚拟属性 - 当前准确率
 */
learningSessionSchema.virtual('currentAccuracy').get(function() {
  const answered = this.progress.completedQuestions
  if (answered === 0) return 0
  return Math.round((this.progress.correctAnswers / answered) * 100)
})

/**
 * 索引定义
 */
learningSessionSchema.index({ userId: 1, status: 1 })
learningSessionSchema.index({ planId: 1, status: 1 })
learningSessionSchema.index({ sessionId: 1 }, { unique: true })

/**
 * 中间件 - 保存前处理
 */
learningSessionSchema.pre('save', function(next) {
  // 更新最后活跃时间
  this.lastActiveAt = new Date()
  
  // 计算完成率
  if (this.progress.totalQuestions > 0) {
    this.progress.completionRate = Math.round(
      (this.progress.completedQuestions / this.progress.totalQuestions) * 100
    )
  }
  
  // 如果会话完成，设置完成时间
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date()
    this.totalDuration = Math.round((this.completedAt - this.startedAt) / 1000)
  }
  
  next()
})

/**
 * 实例方法 - 更新当前题目状态
 * @param {string} answer - 学生答案
 * @param {boolean} isCorrect - 是否正确
 */
learningSessionSchema.methods.updateCurrentQuestion = function(answer, isCorrect) {
  const currentIndex = this.progress.currentQuestionIndex
  const question = this.questions[currentIndex]
  
  if (question) {
    question.studentAnswer = answer
    question.isCorrect = isCorrect
    question.status = 'completed'
    question.completedAt = new Date()
    question.attempts += 1
    
    // 更新进度统计
    this.progress.completedQuestions += 1
    if (isCorrect) {
      this.progress.correctAnswers += 1
    }
  }
  
  return this.save()
}

/**
 * 实例方法 - 跳到下一题
 */
learningSessionSchema.methods.nextQuestion = function() {
  if (this.progress.currentQuestionIndex < this.progress.totalQuestions - 1) {
    this.progress.currentQuestionIndex += 1
  } else {
    // 所有题目完成，标记会话完成
    this.status = 'completed'
  }
  
  return this.save()
}

/**
 * 实例方法 - 跳过当前题目
 */
learningSessionSchema.methods.skipCurrentQuestion = function() {
  const currentIndex = this.progress.currentQuestionIndex
  const question = this.questions[currentIndex]
  
  if (question) {
    question.status = 'skipped'
    question.completedAt = new Date()
    this.progress.skippedQuestions += 1
  }
  
  return this.nextQuestion()
}

/**
 * 实例方法 - 添加AI交互记录
 * @param {string} type - 交互类型
 * @param {string} content - 交互内容
 */
learningSessionSchema.methods.addAIInteraction = function(type, content) {
  const currentIndex = this.progress.currentQuestionIndex
  const question = this.questions[currentIndex]
  
  if (question) {
    question.aiInteractions.push({
      type,
      content,
      timestamp: new Date()
    })
    
    if (type === 'hint') {
      question.hintsUsed += 1
    }
  }
  
  return this.save()
}

/**
 * 静态方法 - 创建新的学习会话
 * @param {Object} sessionData - 会话数据
 * @returns {Promise<LearningSession>} 创建的会话对象
 */
learningSessionSchema.statics.createSession = function(sessionData) {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // 初始化题目状态
  const questions = sessionData.questions.map((q, index) => ({
    questionId: q.id || `q_${index}`,
    questionText: q.text || q.content,
    status: 'not_started'
  }))
  
  return this.create({
    ...sessionData,
    sessionId,
    questions,
    progress: {
      currentQuestionIndex: 0,
      totalQuestions: questions.length,
      completedQuestions: 0,
      correctAnswers: 0,
      skippedQuestions: 0,
      completionRate: 0
    },
    startedAt: new Date(),
    lastActiveAt: new Date()
  })
}

/**
 * 静态方法 - 获取用户活跃会话
 * @param {string} userId - 用户ID
 * @returns {Promise<LearningSession|null>} 活跃的学习会话
 */
learningSessionSchema.statics.getActiveSession = function(userId) {
  return this.findOne({
    userId,
    status: { $in: ['active', 'paused'] }
  }).sort({ lastActiveAt: -1 })
}

/**
 * 静态方法 - 获取用户今日会话
 * @param {string} userId - 用户ID
 * @returns {Promise<LearningSession[]>} 今日学习会话列表
 */
learningSessionSchema.statics.getTodaySessions = function(userId) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  return this.find({
    userId,
    startedAt: {
      $gte: today,
      $lt: tomorrow
    }
  }).sort({ startedAt: -1 })
}

/**
 * 静态方法 - 清理过期会话
 * @param {number} hours - 过期时间（小时）
 * @returns {Promise<Object>} 清理结果
 */
learningSessionSchema.statics.cleanupExpiredSessions = async function(hours = 24) {
  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
  
  const result = await this.updateMany(
    {
      status: { $in: ['active', 'paused'] },
      lastActiveAt: { $lt: cutoffTime }
    },
    {
      $set: { status: 'abandoned' }
    }
  )
  
  return {
    modifiedCount: result.modifiedCount,
    cutoffTime
  }
}

module.exports = mongoose.model('LearningSession', learningSessionSchema) 