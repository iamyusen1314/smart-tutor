/**
 * 学习计划数据模型
 * @description 定义学习计划集合的数据结构和方法
 */

const mongoose = require('mongoose')

/**
 * 题目数据模式
 */
const questionSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  answer: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'normal', 'hard'],
    default: 'normal'
  },
  knowledgePoints: [{
    type: String
  }],
  // 用户答题状态
  userAnswer: {
    type: String,
    default: ''
  },
  isCorrect: {
    type: Boolean,
    default: null
  },
  aiGuidance: [{
    step: { type: Number, required: true },
    hint: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  answeredAt: {
    type: Date
  }
}, { _id: false })

/**
 * 学习计划数据模式
 */
const planSchema = new mongoose.Schema({
  // 关联用户
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 计划基本信息
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, '计划标题不能超过100个字符']
  },
  
  description: {
    type: String,
    maxlength: [500, '计划描述不能超过500个字符']
  },
  
  // 学科和年级
  subject: {
    type: String,
    required: true,
    enum: ['math', 'chinese', 'english'],
    index: true
  },
  
  grade: {
    type: Number,
    required: true,
    min: 1,
    max: 6,
    index: true
  },
  
  // 计划类型
  type: {
    type: String,
    enum: ['daily', 'weekly', 'exam_prep', 'custom'],
    default: 'daily'
  },
  
  // 难度等级
  difficulty: {
    type: String,
    enum: ['easy', 'normal', 'hard'],
    default: 'normal'
  },
  
  // 题目列表
  questions: [questionSchema],
  
  // 计划状态
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'paused', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // 进度信息
  progress: {
    totalQuestions: { type: Number, default: 0 },
    answeredQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 }, // 百分比
    currentQuestionIndex: { type: Number, default: 0 }
  },
  
  // 时间信息
  startedAt: {
    type: Date
  },
  
  completedAt: {
    type: Date
  },
  
  estimatedDuration: {
    type: Number, // 分钟
    default: 30
  },
  
  actualDuration: {
    type: Number, // 分钟
    default: 0
  },
  
  // AI学习数据
  aiData: {
    totalHints: { type: Number, default: 0 },
    averageHintsPerQuestion: { type: Number, default: 0 },
    weaknessPoints: [{ type: String }], // 知识薄弱点
    strengthPoints: [{ type: String }], // 知识强项
    learningPattern: {
      preferredDifficulty: { type: String, enum: ['easy', 'normal', 'hard'] },
      averageThinkingTime: { type: Number }, // 秒
      commonMistakeTypes: [{ type: String }]
    }
  },
  
  // 计划设置
  settings: {
    allowSkip: { type: Boolean, default: false },
    showHints: { type: Boolean, default: true },
    timeLimit: { type: Number, default: 0 }, // 0表示无限制，单位：分钟
    randomOrder: { type: Boolean, default: false }
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
 * 虚拟属性 - 计划ID
 */
planSchema.virtual('id').get(function() {
  return this._id.toHexString()
})

/**
 * 虚拟属性 - 是否完成
 */
planSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed'
})

/**
 * 虚拟属性 - 进度百分比
 */
planSchema.virtual('progressPercentage').get(function() {
  if (this.progress.totalQuestions === 0) return 0
  return Math.round((this.progress.answeredQuestions / this.progress.totalQuestions) * 100)
})

/**
 * 索引定义
 */
planSchema.index({ userId: 1, createdAt: -1 })
planSchema.index({ status: 1 })
planSchema.index({ subject: 1, grade: 1 })
planSchema.index({ createdAt: 1 })

/**
 * 中间件 - 保存前更新进度
 */
planSchema.pre('save', function(next) {
  // 更新总题目数量
  this.progress.totalQuestions = this.questions.length
  
  // 更新已答题数量
  const answeredQuestions = this.questions.filter(q => q.userAnswer && q.userAnswer.trim() !== '')
  this.progress.answeredQuestions = answeredQuestions.length
  
  // 更新正确答案数量
  const correctAnswers = this.questions.filter(q => q.isCorrect === true)
  this.progress.correctAnswers = correctAnswers.length
  
  // 更新准确率
  if (this.progress.answeredQuestions > 0) {
    this.progress.accuracy = Math.round((this.progress.correctAnswers / this.progress.answeredQuestions) * 100)
  }
  
  // 更新AI数据
  const totalHints = this.questions.reduce((sum, q) => sum + (q.aiGuidance?.length || 0), 0)
  this.aiData.totalHints = totalHints
  if (this.progress.answeredQuestions > 0) {
    this.aiData.averageHintsPerQuestion = totalHints / this.progress.answeredQuestions
  }
  
  // 自动更新状态
  if (this.progress.answeredQuestions === this.progress.totalQuestions && this.progress.totalQuestions > 0) {
    if (this.status === 'active') {
      this.status = 'completed'
      this.completedAt = new Date()
    }
  }
  
  next()
})

/**
 * 实例方法 - 开始计划
 */
planSchema.methods.startPlan = function() {
  if (this.status !== 'pending') {
    throw new Error('只有待开始的计划才能启动')
  }
  
  this.status = 'active'
  this.startedAt = new Date()
  return this.save()
}

/**
 * 实例方法 - 暂停计划
 */
planSchema.methods.pausePlan = function() {
  if (this.status !== 'active') {
    throw new Error('只有进行中的计划才能暂停')
  }
  
  this.status = 'paused'
  return this.save()
}

/**
 * 实例方法 - 恢复计划
 */
planSchema.methods.resumePlan = function() {
  if (this.status !== 'paused') {
    throw new Error('只有暂停的计划才能恢复')
  }
  
  this.status = 'active'
  return this.save()
}

/**
 * 实例方法 - 完成计划
 */
planSchema.methods.completePlan = function() {
  this.status = 'completed'
  this.completedAt = new Date()
  
  // 计算实际用时
  if (this.startedAt) {
    this.actualDuration = Math.round((new Date() - this.startedAt) / (1000 * 60))
  }
  
  return this.save()
}

/**
 * 实例方法 - 回答题目
 * @param {number} questionIndex - 题目索引
 * @param {string} userAnswer - 用户答案
 * @returns {Object} 答题结果
 */
planSchema.methods.answerQuestion = function(questionIndex, userAnswer) {
  if (questionIndex < 0 || questionIndex >= this.questions.length) {
    throw new Error('题目索引无效')
  }
  
  const question = this.questions[questionIndex]
  question.userAnswer = userAnswer.trim()
  question.answeredAt = new Date()
  
  // 简单的答案比较（实际项目中可能需要更复杂的逻辑）
  question.isCorrect = question.userAnswer.toLowerCase() === question.answer.toLowerCase()
  
  // 更新当前题目索引
  this.progress.currentQuestionIndex = Math.min(questionIndex + 1, this.questions.length - 1)
  
  const result = {
    isCorrect: question.isCorrect,
    correctAnswer: question.answer,
    explanation: question.isCorrect ? '回答正确！' : `正确答案是：${question.answer}`
  }
  
  return this.save().then(() => result)
}

/**
 * 实例方法 - 添加AI指导
 * @param {number} questionIndex - 题目索引
 * @param {string} hint - 提示内容
 */
planSchema.methods.addAIGuidance = function(questionIndex, hint) {
  if (questionIndex < 0 || questionIndex >= this.questions.length) {
    throw new Error('题目索引无效')
  }
  
  const question = this.questions[questionIndex]
  if (!question.aiGuidance) {
    question.aiGuidance = []
  }
  
  question.aiGuidance.push({
    step: question.aiGuidance.length + 1,
    hint: hint,
    timestamp: new Date()
  })
  
  return this.save()
}

/**
 * 实例方法 - 获取当前题目
 */
planSchema.methods.getCurrentQuestion = function() {
  if (this.progress.currentQuestionIndex >= this.questions.length) {
    return null
  }
  return this.questions[this.progress.currentQuestionIndex]
}

/**
 * 实例方法 - 获取下一题目
 */
planSchema.methods.getNextQuestion = function() {
  const nextIndex = this.progress.currentQuestionIndex + 1
  if (nextIndex >= this.questions.length) {
    return null
  }
  return this.questions[nextIndex]
}

/**
 * 静态方法 - 创建新计划
 * @param {Object} planData - 计划数据
 * @returns {Promise<Plan>} 创建的计划对象
 */
planSchema.statics.createPlan = function(planData) {
  return this.create({
    ...planData,
    progress: {
      totalQuestions: planData.questions?.length || 0,
      answeredQuestions: 0,
      correctAnswers: 0,
      accuracy: 0,
      currentQuestionIndex: 0
    }
  })
}

/**
 * 静态方法 - 根据用户ID获取计划列表
 * @param {string} userId - 用户ID
 * @param {Object} options - 查询选项
 * @returns {Promise<Plan[]>} 计划列表
 */
planSchema.statics.getUserPlans = function(userId, options = {}) {
  const query = { userId }
  
  if (options.status) {
    query.status = options.status
  }
  
  if (options.subject) {
    query.subject = options.subject
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0)
    .populate('userId', 'name avatarUrl role')
}

/**
 * 静态方法 - 获取用户学习统计
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 统计信息
 */
planSchema.statics.getUserStats = async function(userId) {
  const plans = await this.find({ userId })
  
  const stats = {
    totalPlans: plans.length,
    completedPlans: plans.filter(p => p.status === 'completed').length,
    activePlans: plans.filter(p => p.status === 'active').length,
    totalQuestions: plans.reduce((sum, p) => sum + p.progress.totalQuestions, 0),
    totalCorrectAnswers: plans.reduce((sum, p) => sum + p.progress.correctAnswers, 0),
    averageAccuracy: 0,
    totalStudyTime: plans.reduce((sum, p) => sum + (p.actualDuration || 0), 0), // 分钟
    subjectStats: {}
  }
  
  // 计算平均准确率
  if (stats.totalQuestions > 0) {
    stats.averageAccuracy = Math.round((stats.totalCorrectAnswers / stats.totalQuestions) * 100)
  }
  
  // 分学科统计
  const subjects = ['math', 'chinese', 'english']
  subjects.forEach(subject => {
    const subjectPlans = plans.filter(p => p.subject === subject)
    stats.subjectStats[subject] = {
      planCount: subjectPlans.length,
      completedPlans: subjectPlans.filter(p => p.status === 'completed').length,
      totalQuestions: subjectPlans.reduce((sum, p) => sum + p.progress.totalQuestions, 0),
      correctAnswers: subjectPlans.reduce((sum, p) => sum + p.progress.correctAnswers, 0),
      accuracy: 0
    }
    
    if (stats.subjectStats[subject].totalQuestions > 0) {
      stats.subjectStats[subject].accuracy = Math.round(
        (stats.subjectStats[subject].correctAnswers / stats.subjectStats[subject].totalQuestions) * 100
      )
    }
  })
  
  return stats
}

module.exports = mongoose.model('Plan', planSchema) 