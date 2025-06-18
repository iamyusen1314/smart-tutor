/**
 * 认证中间件
 * @description 用户身份验证和权限检查中间件
 */

// const User = require('../models/User') // 移到函数内部，避免循环依赖
const { verifyAccessToken, extractTokenFromHeader, isTokenBlacklisted } = require('../utils/jwt')
const { AppError } = require('./errorHandler')
const { isConnected } = require('../config/database')
const logger = require('../utils/logger')

// 创建错误的辅助函数
const createError = {
  authentication: (message, code) => new AppError(message, 401),
  authorization: (message, code) => new AppError(message, 403),
  validation: (message, field, code) => new AppError(message, 400),
  business: (message, code, status = 400) => new AppError(message, status)
}

/**
 * 基础认证中间件
 * 验证JWT令牌并加载用户信息
 * @param {Object} req Express请求对象
 * @param {Object} res Express响应对象
 * @param {Function} next 下一个中间件
 */
const authenticate = async (req, res, next) => {
  try {
    // 提取Authorization头部
    const authHeader = req.headers.authorization
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      throw createError.authentication('缺少认证令牌', 'MISSING_TOKEN')
    }
    
    // 检查令牌是否在黑名单中
    if (isTokenBlacklisted(token)) {
      throw createError.authentication('令牌已失效', 'TOKEN_BLACKLISTED')
    }
    
    // 验证令牌
    const payload = verifyAccessToken(token)
    
    // 开发模式：如果没有数据库连接，使用令牌中的用户信息
    if (!isConnected()) {
      const user = {
        id: payload.id,
        role: payload.role || 'student',
        status: 'active'
      }
      
      req.user = user
      req.token = token
      req.tokenPayload = payload
      
      logger.info(`开发模式认证: ${user.id}`)
      return next()
    }
    
    // 从数据库加载完整的用户信息
    const User = require('../models/User')
    const user = await User.findById(payload.id)
    
    if (!user) {
      throw createError.authentication('用户不存在', 'USER_NOT_FOUND')
    }
    
    if (user.status !== 'active') {
      throw createError.authentication('用户账户已被禁用', 'USER_INACTIVE')
    }
    
    // 将用户信息和令牌信息添加到请求对象
    req.user = user
    req.token = token
    req.tokenPayload = payload
    
    // 记录用户操作日志
    logger.userAction(user.id, 'api_access', {
      path: req.originalUrl,
      method: req.method,
      ip: req.ip
    })
    
    next()
  } catch (error) {
    // 记录认证失败日志
    logger.security('authentication_failed', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.originalUrl,
      error: error.message
    })
    
    next(error)
  }
}

/**
 * 可选认证中间件
 * 如果有令牌则验证，没有令牌也允许通过
 * @param {Object} req Express请求对象
 * @param {Object} res Express响应对象
 * @param {Function} next 下一个中间件
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      // 没有令牌，直接继续
      req.user = null
      req.token = null
      req.tokenPayload = null
      return next()
    }
    
    // 有令牌，按正常流程验证
    await authenticate(req, res, next)
  } catch (error) {
    // 令牌验证失败，但仍允许继续（作为未认证用户）
    req.user = null
    req.token = null
    req.tokenPayload = null
    next()
  }
}

/**
 * 角色检查中间件工厂
 * @param {...string} allowedRoles 允许的角色列表
 * @returns {Function} 中间件函数
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw createError.authentication('请先登录', 'AUTHENTICATION_REQUIRED')
      }
      
      if (!allowedRoles.includes(req.user.role)) {
        logger.security('unauthorized_access_attempt', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          path: req.originalUrl,
          ip: req.ip
        })
        
        throw createError.authorization('权限不足', 'INSUFFICIENT_PERMISSIONS')
      }
      
      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * 学生角色检查中间件
 */
const requireStudent = requireRole('student')

/**
 * 家长角色检查中间件
 */
const requireParent = requireRole('parent')

/**
 * 管理员角色检查中间件
 */
const requireAdmin = requireRole('admin')

/**
 * 学生或家长角色检查中间件
 */
const requireStudentOrParent = requireRole('student', 'parent')

/**
 * 任何非管理员角色检查中间件
 */
const requireUser = requireRole('student', 'parent')

/**
 * 资源所有者检查中间件
 * 确保用户只能访问自己的资源
 * @param {string} userIdField 请求参数中用户ID的字段名，默认为'userId'
 * @returns {Function} 中间件函数
 */
const requireOwnership = (userIdField = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw createError.authentication('请先登录', 'AUTHENTICATION_REQUIRED')
      }
      
      // 管理员可以访问所有资源
      if (req.user.role === 'admin') {
        return next()
      }
      
      // 获取资源的用户ID
      const resourceUserId = req.params[userIdField] || req.body[userIdField] || req.query[userIdField]
      
      if (!resourceUserId) {
        throw createError.validation('缺少用户ID参数', userIdField, 'MISSING_USER_ID')
      }
      
      // 检查是否为资源所有者
      if (resourceUserId !== req.user.id) {
        logger.security('unauthorized_resource_access', {
          userId: req.user.id,
          requestedUserId: resourceUserId,
          path: req.originalUrl,
          ip: req.ip
        })
        
        throw createError.authorization('只能访问自己的资源', 'RESOURCE_ACCESS_DENIED')
      }
      
      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * 用户状态检查中间件
 * @param {...string} allowedStatuses 允许的用户状态列表
 * @returns {Function} 中间件函数
 */
const requireUserStatus = (...allowedStatuses) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw createError.authentication('请先登录', 'AUTHENTICATION_REQUIRED')
      }
      
      if (!allowedStatuses.includes(req.user.status)) {
        logger.security('blocked_user_access', {
          userId: req.user.id,
          userStatus: req.user.status,
          allowedStatuses,
          path: req.originalUrl,
          ip: req.ip
        })
        
        throw createError.authorization('用户状态不允许此操作', 'USER_STATUS_RESTRICTED')
      }
      
      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * 活跃用户检查中间件
 */
const requireActiveUser = requireUserStatus('active')

/**
 * API限流中间件（基于用户）
 * @param {number} maxRequests 最大请求数
 * @param {number} windowMs 时间窗口（毫秒）
 * @returns {Function} 中间件函数
 */
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map()
  
  return (req, res, next) => {
    try {
      if (!req.user) {
        return next()
      }
      
      const userId = req.user.id
      const now = Date.now()
      const windowStart = now - windowMs
      
      // 获取用户的请求记录
      if (!userRequests.has(userId)) {
        userRequests.set(userId, [])
      }
      
      const requests = userRequests.get(userId)
      
      // 清理过期的请求记录
      const validRequests = requests.filter(timestamp => timestamp > windowStart)
      
      // 检查是否超过限制
      if (validRequests.length >= maxRequests) {
        logger.security('user_rate_limit_exceeded', {
          userId,
          requestCount: validRequests.length,
          maxRequests,
          windowMs,
          ip: req.ip
        })
        
        throw createError.business('请求过于频繁，请稍后再试', 'RATE_LIMIT_EXCEEDED', 429)
      }
      
      // 记录当前请求
      validRequests.push(now)
      userRequests.set(userId, validRequests)
      
      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * 验证用户完整性中间件
 * 确保用户信息完整（特别是学生用户的年级信息）
 */
const requireCompleteProfile = (req, res, next) => {
  try {
    if (!req.user) {
      throw createError.authentication('请先登录', 'AUTHENTICATION_REQUIRED')
    }
    
    // 检查学生用户是否有完整的学习信息
    if (req.user.role === 'student') {
      if (!req.user.studentInfo || !req.user.studentInfo.grade) {
        throw createError.validation('请先完善学生信息', 'studentInfo', 'INCOMPLETE_STUDENT_PROFILE')
      }
    }
    
    // 检查家长用户是否有孩子信息
    if (req.user.role === 'parent') {
      if (!req.user.parentInfo || !req.user.parentInfo.children || req.user.parentInfo.children.length === 0) {
        throw createError.validation('请先添加孩子信息', 'parentInfo', 'INCOMPLETE_PARENT_PROFILE')
      }
    }
    
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * 刷新令牌验证中间件
 * 专门用于令牌刷新接口
 */
const validateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    
    if (!refreshToken) {
      throw createError.validation('缺少刷新令牌', 'refreshToken', 'MISSING_REFRESH_TOKEN')
    }
    
    // 检查令牌是否在黑名单中
    if (isTokenBlacklisted(refreshToken)) {
      throw createError.authentication('刷新令牌已失效', 'REFRESH_TOKEN_BLACKLISTED')
    }
    
    req.refreshToken = refreshToken
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireRole,
  requireStudent,
  requireParent,
  requireAdmin,
  requireStudentOrParent,
  requireUser,
  requireOwnership,
  requireUserStatus,
  requireActiveUser,
  userRateLimit,
  requireCompleteProfile,
  validateRefreshToken
} 