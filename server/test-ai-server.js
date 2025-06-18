/**
 * 独立测试AI模型路由
 */

const express = require('express')
const cors = require('cors')

const app = express()
const PORT = 3001

// 中间件
app.use(cors())
app.use(express.json())

// 添加请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

// 加载AI模型路由
try {
  const aiModelsRouter = require('./src/routes/ai-models')
  console.log('✅ AI模型路由加载成功')
  
  // 注册路由
  app.use('/api/ai-models', aiModelsRouter)
  console.log('✅ AI模型路由注册成功')
  
} catch (error) {
  console.error('❌ AI模型路由加载失败:', error)
  process.exit(1)
}

// 测试健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    message: 'AI模型测试服务器运行正常'
  })
})

// 错误处理
app.use('*', (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`)
  res.status(404).json({
    error: '接口不存在',
    path: req.originalUrl,
    method: req.method
  })
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`==========================================`)
  console.log(`🚀 AI模型测试服务器启动成功!`)
  console.log(`📡 端口: ${PORT}`)
  console.log(`🌐 健康检查: http://localhost:${PORT}/health`)
  console.log(`🤖 AI模型概览: http://localhost:${PORT}/api/ai-models/overview`)
  console.log(`💰 成本分析: http://localhost:${PORT}/api/ai-models/cost-analysis`)
  console.log(`📝 提示词模板: http://localhost:${PORT}/api/ai-models/prompt-templates`)
  console.log(`==========================================`)
}) 