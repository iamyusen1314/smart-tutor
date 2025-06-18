/**
 * 游戏化学习系统核心服务
 * @description 处理积分、等级、徽章、任务、排行榜等游戏化功能
 */

const { 
  LevelConfig, 
  BadgeConfig, 
  DailyTaskConfig, 
  WeeklyTaskConfig, 
  PointsConfig,
  SocialPointsConfig,
  PetConfig,
  ShopConfig
} = require('../models/gameModel')

// 模拟数据存储 (实际项目中应使用数据库)
let userGameProfiles = {}
let userTasks = {}
let userInventory = {}
let globalLeaderboard = []
// 社交功能数据存储
let friendships = {}
// 班级功能已删除 - 学校禁止此类功能
// studyGroups 也删除了
let inviteCodes = {}

/**
 * 生成邀请码
 * @returns {string} 6位邀请码
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 获取或创建用户游戏档案
 * @param {string} userId 用户ID
 * @returns {Object} 用户游戏档案
 */
function getUserGameProfile(userId) {
  if (!userGameProfiles[userId]) {
    const inviteCode = generateInviteCode()
    userGameProfiles[userId] = {
      userId,
      level: 1,
      experience: 0,
      totalExperience: 0,
      coins: 100, // 初始金币
      streak: 0,
      lastStudyDate: null,
      totalStudyDays: 0,
      totalStudyTime: 0,
      totalQuestions: 0,
      totalCorrectAnswers: 0,
      badges: [],
      achievements: [],
      petLevel: 1,
      petExperience: 0,
      petName: '小智',
      petType: 'owl',
      // 社交功能扩展
      friends: [],
  
      inviteCode: inviteCode,
              // studyGroups 已删除
      // 个性化设置
      currentTheme: 'default',
      currentAvatar: 'default',
      currentTitle: '',
      // 学科统计
      subjectStats: {
        math: { questions: 0, correct: 0, timeSpent: 0 },
        chinese: { questions: 0, correct: 0, timeSpent: 0 },
        english: { questions: 0, correct: 0, timeSpent: 0 },
        science: { questions: 0, correct: 0, timeSpent: 0 }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // 注册邀请码
    inviteCodes[inviteCode] = userId
  }
  return userGameProfiles[userId]
}

/**
 * 计算等级和经验值
 * @param {number} totalExp 总经验值
 * @returns {Object} 等级信息
 */
function calculateLevel(totalExp) {
  for (let i = LevelConfig.length - 1; i >= 0; i--) {
    const levelInfo = LevelConfig[i]
    if (totalExp >= levelInfo.requiredExp) {
      const nextLevel = LevelConfig[i + 1]
      return {
        level: levelInfo.level,
        title: levelInfo.title,
        currentExp: totalExp - levelInfo.requiredExp,
        nextLevelExp: nextLevel ? nextLevel.requiredExp - levelInfo.requiredExp : 0,
        progress: nextLevel ? (totalExp - levelInfo.requiredExp) / (nextLevel.requiredExp - levelInfo.requiredExp) : 1
      }
    }
  }
  return {
    level: 1,
    title: '学习新手',
    currentExp: totalExp,
    nextLevelExp: LevelConfig[1].requiredExp,
    progress: totalExp / LevelConfig[1].requiredExp
  }
}

/**
 * 添加经验值和金币
 * @param {string} userId 用户ID
 * @param {number} exp 经验值
 * @param {number} coins 金币
 * @param {string} reason 获得原因
 * @returns {Object} 更新后的信息
 */
function addExpAndCoins(userId, exp, coins, reason = '学习奖励') {
  const profile = getUserGameProfile(userId)
  const oldLevel = profile.level
  
  profile.experience += exp
  profile.totalExperience += exp
  profile.coins += coins
  profile.updatedAt = new Date()
  
  // 计算新等级
  const levelInfo = calculateLevel(profile.totalExperience)
  const leveledUp = levelInfo.level > oldLevel
  
  if (leveledUp) {
    profile.level = levelInfo.level
    // 升级奖励
    const levelReward = LevelConfig.find(l => l.level === levelInfo.level)
    if (levelReward && levelReward.rewards.coins) {
      profile.coins += levelReward.rewards.coins
    }
  }
  
  console.log(`🎮 用户${userId}获得经验${exp}，金币${coins}，原因：${reason}`)
  
  return {
    profile,
    levelInfo,
    leveledUp,
    levelReward: leveledUp ? LevelConfig.find(l => l.level === levelInfo.level) : null,
    expGained: exp,
    coinsGained: coins,
    reason
  }
}

/**
 * 处理学习完成事件
 * @param {string} userId 用户ID
 * @param {Object} studyData 学习数据
 * @returns {Promise<Object>} 游戏化奖励结果
 */
async function processStudyCompletion(userId, studyData) {
  const {
    questionsCount = 0,
    correctCount = 0,
    timeSpent = 0,
    accuracy = 0,
    subject = 'general',
    usedAiHelp = false,
    completedInTime = true
  } = studyData
  
  const profile = getUserGameProfile(userId)
  
  // 更新学习统计
  profile.totalQuestions += questionsCount
  profile.totalCorrectAnswers += correctCount
  profile.totalStudyTime += timeSpent
  
  // 检查连续学习
  const today = new Date().toDateString()
  const lastStudyDate = profile.lastStudyDate
  const isFirstStudyToday = !lastStudyDate || lastStudyDate !== today
  
  if (isFirstStudyToday) {
    profile.totalStudyDays += 1
    profile.lastStudyDate = today
    
    // 计算连续学习天数
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toDateString()
    
    if (lastStudyDate === yesterdayStr) {
      profile.streak += 1
    } else if (lastStudyDate !== today) {
      profile.streak = 1 // 重新开始连续
    }
  }
  
  // 计算基础奖励
  let totalExp = 0
  let totalCoins = 0
  const rewards = []
  
  // 基础学习奖励
  const sessionExp = PointsConfig.complete_study_session
  const sessionCoins = Math.floor(sessionExp * 0.5)
  totalExp += sessionExp
  totalCoins += sessionCoins
  rewards.push({
    type: 'study_session',
    exp: sessionExp,
    coins: sessionCoins,
    description: '完成学习'
  })
  
  // 答题奖励
  const correctExp = correctCount * PointsConfig.complete_question_correct
  const wrongExp = (questionsCount - correctCount) * PointsConfig.complete_question_wrong
  totalExp += correctExp + wrongExp
  totalCoins += Math.floor((correctExp + wrongExp) * 0.3)
  rewards.push({
    type: 'questions',
    exp: correctExp + wrongExp,
    coins: Math.floor((correctExp + wrongExp) * 0.3),
    description: `答题：${correctCount}对${questionsCount - correctCount}错`
  })
  
  // 首次学习奖励
  if (isFirstStudyToday) {
    const dailyExp = PointsConfig.daily_first_study
    const dailyCoins = Math.floor(dailyExp * 0.5)
    totalExp += dailyExp
    totalCoins += dailyCoins
    rewards.push({
      type: 'daily_first',
      exp: dailyExp,
      coins: dailyCoins,
      description: '今日首次学习'
    })
  }
  
  // 满分奖励
  if (accuracy === 100) {
    const perfectExp = PointsConfig.perfect_score
    const perfectCoins = Math.floor(perfectExp * 0.6)
    totalExp += perfectExp
    totalCoins += perfectCoins
    rewards.push({
      type: 'perfect_score',
      exp: perfectExp,
      coins: perfectCoins,
      description: '完美答题！'
    })
  }
  
  // 快速完成奖励
  if (completedInTime && timeSpent <= questionsCount * 2) {
    const speedExp = PointsConfig.fast_completion
    const speedCoins = Math.floor(speedExp * 0.4)
    totalExp += speedExp
    totalCoins += speedCoins
    rewards.push({
      type: 'speed_bonus',
      exp: speedExp,
      coins: speedCoins,
      description: '快速完成'
    })
  }
  
  // 求助奖励（鼓励主动学习）
  if (usedAiHelp) {
    const helpExp = PointsConfig.help_request
    const helpCoins = Math.floor(helpExp * 0.3)
    totalExp += helpExp
    totalCoins += helpCoins
    rewards.push({
      type: 'help_request',
      exp: helpExp,
      coins: helpCoins,
      description: '主动求助'
    })
  }
  
  // 连续学习奖励
  if (profile.streak >= 7) {
    let streakBonus = 0
    if (profile.streak === 7) streakBonus = PointsConfig.streak_bonus_7
    else if (profile.streak === 14) streakBonus = PointsConfig.streak_bonus_14
    else if (profile.streak === 30) streakBonus = PointsConfig.streak_bonus_30
    
    if (streakBonus > 0) {
      const streakCoins = Math.floor(streakBonus * 0.5)
      totalExp += streakBonus
      totalCoins += streakCoins
      rewards.push({
        type: 'streak_bonus',
        exp: streakBonus,
        coins: streakCoins,
        description: `连续学习${profile.streak}天奖励`
      })
    }
  }
  
  // 应用奖励
  const result = addExpAndCoins(userId, totalExp, totalCoins, '学习完成')
  
  // 检查徽章和成就
  const newBadges = await checkAndAwardBadges(userId, studyData)
  const completedTasks = await updateDailyTasks(userId, studyData)
  
  return {
    ...result,
    rewards,
    newBadges,
    completedTasks,
    streak: profile.streak,
    isFirstStudyToday
  }
}

/**
 * 检查并颁发徽章
 * @param {string} userId 用户ID
 * @param {Object} studyData 学习数据
 * @returns {Promise<Array>} 新获得的徽章
 */
async function checkAndAwardBadges(userId, studyData) {
  const profile = getUserGameProfile(userId)
  const newBadges = []
  
  // 检查各种徽章条件
  const badgeChecks = [
    // 第一道题徽章
    {
      id: 'first_question',
      condition: () => profile.totalQuestions >= 1 && !profile.badges.includes('first_question')
    },
    // 完美一天徽章
    {
      id: 'perfect_day',
      condition: () => studyData.accuracy === 100 && !profile.badges.includes('perfect_day')
    },
    // 速度之王徽章
    {
      id: 'speed_master',
      condition: () => studyData.completedInTime && studyData.accuracy >= 80 && !profile.badges.includes('speed_master')
    },
    // 连续学习徽章
    {
      id: 'week_warrior',
      condition: () => profile.streak >= 7 && !profile.badges.includes('week_warrior')
    },
    {
      id: 'month_master',
      condition: () => profile.streak >= 30 && !profile.badges.includes('month_master')
    },
    // 百题达人徽章
    {
      id: 'hundred_questions',
      condition: () => profile.totalQuestions >= 100 && !profile.badges.includes('hundred_questions')
    },
    // 千题大神徽章
    {
      id: 'thousand_questions',
      condition: () => profile.totalQuestions >= 1000 && !profile.badges.includes('thousand_questions')
    },
    // 求知者徽章
    {
      id: 'help_seeker',
      condition: () => studyData.usedAiHelp && checkAiHelpCount(userId) >= 20 && !profile.badges.includes('help_seeker')
    }
  ]
  
  for (const check of badgeChecks) {
    if (check.condition()) {
      const badge = BadgeConfig[check.id]
      if (badge) {
        profile.badges.push(check.id)
        newBadges.push(badge)
        
        // 徽章奖励
        addExpAndCoins(userId, badge.exp, badge.coins, `获得徽章：${badge.name}`)
        
        console.log(`🏆 用户${userId}获得徽章：${badge.name}`)
      }
    }
  }
  
  return newBadges
}

/**
 * 更新每日任务进度
 * @param {string} userId 用户ID
 * @param {Object} studyData 学习数据
 * @returns {Promise<Array>} 完成的任务
 */
async function updateDailyTasks(userId, studyData) {
  if (!userTasks[userId]) {
    userTasks[userId] = {
      daily: {},
      weekly: {},
      lastResetDate: new Date().toDateString()
    }
  }
  
  const tasks = userTasks[userId]
  const today = new Date().toDateString()
  
  // 检查是否需要重置每日任务
  if (tasks.lastResetDate !== today) {
    tasks.daily = {}
    tasks.lastResetDate = today
  }
  
  const completedTasks = []
  
  // 更新每日任务进度
  for (const taskConfig of DailyTaskConfig) {
    if (!tasks.daily[taskConfig.id]) {
      tasks.daily[taskConfig.id] = {
        progress: 0,
        completed: false,
        completedAt: null
      }
    }
    
    const task = tasks.daily[taskConfig.id]
    if (task.completed) continue
    
    // 更新任务进度
    switch (taskConfig.id) {
      case 'complete_5_questions':
        task.progress += studyData.questionsCount || 0
        break
      case 'study_15_minutes':
        task.progress += studyData.timeSpent || 0
        break
      case 'accuracy_80_percent':
        if (studyData.accuracy >= 80) {
          task.progress = taskConfig.target
        }
        break
      case 'use_ai_help':
        if (studyData.usedAiHelp) {
          task.progress += 1
        }
        break
    }
    
    // 检查任务完成
    if (task.progress >= taskConfig.target && !task.completed) {
      task.completed = true
      task.completedAt = new Date()
      completedTasks.push({
        ...taskConfig,
        completedAt: task.completedAt
      })
      
      // 发放任务奖励
      addExpAndCoins(userId, taskConfig.exp, taskConfig.coins, `完成任务：${taskConfig.name}`)
      
      console.log(`✅ 用户${userId}完成每日任务：${taskConfig.name}`)
    }
  }
  
  return completedTasks
}

/**
 * 获取排行榜数据
 * @param {string} type 排行榜类型 ('level', 'exp', 'streak', 'questions')
 * @param {number} limit 限制数量
 * @returns {Array} 排行榜数据
 */
function getLeaderboard(type = 'level', limit = 50) {
  const profiles = Object.values(userGameProfiles)
  
  // 根据类型排序
  let sortedProfiles
  switch (type) {
    case 'level':
      sortedProfiles = profiles.sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level
        return b.totalExperience - a.totalExperience
      })
      break
    case 'exp':
      sortedProfiles = profiles.sort((a, b) => b.totalExperience - a.totalExperience)
      break
    case 'streak':
      sortedProfiles = profiles.sort((a, b) => b.streak - a.streak)
      break
    case 'questions':
      sortedProfiles = profiles.sort((a, b) => b.totalQuestions - a.totalQuestions)
      break
    default:
      sortedProfiles = profiles.sort((a, b) => b.level - a.level)
  }
  
  return sortedProfiles.slice(0, limit).map((profile, index) => ({
    rank: index + 1,
    userId: profile.userId,
    level: profile.level,
    experience: profile.totalExperience,
    streak: profile.streak,
    totalQuestions: profile.totalQuestions,
    badges: profile.badges.length,
    petName: profile.petName,
    petType: profile.petType,
    title: calculateLevel(profile.totalExperience).title
  }))
}

/**
 * 获取用户排名
 * @param {string} userId 用户ID
 * @param {string} type 排行榜类型
 * @returns {Object} 用户排名信息
 */
function getUserRank(userId, type = 'level') {
  const leaderboard = getLeaderboard(type, 1000) // 获取足够多的数据
  const userRank = leaderboard.findIndex(entry => entry.userId === userId)
  return {
    rank: userRank >= 0 ? userRank + 1 : -1,
    total: leaderboard.length,
    percentile: userRank >= 0 ? Math.round((1 - userRank / leaderboard.length) * 100) : 0
  }
}

/**
 * 购买商店物品
 * @param {string} userId 用户ID
 * @param {string} itemId 物品ID
 * @param {number} quantity 购买数量
 * @returns {Object} 购买结果
 */
function purchaseShopItem(userId, itemId, quantity = 1) {
  const profile = getUserGameProfile(userId)
  const item = ShopConfig[itemId]
  
  if (!item) {
    throw new Error('物品不存在')
  }
  
  const totalCost = item.price * quantity
  if (profile.coins < totalCost) {
    throw new Error('金币不足')
  }
  
  // 扣除金币
  profile.coins -= totalCost
  
  // 添加到库存
  if (!userInventory[userId]) {
    userInventory[userId] = {}
  }
  
  if (!userInventory[userId][itemId]) {
    userInventory[userId][itemId] = 0
  }
  userInventory[userId][itemId] += quantity
  
  console.log(`🛒 用户${userId}购买了${quantity}个${item.name}，花费${totalCost}金币`)
  
  return {
    success: true,
    item,
    quantity,
    totalCost,
    remainingCoins: profile.coins,
    inventory: userInventory[userId]
  }
}

/**
 * 使用物品
 * @param {string} userId 用户ID
 * @param {string} itemId 物品ID
 * @returns {Object} 使用结果
 */
function useItem(userId, itemId) {
  const inventory = userInventory[userId]
  if (!inventory || !inventory[itemId] || inventory[itemId] <= 0) {
    throw new Error('物品不足')
  }
  
  const item = ShopConfig[itemId]
  if (!item) {
    throw new Error('物品不存在')
  }
  
  // 消耗物品
  inventory[itemId] -= 1
  
  // 应用效果
  let effect = {}
  switch (item.effect) {
    case 'hint_boost':
      effect = { type: 'hint', description: '获得一次免费提示' }
      break
    case 'time_boost':
      effect = { type: 'time_extend', seconds: 30, description: '题目时间延长30秒' }
      break
    case 'exp_boost':
      effect = { type: 'double_exp', description: '下次学习获得双倍经验' }
      break
    case 'pet_exp_boost':
      const profile = getUserGameProfile(userId)
      profile.petExperience += 50
      effect = { type: 'pet_exp', exp: 50, description: '宠物获得50经验' }
      break
  }
  
  console.log(`🎯 用户${userId}使用了${item.name}`)
  
  return {
    success: true,
    item,
    effect,
    remainingCount: inventory[itemId]
  }
}

/**
 * 辅助函数：检查AI求助次数
 * @param {string} userId 用户ID
 * @returns {number} AI求助次数
 */
function checkAiHelpCount(userId) {
  // 这里应该从数据库查询，暂时返回模拟数据
  return Math.floor(Math.random() * 50)
}

/**
 * 自动同步学习报告数据到游戏系统
 * @param {string} userId 用户ID
 * @param {string} planId 学习计划ID
 * @param {Object} reportData 学习报告数据
 * @returns {Promise<Object>} 游戏化奖励结果
 */
async function syncLearningReportToGame(userId, planId, reportData) {
  console.log(`🔄 同步学习报告到游戏系统: userId=${userId}, planId=${planId}`)
  
  const {
    correctRate = 0,
    totalQuestions = 0,
    totalCorrect = 0,
    totalTime = 0,
    subject = 'general',
    weakPoints = [],
    completedAt = new Date()
  } = reportData
  
  // 构造学习数据
  const studyData = {
    questionsCount: totalQuestions,
    correctCount: totalCorrect,
    timeSpent: Math.floor(totalTime / 60), // 转换为分钟
    accuracy: correctRate,
    subject: subject,
    usedAiHelp: weakPoints.length > 0, // 如果有弱点，说明使用了AI帮助
    completedInTime: true, // 学习报告完成默认认为按时完成
    planId: planId
  }
  
  // 更新学科统计
  const profile = getUserGameProfile(userId)
  if (profile.subjectStats[subject]) {
    profile.subjectStats[subject].questions += totalQuestions
    profile.subjectStats[subject].correct += totalCorrect
    profile.subjectStats[subject].timeSpent += Math.floor(totalTime / 60)
  }
  
  // 处理学习完成奖励
  const gameResult = await processStudyCompletion(userId, studyData)
  
  console.log(`✅ 学习报告同步完成，获得经验${gameResult.expGained}，金币${gameResult.coinsGained}`)
  
  return {
    ...gameResult,
    syncedAt: new Date(),
    planId: planId,
    reportData: reportData
  }
}

/**
 * AI聊天完成自动触发游戏奖励
 * @param {string} userId 用户ID
 * @param {Object} chatData AI聊天数据
 * @returns {Promise<Object>} 游戏化奖励结果
 */
async function syncAiChatToGame(userId, chatData) {
  console.log(`🤖 AI聊天完成，触发游戏奖励: userId=${userId}`)
  
  const {
    subject = 'general',
    questionsAsked = 1,
    helpfulResponse = true,
    difficulty = 'medium'
  } = chatData
  
  // AI聊天奖励
  let expReward = PointsConfig.help_request
  let coinReward = Math.floor(expReward * 0.3)
  
  // 根据难度调整奖励
  const difficultyMultiplier = {
    easy: 0.8,
    medium: 1.0,
    hard: 1.5
  }
  
  expReward = Math.floor(expReward * (difficultyMultiplier[difficulty] || 1.0))
  coinReward = Math.floor(coinReward * (difficultyMultiplier[difficulty] || 1.0))
  
  const result = addExpAndCoins(userId, expReward, coinReward, 'AI聊天学习')
  
  // 更新AI求助计数
  updateAiHelpCount(userId, questionsAsked)
  
  return {
    ...result,
    chatReward: {
      exp: expReward,
      coins: coinReward,
      subject: subject,
      difficulty: difficulty
    }
  }
}

/**
 * 发送好友邀请
 * @param {string} senderId 发送者ID
 * @param {string} receiverCode 接收者邀请码或用户ID
 * @returns {Object} 邀请结果
 */
function sendFriendInvitation(senderId, receiverCode) {
  console.log(`👥 发送好友邀请: ${senderId} -> ${receiverCode}`)
  
  // 通过邀请码查找用户
  let receiverId = inviteCodes[receiverCode] || receiverCode
  
  if (!receiverId || !userGameProfiles[receiverId]) {
    throw new Error('用户不存在或邀请码无效')
  }
  
  if (senderId === receiverId) {
    throw new Error('不能邀请自己为好友')
  }
  
  // 检查是否已经是好友
  const senderProfile = getUserGameProfile(senderId)
  if (senderProfile.friends.includes(receiverId)) {
    throw new Error('已经是好友了')
  }
  
  // 检查是否已有待处理的邀请
  const existingInvitation = Object.values(friendships).find(f => 
    (f.senderId === senderId && f.receiverId === receiverId) ||
    (f.senderId === receiverId && f.receiverId === senderId)
  )
  
  if (existingInvitation) {
    throw new Error('已有待处理的好友邀请')
  }
  
  // 创建好友邀请
  const invitationId = `friendship_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  friendships[invitationId] = {
    id: invitationId,
    senderId: senderId,
    receiverId: receiverId,
    status: 'pending',
    inviteCode: receiverCode,
    createdAt: new Date(),
    acceptedAt: null
  }
  
  console.log(`✅ 好友邀请已发送: ${invitationId}`)
  
  return {
    invitationId: invitationId,
    status: 'sent',
    receiverId: receiverId,
    message: '好友邀请已发送'
  }
}

/**
 * 处理好友邀请回应
 * @param {string} invitationId 邀请ID
 * @param {string} userId 当前用户ID（接收者）
 * @param {boolean} accept 是否接受邀请
 * @returns {Object} 处理结果
 */
function respondToFriendInvitation(invitationId, userId, accept) {
  console.log(`📩 处理好友邀请: ${invitationId}, 用户: ${userId}, 接受: ${accept}`)
  
  const invitation = friendships[invitationId]
  if (!invitation) {
    throw new Error('邀请不存在')
  }
  
  if (invitation.receiverId !== userId) {
    throw new Error('无权处理此邀请')
  }
  
  if (invitation.status !== 'pending') {
    throw new Error('邀请已处理')
  }
  
  if (accept) {
    // 接受邀请
    invitation.status = 'accepted'
    invitation.acceptedAt = new Date()
    
    // 更新双方好友列表
    const senderProfile = getUserGameProfile(invitation.senderId)
    const receiverProfile = getUserGameProfile(invitation.receiverId)
    
    senderProfile.friends.push(invitation.receiverId)
    receiverProfile.friends.push(invitation.senderId)
    
    // 给邀请者奖励
    addExpAndCoins(invitation.senderId, SocialPointsConfig.invite_friend_success, 
                   Math.floor(SocialPointsConfig.invite_friend_success * 0.5), '成功邀请好友')
    
    console.log(`🎉 好友关系建立: ${invitation.senderId} <-> ${invitation.receiverId}`)
    
    return {
      status: 'accepted',
      message: '好友邀请已接受，建立好友关系',
      friendUserId: invitation.senderId
    }
  } else {
    // 拒绝邀请
    invitation.status = 'rejected'
    console.log(`❌ 好友邀请被拒绝: ${invitationId}`)
    
    return {
      status: 'rejected',
      message: '好友邀请已拒绝'
    }
  }
}

/**
 * 获取好友列表
 * @param {string} userId 用户ID
 * @returns {Array} 好友列表
 */
function getFriendsList(userId) {
  const profile = getUserGameProfile(userId)
  
  return profile.friends.map(friendId => {
    const friendProfile = getUserGameProfile(friendId)
    const levelInfo = calculateLevel(friendProfile.totalExperience)
    
    return {
      userId: friendId,
      level: friendProfile.level,
      title: levelInfo.title,
      petName: friendProfile.petName,
      petType: friendProfile.petType,
      streak: friendProfile.streak,
      lastStudyDate: friendProfile.lastStudyDate,
      totalQuestions: friendProfile.totalQuestions,
      badges: friendProfile.badges.length,
      isOnline: isUserOnline(friendId), // 需要实现在线状态检测
      inviteCode: friendProfile.inviteCode
    }
  })
}

/**
 * 获取好友排行榜
 * @param {string} userId 用户ID
 * @param {string} type 排行榜类型
 * @returns {Array} 好友排行榜
 */
function getFriendsLeaderboard(userId, type = 'level') {
  const profile = getUserGameProfile(userId)
  const friendIds = [...profile.friends, userId] // 包含自己
  
  const friendProfiles = friendIds.map(id => getUserGameProfile(id))
  
  // 根据类型排序
  let sortedFriends
  switch (type) {
    case 'level':
      sortedFriends = friendProfiles.sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level
        return b.totalExperience - a.totalExperience
      })
      break
    case 'streak':
      sortedFriends = friendProfiles.sort((a, b) => b.streak - a.streak)
      break
    case 'questions':
      sortedFriends = friendProfiles.sort((a, b) => b.totalQuestions - a.totalQuestions)
      break
    default:
      sortedFriends = friendProfiles.sort((a, b) => b.level - a.level)
  }
  
  return sortedFriends.map((friend, index) => {
    const levelInfo = calculateLevel(friend.totalExperience)
    return {
      rank: index + 1,
      userId: friend.userId,
      level: friend.level,
      title: levelInfo.title,
      experience: friend.totalExperience,
      streak: friend.streak,
      totalQuestions: friend.totalQuestions,
      petName: friend.petName,
      petType: friend.petType,
      isCurrentUser: friend.userId === userId
    }
  })
}

// 班级功能已删除 - 学校禁止此类功能

/**
 * 检测用户在线状态（简单实现）
 * @param {string} userId 用户ID
 * @returns {boolean} 是否在线
 */
function isUserOnline(userId) {
  // 简单实现：检查最后活动时间是否在5分钟内
  const profile = getUserGameProfile(userId)
  const lastActivity = profile.updatedAt || profile.createdAt
  const now = new Date()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
  
  return lastActivity > fiveMinutesAgo
}

/**
 * 更新AI求助计数
 * @param {string} userId 用户ID
 * @param {number} count 求助次数
 */
function updateAiHelpCount(userId, count = 1) {
  if (!userTasks[userId]) {
    userTasks[userId] = { aiHelpCount: 0 }
  }
  
  userTasks[userId].aiHelpCount = (userTasks[userId].aiHelpCount || 0) + count
}

module.exports = {
  getUserGameProfile,
  calculateLevel,
  addExpAndCoins,
  processStudyCompletion,
  checkAndAwardBadges,
  updateDailyTasks,
  getLeaderboard,
  getUserRank,
  purchaseShopItem,
  useItem,
  checkAiHelpCount,
  // 新增的社交功能
  syncLearningReportToGame,
  syncAiChatToGame,
  sendFriendInvitation,
  respondToFriendInvitation,
  getFriendsList,
  getFriendsLeaderboard,
  // 班级功能已删除
  generateInviteCode,
  isUserOnline,
  updateAiHelpCount,
  // 导出数据结构供外部访问
  userTasks,
  userInventory,
  friendships,
  // classGroups 已删除
  inviteCodes
} 