/**
 * 学习计划路由
 * @description 学习计划相关的API端点，基于阿里通义千问AI生成智能学习计划
 */

const express = require('express')
const router = express.Router()

// 导入AI服务
const aiService = require('../services/aiService')

/**
 * 创建学习计划
 * @route POST /api/plan/create
 * @description 根据OCR识别结果使用AI生成智能学习计划和时间安排
 */
router.post('/create', async (req, res) => {
  try {
    const { ocrText, subject, grade, originalImage } = req.body
    
    // 参数验证
    if (!ocrText || !Array.isArray(ocrText) || ocrText.length === 0) {
      return res.status(400).json({
        error: '请提供有效的题目文本数组'
      })
    }

    if (!subject) {
      return res.status(400).json({
        error: '请指定学科'
      })
    }

    console.log(`创建AI学习计划: ${subject}学科, ${grade}年级, ${ocrText.length}道题`)

    // 生成唯一计划ID
    const planId = generatePlanId()
    
    let aiPlanData
    
    try {
      // 🔧 添加更严格的超时控制
      console.log('正在调用AI服务生成学习计划...')
          const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI服务响应超时')), 25000) // 🔧 优化为25秒：基于测试qwen-turbo平均15秒内完成
    })
      
      const aiPromise = generateAILearningPlan(ocrText, subject, grade)
      
      // 使用Promise.race确保30秒内必须响应
      aiPlanData = await Promise.race([aiPromise, timeoutPromise])
      
    } catch (aiError) {
      console.error('AI服务调用失败，使用快速方案:', aiError.message)
      
      // 🚀 快速fallback方案：直接基于OCR结果生成基础计划
      aiPlanData = generateQuickLearningPlan(ocrText, subject, grade)
      console.log('✅ 快速学习计划生成成功')
    }
    
    // 构建完整的学习计划响应
    const planData = {
      planId,
      subject,
      grade,
      questionCount: aiPlanData.questions.length,
      estimatedTotalTime: aiPlanData.totalTime,
      perQuestionTime: aiPlanData.timeAllocation,
      questions: aiPlanData.questions.map((q, index) => ({
        id: `q${index + 1}`,
        text: q.text,
        time: aiPlanData.timeAllocation[index],
        difficulty: q.difficulty,
        type: q.type,
        aiAnalysis: q.analysis,
        hints: q.hints
      })),
      learningStrategy: aiPlanData.strategy,
      studyTips: aiPlanData.tips,
      priorityOrder: aiPlanData.priorityOrder,
      createdAt: Date.now(),
      originalImage,
      aiGenerated: aiPlanData.aiGenerated || false
    }

    console.log(`AI学习计划创建成功: 计划ID=${planId}, 总时长=${aiPlanData.totalTime}分钟`)
    console.log(`学习策略: ${aiPlanData.strategy}`)

    res.json(planData)

  } catch (error) {
    console.error('创建学习计划失败:', error)
    
    res.status(500).json({
      error: '学习计划生成失败，请稍后重试',
      details: error.message
    })
  }
})

/**
 * 使用AI生成学习计划
 */
async function generateAILearningPlan(ocrText, subject, grade) {
  // 构建AI提示词
  const prompt = buildLearningPlanPrompt(ocrText, subject, grade)
  
  try {
    console.log('发送AI请求，分析题目并生成学习计划...')
    
    // 🔑 关键修复：传递OCR题目数据给AI服务，确保fallback时能使用真实题目
    const aiResponse = await aiService.generateResponse(prompt, 'plan', {
      ocrText: ocrText,      // 传递真实OCR题目
      subject: subject,      // 传递学科信息
      grade: grade          // 传递年级信息
    })
    console.log('AI响应:', aiResponse)
    
    // 解析AI响应
    const planData = parseAIPlanResponse(aiResponse, ocrText)
    
    return planData
    
  } catch (error) {
    console.error('AI学习计划生成失败:', error)
    throw error
  }
}

/**
 * 构建学习计划生成提示词
 */
function buildLearningPlanPrompt(ocrText, subject, grade) {
  const subjectNames = {
    math: '数学',
    chinese: '语文',
    english: '英语'
  }
  
  const subjectName = subjectNames[subject] || subject
  
  return `
分析${grade}年级${subjectName}题目，快速生成学习计划：

题目：${ocrText.slice(0, 10).map((text, index) => `${index + 1}. ${text}`).join('\n')}${ocrText.length > 10 ? '\n...(还有' + (ocrText.length - 10) + '道题)' : ''}

要求：
1. 每题估算时间(1-5分钟)
2. 判断难度(easy/medium/hard)  
3. 给出学习建议

只返回JSON格式：
{
  "questions": [{"text": "题目", "type": "类型", "difficulty": "难度", "suggestedTime": 时间}],
  "totalTime": 总时间,
  "timeAllocation": [时间数组],
  "strategy": "学习策略",
  "tips": ["建议1", "建议2"],
  "priorityOrder": [0,1,2...]
}

简洁回复，${ocrText.length}道题总计。`
}

/**
 * 解析AI响应
 */
function parseAIPlanResponse(aiResponse, originalTexts) {
  try {
    // 尝试从AI响应中提取JSON
    let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI响应中未找到有效的JSON格式数据');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // 验证必要字段
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('AI响应格式错误：缺少questions数组');
    }
    
    // 确保题目数量匹配
    if (parsed.questions.length !== originalTexts.length) {
      console.warn('AI分析的题目数量与原文不匹配，进行调整');
      // 调整题目数量
      while (parsed.questions.length < originalTexts.length) {
        const lastQ = parsed.questions[parsed.questions.length - 1] || {
          text: '',
          type: 'unknown',
          difficulty: 'medium',
          suggestedTime: 3,
          analysis: 'AI分析',
          hints: ['仔细读题', '按步骤解答']
        };
        parsed.questions.push({
          ...lastQ,
          text: originalTexts[parsed.questions.length]
        });
      }
      parsed.questions = parsed.questions.slice(0, originalTexts.length);
    }
    
    // 确保时间分配数组
    if (!parsed.timeAllocation || parsed.timeAllocation.length !== originalTexts.length) {
      parsed.timeAllocation = parsed.questions.map(q => q.suggestedTime || 3);
    }
    
    // 计算总时间
    parsed.totalTime = parsed.timeAllocation.reduce((sum, time) => sum + time, 0);
    
    // 设置默认值
    parsed.strategy = parsed.strategy || '按顺序完成题目，遇到困难先跳过，最后回头解决';
    parsed.tips = parsed.tips || ['仔细审题', '工整书写', '检查答案'];
    parsed.priorityOrder = parsed.priorityOrder || Array.from({length: originalTexts.length}, (_, i) => i);
    
    return parsed;
    
  } catch (error) {
    console.error('解析AI响应失败:', error);
    console.log('AI原始响应:', aiResponse);
    
    // 🚨 直接抛出错误，不使用backup计划，确保只返回真实AI计划
    throw new Error(`AI响应解析失败: ${error.message}。原始响应: ${aiResponse.substring(0, 200)}...`);
  }
}

/**
 * 获取学习计划详情
 * @route GET /api/plan/:planId
 */
router.get('/:planId', async (req, res) => {
  try {
    const { planId } = req.params
    
    // TODO: 从数据库获取计划详情
    // 目前返回模拟数据
    res.json({
      planId,
      status: 'active',
      progress: {
        completed: 0,
        total: 5,
        currentQuestionId: 'q1'
      }
    })

  } catch (error) {
    console.error('获取学习计划失败:', error)
    res.status(500).json({
      error: '获取学习计划失败'
    })
  }
})

/**
 * 更新学习计划进度
 * @route PUT /api/plan/:planId/progress
 */
router.put('/:planId/progress', async (req, res) => {
  try {
    const { planId } = req.params
    const { currentQuestionId, completed } = req.body
    
    console.log(`更新学习计划进度: ${planId}, 当前题目: ${currentQuestionId}`)
    
    // TODO: 更新数据库中的进度
    
    res.json({
      success: true,
      planId,
      updated: {
        currentQuestionId,
        completed,
        timestamp: Date.now()
      }
    })

  } catch (error) {
    console.error('更新学习计划进度失败:', error)
    res.status(500).json({
      error: '更新进度失败'
    })
  }
})

/**
 * 智能调整学习计划
 * @route POST /api/plan/:planId/adjust
 */
router.post('/:planId/adjust', async (req, res) => {
  try {
    const { planId } = req.params
    const { performance, currentProgress, studentFeedback } = req.body
    
    console.log(`智能调整学习计划: ${planId}`)
    
    // 使用AI分析学习表现并调整计划
    const adjustmentPrompt = `
根据学生的学习表现调整学习计划：
- 当前进度: ${JSON.stringify(currentProgress)}
- 学习表现: ${JSON.stringify(performance)}
- 学生反馈: ${studentFeedback || '无'}

请提供调整建议，包括：
1. 时间分配调整
2. 难度顺序调整
3. 学习策略优化
`
    
    const aiAdjustment = await aiService.generateResponse(adjustmentPrompt, 'plan')
    
    res.json({
      planId,
      adjustment: aiAdjustment,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('智能调整计划失败:', error)
    res.status(500).json({
      error: '计划调整失败'
    })
  }
})

/**
 * 生成计划ID
 */
function generatePlanId() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 6)
  return `plan_${timestamp}_${random}`
}

/**
 * 🚀 快速生成学习计划（fallback方案）
 * @description 当AI服务不可用时，基于OCR结果快速生成基础学习计划
 */
function generateQuickLearningPlan(ocrText, subject, grade) {
  console.log('🚀 使用快速方案生成学习计划')
  
  // 基于题目内容智能估算时间和难度
  const questions = ocrText.map((text, index) => {
    const timeEstimate = estimateQuestionTime(text, subject, grade)
    const difficulty = estimateDifficulty(text, subject, grade)
    const type = identifyQuestionType(text, subject)
    
    return {
      text: text.trim(),
      type: type,
      difficulty: difficulty,
      suggestedTime: timeEstimate,
      analysis: `这是一道${difficulty === 'easy' ? '基础' : difficulty === 'medium' ? '中等' : '较难'}的${type}题目，适合${grade}年级学生练习。`,
      hints: getQuickHints(text, subject, type)
    }
  })
  
  const timeAllocation = questions.map(q => q.suggestedTime)
  const totalTime = timeAllocation.reduce((sum, time) => sum + time, 0)
  
  // 按难度排序优先级
  const priorityOrder = questions
    .map((q, index) => ({ index, difficulty: q.difficulty, time: q.suggestedTime }))
    .sort((a, b) => {
      const difficultyOrder = { easy: 1, medium: 2, hard: 3 }
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
    })
    .map(item => item.index)
  
  return {
    questions,
    totalTime,
    timeAllocation,
    strategy: `建议从简单题目开始，逐步提高难度。总共${questions.length}道题，预计需要${totalTime}分钟完成。`,
    tips: getSubjectTips(subject, grade),
    priorityOrder,
    aiGenerated: false  // 标识为快速生成的计划
  }
}

/**
 * 估算题目完成时间
 */
function estimateQuestionTime(text, subject, grade) {
  const baseTime = subject === 'math' ? 3 : 4 // 数学题相对快一些
  const gradeMultiplier = Math.max(0.8, 1 - (parseInt(grade) - 1) * 0.1) // 高年级相对快一些
  
  // 根据题目长度和复杂度调整
  let complexity = 1
  if (text.length > 20) complexity += 0.5
  if (text.includes('解决') || text.includes('应用') || text.includes('综合')) complexity += 1
  if (text.includes('+') && text.includes('-') && text.includes('×')) complexity += 0.5
  
  return Math.max(1, Math.round(baseTime * gradeMultiplier * complexity))
}

/**
 * 估算题目难度
 */
function estimateDifficulty(text, subject, grade) {
  let score = 0
  
  // 基于关键词判断
  if (text.includes('综合') || text.includes('应用') || text.includes('解决问题')) score += 2
  if (text.includes('分析') || text.includes('比较') || text.includes('推理')) score += 1
  if (text.length > 30) score += 1
  
  // 数学特定判断
  if (subject === 'math') {
    if (text.includes('×') || text.includes('÷')) score += 1
    if (text.includes('小数') || text.includes('分数')) score += 1
    if (/\d+\s*[+\-×÷]\s*\d+\s*[+\-×÷]\s*\d+/.test(text)) score += 1 // 多步运算
  }
  
  if (score >= 3) return 'hard'
  if (score >= 1) return 'medium'
  return 'easy'
}

/**
 * 识别题目类型
 */
function identifyQuestionType(text, subject) {
  if (subject === 'math') {
    if (text.includes('+') || text.includes('加')) return '加法'
    if (text.includes('-') || text.includes('减')) return '减法'
    if (text.includes('×') || text.includes('乘')) return '乘法'
    if (text.includes('÷') || text.includes('除')) return '除法'
    if (text.includes('应用') || text.includes('解决')) return '应用题'
    return '计算题'
  } else if (subject === 'chinese') {
    if (text.includes('读音') || text.includes('拼音')) return '拼音题'
    if (text.includes('词语') || text.includes('组词')) return '词语题'
    if (text.includes('句子') || text.includes('造句')) return '句子题'
    return '语文基础'
  } else if (subject === 'english') {
    if (text.includes('单词') || text.includes('word')) return '单词题'
    if (text.includes('句子') || text.includes('sentence')) return '句子题'
    return '英语基础'
  }
  return '基础练习'
}

/**
 * 获取快速提示
 */
function getQuickHints(text, subject, type) {
  const mathHints = ['仔细计算', '检查结果', '按步骤进行']
  const chineseHints = ['仔细读题', '想想课本内容', '多读几遍']
  const englishHints = ['记住单词意思', '注意语法', '大声朗读']
  
  if (subject === 'math') return mathHints
  if (subject === 'chinese') return chineseHints
  if (subject === 'english') return englishHints
  return ['仔细思考', '不着急', '相信自己']
}

/**
 * 获取学科学习建议
 */
function getSubjectTips(subject, grade) {
  const tips = {
    math: ['每天练习计算', '用实物帮助理解', '多检查答案'],
    chinese: ['多读多写', '积累词汇', '练习书写'],
    english: ['每天背单词', '多听多说', '大胆开口']
  }
  return tips[subject] || ['认真学习', '多思考', '坚持练习']
}

module.exports = router 