/**
 * 小学AI家教后端服务器 - 正式版本
 */

const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

// 🔧 重新启用数据库初始化
const { initializeDB, isConnected } = require('./src/config/database')

const app = express()
const PORT = process.env.PORT || 3000

console.log('🔍 开始加载中间件...')

// 中间件配置
app.use(cors()) // 允许跨域
app.use(express.json({ limit: '10mb' })) // 解析JSON，增大限制以支持图片上传
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 静态文件服务
app.use('/static', express.static(path.join(__dirname, 'public')))
// 服务构建好的admin-web dist目录
app.use('/admin-web', express.static(path.join(__dirname, '..', 'admin-web', 'dist')))
// 🔧 添加测试页面静态文件服务
app.use(express.static(path.join(__dirname, '..')))

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

// ✅ game路由已修复，正常启用
const gameRouter = require('./src/routes/game')
console.log('📍 game路由导入完成')

const questionsRouter = require('./src/routes/questions')
console.log('📍 questions路由导入完成')

const ocrRouter = require('./src/routes/ocr')
console.log('📍 ocr路由导入完成')

const aiGeneratorRouter = require('./src/routes/ai-question-generator')
console.log('📍 ai-question-generator路由导入完成')

const networkRouter = require('./src/routes/network')
console.log('📍 network路由导入完成')

const learningRouter = require('./src/routes/learning')
console.log('📍 learning路由导入完成')

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

// ✅ game路由正常启用
app.use('/api/game', gameRouter)
console.log('📍 game路由注册完成')

app.use('/api/questions', questionsRouter)
console.log('📍 questions路由注册完成')

app.use('/api/ocr', ocrRouter)
console.log('📍 ocr路由注册完成')

app.use('/api/ai-generator', aiGeneratorRouter)
console.log('📍 ai-generator路由注册完成')

app.use('/api/network', networkRouter)
console.log('📍 network路由注册完成')

app.use('/api/learning', learningRouter)
console.log('📍 learning路由注册完成')

console.log('✅ 所有路由注册完成')

// 管理后台根路径 - 提供SPA入口
app.get('/admin-web', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin-web', 'dist', 'index.html'))
})
app.get('/admin-web/*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin-web', 'dist', 'index.html'))
})
console.log('📍 管理后台SPA路由注册完成')

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '1.0.0',
    services: {
      ocr: 'qwen_vl_max',
      auth: 'jwt',
      ai_chat: 'qwen-turbo',  // ✅ 使用最终选择的模型
      report: 'active',
      speech: 'dashscope_tts',  // ✅ 语音已修复为真实服务
      game: 'active',  // ✅ 游戏服务已启用
      database: isConnected() ? 'connected' : 'dev-mode'  // 🔧 添加数据库状态
    }
  })
})
console.log('📍 主健康检查路由注册完成')

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: '小学AI家教后端服务',
    version: '1.0.0',
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

// 🔧 修复：启动服务器的异步初始化流程
const startServer = async () => {
  try {
    // 🔧 数据库初始化 - 必须成功
    await initializeDB()
    
    // 启动HTTP服务器
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`=================================`)
      console.log(`🚀 小学AI家教服务器启动成功!`)
      console.log(`📡 端口: ${PORT}`)
      console.log(`🌐 本地访问: http://localhost:${PORT}`)
      console.log(`📱 小程序访问: http://192.168.33.116:${PORT}`)
      console.log(`📚 健康检查: http://192.168.33.116:${PORT}/health`)
      console.log(`🔧 OCR状态: http://192.168.33.116:${PORT}/api/ocr/status`)
      console.log(`🗄️ 数据库状态: ${isConnected() ? '✅ 已连接' : '❌ 未连接'}`)
      console.log(`=================================`)
      console.log('✅ 服务器启动完成（数据库已连接）')
    })
  } catch (error) {
    console.error('❌ 服务器启动失败:', error.message)
    console.error('   请确认MongoDB正在运行: ps aux | grep mongod')
    console.error('   或重启MongoDB: pkill mongod && ./mongodb-macos-aarch64-8.0.10/bin/mongod --config mongodb.conf')
    process.exit(1)
  }
}

// 启动服务器
startServer()

module.exports = app 