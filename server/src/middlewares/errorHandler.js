/**
 * 全局错误处理中间件
 * @description 统一处理应用中的错误，返回标准化的错误响应
 */

const logger = require('../utils/logger')

/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
    
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * 处理数据库验证错误
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(val => val.message)
  const message = `数据验证失败: ${errors.join(', ')}`
  return new AppError(message, 400)
}

/**
 * 处理数据库重复键错误
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0]
  const value = Object.values(err.keyValue)[0]
  const message = `${field}: ${value} 已存在`
  return new AppError(message, 400)
}

/**
 * 处理JWT错误
 */
const handleJWTError = () => {
  return new AppError('登录令牌无效，请重新登录', 401)
}

/**
 * 处理JWT过期错误
 */
const handleJWTExpiredError = () => {
  return new AppError('登录令牌已过期，请重新登录', 401)
}

/**
 * 处理类型转换错误
 */
const handleCastError = (err) => {
  const message = `无效的数据格式: ${err.path} = ${err.value}`
  return new AppError(message, 400)
}

/**
 * 发送开发环境错误响应
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  })
}

/**
 * 发送生产环境错误响应
 */
const sendErrorProd = (err, res) => {
  // 操作性错误：发送给客户端
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    })
  } else {
    // 编程错误：不泄露错误详情
    logger.error('ERROR', err)
    
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误'
    })
  }
}

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  // 设置默认错误状态码
  err.statusCode = err.statusCode || 500
  err.status = err.status || 'error'
  
  // 记录错误日志
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  })
  
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res)
  } else {
    let error = { ...err }
    error.message = err.message
    
    // 处理不同类型的错误
    if (error.name === 'ValidationError') {
      error = handleValidationError(error)
    }
    
    if (error.code === 11000) {
      error = handleDuplicateKeyError(error)
    }
    
    if (error.name === 'CastError') {
      error = handleCastError(error)
    }
    
    if (error.name === 'JsonWebTokenError') {
      error = handleJWTError()
    }
    
    if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError()
    }
    
    sendErrorProd(error, res)
  }
}

/**
 * 异步错误处理包装器
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

module.exports = {
  errorHandler,
  AppError,
  asyncHandler
} 