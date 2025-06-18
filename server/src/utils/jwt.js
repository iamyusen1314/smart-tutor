/**
 * JWT工具函数
 * @description JWT令牌的生成、验证、刷新等功能
 */

const jwt = require('jsonwebtoken')
const config = require('../config/default.json')
const logger = require('./logger')
// const { createError } = require('../middlewares/errorHandler') // 避免循环依赖

// 创建简单的错误类
class JWTError extends Error {
  constructor(message, statusCode = 401) {
    super(message)
    this.statusCode = statusCode
    this.name = 'JWTError'
  }
}

// 创建错误的辅助函数
const createError = {
  authentication: (message, code) => new JWTError(message, 401),
  business: (message, code, status = 400) => new JWTError(message, status)
}

/**
 * 生成访问令牌
 * @param {Object} payload 令牌载荷
 * @param {Object} options 可选配置
 * @returns {string} JWT令牌
 */
const generateAccessToken = (payload, options = {}) => {
  const defaultOptions = {
    expiresIn: config.jwt.expiresIn,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience
  }
  
  const finalOptions = { ...defaultOptions, ...options }
  const finalPayload = { ...payload, type: 'access' }
  
  try {
    return jwt.sign(
      finalPayload,
      process.env.JWT_SECRET || config.jwt.secret,
      finalOptions
    )
  } catch (error) {
    logger.error('生成访问令牌失败:', error)
    throw createError.business('令牌生成失败', 'TOKEN_GENERATION_ERROR')
  }
}

/**
 * 生成刷新令牌
 * @param {Object} payload 令牌载荷
 * @param {Object} options 可选配置
 * @returns {string} JWT令牌
 */
const generateRefreshToken = (payload, options = {}) => {
  const defaultOptions = {
    expiresIn: config.jwt.refreshExpiresIn,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience
  }
  
  const finalOptions = { ...defaultOptions, ...options }
  const finalPayload = { ...payload, type: 'refresh' }
  
  try {
    return jwt.sign(
      finalPayload,
      process.env.JWT_SECRET || config.jwt.secret,
      finalOptions
    )
  } catch (error) {
    logger.error('生成刷新令牌失败:', error)
    throw createError.business('令牌生成失败', 'TOKEN_GENERATION_ERROR')
  }
}

/**
 * 生成令牌对（访问令牌 + 刷新令牌）
 * @param {Object} payload 令牌载荷
 * @returns {Object} 包含访问令牌和刷新令牌的对象
 */
const generateTokenPair = (payload) => {
  const accessToken = generateAccessToken(payload)
  const refreshToken = generateRefreshToken(payload)
  
  return {
    accessToken,
    refreshToken,
    expiresIn: config.jwt.expiresIn,
    tokenType: 'Bearer'
  }
}

/**
 * 验证令牌
 * @param {string} token JWT令牌
 * @param {Object} options 验证选项
 * @returns {Object} 解码后的载荷
 */
const verifyToken = (token, options = {}) => {
  const defaultOptions = {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience
  }
  
  const finalOptions = { ...defaultOptions, ...options }
  
  try {
    return jwt.verify(
      token,
      process.env.JWT_SECRET || config.jwt.secret,
      finalOptions
    )
  } catch (error) {
    logger.warn('令牌验证失败:', { 
      error: error.message, 
      token: token?.substring(0, 20) + '...' 
    })
    
    // 根据不同的错误类型抛出相应的错误
    switch (error.name) {
      case 'TokenExpiredError':
        throw createError.authentication('登录已过期，请重新登录', 'TOKEN_EXPIRED')
      case 'JsonWebTokenError':
        throw createError.authentication('无效的登录凭证', 'INVALID_TOKEN')
      case 'NotBeforeError':
        throw createError.authentication('令牌尚未生效', 'TOKEN_NOT_ACTIVE')
      default:
        throw createError.authentication('令牌验证失败', 'TOKEN_VERIFICATION_ERROR')
    }
  }
}

/**
 * 解码令牌（不验证签名）
 * @param {string} token JWT令牌
 * @returns {Object|null} 解码后的载荷
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token, { complete: true })
  } catch (error) {
    logger.warn('令牌解码失败:', error)
    return null
  }
}

/**
 * 验证访问令牌
 * @param {string} token 访问令牌
 * @returns {Object} 解码后的载荷
 */
const verifyAccessToken = (token) => {
  const payload = verifyToken(token)
  
  if (payload.type !== 'access') {
    throw createError.authentication('无效的访问令牌类型', 'INVALID_ACCESS_TOKEN')
  }
  
  return payload
}

/**
 * 验证刷新令牌
 * @param {string} token 刷新令牌
 * @returns {Object} 解码后的载荷
 */
const verifyRefreshToken = (token) => {
  const payload = verifyToken(token)
  
  if (payload.type !== 'refresh') {
    throw createError.authentication('无效的刷新令牌类型', 'INVALID_REFRESH_TOKEN')
  }
  
  return payload
}

/**
 * 从Authorization头部提取令牌
 * @param {string} authHeader Authorization头部值
 * @returns {string|null} 提取的令牌
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null
  }
  
  const parts = authHeader.split(' ')
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }
  
  return parts[1]
}

/**
 * 检查令牌是否即将过期
 * @param {string} token JWT令牌
 * @param {number} threshold 阈值（秒），默认5分钟
 * @returns {boolean} 是否即将过期
 */
const isTokenExpiringSoon = (token, threshold = 300) => {
  try {
    const decoded = decodeToken(token)
    if (!decoded || !decoded.payload.exp) {
      return true
    }
    
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = decoded.payload.exp
    
    return (expiresAt - now) < threshold
  } catch (error) {
    return true
  }
}

/**
 * 刷新访问令牌
 * @param {string} refreshToken 刷新令牌
 * @returns {Object} 新的令牌对
 */
const refreshAccessToken = (refreshToken) => {
  try {
    // 验证刷新令牌
    const payload = verifyRefreshToken(refreshToken)
    
    // 生成新的访问令牌
    const newAccessToken = generateAccessToken({
      id: payload.id,
      role: payload.role
    })
    
    return {
      accessToken: newAccessToken,
      refreshToken: refreshToken, // 刷新令牌保持不变
      expiresIn: config.jwt.expiresIn,
      tokenType: 'Bearer'
    }
  } catch (error) {
    logger.error('刷新访问令牌失败:', error)
    throw error
  }
}

/**
 * 生成临时令牌（用于特殊操作，如密码重置）
 * @param {Object} payload 令牌载荷
 * @param {string} expiresIn 过期时间
 * @returns {string} 临时令牌
 */
const generateTempToken = (payload, expiresIn = '15m') => {
  const tempPayload = {
    ...payload,
    type: 'temp',
    purpose: payload.purpose || 'general'
  }
  
  return generateAccessToken(tempPayload, { expiresIn })
}

/**
 * 验证临时令牌
 * @param {string} token 临时令牌
 * @param {string} expectedPurpose 期望的用途
 * @returns {Object} 解码后的载荷
 */
const verifyTempToken = (token, expectedPurpose = 'general') => {
  const payload = verifyToken(token)
  
  if (payload.type !== 'temp') {
    throw createError.authentication('无效的临时令牌类型', 'INVALID_TEMP_TOKEN')
  }
  
  if (payload.purpose !== expectedPurpose) {
    throw createError.authentication('令牌用途不匹配', 'TOKEN_PURPOSE_MISMATCH')
  }
  
  return payload
}

/**
 * 获取令牌剩余有效时间
 * @param {string} token JWT令牌
 * @returns {number} 剩余时间（秒）
 */
const getTokenRemainingTime = (token) => {
  try {
    const decoded = decodeToken(token)
    if (!decoded || !decoded.payload.exp) {
      return 0
    }
    
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = decoded.payload.exp
    
    return Math.max(0, expiresAt - now)
  } catch (error) {
    return 0
  }
}

/**
 * 创建令牌黑名单检查器（简单内存版本）
 * 生产环境建议使用Redis
 */
const tokenBlacklist = new Set()

/**
 * 将令牌加入黑名单
 * @param {string} token JWT令牌
 */
const blacklistToken = (token) => {
  tokenBlacklist.add(token)
  
  // 设置清理定时器，在令牌过期后清理
  const remainingTime = getTokenRemainingTime(token)
  if (remainingTime > 0) {
    setTimeout(() => {
      tokenBlacklist.delete(token)
    }, remainingTime * 1000)
  }
}

/**
 * 检查令牌是否在黑名单中
 * @param {string} token JWT令牌
 * @returns {boolean} 是否在黑名单中
 */
const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token)
}

/**
 * 生成用于用户登录的完整令牌信息
 * @param {Object} user 用户对象
 * @returns {Object} 完整的令牌信息
 */
const generateUserTokens = (user) => {
  const payload = {
    id: user.id,
    role: user.role,
    name: user.name
  }
  
  const tokens = generateTokenPair(payload)
  
  logger.userAction(user.id, 'login', {
    tokenGenerated: true,
    expiresIn: tokens.expiresIn
  })
  
  return {
    ...tokens,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl
    }
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  decodeToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  isTokenExpiringSoon,
  refreshAccessToken,
  generateTempToken,
  verifyTempToken,
  getTokenRemainingTime,
  blacklistToken,
  isTokenBlacklisted,
  generateUserTokens
} 