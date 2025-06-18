/**
 * 最简化的服务器启动文件
 */

console.log('🚀 启动简化服务器...')

const express = require('express')
console.log('✅ express加载完成')

// 导入简化路由
const authRoutes = require('./src/routes/auth-simple')
console.log('✅ 简化auth路由加载完成')

// 创建Express应用
const app = express()
console.log('✅ Express应用创建完成')

// 基础中间件
app.use(express.json())
console.log('✅ JSON解析中间件配置完成')

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: '简化服务器运行正常'
  })
})
console.log('✅ 健康检查路由配置完成')

// API路由
app.use('/api/auth', authRoutes)
console.log('✅ API路由配置完成')

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: '接口不存在',
    path: req.originalUrl
  })
})
console.log('✅ 404处理配置完成')

// 启动服务器
const PORT = 3000

console.log('🏁 准备启动HTTP服务器...')

const server = app.listen(PORT, () => {
  console.log(`🎉 服务器启动成功！`)
  console.log(`📍 地址: http://localhost:${PORT}`)
  console.log(`💚 健康检查: http://localhost:${PORT}/health`)
  console.log(`🔐 认证API: http://localhost:${PORT}/api/auth`)
})

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，关闭服务器...')
  server.close(() => {
    console.log('服务器已关闭')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，关闭服务器...')
  server.close(() => {
    console.log('服务器已关闭')
    process.exit(0)
  })
})

module.exports = app 