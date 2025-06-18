/**
 * 调试版服务器
 */

const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000

console.log('🔍 开始加载基础中间件...')

// 中间件配置
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

console.log('✅ 基础中间件加载完成')

// 请求日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.url}`)
  next()
})

console.log('✅ 日志中间件加载完成')

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '1.0.0'
  })
})

console.log('✅ 健康检查路由加载完成')

// 尝试加载auth路由
try {
  console.log('🔍 尝试加载auth路由...')
  const authRouter = require('./src/routes/auth')
  app.use('/api/auth', authRouter)
  console.log('✅ auth路由加载成功')
} catch (error) {
  console.error('❌ auth路由加载失败:', error.message)
}

// 尝试加载health路由
try {
  console.log('🔍 尝试加载health路由...')
  const healthRouter = require('./src/routes/health')
  app.use('/api/health', healthRouter)
  console.log('✅ health路由加载成功')
} catch (error) {
  console.error('❌ health路由加载失败:', error.message)
}

// 尝试加载ai-chat路由
try {
  console.log('🔍 尝试加载ai-chat路由...')
  const aiChatRouter = require('./src/routes/ai-chat')
  app.use('/api/ai-chat', aiChatRouter)
  console.log('✅ ai-chat路由加载成功')
} catch (error) {
  console.error('❌ ai-chat路由加载失败:', error.message)
}

// 尝试加载OCR路由
try {
  console.log('🔍 尝试加载ocr路由...')
  const ocrRouter = require('./src/routes/ocr')
  app.use('/api/ocr', ocrRouter)
  console.log('✅ ocr路由加载成功')
} catch (error) {
  console.error('❌ ocr路由加载失败:', error.message)
}

console.log('🔍 准备启动服务器...')

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================`)
  console.log(`🚀 调试服务器启动成功!`)
  console.log(`📡 端口: ${PORT}`)
  console.log(`🌐 本地访问: http://localhost:${PORT}`)
  console.log(`📚 健康检查: http://localhost:${PORT}/health`)
  console.log(`🔧 OCR状态: http://localhost:${PORT}/api/ocr/status`)
  console.log(`=================================`)
})

module.exports = app 