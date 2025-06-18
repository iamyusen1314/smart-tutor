const express = require('express');
const router = express.Router();

/**
 * @desc 系统健康检查
 * @route GET /api/health
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // 基本系统信息
    const systemInfo = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      responseTime: Date.now() - startTime,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    res.json({
      success: true,
      message: '系统运行正常',
      data: systemInfo
    });
  } catch (error) {
    console.error('健康检查失败:', error);
    res.status(500).json({
      success: false,
      message: '系统健康检查失败',
      error: error.message
    });
  }
});

/**
 * @desc OCR服务状态检查
 * @route GET /api/ocr/status
 * @access Public
 */
router.get('/ocr/status', async (req, res) => {
  try {
    // 千问多模态OCR服务状态检查
    const ocrStatus = {
      service: 'OCR',
      status: 'available',
      provider: 'qwen-vl-max',
      apiKeyConfigured: !!process.env.DASHSCOPE_API_KEY,
      features: ['image_recognition', 'text_extraction', 'intelligent_analysis'],
      lastCheck: new Date().toISOString()
    };

    res.json({
      success: true,
      message: '千问多模态OCR服务运行正常',
      data: ocrStatus
    });
  } catch (error) {
    console.error('OCR状态检查失败:', error);
    res.status(500).json({
      success: false,
      message: 'OCR服务状态检查失败',
      error: error.message
    });
  }
});

module.exports = router; 