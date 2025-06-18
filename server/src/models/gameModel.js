/**
 * 游戏化学习系统数据模型
 * @description 定义积分、等级、徽章、任务、排行榜等游戏化元素的数据结构
 */

// 用户游戏化信息模型
const UserGameProfile = {
  userId: 'String', // 用户ID
  level: 1, // 当前等级
  experience: 0, // 当前经验值
  totalExperience: 0, // 累计经验值
  coins: 100, // 游戏币 (初始赠送100金币)
  streak: 0, // 连续学习天数
  lastStudyDate: null, // 最后学习日期
  totalStudyDays: 0, // 累计学习天数
  totalStudyTime: 0, // 累计学习时间(分钟)
  totalQuestions: 0, // 累计答题数
  totalCorrectAnswers: 0, // 累计答对题数
  badges: [], // 已获得徽章列表
  achievements: [], // 已完成成就列表
  petLevel: 1, // 学习宠物等级
  petExperience: 0, // 宠物经验值
  petName: '小智', // 宠物名称
  petType: 'owl', // 宠物类型
  // 社交功能扩展
  friends: [], // 好友列表
  inviteCode: '', // 个人邀请码
  // 个性化设置
  currentTheme: 'default', // 当前主题
  currentAvatar: 'default', // 当前头像
  currentTitle: '', // 当前称号
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

// 好友系统模型
const FriendshipModel = {
  id: 'String', // 关系ID
  senderId: 'String', // 发送者ID
  receiverId: 'String', // 接收者ID
  status: 'pending', // 'pending', 'accepted', 'rejected', 'blocked'
  inviteCode: 'String', // 邀请码
  createdAt: new Date(),
  acceptedAt: null
}

// 班级功能已删除 - 学校禁止此类功能

// 等级配置
const LevelConfig = [
  { level: 1, requiredExp: 0, title: '学习新手', rewards: { coins: 0 } },
  { level: 2, requiredExp: 100, title: '好学少年', rewards: { coins: 50 } },
  { level: 3, requiredExp: 250, title: '知识探索者', rewards: { coins: 100 } },
  { level: 4, requiredExp: 500, title: '学习达人', rewards: { coins: 150 } },
  { level: 5, requiredExp: 1000, title: '智慧之星', rewards: { coins: 200 } },
  { level: 6, requiredExp: 1800, title: '学霸', rewards: { coins: 300 } },
  { level: 7, requiredExp: 3000, title: '超级学霸', rewards: { coins: 500 } },
  { level: 8, requiredExp: 5000, title: '知识大师', rewards: { coins: 800 } },
  { level: 9, requiredExp: 8000, title: '学习专家', rewards: { coins: 1200 } },
  { level: 10, requiredExp: 12000, title: '知识王者', rewards: { coins: 2000 } }
]

// 徽章配置
const BadgeConfig = {
  // 学习成就类
  first_question: {
    id: 'first_question',
    name: '初学者',
    description: '完成第一道题目',
    icon: '🌟',
    rarity: 'common',
    exp: 10,
    coins: 10
  },
  perfect_day: {
    id: 'perfect_day',
    name: '完美一天',
    description: '当日正确率达到100%',
    icon: '💯',
    rarity: 'rare',
    exp: 50,
    coins: 50
  },
  speed_master: {
    id: 'speed_master',
    name: '速度之王',
    description: '在规定时间内完成所有题目',
    icon: '⚡',
    rarity: 'rare',
    exp: 30,
    coins: 30
  },
  week_warrior: {
    id: 'week_warrior',
    name: '周学习勇士',
    description: '连续7天学习',
    icon: '🛡️',
    rarity: 'epic',
    exp: 100,
    coins: 100
  },
  month_master: {
    id: 'month_master',
    name: '月度大师',
    description: '连续30天学习',
    icon: '👑',
    rarity: 'legendary',
    exp: 500,
    coins: 500
  },
  
  // 学科专精类
  math_genius: {
    id: 'math_genius',
    name: '数学天才',
    description: '数学题正确率连续10次超过90%',
    icon: '🧮',
    rarity: 'epic',
    exp: 80,
    coins: 80
  },
  chinese_master: {
    id: 'chinese_master',
    name: '语文大师',
    description: '语文题正确率连续10次超过90%',
    icon: '📚',
    rarity: 'epic',
    exp: 80,
    coins: 80
  },
  english_star: {
    id: 'english_star',
    name: '英语之星',
    description: '英语题正确率连续10次超过90%',
    icon: '🌟',
    rarity: 'epic',
    exp: 80,
    coins: 80
  },
  
  // 数量成就类
  hundred_questions: {
    id: 'hundred_questions',
    name: '百题达人',
    description: '累计完成100道题目',
    icon: '💪',
    rarity: 'rare',
    exp: 60,
    coins: 60
  },
  thousand_questions: {
    id: 'thousand_questions',
    name: '千题大神',
    description: '累计完成1000道题目',
    icon: '🏆',
    rarity: 'legendary',
    exp: 300,
    coins: 300
  },
  
  // 特殊成就类
  early_bird: {
    id: 'early_bird',
    name: '早起鸟儿',
    description: '早上6-8点之间学习10次',
    icon: '🐦',
    rarity: 'rare',
    exp: 40,
    coins: 40
  },
  night_owl: {
    id: 'night_owl',
    name: '夜猫子',
    description: '晚上20-22点之间学习10次',
    icon: '🦉',
    rarity: 'rare',
    exp: 40,
    coins: 40
  },
  help_seeker: {
    id: 'help_seeker',
    name: '求知者',
    description: '主动向AI请求帮助20次',
    icon: '🤔',
    rarity: 'common',
    exp: 20,
    coins: 20
  }
}

// 每日任务配置
const DailyTaskConfig = [
  {
    id: 'complete_5_questions',
    name: '每日练习',
    description: '完成5道题目',
    target: 5,
    exp: 20,
    coins: 20,
    icon: '📝'
  },
  {
    id: 'study_15_minutes',
    name: '学习时光',
    description: '学习满15分钟',
    target: 15,
    exp: 25,
    coins: 25,
    icon: '⏰'
  },
  {
    id: 'accuracy_80_percent',
    name: '精准射手',
    description: '正确率达到80%',
    target: 80,
    exp: 30,
    coins: 30,
    icon: '🎯'
  },
  {
    id: 'use_ai_help',
    name: '聪明学习',
    description: '向AI求助3次',
    target: 3,
    exp: 15,
    coins: 15,
    icon: '🤖'
  }
]

// 每周任务配置
const WeeklyTaskConfig = [
  {
    id: 'study_5_days',
    name: '坚持学习',
    description: '本周学习5天',
    target: 5,
    exp: 100,
    coins: 100,
    icon: '📅'
  },
  {
    id: 'complete_50_questions',
    name: '题海战术',
    description: '本周完成50道题目',
    target: 50,
    exp: 150,
    coins: 150,
    icon: '🌊'
  },
  {
    id: 'multi_subject',
    name: '全科发展',
    description: '学习3个不同学科',
    target: 3,
    exp: 80,
    coins: 80,
    icon: '🎨'
  }
]

// 积分规则配置 - 优化后的游戏经济系统
const PointsConfig = {
  // === 基础学习行为 ===
  complete_question_correct: 15, // 答对一题 (金币: 5)
  complete_question_wrong: 8, // 答错一题也有参与分 (金币: 2)
  complete_study_session: 30, // 完成一次学习 (金币: 10)
  daily_first_study: 25, // 当日首次学习 (金币: 8)
  
  // === 连续奖励 (鼓励持续学习) ===
  streak_bonus_3: 30, // 连续3天奖励 (金币: 10)
  streak_bonus_7: 80, // 连续7天奖励 (金币: 25) 
  streak_bonus_14: 150, // 连续14天奖励 (金币: 50)
  streak_bonus_30: 500, // 连续30天奖励 (金币: 150)
  
  // === 表现奖励 ===
  perfect_score: 80, // 满分奖励 (金币: 25)
  high_accuracy: 40, // 90%以上正确率 (金币: 12)
  fast_completion: 35, // 快速完成奖励 (金币: 10)
  help_request: 10, // 主动求助奖励 (金币: 3)
  improvement: 20, // 比昨天表现更好 (金币: 6)
  
  // === 时间段奖励 (鼓励良好作息) ===
  morning_study: 25, // 早上学习奖励 (金币: 8)
  evening_review: 20, // 晚上复习奖励 (金币: 6)
  weekend_study: 30, // 周末学习奖励 (金币: 10)
  
  // === 学科多样性奖励 ===
  subject_variety: 35, // 同一天学习多个学科 (金币: 10)
  subject_mastery: 60, // 某学科连续满分 (金币: 18)
  
  // === 社交奖励 ===
  invite_friend: 150, // 邀请好友奖励 (金币: 50)
  friend_study_together: 40, // 和好友一起学习奖励 (金币: 12)
  
  // === 特殊成就奖励 ===
  weekly_champion: 200, // 周度学习冠军 (金币: 60)
  monthly_star: 800, // 月度学习之星 (金币: 250),
  comeback_bonus: 50, // 重新开始学习奖励 (金币: 15)
  milestone_achievement: 100 // 里程碑成就 (金币: 30)
}

// 宠物类型配置
const PetConfig = {
  owl: {
    name: '智慧猫头鹰',
    description: '知识的守护者，越学习越聪明',
    baseStats: { intelligence: 8, loyalty: 6, energy: 5 },
    specialAbility: '数学题目获得额外20%经验',
    evolutions: [
      { level: 1, name: '小智', icon: '🦉' },
      { level: 5, name: '博学鸟', icon: '🦅' },
      { level: 10, name: '智慧之神', icon: '👑' }
    ]
  },
  cat: {
    name: '勤学小猫',
    description: '可爱的学习伙伴，喜欢陪伴主人学习',
    baseStats: { intelligence: 6, loyalty: 8, energy: 7 },
    specialAbility: '连续学习获得额外忠诚度',
    evolutions: [
      { level: 1, name: '小咪', icon: '🐱' },
      { level: 5, name: '学霸猫', icon: '😸' },
      { level: 10, name: '知识猫王', icon: '👑' }
    ]
  },
  dragon: {
    name: '学习小龙',
    description: '传说中的学习神兽，能激发无限潜能',
    baseStats: { intelligence: 9, loyalty: 7, energy: 9 },
    specialAbility: '所有题目获得额外15%经验',
    evolutions: [
      { level: 1, name: '小龙', icon: '🐲' },
      { level: 5, name: '知识龙', icon: '🐉' },
      { level: 10, name: '智慧龙王', icon: '👑' }
    ]
  }
}

// 商店物品配置 - 大幅扩展
const ShopConfig = {
  // === 功能道具类 ===
  hint_card: {
    id: 'hint_card',
    name: '提示卡',
    description: '获得一次免费提示机会',
    price: 25, // 调整价格：5题答对即可购买
    icon: '💡',
    type: 'consumable',
    effect: 'hint_boost',
    category: 'tools'
  },
  time_extender: {
    id: 'time_extender',
    name: '时间延长器',
    description: '为当前题目延长30秒',
    price: 15, // 调整价格：3题答对即可购买
    icon: '⏱️',
    type: 'consumable',
    effect: 'time_boost',
    category: 'tools'
  },
  double_exp: {
    id: 'double_exp',
    name: '经验药水',
    description: '下次学习获得双倍经验',
    price: 50, // 调整价格：10题答对即可购买
    icon: '🧪',
    type: 'consumable',
    effect: 'exp_boost',
    category: 'tools'
  },
  skip_card: {
    id: 'skip_card',
    name: '跳过卡',
    description: '跳过当前难题，不扣分',
    price: 35, // 调整价格：7题答对即可购买
    icon: '⏭️',
    type: 'consumable',
    effect: 'skip_question',
    category: 'tools'
  },
  focus_potion: {
    id: 'focus_potion',
    name: '专注药水',
    description: '30分钟内答题速度+50%',
    price: 60, // 调整价格：12题答对即可购买
    icon: '🎯',
    type: 'consumable',
    effect: 'focus_boost',
    category: 'tools'
  },
  lucky_charm: {
    id: 'lucky_charm',
    name: '幸运符',
    description: '下次答错不扣分，还有额外奖励',
    price: 40, // 新增物品
    icon: '🍀',
    type: 'consumable',
    effect: 'lucky_boost',
    category: 'tools'
  },
  
  // === 宠物相关 ===
  pet_food: {
    id: 'pet_food',
    name: '宠物零食',
    description: '增加宠物经验值',
    price: 80,
    icon: '🍖',
    type: 'consumable',
    effect: 'pet_exp_boost',
    category: 'pet'
  },
  pet_toy: {
    id: 'pet_toy',
    name: '宠物玩具',
    description: '提升宠物忠诚度',
    price: 150,
    icon: '🧸',
    type: 'consumable',
    effect: 'pet_loyalty_boost',
    category: 'pet'
  },
  pet_evolution_stone: {
    id: 'pet_evolution_stone',
    name: '进化石',
    description: '立即让宠物进化到下一阶段',
    price: 500,
    icon: '💎',
    type: 'consumable',
    effect: 'pet_evolve',
    category: 'pet'
  },
  
  // === 学科主题装饰品 ===
  math_calculator_avatar: {
    id: 'math_calculator_avatar',
    name: '数学计算器头像',
    description: '酷炫的数学主题头像',
    price: 120, // 调整价格：约一周学习可获得
    icon: '🔢',
    type: 'decoration',
    effect: 'avatar_math',
    category: 'avatar'
  },
  chinese_brush_avatar: {
    id: 'chinese_brush_avatar',
    name: '语文毛笔头像',
    description: '优雅的语文主题头像',
    price: 120, // 调整价格：约一周学习可获得
    icon: '🖌️',
    type: 'decoration',
    effect: 'avatar_chinese',
    category: 'avatar'
  },
  english_crown_avatar: {
    id: 'english_crown_avatar',
    name: '英语皇冠头像',
    description: '尊贵的英语主题头像',
    price: 120, // 调整价格：约一周学习可获得
    icon: '👑',
    type: 'decoration',
    effect: 'avatar_english',
    category: 'avatar'
  },
  science_flask_avatar: {
    id: 'science_flask_avatar',
    name: '科学烧瓶头像',
    description: '神秘的科学主题头像',
    price: 120, // 调整价格：约一周学习可获得
    icon: '⚗️',
    type: 'decoration',
    effect: 'avatar_science',
    category: 'avatar'
  },
  
  // === 界面主题 ===
  rainbow_theme: {
    id: 'rainbow_theme',
    name: '彩虹主题',
    description: '彩虹色彩的界面主题',
    price: 500,
    icon: '🌈',
    type: 'theme',
    effect: 'theme_rainbow',
    category: 'theme'
  },
  galaxy_theme: {
    id: 'galaxy_theme',
    name: '星河主题',
    description: '浩瀚星空的界面主题',
    price: 800,
    icon: '🌌',
    type: 'theme',
    effect: 'theme_galaxy',
    category: 'theme'
  },
  forest_theme: {
    id: 'forest_theme',
    name: '森林主题',
    description: '清新自然的森林主题',
    price: 600,
    icon: '🌲',
    type: 'theme',
    effect: 'theme_forest',
    category: 'theme'
  },
  ocean_theme: {
    id: 'ocean_theme',
    name: '海洋主题',
    description: '深邃蔚蓝的海洋主题',
    price: 700,
    icon: '🌊',
    type: 'theme',
    effect: 'theme_ocean',
    category: 'theme'
  },
  
  // === 特殊称号 ===
  math_genius_title: {
    id: 'math_genius_title',
    name: '数学天才称号',
    description: '显示"数学天才"称号',
    price: 1000,
    icon: '🧮',
    type: 'decoration',
    effect: 'title_math_genius',
    category: 'title'
  },
  reading_master_title: {
    id: 'reading_master_title',
    name: '阅读大师称号',
    description: '显示"阅读大师"称号',
    price: 1000,
    icon: '📚',
    type: 'decoration',
    effect: 'title_reading_master',
    category: 'title'
  },
  
  // === 限时/节日商品 ===
  spring_festival_decoration: {
    id: 'spring_festival_decoration',
    name: '春节装饰礼包',
    description: '新年限定装饰礼包',
    price: 300,
    icon: '🧧',
    type: 'decoration',
    effect: 'festival_spring',
    category: 'festival',
    limited: true,
    availableFrom: '2025-02-01',
    availableTo: '2025-02-29'
  },
  christmas_theme: {
    id: 'christmas_theme',
    name: '圣诞节主题',
    description: '温馨的圣诞节主题',
    price: 400,
    icon: '🎄',
    type: 'theme',
    effect: 'theme_christmas',
    category: 'festival',
    limited: true,
    availableFrom: '2024-12-01',
    availableTo: '2024-12-31'
  },
  
  // === 学习助手 ===
  study_buddy_robot: {
    id: 'study_buddy_robot',
    name: '学习助手机器人',
    description: '智能学习伙伴，提供学习建议',
    price: 1500,
    icon: '🤖',
    type: 'functional',
    effect: 'study_assistant',
    category: 'assistant'
  },
  progress_tracker: {
    id: 'progress_tracker',
    name: '进度追踪器',
    description: '详细的学习进度分析工具',
    price: 800,
    icon: '📊',
    type: 'functional',
    effect: 'progress_analysis',
    category: 'assistant'
  },
  
  // === 黄金装饰品 ===
  golden_badge: {
    id: 'golden_badge',
    name: '黄金徽章',
    description: '炫酷的装饰徽章',
    price: 300,
    icon: '🏅',
    type: 'decoration',
    effect: 'cosmetic',
    category: 'badge'
  },
  diamond_crown: {
    id: 'diamond_crown',
    name: '钻石皇冠',
    description: '最尊贵的装饰品',
    price: 2000,
    icon: '👑',
    type: 'decoration',
    effect: 'cosmetic_premium',
    category: 'badge'
  },
  
  // === 学习环境装饰 ===
  bookshelf_decoration: {
    id: 'bookshelf_decoration',
    name: '智慧书架',
    description: '装饰学习界面的书架',
    price: 400,
    icon: '📚',
    type: 'decoration',
    effect: 'environment_bookshelf',
    category: 'environment'
  },
  desk_lamp: {
    id: 'desk_lamp',
    name: '学习台灯',
    description: '温馨的学习氛围灯',
    price: 250,
    icon: '🛋️',
    type: 'decoration',
    effect: 'environment_lamp',
    category: 'environment'
  }
}

// 社交积分奖励配置
const SocialPointsConfig = {
  invite_friend_success: 200, // 成功邀请好友奖励
  friend_study_together: 50, // 与好友同时学习奖励
  help_friend: 30, // 帮助好友解题奖励
  receive_help: 15, // 接受好友帮助奖励
  class_competition_win: 100, // 班级竞赛获胜奖励
  study_group_achievement: 80 // 学习小组成就奖励
}

module.exports = {
  UserGameProfile,
  FriendshipModel,
  // ClassGroupModel, // 🚫 已移除班级功能，暂时注释
  LevelConfig,
  BadgeConfig,
  DailyTaskConfig,
  WeeklyTaskConfig,
  PointsConfig,
  SocialPointsConfig,
  PetConfig,
  ShopConfig
} 