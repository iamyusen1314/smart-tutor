/**
 * 测试路由加载
 */

const express = require('express')

try {
  console.log('🧪 测试加载 ai-models 路由...')
  
  const aiModelsRouter = require('./src/routes/ai-models')
  console.log('✅ ai-models 路由加载成功')
  console.log('路由类型:', typeof aiModelsRouter)
  console.log('是否为函数:', typeof aiModelsRouter === 'function')
  
  // 创建测试应用
  const app = express()
  app.use('/api/ai-models', aiModelsRouter)
  console.log('✅ 路由注册成功')
  
  // 测试路由是否有正确的方法
  console.log('路由栈信息:')
  if (aiModelsRouter.stack) {
    aiModelsRouter.stack.forEach((layer, index) => {
      const method = Object.keys(layer.route.methods)[0]
      console.log(`  ${index + 1}. ${method.toUpperCase()} ${layer.route.path}`)
    })
  }
  
} catch (error) {
  console.error('❌ 加载失败:', error.message)
  console.error('详细错误:', error)
} 