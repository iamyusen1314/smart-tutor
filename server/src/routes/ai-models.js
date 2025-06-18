/**
 * AI模型管理路由
 * @description 提供千问模型的监控、训练数据管理、成本分析等功能
 */

const express = require('express')
const router = express.Router()

// 模拟数据存储（实际项目中应使用数据库）
let modelMetrics = {
  'qwen-turbo': {
    name: 'qwen-turbo',
    displayName: 'Qwen Turbo',
    status: 'active',
    dailyStats: {
      calls: 1247,
      avgResponseTime: 580,
      successRate: 99.2,
      cost: 15.6,
      errors: []
    },
    monthlyStats: {
      totalCalls: 38420,
      totalCost: 456.8,
      avgResponseTime: 620
    }
  },
  'qwen-plus': {
    name: 'qwen-plus',
    displayName: 'Qwen Plus',
    status: 'active',
    dailyStats: {
      calls: 856,
      avgResponseTime: 1450,
      successRate: 98.8,
      cost: 42.3,
      errors: []
    },
    monthlyStats: {
      totalCalls: 24680,
      totalCost: 1234.5,
      avgResponseTime: 1380
    }
  },
  'qwen-max': {
    name: 'qwen-max',
    displayName: 'Qwen Max',
    status: 'active',
    dailyStats: {
      calls: 324,
      avgResponseTime: 4200,
      successRate: 97.5,
      cost: 89.7,
      errors: []
    },
    monthlyStats: {
      totalCalls: 8950,
      totalCost: 2678.9,
      avgResponseTime: 4150
    }
  },
  // 🔑 新增 OCR 专用模型
  'qwen-vl-ocr-latest': {
    name: 'qwen-vl-ocr-latest',
    displayName: 'Qwen VL OCR Latest',
    type: 'vision-ocr',
    status: 'active',
    description: '专业OCR识别模型，支持数学题目识别',
    capabilities: ['图片识别', '文字提取', '数学公式识别', '手写识别'],
    dailyStats: {
      calls: 428,
      avgResponseTime: 2350,
      successRate: 96.8,
      cost: 32.4,
      avgConfidence: 0.87,
      errors: []
    },
    monthlyStats: {
      totalCalls: 12840,
      totalCost: 972.6,
      avgResponseTime: 2280,
      avgConfidence: 0.85
    },
    specifications: {
      maxPixels: 6422528,
      minPixels: 3136,
      supportedFormats: ['JPEG', 'PNG', 'WebP'],
      maxFileSize: '10MB',
      autoRotation: true,
      specialFeatures: [
        '数学表达式优化',
        '智能错误修正',
        '置信度评估',
        '多行文本处理'
      ]
    }
  }
}

// 训练数据统计
let trainingDataStats = {
  totalSamples: 15624,
  qualityScore: 8.7,
  subjectCoverage: {
    math: 45,
    chinese: 35,
    english: 20
  },
  dataQuality: {
    completeness: 92,
    accuracy: 89,
    naturalness: 94,
    educational: 87,
    safety: 98
  },
  lastUpdated: new Date().toISOString()
}

// 提示词模板
let promptTemplates = [
  {
    id: 1,
    name: '数学解题引导',
    subject: 'math',
    content: `你是一位耐心的小学数学老师。请仔细观察这道数学题，我们一步步来分析：

1. 首先读懂题目，找出已知条件
2. 确定要求什么
3. 思考解题方法
4. 引导学生自己得出答案

记住：不要直接给出答案，而是启发学生思考。

题目：{question}
学生回答：{studentInput}

请给出引导性的回复：`,
    usage: 1247,
    lastModified: new Date().toISOString(),
    performance: {
      successRate: 94.2,
      avgRating: 4.6
    }
  },
  {
    id: 2,
    name: '语文阅读理解',
    subject: 'chinese',
    content: `你是一位经验丰富的小学语文老师。让我们一起来理解这篇文章：

1. 先整体阅读，了解大意
2. 分析文章结构
3. 理解重点词句
4. 体会作者情感
5. 联系生活实际

不要急于给答案，引导学生自己发现和理解。

文章内容：{content}
学生问题：{studentInput}

请给出循序渐进的引导：`,
    usage: 856,
    lastModified: new Date().toISOString(),
    performance: {
      successRate: 89.7,
      avgRating: 4.4
    }
  },
  {
    id: 3,
    name: '英语口语练习',
    subject: 'english',
    content: `You are a friendly English teacher for elementary students. Let's practice together!

Guidelines:
1. Use simple and clear language
2. Encourage students to speak
3. Correct mistakes gently
4. Make learning fun and interactive
5. Provide positive feedback

Student's input: {studentInput}
Topic: {topic}

Please respond encouragingly:`,
    usage: 432,
    lastModified: new Date().toISOString(),
    performance: {
      successRate: 91.3,
      avgRating: 4.7
    }
  }
]

// 成本分析数据
let costAnalysis = {
  monthly: {
    total: 1456.8,
    change: 8.5,
    breakdown: [
      { model: 'Qwen Max', amount: 756.3, percentage: 52, calls: 8950 },
      { model: 'Qwen Plus', amount: 478.2, percentage: 33, calls: 24680 },
      { model: 'Qwen Turbo', amount: 222.3, percentage: 15, calls: 38420 }
    ]
  },
  daily: {
    today: 147.6,
    yesterday: 135.8,
    change: 8.7
  },
  predictions: {
    nextMonth: 1589.2,
    confidence: 87
  }
}

/**
 * 获取AI模型概览信息
 * GET /api/ai-models/overview
 */
router.get('/overview', async (req, res) => {
  try {
    console.log('🤖 获取AI模型概览信息')
    
    // 模拟实时监控数据
    const overview = {
      // 模型状态
      modelStatus: {
        qwenTurbo: {
          name: 'qwen-turbo',
          type: 'text',
          status: 'active',
          responseTime: '0.5-1s',
          usage: '15%',
          successRate: 99.2,
          lastUsed: new Date().toISOString()
        },
        qwenPlus: {
          name: 'qwen-plus',
          type: 'text', 
          status: 'active',
          responseTime: '1-2s',
          usage: '33%',
          successRate: 98.8,
          lastUsed: new Date().toISOString()
        },
        qwenMax: {
          name: 'qwen-max',
          type: 'text',
          status: 'active', 
          responseTime: '3-8s',
          usage: '52%',
          successRate: 97.5,
          lastUsed: new Date().toISOString()
        },
        // 🔑 新增 OCR 模型状态
        qwenVlOcr: {
          name: 'qwen-vl-ocr-latest',
          type: 'vision-ocr',
          status: 'active',
          responseTime: '1.5-3s',
          usage: '68%',
          successRate: 96.8,
          avgConfidence: 0.87,
          todayRequests: 428,
          specializations: ['数学题目', '手写文字', '印刷文字'],
          lastUsed: new Date().toISOString(),
          upgrades: {
            enhancedPrompts: true,
            errorCorrection: true,
            confidenceScoring: true,
            mathOptimization: true
          }
        }
      },
      
      // 今日统计
      dailyStats: {
        totalRequests: 1247,
        successfulRequests: 1231,
        failedRequests: 16,
        averageResponseTime: '2.1s',
        costToday: 45.8,
        efficiency: 98.7
      },
      
      // 实时指标
      realTimeMetrics: {
        activeConnections: 12,
        queuedRequests: 3,
        processing: 8,
        systemLoad: 67,
        memoryUsage: 74,
        cpuUsage: 45
      }
    }
    
    res.json({
      success: true,
      data: overview
    })
    
  } catch (error) {
    console.error('获取AI模型概览失败:', error)
    res.status(500).json({
      success: false,
      message: '获取概览信息失败'
    })
  }
})

/**
 * 获取模型性能指标
 * GET /api/ai-models/performance
 */
router.get('/performance', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query
    console.log('📊 获取模型性能指标, 时间范围:', timeRange)
    
    // 生成模拟的时间序列数据
    const generateTimeSeriesData = (hours, baseValue, variance) => {
      const data = []
      const now = new Date()
      for (let i = hours; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000)
        const value = baseValue + (Math.random() - 0.5) * variance
        data.push({
          timestamp: timestamp.toISOString(),
          value: Math.max(0, parseFloat(value.toFixed(2)))
        })
      }
      return data
    }
    
    const performance = {
      responseTimeMetrics: {
        qwenTurbo: generateTimeSeriesData(24, 0.8, 0.4),
        qwenPlus: generateTimeSeriesData(24, 1.5, 0.6),
        qwenMax: generateTimeSeriesData(24, 5.2, 2.0)
      },
      
      successRateMetrics: {
        qwenTurbo: generateTimeSeriesData(24, 99.2, 2),
        qwenPlus: generateTimeSeriesData(24, 98.8, 2.5),
        qwenMax: generateTimeSeriesData(24, 97.5, 3)
      },
      
      usageDistribution: {
        qwenTurbo: 15,
        qwenPlus: 33,
        qwenMax: 52
      },
      
      // 性能趋势分析
      trends: {
        responseTimeImprovement: 6.8, // 响应时间改善百分比
        successRateChange: 1.2,       // 成功率变化
        efficiencyGain: 15.6          // 效率提升
      }
    }
    
    res.json({
      success: true,
      data: performance
    })
    
  } catch (error) {
    console.error('获取性能指标失败:', error)
    res.status(500).json({
      success: false,
      message: '获取性能指标失败'
    })
  }
})

/**
 * 获取成本分析数据
 * GET /api/ai-models/cost-analysis
 */
router.get('/cost-analysis', async (req, res) => {
  try {
    const { period = 'month' } = req.query
    console.log('💰 获取成本分析数据, 周期:', period)
    
    const costAnalysis = {
      // 本月成本概览
      monthlyCosts: {
        total: 1456.8,
        breakdown: {
          qwenMax: 756.8,    // 52%
          qwenPlus: 480.7,   // 33%
          qwenTurbo: 219.3   // 15%
        },
        lastMonth: 1623.4,
        changePercentage: -10.3
      },
      
      // 每日成本趋势
      dailyCostTrend: [
        { date: '2025-06-07', cost: 42.3 },
        { date: '2025-06-08', cost: 38.7 },
        { date: '2025-06-09', cost: 51.2 },
        { date: '2025-06-10', cost: 45.8 },
        { date: '2025-06-11', cost: 49.3 },
        { date: '2025-06-12', cost: 44.1 },
        { date: '2025-06-13', cost: 47.6 },
        { date: '2025-06-14', cost: 45.8 }
      ],
      
      // 成本优化建议
      optimizations: [
        {
          type: 'model_selection',
          title: '智能模型选择优化',
          description: '简单查询使用turbo模型可节省39%成本',
          potentialSaving: 568.2,
          priority: 'high'
        },
        {
          type: 'caching',
          title: '响应缓存机制',
          description: '相似问题缓存可减少重复调用',
          potentialSaving: 234.5,
          priority: 'medium'
        },
        {
          type: 'batching',
          title: '批量处理优化',
          description: '批量请求可降低单次调用成本',
          potentialSaving: 156.3,
          priority: 'low'
        }
      ],
      
      // 使用效率分析
      efficiency: {
        requestsPerDollar: 27.2,
        averageCostPerRequest: 0.037,
        peakHours: ['09:00-11:00', '14:00-16:00', '19:00-21:00'],
        recommendedUsagePattern: 'off_peak_scheduling'
      }
    }
    
    res.json({
      success: true,
      data: costAnalysis
    })
    
  } catch (error) {
    console.error('获取成本分析失败:', error)
    res.status(500).json({
      success: false,
      message: '获取成本分析失败'
    })
  }
})

/**
 * 🔑 获取OCR模型详细信息
 * GET /api/ai-models/ocr-details
 */
router.get('/ocr-details', async (req, res) => {
  try {
    console.log('🔍 获取OCR模型详细信息')
    
    const ocrDetails = {
      model: {
        name: 'qwen-vl-ocr-latest',
        displayName: 'Qwen VL OCR Latest',
        version: 'v2.5.0',
        releaseDate: '2025-06-01',
        description: '阿里云最新专业OCR识别模型，针对教育场景深度优化',
        provider: 'Alibaba Cloud DashScope'
      },
      
      // 🎯 性能指标
      performance: {
        accuracy: {
          overall: 96.8,
          handwritten: 94.2,
          printed: 98.5,
          mathematical: 95.7,
          chinese: 97.1,
          english: 96.3
        },
        speed: {
          avgResponseTime: 2.35,
          p95ResponseTime: 4.2,
          p99ResponseTime: 6.8
        },
        reliability: {
          uptime: 99.9,
          errorRate: 3.2,
          timeoutRate: 1.1
        }
      },
      
      // 🔧 技术规格
      specifications: {
        imageProcessing: {
          maxPixels: 6422528,  // 6.4M pixels
          minPixels: 3136,     // 56x56
          maxFileSize: '10MB',
          supportedFormats: ['JPEG', 'PNG', 'WebP', 'BMP'],
          compressionSupport: true,
          autoRotation: true
        },
        textProcessing: {
          languages: ['中文', '英文', '数学符号'],
          maxOutputLength: 2000,
          lineBreakHandling: true,
          noiseFiltering: true,
          errorCorrection: true
        }
      },
      
      // 📊 使用统计
      usageStats: {
        today: {
          requests: 428,
          successCount: 414,
          failureCount: 14,
          avgConfidence: 0.87,
          subjects: {
            math: 312,      // 73%
            chinese: 89,    // 21%
            english: 27     // 6%
          }
        },
        thisMonth: {
          totalRequests: 12840,
          avgConfidence: 0.85,
          improvements: {
            accuracyGain: '+8.5%',
            speedImprovement: '+12.3%',
            errorReduction: '-24.7%'
          }
        }
      },
      
      // ✨ 增强功能
      enhancements: {
        intelligentPrompts: {
          enabled: true,
          description: '针对数学题目的智能提示词优化',
          improveAccuracy: '+15%'
        },
        errorCorrection: {
          enabled: true,
          description: '智能修正常见OCR错误（O/0, I/1混淆等）',
          errorReduction: '67%'
        },
        confidenceScoring: {
          enabled: true,
          description: '基于多维度的置信度评估系统',
          accuracy: '92%'
        },
        mathOptimization: {
          enabled: true,
          description: '数学表达式和符号的专门优化',
          mathAccuracy: '+22%'
        }
      },
      
      // 🎓 教育场景优化
      educationOptimizations: {
        subjectSpecific: {
          math: {
            operators: ['×', '÷', '+', '-', '='],
            fractions: true,
            equations: true,
            geometrySymbols: true
          },
          chinese: {
            handwriting: true,
            punctuation: true,
            traditionalCharacters: false
          },
          english: {
            vocabularyLevel: 'elementary',
            grammarPatterns: true,
            pronunciationMarks: false
          }
        },
        qualityFilters: {
          noiseReduction: 89,
          textCleaning: 94,
          formatPreservation: 91
        }
      },
      
      // 💰 成本分析
      costAnalysis: {
        pricePerRequest: 0.076,
        dailyCost: 32.4,
        monthlyCost: 972.6,
        costEfficiency: 'high',
        comparison: {
          generalOCR: '-45% cost',
          competitorA: '-23% cost',
          competitorB: '-31% cost'
        }
      }
    }
    
    res.json({
      success: true,
      data: ocrDetails
    })
    
  } catch (error) {
    console.error('获取OCR模型详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取OCR模型详情失败'
    })
  }
})

/**
 * 获取提示词模板列表
 * GET /api/ai-models/prompt-templates
 */
router.get('/prompt-templates', async (req, res) => {
  try {
    console.log('📝 获取提示词模板列表')
    
    const templates = [
      {
        id: 'math_guidance',
        name: '数学引导模板',
        subject: 'math',
        description: '用于数学题目的分步引导，不直接给答案',
        template: `你是一名专业的数学老师，正在引导小学生解题。

题目：{question}
学生输入：{student_input}

请按照以下原则回复：
1. 不要直接给出答案
2. 提供思路提示和引导
3. 鼓励学生独立思考
4. 使用简单易懂的语言
5. 可以提供具体的计算步骤指导

请给出引导性回复：`,
        usage: 1247,
        successRate: 94.2,
        lastUsed: new Date().toISOString(),
        createdAt: '2025-05-15T00:00:00Z'
      },
      {
        id: 'chinese_reading',
        name: '语文阅读理解模板',
        subject: 'chinese',
        description: '用于语文阅读理解题目的引导',
        template: `你是一名语文老师，正在帮助学生理解阅读材料。

文章内容：{passage}
问题：{question}
学生回答：{student_input}

请引导学生：
1. 理解文章主要内容
2. 分析关键词句
3. 培养阅读理解能力
4. 不直接给出答案

请给出引导性回复：`,
        usage: 823,
        successRate: 91.7,
        lastUsed: new Date().toISOString(),
        createdAt: '2025-05-10T00:00:00Z'
      },
      {
        id: 'english_practice',
        name: '英语练习模板',
        subject: 'english',
        description: '用于英语学习的对话练习',
        template: `You are an English teacher helping elementary students practice English.

Question: {question}
Student's response: {student_input}

Please guide the student by:
1. Correcting mistakes gently
2. Providing pronunciation tips
3. Encouraging practice
4. Using simple English

Respond in a helpful and encouraging way:`,
        usage: 456,
        successRate: 88.9,
        lastUsed: new Date().toISOString(),
        createdAt: '2025-05-08T00:00:00Z'
      },
      // 🔑 新增 OCR 识别模板
      {
        id: 'ocr_math_enhanced',
        name: '增强数学OCR识别模板',
        subject: 'ocr',
        description: '专业数学题目OCR识别，支持手写和印刷文字',
        template: `你是一个专业的OCR识别专家。请仔细识别这张图片中的所有文字内容，特别注意：

1. 🔢 数学题目：请完整识别数学表达式、运算符号、数字
2. ✏️ 手写文字：请识别手写的数字、汉字和英文
3. 📝 印刷文字：请识别印刷体文字内容  
4. 📐 图形标注：注意几何图形中的标注文字
5. 📋 表格内容：如果有表格，请逐行识别

请按以下格式输出：
- 每行一个完整的题目或文本内容
- 保持数学表达式的完整性
- 如果是选择题，包含选项内容
- 忽略明显的噪点或无意义字符

开始识别：`,
        usage: 428,
        successRate: 96.8,
        avgConfidence: 0.87,
        lastUsed: new Date().toISOString(),
        createdAt: '2025-06-15T00:00:00Z',
        enhancements: [
          'smart_error_correction',
          'confidence_scoring',
          'math_optimization',
          'multi_language_support'
        ]
      },
      {
        id: 'ocr_general_text',
        name: '通用文字OCR识别模板',
        subject: 'ocr',
        description: '通用文字识别，适用于各种文档和图片',
        template: `请识别图片中的所有文字内容，包括：

1. 📄 文档内容：完整识别段落和结构
2. 🏷️ 标题标签：保持层次结构
3. 📊 表格数据：按行列组织
4. 🔖 注释说明：包含所有辅助信息

输出要求：
- 保持原有的文本格式和结构
- 准确识别标点符号
- 区分不同的文本区域
- 过滤噪音和无关字符

请开始识别：`,
        usage: 156,
        successRate: 94.2,
        avgConfidence: 0.83,
        lastUsed: new Date().toISOString(),
        createdAt: '2025-06-10T00:00:00Z',
        enhancements: [
          'structure_preservation',
          'noise_filtering',
          'format_detection'
        ]
      }
    ]
    
    res.json({
      success: true,
      data: {
        templates,
        statistics: {
          totalTemplates: templates.length,
          averageSuccessRate: 92.8, // 更新平均成功率
          totalUsage: templates.reduce((sum, t) => sum + t.usage, 0),
          // 🔑 按类别统计
          byCategory: {
            text: {
              count: 3,
              avgSuccessRate: 91.6,
              totalUsage: 2526
            },
            ocr: {
              count: 2,
              avgSuccessRate: 95.5,
              totalUsage: 584,
              avgConfidence: 0.85
            }
          },
          // 📊 最新功能
          latestEnhancements: [
            'OCR增强识别模板',
            '智能错误修正',
            '置信度评估',
            '数学专项优化'
          ]
        }
      }
    })
    
  } catch (error) {
    console.error('获取提示词模板失败:', error)
    res.status(500).json({
      success: false,
      message: '获取提示词模板失败'
    })
  }
})

/**
 * 创建或更新提示词模板
 * POST /api/ai-models/prompt-templates
 */
router.post('/prompt-templates', async (req, res) => {
  try {
    const { name, subject, description, template } = req.body
    console.log('💾 创建提示词模板:', name)
    
    // 验证输入
    if (!name || !subject || !template) {
      return res.status(400).json({
        success: false,
        message: '缺少必要字段'
      })
    }
    
    // 模拟保存模板
    const newTemplate = {
      id: `template_${Date.now()}`,
      name,
      subject,
      description: description || '',
      template,
      usage: 0,
      successRate: 0,
      lastUsed: null,
      createdAt: new Date().toISOString()
    }
    
    res.json({
      success: true,
      data: newTemplate,
      message: '提示词模板创建成功'
    })
    
  } catch (error) {
    console.error('创建提示词模板失败:', error)
    res.status(500).json({
      success: false,
      message: '创建模板失败'
    })
  }
})

/**
 * 获取训练数据统计
 * GET /api/ai-models/training-data
 */
router.get('/training-data', async (req, res) => {
  try {
    console.log('📚 获取训练数据统计')
    
    const trainingData = {
      // 对话数据统计
      dialogStatistics: {
        totalDialogs: 15624,
        qualityScore: 8.7,
        subjectCoverage: {
          math: 7832,      // 50.1%
          chinese: 4687,   // 30.0%  
          english: 3105    // 19.9%
        },
        averageLength: 3.4, // 平均对话轮数
        lastUpdated: new Date().toISOString()
      },
      
      // 数据质量分析
      qualityMetrics: {
        annotationAccuracy: 96.3,
        responseRelevance: 94.8,
        guidanceEffectiveness: 91.2,
        studentSatisfaction: 92.5
      },
      
      // 数据增长趋势
      growthTrend: [
        { date: '2025-05-01', count: 12450 },
        { date: '2025-05-08', count: 13120 },
        { date: '2025-05-15', count: 13890 },
        { date: '2025-05-22', count: 14567 },
        { date: '2025-05-29', count: 15234 },
        { date: '2025-06-05', count: 15489 },
        { date: '2025-06-12', count: 15624 }
      ],
      
      // 数据来源分析
      dataSources: {
        userInteractions: 78.5,    // 用户真实对话
        syntheticData: 12.3,       // AI生成数据
        expertAnnotation: 9.2      // 专家标注数据
      }
    }
    
    res.json({
      success: true,
      data: trainingData
    })
    
  } catch (error) {
    console.error('获取训练数据统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取训练数据失败'
    })
  }
})

/**
 * 获取模型配置参数
 * GET /api/ai-models/config
 */
router.get('/config', async (req, res) => {
  try {
    console.log('⚙️ 获取模型配置参数')
    
    const config = {
      modelParameters: {
        qwenTurbo: {
          temperature: 0.7,
          maxTokens: 1500,
          topP: 0.8,
          timeout: 3000,
          retryCount: 2
        },
        qwenPlus: {
          temperature: 0.8,
          maxTokens: 2000,
          topP: 0.9,
          timeout: 5000,
          retryCount: 3
        },
        qwenMax: {
          temperature: 0.9,
          maxTokens: 4000,
          topP: 0.95,
          timeout: 8000,
          retryCount: 3
        }
      },
      
      selectionStrategy: {
        simpleQuestions: 'qwen-turbo',
        normalQuestions: 'qwen-plus',
        complexQuestions: 'qwen-max',
        fallbackModel: 'qwen-plus'
      },
      
      optimizationSettings: {
        enableSmartRouting: true,
        enableResponseCaching: true,
        maxCacheSize: 1000,
        cacheExpiry: 3600
      }
    }
    
    res.json({
      success: true,
      data: config
    })
    
  } catch (error) {
    console.error('获取模型配置失败:', error)
    res.status(500).json({
      success: false,
      message: '获取配置失败'
    })
  }
})

/**
 * 更新模型配置参数
 * PUT /api/ai-models/config
 */
router.put('/config', async (req, res) => {
  try {
    const { modelParameters, selectionStrategy, optimizationSettings } = req.body
    console.log('🔧 更新模型配置参数')
    
    // 模拟保存配置
    // 在实际应用中，这里会将配置保存到数据库
    
    res.json({
      success: true,
      message: '配置更新成功',
      data: {
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin'
      }
    })
    
  } catch (error) {
    console.error('更新模型配置失败:', error)
    res.status(500).json({
      success: false,
      message: '更新配置失败'
    })
  }
})

module.exports = router 