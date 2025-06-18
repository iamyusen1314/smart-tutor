/**
 * 简化版用户认证路由
 * @description 仅用于测试服务器启动的最简路由
 */

console.log('🔍 开始加载简化auth路由...')

const express = require('express')
console.log('✅ express加载完成')

const router = express.Router()
console.log('✅ router创建完成')

/**
 * 简单的健康检查路由
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '认证服务正常',
    timestamp: new Date().toISOString()
  })
})

/**
 * 简单的登录路由（开发模式）
 */
router.post('/dev-login', (req, res) => {
  const { phone = '13800000001' } = req.body
  
  // 生成模拟令牌
  const mockToken = {
    accessToken: `mock_token_${Date.now()}`,
    refreshToken: `mock_refresh_${Date.now()}`,
    expiresIn: '7d',
    tokenType: 'Bearer',
    user: {
      id: `mock_user_${phone.slice(-4)}`,
      name: `测试用户${phone.slice(-4)}`,
      role: 'student',
      phone
    }
  }
  
  res.json({
    success: true,
    message: '开发模式登录成功',
    data: mockToken
  })
})

console.log('✅ 路由定义完成')

module.exports = router