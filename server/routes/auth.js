/**
 * 认证相关路由
 */

const express = require('express')
const router = express.Router()

/**
 * 微信小程序登录
 * POST /api/auth/wechat-login
 */
router.post('/wechat-login', async (req, res) => {
  try {
    const { code, userInfo } = req.body
    
    if (!code) {
      return res.status(400).json({ error: '缺少登录凭证' })
    }
    
    // TODO: 实际项目中需要调用微信API验证code
    // 这里简化处理，直接返回用户信息
    const mockUser = {
      id: Date.now(),
      nickname: userInfo?.nickName || '用户',
      avatar: userInfo?.avatarUrl || '',
      openid: 'mock_openid_' + Date.now(),
      sessionKey: 'mock_session_key'
    }
    
    // TODO: 生成JWT token
    const token = 'mock_jwt_token_' + Date.now()
    
    res.json({
      message: '登录成功',
      data: {
        user: mockUser,
        token,
        expiresIn: 7 * 24 * 60 * 60 // 7天
      }
    })
    
  } catch (error) {
    console.error('登录失败:', error)
    res.status(500).json({ error: '登录失败，请重试' })
  }
})

/**
 * 登出
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  // TODO: 实际项目中清除token
  res.json({ message: '登出成功' })
})

/**
 * 验证token
 * GET /api/auth/verify
 */
router.get('/verify', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ error: '未提供token' })
  }
  
  // TODO: 实际项目中验证JWT token
  if (token.startsWith('mock_jwt_token_')) {
    res.json({ 
      message: 'token有效',
      data: { valid: true }
    })
  } else {
    res.status(401).json({ error: 'token无效' })
  }
})

module.exports = router 