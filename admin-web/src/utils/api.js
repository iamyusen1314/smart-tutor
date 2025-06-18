/**
 * API服务 - 连接后端接口
 */

const BASE_URL = 'http://localhost:3000'

class ApiService {
  constructor() {
    this.baseURL = BASE_URL
  }

  /**
   * 通用请求方法
   */
  async request(url, options = {}) {
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    // 添加认证token
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    try {
      const response = await fetch(`${this.baseURL}${url}`, config)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('API请求失败:', error)
      throw error
    }
  }

  /**
   * GET请求
   */
  get(url, params = {}) {
    const query = new URLSearchParams(params).toString()
    const fullUrl = query ? `${url}?${query}` : url
    return this.request(fullUrl)
  }

  /**
   * POST请求
   */
  post(url, data = {}) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  /**
   * PUT请求
   */
  put(url, data = {}) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  /**
   * DELETE请求
   */
  delete(url) {
    return this.request(url, {
      method: 'DELETE'
    })
  }

  // ==================== 具体API方法 ====================

  /**
   * 健康检查
   */
  healthCheck() {
    return this.get('/health')
  }

  /**
   * 教材管理相关
   */
  materials = {
    // 获取统计信息
    getStats: () => this.get('/api/materials/stats'),
    
    // 搜索教材
    search: (params) => this.get('/api/materials/search', params),
    
    // 上传教材
    upload: (formData) => {
      return fetch(`${this.baseURL}/api/materials/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      }).then(res => res.json())
    }
  }

  /**
   * 题目管理相关（现在主要展示AI生成的题目）
   */
  questions = {
    // 获取统计信息
    getStats: () => this.get('/api/questions/stats'),
    
    // 获取题目列表（支持AI生成筛选）
    getList: (params) => this.get('/api/questions/list', params),
    
    // 获取题目详情
    getDetail: (id) => this.get(`/api/questions/${id}`),
    
    // 创建题目（手动创建，但不推荐）
    create: (data) => this.post('/api/questions', data),
    
    // 更新题目
    update: (id, data) => this.put(`/api/questions/${id}`, data),
    
    // 删除题目
    delete: (id) => this.delete(`/api/questions/${id}`),
    
    // 测试接口
    test: () => this.get('/api/questions/test')
  }

  /**
   * AI题目生成系统相关
   */
  aiGenerator = {
    // 生成练习题
    generatePractice: (data) => this.post('/api/ai-generator/generate-practice', data),
    
    // 重新生成题目
    regenerateQuestion: (data) => this.post('/api/ai-generator/regenerate', data),
    
    // 获取生成历史
    getGenerationHistory: (params) => this.get('/api/ai-generator/history', params),
    
    // 获取生成统计
    getGenerationStats: (params) => this.get('/api/ai-generator/stats', params),
    
    // 获取AI配置
    getConfig: () => this.get('/api/ai-generator/config'),
    
    // 更新AI配置
    updateConfig: (data) => this.put('/api/ai-generator/config', data),
    
    // 测试AI生成
    testGeneration: (data) => this.post('/api/ai-generator/test', data)
  }

  /**
   * 用户管理相关
   */
  users = {
    // 获取统计信息
    getStats: () => this.get('/api/users/stats'),
    
    // 获取用户列表
    getList: (params) => this.get('/api/users/list', params),
    
    // 获取用户详情
    getDetail: (id) => this.get(`/api/users/${id}`),
    
    // 获取用户学习档案
    getProfile: (id) => this.get(`/api/users/${id}/profile`),
    
    // 获取用户学习历史
    getLearningHistory: (id, params) => this.get(`/api/users/${id}/learning-history`, params),
    
    // 创建用户
    create: (data) => this.post('/api/users', data),
    
    // 更新用户
    update: (id, data) => this.put(`/api/users/${id}`, data),
    
    // 删除用户
    delete: (id) => this.delete(`/api/users/${id}`)
  }

  /**
   * 数据分析相关（增强了AI分析功能）
   */
  analytics = {
    // 获取学习报告
    getReports: (params) => this.get('/api/report/history', params),
    
    // 获取学习统计
    getStatistics: (params) => this.get('/api/report/statistics', params),
    
    // 获取今日报告
    getTodayReport: (params) => this.get('/api/report/today', params),
    
    // 获取AI生成统计
    getAIGenerationStats: (params) => this.get('/api/analytics/ai-generation-stats', params),
    
    // 获取AI洞察分析
    getAIInsights: (params) => this.get('/api/analytics/ai-insights', params),
    
    // 获取学习模式分析
    getLearningPatterns: (params) => this.get('/api/analytics/learning-patterns', params),
    
    // 获取知识点掌握情况
    getKnowledgePoints: (params) => this.get('/api/analytics/knowledge-points', params),
    
    // 获取学习效果趋势
    getLearningTrends: (params) => this.get('/api/analytics/learning-trends', params)
  }

  /**
   * 游戏化系统相关
   */
  game = {
    // 获取用户档案
    getProfile: (userId) => this.get('/api/game/profile', { userId }),
    
    // 获取排行榜
    getLeaderboard: (params) => this.get('/api/game/leaderboard', params),
    
    // 获取任务列表
    getTasks: (userId) => this.get('/api/game/tasks', { userId }),
    
    // 获取宠物信息
    getPet: (userId) => this.get('/api/game/pet', { userId })
  }

  /**
   * OCR相关
   */
  ocr = {
    // 获取OCR状态
    getStatus: () => this.get('/api/ocr/status'),
    
    // OCR识别
    recognize: (formData) => {
      return fetch(`${this.baseURL}/api/ocr/recognize`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      }).then(res => res.json())
    }
  }

  /**
   * 学习计划相关
   */
  plan = {
    // 创建学习计划（传统方法，作为fallback）
    create: (data) => this.post('/api/plan/create', data),
    
    // 获取学习计划
    getDetail: (id) => this.get(`/api/plan/${id}`),
    
    // 获取学习计划列表
    getList: (params) => this.get('/api/plan/list', params)
  }

  /**
   * AI模型管理相关
   */
  aiModels = {
    // 获取模型概览
    getOverview: () => this.get('/api/ai-models/overview'),
    
    // 获取训练数据统计
    getTrainingData: () => this.get('/api/ai-models/training-data'),
    
    // 获取成本分析
    getCostAnalysis: () => this.get('/api/ai-models/cost-analysis'),
    
    // 获取提示词模板
    getPromptTemplates: () => this.get('/api/ai-models/prompt-templates'),
    
    // 创建提示词模板
    createPromptTemplate: (data) => this.post('/api/ai-models/prompt-templates', data),
    
    // 更新提示词模板
    updatePromptTemplate: (id, data) => this.put(`/api/ai-models/prompt-templates/${id}`, data),
    
    // 删除提示词模板
    deletePromptTemplate: (id) => this.delete(`/api/ai-models/prompt-templates/${id}`),
    
    // 测试提示词模板
    testPromptTemplate: (id, data) => this.post(`/api/ai-models/prompt-templates/${id}/test`, data),
    
    // 获取模型性能指标
    getPerformanceMetrics: (params) => this.get('/api/ai-models/performance-metrics', params),
    
    // 获取模型使用统计
    getUsageStats: (params) => this.get('/api/ai-models/usage-stats', params)
  }
}

// 创建API实例
const api = new ApiService()

export { ApiService }
export default api 