/**
 * 游戏化学习系统API路由
 * @description 提供积分、等级、徽章、任务、排行榜等游戏化功能的API接口
 */

const express = require('express')
const router = express.Router()
const {
  getUserGameProfile,
  calculateLevel,
  addExpAndCoins,
  processStudyCompletion,
  getLeaderboard,
  getUserRank,
  purchaseShopItem,
  useItem,
  userTasks,
  userInventory,
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
  friendships,
  // classGroups 已删除
  inviteCodes
} = require('../services/gameService')
const { 
  LevelConfig, 
  BadgeConfig, 
  DailyTaskConfig, 
  WeeklyTaskConfig,
  PetConfig,
  ShopConfig
} = require('../models/gameModel')

/**
 * 获取用户游戏档案
 * @route GET /api/game/profile
 * @description 获取用户的游戏化信息，包括等级、经验、金币、徽章等
 */
router.get('/profile', async (req, res) => {
  try {
    const { userId = 'default_user' } = req.query
    
    console.log(`🎮 获取用户游戏档案: userId=${userId}`)
    
    const profile = getUserGameProfile(userId)
    const levelInfo = calculateLevel(profile.totalExperience)
    const userRank = getUserRank(userId, 'level')
    
    // 安全地获取宠物信息，防止PetConfig未定义
    let petInfo = null
    try {
      if (PetConfig && PetConfig[profile.petType]) {
        const petConfig = PetConfig[profile.petType]
        const petEvolution = petConfig.evolutions?.find(e => 
          profile.petLevel >= e.level && 
          (petConfig.evolutions[petConfig.evolutions.indexOf(e) + 1] ? 
            profile.petLevel < petConfig.evolutions[petConfig.evolutions.indexOf(e) + 1].level : true)
        ) || petConfig.evolutions?.[0]
        
        petInfo = {
          ...petConfig,
          currentEvolution: petEvolution,
          nextEvolution: petConfig.evolutions?.find(e => e.level > profile.petLevel)
        }
      }
    } catch (petError) {
      console.warn('⚠️ 宠物信息处理失败:', petError.message)
      petInfo = {
        name: '学习伙伴',
        description: '你的智能学习助手',
        currentEvolution: { level: profile.petLevel, name: profile.petName, icon: '🤖' }
      }
    }
    
    // 安全地处理徽章信息，防止BadgeConfig未定义
    let processedBadges = []
    try {
      if (BadgeConfig && profile.badges) {
        processedBadges = profile.badges.map(badgeId => BadgeConfig[badgeId]).filter(Boolean)
      }
    } catch (badgeError) {
      console.warn('⚠️ 徽章信息处理失败:', badgeError.message)
      processedBadges = []
    }
    
    // 构建完整的响应数据，确保包含所有字段
    const responseData = {
      // 基础用户信息
      userId: profile.userId,
      level: profile.level,
      experience: profile.experience,
      totalExperience: profile.totalExperience,
      coins: profile.coins,
      streak: profile.streak,
      lastStudyDate: profile.lastStudyDate,
      totalStudyDays: profile.totalStudyDays,
      totalStudyTime: profile.totalStudyTime,
      totalQuestions: profile.totalQuestions,
      totalCorrectAnswers: profile.totalCorrectAnswers,
      badges: processedBadges,
      achievements: profile.achievements || [],
      
      // 宠物信息
      petLevel: profile.petLevel,
      petExperience: profile.petExperience,
      petName: profile.petName,
      petType: profile.petType,
      
      // 社交信息 - 确保这些字段包含在响应中
      friends: profile.friends || [],
      // classId 已删除
      inviteCode: profile.inviteCode || 'UNKNOWN',
              // studyGroups 已删除
      
      // 个性化设置
      currentTheme: profile.currentTheme || 'default',
      currentAvatar: profile.currentAvatar || 'default',
      currentTitle: profile.currentTitle || '',
      
      // 学科统计
      subjectStats: profile.subjectStats || {
        math: { questions: 0, correct: 0, timeSpent: 0 },
        chinese: { questions: 0, correct: 0, timeSpent: 0 },
        english: { questions: 0, correct: 0, timeSpent: 0 },
        science: { questions: 0, correct: 0, timeSpent: 0 }
      },
      
      // 时间戳
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      
      // 计算字段
      levelInfo,
      rank: userRank,
      petInfo,
      stats: {
        accuracy: profile.totalQuestions > 0 ? 
          Math.round((profile.totalCorrectAnswers / profile.totalQuestions) * 100) : 0,
        averageTimePerQuestion: profile.totalQuestions > 0 ? 
          Math.round((profile.totalStudyTime / profile.totalQuestions) * 10) / 10 : 0
      }
    }

    res.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error('获取游戏档案失败:', error)
    res.status(500).json({
      success: false,
      error: '获取游戏档案失败',
      details: error.message
    })
  }
})

/**
 * 处理学习完成事件
 * @route POST /api/game/study-complete
 * @description 学习完成后触发游戏化奖励系统
 */
router.post('/study-complete', async (req, res) => {
  try {
    const {
      userId = 'default_user',
      questionsCount = 0,
      correctCount = 0,
      timeSpent = 0,
      subject = 'general',
      usedAiHelp = false,
      completedInTime = true
    } = req.body
    
    console.log(`🎯 处理学习完成: userId=${userId}, 题目数=${questionsCount}`)
    
    const accuracy = questionsCount > 0 ? Math.round((correctCount / questionsCount) * 100) : 0
    
    const studyData = {
      questionsCount,
      correctCount,
      timeSpent,
      accuracy,
      subject,
      usedAiHelp,
      completedInTime
    }
    
    const result = await processStudyCompletion(userId, studyData)
    
    res.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('处理学习完成失败:', error)
    res.status(500).json({
      success: false,
      error: '处理学习完成失败'
    })
  }
})

/**
 * 获取排行榜
 * @route GET /api/game/leaderboard
 * @description 获取各种类型的排行榜数据
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { 
      type = 'level', 
      limit = 50,
      userId = 'default_user'
    } = req.query
    
    console.log(`🏆 获取排行榜: type=${type}, limit=${limit}`)
    
    const leaderboard = getLeaderboard(type, parseInt(limit))
    const userRank = getUserRank(userId, type)
    
    res.json({
      success: true,
      data: {
        leaderboard,
        userRank,
        type,
        total: leaderboard.length
      }
    })

  } catch (error) {
    console.error('获取排行榜失败:', error)
    res.status(500).json({
      success: false,
      error: '获取排行榜失败'
    })
  }
})

/**
 * 获取每日任务进度
 * @route GET /api/game/tasks
 * @description 获取用户的每日和每周任务进度
 */
router.get('/tasks', async (req, res) => {
  try {
    const { userId = 'default_user' } = req.query
    
    console.log(`📋 获取任务进度: userId=${userId}`)
    
    // 确保用户有任务数据
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
    
    // 构建每日任务列表
    const dailyTasks = DailyTaskConfig.map(taskConfig => {
      const userTask = tasks.daily[taskConfig.id] || {
        progress: 0,
        completed: false,
        completedAt: null
      }
      
      return {
        ...taskConfig,
        progress: Math.min(userTask.progress, taskConfig.target),
        completed: userTask.completed,
        completedAt: userTask.completedAt,
        progressPercentage: Math.round((userTask.progress / taskConfig.target) * 100)
      }
    })
    
    // 构建每周任务列表（暂时为空，可以后续添加）
    const weeklyTasks = []
    
    res.json({
      success: true,
      data: {
        daily: dailyTasks,
        weekly: weeklyTasks,
        lastResetDate: tasks.lastResetDate
      }
    })

  } catch (error) {
    console.error('获取任务进度失败:', error)
    res.status(500).json({
      success: false,
      error: '获取任务进度失败'
    })
  }
})

/**
 * 获取徽章列表
 * @route GET /api/game/badges
 * @description 获取所有徽章信息和用户获得状态
 */
router.get('/badges', async (req, res) => {
  try {
    const { userId = 'default_user' } = req.query
    
    console.log(`🏅 获取徽章列表: userId=${userId}`)
    
    const profile = getUserGameProfile(userId)
    const userBadges = profile.badges
    
    // 构建徽章列表
    const badges = Object.values(BadgeConfig).map(badge => ({
      ...badge,
      earned: userBadges.includes(badge.id),
      earnedAt: userBadges.includes(badge.id) ? new Date() : null // 实际应该存储获得时间
    }))
    
    // 按稀有度和获得状态排序
    const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 }
    badges.sort((a, b) => {
      if (a.earned !== b.earned) return b.earned - a.earned
      return rarityOrder[b.rarity] - rarityOrder[a.rarity]
    })
    
    res.json({
      success: true,
      data: {
        badges,
        totalBadges: badges.length,
        earnedBadges: userBadges.length,
        completionPercentage: Math.round((userBadges.length / badges.length) * 100)
      }
    })

  } catch (error) {
    console.error('获取徽章列表失败:', error)
    res.status(500).json({
      success: false,
      error: '获取徽章列表失败'
    })
  }
})

/**
 * 获取商店物品
 * @route GET /api/game/shop
 * @description 获取商店中所有可购买的物品
 */
router.get('/shop', async (req, res) => {
  try {
    const { 
      userId = 'default_user',
      category = 'all' // 支持按类别筛选
    } = req.query
    
    console.log(`🛒 获取商店物品: userId=${userId}, category=${category}`)
    
    const profile = getUserGameProfile(userId)
    const inventory = userInventory[userId] || {}
    
    // 构建商店物品列表
    let shopItems = Object.values(ShopConfig)
    
    // 按类别筛选
    if (category !== 'all') {
      shopItems = shopItems.filter(item => item.category === category)
    }
    
    // 检查限时商品可用性
    const now = new Date()
    shopItems = shopItems.filter(item => {
      if (!item.limited) return true
      
      const availableFrom = item.availableFrom ? new Date(item.availableFrom) : null
      const availableTo = item.availableTo ? new Date(item.availableTo) : null
      
      return (!availableFrom || now >= availableFrom) && 
             (!availableTo || now <= availableTo)
    })
    
    // 添加购买状态信息
    shopItems = shopItems.map(item => ({
      ...item,
      affordable: profile.coins >= item.price,
      owned: inventory[item.id] || 0,
      isLimited: !!item.limited
    }))
    
    // 按类型和价格排序
    const typeOrder = { consumable: 1, decoration: 2, theme: 3, functional: 4 }
    shopItems.sort((a, b) => {
      if (a.type !== b.type) return typeOrder[a.type] - typeOrder[b.type]
      return a.price - b.price
    })
    
    // 按类别分组
    const categories = {}
    shopItems.forEach(item => {
      if (!categories[item.category]) {
        categories[item.category] = []
      }
      categories[item.category].push(item)
    })
    
    res.json({
      success: true,
      data: {
        items: shopItems,
        categories: categories,
        userCoins: profile.coins,
        inventory: inventory,
        availableCategories: [...new Set(Object.values(ShopConfig).map(item => item.category))]
      }
    })

  } catch (error) {
    console.error('获取商店物品失败:', error)
    res.status(500).json({
      success: false,
      error: '获取商店物品失败'
    })
  }
})

/**
 * 购买商店物品
 * @route POST /api/game/shop/purchase
 * @description 购买商店中的物品
 */
router.post('/shop/purchase', async (req, res) => {
  try {
    const {
      userId = 'default_user',
      itemId,
      quantity = 1
    } = req.body
    
    console.log(`💰 购买物品: userId=${userId}, itemId=${itemId}, quantity=${quantity}`)
    
    if (!itemId) {
      return res.status(400).json({
        success: false,
        error: '缺少物品ID'
      })
    }
    
    const result = purchaseShopItem(userId, itemId, quantity)
    
    res.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('购买物品失败:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 使用物品
 * @route POST /api/game/item/use
 * @description 使用库存中的物品
 */
router.post('/item/use', async (req, res) => {
  try {
    const {
      userId = 'default_user',
      itemId
    } = req.body
    
    console.log(`🎯 使用物品: userId=${userId}, itemId=${itemId}`)
    
    if (!itemId) {
      return res.status(400).json({
        success: false,
        error: '缺少物品ID'
      })
    }
    
    const result = useItem(userId, itemId)
    
    res.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('使用物品失败:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 获取用户库存
 * @route GET /api/game/inventory
 * @description 获取用户的物品库存
 */
router.get('/inventory', async (req, res) => {
  try {
    const { userId = 'default_user' } = req.query
    
    console.log(`🎒 获取用户库存: userId=${userId}`)
    
    const inventory = userInventory[userId] || {}
    
    // 构建库存列表
    const inventoryItems = Object.entries(inventory)
      .filter(([itemId, count]) => count > 0)
      .map(([itemId, count]) => ({
        ...ShopConfig[itemId],
        count,
        totalValue: ShopConfig[itemId].price * count
      }))
    
    res.json({
      success: true,
      data: {
        items: inventoryItems,
        totalItems: inventoryItems.reduce((sum, item) => sum + item.count, 0),
        totalValue: inventoryItems.reduce((sum, item) => sum + item.totalValue, 0)
      }
    })

  } catch (error) {
    console.error('获取库存失败:', error)
    res.status(500).json({
      success: false,
      error: '获取库存失败'
    })
  }
})

/**
 * 获取宠物信息
 * @route GET /api/game/pet
 * @description 获取用户的学习宠物信息
 */
router.get('/pet', async (req, res) => {
  try {
    const { userId = 'default_user' } = req.query
    
    console.log(`🐾 获取宠物信息: userId=${userId}`)
    
    const profile = getUserGameProfile(userId)
    const petInfo = PetConfig[profile.petType]
    
    // 计算宠物当前形态
    const currentEvolution = petInfo.evolutions.find(e => 
      profile.petLevel >= e.level && 
      (petInfo.evolutions[petInfo.evolutions.indexOf(e) + 1] ? 
        profile.petLevel < petInfo.evolutions[petInfo.evolutions.indexOf(e) + 1].level : true)
    ) || petInfo.evolutions[0]
    
    const nextEvolution = petInfo.evolutions.find(e => e.level > profile.petLevel)
    
    // 计算宠物升级进度
    const expToNextLevel = nextEvolution ? 
      (nextEvolution.level - profile.petLevel) * 100 : 0
    const expProgress = nextEvolution ? 
      Math.round((profile.petExperience / expToNextLevel) * 100) : 100
    
    res.json({
      success: true,
      data: {
        ...petInfo,
        level: profile.petLevel,
        experience: profile.petExperience,
        name: profile.petName,
        currentEvolution,
        nextEvolution,
        expProgress,
        expToNextLevel,
        stats: {
          ...petInfo.baseStats,
          // 根据等级增加属性
          intelligence: petInfo.baseStats.intelligence + Math.floor(profile.petLevel / 2),
          loyalty: petInfo.baseStats.loyalty + Math.floor(profile.petLevel / 3),
          energy: petInfo.baseStats.energy + Math.floor(profile.petLevel / 4)
        }
      }
    })

  } catch (error) {
    console.error('获取宠物信息失败:', error)
    res.status(500).json({
      success: false,
      error: '获取宠物信息失败'
    })
  }
})

/**
 * 获取游戏配置信息
 * @route GET /api/game/config
 * @description 获取等级配置、积分规则等游戏配置
 */
router.get('/config', async (req, res) => {
  try {
    console.log('📋 获取游戏配置信息')
    
    res.json({
      success: true,
      data: {
        levels: LevelConfig,
        badges: BadgeConfig,
        dailyTasks: DailyTaskConfig,
        weeklyTasks: WeeklyTaskConfig,
        pets: PetConfig,
        shop: ShopConfig
      }
    })

  } catch (error) {
    console.error('获取游戏配置失败:', error)
    res.status(500).json({
      success: false,
      error: '获取游戏配置失败'
    })
  }
})

/**
 * 学习报告完成自动同步游戏奖励
 * @route POST /api/game/sync-report
 * @description 学习报告完成后自动触发游戏化奖励
 */
router.post('/sync-report', async (req, res) => {
  try {
    const {
      userId,
      planId,
      reportData
    } = req.body

    console.log(`🔄 学习报告同步游戏奖励: userId=${userId}, planId=${planId}`)

    if (!userId || !reportData) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      })
    }

    const result = await syncLearningReportToGame(userId, planId, reportData)

    res.json({
      success: true,
      data: result,
      message: '学习报告同步成功，已获得游戏奖励'
    })

  } catch (error) {
    console.error('学习报告同步失败:', error)
    res.status(500).json({
      success: false,
      error: '学习报告同步失败'
    })
  }
})

/**
 * AI聊天完成自动触发游戏奖励
 * @route POST /api/game/sync-ai-chat
 * @description AI聊天学习完成后触发游戏化奖励
 */
router.post('/sync-ai-chat', async (req, res) => {
  try {
    const {
      userId,
      chatData
    } = req.body

    console.log(`🤖 AI聊天同步游戏奖励: userId=${userId}`)

    if (!userId || !chatData) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      })
    }

    const result = await syncAiChatToGame(userId, chatData)

    res.json({
      success: true,
      data: result,
      message: 'AI聊天学习已获得游戏奖励'
    })

  } catch (error) {
    console.error('AI聊天同步失败:', error)
    res.status(500).json({
      success: false,
      error: 'AI聊天同步失败'
    })
  }
})

// ===== 好友系统 API =====

/**
 * 发送好友邀请
 * @route POST /api/game/friends/invite
 * @description 通过邀请码发送好友邀请
 */
router.post('/friends/invite', async (req, res) => {
  try {
    const {
      userId,
      inviteCode
    } = req.body

    console.log(`👥 发送好友邀请: ${userId} -> ${inviteCode}`)

    if (!userId || !inviteCode) {
      return res.status(400).json({
        success: false,
        error: '缺少用户ID或邀请码'
      })
    }

    const result = sendFriendInvitation(userId, inviteCode)

    res.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('发送好友邀请失败:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 处理好友邀请
 * @route POST /api/game/friends/respond
 * @description 接受或拒绝好友邀请
 */
router.post('/friends/respond', async (req, res) => {
  try {
    const {
      userId,
      invitationId,
      accept
    } = req.body

    console.log(`📩 处理好友邀请: ${invitationId}, 接受: ${accept}`)

    if (!userId || !invitationId || typeof accept !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      })
    }

    const result = respondToFriendInvitation(invitationId, userId, accept)

    res.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('处理好友邀请失败:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * 获取好友列表
 * @route GET /api/game/friends
 * @description 获取用户的好友列表
 */
router.get('/friends', async (req, res) => {
  try {
    const { userId = 'default_user' } = req.query

    console.log(`👫 获取好友列表: userId=${userId}`)

    const friendsList = getFriendsList(userId)

    res.json({
      success: true,
      data: {
        friends: friendsList,
        total: friendsList.length
      }
    })

  } catch (error) {
    console.error('获取好友列表失败:', error)
    res.status(500).json({
      success: false,
      error: '获取好友列表失败'
    })
  }
})

/**
 * 获取好友邀请列表
 * @route GET /api/game/friends/invitations
 * @description 获取用户收到的好友邀请
 */
router.get('/friends/invitations', async (req, res) => {
  try {
    const { userId = 'default_user' } = req.query

    console.log(`📨 获取好友邀请列表: userId=${userId}`)

    // 获取用户收到的待处理邀请
    const receivedInvitations = Object.values(friendships)
      .filter(f => f.receiverId === userId && f.status === 'pending')
      .map(invitation => {
        const senderProfile = getUserGameProfile(invitation.senderId)
        const levelInfo = calculateLevel(senderProfile.totalExperience)
        
        return {
          invitationId: invitation.id,
          senderId: invitation.senderId,
          senderLevel: senderProfile.level,
          senderTitle: levelInfo.title,
          senderPetName: senderProfile.petName,
          senderPetType: senderProfile.petType,
          createdAt: invitation.createdAt
        }
      })

    res.json({
      success: true,
      data: {
        invitations: receivedInvitations,
        total: receivedInvitations.length
      }
    })

  } catch (error) {
    console.error('获取好友邀请失败:', error)
    res.status(500).json({
      success: false,
      error: '获取好友邀请失败'
    })
  }
})

/**
 * 获取好友排行榜
 * @route GET /api/game/friends/leaderboard
 * @description 获取好友之间的排行榜
 */
router.get('/friends/leaderboard', async (req, res) => {
  try {
    const { 
      userId = 'default_user',
      type = 'level'
    } = req.query

    console.log(`🏆 获取好友排行榜: userId=${userId}, type=${type}`)

    const leaderboard = getFriendsLeaderboard(userId, type)

    res.json({
      success: true,
      data: {
        leaderboard: leaderboard,
        type: type,
        total: leaderboard.length
      }
    })

  } catch (error) {
    console.error('获取好友排行榜失败:', error)
    res.status(500).json({
      success: false,
      error: '获取好友排行榜失败'
    })
  }
})

// ===== 班级功能已删除 - 学校禁止此类功能 =====

// ===== 用户状态和统计 =====

/**
 * 获取用户邀请码
 * @route GET /api/game/invite-code
 * @description 获取用户的邀请码
 */
router.get('/invite-code', async (req, res) => {
  try {
    const { userId = 'default_user' } = req.query
    
    console.log(`🔗 获取邀请码: userId=${userId}`)
    
    const profile = getUserGameProfile(userId)
    
    res.json({
      success: true,
      data: {
        inviteCode: profile.inviteCode,
        userId: userId,
        shareable: true
      }
    })

  } catch (error) {
    console.error('获取邀请码失败:', error)
    res.status(500).json({
      success: false,
      error: '获取邀请码失败'
    })
  }
})

/**
 * 获取用户学科统计
 * @route GET /api/game/subject-stats
 * @description 获取用户的多学科学习统计
 */
router.get('/subject-stats', async (req, res) => {
  try {
    const { userId = 'default_user' } = req.query
    
    console.log(`📊 获取学科统计: userId=${userId}`)
    
    const profile = getUserGameProfile(userId)
    
    const subjectStats = Object.entries(profile.subjectStats).map(([subject, stats]) => ({
      subject: subject,
      questions: stats.questions,
      correct: stats.correct,
      accuracy: stats.questions > 0 ? Math.round((stats.correct / stats.questions) * 100) : 0,
      timeSpent: stats.timeSpent,
      averageTime: stats.questions > 0 ? Math.round((stats.timeSpent / stats.questions) * 10) / 10 : 0
    }))
    
    // 计算总体统计
    const totalStats = {
      totalQuestions: profile.totalQuestions,
      totalCorrect: profile.totalCorrectAnswers,
      totalAccuracy: profile.totalQuestions > 0 ? 
        Math.round((profile.totalCorrectAnswers / profile.totalQuestions) * 100) : 0,
      totalTimeSpent: profile.totalStudyTime,
      favoriteSubject: subjectStats.reduce((prev, curr) => 
        curr.questions > prev.questions ? curr : prev, subjectStats[0])?.subject || 'none'
    }
    
    res.json({
      success: true,
      data: {
        subjectStats: subjectStats,
        totalStats: totalStats,
        lastStudyDate: profile.lastStudyDate
      }
    })

  } catch (error) {
    console.error('获取学科统计失败:', error)
    res.status(500).json({
      success: false,
      error: '获取学科统计失败'
    })
  }
})

/**
 * 🧪 测试端点：直接检查用户游戏档案数据
 * @route GET /api/game/test-profile
 * @description 直接返回getUserGameProfile的原始数据，用于调试
 */
router.get('/test-profile', async (req, res) => {
  try {
    const { userId = 'test_user' } = req.query
    
    console.log(`🧪 测试用户游戏档案: userId=${userId}`)
    
    const profile = getUserGameProfile(userId)
    
    res.json({
      success: true,
      data: {
        rawProfile: profile,
        profileKeys: Object.keys(profile),
        inviteCodeDirect: profile.inviteCode,
        friendsDirect: profile.friends,
        // classIdDirect 已删除
        subjectStatsDirect: profile.subjectStats
      },
      message: '原始用户档案数据'
    })

  } catch (error) {
    console.error('测试用户档案失败:', error)
    res.status(500).json({
      success: false,
      error: '测试用户档案失败',
      details: error.message
    })
  }
})

module.exports = router 