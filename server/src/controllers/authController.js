/**
 * 用户认证控制器
 * @description 处理用户登录、注册、短信验证等认证相关功能
 */

// const User = require('../models/User') // 移动到需要使用的函数内部
const { generateUserTokens, refreshAccessToken, blacklistToken } = require('../utils/jwt')
const { AppError, asyncHandler } = require('../middlewares/errorHandler')
const logger = require('../utils/logger')
const config = require('../config/default.json')
const { isConnected } = require('../config/database')

// 创建错误的辅助函数
const createError = {
  validation: (message, field, code) => new AppError(message, 400),
  business: (message, code) => new AppError(message, 400),
  thirdParty: (message, service, code) => new AppError(message, 502)
}

// 短信验证码存储（生产环境建议使用Redis）
const smsCodeStore = new Map()

/**
 * 生成短信验证码
 * @returns {string} 6位数字验证码
 */
const generateSmsCode = () => {
  return Math.random().toString().slice(2, 8).padEnd(6, '0')
}

/**
 * 模拟发送短信验证码
 * @param {string} phone 手机号
 * @param {string} code 验证码
 * @returns {Promise<boolean>} 发送结果
 */
const sendSmsCode = async (phone, code) => {
  // 这里应该调用真实的短信服务API
  // 例如阿里云、腾讯云等短信服务
  try {
    logger.info(`模拟发送短信验证码: ${phone} -> ${code}`)
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 开发环境直接返回成功
    if (process.env.NODE_ENV === 'development') {
      return true
    }
    
    // 生产环境需要集成真实的短信服务
    // const result = await smsService.send(phone, code)
    // return result.success
    
    return true
  } catch (error) {
    logger.error('发送短信验证码失败:', error)
    return false
  }
}

/**
 * 验证短信验证码
 * @param {string} phone 手机号
 * @param {string} code 验证码
 * @returns {boolean} 验证结果
 */
const verifySmsCode = (phone, code) => {
  const stored = smsCodeStore.get(phone)
  
  if (!stored) {
    return false
  }
  
  const { code: storedCode, expiresAt } = stored
  
  // 检查是否过期
  if (Date.now() > expiresAt) {
    smsCodeStore.delete(phone)
    return false
  }
  
  // 验证码匹配
  if (storedCode === code) {
    smsCodeStore.delete(phone)
    return true
  }
  
  return false
}

/**
 * 模拟微信登录验证
 * @param {string} code 微信登录凭证
 * @returns {Promise<Object>} 微信用户信息
 */
const verifyWechatLogin = async (code) => {
  try {
    // 这里应该调用微信API获取用户信息
    // 1. 通过code获取access_token和openid
    // 2. 通过access_token获取用户信息
    
    logger.info(`模拟验证微信登录凭证: ${code}`)
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 开发环境返回模拟数据
    if (process.env.NODE_ENV === 'development') {
      return {
        openid: `mock_openid_${Date.now()}`,
        unionid: `mock_unionid_${Date.now()}`,
        nickname: '微信用户',
        headimgurl: 'https://via.placeholder.com/100',
        sex: 1,
        province: '广东',
        city: '深圳'
      }
    }
    
    // 生产环境需要集成真实的微信API
    // const wechatApi = require('../services/wechatService')
    // return await wechatApi.getUserInfo(code)
    
    throw new Error('微信登录暂不可用')
  } catch (error) {
    logger.error('微信登录验证失败:', error)
    throw createError.thirdParty('微信登录失败', 'wechat', 'WECHAT_LOGIN_ERROR')
  }
}

/**
 * 发送短信验证码
 */
const sendSms = asyncHandler(async (req, res) => {
  const { phone } = req.body
  
  // 验证手机号格式
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    throw createError.validation('手机号格式不正确', 'phone', 'INVALID_PHONE')
  }
  
  // 检查发送频率限制
  const lastSent = smsCodeStore.get(phone)
  if (lastSent && (Date.now() - lastSent.sentAt) < config.business.smsCode.resendInterval * 1000) {
    throw createError.business('验证码发送过于频繁，请稍后再试', 'SMS_SEND_TOO_FREQUENT')
  }
  
  // 生成验证码
  const code = generateSmsCode()
  const expiresAt = Date.now() + config.business.smsCode.expiresIn * 1000
  
  // 发送短信
  const sent = await sendSmsCode(phone, code)
  
  if (!sent) {
    throw createError.thirdParty('短信发送失败，请稍后重试', 'sms', 'SMS_SEND_FAILED')
  }
  
  // 存储验证码
  smsCodeStore.set(phone, {
    code,
    expiresAt,
    sentAt: Date.now()
  })
  
  logger.info(`短信验证码已发送: ${phone}`)
  
  res.json({
    success: true,
    message: '验证码已发送',
    expiresIn: config.business.smsCode.expiresIn
  })
})

/**
 * 手机号+验证码登录
 */
const login = asyncHandler(async (req, res) => {
  const { phone, code } = req.body
  
  // 验证输入
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    throw createError.validation('手机号格式不正确', 'phone', 'INVALID_PHONE')
  }
  
  if (!code || !/^\d{4,6}$/.test(code)) {
    throw createError.validation('验证码格式不正确', 'code', 'INVALID_SMS_CODE')
  }
  
  // 开发模式：提供模拟登录
  if (!isConnected()) {
    logger.info(`开发模式登录: ${phone}`)
    
    // 生成模拟用户令牌
    const mockUser = {
      id: `mock_user_${phone.slice(-4)}`,
      phone,
      name: `测试用户${phone.slice(-4)}`,
      role: 'student'
    }
    
    const tokens = generateUserTokens(mockUser)
    
    res.json({
      success: true,
      message: '登录成功（开发模式）',
      data: tokens
    })
    return
  }
  
  // 验证短信验证码
  if (!verifySmsCode(phone, code)) {
    throw createError.validation('验证码错误或已过期', 'code', 'INVALID_OR_EXPIRED_CODE')
  }
  
  // 查找或创建用户
  const User = require('../models/User')
  let user = await User.findByPhone(phone)
  
  if (!user) {
    // 创建新用户
    user = await User.create({
      phone,
      name: `用户${phone.slice(-4)}`,
      role: 'student'  // 默认为学生角色
    })
    
    logger.info(`新用户注册: ${user.id}`)
  }
  
  // 更新登录信息
  await user.updateLoginInfo(req.ip)
  
  // 生成令牌
  const tokens = generateUserTokens(user)
  
  logger.userAction(user.id, 'login_with_phone', {
    phone,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })
  
  res.json({
    success: true,
    message: '登录成功',
    data: tokens
  })
})

/**
 * 微信一键登录
 */
const wechatLogin = asyncHandler(async (req, res) => {
  const { code, userInfo, encryptedData, iv } = req.body
  
  if (!code) {
    throw createError.validation('缺少微信登录凭证', 'code', 'MISSING_WECHAT_CODE')
  }
  
  // 开发模式：提供模拟微信登录
  if (!isConnected()) {
    logger.info(`开发模式微信登录: ${code}`)
    
    // 生成模拟用户令牌
    const mockUser = {
      id: `mock_wechat_user_${Date.now()}`,
      wechatOpenId: `mock_openid_${code}`,
      name: '微信测试用户',
      avatarUrl: 'https://via.placeholder.com/100',
      role: 'student'
    }
    
    const tokens = generateUserTokens(mockUser)
    
    res.json({
      success: true,
      message: '微信登录成功（开发模式）',
      data: tokens
    })
    return
  }
  
  // 验证微信登录
  const wechatUserInfo = await verifyWechatLogin(code)
  
  // 查找或创建用户
  const User = require('../models/User')
  let user = await User.findByWechatOpenId(wechatUserInfo.openid)
  
  if (!user) {
    // 创建新用户
    const userData = {
      wechatOpenId: wechatUserInfo.openid,
      wechatUnionId: wechatUserInfo.unionid,
      name: wechatUserInfo.nickname || '微信用户',
      avatarUrl: wechatUserInfo.headimgurl || '',
      role: 'student'  // 默认为学生角色
    }
    
    user = await User.create(userData)
    
    logger.info(`微信新用户注册: ${user.id}`)
  } else {
    // 更新用户信息
    if (wechatUserInfo.nickname) {
      user.name = wechatUserInfo.nickname
    }
    if (wechatUserInfo.headimgurl) {
      user.avatarUrl = wechatUserInfo.headimgurl
    }
    if (wechatUserInfo.unionid) {
      user.wechatUnionId = wechatUserInfo.unionid
    }
    
    await user.save()
  }
  
  // 更新登录信息
  await user.updateLoginInfo(req.ip)
  
  // 生成令牌
  const tokens = generateUserTokens(user)
  
  logger.userAction(user.id, 'login_with_wechat', {
    openId: wechatUserInfo.openid,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })
  
  res.json({
    success: true,
    message: '微信登录成功',
    data: tokens
  })
})

/**
 * 刷新访问令牌
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body
  
  try {
    // 刷新令牌
    const newTokens = refreshAccessToken(token)
    
    logger.info('访问令牌已刷新')
    
    res.json({
      success: true,
      message: '令牌刷新成功',
      data: newTokens
    })
  } catch (error) {
    logger.warn('令牌刷新失败:', error.message)
    throw error
  }
})

/**
 * 退出登录
 */
const logout = asyncHandler(async (req, res) => {
  const { token } = req
  
  if (token) {
    // 将令牌加入黑名单
    blacklistToken(token)
  }
  
  logger.userAction(req.user.id, 'logout', {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })
  
  res.json({
    success: true,
    message: '退出登录成功'
  })
})

/**
 * 获取当前用户信息
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = req.user
  
  res.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      studentInfo: user.studentInfo,
      parentInfo: user.parentInfo,
      settings: user.settings,
      stats: user.stats,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    }
  })
})

/**
 * 更新用户基本信息
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, avatarUrl, studentInfo, parentInfo, settings } = req.body
  const user = req.user
  
  // 更新基本信息
  if (name) {
    user.name = name
  }
  
  if (avatarUrl) {
    user.avatarUrl = avatarUrl
  }
  
  // 更新学生信息
  if (studentInfo && user.role === 'student') {
    user.studentInfo = { ...user.studentInfo, ...studentInfo }
  }
  
  // 更新家长信息
  if (parentInfo && user.role === 'parent') {
    user.parentInfo = { ...user.parentInfo, ...parentInfo }
  }
  
  // 更新设置
  if (settings) {
    user.settings = { ...user.settings, ...settings }
  }
  
  await user.save()
  
  logger.userAction(user.id, 'update_profile', {
    updates: Object.keys(req.body),
    ip: req.ip
  })
  
  res.json({
    success: true,
    message: '用户信息更新成功',
    data: {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      studentInfo: user.studentInfo,
      parentInfo: user.parentInfo,
      settings: user.settings
    }
  })
})

/**
 * 绑定手机号
 */
const bindPhone = asyncHandler(async (req, res) => {
  const { phone, code } = req.body
  const user = req.user
  
  // 验证输入
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    throw createError.validation('手机号格式不正确', 'phone', 'INVALID_PHONE')
  }
  
  if (!code || !/^\d{4,6}$/.test(code)) {
    throw createError.validation('验证码格式不正确', 'code', 'INVALID_SMS_CODE')
  }
  
  // 验证短信验证码
  if (!verifySmsCode(phone, code)) {
    throw createError.validation('验证码错误或已过期', 'code', 'INVALID_OR_EXPIRED_CODE')
  }
  
  // 检查手机号是否已被其他用户使用
  const User = require('../models/User')
  const existingUser = await User.findByPhone(phone)
  if (existingUser && existingUser.id !== user.id) {
    throw createError.business('该手机号已被其他用户使用', 'PHONE_ALREADY_EXISTS')
  }
  
  // 绑定手机号
  user.phone = phone
  await user.save()
  
  logger.userAction(user.id, 'bind_phone', {
    phone,
    ip: req.ip
  })
  
  res.json({
    success: true,
    message: '手机号绑定成功'
  })
})

/**
 * 检查用户名是否可用
 */
const checkUsername = asyncHandler(async (req, res) => {
  const { name } = req.query
  
  if (!name) {
    throw createError.validation('用户名不能为空', 'name', 'MISSING_USERNAME')
  }
  
  if (name.length < 2 || name.length > 20) {
    throw createError.validation('用户名长度应在2-20个字符之间', 'name', 'INVALID_USERNAME_LENGTH')
  }
  
  // 检查是否包含敏感词（简单示例）
  const sensitiveWords = ['admin', 'test', '管理员', '系统']
  const hasSensitiveWord = sensitiveWords.some(word => name.toLowerCase().includes(word))
  
  if (hasSensitiveWord) {
    res.json({
      success: true,
      available: false,
      message: '用户名包含敏感词，请重新选择'
    })
    return
  }
  
  res.json({
    success: true,
    available: true,
    message: '用户名可以使用'
  })
})

module.exports = {
  sendSms,
  login,
  wechatLogin,
  refreshToken,
  logout,
  getCurrentUser,
  updateProfile,
  bindPhone,
  checkUsername
} 