/**
 * 日志记录工具
 * @description 使用winston配置应用日志系统
 */

const winston = require('winston')
const path = require('path')
const fs = require('fs')
const config = require('../config/default.json')

// 确保日志目录存在
const logDir = path.dirname(config.logging.file.filename)
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

/**
 * 自定义日志格式
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`
    
    // 如果有堆栈信息，添加到日志中
    if (stack) {
      log += `\n${stack}`
    }
    
    // 如果有额外的元数据，添加到日志中
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`
    }
    
    return log
  })
)

/**
 * 控制台日志格式（带颜色）
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let log = `${timestamp} ${level}: ${message}`
    if (stack) {
      log += `\n${stack}`
    }
    return log
  })
)

/**
 * 创建传输器配置
 */
const transports = []

// 控制台输出
if (config.logging.console.enabled) {
  transports.push(
    new winston.transports.Console({
      format: config.logging.console.colorize ? consoleFormat : customFormat,
      level: config.logging.level
    })
  )
}

// 文件输出
if (config.logging.file.enabled) {
  // 错误日志文件
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: customFormat,
      maxsize: config.logging.file.maxsize,
      maxFiles: 5,
      tailable: true
    })
  )
  
  // 组合日志文件
  transports.push(
    new winston.transports.File({
      filename: config.logging.file.filename,
      format: customFormat,
      maxsize: config.logging.file.maxsize,
      maxFiles: config.logging.file.maxFiles,
      tailable: true
    })
  )
}

/**
 * 创建logger实例
 */
const logger = winston.createLogger({
  level: config.logging.level,
  format: customFormat,
  defaultMeta: {
    service: 'smart-tutor-server',
    version: require('../../package.json').version
  },
  transports,
  // 异常处理
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      format: customFormat,
      maxsize: config.logging.file.maxsize,
      maxFiles: 3
    })
  ],
  // 拒绝处理
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      format: customFormat,
      maxsize: config.logging.file.maxsize,
      maxFiles: 3
    })
  ],
  // 退出异常时不退出进程
  exitOnError: false
})

/**
 * 性能日志记录
 * @param {string} operation 操作名称
 * @param {number} duration 耗时（毫秒）
 * @param {Object} metadata 额外元数据
 */
logger.performance = (operation, duration, metadata = {}) => {
  logger.info(`Performance: ${operation}`, {
    operation,
    duration: `${duration}ms`,
    ...metadata,
    type: 'performance'
  })
}

/**
 * 安全相关日志记录
 * @param {string} event 安全事件
 * @param {Object} details 事件详情
 */
logger.security = (event, details = {}) => {
  logger.warn(`Security: ${event}`, {
    event,
    ...details,
    type: 'security',
    timestamp: new Date().toISOString()
  })
}

/**
 * 用户操作日志记录
 * @param {string} userId 用户ID
 * @param {string} action 操作动作
 * @param {Object} details 操作详情
 */
logger.userAction = (userId, action, details = {}) => {
  logger.info(`UserAction: ${action}`, {
    userId,
    action,
    ...details,
    type: 'user_action',
    timestamp: new Date().toISOString()
  })
}

/**
 * API请求日志记录
 * @param {Object} req Express请求对象
 * @param {Object} res Express响应对象
 * @param {number} duration 请求耗时
 */
logger.apiRequest = (req, res, duration) => {
  const { method, originalUrl, ip, headers } = req
  const { statusCode } = res
  
  logger.info(`API: ${method} ${originalUrl}`, {
    method,
    url: originalUrl,
    statusCode,
    duration: `${duration}ms`,
    ip,
    userAgent: headers['user-agent'],
    type: 'api_request'
  })
}

/**
 * 数据库操作日志记录
 * @param {string} operation 操作类型
 * @param {string} collection 集合名称
 * @param {number} duration 耗时
 * @param {Object} metadata 额外信息
 */
logger.dbOperation = (operation, collection, duration, metadata = {}) => {
  logger.debug(`DB: ${operation} on ${collection}`, {
    operation,
    collection,
    duration: `${duration}ms`,
    ...metadata,
    type: 'db_operation'
  })
}

/**
 * 第三方服务调用日志记录
 * @param {string} service 服务名称
 * @param {string} operation 操作
 * @param {number} duration 耗时
 * @param {boolean} success 是否成功
 * @param {Object} metadata 额外信息
 */
logger.thirdPartyCall = (service, operation, duration, success, metadata = {}) => {
  const level = success ? 'info' : 'error'
  logger[level](`ThirdParty: ${service} ${operation}`, {
    service,
    operation,
    duration: `${duration}ms`,
    success,
    ...metadata,
    type: 'third_party_call'
  })
}

/**
 * 业务错误日志记录
 * @param {string} module 模块名称
 * @param {Error} error 错误对象
 * @param {Object} context 上下文信息
 */
logger.businessError = (module, error, context = {}) => {
  logger.error(`BusinessError in ${module}: ${error.message}`, {
    module,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    ...context,
    type: 'business_error'
  })
}

/**
 * 开发环境下添加调试方法
 */
if (process.env.NODE_ENV === 'development') {
  logger.debug = (message, meta = {}) => {
    logger.log('debug', message, { ...meta, type: 'debug' })
  }
} else {
  logger.debug = () => {} // 生产环境下禁用debug日志
}

/**
 * 日志统计和监控
 */
let logStats = {
  error: 0,
  warn: 0,
  info: 0,
  debug: 0
}

// 监听日志事件，统计日志数量
logger.on('data', (info) => {
  if (logStats[info.level] !== undefined) {
    logStats[info.level]++
  }
})

/**
 * 获取日志统计信息
 * @returns {Object} 日志统计
 */
logger.getStats = () => {
  return { ...logStats }
}

/**
 * 重置日志统计
 */
logger.resetStats = () => {
  logStats = {
    error: 0,
    warn: 0,
    info: 0,
    debug: 0
  }
}

module.exports = logger 