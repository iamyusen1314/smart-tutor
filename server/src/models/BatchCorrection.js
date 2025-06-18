/**
 * 批改结果数据模型
 * @description 定义批改结果集合的数据结构和方法
 */

const mongoose = require('mongoose')

/**
 * 批改项目数据模式
 */
const correctionItemSchema = new mongoose.Schema({
  // 题目信息
  questionNumber: {
    type: Number,
    required: true
  },
  
  questionText: {
    type: String,
    maxlength: [1000, '题目文本不能超过1000个字符']
  },
  
  questionType: {
    type: String,
    enum: ['choice', 'fill_blank', 'calculation', 'essay', 'true_false'],
    default: 'calculation'
  },
  
  // OCR识别结果
  ocrResult: {
    recognizedText: { type: String, default: '' },
    confidence: { type: Number, min: 0, max: 100, default: 0 },
    boundingBox: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 }
    }
  },
  
  // 学生答案
  studentAnswer: {
    originalText: { type: String, default: '' }, // OCR原始文本
    normalizedText: { type: String, default: '' }, // 标准化后的文本
    hasAnswer: { type: Boolean, default: false } // 是否有作答
  },
  
  // 标准答案
  correctAnswer: {
    text: { type: String, required: true },
    acceptableAnswers: [{ type: String }], // 可接受的答案变体
    explanation: { type: String, default: '' }
  },
  
  // 批改结果
  correctionResult: {
    isCorrect: { type: Boolean, default: false },
    score: { type: Number, min: 0, max: 100, default: 0 },
    partialCredit: { type: Number, min: 0, max: 100, default: 0 }, // 部分分数
    status: {
      type: String,
      enum: ['correct', 'incorrect', 'partial', 'no_answer', 'unclear'],
      default: 'unclear'
    }
  },
  
  // AI分析
  aiAnalysis: {
    errorType: {
      type: String,
      enum: ['calculation_error', 'concept_misunderstanding', 'careless_mistake', 'incomplete_answer', 'wrong_method', 'no_error'],
      default: 'no_error'
    },
    difficulty: {
      type: String,
      enum: ['easy', 'normal', 'hard'],
      default: 'normal'
    },
    knowledgePoints: [{ type: String }],
    feedback: { type: String, default: '' }, // AI生成的反馈
    suggestions: [{ type: String }], // 改进建议
    similarMistakes: [{ type: String }] // 类似错误模式
  },
  
  // 批改置信度
  confidence: {
    ocrAccuracy: { type: Number, min: 0, max: 100, default: 0 },
    correctionAccuracy: { type: Number, min: 0, max: 100, default: 0 },
    needsReview: { type: Boolean, default: false }
  }
}, { _id: false })

/**
 * 批改结果数据模式
 */
const batchCorrectionSchema = new mongoose.Schema({
  // 关联用户
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 关联学习计划
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true,
    unique: true,
    index: true
  },
  
  // 批改基本信息
  title: {
    type: String,
    required: true,
    maxlength: [100, '批改标题不能超过100个字符']
  },
  
  description: {
    type: String,
    maxlength: [500, '批改描述不能超过500个字符']
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
  
  // 原始图片信息
  originalImages: [{
    url: { type: String, required: true },
    filename: { type: String, required: true },
    size: { type: Number, default: 0 }, // 文件大小（字节）
    dimensions: {
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 }
    },
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // 处理后的图片（如果有预处理）
  processedImages: [{
    url: { type: String, required: true },
    processingType: {
      type: String,
      enum: ['rotation', 'noise_reduction', 'contrast_enhancement', 'binarization'],
      required: true
    },
    confidence: { type: Number, min: 0, max: 100, default: 0 }
  }],
  
  // 批改项目列表
  correctionItems: [correctionItemSchema],
  
  // 总体统计
  overallStats: {
    totalQuestions: { type: Number, default: 0 },
    answeredQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    incorrectAnswers: { type: Number, default: 0 },
    unansweredQuestions: { type: Number, default: 0 },
    overallScore: { type: Number, min: 0, max: 100, default: 0 },
    accuracy: { type: Number, min: 0, max: 100, default: 0 }
  },
  
  // 错误分析
  errorAnalysis: {
    commonErrorTypes: [{
      type: { type: String, required: true },
      count: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 }
    }],
    knowledgeGaps: [{
      knowledgePoint: { type: String, required: true },
      masteryLevel: { type: Number, min: 0, max: 100, default: 0 },
      questionsCount: { type: Number, default: 0 },
      correctCount: { type: Number, default: 0 }
    }],
    difficultyDistribution: {
      easy: { total: { type: Number, default: 0 }, correct: { type: Number, default: 0 } },
      normal: { total: { type: Number, default: 0 }, correct: { type: Number, default: 0 } },
      hard: { total: { type: Number, default: 0 }, correct: { type: Number, default: 0 } }
    }
  },
  
  // 个性化建议
  recommendations: [{
    type: {
      type: String,
      enum: ['knowledge_review', 'practice_more', 'method_improvement', 'attention_to_detail', 'concept_strengthening'],
      required: true
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    targetKnowledgePoints: [{ type: String }],
    practiceQuestions: [{ type: String }] // 推荐练习题目ID
  }],
  
  // 处理状态
  processingStatus: {
    stage: {
      type: String,
      enum: ['uploading', 'ocr_processing', 'ai_analyzing', 'generating_report', 'completed', 'failed'],
      default: 'uploading'
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    currentStep: { type: String, default: '' },
    errorMessage: { type: String, default: '' },
    completedAt: { type: Date }
  },
  
  // 处理时间统计
  processingTime: {
    ocrDuration: { type: Number, default: 0 }, // OCR处理时间（毫秒）
    aiAnalysisDuration: { type: Number, default: 0 }, // AI分析时间（毫秒）
    totalDuration: { type: Number, default: 0 }, // 总处理时间（毫秒）
    startedAt: { type: Date },
    finishedAt: { type: Date }
  },
  
  // AI模型信息
  aiModelInfo: {
    ocrModel: { type: String, default: '' },
    correctionModel: { type: String, default: '' },
    confidence: { type: Number, min: 0, max: 100, default: 0 },
    version: { type: String, default: '1.0' }
  },
  
  // 质量控制
  qualityControl: {
    needsManualReview: { type: Boolean, default: false },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewNotes: { type: String, default: '' },
    reviewedAt: { type: Date },
    overallConfidence: { type: Number, min: 0, max: 100, default: 0 }
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
 * 虚拟属性 - 批改结果ID
 */
batchCorrectionSchema.virtual('id').get(function() {
  return this._id.toHexString()
})

/**
 * 虚拟属性 - 是否完成处理
 */
batchCorrectionSchema.virtual('isCompleted').get(function() {
  return this.processingStatus.stage === 'completed'
})

/**
 * 虚拟属性 - 是否处理失败
 */
batchCorrectionSchema.virtual('isFailed').get(function() {
  return this.processingStatus.stage === 'failed'
})

/**
 * 虚拟属性 - 处理进度百分比
 */
batchCorrectionSchema.virtual('progressPercentage').get(function() {
  return this.processingStatus.progress
})

/**
 * 虚拟属性 - 主要错误类型
 */
batchCorrectionSchema.virtual('primaryErrorType').get(function() {
  if (this.errorAnalysis.commonErrorTypes.length === 0) return null
  return this.errorAnalysis.commonErrorTypes.reduce((prev, current) => 
    (prev.count > current.count) ? prev : current
  )
})

/**
 * 索引定义
 */
batchCorrectionSchema.index({ userId: 1, createdAt: -1 })
batchCorrectionSchema.index({ planId: 1 })
batchCorrectionSchema.index({ subject: 1, grade: 1 })
batchCorrectionSchema.index({ 'processingStatus.stage': 1 })
batchCorrectionSchema.index({ 'overallStats.accuracy': 1 })
batchCorrectionSchema.index({ createdAt: 1 })

/**
 * 中间件 - 保存前更新统计
 */
batchCorrectionSchema.pre('save', function(next) {
  // 更新总体统计
  this.overallStats.totalQuestions = this.correctionItems.length
  
  const answeredItems = this.correctionItems.filter(item => item.studentAnswer.hasAnswer)
  this.overallStats.answeredQuestions = answeredItems.length
  
  const correctItems = this.correctionItems.filter(item => item.correctionResult.isCorrect)
  this.overallStats.correctAnswers = correctItems.length
  
  this.overallStats.incorrectAnswers = answeredItems.length - correctItems.length
  this.overallStats.unansweredQuestions = this.overallStats.totalQuestions - answeredItems.length
  
  // 计算准确率
  if (answeredItems.length > 0) {
    this.overallStats.accuracy = Math.round((correctItems.length / answeredItems.length) * 100)
  }
  
  // 计算总分
  if (this.overallStats.totalQuestions > 0) {
    this.overallStats.overallScore = Math.round((correctItems.length / this.overallStats.totalQuestions) * 100)
  }
  
  next()
})

/**
 * 实例方法 - 开始处理
 */
batchCorrectionSchema.methods.startProcessing = function() {
  this.processingStatus.stage = 'ocr_processing'
  this.processingStatus.progress = 10
  this.processingStatus.currentStep = 'OCR识别中...'
  this.processingTime.startedAt = new Date()
  
  return this.save()
}

/**
 * 实例方法 - 更新处理进度
 * @param {string} stage - 处理阶段
 * @param {number} progress - 进度百分比
 * @param {string} step - 当前步骤描述
 */
batchCorrectionSchema.methods.updateProgress = function(stage, progress, step) {
  this.processingStatus.stage = stage
  this.processingStatus.progress = progress
  this.processingStatus.currentStep = step
  
  return this.save()
}

/**
 * 实例方法 - 完成处理
 * @param {boolean} success - 是否成功完成
 * @param {string} errorMessage - 错误信息（如果失败）
 */
batchCorrectionSchema.methods.completeProcessing = function(success = true, errorMessage = '') {
  if (success) {
    this.processingStatus.stage = 'completed'
    this.processingStatus.progress = 100
    this.processingStatus.currentStep = '批改完成'
  } else {
    this.processingStatus.stage = 'failed'
    this.processingStatus.errorMessage = errorMessage
  }
  
  this.processingStatus.completedAt = new Date()
  this.processingTime.finishedAt = new Date()
  
  if (this.processingTime.startedAt) {
    this.processingTime.totalDuration = this.processingTime.finishedAt - this.processingTime.startedAt
  }
  
  return this.save()
}

/**
 * 实例方法 - 添加批改项目
 * @param {Object} itemData - 批改项目数据
 */
batchCorrectionSchema.methods.addCorrectionItem = function(itemData) {
  this.correctionItems.push(itemData)
  return this.save()
}

/**
 * 实例方法 - 更新批改项目
 * @param {number} itemIndex - 项目索引
 * @param {Object} updateData - 更新数据
 */
batchCorrectionSchema.methods.updateCorrectionItem = function(itemIndex, updateData) {
  if (itemIndex >= 0 && itemIndex < this.correctionItems.length) {
    Object.assign(this.correctionItems[itemIndex], updateData)
    return this.save()
  }
  throw new Error('批改项目索引无效')
}

/**
 * 实例方法 - 生成错误分析
 */
batchCorrectionSchema.methods.generateErrorAnalysis = function() {
  const errorTypeCounts = {}
  const knowledgePointStats = {}
  const difficultyStats = {
    easy: { total: 0, correct: 0 },
    normal: { total: 0, correct: 0 },
    hard: { total: 0, correct: 0 }
  }
  
  // 统计错误类型
  this.correctionItems.forEach(item => {
    if (!item.correctionResult.isCorrect && item.aiAnalysis.errorType !== 'no_error') {
      const errorType = item.aiAnalysis.errorType
      errorTypeCounts[errorType] = (errorTypeCounts[errorType] || 0) + 1
    }
    
    // 统计知识点掌握情况
    item.aiAnalysis.knowledgePoints.forEach(point => {
      if (!knowledgePointStats[point]) {
        knowledgePointStats[point] = { total: 0, correct: 0 }
      }
      knowledgePointStats[point].total += 1
      if (item.correctionResult.isCorrect) {
        knowledgePointStats[point].correct += 1
      }
    })
    
    // 统计难度分布
    const difficulty = item.aiAnalysis.difficulty
    difficultyStats[difficulty].total += 1
    if (item.correctionResult.isCorrect) {
      difficultyStats[difficulty].correct += 1
    }
  })
  
  // 转换为数组格式
  this.errorAnalysis.commonErrorTypes = Object.entries(errorTypeCounts).map(([type, count]) => ({
    type,
    count,
    percentage: Math.round((count / this.overallStats.answeredQuestions) * 100)
  })).sort((a, b) => b.count - a.count)
  
  this.errorAnalysis.knowledgeGaps = Object.entries(knowledgePointStats).map(([point, stats]) => ({
    knowledgePoint: point,
    masteryLevel: Math.round((stats.correct / stats.total) * 100),
    questionsCount: stats.total,
    correctCount: stats.correct
  })).filter(gap => gap.masteryLevel < 80) // 只显示掌握度低于80%的知识点
  
  this.errorAnalysis.difficultyDistribution = difficultyStats
  
  return this.save()
}

/**
 * 实例方法 - 生成个性化建议
 */
batchCorrectionSchema.methods.generateRecommendations = function() {
  const recommendations = []
  
  // 基于错误分析生成建议
  if (this.errorAnalysis.commonErrorTypes.length > 0) {
    const primaryError = this.errorAnalysis.commonErrorTypes[0]
    
    switch (primaryError.type) {
      case 'calculation_error':
        recommendations.push({
          type: 'attention_to_detail',
          priority: 'high',
          title: '加强计算准确性',
          description: '发现多处计算错误，建议加强基础计算练习',
          targetKnowledgePoints: ['四则运算', '小数计算']
        })
        break
      
      case 'concept_misunderstanding':
        recommendations.push({
          type: 'concept_strengthening',
          priority: 'high',
          title: '概念理解加强',
          description: '存在概念理解偏差，建议重新学习相关概念',
          targetKnowledgePoints: []
        })
        break
      
      case 'careless_mistake':
        recommendations.push({
          type: 'attention_to_detail',
          priority: 'medium',
          title: '提高细心程度',
          description: '存在粗心错误，建议放慢做题速度，仔细检查',
          targetKnowledgePoints: []
        })
        break
    }
  }
  
  // 基于知识点掌握情况生成建议
  if (this.errorAnalysis.knowledgeGaps.length > 0) {
    const weakestPoint = this.errorAnalysis.knowledgeGaps.reduce((prev, current) => 
      (prev.masteryLevel < current.masteryLevel) ? prev : current
    )
    
    recommendations.push({
      type: 'knowledge_review',
      priority: 'high',
      title: `重点复习：${weakestPoint.knowledgePoint}`,
      description: `该知识点掌握程度较低（${weakestPoint.masteryLevel}%），建议重点复习`,
      targetKnowledgePoints: [weakestPoint.knowledgePoint]
    })
  }
  
  // 基于准确率生成建议
  if (this.overallStats.accuracy < 70) {
    recommendations.push({
      type: 'practice_more',
      priority: 'high',
      title: '增加练习量',
      description: '当前准确率偏低，建议增加相关题目练习',
      targetKnowledgePoints: []
    })
  }
  
  this.recommendations = recommendations
  return this.save()
}

/**
 * 实例方法 - 标记需要人工审核
 * @param {string} reason - 审核原因
 */
batchCorrectionSchema.methods.markForReview = function(reason) {
  this.qualityControl.needsManualReview = true
  this.qualityControl.reviewNotes = reason
  return this.save()
}

/**
 * 实例方法 - 完成人工审核
 * @param {string} reviewerId - 审核者ID
 * @param {string} notes - 审核备注
 * @param {number} confidence - 置信度
 */
batchCorrectionSchema.methods.completeReview = function(reviewerId, notes, confidence) {
  this.qualityControl.reviewedBy = reviewerId
  this.qualityControl.reviewNotes = notes
  this.qualityControl.overallConfidence = confidence
  this.qualityControl.reviewedAt = new Date()
  this.qualityControl.needsManualReview = false
  
  return this.save()
}

/**
 * 静态方法 - 创建批改任务
 * @param {Object} correctionData - 批改数据
 * @returns {Promise<BatchCorrection>} 创建的批改对象
 */
batchCorrectionSchema.statics.createCorrectionTask = function(correctionData) {
  const correction = new this({
    ...correctionData,
    processingStatus: {
      stage: 'uploading',
      progress: 0,
      currentStep: '上传图片中...'
    }
  })
  
  return correction.save()
}

/**
 * 静态方法 - 根据计划ID查找批改结果
 * @param {string} planId - 计划ID
 * @returns {Promise<BatchCorrection|null>} 批改结果
 */
batchCorrectionSchema.statics.findByPlanId = function(planId) {
  return this.findOne({ planId }).populate('userId planId')
}

/**
 * 静态方法 - 获取用户批改历史
 * @param {string} userId - 用户ID
 * @param {Object} options - 查询选项
 * @returns {Promise<BatchCorrection[]>} 批改历史列表
 */
batchCorrectionSchema.statics.getUserCorrections = function(userId, options = {}) {
  const query = { userId }
  
  if (options.subject) {
    query.subject = options.subject
  }
  
  if (options.status) {
    query['processingStatus.stage'] = options.status
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0)
    .populate('planId', 'title subject grade')
}

/**
 * 静态方法 - 获取批改统计信息
 * @param {Object} filters - 筛选条件
 * @returns {Promise<Object>} 统计数据
 */
batchCorrectionSchema.statics.getCorrectionStats = async function(filters = {}) {
  const matchStage = {}
  
  if (filters.userId) matchStage.userId = mongoose.Types.ObjectId(filters.userId)
  if (filters.subject) matchStage.subject = filters.subject
  if (filters.grade) matchStage.grade = filters.grade
  if (filters.dateRange) {
    matchStage.createdAt = {
      $gte: new Date(filters.dateRange.start),
      $lte: new Date(filters.dateRange.end)
    }
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCorrections: { $sum: 1 },
        completedCorrections: {
          $sum: { $cond: [{ $eq: ['$processingStatus.stage', 'completed'] }, 1, 0] }
        },
        averageAccuracy: { $avg: '$overallStats.accuracy' },
        totalQuestions: { $sum: '$overallStats.totalQuestions' },
        totalCorrectAnswers: { $sum: '$overallStats.correctAnswers' },
        averageProcessingTime: { $avg: '$processingTime.totalDuration' }
      }
    }
  ])
  
  return stats[0] || {}
}

module.exports = mongoose.model('BatchCorrection', batchCorrectionSchema) 