/**
 * 用户数据模型
 * @description 定义用户集合的数据结构和方法
 */

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('../config/default.json')

/**
 * 用户数据模式
 */
const userSchema = new mongoose.Schema({
  // 基本信息
  phone: {
    type: String,
    sparse: true,  // 允许为空，但不能重复
    match: [/^1[3-9]\d{9}$/, '手机号格式不正确']
  },
  
  // 微信相关信息
  wechatOpenId: {
    type: String,
    sparse: true,  // 允许为空，但不能重复
    index: true
  },
  
  wechatUnionId: {
    type: String,
    sparse: true
  },
  
  // 用户基本资料
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, '用户名不能超过50个字符']
  },
  
  avatarUrl: {
    type: String,
    default: ''
  },
  
  // 用户角色
  role: {
    type: String,
    enum: ['student', 'parent', 'admin'],
    default: 'student'
  },
  
  // 学生相关信息（如果是学生角色）
  studentInfo: {
    grade: {
      type: Number,
      min: 1,
      max: 6,
      validate: {
        validator: function(v) {
          return this.role !== 'student' || (v >= 1 && v <= 6)
        },
        message: '学生年级必须在1-6之间'
      }
    },
    school: {
      type: String,
      maxlength: [100, '学校名称不能超过100个字符']
    },
    className: {
      type: String,
      maxlength: [50, '班级名称不能超过50个字符']
    }
  },
  
  // 家长相关信息（如果是家长角色）
  parentInfo: {
    children: [{
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: [50, '孩子姓名不能超过50个字符']
      },
      grade: {
        type: Number,
        required: true,
        min: 1,
        max: 6
      },
      relationship: {
        type: String,
        enum: ['father', 'mother', 'guardian'],
        required: true
      }
    }]
  },
  
  // 账户状态
  status: {
    type: String,
    enum: ['active', 'inactive', 'banned'],
    default: 'active'
  },
  
  // 最后登录信息
  lastLoginAt: {
    type: Date
  },
  
  lastLoginIp: {
    type: String
  },
  
  // 用户设置
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    privacy: {
      shareProgress: { type: Boolean, default: false },
      allowDataCollection: { type: Boolean, default: true }
    },
    learning: {
      studyReminder: { type: Boolean, default: true },
      difficultyLevel: { 
        type: String, 
        enum: ['easy', 'normal', 'hard'], 
        default: 'normal' 
      }
    }
  },
  
  // 统计信息
  stats: {
    totalSessions: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    totalCorrect: { type: Number, default: 0 },
    averageAccuracy: { type: Number, default: 0 },
    studyDays: { type: Number, default: 0 },
    lastStudyDate: { type: Date }
  }
}, {
  timestamps: true,  // 自动添加 createdAt 和 updatedAt
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
 * 虚拟属性 - 用户ID
 */
userSchema.virtual('id').get(function() {
  return this._id.toHexString()
})

/**
 * 虚拟属性 - 用户完整信息
 */
userSchema.virtual('fullInfo').get(function() {
  const info = {
    id: this.id,
    name: this.name,
    avatarUrl: this.avatarUrl,
    role: this.role,
    status: this.status
  }
  
  if (this.role === 'student') {
    info.studentInfo = this.studentInfo
  } else if (this.role === 'parent') {
    info.parentInfo = this.parentInfo
  }
  
  return info
})

/**
 * 索引定义
 */
userSchema.index({ phone: 1 }, { unique: true, sparse: true })
userSchema.index({ wechatOpenId: 1 }, { unique: true, sparse: true })
userSchema.index({ createdAt: 1 })
userSchema.index({ 'stats.lastStudyDate': 1 })

/**
 * 中间件 - 保存前验证
 */
userSchema.pre('save', function(next) {
  // 验证至少有一种登录方式
  if (!this.phone && !this.wechatOpenId) {
    next(new Error('用户必须提供手机号或微信OpenID'))
    return
  }
  
  // 学生角色必须有年级信息
  if (this.role === 'student' && !this.studentInfo?.grade) {
    next(new Error('学生用户必须提供年级信息'))
    return
  }
  
  next()
})

/**
 * 实例方法 - 生成JWT令牌
 * @param {string} type - 令牌类型 ('access' | 'refresh')
 * @returns {string} JWT令牌
 */
userSchema.methods.generateToken = function(type = 'access') {
  const payload = {
    id: this.id,
    role: this.role,
    type
  }
  
  const options = {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience
  }
  
  if (type === 'access') {
    options.expiresIn = config.jwt.expiresIn
  } else if (type === 'refresh') {
    options.expiresIn = config.jwt.refreshExpiresIn
  }
  
  return jwt.sign(payload, process.env.JWT_SECRET || config.jwt.secret, options)
}

/**
 * 实例方法 - 验证密码（如果有的话）
 * @param {string} password - 待验证的密码
 * @returns {Promise<boolean>} 验证结果
 */
userSchema.methods.validatePassword = async function(password) {
  if (!this.password) return false
  return bcrypt.compare(password, this.password)
}

/**
 * 实例方法 - 更新登录信息
 * @param {string} ip - 登录IP地址
 */
userSchema.methods.updateLoginInfo = function(ip) {
  this.lastLoginAt = new Date()
  this.lastLoginIp = ip
  return this.save()
}

/**
 * 实例方法 - 更新学习统计
 * @param {Object} data - 学习数据
 */
userSchema.methods.updateStudyStats = function(data) {
  if (!this.stats) {
    this.stats = {
      totalSessions: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      averageAccuracy: 0,
      studyDays: 0
    }
  }
  
  const today = new Date().toDateString()
  const lastStudyDate = this.stats.lastStudyDate?.toDateString()
  
  // 如果是新的学习日，增加学习天数
  if (lastStudyDate !== today) {
    this.stats.studyDays += 1
    this.stats.lastStudyDate = new Date()
  }
  
  // 更新统计数据
  if (data.sessionCompleted) {
    this.stats.totalSessions += 1
  }
  
  if (data.questions) {
    this.stats.totalQuestions += data.questions
  }
  
  if (data.correct) {
    this.stats.totalCorrect += data.correct
  }
  
  // 重新计算准确率
  if (this.stats.totalQuestions > 0) {
    this.stats.averageAccuracy = Math.round(
      (this.stats.totalCorrect / this.stats.totalQuestions) * 100
    )
  }
  
  return this.save()
}

/**
 * 静态方法 - 根据手机号查找用户
 * @param {string} phone - 手机号
 * @returns {Promise<User|null>} 用户对象
 */
userSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone, status: 'active' })
}

/**
 * 静态方法 - 根据微信OpenID查找用户
 * @param {string} openId - 微信OpenID
 * @returns {Promise<User|null>} 用户对象
 */
userSchema.statics.findByWechatOpenId = function(openId) {
  return this.findOne({ wechatOpenId: openId, status: 'active' })
}

/**
 * 静态方法 - 创建学生用户
 * @param {Object} userData - 用户数据
 * @returns {Promise<User>} 创建的用户对象
 */
userSchema.statics.createStudent = function(userData) {
  return this.create({
    ...userData,
    role: 'student',
    studentInfo: {
      grade: userData.grade,
      school: userData.school,
      className: userData.className
    }
  })
}

/**
 * 静态方法 - 创建家长用户
 * @param {Object} userData - 用户数据
 * @returns {Promise<User>} 创建的用户对象
 */
userSchema.statics.createParent = function(userData) {
  return this.create({
    ...userData,
    role: 'parent',
    parentInfo: {
      children: userData.children || []
    }
  })
}

/**
 * 静态方法 - 获取用户统计信息
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 统计信息
 */
userSchema.statics.getUserStats = async function(userId) {
  const user = await this.findById(userId)
  if (!user) throw new Error('用户不存在')
  
  return {
    basic: {
      totalSessions: user.stats.totalSessions,
      totalQuestions: user.stats.totalQuestions,
      totalCorrect: user.stats.totalCorrect,
      averageAccuracy: user.stats.averageAccuracy,
      studyDays: user.stats.studyDays
    },
    recent: {
      lastStudyDate: user.stats.lastStudyDate,
      lastLoginAt: user.lastLoginAt
    }
  }
}

module.exports = mongoose.model('User', userSchema) 