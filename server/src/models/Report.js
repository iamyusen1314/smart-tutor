/**
 * 学习报告数据模型
 * @description 定义学习报告集合的数据结构和方法
 */

const mongoose = require('mongoose')

/**
 * 学科表现数据模式
 */
const subjectPerformanceSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
    enum: ['math', 'chinese', 'english']
  },
  totalQuestions: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 }, // 百分比
  averageTime: { type: Number, default: 0 }, // 平均用时（秒）
  improvementRate: { type: Number, default: 0 }, // 进步率（百分比）
  
  // 知识点掌握情况
  knowledgePointsMastery: [{
    point: { type: String, required: true },
    mastery: { type: Number, min: 0, max: 100 }, // 掌握度百分比
    practiceCount: { type: Number, default: 0 },
    lastPracticed: { type: Date }
  }],
  
  // 难度分布
  difficultyBreakdown: {
    easy: { total: { type: Number, default: 0 }, correct: { type: Number, default: 0 } },
    normal: { total: { type: Number, default: 0 }, correct: { type: Number, default: 0 } },
    hard: { total: { type: Number, default: 0 }, correct: { type: Number, default: 0 } }
  },
  
  // 常见错误
  commonMistakes: [{
    type: { type: String, required: true },
    frequency: { type: Number, default: 0 },
    examples: [{ type: String }]
  }]
}, { _id: false })

/**
 * 学习习惯数据模式
 */
const learningHabitsSchema = new mongoose.Schema({
  // 学习时间模式
  studyTimePattern: {
    preferredHours: [{ type: Number, min: 0, max: 23 }], // 偏好的学习时间段
    averageSessionDuration: { type: Number, default: 0 }, // 平均学习时长（分钟）
    dailyStudyTime: { type: Number, default: 0 }, // 日均学习时间（分钟）
    weeklyConsistency: { type: Number, default: 0 } // 一周学习一致性（百分比）
  },
  
  // 学习行为
  behaviorPatterns: {
    attentionSpan: { type: Number, default: 0 }, // 注意力持续时间（分钟）
    mistakeHandling: {
      type: String,
      enum: ['persistent', 'gives_up_easily', 'seeks_help', 'reviews_carefully'],
      default: 'reviews_carefully'
    },
    difficultyPreference: {
      type: String,
      enum: ['easy', 'challenging', 'mixed'],
      default: 'mixed'
    },
    learningPace: {
      type: String,
      enum: ['slow', 'moderate', 'fast'],
      default: 'moderate'
    }
  },
  
  // 互动模式
  interactionPatterns: {
    hintUsageFrequency: { type: Number, default: 0 }, // 提示使用频率
    questionsAskedCount: { type: Number, default: 0 }, // 提问次数
    selfCorrectionRate: { type: Number, default: 0 }, // 自我纠错率
    aiInteractionSatisfaction: { type: Number, min: 1, max: 5, default: 3 } // AI交互满意度
  }
}, { _id: false })

/**
 * 进步趋势数据模式
 */
const progressTrendSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  totalQuestions: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  studyTime: { type: Number, default: 0 }, // 分钟
  subjectAccuracy: {
    math: { type: Number, default: 0 },
    chinese: { type: Number, default: 0 },
    english: { type: Number, default: 0 }
  }
}, { _id: false })

/**
 * 个性化建议数据模式
 */
const recommendationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['study_plan', 'knowledge_review', 'practice_focus', 'time_management', 'difficulty_adjustment']
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  actionItems: [{ type: String }],
  targetSubject: {
    type: String,
    enum: ['math', 'chinese', 'english', 'general']
  },
  estimatedImpact: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  isImplemented: { type: Boolean, default: false },
  implementedAt: { type: Date }
}, { _id: false })

/**
 * 学习报告数据模式
 */
const reportSchema = new mongoose.Schema({
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
  
  // 报告基本信息
  reportType: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'plan_completion', 'comprehensive'],
    index: true
  },
  
  title: {
    type: String,
    required: true,
    maxlength: [100, '报告标题不能超过100个字符']
  },
  
  // 报告时间范围
  dateRange: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },
  
  // 总体统计
  overallStats: {
    totalStudyTime: { type: Number, default: 0 }, // 总学习时间（分钟）
    totalQuestions: { type: Number, default: 0 },
    totalCorrectAnswers: { type: Number, default: 0 },
    overallAccuracy: { type: Number, default: 0 }, // 总体正确率
    studyDays: { type: Number, default: 0 }, // 学习天数
    averageDailyStudyTime: { type: Number, default: 0 }, // 日均学习时间
    completedPlans: { type: Number, default: 0 }, // 完成的计划数
    aiInteractions: { type: Number, default: 0 } // AI交互次数
  },
  
  // 各学科表现
  subjectPerformance: [subjectPerformanceSchema],
  
  // 学习习惯分析
  learningHabits: learningHabitsSchema,
  
  // 进步趋势（最近7-30天的数据点）
  progressTrend: [progressTrendSchema],
  
  // 个性化建议
  recommendations: [recommendationSchema],
  
  // 成就和里程碑
  achievements: [{
    type: {
      type: String,
      enum: ['accuracy_milestone', 'consistency_streak', 'improvement_rate', 'knowledge_mastery', 'time_milestone']
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    earnedDate: { type: Date, default: Date.now },
    icon: { type: String, default: '' },
    rarity: {
      type: String,
      enum: ['common', 'rare', 'epic', 'legendary'],
      default: 'common'
    }
  }],
  
  // 学习评级
  learningGrade: {
    overall: {
      type: String,
      enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D'],
      default: 'C'
    },
    subjects: {
      math: { type: String, enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D'] },
      chinese: { type: String, enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D'] },
      english: { type: String, enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D'] }
    },
    improvement: {
      type: String,
      enum: ['excellent', 'good', 'stable', 'needs_attention'],
      default: 'stable'
    }
  },
  
  // AI生成的总结
  aiSummary: {
    strengths: [{ type: String }], // 优势
    weaknesses: [{ type: String }], // 不足
    keyInsights: [{ type: String }], // 关键洞察
    motivationalMessage: { type: String }, // 激励信息
    parentReport: { type: String } // 给家长的报告摘要
  },
  
  // 报告状态
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed'],
    default: 'generating'
  },
  
  // 分享设置
  shareSettings: {
    isShared: { type: Boolean, default: false },
    shareWithParent: { type: Boolean, default: true },
    publicShare: { type: Boolean, default: false },
    shareCode: { type: String, unique: true, sparse: true }
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
 * 虚拟属性 - 报告ID
 */
reportSchema.virtual('id').get(function() {
  return this._id.toHexString()
})

/**
 * 虚拟属性 - 报告时长（天数）
 */
reportSchema.virtual('reportDuration').get(function() {
  const diffTime = Math.abs(this.dateRange.endDate - this.dateRange.startDate)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
})

/**
 * 虚拟属性 - 改进建议数量
 */
reportSchema.virtual('recommendationCount').get(function() {
  return this.recommendations.length
})

/**
 * 虚拟属性 - 高优先级建议数量
 */
reportSchema.virtual('highPriorityRecommendations').get(function() {
  return this.recommendations.filter(r => r.priority === 'high').length
})

/**
 * 索引定义
 */
reportSchema.index({ userId: 1, dateRange: -1 })
reportSchema.index({ planId: 1 }, { unique: true, sparse: true })
reportSchema.index({ reportType: 1 })
reportSchema.index({ 'dateRange.startDate': 1, 'dateRange.endDate': 1 })
reportSchema.index({ createdAt: 1 })
reportSchema.index({ 'shareSettings.shareCode': 1 }, { sparse: true })

/**
 * 中间件 - 保存前处理
 */
reportSchema.pre('save', function(next) {
  // 生成分享码（如果需要分享）
  if (this.shareSettings.isShared && !this.shareSettings.shareCode) {
    this.shareSettings.shareCode = `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
  }
  
  // 自动生成标题（如果没有）
  if (!this.title) {
    const dateStr = this.dateRange.startDate.toLocaleDateString('zh-CN')
    const typeMap = {
      daily: '日报',
      weekly: '周报',
      monthly: '月报',
      plan_completion: '计划完成报告',
      comprehensive: '综合报告'
    }
    this.title = `${typeMap[this.reportType]} - ${dateStr}`
  }
  
  next()
})

/**
 * 实例方法 - 计算总体评级
 */
reportSchema.methods.calculateOverallGrade = function() {
  const accuracy = this.overallStats.overallAccuracy
  const consistency = this.learningHabits.studyTimePattern.weeklyConsistency
  const improvement = this.getImprovementScore()
  
  // 综合评分算法
  const score = (accuracy * 0.4) + (consistency * 0.3) + (improvement * 0.3)
  
  if (score >= 95) return 'A+'
  if (score >= 90) return 'A'
  if (score >= 85) return 'B+'
  if (score >= 80) return 'B'
  if (score >= 75) return 'C+'
  if (score >= 70) return 'C'
  return 'D'
}

/**
 * 实例方法 - 获取改进分数
 */
reportSchema.methods.getImprovementScore = function() {
  if (this.progressTrend.length < 2) return 50 // 默认分数
  
  const recent = this.progressTrend.slice(-3) // 最近3个数据点
  const earlier = this.progressTrend.slice(0, 3) // 较早的3个数据点
  
  if (earlier.length === 0) return 50
  
  const recentAvg = recent.reduce((sum, p) => sum + p.accuracy, 0) / recent.length
  const earlierAvg = earlier.reduce((sum, p) => sum + p.accuracy, 0) / earlier.length
  
  const improvement = ((recentAvg - earlierAvg) / earlierAvg) * 100
  
  // 转换为0-100分数
  return Math.max(0, Math.min(100, 50 + improvement * 2))
}

/**
 * 实例方法 - 添加建议
 * @param {Object} recommendation - 建议对象
 */
reportSchema.methods.addRecommendation = function(recommendation) {
  this.recommendations.push(recommendation)
  return this.save()
}

/**
 * 实例方法 - 实施建议
 * @param {number} recommendationIndex - 建议索引
 */
reportSchema.methods.implementRecommendation = function(recommendationIndex) {
  if (recommendationIndex >= 0 && recommendationIndex < this.recommendations.length) {
    this.recommendations[recommendationIndex].isImplemented = true
    this.recommendations[recommendationIndex].implementedAt = new Date()
    return this.save()
  }
  throw new Error('建议索引无效')
}

/**
 * 实例方法 - 添加成就
 * @param {Object} achievement - 成就对象
 */
reportSchema.methods.addAchievement = function(achievement) {
  this.achievements.push({
    ...achievement,
    earnedDate: new Date()
  })
  return this.save()
}

/**
 * 实例方法 - 生成分享链接
 */
reportSchema.methods.generateShareLink = function() {
  if (!this.shareSettings.shareCode) {
    this.shareSettings.shareCode = `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
    this.shareSettings.isShared = true
  }
  
  return this.save().then(() => {
    return `/share/report/${this.shareSettings.shareCode}`
  })
}

/**
 * 静态方法 - 生成学习报告
 * @param {string} userId - 用户ID
 * @param {Object} options - 生成选项
 * @returns {Promise<Report>} 生成的报告
 */
reportSchema.statics.generateReport = async function(userId, options = {}) {
  const {
    reportType = 'weekly',
    startDate,
    endDate,
    planId
  } = options
  
  // 计算默认时间范围
  let reportStartDate, reportEndDate
  if (startDate && endDate) {
    reportStartDate = new Date(startDate)
    reportEndDate = new Date(endDate)
  } else {
    reportEndDate = new Date()
    reportStartDate = new Date()
    
    switch (reportType) {
      case 'daily':
        reportStartDate.setDate(reportStartDate.getDate() - 1)
        break
      case 'weekly':
        reportStartDate.setDate(reportStartDate.getDate() - 7)
        break
      case 'monthly':
        reportStartDate.setMonth(reportStartDate.getMonth() - 1)
        break
      default:
        reportStartDate.setDate(reportStartDate.getDate() - 7)
    }
  }
  
  // 创建新报告
  const report = new this({
    userId,
    planId,
    reportType,
    dateRange: {
      startDate: reportStartDate,
      endDate: reportEndDate
    },
    status: 'generating'
  })
  
  try {
    // 这里应该调用数据分析服务来填充报告内容
    // 暂时创建基础结构
    await report.save()
    
    // 异步生成报告内容
    setImmediate(() => {
      report.generateReportContent().catch(console.error)
    })
    
    return report
  } catch (error) {
    report.status = 'failed'
    await report.save()
    throw error
  }
}

/**
 * 实例方法 - 生成报告内容
 */
reportSchema.methods.generateReportContent = async function() {
  try {
    // 获取用户学习数据
    const Plan = mongoose.model('Plan')
    const AIChat = mongoose.model('AIChat')
    
    const plans = await Plan.find({
      userId: this.userId,
      createdAt: {
        $gte: this.dateRange.startDate,
        $lte: this.dateRange.endDate
      }
    })
    
    const chats = await AIChat.find({
      userId: this.userId,
      createdAt: {
        $gte: this.dateRange.startDate,
        $lte: this.dateRange.endDate
      }
    })
    
    // 计算总体统计
    this.overallStats = this.calculateOverallStats(plans, chats)
    
    // 分析各学科表现
    this.subjectPerformance = this.analyzeSubjectPerformance(plans)
    
    // 分析学习习惯
    this.learningHabits = this.analyzeLearningHabits(plans, chats)
    
    // 生成个性化建议
    this.recommendations = this.generateRecommendations()
    
    // 计算评级
    this.learningGrade.overall = this.calculateOverallGrade()
    
    // 生成AI总结
    this.aiSummary = this.generateAISummary()
    
    this.status = 'completed'
    await this.save()
    
  } catch (error) {
    console.error('生成报告内容失败:', error)
    this.status = 'failed'
    await this.save()
  }
}

/**
 * 辅助方法 - 计算总体统计
 */
reportSchema.methods.calculateOverallStats = function(plans, chats) {
  const totalQuestions = plans.reduce((sum, p) => sum + p.progress.totalQuestions, 0)
  const totalCorrectAnswers = plans.reduce((sum, p) => sum + p.progress.correctAnswers, 0)
  const totalStudyTime = plans.reduce((sum, p) => sum + (p.actualDuration || 0), 0)
  
  return {
    totalStudyTime,
    totalQuestions,
    totalCorrectAnswers,
    overallAccuracy: totalQuestions > 0 ? Math.round((totalCorrectAnswers / totalQuestions) * 100) : 0,
    studyDays: this.reportDuration,
    averageDailyStudyTime: Math.round(totalStudyTime / this.reportDuration),
    completedPlans: plans.filter(p => p.status === 'completed').length,
    aiInteractions: chats.reduce((sum, c) => sum + c.messages.length, 0)
  }
}

/**
 * 辅助方法 - 分析各学科表现
 */
reportSchema.methods.analyzeSubjectPerformance = function(plans) {
  const subjects = ['math', 'chinese', 'english']
  
  return subjects.map(subject => {
    const subjectPlans = plans.filter(p => p.subject === subject)
    const totalQuestions = subjectPlans.reduce((sum, p) => sum + p.progress.totalQuestions, 0)
    const correctAnswers = subjectPlans.reduce((sum, p) => sum + p.progress.correctAnswers, 0)
    
    return {
      subject,
      totalQuestions,
      correctAnswers,
      accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
      averageTime: 0, // 需要更详细的时间统计
      improvementRate: 0, // 需要历史数据对比
      knowledgePointsMastery: [],
      difficultyBreakdown: {
        easy: { total: 0, correct: 0 },
        normal: { total: 0, correct: 0 },
        hard: { total: 0, correct: 0 }
      },
      commonMistakes: []
    }
  })
}

/**
 * 辅助方法 - 分析学习习惯
 */
reportSchema.methods.analyzeLearningHabits = function(plans, chats) {
  return {
    studyTimePattern: {
      preferredHours: [],
      averageSessionDuration: plans.length > 0 ? 
        Math.round(plans.reduce((sum, p) => sum + (p.actualDuration || 0), 0) / plans.length) : 0,
      dailyStudyTime: Math.round(this.overallStats.totalStudyTime / this.reportDuration),
      weeklyConsistency: 80 // 示例值
    },
    behaviorPatterns: {
      attentionSpan: 25, // 示例值
      mistakeHandling: 'reviews_carefully',
      difficultyPreference: 'mixed',
      learningPace: 'moderate'
    },
    interactionPatterns: {
      hintUsageFrequency: 0,
      questionsAskedCount: chats.length,
      selfCorrectionRate: 75, // 示例值
      aiInteractionSatisfaction: 4 // 示例值
    }
  }
}

/**
 * 辅助方法 - 生成建议
 */
reportSchema.methods.generateRecommendations = function() {
  const recommendations = []
  
  // 基于准确率的建议
  if (this.overallStats.overallAccuracy < 70) {
    recommendations.push({
      type: 'practice_focus',
      priority: 'high',
      title: '加强基础练习',
      description: '当前整体正确率偏低，建议重点练习基础题目',
      actionItems: ['每天完成10道基础题', '复习错题', '寻求老师帮助'],
      estimatedImpact: 'high'
    })
  }
  
  // 基于学习时间的建议
  if (this.overallStats.averageDailyStudyTime < 30) {
    recommendations.push({
      type: 'time_management',
      priority: 'medium',
      title: '增加学习时间',
      description: '建议每天增加15-20分钟的学习时间',
      actionItems: ['制定学习计划', '设置学习提醒', '找到固定学习时间'],
      estimatedImpact: 'medium'
    })
  }
  
  return recommendations
}

/**
 * 辅助方法 - 生成AI总结
 */
reportSchema.methods.generateAISummary = function() {
  return {
    strengths: ['学习态度认真', '能够坚持完成计划'],
    weaknesses: ['某些知识点掌握不够牢固'],
    keyInsights: ['需要加强基础练习', '学习习惯良好'],
    motivationalMessage: '继续保持良好的学习习惯，相信你会越来越优秀！',
    parentReport: '孩子学习认真，建议家长多鼓励并协助制定学习计划。'
  }
}

/**
 * 静态方法 - 根据分享码查找报告
 * @param {string} shareCode - 分享码
 * @returns {Promise<Report|null>} 报告对象
 */
reportSchema.statics.findByShareCode = function(shareCode) {
  return this.findOne({ 'shareSettings.shareCode': shareCode })
    .populate('userId', 'name avatarUrl')
}

/**
 * 静态方法 - 获取用户报告列表
 * @param {string} userId - 用户ID
 * @param {Object} options - 查询选项
 * @returns {Promise<Report[]>} 报告列表
 */
reportSchema.statics.getUserReports = function(userId, options = {}) {
  const query = { userId }
  
  if (options.reportType) {
    query.reportType = options.reportType
  }
  
  if (options.status) {
    query.status = options.status
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0)
    .populate('planId', 'title subject grade')
}

module.exports = mongoose.model('Report', reportSchema) 