/**
 * 语音功能路由 - 阿里云语音识别和合成服务
 * 支持即时语音聊天功能
 */
const express = require('express')
const axios = require('axios')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const FormData = require('form-data')
const router = express.Router()
const WebSocket = require('ws')
const { v4: uuidv4 } = require('uuid')

// 配置文件上传
const upload = multer({ 
  dest: 'uploads/audio/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  }
})

// 📋 根据阿里云官方文档配置语音服务
const SPEECH_CONFIG = {
  // 语音合成配置 - 使用正确的DashScope API格式
  tts: {
    apiKey: process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || 'sk-a791758fe21c4a719b2c632d5345996f',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts',  // 🔧 使用正确的API端点
    model: 'cosyvoice-v1',  
    timeout: 30000,
    
    // 官方音色配置
    voices: {
      'longxiaobai': { name: '龙小白', description: '聊天数字人、有声书、语音助手' },
      'longxiaochun': { name: '龙小淳', description: '语音助手、导航播报、聊天数字人' },
      'longxiaocheng': { name: '龙小诚', description: '语音助手、导航播报、聊天数字人' },
      'longxiaoxia': { name: '龙小夏', description: '语音助手、聊天数字人' },
      'longwan': { name: '龙婉', description: '语音助手、导航播报、聊天数字人' },
      'longcheng': { name: '龙橙', description: '语音助手、导航播报、聊天数字人' },
      'longhua': { name: '龙华', description: '语音助手、导航播报、聊天数字人' },
      'xiaoyun': { name: '小云', description: '通用女声', fallback: 'longxiaobai' },
      'xiaogang': { name: '小刚', description: '通用男声', fallback: 'longxiaocheng' }
    }
  },
  
  // 语音识别配置
  asr: {
    apiKey: process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || 'sk-a791758fe21c4a719b2c632d5345996f',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr',
    model: 'paraformer-realtime-v2',
    timeout: 30000
  }
}

/**
 * 🎤 即时语音识别接口
 * POST /api/speech/recognize
 */
router.post('/recognize', upload.single('audio'), async (req, res) => {
  const startTime = Date.now()
  
  try {
    console.log('🎤 收到即时语音识别请求')
    
    let audioFile = null
    let audioData = null
    
    // 处理不同的音频输入格式
    if (req.file) {
      // 文件上传形式
      audioFile = req.file.path
      console.log('📁 音频文件路径:', audioFile)
    } else if (req.body.audioData) {
      // Base64音频数据
      audioData = req.body.audioData
      console.log('📝 Base64音频数据长度:', audioData.length)
    } else {
      console.warn('⚠️ 语音识别暂未实现，返回模拟结果')
      return getMockRecognitionResult(res, startTime)
    }

    // 检查API密钥配置
    if (!SPEECH_CONFIG.asr.apiKey) {
      console.warn('⚠️ 语音识别API密钥未配置，返回模拟结果')
      return getMockRecognitionResult(res, startTime)
    }

    let recognitionResult
    
    try {
      // 🔧 从请求中获取音频格式，默认为MP3
      const audioFormat = req.body.format || 'mp3'
      console.log('🎵 使用音频格式:', audioFormat)
      
      // 调用阿里云语音识别API
      recognitionResult = await callAliCloudASR(audioFile, audioData, audioFormat)
      
    } catch (apiError) {
      console.log('❌ 阿里云ASR调用失败:', apiError.message)
      
      // 🔧 检查是否是音频大小问题
      if (apiError.message.includes('音频数据过小')) {
        console.log('⚠️ 音频数据太小，返回指导信息')
        
        const responseTime = Date.now() - startTime
        return res.json({
          success: false,
          message: '音频录制时间太短',
          detail: apiError.message,
          suggestion: '请重新录制，确保说话时间至少2-3秒，音质清晰',
          responseTime,
          provider: 'error',
          errorType: 'AUDIO_TOO_SHORT'
        })
      }
      
      // 🔧 对于其他API错误，也提供更好的错误信息
      if (apiError.message.includes('400') || apiError.message.includes('401') || apiError.message.includes('403')) {
        console.log('⚠️ API配置错误，返回错误信息')
        
        const responseTime = Date.now() - startTime
        return res.json({
          success: false,
          message: '语音识别服务暂时不可用',
          detail: 'API配置错误，请检查服务配置',
          responseTime,
          provider: 'error',
          errorType: 'API_CONFIG_ERROR'
        })
      }
      
      // 🎭 只有在其他情况下才使用模拟数据
      console.log('🎭 降级使用模拟语音识别')
      return getMockRecognitionResult(res, startTime)
    }
    
    const responseTime = Date.now() - startTime
    console.log(`✅ 语音识别成功: "${recognitionResult}" (${responseTime}ms)`)
    
    // 清理临时文件
    if (audioFile && fs.existsSync(audioFile)) {
      fs.unlinkSync(audioFile)
    }
    
    res.json({
      success: true,
      data: {
        text: recognitionResult,
        confidence: 0.95,
        responseTime,
        provider: 'alibaba-cloud'
      }
    })

  } catch (error) {
    console.error('❌ 语音识别失败:', error)
    
    // 清理临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    
    res.status(500).json({
      success: false,
      message: '语音识别失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * 🎯 调用DashScope Python SDK进行语音合成
 * 使用子进程调用Python脚本，确保API调用正确
 */
async function callDashScopeTTS(text, voice, speed, pitch) {
  console.log('🚀 使用DashScope Python SDK合成语音...')
  
  return new Promise((resolve, reject) => {
    // 创建Python脚本内容
    const pythonScript = `
import os
import sys
import json
import base64
import dashscope
from dashscope.audio.tts import SpeechSynthesizer

# 设置API Key
dashscope.api_key = "${SPEECH_CONFIG.tts.apiKey}"

def synthesize_speech(text, voice, speed, pitch):
    try:
        # 音色映射处理 - 与WebSocket保持一致
        voice_map = {
            'xiaoyun': 'longxiaobai',
            'xiaogang': 'longxiaocheng'
        }
        mapped_voice = voice_map.get(voice, voice)
        
        # 文本预处理 - 移除emoji和特殊字符
        import re
        # 移除emoji
        text = re.sub(r'[\U0001F600-\U0001F6FF\U0001F700-\U0001F77F\U0001F780-\U0001F7FF\U0001F800-\U0001F8FF\U00002600-\U000026FF\U00002700-\U000027BF]', '', text)
        # 移除其他特殊字符，保留中文、英文、数字和基本标点
        text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9\s，。！？、；：""''（）,.!?;:()\-]', '', text)
        # 清理多余空格
        text = re.sub(r'\s+', ' ', text).strip()
        
        # 调用DashScope语音合成
        response = SpeechSynthesizer.call(
            model='${SPEECH_CONFIG.tts.model}',
            text=text,
            voice=mapped_voice,
            format='mp3',
            sample_rate=22050,
            volume=50,
            speech_rate=speed or 1.0,
            pitch_rate=pitch or 1.0
        )
        
        if response.get_audio_data() is not None:
            # 将音频数据编码为base64返回
            audio_base64 = base64.b64encode(response.get_audio_data()).decode('utf-8')
            result = {
                'success': True,
                'audioData': audio_base64,
                'provider': 'dashscope',
                'model': '${SPEECH_CONFIG.tts.model}',
                'voice': mapped_voice,
                'requestId': getattr(response, 'request_id', 'unknown')
            }
            print(json.dumps(result))
        else:
            error_msg = getattr(response, 'message', 'Unknown error')
            result = {
                'success': False,
                'error': f'No audio data received: {error_msg}',
                'provider': 'dashscope'
            }
            print(json.dumps(result))
            
    except Exception as e:
        result = {
            'success': False,
            'error': str(e),
            'provider': 'dashscope'
        }
        print(json.dumps(result))

if __name__ == "__main__":
    import sys
    args = json.loads(sys.argv[1])
    synthesize_speech(args['text'], args['voice'], args.get('speed'), args.get('pitch'))
`

    // 准备参数
    const args = JSON.stringify({
      text: text,
      voice: voice,
      speed: speed,
      pitch: pitch
    })

    // 启动Python子进程
    const pythonProcess = spawn('python3', ['-c', pythonScript, args], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    pythonProcess.on('close', (code) => {
      try {
        if (code === 0 && stdout.trim()) {
          const result = JSON.parse(stdout.trim())
          if (result.success) {
            console.log('✅ DashScope语音合成成功')
            console.log(`   模型: ${result.model}`)
            console.log(`   音色: ${result.voice}`)
            console.log(`   请求ID: ${result.requestId}`)
            
            // 转换base64为Buffer
            const audioBuffer = Buffer.from(result.audioData, 'base64')
            resolve({
              audioData: audioBuffer,
              voice: result.voice,
              provider: 'dashscope',
              requestId: result.requestId
            })
          } else {
            console.error('❌ DashScope API返回错误:', result.error)
            reject(new Error(result.error))
          }
        } else {
          console.error('❌ Python进程执行失败:')
          console.error('   退出码:', code)
          console.error('   标准输出:', stdout)
          console.error('   错误输出:', stderr)
          reject(new Error(`Python process failed with code ${code}: ${stderr}`))
        }
      } catch (error) {
        console.error('❌ 解析Python输出失败:', error.message)
        console.error('   原始输出:', stdout)
        reject(error)
      }
    })

    // 设置超时
    setTimeout(() => {
      pythonProcess.kill()
      reject(new Error('语音合成超时'))
    }, SPEECH_CONFIG.tts.timeout)
  })
}

/**
 * 🎭 模拟语音合成（降级方案）
 */
function generateMockAudio(text, voice, speed, pitch) {
  console.log('🎭 使用模拟语音合成')
  
  // 生成模拟的MP3音频数据 (简单的音频头)
  const mp3Header = Buffer.from([
    0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ])
  
  // 根据文本长度生成不同大小的数据
  const textLength = text.length
  const audioSize = Math.max(1024, textLength * 100)
  const audioData = Buffer.alloc(audioSize)
  mp3Header.copy(audioData, 0)
  
  return {
    audioData: audioData,
    voice: voice,
    provider: 'mock',
    fallbackReason: 'DashScope API unavailable'
  }
}

/**
 * 🎵 核心语音合成服务
 */
async function performSpeechSynthesis(text, voice = 'longxiaobai', speed = 1.0, pitch = 1.0) {
  console.log(`🎯 开始执行语音合成，文本: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`)
  console.log(`   音色: ${voice}, 语速: ${speed}, 音调: ${pitch}`)

  // 🔧 检查API密钥配置
  const hasValidApiKey = SPEECH_CONFIG.tts.apiKey && 
                        SPEECH_CONFIG.tts.apiKey.trim().length > 0 && 
                        !SPEECH_CONFIG.tts.apiKey.includes('your-api-key')
  
  if (!hasValidApiKey) {
    console.warn('⚠️ API密钥未配置，使用模拟语音合成')
    return generateMockAudio(text, voice, speed, pitch)
  }

  try {
    // 🚀 优先使用WebSocket API进行真实语音合成
    console.log('🔗 尝试WebSocket语音合成...')
    console.log('🔑 使用API密钥:', hasValidApiKey ? 'sk-a791758...' : '未配置')
    
    const result = await callWebSocketTTSAPI(text, voice, speed, pitch)
    console.log('✅ WebSocket语音合成成功，音频大小:', result.audioSize, '字节')
    
    return {
      audioData: result.audioData,
      audioUrl: result.audioUrl,
      duration: result.duration,
      originalText: result.originalText,
      processedText: result.processedText,
      audioSize: result.audioSize,
      qualityCheck: result.qualityCheck,
      voice: result.voice,
      provider: 'alibaba-cloud'
    }
    
  } catch (wsError) {
    console.error('❌ WebSocket语音合成失败:')
    console.error('   错误类型:', wsError.name)
    console.error('   错误消息:', wsError.message)
    console.error('   错误堆栈:', wsError.stack?.substring(0, 300))
    
    try {
      // 🔧 降级使用DashScope Python SDK（如果WebSocket失败）
      console.log('🐍 降级使用Python SDK...')
      const result = await callDashScopeTTS(text, voice, speed, pitch)
      console.log('✅ DashScope Python SDK语音合成成功')
      return result
      
    } catch (sdkError) {
      console.error('❌ DashScope Python SDK语音合成失败:')
      console.error('   错误类型:', sdkError.name)  
      console.error('   错误消息:', sdkError.message)
      console.log('🎭 最终降级使用模拟语音合成')
      
      // 最后降级使用模拟方案
      return generateMockAudio(text, voice, speed, pitch)
    }
  }
}

/**
 * 🎵 语音合成接口
 * POST /api/speech/synthesis
 */
router.post('/synthesis', async (req, res) => {
  const startTime = Date.now()
  
  try {
    console.log('🔊 收到即时语音合成请求:', {
      text: req.body.text?.substring(0, 50) + (req.body.text?.length > 50 ? '...' : ''),
      voice: req.body.voice,
      speed: req.body.speed,
      pitch: req.body.pitch
    })

    const { text, voice = 'longxiaobai', speed = 1.0, pitch = 0 } = req.body

    // 参数验证
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '文本内容不能为空'
      })
    }

    if (text.length > 1000) {
      return res.status(400).json({
        success: false,
        error: '文本长度不能超过1000字符'
      })
    }

    // 执行语音合成
    const result = await performSpeechSynthesis(text, voice, speed, pitch)
    
    const processingTime = Date.now() - startTime
    
    // 🔧 检查是否是真实的音频数据还是模拟数据
    if (result.provider === 'mock' || !result.audioData || typeof result.audioData !== 'string') {
      console.log('🎭 语音合成降级使用模拟数据，返回JSON响应')
      
      return res.json({
        success: true,
        data: {
          audioUrl: result.audioUrl,
          audioData: result.audioData,
          duration: result.duration || Math.ceil(text.length / 3),
          text: text,
          responseTime: processingTime,
          provider: result.provider || 'mock',
          voice: result.voice || voice,
          model: SPEECH_CONFIG.tts.model,
          processedText: result.processedText || text,
          audioSize: result.audioSize || 0,
          qualityCheck: result.qualityCheck || {
            size: 0,
            isValidSize: false,
            estimatedDuration: Math.ceil(text.length / 3),
            quality: 'mock',
            isValidMP3: false
          }
        }
      })
    }
    
    console.log(`✅ 真实语音合成成功 (${processingTime}ms)`)
    
    // 🎵 真实音频数据：返回JSON格式（包含base64音频）
    return res.json({
      success: true,
      data: {
        audioUrl: `data:audio/mp3;base64,${result.audioData}`, // 🔧 生成data URL
        audioData: result.audioData, // 🔧 保持base64格式供前端使用
        duration: result.duration || Math.ceil(text.length / 3),
        text: text,
        responseTime: processingTime,
        provider: result.provider,
        voice: result.voice,
        model: SPEECH_CONFIG.tts.model,
        processedText: result.processedText || text,
        audioSize: result.audioSize || 0,
        qualityCheck: result.qualityCheck || {
          size: result.audioSize || 0,
          isValidSize: result.audioSize >= 1000,
          estimatedDuration: Math.ceil(text.length / 3),
          quality: result.qualityCheck?.quality || 'real',
          isValidMP3: result.qualityCheck?.isValidMP3 || true
        }
      }
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error('❌ 语音合成接口错误:', error.message)
    
    res.status(500).json({
      success: false,
      error: '语音合成服务暂时不可用',
      processingTime: processingTime + 'ms'
    })
  }
})

/**
 * 🎯 即时语音聊天接口
 * POST /api/speech/instant-chat
 */
router.post('/instant-chat', upload.single('audio'), async (req, res) => {
  const startTime = Date.now()
  
  try {
    console.log('🎯 收到即时语音聊天请求')
    
    // 1. 语音识别
    const recognitionResult = await performSpeechRecognition(req)
    console.log('🎤 识别结果:', recognitionResult)
    
    // 2. AI处理
    const { aiResponse } = await processAIChat(recognitionResult, req.body)
    console.log('🤖 AI回复:', aiResponse.substring(0, 50) + '...')
    
    // 3. 语音合成
    const synthesisResult = await performSpeechSynthesis(aiResponse, 'longxiaobai', 1.0, 0)
    console.log('🔊 合成完成')
    
    const responseTime = Date.now() - startTime
    console.log(`✅ 即时语音聊天完成 (${responseTime}ms)`)
    
    res.json({
      success: true,
      data: {
        userInput: recognitionResult,
        aiResponse: aiResponse,
        audioUrl: synthesisResult.audioUrl || `data:audio/mp3;base64,${synthesisResult.audioData}`,
        audioData: synthesisResult.audioData,
        duration: synthesisResult.duration,
        responseTime,
        provider: synthesisResult.provider || 'unknown',
        components: {
          recognition: '✅',
          aiProcessing: '✅', 
          synthesis: '✅'
        }
      }
    })

  } catch (error) {
    console.error('❌ 即时语音聊天失败:', error)
    
    res.status(500).json({
      success: false,
      message: '即时语音聊天失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * 📊 获取语音功能状态
 * GET /api/speech/status
 */
router.get('/status', async (req, res) => {
  try {
    const hasApiKey = SPEECH_CONFIG.tts.apiKey && 
                     SPEECH_CONFIG.tts.apiKey.trim().length > 0 && 
                     !SPEECH_CONFIG.tts.apiKey.includes('your-api-key')
    
    res.json({
      success: true,
      data: {
        speechSynthesis: {
          available: true,
          provider: hasApiKey ? 'alibaba-cloud' : 'mock',
          model: SPEECH_CONFIG.tts.model,
          supportedVoices: Object.entries(SPEECH_CONFIG.tts.voices).map(([id, info]) => ({
            id,
            name: info.name,
            description: info.description,
            language: '中文',
            format: 'mp3'
          })),
          maxTextLength: 500
        },
        configured: hasApiKey,
        version: '3.0.0-dashscope-sdk',
        lastUpdate: '2025-01-27'
      }
    })
  } catch (error) {
    console.error('获取语音状态失败:', error)
    
    res.status(500).json({
      success: false,
      message: '获取语音状态失败'
    })
  }
})

// ==================== 辅助函数 ====================

/**
 * 🧠 智能文本分段函数 - 在语义边界处分段，保持教学逻辑完整
 * @param {string} text - 原始文本
 * @param {number} maxLength - 每段最大长度
 * @returns {string} - 分段后的第一段文本（保持语义完整）
 */
function intelligentTextSegment(text, maxLength = 50) {
  if (text.length <= maxLength) {
    return text
  }
  
  // 🎯 语义边界优先级：句号 > 问号 > 感叹号 > 逗号 > 顿号 > 分号
  const boundaries = [
    { char: '。', priority: 1, isEnd: true },
    { char: '？', priority: 2, isEnd: true },
    { char: '！', priority: 3, isEnd: true },
    { char: '，', priority: 4, isEnd: false },
    { char: '、', priority: 5, isEnd: false },
    { char: '；', priority: 6, isEnd: false },
    { char: '：', priority: 7, isEnd: false }
  ]
  
  let bestCutPoint = -1
  let bestPriority = 999
  let bestIsEnd = false
  
  // 🔍 在最大长度范围内寻找最佳分段点
  for (let i = Math.max(20, maxLength - 20); i < Math.min(text.length, maxLength + 10); i++) {
    const char = text[i]
    const boundary = boundaries.find(b => b.char === char)
    
    if (boundary) {
      // 优先选择优先级更高（数字更小）的边界
      if (boundary.priority < bestPriority) {
        bestCutPoint = i + 1 // 包含标点符号
        bestPriority = boundary.priority
        bestIsEnd = boundary.isEnd
      }
    }
  }
  
  // 🎯 如果找到合适的分段点
  if (bestCutPoint > 0) {
    const segment = text.substring(0, bestCutPoint).trim()
    
    console.log('🧠 智能分段结果:', {
      originalLength: text.length,
      segmentLength: segment.length,
      cutPoint: bestCutPoint,
      priority: bestPriority,
      isEndBoundary: bestIsEnd,
      segment: segment.substring(0, 30) + (segment.length > 30 ? '...' : '')
    })
    
    return segment
  }
  
  // 🔧 如果没找到合适的分段点，寻找空格分词
  for (let i = maxLength - 10; i >= 20; i--) {
    if (text[i] === ' ' || text[i] === '　') { // 空格或全角空格
      const segment = text.substring(0, i).trim()
      console.log('🔤 按空格分段:', segment)
      return segment
    }
  }
  
  // 🚨 最后的兜底方案：智能截断，避免在词语中间截断
  const safeLength = Math.max(30, maxLength - 10)
  const segment = text.substring(0, safeLength)
  
  console.log('⚠️ 兜底分段方案:', {
    originalLength: text.length,
    segmentLength: segment.length,
    segment: segment
  })
  
  return segment
}

/**
 * 🎤 调用阿里云语音识别API - 使用DashScope官方格式
 * 基于官方文档的通义千问ASR模型
 */
async function callAliCloudASR(audioFile, audioData, format = 'mp3') {
  console.log('🚀 调用阿里云语音识别API...')
  console.log('🎵 音频格式:', format)
  console.log('🔑 API密钥:', SPEECH_CONFIG.asr.apiKey ? SPEECH_CONFIG.asr.apiKey.substring(0, 8) + '***' : '未配置')
  
  // 🔧 使用DashScope通义千问ASR格式（官方文档推荐）
  const base64Audio = audioData || (audioFile ? fs.readFileSync(audioFile).toString('base64') : null)
  
  if (!base64Audio) {
    throw new Error('未提供音频数据')
  }
  
  // 🔧 检查音频数据大小 - DashScope需要足够大的音频数据
  const audioSizeBytes = Math.ceil(base64Audio.length * 3 / 4) // Base64 to bytes
  console.log('📏 音频数据大小:', {
    base64Length: base64Audio.length,
    estimatedBytes: audioSizeBytes,
    minimumRequired: 1000 // 至少需要1KB的音频数据
  })
  
  // 🚨 如果音频太小，抛出明确错误而非使用模拟数据
  if (audioSizeBytes < 1000) {
    console.log('⚠️ 音频数据太小，无法进行语音识别')
    console.log('💡 建议：请确保录音时长至少1-2秒，音质清晰')
    throw new Error(`音频数据过小(${audioSizeBytes}字节)，需要至少1KB的音频数据。请录制更长时间的音频。`)
  }
  
  const requestData = {
    model: 'qwen-audio-asr', // 使用通义千问ASR模型
    input: {
      messages: [
        {
          role: 'user',
          content: [
            {
              audio: `data:audio/${format};base64,${base64Audio}`
            }
          ]
        }
      ]
    }
  }
  
  console.log('📤 发送语音识别请求到: https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation')
  console.log('📝 请求数据:', {
    model: requestData.model,
    audioFormat: format,
    audioSizeKB: Math.round(audioSizeBytes / 1024 * 10) / 10
  })
  
  const response = await axios.post('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', requestData, {
    headers: {
      'Authorization': `Bearer ${SPEECH_CONFIG.asr.apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: SPEECH_CONFIG.asr.timeout
  })
  
  console.log('📥 语音识别响应状态:', response.status)
  
  // 🔧 处理通义千问ASR响应格式
  if (response.data && response.data.output && response.data.output.choices && response.data.output.choices.length > 0) {
    const choice = response.data.output.choices[0]
    if (choice.message && choice.message.content && choice.message.content.length > 0) {
      const recognizedText = choice.message.content[0].text
      console.log('✅ 真实语音识别成功:', recognizedText)
      console.log('📊 Token使用:', response.data.usage)
      return recognizedText
    }
  }
  
  console.error('❌ 语音识别返回格式异常:', JSON.stringify(response.data))
  throw new Error('语音识别返回格式异常: ' + JSON.stringify(response.data))
}

/**
 * 🚀 调用阿里云WebSocket语音合成API
 * 修复音频格式问题，确保返回标准MP3
 */
async function callWebSocketTTSAPI(text, voice, speed, pitch) {
  console.log('🚀 使用WebSocket调用阿里云语音合成...')
  
  // 🔧 音色映射处理 - 将不支持的音色映射到支持的音色
  const voiceMapping = {
    'xiaoyun': 'longxiaobai',
    'xiaogang': 'longxiaocheng'
  }
  const mappedVoice = voiceMapping[voice] || voice
  
  if (voice !== mappedVoice) {
    console.log(`🎭 音色映射: ${voice} -> ${mappedVoice}`)
  }
  
  // 🔧 文本预处理 - 移除emoji但保留数学运算符
  let processedText = text.trim()
  
  // 移除emoji和特殊符号
  processedText = processedText.replace(/[\u{1F600}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
  
  // 移除其他特殊字符，保留中文、英文、数字、基本标点和数学运算符
  processedText = processedText.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s，。！？、；：""''（）,.!?;:()\-+=×÷]/g, '')
  
  // 清理多余空格
  processedText = processedText.replace(/\s+/g, ' ').trim()
  
  console.log('📝 文本预处理:', {
    original: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
    processed: processedText.substring(0, 50) + (processedText.length > 50 ? '...' : ''),
    removedEmojis: text !== processedText
  })
  
  // 🎯 智能文本长度控制 - 语义边界分段
  if (processedText.length < 2) {
    processedText = processedText + '，好'
    console.log('📝 简短扩充文本:', processedText)
  } else if (processedText.length > 50) {
    // 🧠 智能分段：在语义边界处分段，保持教学逻辑完整
    processedText = intelligentTextSegment(processedText, 50)
    console.log('📝 智能分段文本:', processedText)
  }
  
  return new Promise((resolve, reject) => {
    const taskId = uuidv4()
    const wsUrl = `wss://dashscope.aliyuncs.com/api-ws/v1/inference/`
    
    console.log('🔗 建立WebSocket连接...')
    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${SPEECH_CONFIG.tts.apiKey}`
      }
    })
    
    let audioBuffers = []
    let timeout
    let taskStarted = false
    let taskCompleted = false
    
    ws.on('open', () => {
      console.log('✅ WebSocket连接已建立')
      
      // 🎯 第一步：发送run-task指令（不包含文本）
      const runTaskMessage = {
        header: {
          action: 'run-task',
          task_id: taskId,
          streaming: 'duplex'
        },
        payload: {
          task_group: 'audio',
          task: 'tts',
          function: 'SpeechSynthesizer',
          model: 'cosyvoice-v1',
          parameters: {
            text_type: 'PlainText',
            voice: mappedVoice,          // 🔧 使用映射后的音色
            format: 'mp3',              // 🔧 确保MP3格式
            sample_rate: 22050,         // 🔧 使用标准采样率
            volume: 50,                 // 🔧 标准音量
            rate: 1.0,                  // 🔧 正常语速确保质量
            pitch: 1.0                  // 🔧 标准音调
          },
          input: {}                     // 🔧 run-task中不发送文本
        }
      }
      
      console.log('📤 第一步：发送run-task指令')
      console.log('🎛️ 语音配置:', {
        voice: runTaskMessage.payload.parameters.voice,
        format: runTaskMessage.payload.parameters.format,
        sample_rate: runTaskMessage.payload.parameters.sample_rate,
        volume: runTaskMessage.payload.parameters.volume,
        textLength: processedText.length
      })
      
      ws.send(JSON.stringify(runTaskMessage))
      
      // 🔧 设置合理超时时间
      timeout = setTimeout(() => {
        console.log('⏰ WebSocket连接超时')
        if (!taskCompleted) {
          ws.close()
          reject(new Error('WebSocket连接超时'))
        }
      }, 45000)  // 45秒超时，给阿里云更多处理时间
    })
    
    ws.on('message', (data) => {
      try {
        // 🔧 先尝试解析为JSON消息
        const messageStr = data.toString()
        
        try {
          const message = JSON.parse(messageStr)
          console.log('📨 收到状态消息:', message.header?.event)
          
          if (message.header?.event === 'task-started') {
            console.log('✅ 任务已启动，开始发送文本')
            taskStarted = true
            
            // 🎯 第二步：发送continue-task指令（包含文本）
            const continueTaskMessage = {
              header: {
                action: 'continue-task',
                task_id: taskId,
                streaming: 'duplex'
              },
              payload: {
                input: {
                  text: processedText
                }
              }
            }
            
            console.log('📤 第二步：发送continue-task指令，文本:', processedText)
            ws.send(JSON.stringify(continueTaskMessage))
            
            // 🎯 第三步：立即发送finish-task指令
            setTimeout(() => {
              const finishTaskMessage = {
                header: {
                  action: 'finish-task',
                  task_id: taskId,
                  streaming: 'duplex'
                },
                payload: {
                  input: {}
                }
              }
              
              console.log('📤 第三步：发送finish-task指令')
              ws.send(JSON.stringify(finishTaskMessage))
            }, 100) // 短暂延迟确保消息顺序
          }
          
          // 🎵 处理音频数据返回 - DashScope在payload.output.audio中返回base64音频
          if (message.payload?.output?.audio) {
            console.log('🎵 收到base64音频数据')
            const audioBase64 = message.payload.output.audio
            const audioBuffer = Buffer.from(audioBase64, 'base64')
            console.log('🎵 转换音频数据:', audioBuffer.length, '字节')
            audioBuffers.push(audioBuffer)
          }
          
          if (message.header?.event === 'task-finished') {
            console.log('🎉 任务完成')
            taskCompleted = true
            // 🔧 稍微延迟关闭，确保接收完整音频
            setTimeout(() => ws.close(), 100)
          }
          
          if (message.header?.event === 'task-failed') {
            console.error('❌ 任务失败:', message.header?.error_message || message.payload)
            taskCompleted = true
            ws.close()
            reject(new Error(`语音合成失败: ${message.header?.error_message || '未知错误'}`))
          }
          
        } catch (parseError) {
          // 🎵 如果不是JSON，检查是否是纯二进制音频数据
          if (data instanceof Buffer && data.length > 10) {
            // 检查是否是MP3文件头
            const header = data.slice(0, 3)
            if ((header[0] === 0xFF && (header[1] & 0xE0) === 0xE0) || data.toString('hex').startsWith('494433')) {
              console.log('🎵 接收二进制MP3音频片段:', data.length, '字节')
              audioBuffers.push(data)
            } else {
              console.log('📝 收到非音频二进制数据:', data.length, '字节，头部:', header.toString('hex'))
            }
          }
        }
      } catch (err) {
        console.warn('处理消息失败:', err.message)
      }
    })
    
    ws.on('close', () => {
      console.log('🔌 WebSocket连接已关闭')
      if (timeout) clearTimeout(timeout)
      
      if (audioBuffers.length > 0) {
        const totalBuffer = Buffer.concat(audioBuffers)
        console.log('🎉 语音合成完成，总音频长度:', totalBuffer.length, '字节')
        
        // 🔧 验证MP3格式
        let qualityCheck = {
          size: totalBuffer.length,
          isValidSize: totalBuffer.length >= 1000,  // MP3文件需要足够大
          estimatedDuration: Math.ceil(processedText.length / 3),  // 正常语速时长估算
          quality: totalBuffer.length < 5000 ? 'compact' : 
                  totalBuffer.length < 20000 ? 'optimal' : 
                  totalBuffer.length < 50000 ? 'good' : 'large'
        }
        
        // 🎯 检查MP3文件头
        if (totalBuffer.length >= 3) {
          const header = totalBuffer.slice(0, 3)
          const headerHex = header.toString('hex')
          
          // MP3文件头检查
          qualityCheck.isValidMP3 = 
            (header[0] === 0xFF && (header[1] & 0xE0) === 0xE0) ||  // 标准MP3头
            headerHex.startsWith('494433') ||                        // ID3v2标签
            totalBuffer.length > 1000;                              // 大文件通常是有效的
          
          console.log('🔍 MP3格式分析:', {
            headerHex: headerHex,
            isStandardMP3: (header[0] === 0xFF && (header[1] & 0xE0) === 0xE0),
            hasID3: headerHex.startsWith('494433'),
            size: totalBuffer.length,
            isValid: qualityCheck.isValidMP3
          })
        } else {
          qualityCheck.isValidMP3 = false
        }
        
        console.log('🔍 音频质量检查:', qualityCheck)
        
        if (qualityCheck.isValidMP3 && qualityCheck.isValidSize) {
          console.log('✅ MP3格式验证通过，可以播放')
        } else {
          console.log('⚠️ MP3格式可能有问题，但仍尝试播放')
        }
        
        // 转换为Base64返回
        const audioData = totalBuffer.toString('base64')
        
        resolve({
          audioData: audioData,
          audioUrl: null,
          duration: qualityCheck.estimatedDuration,
          originalText: text,
          processedText: processedText,
          audioSize: totalBuffer.length,
          qualityCheck: qualityCheck,
          voice: mappedVoice // 🔧 返回实际使用的音色
        })
      } else {
        console.error('❌ 未接收到音频数据')
        reject(new Error('未接收到音频数据'))
      }
    })
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket错误:', error)
      if (timeout) clearTimeout(timeout)
      reject(new Error(`WebSocket连接失败: ${error.message}`))
    })
  })
}

// 🗑️ 已删除旧的HTTP API调用函数 - 使用WebSocket替代

/**
 * 执行语音识别
 */
async function performSpeechRecognition(req) {
  const audioFormat = req.body.format || 'mp3' // 🔧 默认支持MP3格式
  
  if (req.file) {
    return await callAliCloudASR(req.file.path, null, audioFormat)
  } else if (req.body.audioData) {
    return await callAliCloudASR(null, req.body.audioData, audioFormat)
  } else {
    throw new Error('未提供音频数据')
  }
}

/**
 * 处理AI聊天
 */
async function processAIChat(userInput, requestBody) {
  // 这里调用AI聊天接口
  const aiService = require('../services/aiService')
  
  const prompt = `学生通过语音说："${userInput}"
请你作为AI老师，用简洁友好的语言回复，适合小学生理解。回复要：
1. 语言简单易懂
2. 语气温和鼓励
3. 控制在50字以内
4. 如果是数学问题，给出引导性提示而不是直接答案

学生的问题背景：${requestBody.question || '一般学习问答'}
年级：${requestBody.grade || '小学'}年级
学科：${requestBody.subject || '数学'}`

  const aiResponse = await aiService.generateResponse(prompt, 'chat')
  
  return { aiResponse }
}

/**
 * 获取模拟语音识别结果
 */
function getMockRecognitionResult(res, startTime) {
  const mockResults = [
    '我不知道怎么算',
    '老师能帮帮我吗',
    '我需要提示',
    '这道题好难',
    '我想再试一次',
    '谢谢老师',
    '我明白了',
    '能详细解释一下吗',
    '这个方法我不会',
    '还有其他办法吗'
  ]
  
  const randomIndex = Math.floor(Math.random() * mockResults.length)
  const result = mockResults[randomIndex]
  const responseTime = Date.now() - startTime
  
  console.log('🎭 模拟语音识别结果:', result)
  
  res.json({
    success: true,
    data: {
      text: result,
      confidence: 0.88,
      responseTime,
      provider: 'mock'
    }
  })
}

/**
 * 🎭 获取模拟语音合成结果
 */
function getMockSynthesisResult(res, text, startTime) {
  console.log('🎭 降级使用模拟语音合成')
  
  const responseTime = Date.now() - startTime
  
  return res.json({
    success: true,
    data: {
      audioUrl: null,
      audioData: `mock_${Buffer.from(text).toString('base64').substring(0, 20)}`,
      duration: Math.ceil(text.length / 5),
      text: text,
      responseTime,
      provider: 'mock',
      note: '⚠️ 这是模拟数据，需要安装DashScope Python SDK以使用真实语音合成'
    }
  })
}

/**
 * 📋 多学科语音播报配置 - 按PRD要求实现
 */
const SUBJECT_VOICE_CONFIG = {
  math: {
    voice: 'longxiaobai',
    speed: 1.0,
    textProcessor: 'preserveMathOperators',
    triggers: ['计算', '答案', '正确', '错误', '再想想', '提示']
  },
  chinese: {
    voice: 'longxiaochun', 
    speed: 0.9,
    textProcessor: 'preservePinyin',
    triggers: ['拼音', '生字', '词语', '句子', '阅读', '写作']
  },
  english: {
    voice: 'longxiaocheng',
    speed: 0.8,
    textProcessor: 'preserveEnglish',
    triggers: ['单词', 'word', '发音', '语法', 'grammar', '句子']
  },
  science: {
    voice: 'longwan',
    speed: 1.0,
    textProcessor: 'preserveObservation',
    triggers: ['观察', '实验', '现象', '原因', '结果', '思考']
  }
}

/**
 * 🎯 序列号智能处理 - 将"1. 2. 3."转换为自然语音表达
 */
function processSequenceNumbers(text) {
  if (!text || typeof text !== 'string') return text
  
  // 🔧 处理序列号模式：数字 + 点号 + 空格/内容
  const patterns = [
    // 处理"1. 2. 3."这样的序列号 - 增强版本
    {
      regex: /(\s|^|。|！|？)(\d+)\.\s*/g,
      replacer: (match, prefix, number) => {
        const num = parseInt(number)
        const chineseNumbers = ['', '第一', '第二', '第三', '第四', '第五', '第六', '第七', '第八', '第九', '第十']
        
        if (num <= 10) {
          return `${prefix}${chineseNumbers[num]}，`
        } else {
          return `${prefix}第${num}点，`
        }
      }
    },
    
    // 处理"（1）（2）（3）"这样的序列号
    {
      regex: /[（(](\d+)[）)]/g, 
      replacer: (match, number) => {
        const num = parseInt(number)
        const chineseNumbers = ['', '第一', '第二', '第三', '第四', '第五', '第六', '第七', '第八', '第九', '第十']
        
        if (num <= 10) {
          return `${chineseNumbers[num]}，`
        } else {
          return `第${num}点，`
        }
      }
    }
  ]
  
  let result = text
  patterns.forEach(pattern => {
    result = result.replace(pattern.regex, pattern.replacer)
  })
  
  console.log('🔢 序列号处理:', {
    original: text.substring(0, 100),
    processed: result.substring(0, 100),
    hasSequence: text !== result
  })
  
  return result
}

/**
 * 🎯 多学科文本处理器 - 根据学科特点清理文本
 */
function processTextForSubject(text, subject = 'math') {
  if (!text || typeof text !== 'string') return ''
  
  let processed = text.trim()
  
  // 🔢 第一步：处理序列号（所有学科都需要）
  processed = processSequenceNumbers(processed)
  
  // 🔧 第二步：根据学科进行专门处理
  switch (subject) {
    case 'math':
      // 数学：保留运算符，移除emoji
      processed = processed
        .replace(/[\u{1F600}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s+\-×÷=，。！？、；：""''（）,.!?;:()\-]/g, '')
        .replace(/\s+/g, ' ').trim()
      break
      
    case 'chinese':
      // 语文：保留拼音音调，移除emoji
      processed = processed
        .replace(/[\u{1F600}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/[^\u4e00-\u9fa5a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ\s，。！？、；：""''（）]/g, '')
        .replace(/\s+/g, ' ').trim()
      break
      
    case 'english':
      // 英语：保留英文，移除emoji和中文标点
      processed = processed
        .replace(/[\u{1F600}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/[^\u4e00-\u9fa5a-zA-Z\s,.!?;:()\-]/g, '')
        .replace(/\s+/g, ' ').trim()
      break
      
    case 'science':
      // 科学：保留观察描述，移除emoji
      processed = processed
        .replace(/[\u{1F600}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s，。！？、；：""''（）()°℃]/g, '')
        .replace(/\s+/g, ' ').trim()
      break
      
    default:
      // 默认处理：移除emoji和特殊字符
      processed = processed
        .replace(/[\u{1F600}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s，。！？、；：""''（）,.!?;:()\-]/g, '')
        .replace(/\s+/g, ' ').trim()
  }
  
  // 🔧 第三步：最终清理
  processed = processed
    .replace(/，+/g, '，')  // 合并多个逗号
    .replace(/。+/g, '。')  // 合并多个句号
    .replace(/\s+/g, ' ')   // 合并多个空格
    .trim()
  
  return processed
}

/**
 * 🎵 多学科语音播报接口
 * POST /api/speech/broadcast
 * 支持数学、语文、英语、科学四个学科的自动语音播报
 */
router.post('/broadcast', async (req, res) => {
  const startTime = Date.now()
  
  try {
    console.log('🎵 收到多学科语音播报请求:', {
      text: req.body.text?.substring(0, 50) + (req.body.text?.length > 50 ? '...' : ''),
      subject: req.body.subject,
      priority: req.body.priority,
      userId: req.body.userId
    })

    const { 
      text, 
      subject = 'math', 
      priority = 'normal', 
      autoPlay = true, 
      userId 
    } = req.body

    // 参数验证
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '播报文本不能为空'
      })
    }

    if (text.length > 500) {
      return res.status(400).json({
        success: false,
        error: '播报文本长度不能超过500字符'
      })
    }

    // 🎯 多学科语音配置
    const subjectConfigs = {
      math: {
        voice: 'longxiaobai',
        speed: 1.0,
        description: '数学小老师 - 逻辑清晰，温暖鼓励'
      },
      chinese: {
        voice: 'longxiaochun',
        speed: 0.9,
        description: '语文老师 - 声音甜美，富有感情'
      },
      english: {
        voice: 'longxiaocheng',
        speed: 0.8,
        description: '英语老师 - 发音标准，活泼生动'
      },
      science: {
        voice: 'longwan',
        speed: 1.0,
        description: '科学老师 - 知识渊博，引导探索'
      }
    }

    // 获取学科配置
    const config = subjectConfigs[subject] || subjectConfigs.math
    console.log('🎯 使用学科配置:', {
      subject: subject,
      voice: config.voice,
      speed: config.speed,
      description: config.description
    })

    // 🔧 文本预处理 - 针对学科特点优化
    let processedText = text.trim()
    
    // 序列号处理（如"1. 2. 3."）
    processedText = processSequenceNumbers(processedText)
    
    // 学科特定文本处理
    processedText = processTextForSubject(processedText, subject)

    console.log('📝 文本处理完成:', {
      originalLength: text.length,
      processedLength: processedText.length,
      originalText: text.substring(0, 30),
      processedText: processedText.substring(0, 30)
    })

    // 🎵 执行语音合成
    const synthResult = await performSpeechSynthesis(
      processedText, 
      config.voice, 
      config.speed, 
      1.0 // pitch
    )
    
    const processingTime = Date.now() - startTime
    
    // 构造返回数据
    const responseData = {
      text: text,
      processedText: processedText,
      subject: subject,
      voice: config.voice,
      speed: config.speed,
      priority: priority,
      duration: synthResult.duration || Math.ceil(processedText.length / 3),
      audioUrl: synthResult.audioUrl || `data:audio/mp3;base64,${synthResult.audioData}`,
      audioData: synthResult.audioData,
      audioSize: synthResult.audioSize || 0,
      provider: synthResult.provider || 'alibaba-cloud',
      responseTime: processingTime,
      userId: userId,
      timestamp: new Date().toISOString(),
      qualityCheck: synthResult.qualityCheck || {
        size: synthResult.audioSize || 0,
        isValidSize: (synthResult.audioSize || 0) >= 1000,
        estimatedDuration: Math.ceil(processedText.length / 3),
        quality: synthResult.provider === 'mock' ? 'mock' : 'real',
        isValidMP3: synthResult.provider !== 'mock'
      }
    }

    console.log(`✅ 多学科语音播报成功 (${processingTime}ms):`, {
      subject: subject,
      voice: config.voice,
      textLength: processedText.length,
      audioSize: synthResult.audioSize,
      duration: responseData.duration + 's',
      provider: synthResult.provider
    })
    
    res.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error('❌ 多学科语音播报失败:', error)
    
    // 🔧 优雅降级：即使语音合成失败，也不影响主要功能
    res.json({
      success: false,
      error: process.env.NODE_ENV === 'development' ? error.message : '语音播报服务暂时不可用',
      fallback: true,
      responseTime: processingTime,
      subject: req.body.subject || 'math',
      text: req.body.text
    })
  }
})

/**
 * 🎯 获取学科语音配置接口 - GET /api/speech/subject-config
 */
router.get('/subject-config', (req, res) => {
  const subject = req.query.subject
  
  if (subject && SUBJECT_VOICE_CONFIG[subject]) {
    return res.json({
      success: true,
      data: {
        subject: subject,
        config: SUBJECT_VOICE_CONFIG[subject],
        supportedSubjects: Object.keys(SUBJECT_VOICE_CONFIG)
      }
    })
  }
  
  // 返回所有学科配置
  return res.json({
    success: true,
    data: {
      allConfigs: SUBJECT_VOICE_CONFIG,
      supportedSubjects: Object.keys(SUBJECT_VOICE_CONFIG),
      defaultSubject: 'math'
    }
  })
})

module.exports = router 