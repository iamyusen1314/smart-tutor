/**
 * 网络检测路由 - 自动IP检测功能
 */

const express = require('express')
const router = express.Router()
const os = require('os')

/**
 * 获取当前服务器的局域网IP地址
 */
function getCurrentIP() {
  const interfaces = os.networkInterfaces()
  
  // 优先级顺序：Wi-Fi > 以太网 > 其他
  const priorityOrder = ['Wi-Fi', 'en0', 'eth0', 'wlan0']
  
  for (const priority of priorityOrder) {
    if (interfaces[priority]) {
      for (const iface of interfaces[priority]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address
        }
      }
    }
  }
  
  // 如果优先接口未找到，遍历所有接口
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  
  return '127.0.0.1' // 后备方案
}

/**
 * 获取网络接口详细信息
 */
function getNetworkDetails() {
  const interfaces = os.networkInterfaces()
  const details = []
  
  for (const [name, ifaceList] of Object.entries(interfaces)) {
    for (const iface of ifaceList) {
      if (iface.family === 'IPv4') {
        details.push({
          interface: name,
          address: iface.address,
          internal: iface.internal,
          active: !iface.internal
        })
      }
    }
  }
  
  return details
}

/**
 * GET /api/network/current-ip
 * 获取当前服务器IP地址
 */
router.get('/current-ip', (req, res) => {
  try {
    const currentIP = getCurrentIP()
    const networkDetails = getNetworkDetails()
    
    console.log(`🌐 IP检测请求 - 当前服务器IP: ${currentIP}`)
    
    res.json({
      success: true,
      data: {
        currentIP,
        serverPort: process.env.PORT || 3000,
        apiBaseUrl: `http://${currentIP}:${process.env.PORT || 3000}/api`,
        timestamp: Date.now(),
        networkDetails
      },
      message: 'IP地址检测成功'
    })
  } catch (error) {
    console.error('❌ IP检测失败:', error)
    res.status(500).json({
      success: false,
      error: 'IP地址检测失败',
      message: error.message
    })
  }
})

/**
 * GET /api/network/status
 * 获取网络状态信息
 */
router.get('/status', (req, res) => {
  try {
    const currentIP = getCurrentIP()
    const networkDetails = getNetworkDetails()
    
    res.json({
      success: true,
      data: {
        server: {
          ip: currentIP,
          port: process.env.PORT || 3000,
          uptime: process.uptime(),
          platform: os.platform(),
          hostname: os.hostname()
        },
        network: {
          interfaces: networkDetails,
          activeIP: currentIP
        }
      },
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('❌ 网络状态检测失败:', error)
    res.status(500).json({
      success: false,
      error: '网络状态检测失败'
    })
  }
})

/**
 * POST /api/network/test-connection
 * 测试网络连接
 */
router.post('/test-connection', (req, res) => {
  const { clientIP, testData } = req.body
  
  console.log(`🔗 连接测试 - 客户端IP: ${clientIP}`)
  
  res.json({
    success: true,
    data: {
      serverReceived: true,
      clientIP: req.ip,
      serverIP: getCurrentIP(),
      responseTime: Date.now(),
      testData: testData || 'ping'
    },
    message: '连接测试成功'
  })
})

module.exports = router 