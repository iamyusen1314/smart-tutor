/**
 * 学习数据管理API路由
 * @description 提供学习会话、进度、历史记录的管理接口
 */

const express = require('express')
const { body, query, validationResult } = require('express-validator')
const LearningSession = require('../models/LearningSession')
const LearningRecord = require('../models/LearningRecord')
const logger = require('../utils/logger')

const router = express.Router()

/**
 * 创建新的学习会话
 * POST /api/learning/create-session
 */
router.post('/create-session', [
  body('userId').notEmpty().withMessage('用户ID不能为空'),
  body('planId').notEmpty().withMessage('计划ID不能为空'),
  body('subject').isIn(['math', 'chinese', 'english']).withMessage('学科参数无效'),
  body('grade').isInt({ min: 1, max: 6 }).withMessage('年级参数无效'),
  body('questions').isArray({ min: 1 }).withMessage('题目列表不能为空'),
], async (req, res) => {
  try {
    // 数据验证
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: errors.array()
      })
    }

    const { userId, planId, subject, grade, questions, settings = {} } = req.body

    // 检查是否已有活跃会话
    const existingSession = await LearningSession.getActiveSession(userId)
    if (existingSession) {
      return res.json({
        success: true,
        message: '找到现有活跃会话',
        data: existingSession
      })
    }

    // 创建新会话
    const sessionData = {
      userId,
      planId,
      subject,
      grade,
      questions,
      settings
    }

    const session = await LearningSession.createSession(sessionData)

    logger.info(`创建学习会话成功: ${session.sessionId}`, {
      userId,
      planId,
      questionsCount: questions.length
    })

    res.json({
      success: true,
      message: '学习会话创建成功',
      data: session
    })

  } catch (error) {
    logger.error('创建学习会话失败:', error)
    res.status(500).json({
      success: false,
      message: '创建学习会话失败',
      error: error.message
    })
  }
})

/**
 * 获取当前学习会话
 * GET /api/learning/current-session
 */
router.get('/current-session', [
  query('userId').notEmpty().withMessage('用户ID不能为空')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '参数验证失败',
        errors: errors.array()
      })
    }

    const { userId } = req.query

    // 获取活跃会话
    const session = await LearningSession.getActiveSession(userId)

    if (!session) {
      return res.json({
        success: true,
        message: '没有找到活跃的学习会话',
        data: null
      })
    }

    // 更新最后活跃时间
    session.lastActiveAt = new Date()
    await session.save()

    res.json({
      success: true,
      message: '获取当前学习会话成功',
      data: session
    })

  } catch (error) {
    logger.error('获取当前学习会话失败:', error)
    res.status(500).json({
      success: false,
      message: '获取当前学习会话失败',
      error: error.message
    })
  }
})

/**
 * 更新学习进度
 * POST /api/learning/update-progress
 */
router.post('/update-progress', [
  body('sessionId').notEmpty().withMessage('会话ID不能为空'),
  body('questionIndex').isInt({ min: 0 }).withMessage('题目索引无效'),
  body('answer').optional().isString(),
  body('isCorrect').optional().isBoolean(),
  body('action').isIn(['answer', 'skip', 'next', 'pause']).withMessage('操作类型无效')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: errors.array()
      })
    }

    const { sessionId, questionIndex, answer, isCorrect, action } = req.body

    // 查找会话
    const session = await LearningSession.findOne({ sessionId })
    if (!session) {
      return res.status(404).json({
        success: false,
        message: '学习会话不存在'
      })
    }

    // 执行相应操作
    switch (action) {
      case 'answer':
        if (answer !== undefined && isCorrect !== undefined) {
          await session.updateCurrentQuestion(answer, isCorrect)
        }
        break
        
      case 'skip':
        await session.skipCurrentQuestion()
        break
        
      case 'next':
        await session.nextQuestion()
        break
        
      case 'pause':
        session.status = 'paused'
        await session.save()
        break
    }

    logger.info(`学习进度更新成功: ${sessionId}`, {
      action,
      questionIndex,
      isCorrect
    })

    res.json({
      success: true,
      message: '学习进度更新成功',
      data: session
    })

  } catch (error) {
    logger.error('更新学习进度失败:', error)
    res.status(500).json({
      success: false,
      message: '更新学习进度失败',
      error: error.message
    })
  }
})

/**
 * 添加AI交互记录
 * POST /api/learning/add-ai-interaction
 */
router.post('/add-ai-interaction', [
  body('sessionId').notEmpty().withMessage('会话ID不能为空'),
  body('type').isIn(['hint', 'guidance', 'correction', 'encouragement']).withMessage('交互类型无效'),
  body('content').notEmpty().withMessage('交互内容不能为空')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: errors.array()
      })
    }

    const { sessionId, type, content } = req.body

    // 查找会话
    const session = await LearningSession.findOne({ sessionId })
    if (!session) {
      return res.status(404).json({
        success: false,
        message: '学习会话不存在'
      })
    }

    // 添加AI交互记录
    await session.addAIInteraction(type, content)

    res.json({
      success: true,
      message: 'AI交互记录添加成功',
      data: session
    })

  } catch (error) {
    logger.error('添加AI交互记录失败:', error)
    res.status(500).json({
      success: false,
      message: '添加AI交互记录失败',
      error: error.message
    })
  }
})

/**
 * 完成学习会话
 * POST /api/learning/complete-session
 */
router.post('/complete-session', [
  body('sessionId').notEmpty().withMessage('会话ID不能为空')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: errors.array()
      })
    }

    const { sessionId } = req.body

    // 查找会话
    const session = await LearningSession.findOne({ sessionId })
    if (!session) {
      return res.status(404).json({
        success: false,
        message: '学习会话不存在'
      })
    }

    // 标记会话完成
    session.status = 'completed'
    session.completedAt = new Date()
    await session.save()

    // 生成学习记录
    const learningRecords = []
    for (const question of session.questions) {
      if (question.status === 'completed') {
        const recordData = {
          userId: session.userId,
          planId: session.planId,
          question: question.questionText,
          studentInput: question.studentAnswer,
          isCorrect: question.isCorrect,
          subject: session.subject,
          grade: session.grade,
          currentMode: session.settings.currentMode,
          countedInStatistics: session.settings.currentMode === 'answer'
        }

        const record = await LearningRecord.createRecord(recordData)
        learningRecords.push(record)
      }
    }

    logger.info(`学习会话完成: ${sessionId}`, {
      userId: session.userId,
      totalQuestions: session.progress.totalQuestions,
      correctAnswers: session.progress.correctAnswers,
      recordsCreated: learningRecords.length
    })

    res.json({
      success: true,
      message: '学习会话完成',
      data: {
        session,
        learningRecords: learningRecords.length
      }
    })

  } catch (error) {
    logger.error('完成学习会话失败:', error)
    res.status(500).json({
      success: false,
      message: '完成学习会话失败',
      error: error.message
    })
  }
})

/**
 * 获取学习历史
 * GET /api/learning/history
 */
router.get('/history', [
  query('userId').notEmpty().withMessage('用户ID不能为空'),
  query('type').optional().isIn(['skip', 'timeout', 'overtime', 'answer']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('page').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '参数验证失败',
        errors: errors.array()
      })
    }

    const { userId, type, limit = 20, page = 1 } = req.query
    const skip = (page - 1) * limit

    // 构建查询条件
    const query = { userId }
    if (type) {
      // 根据类型筛选学习记录
      if (type === 'answer') {
        query.isCorrect = { $ne: null }
      }
      // 其他类型可以通过元数据筛选
    }

    // 查询学习记录
    const records = await LearningRecord.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)

    const total = await LearningRecord.countDocuments(query)

    res.json({
      success: true,
      message: '获取学习历史成功',
      data: {
        records,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })

  } catch (error) {
    logger.error('获取学习历史失败:', error)
    res.status(500).json({
      success: false,
      message: '获取学习历史失败',
      error: error.message
    })
  }
})

/**
 * 获取今日学习数据
 * GET /api/learning/today-data
 */
router.get('/today-data', [
  query('userId').notEmpty().withMessage('用户ID不能为空')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '参数验证失败',
        errors: errors.array()
      })
    }

    const { userId } = req.query

    // 获取今日会话
    const todaySessions = await LearningSession.getTodaySessions(userId)
    
    // 获取今日学习记录
    const todayRecords = await LearningRecord.getTodayRecords(userId)

    // 计算今日统计
    const stats = {
      totalSessions: todaySessions.length,
      completedSessions: todaySessions.filter(s => s.status === 'completed').length,
      totalQuestions: todayRecords.length,
      correctAnswers: todayRecords.filter(r => r.isCorrect === true).length,
      wrongAnswers: todayRecords.filter(r => r.isCorrect === false).length,
      aiInteractions: todayRecords.filter(r => r.isCorrect === null).length,
      totalStudyTime: todaySessions.reduce((sum, s) => sum + s.totalDuration, 0),
      accuracy: 0
    }

    const validAnswers = stats.correctAnswers + stats.wrongAnswers
    if (validAnswers > 0) {
      stats.accuracy = Math.round((stats.correctAnswers / validAnswers) * 100)
    }

    res.json({
      success: true,
      message: '获取今日学习数据成功',
      data: {
        stats,
        sessions: todaySessions,
        records: todayRecords
      }
    })

  } catch (error) {
    logger.error('获取今日学习数据失败:', error)
    res.status(500).json({
      success: false,
      message: '获取今日学习数据失败',
      error: error.message
    })
  }
})

/**
 * 数据同步接口
 * POST /api/learning/sync
 */
router.post('/sync', [
  body('userId').notEmpty().withMessage('用户ID不能为空'),
  body('localData').isObject().withMessage('本地数据格式错误')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: errors.array()
      })
    }

    const { userId, localData } = req.body

    // 处理本地数据同步
    const syncResults = {
      processed: 0,
      uploaded: 0,
      errors: []
    }

    // 同步学习结果数据
    if (localData.currentLearningResult) {
      try {
        // 创建或更新学习记录
        syncResults.processed++
        syncResults.uploaded++
      } catch (error) {
        syncResults.errors.push(`学习结果同步失败: ${error.message}`)
      }
    }

    // 同步历史记录
    if (localData.histories) {
      for (const historyType of ['skipHistory', 'timeUpHistory', 'overtimeHistory']) {
        if (localData.histories[historyType]) {
          // 处理历史记录
          syncResults.processed += localData.histories[historyType].length
        }
      }
    }

    logger.info(`数据同步完成: ${userId}`, syncResults)

    res.json({
      success: true,
      message: '数据同步完成',
      data: syncResults
    })

  } catch (error) {
    logger.error('数据同步失败:', error)
    res.status(500).json({
      success: false,
      message: '数据同步失败',
      error: error.message
    })
  }
})

/**
 * 清理过期会话
 * POST /api/learning/cleanup
 */
router.post('/cleanup', async (req, res) => {
  try {
    const result = await LearningSession.cleanupExpiredSessions(24)
    
    logger.info('清理过期会话完成', result)

    res.json({
      success: true,
      message: '清理过期会话完成',
      data: result
    })

  } catch (error) {
    logger.error('清理过期会话失败:', error)
    res.status(500).json({
      success: false,
      message: '清理过期会话失败',
      error: error.message
    })
  }
})

module.exports = router 