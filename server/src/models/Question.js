/**
 * 题目库数据模型
 * @description 定义题目集合的数据结构和方法
 */

const mongoose = require('mongoose')

/**
 * 选项数据模式（选择题用）
 */
const optionSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    match: /^[A-Z]$/
  },
  content: {
    type: String,
    required: true
  },
  isCorrect: {
    type: Boolean,
    default: false
  }
}, { _id: false })

/**
 * 解题步骤数据模式
 */
const solutionStepSchema = new mongoose.Schema({
  step: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  formula: {
    type: String,
    default: ''
  },
  explanation: {
    type: String,
    default: ''
  }
}, { _id: false })

/**
 * 题目数据模式
 */
const questionSchema = new mongoose.Schema({
  // 题目基本信息
  questionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  title: {
    type: String,
    required: true,
    maxlength: [200, '题目标题不能超过200个字符']
  },
  
  content: {
    type: String,
    required: true,
    maxlength: [2000, '题目内容不能超过2000个字符']
  },
  
  // 题目类型
  type: {
    type: String,
    required: true,
    enum: ['choice', 'fill_blank', 'calculation', 'essay', 'true_false'],
    index: true
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
  
  // 知识点和难度
  knowledgePoints: [{
    type: String,
    required: true,
    index: true
  }],
  
  difficulty: {
    type: String,
    required: true,
    enum: ['easy', 'normal', 'hard'],
    default: 'normal',
    index: true
  },
  
  // 题目内容（多种形式）
  imageUrl: {
    type: String,
    default: ''
  },
  
  audioUrl: {
    type: String,
    default: ''
  },
  
  // 选择题选项
  options: [optionSchema],
  
  // 答案信息
  answer: {
    type: String,
    required: true
  },
  
  // 标准解题步骤
  solutionSteps: [solutionStepSchema],
  
  // 解析和提示
  explanation: {
    type: String,
    maxlength: [1000, '解析不能超过1000个字符']
  },
  
  hints: [{
    level: { type: Number, required: true }, // 提示级别 1-3
    content: { type: String, required: true }
  }],
  
  // 常见错误
  commonMistakes: [{
    mistake: { type: String, required: true },
    explanation: { type: String, required: true },
    guidance: { type: String, default: '' }
  }],
  
  // 题目标签
  tags: [{
    type: String,
    index: true
  }],
  
  // 估计用时（分钟）
  estimatedTime: {
    type: Number,
    default: 5,
    min: 1,
    max: 60
  },
  
  // 题目状态
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published',
    index: true
  },
  
  // 统计数据
  stats: {
    totalAttempts: { type: Number, default: 0 },
    correctAttempts: { type: Number, default: 0 },
    averageTime: { type: Number, default: 0 }, // 平均完成时间（秒）
    accuracyRate: { type: Number, default: 0 }, // 正确率（百分比）
    popularityScore: { type: Number, default: 0 }, // 受欢迎程度
    difficultyScore: { type: Number, default: 0 } // 实际难度分数
  },
  
  // 创建者信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // 最后更新者
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // 审核信息
  reviewStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  
  reviewNotes: {
    type: String,
    default: ''
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
 * 虚拟属性 - 题目ID
 */
questionSchema.virtual('id').get(function() {
  return this._id.toHexString()
})

/**
 * 虚拟属性 - 是否为选择题
 */
questionSchema.virtual('isChoiceQuestion').get(function() {
  return this.type === 'choice'
})

/**
 * 虚拟属性 - 正确选项（选择题）
 */
questionSchema.virtual('correctOption').get(function() {
  if (this.type !== 'choice') return null
  return this.options.find(option => option.isCorrect)
})

/**
 * 虚拟属性 - 格式化的知识点
 */
questionSchema.virtual('formattedKnowledgePoints').get(function() {
  return this.knowledgePoints.join('、')
})

/**
 * 索引定义
 */
questionSchema.index({ subject: 1, grade: 1, difficulty: 1 })
questionSchema.index({ knowledgePoints: 1 })
questionSchema.index({ type: 1 })
questionSchema.index({ 'stats.accuracyRate': 1 })
questionSchema.index({ 'stats.popularityScore': -1 })
questionSchema.index({ tags: 1 })
questionSchema.index({ status: 1, reviewStatus: 1 })
questionSchema.index({ createdAt: 1 })

/**
 * 中间件 - 保存前验证
 */
questionSchema.pre('save', function(next) {
  // 选择题必须有选项
  if (this.type === 'choice') {
    if (!this.options || this.options.length < 2) {
      return next(new Error('选择题必须至少有2个选项'))
    }
    
    // 必须有且仅有一个正确答案
    const correctOptions = this.options.filter(option => option.isCorrect)
    if (correctOptions.length !== 1) {
      return next(new Error('选择题必须有且仅有一个正确答案'))
    }
  }
  
  // 更新正确率
  if (this.stats.totalAttempts > 0) {
    this.stats.accuracyRate = Math.round(
      (this.stats.correctAttempts / this.stats.totalAttempts) * 100
    )
  }
  
  // 生成题目ID（如果没有）
  if (!this.questionId) {
    this.questionId = `Q_${this.subject}_${this.grade}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  }
  
  next()
})

/**
 * 实例方法 - 记录答题统计
 * @param {boolean} isCorrect - 是否答对
 * @param {number} timeSpent - 用时（秒）
 */
questionSchema.methods.recordAttempt = function(isCorrect, timeSpent = 0) {
  this.stats.totalAttempts += 1
  
  if (isCorrect) {
    this.stats.correctAttempts += 1
  }
  
  // 更新平均用时
  if (timeSpent > 0) {
    const totalTime = this.stats.averageTime * (this.stats.totalAttempts - 1) + timeSpent
    this.stats.averageTime = Math.round(totalTime / this.stats.totalAttempts)
  }
  
  // 更新正确率
  this.stats.accuracyRate = Math.round(
    (this.stats.correctAttempts / this.stats.totalAttempts) * 100
  )
  
  // 更新受欢迎程度（基于答题次数和正确率）
  this.stats.popularityScore = this.stats.totalAttempts * (this.stats.accuracyRate / 100)
  
  return this.save()
}

/**
 * 实例方法 - 获取适当的提示
 * @param {number} level - 提示级别 (1-3)
 * @returns {string|null} 提示内容
 */
questionSchema.methods.getHint = function(level = 1) {
  const hint = this.hints.find(h => h.level === level)
  return hint ? hint.content : null
}

/**
 * 实例方法 - 验证答案
 * @param {string} userAnswer - 用户答案
 * @returns {Object} 验证结果
 */
questionSchema.methods.checkAnswer = function(userAnswer) {
  const normalizedUserAnswer = userAnswer.trim().toLowerCase()
  const normalizedCorrectAnswer = this.answer.trim().toLowerCase()
  
  let isCorrect = false
  let feedback = ''
  
  if (this.type === 'choice') {
    // 选择题：检查选项键
    const selectedOption = this.options.find(opt => 
      opt.key.toLowerCase() === normalizedUserAnswer
    )
    
    if (selectedOption) {
      isCorrect = selectedOption.isCorrect
      feedback = isCorrect ? '回答正确！' : `正确答案是 ${this.correctOption.key}`
    } else {
      feedback = '请选择有效的选项'
    }
  } else if (this.type === 'true_false') {
    // 判断题
    isCorrect = normalizedUserAnswer === normalizedCorrectAnswer
    feedback = isCorrect ? '回答正确！' : `正确答案是 ${this.answer}`
  } else {
    // 其他题型：直接比较文本
    isCorrect = normalizedUserAnswer === normalizedCorrectAnswer
    feedback = isCorrect ? '回答正确！' : `正确答案是 ${this.answer}`
  }
  
  return {
    isCorrect,
    feedback,
    explanation: this.explanation || '',
    correctAnswer: this.answer
  }
}

/**
 * 实例方法 - 获取相似题目
 * @param {number} limit - 返回数量限制
 * @returns {Promise<Question[]>} 相似题目列表
 */
questionSchema.methods.getSimilarQuestions = function(limit = 5) {
  return this.constructor.find({
    _id: { $ne: this._id },
    subject: this.subject,
    grade: this.grade,
    knowledgePoints: { $in: this.knowledgePoints },
    status: 'published',
    reviewStatus: 'approved'
  })
  .limit(limit)
  .sort({ 'stats.popularityScore': -1 })
}

/**
 * 静态方法 - 根据条件搜索题目
 * @param {Object} criteria - 搜索条件
 * @param {Object} options - 查询选项
 * @returns {Promise<Question[]>} 题目列表
 */
questionSchema.statics.searchQuestions = function(criteria = {}, options = {}) {
  const query = { status: 'published', reviewStatus: 'approved' }
  
  // 构建查询条件
  if (criteria.subject) query.subject = criteria.subject
  if (criteria.grade) query.grade = criteria.grade
  if (criteria.difficulty) query.difficulty = criteria.difficulty
  if (criteria.type) query.type = criteria.type
  if (criteria.knowledgePoints) {
    query.knowledgePoints = { $in: criteria.knowledgePoints }
  }
  if (criteria.tags) {
    query.tags = { $in: criteria.tags }
  }
  
  // 文本搜索
  if (criteria.keyword) {
    query.$or = [
      { title: { $regex: criteria.keyword, $options: 'i' } },
      { content: { $regex: criteria.keyword, $options: 'i' } },
      { tags: { $regex: criteria.keyword, $options: 'i' } }
    ]
  }
  
  // 构建排序
  let sort = {}
  if (options.sortBy === 'difficulty') {
    sort = { difficulty: 1, 'stats.popularityScore': -1 }
  } else if (options.sortBy === 'popularity') {
    sort = { 'stats.popularityScore': -1 }
  } else if (options.sortBy === 'accuracy') {
    sort = { 'stats.accuracyRate': -1 }
  } else {
    sort = { createdAt: -1 }
  }
  
  return this.find(query)
    .sort(sort)
    .limit(options.limit || 20)
    .skip(options.skip || 0)
}

/**
 * 静态方法 - 获取推荐题目
 * @param {string} userId - 用户ID
 * @param {Object} preferences - 用户偏好
 * @returns {Promise<Question[]>} 推荐题目列表
 */
questionSchema.statics.getRecommendedQuestions = async function(userId, preferences = {}) {
  const query = {
    status: 'published',
    reviewStatus: 'approved',
    subject: preferences.subject,
    grade: preferences.grade
  }
  
  // 根据用户水平调整难度
  if (preferences.userLevel === 'beginner') {
    query.difficulty = 'easy'
  } else if (preferences.userLevel === 'advanced') {
    query.difficulty = 'hard'
  } else {
    query.difficulty = { $in: ['easy', 'normal'] }
  }
  
  // 优先推荐相关知识点
  if (preferences.knowledgePoints && preferences.knowledgePoints.length > 0) {
    query.knowledgePoints = { $in: preferences.knowledgePoints }
  }
  
  return this.find(query)
    .sort({ 
      'stats.popularityScore': -1,
      'stats.accuracyRate': -1 
    })
    .limit(preferences.limit || 10)
}

/**
 * 静态方法 - 生成练习题组
 * @param {Object} config - 练习配置
 * @returns {Promise<Question[]>} 题目列表
 */
questionSchema.statics.generatePracticeSet = async function(config) {
  const {
    subject,
    grade,
    difficulty = 'normal',
    questionCount = 10,
    knowledgePoints = [],
    excludeIds = []
  } = config
  
  const query = {
    status: 'published',
    reviewStatus: 'approved',
    subject,
    grade,
    _id: { $nin: excludeIds }
  }
  
  // 难度分布
  const difficulties = Array.isArray(difficulty) ? difficulty : [difficulty]
  query.difficulty = { $in: difficulties }
  
  // 知识点筛选
  if (knowledgePoints.length > 0) {
    query.knowledgePoints = { $in: knowledgePoints }
  }
  
  // 获取题目池
  const questions = await this.find(query).sort({ 'stats.popularityScore': -1 })
  
  // 随机选择并确保多样性
  const selectedQuestions = []
  const usedKnowledgePoints = new Set()
  
  // 优先选择不同知识点的题目
  for (const question of questions) {
    if (selectedQuestions.length >= questionCount) break
    
    const hasNewKnowledgePoint = question.knowledgePoints.some(
      point => !usedKnowledgePoints.has(point)
    )
    
    if (hasNewKnowledgePoint || selectedQuestions.length < questionCount * 0.8) {
      selectedQuestions.push(question)
      question.knowledgePoints.forEach(point => usedKnowledgePoints.add(point))
    }
  }
  
  // 如果不够，随机补充
  const remaining = questions.filter(q => !selectedQuestions.includes(q))
  while (selectedQuestions.length < questionCount && remaining.length > 0) {
    const randomIndex = Math.floor(Math.random() * remaining.length)
    selectedQuestions.push(remaining.splice(randomIndex, 1)[0])
  }
  
  return selectedQuestions.slice(0, questionCount)
}

/**
 * 静态方法 - 获取统计信息
 * @param {Object} filters - 筛选条件
 * @returns {Promise<Object>} 统计数据
 */
questionSchema.statics.getStatistics = async function(filters = {}) {
  const matchStage = { status: 'published', reviewStatus: 'approved' }
  
  if (filters.subject) matchStage.subject = filters.subject
  if (filters.grade) matchStage.grade = filters.grade
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalQuestions: { $sum: 1 },
        totalAttempts: { $sum: '$stats.totalAttempts' },
        totalCorrectAttempts: { $sum: '$stats.correctAttempts' },
        averageAccuracy: { $avg: '$stats.accuracyRate' },
        averageTime: { $avg: '$stats.averageTime' },
        
        // 按难度分组
        easyCount: {
          $sum: { $cond: [{ $eq: ['$difficulty', 'easy'] }, 1, 0] }
        },
        normalCount: {
          $sum: { $cond: [{ $eq: ['$difficulty', 'normal'] }, 1, 0] }
        },
        hardCount: {
          $sum: { $cond: [{ $eq: ['$difficulty', 'hard'] }, 1, 0] }
        },
        
        // 按题型分组
        choiceCount: {
          $sum: { $cond: [{ $eq: ['$type', 'choice'] }, 1, 0] }
        },
        fillBlankCount: {
          $sum: { $cond: [{ $eq: ['$type', 'fill_blank'] }, 1, 0] }
        },
        calculationCount: {
          $sum: { $cond: [{ $eq: ['$type', 'calculation'] }, 1, 0] }
        }
      }
    }
  ])
  
  return stats[0] || {}
}

module.exports = mongoose.model('Question', questionSchema) 