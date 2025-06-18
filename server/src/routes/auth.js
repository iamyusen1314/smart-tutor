/**
 * 用户认证路由
 * @description 定义用户认证相关的API端点
 */

console.log('🔍 开始加载auth路由...')

const express = require('express')
console.log('✅ express加载完成')
const { body, query } = require('express-validator')
console.log('✅ express-validator加载完成')
const authController = require('../controllers/authController')
console.log('✅ authController加载完成')
const { 
  authenticate, 
  requireUser, 
  validateRefreshToken,
  userRateLimit
} = require('../middlewares/auth')
console.log('✅ auth中间件加载完成')
const { asyncHandler } = require('../middlewares/errorHandler')
console.log('✅ errorHandler加载完成')

const router = express.Router()

/**
 * 输入验证中间件
 */

// 手机号验证
const validatePhone = body('phone')
  .matches(/^1[3-9]\d{9}$/)
  .withMessage('手机号格式不正确')

// 短信验证码验证
const validateSmsCode = body('code')
  .matches(/^\d{4,6}$/)
  .withMessage('验证码格式不正确')

// 微信登录验证
const validateWechatLogin = [
  body('code')
    .notEmpty()
    .withMessage('微信登录凭证不能为空')
]

// 用户信息更新验证
const validateProfileUpdate = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('用户名长度应在2-50个字符之间'),
  body('avatarUrl')
    .optional()
    .isURL()
    .withMessage('头像URL格式不正确'),
  body('studentInfo.grade')
    .optional()
    .isInt({ min: 1, max: 6 })
    .withMessage('年级应在1-6之间'),
  body('studentInfo.school')
    .optional()
    .isLength({ max: 100 })
    .withMessage('学校名称不能超过100个字符'),
  body('studentInfo.className')
    .optional()
    .isLength({ max: 50 })
    .withMessage('班级名称不能超过50个字符')
]

// 手机号绑定验证
const validatePhoneBind = [
  validatePhone,
  validateSmsCode
]

// 用户名检查验证
const validateUsernameCheck = query('name')
  .notEmpty()
  .isLength({ min: 2, max: 20 })
  .withMessage('用户名长度应在2-20个字符之间')

/**
 * 验证结果处理中间件
 */
const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require('express-validator')
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }))
    
    return res.status(400).json({
      success: false,
      error: '请求参数验证失败',
      code: 'VALIDATION_ERROR',
      details: errorMessages
    })
  }
  
  next()
}

/**
 * 公开路由（不需要认证）
 */

/**
 * @route   POST /api/auth/send-sms
 * @desc    发送短信验证码
 * @access  Public
 */
router.post('/send-sms', 
  validatePhone,
  handleValidationErrors,
  userRateLimit(5, 15 * 60 * 1000), // 15分钟内最多发送5次
  authController.sendSms
)

/**
 * @route   POST /api/auth/login
 * @desc    手机号+验证码登录
 * @access  Public
 */
router.post('/login',
  validatePhone,
  validateSmsCode,
  handleValidationErrors,
  userRateLimit(10, 15 * 60 * 1000), // 15分钟内最多尝试10次登录
  authController.login
)

/**
 * @route   POST /api/auth/wechat-login
 * @desc    微信一键登录
 * @access  Public
 */
router.post('/wechat-login',
  validateWechatLogin,
  handleValidationErrors,
  userRateLimit(10, 15 * 60 * 1000), // 15分钟内最多尝试10次登录
  authController.wechatLogin
)

/**
 * @route   POST /api/auth/refresh-token
 * @desc    刷新访问令牌
 * @access  Public
 */
router.post('/refresh-token',
  validateRefreshToken,
  userRateLimit(20, 15 * 60 * 1000), // 15分钟内最多刷新20次
  authController.refreshToken
)

/**
 * @route   GET /api/auth/check-username
 * @desc    检查用户名是否可用
 * @access  Public
 */
router.get('/check-username',
  validateUsernameCheck,
  handleValidationErrors,
  authController.checkUsername
)

/**
 * 需要认证的路由
 */

/**
 * @route   POST /api/auth/logout
 * @desc    退出登录
 * @access  Private
 */
router.post('/logout',
  authenticate,
  authController.logout
)

/**
 * @route   GET /api/auth/me
 * @desc    获取当前用户信息
 * @access  Private
 */
router.get('/me',
  authenticate,
  requireUser,
  authController.getCurrentUser
)

/**
 * @route   PUT /api/auth/profile
 * @desc    更新用户基本信息
 * @access  Private
 */
router.put('/profile',
  authenticate,
  requireUser,
  validateProfileUpdate,
  handleValidationErrors,
  authController.updateProfile
)

/**
 * @route   POST /api/auth/bind-phone
 * @desc    绑定手机号
 * @access  Private
 */
router.post('/bind-phone',
  authenticate,
  requireUser,
  validatePhoneBind,
  handleValidationErrors,
  authController.bindPhone
)

/**
 * 开发环境专用路由（仅用于测试）
 */
if (process.env.NODE_ENV === 'development') {
  /**
   * @route   POST /api/auth/dev/create-test-user
   * @desc    创建测试用户（仅开发环境）
   * @access  Public
   */
  router.post('/dev/create-test-user', asyncHandler(async (req, res) => {
    const { isConnected } = require('../config/database')
    const { generateUserTokens } = require('../utils/jwt')
    
    // 检查数据库连接
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: '数据库未连接，开发功能不可用'
      })
    }
    
    const User = require('../models/User')
    
    const { role = 'student', grade = 3 } = req.body
    
    // 创建测试用户
    const userData = {
      phone: `1380000${Date.now().toString().slice(-4)}`,
      name: `测试${role === 'student' ? '学生' : '家长'}`,
      role
    }
    
    if (role === 'student') {
      userData.studentInfo = { grade }
    } else if (role === 'parent') {
      userData.parentInfo = {
        children: [{
          name: '测试孩子',
          grade: grade,
          relationship: 'father'
        }]
      }
    }
    
    const user = await User.create(userData)
    const tokens = generateUserTokens(user)
    
    res.json({
      success: true,
      message: '测试用户创建成功',
      data: tokens
    })
  }))
  
  /**
   * @route   POST /api/auth/dev/quick-login
   * @desc    快速登录（仅开发环境）
   * @access  Public
   */
  router.post('/dev/quick-login', asyncHandler(async (req, res) => {
    const { isConnected } = require('../config/database')
    const { generateUserTokens } = require('../utils/jwt')
    
    // 检查数据库连接
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        message: '数据库未连接，开发功能不可用'
      })
    }
    
    const User = require('../models/User')
    
    const { phone = '13800000001' } = req.body
    
    let user = await User.findByPhone(phone)
    
    if (!user) {
      user = await User.create({
        phone,
        name: '开发测试用户',
        role: 'student',
        studentInfo: { grade: 3 }
      })
    }
    
    await user.updateLoginInfo(req.ip)
    const tokens = generateUserTokens(user)
    
    res.json({
      success: true,
      message: '快速登录成功',
      data: tokens
    })
  }))
}

/**
 * 错误处理
 */
router.use((error, req, res, next) => {
  // 如果是验证错误，返回400状态码
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: 'VALIDATION_ERROR'
    })
  }
  
  // 其他错误交给全局错误处理器
  next(error)
})

module.exports = router 