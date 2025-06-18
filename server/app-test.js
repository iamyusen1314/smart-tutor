/**
 * 小学AI家教后端服务器 - 测试版（不加载game路由）
 */

const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000

console.log('🔍 开始加载中间件...')

// 中间件配置
app.use(cors()) // 允许跨域
app.use(express.json({ limit: '10mb' })) // 解析JSON，增大限制以支持图片上传
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 静态文件服务
app.use('/static', express.static(path.join(__dirname, 'public')))
// 服务admin-web目录，用于语音配置等管理页面
app.use('/admin-web', express.static(path.join(__dirname, '..', 'admin-web')))

// 请求日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.url}`)
  next()
})

console.log('✅ 中间件加载完成')

// 路由配置
console.log('🔍 开始加载路由...')

const authRouter = require('./src/routes/auth')
console.log('📍 auth路由导入完成')

const healthRouter = require('./src/routes/health')
console.log('📍 health路由导入完成')

const aiModelsRouter = require('./src/routes/ai-models')
console.log('📍 ai-models路由导入完成')

const aiChatRouter = require('./src/routes/ai-chat')
console.log('📍 ai-chat路由导入完成')

const planRouter = require('./src/routes/plan')
console.log('📍 plan路由导入完成')

const reportsRouter = require('./src/routes/report')
console.log('📍 report路由导入完成')

const speechRouter = require('./src/routes/speech')
console.log('📍 speech路由导入完成')

const materialsRouter = require('./src/routes/materials')
console.log('📍 materials路由导入完成')

const usersRouter = require('./src/routes/users')
console.log('📍 users路由导入完成')

// 跳过game路由 - 这里是问题所在！
console.log('⚠️ 跳过game路由（测试）')

const questionsRouter = require('./src/routes/questions')
console.log('📍 questions路由导入完成')

const ocrRouter = require('./src/routes/ocr')
console.log('📍 ocr路由导入完成')

const aiGeneratorRouter = require('./src/routes/ai-question-generator')
console.log('📍 ai-question-generator路由导入完成')

console.log('✅ 所有路由文件导入完成')

console.log('🔍 开始注册路由...')

app.use('/api/auth', authRouter)
console.log('📍 auth路由注册完成')

app.use('/api/health', healthRouter)
console.log('📍 health路由注册完成')

app.use('/api/ai-models', aiModelsRouter)
console.log('📍 ai-models路由注册完成')

app.use('/api/ai-chat', aiChatRouter)
console.log('📍 ai-chat路由注册完成')

app.use('/api/plan', planRouter)
console.log('📍 plan路由注册完成')

app.use('/api/report', reportsRouter)
console.log('📍 report路由注册完成')

app.use('/api/speech', speechRouter)
console.log('📍 speech路由注册完成')

app.use('/api/materials', materialsRouter)
console.log('📍 materials路由注册完成')

app.use('/api/users', usersRouter)
console.log('📍 users路由注册完成')

// 跳过game路由注册
console.log('⚠️ 跳过game路由注册（测试）')

app.use('/api/questions', questionsRouter)
console.log('📍 questions路由注册完成')

app.use('/api/ocr', ocrRouter)
console.log('📍 ocr路由注册完成')

app.use('/api/ai-generator', aiGeneratorRouter)
console.log('📍 ai-generator路由注册完成')

console.log('✅ 所有路由注册完成')

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '1.0.0',
    services: {
      ocr: 'qwen_vl_max',
      auth: 'jwt',
      ai_chat: 'qwen_max',
      report: 'active',
      speech: 'mock',
      game: 'disabled_for_test'
    }
  })
})
console.log('📍 主健康检查路由注册完成')

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: '小学AI家教后端服务',
    version: '1.0.0-test',
    docs: '/api/docs',
    health: '/health'
  })
})
console.log('📍 根路径注册完成')

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '接口不存在',
    path: req.originalUrl,
    method: req.method
  })
})
console.log('📍 404处理中间件注册完成')

// 全局错误处理
app.use((error, req, res, next) => {
  console.error('全局错误:', error)
  
  res.status(error.status || 500).json({
    error: error.message || '服务器内部错误',
    timestamp: Date.now(),
    path: req.originalUrl
  })
})
console.log('📍 全局错误处理中间件注册完成')

console.log('🔍 准备启动服务器...')

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================`)
  console.log(`🚀 测试服务器启动成功!`)
  console.log(`📡 端口: ${PORT}`)
  console.log(`🌐 本地访问: http://localhost:${PORT}`)
  console.log(`📱 小程序访问: http://192.168.31.180:${PORT}`)
  console.log(`📚 健康检查: http://192.168.31.180:${PORT}/health`)
  console.log(`🔧 OCR状态: http://192.168.31.180:${PORT}/api/ocr/status`)
  console.log(`⚠️ 注意：game路由已禁用（测试模式）`)
  console.log(`=================================`)
  
  console.log('✅ 测试服务器启动完成（跳过数据库初始化和game路由）')
})

module.exports = app 