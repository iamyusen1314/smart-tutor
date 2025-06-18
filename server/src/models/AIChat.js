/**
 * AI聊天记录数据模型
 * @description 定义AI对话历史集合的数据结构和方法
 */

const mongoose = require('mongoose')

/**
 * 消息数据模式
 */
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: [2000, '消息内容不能超过2000个字符']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  // AI响应的额外信息
  metadata: {
    tokens: { type: Number }, // 消耗的token数量
    responseTime: { type: Number }, // 响应时间（毫秒）
    model: { type: String }, // 使用的AI模型
    temperature: { type: Number }, // 生成参数
    guidanceType: { 
      type: String, 
      enum: ['hint', 'explanation', 'encouragement', 'correction', 'general']
    }
  }
}, { _id: false })

/**
 * AI聊天记录数据模式
 */
const aiChatSchema = new mongoose.Schema({
  // 关联用户
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 关联学习计划（可选）
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    index: true
  },
  
  // 关联题目ID（可选）
  questionId: {
    type: String,
    index: true
  },
  
  // 会话基本信息
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  
  title: {
    type: String,
    maxlength: [100, '会话标题不能超过100个字符']
  },
  
  // 学科和年级信息
  subject: {
    type: String,
    enum: ['math', 'chinese', 'english', 'general'],
    default: 'general',
    index: true
  },
  
  grade: {
    type: Number,
    min: 1,
    max: 6
  },
  
  // 对话类型
  chatType: {
    type: String,
    enum: ['problem_solving', 'concept_explanation', 'homework_help', 'free_chat'],
    default: 'free_chat',
    index: true
  },
  
  // 消息列表
  messages: [messageSchema],
  
  // 会话状态
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active',
    index: true
  },
  
  // 学习成果
  learningOutcome: {
    problemSolved: { type: Boolean, default: false },
    conceptUnderstood: { type: Boolean, default: false },
    hintsUsed: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    userSatisfaction: { 
      type: Number, 
      min: 1, 
      max: 5 
    }, // 1-5星评分
    knowledgePointsCovered: [{ type: String }],
    difficultyLevel: {
      type: String,
      enum: ['easy', 'normal', 'hard']
    }
  },
  
  // AI分析数据
  aiAnalysis: {
    studentLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced']
    },
    learningStyle: {
      type: String,
      enum: ['visual', 'auditory', 'kinesthetic', 'mixed']
    },
    commonMistakes: [{ type: String }],
    strengthAreas: [{ type: String }],
    improvementAreas: [{ type: String }],
    recommendedActions: [{ type: String }]
  },
  
  // 技术指标
  metrics: {
    totalTokens: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 }, // 成本（分）
    averageResponseTime: { type: Number, default: 0 }, // 平均响应时间（毫秒）
    sessionDuration: { type: Number, default: 0 }, // 会话时长（分钟）
    completionRate: { type: Number, default: 0 } // 完成率（百分比）
  },
  
  // 会话结束时间
  endedAt: {
    type: Date
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
 * 虚拟属性 - 聊天记录ID
 */
aiChatSchema.virtual('id').get(function() {
  return this._id.toHexString()
})

/**
 * 虚拟属性 - 是否已结束
 */
aiChatSchema.virtual('isEnded').get(function() {
  return this.status !== 'active'
})

/**
 * 虚拟属性 - 最后一条消息
 */
aiChatSchema.virtual('lastMessage').get(function() {
  return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null
})

/**
 * 虚拟属性 - 用户消息数量
 */
aiChatSchema.virtual('userMessageCount').get(function() {
  return this.messages.filter(m => m.role === 'user').length
})

/**
 * 虚拟属性 - AI消息数量
 */
aiChatSchema.virtual('aiMessageCount').get(function() {
  return this.messages.filter(m => m.role === 'assistant').length
})

/**
 * 索引定义
 */
aiChatSchema.index({ planId: 1, questionId: 1 })
aiChatSchema.index({ sessionId: 1 })
aiChatSchema.index({ userId: 1, createdAt: -1 })
aiChatSchema.index({ subject: 1, grade: 1 })
aiChatSchema.index({ chatType: 1 })
aiChatSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }) // 30天后自动删除

/**
 * 中间件 - 保存前更新统计
 */
aiChatSchema.pre('save', function(next) {
  // 更新消息总数
  this.learningOutcome.totalMessages = this.messages.length
  
  // 更新AI指导次数
  this.learningOutcome.hintsUsed = this.messages.filter(
    m => m.role === 'assistant' && m.metadata?.guidanceType === 'hint'
  ).length
  
  // 计算总token数
  this.metrics.totalTokens = this.messages.reduce(
    (sum, m) => sum + (m.metadata?.tokens || 0), 0
  )
  
  // 计算平均响应时间
  const aiMessages = this.messages.filter(m => m.role === 'assistant')
  if (aiMessages.length > 0) {
    const totalResponseTime = aiMessages.reduce(
      (sum, m) => sum + (m.metadata?.responseTime || 0), 0
    )
    this.metrics.averageResponseTime = Math.round(totalResponseTime / aiMessages.length)
  }
  
  // 计算会话时长
  if (this.messages.length > 0) {
    const startTime = this.messages[0].timestamp
    const endTime = this.messages[this.messages.length - 1].timestamp
    this.metrics.sessionDuration = Math.round((endTime - startTime) / (1000 * 60))
  }
  
  next()
})

/**
 * 实例方法 - 添加消息
 * @param {string} role - 消息角色 ('user' | 'assistant' | 'system')
 * @param {string} content - 消息内容
 * @param {Object} metadata - 元数据（可选）
 */
aiChatSchema.methods.addMessage = function(role, content, metadata = {}) {
  const message = {
    role,
    content: content.trim(),
    timestamp: new Date(),
    metadata
  }
  
  this.messages.push(message)
  
  // 自动生成标题（如果没有）
  if (!this.title && role === 'user' && this.messages.length === 1) {
    this.title = content.length > 50 ? content.substring(0, 50) + '...' : content
  }
  
  return this.save()
}

/**
 * 实例方法 - 添加用户消息
 * @param {string} content - 消息内容
 */
aiChatSchema.methods.addUserMessage = function(content) {
  return this.addMessage('user', content)
}

/**
 * 实例方法 - 添加AI回复
 * @param {string} content - 回复内容
 * @param {Object} metadata - AI响应元数据
 */
aiChatSchema.methods.addAIResponse = function(content, metadata = {}) {
  return this.addMessage('assistant', content, metadata)
}

/**
 * 实例方法 - 结束会话
 * @param {string} status - 结束状态 ('completed' | 'abandoned')
 * @param {Object} outcome - 学习成果（可选）
 */
aiChatSchema.methods.endSession = function(status = 'completed', outcome = {}) {
  this.status = status
  this.endedAt = new Date()
  
  // 更新学习成果
  Object.assign(this.learningOutcome, outcome)
  
  // 计算完成率
  if (this.chatType === 'problem_solving') {
    this.metrics.completionRate = this.learningOutcome.problemSolved ? 100 : 
      Math.round((this.userMessageCount / Math.max(this.aiMessageCount, 1)) * 100)
  }
  
  return this.save()
}

/**
 * 实例方法 - 评价会话
 * @param {number} satisfaction - 满意度评分 (1-5)
 * @param {Object} feedback - 额外反馈
 */
aiChatSchema.methods.rateSatisfaction = function(satisfaction, feedback = {}) {
  this.learningOutcome.userSatisfaction = satisfaction
  
  if (feedback.knowledgePointsCovered) {
    this.learningOutcome.knowledgePointsCovered = feedback.knowledgePointsCovered
  }
  
  return this.save()
}

/**
 * 实例方法 - 获取对话历史（用于AI上下文）
 * @param {number} limit - 最近消息数量限制
 * @returns {Array} 格式化的消息列表
 */
aiChatSchema.methods.getContextMessages = function(limit = 10) {
  const recentMessages = this.messages.slice(-limit)
  return recentMessages.map(m => ({
    role: m.role,
    content: m.content
  }))
}

/**
 * 静态方法 - 创建新会话
 * @param {Object} chatData - 会话数据
 * @returns {Promise<AIChat>} 创建的会话对象
 */
aiChatSchema.statics.createSession = function(chatData) {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  return this.create({
    ...chatData,
    sessionId,
    messages: [],
    status: 'active'
  })
}

/**
 * 静态方法 - 根据会话ID查找
 * @param {string} sessionId - 会话ID
 * @returns {Promise<AIChat|null>} 会话对象
 */
aiChatSchema.statics.findBySessionId = function(sessionId) {
  return this.findOne({ sessionId }).populate('userId planId')
}

/**
 * 静态方法 - 获取用户会话列表
 * @param {string} userId - 用户ID
 * @param {Object} options - 查询选项
 * @returns {Promise<AIChat[]>} 会话列表
 */
aiChatSchema.statics.getUserSessions = function(userId, options = {}) {
  const query = { userId }
  
  if (options.status) {
    query.status = options.status
  }
  
  if (options.chatType) {
    query.chatType = options.chatType
  }
  
  if (options.subject) {
    query.subject = options.subject
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0)
    .populate('userId', 'name avatarUrl')
    .populate('planId', 'title subject grade')
}

/**
 * 静态方法 - 获取学习分析报告
 * @param {string} userId - 用户ID
 * @param {Object} options - 分析选项
 * @returns {Promise<Object>} 分析报告
 */
aiChatSchema.statics.getLearningAnalysis = async function(userId, options = {}) {
  const timeFilter = options.days ? {
    createdAt: { $gte: new Date(Date.now() - options.days * 24 * 60 * 60 * 1000) }
  } : {}
  
  const sessions = await this.find({ userId, ...timeFilter })
  
  const analysis = {
    totalSessions: sessions.length,
    completedSessions: sessions.filter(s => s.status === 'completed').length,
    totalMessages: sessions.reduce((sum, s) => sum + s.messages.length, 0),
    totalStudyTime: sessions.reduce((sum, s) => sum + s.metrics.sessionDuration, 0),
    averageSatisfaction: 0,
    
    // 按学科分析
    subjectAnalysis: {},
    
    // 按对话类型分析
    chatTypeAnalysis: {},
    
    // 学习模式分析
    learningPatterns: {
      preferredSubjects: [],
      commonQuestionTypes: [],
      improvementAreas: [],
      strengthAreas: []
    },
    
    // 使用统计
    usageStats: {
      averageSessionDuration: 0,
      averageMessagesPerSession: 0,
      mostActiveTimeOfDay: null,
      weeklyUsagePattern: {}
    }
  }
  
  // 计算平均满意度
  const ratedSessions = sessions.filter(s => s.learningOutcome.userSatisfaction)
  if (ratedSessions.length > 0) {
    analysis.averageSatisfaction = ratedSessions.reduce(
      (sum, s) => sum + s.learningOutcome.userSatisfaction, 0
    ) / ratedSessions.length
  }
  
  // 按学科分析
  const subjects = ['math', 'chinese', 'english']
  subjects.forEach(subject => {
    const subjectSessions = sessions.filter(s => s.subject === subject)
    analysis.subjectAnalysis[subject] = {
      sessionCount: subjectSessions.length,
      completionRate: subjectSessions.length > 0 ? 
        (subjectSessions.filter(s => s.status === 'completed').length / subjectSessions.length) * 100 : 0,
      averageStudyTime: subjectSessions.length > 0 ?
        subjectSessions.reduce((sum, s) => sum + s.metrics.sessionDuration, 0) / subjectSessions.length : 0
    }
  })
  
  // 计算使用统计
  if (sessions.length > 0) {
    analysis.usageStats.averageSessionDuration = analysis.totalStudyTime / sessions.length
    analysis.usageStats.averageMessagesPerSession = analysis.totalMessages / sessions.length
  }
  
  return analysis
}

/**
 * 静态方法 - 清理过期会话
 * @param {number} days - 保留天数
 * @returns {Promise<Object>} 清理结果
 */
aiChatSchema.statics.cleanupOldSessions = async function(days = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  
  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    status: { $ne: 'active' } // 保留活跃会话
  })
  
  return {
    deletedCount: result.deletedCount,
    cutoffDate
  }
}

module.exports = mongoose.model('AIChat', aiChatSchema) 