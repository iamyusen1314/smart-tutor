/**
 * 数据库连接配置
 * @description MongoDB连接和初始化
 */

const mongoose = require('mongoose')
const config = require('./default.json')
const logger = require('../utils/logger')

/**
 * 连接MongoDB数据库
 * @returns {Promise} 连接Promise
 */
const connectDB = async () => {
  try {
    // 设置Mongoose全局配置 - 彻底解决缓冲问题
    mongoose.set('strictQuery', false)
    mongoose.set('bufferCommands', false) // ✅ 禁用命令缓冲
    
    // 🔧 优化的连接配置 - 兼容Mongoose 8.x
    const connectionOptions = {
      serverSelectionTimeoutMS: 60000, // 60秒服务器选择超时
      connectTimeoutMS: 60000, // 60秒连接超时
      socketTimeoutMS: 0, // 0表示无限制socket超时
      heartbeatFrequencyMS: 10000, // 心跳频率
      maxPoolSize: 20, // 增大连接池
      minPoolSize: 5, // 增加最小连接数
      maxIdleTimeMS: 60000, // 增加最大空闲时间
      waitQueueTimeoutMS: 60000, // 增加等待队列超时
      retryWrites: true, // 重试写操作
      retryReads: true // 重试读操作
      // 🔧 注意：bufferCommands在Mongoose 8.x中通过mongoose.set()设置，不在连接选项中
    }

    const mongoUri = process.env.MONGODB_URI || config.database.mongodb.uri
    
    console.log('🔗 正在连接MongoDB...', mongoUri)
    
    // 🔧 强制连接，不允许静默失败
    const conn = await mongoose.connect(mongoUri, connectionOptions)

    console.log(`✅ MongoDB连接成功: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`)
    console.log(`📊 连接状态: ${mongoose.connection.readyState} (1=connected)`)

    // 监听连接事件
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB连接错误:', error)
    })

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB连接断开')
    })

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB重新连接成功')
    })

    mongoose.connection.on('timeout', () => {
      console.error('⏰ MongoDB连接超时')
    })

    mongoose.connection.on('close', () => {
      console.log('🔌 MongoDB连接关闭')
    })

    return conn
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error.message)
    console.error('   请检查MongoDB是否运行: ./mongodb-macos-aarch64-8.0.10/bin/mongod --config mongodb.conf')
    throw error // ✅ 抛出错误，不静默失败
  }
}

/**
 * 断开数据库连接
 * @returns {Promise} 断开连接Promise
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close()
    logger.info('MongoDB连接已断开')
  } catch (error) {
    logger.error('MongoDB断开连接失败:', error)
    throw error
  }
}

/**
 * 检查数据库连接状态
 * @returns {boolean} 是否已连接
 */
const isConnected = () => {
  return mongoose.connection.readyState === 1
}

/**
 * 检查是否为开发模式（无数据库）
 * @returns {boolean} 是否为开发模式
 */
const isDevMode = () => {
  return !isConnected() && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV)
}

/**
 * 获取数据库连接状态
 * @returns {Object} 连接状态信息
 */
const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  }

  return {
    state: states[mongoose.connection.readyState],
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name
  }
}

/**
 * 数据库健康检查
 * @returns {Promise<Object>} 健康状态
 */
const healthCheck = async () => {
  try {
    if (!isConnected()) {
      return {
        status: 'dev-mode',
        connected: false,
        message: '开发模式（无数据库）',
        connection: getConnectionStatus()
      }
    }

    const adminDb = mongoose.connection.db.admin()
    const result = await adminDb.ping()
    
    return {
      status: 'healthy',
      connected: isConnected(),
      ping: result.ok === 1,
      connection: getConnectionStatus()
    }
  } catch (error) {
    logger.error('数据库健康检查失败:', error)
    return {
      status: 'unhealthy',
      connected: false,
      error: error.message,
      connection: getConnectionStatus()
    }
  }
}

/**
 * 安全删除已存在的索引
 * @param {Object} collection MongoDB集合
 * @param {string} indexName 索引名称
 */
const safeDropIndex = async (collection, indexName) => {
  try {
    const indexes = await collection.listIndexes().toArray()
    const existingIndex = indexes.find(idx => idx.name === indexName)
    
    if (existingIndex) {
      await collection.dropIndex(indexName)
      logger.info(`删除已存在索引: ${indexName}`)
    }
  } catch (error) {
    // 索引不存在时会抛出错误，这是正常的
    if (error.code !== 27) { // 27 = IndexNotFound
      logger.warn(`删除索引失败: ${indexName}`, error.message)
    }
  }
}

/**
 * 创建数据库索引
 * @description 为提升查询性能创建必要的索引，修复索引冲突问题
 */
const createIndexes = async () => {
  if (!isConnected()) {
    logger.info('跳过索引创建（开发模式）')
    return
  }

  try {
    const db = mongoose.connection.db

    logger.info('开始创建/修复数据库索引...')

    // 用户集合索引 - 修复冲突问题
    const usersCollection = db.collection('users')
    
    // 安全删除可能冲突的索引
    await safeDropIndex(usersCollection, 'phone_1')
    await safeDropIndex(usersCollection, 'wechatOpenId_1')
    await safeDropIndex(usersCollection, 'createdAt_1')
    
    // 重新创建正确的索引
    await usersCollection.createIndexes([
      { 
        key: { phone: 1 }, 
        name: 'phone_unique_idx',
        unique: true, 
        sparse: true 
      },
      { 
        key: { wechatOpenId: 1 }, 
        name: 'wechatOpenId_unique_idx',
        unique: true, 
        sparse: true 
      },
      { 
        key: { createdAt: 1 },
        name: 'createdAt_idx'
      }
    ])

    // 学习记录集合索引 - 关键优化
    const learningRecordsCollection = db.collection('learningrecords')
    await learningRecordsCollection.createIndexes([
      { 
        key: { userId: 1, planId: 1 },
        name: 'userId_planId_idx'
      },
      { 
        key: { planId: 1, questionId: 1 },
        name: 'planId_questionId_idx'
      },
      { 
        key: { userId: 1, createdAt: -1 },
        name: 'userId_createdAt_idx'
      },
      { 
        key: { isCorrect: 1 },
        name: 'isCorrect_idx'
      },
      { 
        key: { createdAt: 1 },
        name: 'createdAt_ttl_idx',
        expireAfterSeconds: 7776000 // 90天后自动删除
      }
    ])

    // 学习计划集合索引
    const plansCollection = db.collection('plans')
    await plansCollection.createIndexes([
      { 
        key: { userId: 1, createdAt: -1 },
        name: 'userId_createdAt_idx'
      },
      { 
        key: { status: 1 },
        name: 'status_idx'
      },
      { 
        key: { subject: 1, grade: 1 },
        name: 'subject_grade_idx'
      }
    ])

    // AI聊天记录集合索引
    const aichatsCollection = db.collection('aichats')
    await aichatsCollection.createIndexes([
      { 
        key: { planId: 1, questionId: 1 },
        name: 'planId_questionId_idx'
      },
      { 
        key: { createdAt: 1 },
        name: 'createdAt_ttl_idx',
        expireAfterSeconds: 2592000 // 30天后自动删除
      }
    ])

    // 批改结果集合索引
    const batchCorrectionsCollection = db.collection('batchcorrections')
    await batchCorrectionsCollection.createIndexes([
      { 
        key: { planId: 1 },
        name: 'planId_unique_idx',
        unique: true 
      },
      { 
        key: { createdAt: 1 },
        name: 'createdAt_idx'
      }
    ])

    // 学习报告集合索引
    const reportsCollection = db.collection('reports')
    await reportsCollection.createIndexes([
      { 
        key: { userId: 1, date: -1 },
        name: 'userId_date_idx'
      },
      { 
        key: { planId: 1 },
        name: 'planId_unique_idx',
        unique: true 
      }
    ])

    // 历史记录集合索引
    const historiesCollection = db.collection('histories')
    await historiesCollection.createIndexes([
      { 
        key: { userId: 1, createdAt: -1 },
        name: 'userId_createdAt_idx'
      },
      { 
        key: { planId: 1 },
        name: 'planId_idx'
      }
    ])

    // 题库集合索引
    const questionsCollection = db.collection('questions')
    await questionsCollection.createIndexes([
      { 
        key: { subject: 1, grade: 1 },
        name: 'subject_grade_idx'
      },
      { 
        key: { knowledgePoints: 1 },
        name: 'knowledgePoints_idx'
      },
      { 
        key: { createdAt: 1 },
        name: 'createdAt_idx'
      }
    ])

    logger.info('✅ 数据库索引创建/修复完成')
  } catch (error) {
    logger.error('数据库索引创建失败:', error)
    // 不抛出错误，允许应用继续运行
    logger.warn('索引创建失败，但应用将继续运行')
  }
}

/**
 * 初始化数据库
 * @description 连接数据库并执行初始化操作
 */
const initializeDB = async () => {
  try {
    console.log('🔧 正在初始化数据库...')
    
    // 连接数据库
    await connectDB()
    
    // 创建索引（连接成功后）
    if (isConnected()) {
      await createIndexes()
      console.log('✅ 数据库初始化完成')
    } else {
      throw new Error('数据库连接状态异常')
    }
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message)
    throw error // ✅ 抛出错误，确保问题被发现
  }
}

module.exports = {
  connectDB,
  disconnectDB,
  isConnected,
  isDevMode,
  getConnectionStatus,
  healthCheck,
  initializeDB,
  createIndexes
} 