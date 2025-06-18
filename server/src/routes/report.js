/**
 * 学习报告路由
 * @description 生成学习报告、统计分析和历史记录相关的API端点
 */

const express = require('express')
const router = express.Router()
const { 
  generatePersonalizedAdvice, 
  generateKnowledgeAnalysis, 
  generateLearningPlan 
} = require('../services/aiAnalysisService')
const { createValidationMiddleware } = require('../utils/dataValidator')

// 🔧 导入AI聊天数据获取函数
const aiChatRouter = require('./ai-chat')

// 模拟数据存储 (实际项目中应使用数据库)
let learningRecords = []
let studyPlans = []

/**
 * 生成当日学习报告
 * @route GET /api/report/today
 * @description 根据学习计划ID生成当日详细学习报告
 */
router.get('/today', createValidationMiddleware('report'), async (req, res) => {
  try {
    const { planId, userId } = req.query
    
    console.log(`生成当日报告: planId=${planId}, userId=${userId}`)
    
    // 🔧 修复：如果没有planId，使用最新学习记录生成报告
    let targetPlanId = planId
    if (!planId) {
      console.log('⚠️ 未提供planId，尝试获取最新学习记录')
      targetPlanId = await getLatestPlanId(userId)
      if (!targetPlanId) {
        console.log('⚠️ 未找到学习记录，返回默认数据')
        targetPlanId = 'default_plan_' + Date.now()
      }
    }

    // 生成报告数据
    const reportData = await generateTodayReport(targetPlanId, userId)
    
    console.log(`当日报告生成成功: 正确率${reportData.summary.accuracy}%`)

    res.json({
      success: true,
      data: reportData
    })

  } catch (error) {
    console.error('生成当日报告失败:', error)
    
    res.status(500).json({
      success: false,
      error: '报告生成失败，请稍后重试',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * 获取学习历史记录
 * @route GET /api/report/history
 * @description 获取用户的历史学习记录列表
 */
router.get('/history', async (req, res) => {
  try {
    const { userId, limit = 10, offset = 0 } = req.query
    
    console.log(`获取学习历史: userId=${userId}, limit=${limit}`)
    
    // 获取历史记录
    const historyData = await getStudyHistory(userId, parseInt(limit), parseInt(offset))
    
    res.json({
      success: true,
      data: {
        records: historyData.records,
        total: historyData.total,
        hasMore: historyData.hasMore
      }
    })

  } catch (error) {
    console.error('获取学习历史失败:', error)
    
    res.status(500).json({
      success: false,
      error: '获取学习历史失败'
    })
  }
})

/**
 * 获取学习统计数据
 * @route GET /api/report/statistics
 * @description 获取用户的学习统计数据，支持图表展示
 */
router.get('/statistics', async (req, res) => {
  try {
    const { userId, period = '7d' } = req.query // 7d, 30d, 90d
    
    console.log(`获取学习统计: userId=${userId}, period=${period}`)
    
    // 生成统计数据
    const statistics = await generateStatistics(userId, period)
    
    res.json({
      success: true,
      data: statistics
    })

  } catch (error) {
    console.error('获取学习统计失败:', error)
    
    res.status(500).json({
      success: false,
      error: '获取学习统计失败'
    })
  }
})

/**
 * 保存学习记录
 * @route POST /api/report/save-record
 * @description 保存一次完整的学习记录
 */
router.post('/save-record', async (req, res) => {
  try {
    const {
      planId,
      userId,
      subject,
      grade,
      questions,
      answers,
      timeSpent,
      accuracy,
      mistakes
    } = req.body
    
    console.log(`保存学习记录: planId=${planId}, accuracy=${accuracy}%`)
    
    // 验证必需参数
    if (!planId || !userId || !subject) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      })
    }

    // 保存学习记录
    const record = await saveStudyRecord({
      planId,
      userId,
      subject,
      grade,
      questions,
      answers,
      timeSpent,
      accuracy,
      mistakes,
      createdAt: new Date()
    })
    
    res.json({
      success: true,
      data: {
        recordId: record.id,
        message: '学习记录保存成功'
      }
    })

  } catch (error) {
    console.error('保存学习记录失败:', error)
    
    res.status(500).json({
      success: false,
      error: '保存学习记录失败'
    })
  }
})

/**
 * 生成学习建议
 * @route GET /api/report/suggestions
 * @description 基于学习记录生成个性化学习建议
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { userId, subject, grade } = req.query
    
    console.log(`生成学习建议: userId=${userId}, subject=${subject}`)
    
    // 生成个性化建议
    const suggestions = await generateLearningAdvice(userId, subject, grade)
    
    res.json({
      success: true,
      data: suggestions
    })

  } catch (error) {
    console.error('生成学习建议失败:', error)
    
    res.status(500).json({
      success: false,
      error: '生成学习建议失败'
    })
  }
})

/**
 * 生成AI学习计划
 * @route GET /api/report/ai-plan
 * @description 使用AI生成个性化学习计划
 */
router.get('/ai-plan', async (req, res) => {
  try {
    const { 
      userId, 
      currentLevel = 'intermediate', 
      weeklyGoal = 'improvement', 
      availableTime = 5 
    } = req.query
    
    console.log(`🤖 生成AI学习计划: userId=${userId}`)
    
    // 获取用户学习历史以分析偏好和薄弱点
    const userHistory = await getStudyHistory(userId, 20, 0)
    const preferredSubjects = analyzePreferredSubjects(userHistory.records)
    const weakAreas = identifyWeakPoints(userHistory.records)
    const recentProgress = formatRecentProgress(userHistory.records)
    
    // 构建计划数据
    const planData = {
      userId,
      currentLevel,
      weeklyGoal,
      availableTime: parseInt(availableTime),
      preferredSubjects,
      weakAreas,
      recentProgress
    }
    
    // 调用AI生成学习计划
    const aiPlan = await generateLearningPlan(planData)
    
    console.log(`✅ AI学习计划生成成功`)
    
    res.json({
      success: true,
      data: {
        ...aiPlan,
        generatedAt: new Date().toISOString(),
        userId,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7天有效期
      }
    })

  } catch (error) {
    console.error('❌ AI学习计划生成失败:', error)
    
    res.status(500).json({
      success: false,
      error: 'AI学习计划生成失败，请稍后重试',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})


/**
 * 🔧 生成当日学习报告 - 修改为使用真实数据
 * @param {string} planId 学习计划ID
 * @param {string} userId 用户ID
 * @returns {Promise<Object>} 报告数据
 */
async function generateTodayReport(planId, userId) {
  try {
    console.log(`📊 生成真实学习报告: planId=${planId}, userId=${userId}`)
    
    // 🎯 获取真实学习数据
    const studyData = await getStudyDataByPlan(planId)
    
    // 🔧 修复：直接使用getStudyDataByPlan返回的统计数据，不再重新计算
    const totalQuestions = studyData.recordCount || 0  // 使用有效答案数量
    const correctAnswers = studyData.correctCount || 0
    const wrongAnswers = studyData.wrongCount || 0
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
    
    console.log(`📊 报告统计结果: ${totalQuestions}题, ${correctAnswers}对${wrongAnswers}错, 正确率${accuracy}%`)
    
    // 生成学科分布（如果有真实数据，使用真实比例）
    const subjectDistribution = studyData.isRealData ? 
      generateRealSubjectDistribution(studyData.subject, accuracy) : 
      generateSubjectDistribution(studyData.subject)
    
    // 从真实学习记录中提取常错知识点
    const commonMistakes = studyData.isRealData ? 
      extractRealMistakes(studyData) : 
      generateCommonMistakes(studyData.subject, studyData.grade)
    
    // 生成时间统计（使用真实时间）
    const timeStats = generateTimeStatistics(studyData.timeSpent || studyData.totalTime || 0)
    
    // 生成下步建议（基于真实表现）
    const nextSteps = generateNextSteps(studyData.subject, accuracy, commonMistakes)
    
    // 🏆 添加真实数据标识和详细信息
    const reportData = {
      planId,
      userId,
      date: new Date().toISOString().split('T')[0],
      summary: {
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        accuracy,
        timeSpent: studyData.timeSpent || 0,
        totalTime: studyData.totalTime || 0,
        subject: studyData.subject || 'math',
        grade: studyData.grade || 1,
        isRealData: studyData.isRealData, // 标记数据来源
        recordCount: studyData.recordCount || 0
      },
      subjectDistribution,
      timeStatistics: timeStats,
      commonMistakes,
      learningTrends: generateLearningTrends(userId),
      nextSteps,
      encouragement: generateEncouragement(accuracy),
      createdAt: new Date().toISOString(),
      
      // 🎯 修复：直接使用已过滤的questions，不需要再次过滤
      detailedRecords: studyData.isRealData ? studyData.questions.map(q => ({
        question: q.text,
        studentAnswer: q.studentAnswer,
        aiResponse: q.aiResponse,
        isCorrect: q.isCorrect,
        responseTime: q.responseTime,
        timestamp: q.timestamp
      })) : [],
      
      // 🚀 新增：AI分析建议
      aiAnalysis: studyData.isRealData ? {
        hasData: true,
        overallPerformance: accuracy >= 80 ? 'excellent' : accuracy >= 60 ? 'good' : 'needs_improvement',
        learningPattern: analyzePattern(studyData.questions),
        suggestions: generateDetailedSuggestions(studyData, accuracy)
      } : {
        hasData: false,
        message: '完成更多练习后，AI将为您提供个性化学习分析'
      },
      
      // 🎯 新增：AI交互记录（用于参考，不计入统计）
      aiInteractions: studyData.isRealData ? {
        hasData: true,
        totalQuestions: totalQuestions,
        totalCorrect: correctAnswers,
        totalTime: studyData.totalTime || studyData.timeSpent || 0, // 秒数
        subject: studyData.subject || 'math',
        weakPoints: commonMistakes.map(m => m.name),
        completedAt: new Date()
      } : {
        hasData: false,
        message: '完成真实学习后可获得游戏奖励'
      }
    }
    
    // 🎮 新增：如果有真实学习数据，自动触发游戏化奖励
    if (studyData.isRealData && userId && userId !== 'undefined') {
      try {
        console.log(`🎮 学习报告完成，触发游戏奖励: userId=${userId}`)
        
        // 构建学习报告数据传递给游戏系统
        const gameReportData = {
          correctRate: accuracy,
          totalQuestions: totalQuestions,
          totalCorrect: correctAnswers,
          totalTime: studyData.totalTime || studyData.timeSpent || 0, // 秒数
          subject: studyData.subject || 'math',
          weakPoints: commonMistakes.map(m => m.name),
          completedAt: new Date()
        }
        
        // 调用游戏系统同步API（内部调用）
        const gameService = require('../services/gameService')
        const gameResult = await gameService.syncLearningReportToGame(userId, planId, gameReportData)
        
        console.log(`🎮 学习报告游戏奖励已触发: 经验+${gameResult.expGained}, 金币+${gameResult.coinsGained}`)
        
        // 在报告数据中添加游戏奖励信息
        reportData.gameReward = {
          triggered: true,
          expGained: gameResult.expGained,
          coinsGained: gameResult.coinsGained,
          newLevel: gameResult.leveledUp,
          newBadges: gameResult.newBadges || [],
          message: '学习完成获得游戏奖励！'
        }
        
      } catch (gameError) {
        // 游戏奖励失败不影响报告生成
        console.warn('⚠️ 游戏奖励触发失败:', gameError.message)
        reportData.gameReward = {
          triggered: false,
          error: gameError.message,
          message: '游戏奖励暂时不可用'
        }
      }
    } else {
      reportData.gameReward = {
        triggered: false,
        message: '完成真实学习后可获得游戏奖励'
      }
    }
    
    console.log(`✅ 学习报告生成完成: ${studyData.isRealData ? '真实数据' : '默认数据'}`)
    return reportData
    
  } catch (error) {
    console.error('❌ 生成学习报告失败:', error)
    throw error
  }
}

/**
 * 生成真实学科分布（基于实际表现）
 */
function generateRealSubjectDistribution(subject, accuracy) {
  const distribution = { math: 75, chinese: 75, english: 75 }
  
  // 根据实际表现调整当前学科分数
  distribution[subject] = accuracy
  
  return distribution
}

/**
 * 从真实学习数据中提取常错知识点
 */
function extractRealMistakes(studyData) {
  const mistakes = []
  
  if (studyData.questions) {
    studyData.questions.forEach(q => {
      if (q.isCorrect === false) {
        // 分析错误类型
        const errorType = classifyQuestionError(q.text, q.studentAnswer)
        mistakes.push({
          id: mistakes.length + 1,
          name: errorType,
          question: q.text,
          studentAnswer: q.studentAnswer,
          frequency: 1,
          improvement: Math.floor(Math.random() * 20) + 70 // 模拟改进百分比
        })
      }
    })
  }
  
  return mistakes.length > 0 ? mistakes : [
    { id: 1, name: '表现良好', frequency: 0, improvement: 95 }
  ]
}

/**
 * 分类题目错误
 */
function classifyQuestionError(question, studentAnswer) {
  const q = (question || '').toLowerCase()
  const answer = (studentAnswer || '').toLowerCase()
  
  if (q.includes('+') || q.includes('加')) return '加法运算'
  if (q.includes('-') || q.includes('减')) return '减法运算'
  if (q.includes('×') || q.includes('乘')) return '乘法运算'
  if (q.includes('÷') || q.includes('除')) return '除法运算'
  if (q.includes('小明') || q.includes('应用')) return '应用题理解'
  
  return '基础概念'
}

/**
 * 分析学习模式
 */
function analyzePattern(questions) {
  if (!questions || questions.length === 0) return '暂无数据'
  
  const correctCount = questions.filter(q => q.isCorrect === true).length
  const accuracy = correctCount / questions.length
  
  if (accuracy >= 0.9) return '学习能力优秀，掌握扎实'
  if (accuracy >= 0.7) return '学习能力良好，有待提升'
  if (accuracy >= 0.5) return '基础薄弱，需要加强'
  return '需要重点关注和辅导'
}

/**
 * 生成详细建议
 */
function generateDetailedSuggestions(studyData, accuracy) {
  const suggestions = []
  
  if (accuracy < 60) {
    suggestions.push('建议重新复习基础概念，从简单题目开始练习')
    suggestions.push('可以寻求老师或家长的帮助，一对一辅导')
  } else if (accuracy < 80) {
    suggestions.push('基础掌握较好，建议增加练习量提高熟练度')
    suggestions.push('注意错题总结，避免重复犯错')
  } else {
    suggestions.push('表现优秀！可以尝试更有挑战性的题目')
    suggestions.push('保持学习节奏，继续巩固已学知识')
  }
  
  return suggestions
}

/**
 * 🔧 获取最新学习记录的planId
 * @param {string} userId 用户ID
 * @returns {Promise<string|null>} 最新的planId或null
 */
async function getLatestPlanId(userId) {
  try {
    console.log(`🔍 查找用户最新学习记录: userId=${userId}`)
    
    // 🔧 修复：直接从ai-chat模块获取globalLearningRecords
    const aiChatModule = require('./ai-chat')
    const globalLearningRecords = aiChatModule.globalLearningRecords
    
    if (!globalLearningRecords || globalLearningRecords.length === 0) {
      console.log(`⚠️ 全局学习记录为空`)
      return null
    }
    
    // 过滤用户的学习记录，按时间排序
    const userRecords = globalLearningRecords
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    
    if (userRecords.length > 0) {
      const latestRecord = userRecords[0]
      console.log(`✅ 找到最新学习记录: planId=${latestRecord.planId}, 时间=${latestRecord.timestamp}`)
      return latestRecord.planId
    }
    
    console.log(`⚠️ 未找到用户学习记录: userId=${userId}`)
    return null
    
  } catch (error) {
    console.error('❌ 获取最新planId失败:', error)
    return null
  }
}

/**
 * 获取学习历史记录
 * @param {string} userId 用户ID
 * @param {number} limit 限制数量
 * @param {number} offset 偏移量
 * @returns {Promise<Object>} 历史记录
 */
async function getStudyHistory(userId, limit, offset) {
  // 模拟历史记录数据
  const mockRecords = [
    {
      id: '1',
      date: '2025-06-13',
      subject: 'math',
      grade: 3,
      accuracy: 85,
      timeSpent: 12,
      questionCount: 5,
      summary: '数学：5题，正确率85%，用时12分钟'
    },
    {
      id: '2', 
      date: '2025-06-12',
      subject: 'chinese',
      grade: 3,
      accuracy: 90,
      timeSpent: 10,
      questionCount: 4,
      summary: '语文：4题，正确率90%，用时10分钟'
    },
    {
      id: '3',
      date: '2025-06-11',
      subject: 'math',
      grade: 3,
      accuracy: 75,
      timeSpent: 15,
      questionCount: 6,
      summary: '数学：6题，正确率75%，用时15分钟'
    },
    {
      id: '4',
      date: '2025-06-10',
      subject: 'english',
      grade: 3,
      accuracy: 80,
      timeSpent: 8,
      questionCount: 3,
      summary: '英语：3题，正确率80%，用时8分钟'
    },
    {
      id: '5',
      date: '2025-06-09',
      subject: 'chinese',
      grade: 3,
      accuracy: 95,
      timeSpent: 11,
      questionCount: 4,
      summary: '语文：4题，正确率95%，用时11分钟'
    }
  ]

  const records = mockRecords.slice(offset, offset + limit)
  
  return {
    records,
    total: mockRecords.length,
    hasMore: offset + limit < mockRecords.length
  }
}

/**
 * 生成学习统计数据
 * @param {string} userId 用户ID
 * @param {string} period 统计周期
 * @returns {Promise<Object>} 统计数据
 */
async function generateStatistics(userId, period) {
  // 生成时间范围内的统计数据
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 7
  
  // 模拟学习趋势数据
  const learningTrend = []
  const subjectStats = { math: 0, chinese: 0, english: 0 }
  let totalTime = 0
  let totalQuestions = 0
  let totalCorrect = 0
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    // 模拟当天数据
    const dailyQuestions = Math.floor(Math.random() * 8) + 2
    const dailyCorrect = Math.floor(dailyQuestions * (0.7 + Math.random() * 0.3))
    const dailyTime = Math.floor(Math.random() * 20) + 5
    const accuracy = Math.round((dailyCorrect / dailyQuestions) * 100)
    
    learningTrend.push({
      date: dateStr,
      accuracy,
      timeSpent: dailyTime,
      questionCount: dailyQuestions
    })
    
    // 随机分配学科
    const subjects = ['math', 'chinese', 'english']
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)]
    subjectStats[randomSubject] += dailyQuestions
    
    totalTime += dailyTime
    totalQuestions += dailyQuestions
    totalCorrect += dailyCorrect
  }
  
  const overallAccuracy = Math.round((totalCorrect / totalQuestions) * 100)
  
  return {
    period,
    overview: {
      totalTime,
      totalQuestions,
      overallAccuracy,
      averageTimePerQuestion: Math.round(totalTime / totalQuestions * 10) / 10
    },
    learningTrend,
    subjectDistribution: subjectStats,
    weeklyComparison: generateWeeklyComparison(),
    knowledgePointAnalysis: await generateKnowledgePointAnalysis(userId, 'general')
  }
}

/**
 * 🎯 获取学习计划数据 - 按新逻辑：只统计首次有效答案 - 🔧 修改为数据库查询
 * @param {string} planId 计划ID
 * @returns {Promise<Object>} 学习数据
 */
async function getStudyDataByPlan(planId) {
  try {
    console.log(`📊 获取学习计划真实数据: planId=${planId}`)
    
    // 🔧 修改：使用数据库查询替换内存查询
    const LearningRecord = require('../models/LearningRecord')
    const allRecords = await LearningRecord.find({ planId }).sort({ createdAt: 1 }).lean()
    
    if (!allRecords || allRecords.length === 0) {
      console.log('⚠️ 未找到学习记录，返回默认数据')
      return getDefaultStudyData(planId)
    }
    
    // 转换为兼容格式
    const compatibleRecords = allRecords.map(record => ({
      userId: record.userId,
      planId: record.planId,
      question: record.question,
      studentInput: record.studentInput,
      firstAnswer: record.firstAnswer,
      finalAnswer: record.finalAnswer,
      isCorrect: record.isCorrect,
      aiResponse: record.aiResponse,
      subject: record.subject,
      grade: record.grade,
      studentAnswer: record.answerVerification?.studentAnswer,
      correctAnswer: record.answerVerification?.correctAnswer,
      sessionId: record.learningContext?.sessionId,
      timestamp: record.createdAt,
      responseTime: record.timestamps?.duration || 0
    }))
    
    // 🎯 新逻辑：统计所有首次提交答案的记录（包括非数字回答）
    const allSubmissionRecords = compatibleRecords.filter(r => r.isCorrect !== null)
    
    console.log('📊 新统计逻辑调试:', {
      '总记录数': compatibleRecords.length,
      '首次提交记录数': allSubmissionRecords.length,
      '正确答案数': allSubmissionRecords.filter(r => r.isCorrect === true).length,
      '错误答案数': allSubmissionRecords.filter(r => r.isCorrect === false).length
    })
    
    // 🔧 按新逻辑统计：统计所有首次提交答案的记录
    const totalQuestions = allSubmissionRecords.length
    const correctAnswers = allSubmissionRecords.filter(r => r.isCorrect === true).length
    const wrongAnswers = allSubmissionRecords.filter(r => r.isCorrect === false).length
    
    const totalTime = allSubmissionRecords.reduce((sum, r) => sum + (r.responseTime || 0), 0)
    const averageTime = totalQuestions > 0 ? Math.round(totalTime / totalQuestions / 1000) : 0
    
    // 从记录中提取学科和年级信息
    const firstRecord = compatibleRecords[0]
    const subject = firstRecord.subject || 'math'
    const grade = firstRecord.grade || 1
    
    // 🔧 修复：构建题目列表，包含所有首次提交答案的记录
    const questions = allSubmissionRecords.map((record, index) => ({
      id: `q${index + 1}`,
      text: record.question || `问题 ${index + 1}`,
      studentAnswer: record.studentInput,
      aiResponse: record.aiResponse,
      isCorrect: record.isCorrect, // true/false
      studentAnswerValue: record.studentAnswer,
      correctAnswerValue: record.correctAnswer,
      responseTime: Math.round((record.responseTime || 0) / 1000),
      timestamp: record.timestamp
    }))
    
    console.log(`✅ 新逻辑学习数据: ${totalQuestions}题首次提交答案, 正确率${totalQuestions > 0 ? Math.round(correctAnswers/totalQuestions*100) : 0}%`)
    
    return {
      planId,
      subject,
      grade,
      questions,
      correctCount: correctAnswers,
      wrongCount: wrongAnswers,
      timeSpent: averageTime,
      totalTime: Math.round(totalTime / 1000),
      isRealData: true,
      recordCount: totalQuestions, // 🔧 修复：统计所有首次提交答案的数量
      latestSession: compatibleRecords[compatibleRecords.length - 1]?.sessionId,
      // 🎯 新增：后续对话记录（用于生成学习建议，但不计入统计）
      followUpInteractions: compatibleRecords.filter(r => r.sessionId && compatibleRecords.filter(cr => cr.sessionId === r.sessionId).length > 1)
    }
  } catch (error) {
    console.error('❌ 获取学习计划数据失败:', error)
    return getDefaultStudyData(planId)
  }
}

/**
 * 获取默认学习数据（当没有真实数据时）
 */
function getDefaultStudyData(planId) {
  console.log('📝 使用默认学习数据')
  return {
    planId,
    subject: 'math',
    grade: 1,
    questions: [
      { id: 'q1', text: '暂无学习记录', correct: true }
    ],
    correctCount: 0,
    wrongCount: 0,
    timeSpent: 0,
    totalTime: 0,
    isRealData: false, // 标记为模拟数据
    recordCount: 0
  }
}

/**
 * 生成学科分布数据
 * @param {string} subject 主要学科
 * @returns {Object} 学科分布
 */
function generateSubjectDistribution(subject) {
  const base = { math: 85, chinese: 80, english: 75 }
  
  // 当前学科分数稍高
  if (subject === 'math') base.math = 90
  if (subject === 'chinese') base.chinese = 88
  if (subject === 'english') base.english = 82
  
  return base
}

/**
 * 生成常错知识点
 * @param {string} subject 学科
 * @param {number} grade 年级
 * @returns {Array} 常错知识点
 */
function generateCommonMistakes(subject, grade) {
  const mistakes = {
    math: ['乘法口诀', '进位加法', '退位减法', '应用题理解'],
    chinese: ['拼音声调', '组词造句', '阅读理解', '汉字笔顺'],
    english: ['字母发音', '单词拼写', '语法规则', '日常对话']
  }
  
  const subjectMistakes = mistakes[subject] || mistakes.math
  return subjectMistakes.slice(0, 3).map((item, index) => ({
    id: index + 1,
    name: item,
    frequency: Math.floor(Math.random() * 5) + 1,
    improvement: Math.floor(Math.random() * 30) + 60
  }))
}

/**
 * 生成时间统计
 * @param {number} totalTime 总时间
 * @returns {Object} 时间统计
 */
function generateTimeStatistics(totalTime) {
  return {
    total: totalTime,
    average: Math.round(totalTime / 5 * 10) / 10,
    comparison: {
      yesterday: totalTime - 2,
      lastWeek: Math.floor(totalTime * 7 * 0.9),
      recommendation: totalTime + 5
    }
  }
}

/**
 * 生成下步学习建议
 * @param {string} subject 学科
 * @param {number} accuracy 正确率
 * @param {Array} mistakes 错误知识点
 * @returns {Object} 学习建议
 */
function generateNextSteps(subject, accuracy, mistakes) {
  const suggestions = []
  
  if (accuracy < 70) {
    suggestions.push({
      type: 'review',
      title: '加强基础练习',
      description: '建议复习基础知识点，多做类似题目'
    })
  } else if (accuracy < 85) {
    suggestions.push({
      type: 'practice',
      title: '针对性练习',
      description: '重点练习错题相关知识点'
    })
  } else {
    suggestions.push({
      type: 'advance',
      title: '进阶学习',
      description: '可以尝试更有挑战性的题目'
    })
  }
  
  // 添加具体的知识点建议
  if (mistakes.length > 0) {
    suggestions.push({
      type: 'focus',
      title: `重点关注：${mistakes[0].name}`,
      description: `这是您最需要加强的知识点`
    })
  }
  
  return {
    recommendations: suggestions,
    nextSubject: getNextSubjectRecommendation(subject),
    estimatedTime: '15-20分钟',
    difficulty: accuracy > 85 ? '提高' : accuracy > 70 ? '巩固' : '基础'
  }
}

/**
 * 生成鼓励话语
 * @param {number} accuracy 正确率
 * @returns {Object} 鼓励信息
 */
function generateEncouragement(accuracy) {
  if (accuracy >= 90) {
    return {
      level: 'excellent',
      message: '太棒了！你的表现非常出色！',
      emoji: '🎉',
      badge: '学习之星'
    }
  } else if (accuracy >= 80) {
    return {
      level: 'good',
      message: '很好！继续保持这个状态！',
      emoji: '👍',
      badge: '进步小能手'
    }
  } else if (accuracy >= 70) {
    return {
      level: 'okay',
      message: '不错哦！还有进步空间！',
      emoji: '😊',
      badge: '努力学习者'
    }
  } else {
    return {
      level: 'encourage',
      message: '加油！相信你下次会更好！',
      emoji: '💪',
      badge: '坚持学习者'
    }
  }
}

/**
 * 生成学习趋势数据
 * @param {string} userId 用户ID
 * @returns {Array} 趋势数据
 */
function generateLearningTrends(userId) {
  const trends = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    trends.push({
      date: date.toISOString().split('T')[0],
      accuracy: Math.floor(Math.random() * 30) + 70,
      timeSpent: Math.floor(Math.random() * 10) + 10
    })
  }
  return trends
}

/**
 * 生成下一学科推荐
 * @param {string} currentSubject 当前学科
 * @returns {string} 推荐学科
 */
function getNextSubjectRecommendation(currentSubject) {
  const rotation = {
    'math': 'chinese',
    'chinese': 'english', 
    'english': 'math'
  }
  return rotation[currentSubject] || 'math'
}

/**
 * 保存学习记录
 * @param {Object} recordData 记录数据
 * @returns {Promise<Object>} 保存结果
 */
async function saveStudyRecord(recordData) {
  // 模拟保存到数据库
  const record = {
    ...recordData,
    id: Date.now().toString()
  }
  
  learningRecords.push(record)
  
  console.log(`学习记录已保存: ID=${record.id}`)
  
  return record
}

/**
 * 生成个性化学习建议
 * @param {string} userId 用户ID
 * @param {string} subject 学科
 * @param {number} grade 年级
 * @returns {Promise<Object>} 学习建议
 */
async function generateLearningAdvice(userId, subject, grade) {
  try {
    console.log(`🤖 调用AI生成学习建议: userId=${userId}, subject=${subject}`)

    // 获取用户历史学习数据
    const userHistory = await getStudyHistory(userId, 10, 0)
    const recentAccuracy = calculateRecentAccuracy(userHistory.records)
    const avgTimeSpent = calculateAverageTime(userHistory.records)
    
    // 构建学习数据
    const learningData = {
      userId,
      subject,
      grade: grade || 3,
      recentAccuracy,
      timeSpent: avgTimeSpent,
      commonMistakes: extractCommonMistakes(userHistory.records),
      learningHistory: formatLearningHistory(userHistory.records),
      weakPoints: identifyWeakPoints(userHistory.records)
    }
    
    // 调用AI生成个性化建议
    const aiAdvice = await generatePersonalizedAdvice(learningData)
    
    console.log(`✅ AI学习建议生成成功`)
    
    // 格式化为前端需要的格式
    return {
      ...aiAdvice,
      // 保持向后兼容
      dailyGoals: aiAdvice.specificAdvice?.daily || [
        `完成${getSubjectName(subject)}练习3-5题`,
        '保持学习时间在15-20分钟',
        '复习昨天的错题'
      ],
      weeklyPlan: aiAdvice.specificAdvice?.weekly || [
        '每周至少学习5天',
        '轮换不同学科保持兴趣',
        '周末进行知识点总结'
      ],
      parentTips: [
        '鼓励孩子独立思考，不要急于给出答案',
        '关注孩子的学习情绪，及时给予支持',
        '建立固定的学习时间和环境'
      ],
      resources: [
        {
          type: 'video',
          title: `${grade}年级${getSubjectName(subject)}基础教程`,
          url: 'https://example.com/video'
        },
        {
          type: 'exercise',
          title: '专项练习题库',
          url: 'https://example.com/exercise'
        }
      ]
    }
    
  } catch (error) {
    console.error('❌ AI学习建议生成失败，使用备选方案:', error.message)
    
    // 备选方案：使用静态建议
    return {
      overallAssessment: '您的学习表现总体良好，继续保持学习热情！',
      strengths: ['学习态度认真', '坚持每日练习'],
      weaknesses: ['部分知识点需要加强'],
      specificAdvice: {
        daily: [
          `完成${getSubjectName(subject)}练习3-5题`,
          '保持学习时间在15-20分钟',
          '复习昨天的错题'
        ],
        weekly: [
          '每周至少学习5天',
          '轮换不同学科保持兴趣',
          '周末进行知识点总结'
        ],
        methodology: [
          '错题要整理到错题本',
          '多做相似类型的题目'
        ]
      },
      focusAreas: ['基础知识巩固', '计算速度提升'],
      encouragement: '继续加油，你能做得更好！',
      source: 'fallback_static',
      dailyGoals: [
        `完成${getSubjectName(subject)}练习3-5题`,
        '保持学习时间在15-20分钟',
        '复习昨天的错题'
      ],
      weeklyPlan: [
        '每周至少学习5天',
        '轮换不同学科保持兴趣',
        '周末进行知识点总结'
      ],
      parentTips: [
        '鼓励孩子独立思考，不要急于给出答案',
        '关注孩子的学习情绪，及时给予支持',
        '建立固定的学习时间和环境'
      ]
    }
  }
}

/**
 * 生成周度对比数据
 * @returns {Object} 周度对比
 */
function generateWeeklyComparison() {
  return {
    thisWeek: {
      accuracy: 82,
      timeSpent: 95,
      questionCount: 28
    },
    lastWeek: {
      accuracy: 78,
      timeSpent: 87,
      questionCount: 25
    },
    improvement: {
      accuracy: '+4%',
      timeSpent: '+8分钟',
      questionCount: '+3题'
    }
  }
}

/**
 * 生成知识点分析
 * @param {string} userId 用户ID
 * @param {string} subject 学科
 * @returns {Promise<Object>} 知识点分析
 */
async function generateKnowledgePointAnalysis(userId, subject) {
  try {
    console.log(`🤖 调用AI生成知识点分析: userId=${userId}, subject=${subject}`)
    
    // 获取用户学习数据
    const userHistory = await getStudyHistory(userId, 20, 0)
    
    // 构建分析数据
    const studyData = {
      subject: subject || 'math',
      grade: 3,
      wrongAnswers: extractWrongAnswers(userHistory.records),
      correctAnswers: extractCorrectAnswers(userHistory.records),
      questionTypes: analyzeQuestionTypes(userHistory.records),
      timeSpentPerQuestion: calculateTimePerQuestion(userHistory.records)
    }
    
    // 调用AI生成知识点分析
    const aiAnalysis = await generateKnowledgeAnalysis(studyData)
    
    console.log(`✅ AI知识点分析生成成功`)
    
    // 格式化为前端需要的格式
    return {
      strong: aiAnalysis.knowledgePointAnalysis?.masteredPoints || ['基础计算', '阅读理解'],
      weak: aiAnalysis.knowledgePointAnalysis?.weakPoints || ['应用题', '古诗背诵'],
      improving: aiAnalysis.knowledgePointAnalysis?.criticalPoints || ['口算速度', '汉字书写'],
      // 新增AI分析结果
      mistakePatterns: aiAnalysis.mistakePatterns || [],
      improvementSuggestions: aiAnalysis.improvementSuggestions || {},
      practiceRecommendations: aiAnalysis.practiceRecommendations || [],
      source: 'ai_generated'
    }
    
  } catch (error) {
    console.error('❌ AI知识点分析失败，使用备选方案:', error.message)
    
    // 备选方案：使用静态分析
    return {
      strong: ['基础计算', '阅读理解', '单词记忆'],
      weak: ['应用题', '古诗背诵', '语法规则'],
      improving: ['口算速度', '汉字书写', '听力理解'],
      source: 'fallback_static'
    }
  }
}

/**
 * 计算近期平均正确率
 * @param {Array} records 学习记录
 * @returns {number} 平均正确率
 */
function calculateRecentAccuracy(records) {
  if (!records || records.length === 0) return 75 // 默认值
  
  const recent = records.slice(0, 5) // 最近5次
  const totalAccuracy = recent.reduce((sum, record) => sum + (record.accuracy || 0), 0)
  return Math.round(totalAccuracy / recent.length)
}

/**
 * 计算平均学习时间
 * @param {Array} records 学习记录
 * @returns {number} 平均时间(分钟)
 */
function calculateAverageTime(records) {
  if (!records || records.length === 0) return 15 // 默认值
  
  const recent = records.slice(0, 5)
  const totalTime = recent.reduce((sum, record) => sum + (record.timeSpent || 0), 0)
  return Math.round(totalTime / recent.length)
}

/**
 * 提取常见错误
 * @param {Array} records 学习记录
 * @returns {Array} 常见错误列表
 */
function extractCommonMistakes(records) {
  const mistakes = []
  
  records.forEach(record => {
    if (record.accuracy < 80) {
      switch (record.subject) {
        case 'math':
          mistakes.push('计算错误', '理解题意困难')
          break
        case 'chinese':
          mistakes.push('拼音不准', '字词理解')
          break
        case 'english':
          mistakes.push('单词拼写', '语法应用')
          break
      }
    }
  })
  
  return [...new Set(mistakes)].slice(0, 3) // 去重并限制数量
}

/**
 * 格式化学习历史
 * @param {Array} records 学习记录
 * @returns {string} 格式化的历史描述
 */
function formatLearningHistory(records) {
  if (!records || records.length === 0) {
    return '暂无学习历史记录'
  }
  
  const summary = records.slice(0, 5).map(record => 
    `${record.date}: ${getSubjectName(record.subject)} - 正确率${record.accuracy}%`
  ).join('\n')
  
  return `近期学习记录：\n${summary}`
}

/**
 * 识别薄弱环节
 * @param {Array} records 学习记录
 * @returns {Array} 薄弱环节列表
 */
function identifyWeakPoints(records) {
  const weakPoints = []
  
  // 按学科分组计算平均正确率
  const subjectStats = {}
  records.forEach(record => {
    if (!subjectStats[record.subject]) {
      subjectStats[record.subject] = { total: 0, count: 0 }
    }
    subjectStats[record.subject].total += record.accuracy || 0
    subjectStats[record.subject].count += 1
  })
  
  // 找出正确率低于80%的学科
  Object.keys(subjectStats).forEach(subject => {
    const avgAccuracy = subjectStats[subject].total / subjectStats[subject].count
    if (avgAccuracy < 80) {
      weakPoints.push(getSubjectName(subject))
    }
  })
  
  return weakPoints.length > 0 ? weakPoints : ['需要保持现有水平']
}

/**
 * 获取学科中文名称
 * @param {string} subject 学科英文名
 * @returns {string} 学科中文名
 */
function getSubjectName(subject) {
  const subjectNames = {
    math: '数学',
    chinese: '语文',
    english: '英语'
  }
  return subjectNames[subject] || subject
}

/**
 * 提取错误答案
 * @param {Array} records 学习记录
 * @returns {Array} 错误答案列表
 */
function extractWrongAnswers(records) {
  const wrongAnswers = []
  
  records.forEach(record => {
    if (record.accuracy < 100) {
      // 模拟错误题目数据
      const wrongCount = Math.ceil((100 - record.accuracy) / 100 * (record.questionCount || 5))
      for (let i = 0; i < wrongCount; i++) {
        wrongAnswers.push({
          question: `${getSubjectName(record.subject)}题目${i + 1}`,
          reason: '计算错误',
          subject: record.subject,
          date: record.date
        })
      }
    }
  })
  
  return wrongAnswers.slice(0, 10) // 限制数量
}

/**
 * 提取正确答案
 * @param {Array} records 学习记录
 * @returns {Array} 正确答案列表
 */
function extractCorrectAnswers(records) {
  const correctAnswers = []
  
  records.forEach(record => {
    const correctCount = Math.floor(record.accuracy / 100 * (record.questionCount || 5))
    for (let i = 0; i < correctCount; i++) {
      correctAnswers.push({
        question: `${getSubjectName(record.subject)}题目${i + 1}`,
        subject: record.subject,
        date: record.date
      })
    }
  })
  
  return correctAnswers.slice(0, 20) // 限制数量
}

/**
 * 分析题目类型
 * @param {Array} records 学习记录
 * @returns {Object} 题目类型分布
 */
function analyzeQuestionTypes(records) {
  const types = {}
  
  records.forEach(record => {
    const subject = record.subject
    if (!types[subject]) {
      types[subject] = 0
    }
    types[subject] += record.questionCount || 5
  })
  
  return types
}

/**
 * 计算每题平均时间
 * @param {Array} records 学习记录
 * @returns {number} 平均时间(分钟)
 */
function calculateTimePerQuestion(records) {
  if (!records || records.length === 0) return 3
  
  let totalTime = 0
  let totalQuestions = 0
  
  records.forEach(record => {
    totalTime += record.timeSpent || 0
    totalQuestions += record.questionCount || 5
  })
  
  return totalQuestions > 0 ? Math.round(totalTime / totalQuestions * 10) / 10 : 3
}

/**
 * 分析偏好学科
 * @param {Array} records 学习记录
 * @returns {Array} 偏好学科列表
 */
function analyzePreferredSubjects(records) {
  const subjectFreq = {}
  const subjectPerformance = {}
  
  records.forEach(record => {
    const subject = record.subject
    
    // 统计频率
    subjectFreq[subject] = (subjectFreq[subject] || 0) + 1
    
    // 统计表现
    if (!subjectPerformance[subject]) {
      subjectPerformance[subject] = { total: 0, count: 0 }
    }
    subjectPerformance[subject].total += record.accuracy || 0
    subjectPerformance[subject].count += 1
  })
  
  // 综合频率和表现确定偏好
  const preferences = Object.keys(subjectFreq)
    .map(subject => ({
      subject: getSubjectName(subject),
      frequency: subjectFreq[subject],
      avgAccuracy: subjectPerformance[subject].total / subjectPerformance[subject].count
    }))
    .sort((a, b) => (b.frequency * b.avgAccuracy) - (a.frequency * a.avgAccuracy))
    .slice(0, 2)
    .map(item => item.subject)
  
  return preferences.length > 0 ? preferences : ['数学', '语文']
}

/**
 * 格式化近期进步情况
 * @param {Array} records 学习记录
 * @returns {string} 进步情况描述
 */
function formatRecentProgress(records) {
  if (!records || records.length < 2) {
    return '学习记录较少，建议坚持练习积累数据'
  }
  
  // 计算最近几次和之前的平均正确率对比
  const recent = records.slice(0, 3)
  const previous = records.slice(3, 6)
  
  const recentAvg = recent.reduce((sum, r) => sum + (r.accuracy || 0), 0) / recent.length
  const previousAvg = previous.length > 0 
    ? previous.reduce((sum, r) => sum + (r.accuracy || 0), 0) / previous.length 
    : recentAvg
  
  const improvement = recentAvg - previousAvg
  
  if (improvement > 5) {
    return `最近学习进步明显，正确率提升了${Math.round(improvement)}%，继续保持！`
  } else if (improvement > 0) {
    return `学习状态稳定，正确率略有提升，建议继续加强练习`
  } else if (improvement > -5) {
    return `学习状态基本稳定，建议调整学习方法提高效率`
  } else {
    return `最近正确率有所下降，建议回顾基础知识，调整学习节奏`
  }
}

module.exports = router 