<template>
  <div class="ai-models-container">
    <div class="page-header">
      <h1>🤖 AI模型管理</h1>
      <p>管理和监控AI模型的状态、性能与配置</p>
    </div>
    
    <!-- Tab切换 -->
    <div class="tab-navigation">
      <button @click="activeTab = 'overview'" :class="{ active: activeTab === 'overview' }">
        📊 监控概览
      </button>
      <button @click="activeTab = 'templates'" :class="{ active: activeTab === 'templates' }">
        📝 提示词模板
      </button>
      <button @click="activeTab = 'settings'" :class="{ active: activeTab === 'settings' }">
        ⚙️ 全局设置
      </button>
    </div>

    <!-- 内容区域 -->
    <div class="tab-content">
      <!-- 监控概览 Tab -->
      <div v-if="activeTab === 'overview'">
        <div class="overview-section">
          <!-- 实时指标卡片 -->
          <div class="metrics-row">
            <div class="metric-card">
              <div class="metric-icon">🔥</div>
              <div class="metric-info">
                <div class="metric-value">{{ overviewData.dailyStats?.totalRequests || 0 }}</div>
                <div class="metric-label">今日请求总数</div>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">⚡</div>
              <div class="metric-info">
                <div class="metric-value">{{ overviewData.dailyStats?.averageResponseTime || '0s' }}</div>
                <div class="metric-label">平均响应时间</div>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">💰</div>
              <div class="metric-info">
                <div class="metric-value">¥{{ overviewData.dailyStats?.costToday || 0 }}</div>
                <div class="metric-label">今日成本</div>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">📈</div>
              <div class="metric-info">
                <div class="metric-value">{{ overviewData.dailyStats?.efficiency || 0 }}%</div>
                <div class="metric-label">系统效率</div>
              </div>
            </div>
          </div>

          <!-- 模型状态监控 -->
          <div class="models-status-section">
            <h3>🤖 千问模型实时状态</h3>
            <div class="models-grid">
              <div 
                v-for="(model, key) in overviewData.modelStatus" 
                :key="key"
                class="model-status-card"
              >
                <div class="model-header">
                  <h4>{{ model.displayName || model.name }}</h4>
                  <span :class="['status-badge', model.status]">
                    {{ model.status === 'active' ? '🟢 正常' : '🔴 异常' }}
                  </span>
                </div>
                <div class="model-metrics">
                  <div class="model-metric">
                    <span class="metric-name">响应时间:</span>
                    <span class="metric-val">{{ model.responseTime }}</span>
                  </div>
                  <div class="model-metric">
                    <span class="metric-name">使用率:</span>
                    <span class="metric-val">{{ model.usage }}</span>
                  </div>
                  <div class="model-metric">
                    <span class="metric-name">成功率:</span>
                    <span class="metric-val">{{ model.successRate }}%</span>
                  </div>
                  <div class="model-metric">
                    <span class="metric-name">最后使用:</span>
                    <span class="metric-val">{{ formatTimeAgo(model.lastUsed) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 系统监控 -->
          <div class="system-monitor-section">
            <h3>🖥️ 系统实时监控</h3>
            <div class="monitor-grid">
              <div class="monitor-item">
                <div class="monitor-label">活跃连接</div>
                <div class="monitor-value">{{ overviewData.realTimeMetrics?.activeConnections || 0 }}</div>
              </div>
              <div class="monitor-item">
                <div class="monitor-label">排队请求</div>
                <div class="monitor-value">{{ overviewData.realTimeMetrics?.queuedRequests || 0 }}</div>
              </div>
              <div class="monitor-item">
                <div class="monitor-label">处理中</div>
                <div class="monitor-value">{{ overviewData.realTimeMetrics?.processing || 0 }}</div>
              </div>
              <div class="monitor-item">
                <div class="monitor-label">系统负载</div>
                <div class="monitor-value">{{ overviewData.realTimeMetrics?.systemLoad || 0 }}%</div>
              </div>
              <div class="monitor-item">
                <div class="monitor-label">内存使用</div>
                <div class="monitor-value">{{ overviewData.realTimeMetrics?.memoryUsage || 0 }}%</div>
              </div>
              <div class="monitor-item">
                <div class="monitor-label">CPU使用</div>
                <div class="monitor-value">{{ overviewData.realTimeMetrics?.cpuUsage || 0 }}%</div>
              </div>
            </div>
          </div>

          <!-- 操作区域 -->
          <div class="actions-section">
            <button @click="refreshOverviewData" :disabled="overviewLoading" class="refresh-btn">
              🔄 {{ overviewLoading ? '刷新中...' : '刷新数据' }}
            </button>
            <span class="last-update">
              最后更新: {{ lastUpdateTime }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- 提示词模板管理 Tab -->
      <div v-if="activeTab === 'templates'">
        <div class="templates-section">
          <div class="section-header">
            <h2>📝 基础提示词模板管理</h2>
            <button @click="showCreateTemplate = true" class="create-btn">
              ➕ 新建模板
            </button>
          </div>

          <!-- 科目过滤器 -->
          <div class="subject-filters">
            <button 
              v-for="subject in subjects" 
              :key="subject.key"
              @click="selectedSubject = subject.key"
              :class="['filter-btn', { active: selectedSubject === subject.key }]"
            >
              {{ subject.label }}
            </button>
          </div>

          <!-- 加载状态 -->
          <div v-if="templatesLoading" class="loading">
            ⏳ 正在加载模板...
          </div>

          <!-- 模板列表 -->
          <div v-else class="templates-grid">
            <div 
              v-for="template in filteredTemplates" 
              :key="template.id"
              class="template-card"
            >
              <div class="template-header">
                <h3>{{ template.name }}</h3>
                <span :class="['subject-badge', template.subject]">
                  {{ getSubjectLabel(template.subject) }}
                </span>
              </div>
              
              <p class="template-description">{{ template.description }}</p>
              
              <div class="template-stats">
                <span>📈 使用: {{ template.usage || 0 }}次</span>
                <span>✅ 成功率: {{ template.successRate || 0 }}%</span>
                <span>🕒 最后使用: {{ formatTimeAgo(template.lastUsed) }}</span>
              </div>
              
              <div class="template-preview">
                <strong>模板预览:</strong>
                <div class="template-content">{{ template.template?.substring(0, 100) || '' }}...</div>
              </div>
              
              <div class="template-actions">
                <button @click="editTemplate(template)" class="edit-btn">✏️ 编辑</button>
                <button @click="duplicateTemplate(template)" class="copy-btn">📋 复制</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 全局设置 Tab -->
      <div v-if="activeTab === 'settings'">
        <div class="settings-section">
          <div class="section-header">
            <h2>⚙️ 全局设置</h2>
            <button @click="saveSettings" :disabled="!hasSettingsChanged" class="save-btn">
              💾 保存设置
            </button>
          </div>

          <!-- 模型选择策略 -->
          <div class="settings-group">
            <h3>🎯 智能模型选择策略</h3>
            <div class="strategy-settings">
              <div class="setting-item">
                <label>简单问题使用模型:</label>
                <select v-model="settings.selectionStrategy.simpleQuestions">
                  <option value="qwen-turbo">千问-Turbo (快速)</option>
                  <option value="qwen-plus">千问-Plus (平衡)</option>
                  <option value="qwen-max">千问-Max (高质量)</option>
                </select>
              </div>
              <div class="setting-item">
                <label>普通问题使用模型:</label>
                <select v-model="settings.selectionStrategy.normalQuestions">
                  <option value="qwen-turbo">千问-Turbo (快速)</option>
                  <option value="qwen-plus">千问-Plus (平衡)</option>
                  <option value="qwen-max">千问-Max (高质量)</option>
                </select>
              </div>
              <div class="setting-item">
                <label>复杂问题使用模型:</label>
                <select v-model="settings.selectionStrategy.complexQuestions">
                  <option value="qwen-turbo">千问-Turbo (快速)</option>
                  <option value="qwen-plus">千问-Plus (平衡)</option>
                  <option value="qwen-max">千问-Max (高质量)</option>
                </select>
              </div>
              <div class="setting-item">
                <label>备用模型:</label>
                <select v-model="settings.selectionStrategy.fallbackModel">
                  <option value="qwen-turbo">千问-Turbo (快速)</option>
                  <option value="qwen-plus">千问-Plus (平衡)</option>
                  <option value="qwen-max">千问-Max (高质量)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 优化设置 -->
          <div class="settings-group">
            <h3>🚀 性能优化设置</h3>
            <div class="optimization-settings">
              <div class="setting-item checkbox">
                <input 
                  v-model="settings.optimizationSettings.enableSmartRouting" 
                  type="checkbox"
                  id="smartRouting"
                >
                <label for="smartRouting">启用智能路由</label>
                <small>根据问题复杂度自动选择合适的模型</small>
              </div>
              <div class="setting-item checkbox">
                <input 
                  v-model="settings.optimizationSettings.enableResponseCaching" 
                  type="checkbox"
                  id="responseCaching"
                >
                <label for="responseCaching">启用响应缓存</label>
                <small>缓存相似问题的回答以提高响应速度</small>
              </div>
              <div class="setting-item">
                <label>最大缓存大小:</label>
                <input 
                  v-model.number="settings.optimizationSettings.maxCacheSize" 
                  type="number" 
                  min="100" 
                  max="10000"
                  :disabled="!settings.optimizationSettings.enableResponseCaching"
                >
              </div>
              <div class="setting-item">
                <label>缓存过期时间 (秒):</label>
                <input 
                  v-model.number="settings.optimizationSettings.cacheExpiry" 
                  type="number" 
                  min="60" 
                  max="86400"
                  :disabled="!settings.optimizationSettings.enableResponseCaching"
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建/编辑模板弹窗 -->
    <div v-if="showCreateTemplate" class="modal-overlay" @click="closeCreateTemplate">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ editingTemplate ? '编辑模板' : '创建新模板' }}</h3>
          <button @click="closeCreateTemplate" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>模板名称:</label>
            <input v-model="templateForm.name" type="text" placeholder="请输入模板名称">
          </div>
          <div class="form-group">
            <label>适用科目:</label>
            <select v-model="templateForm.subject">
              <option value="math">数学</option>
              <option value="chinese">语文</option>
              <option value="english">英语</option>
            </select>
          </div>
          <div class="form-group">
            <label>模板描述:</label>
            <textarea v-model="templateForm.description" placeholder="请描述该模板的用途和特点"></textarea>
          </div>
          <div class="form-group">
            <label>提示词模板:</label>
            <textarea 
              v-model="templateForm.template" 
              placeholder="请输入提示词模板，使用 {question}, {student_input} 等占位符"
              rows="10"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeCreateTemplate" class="cancel-btn">取消</button>
          <button @click="saveTemplate" class="confirm-btn">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '@/utils/api'

// Tab管理
const activeTab = ref('overview')

// 监控概览相关
const overviewData = ref<any>({
  dailyStats: {
    totalRequests: 0,
    averageResponseTime: '0s',
    costToday: 0,
    efficiency: 0
  },
  modelStatus: {},
  realTimeMetrics: {
    activeConnections: 0,
    queuedRequests: 0,
    processing: 0,
    systemLoad: 0,
    memoryUsage: 0,
    cpuUsage: 0
  }
})
const overviewLoading = ref(false)
const lastUpdateTime = ref('')

// 提示词模板相关
const templates = ref<any[]>([])
const templatesLoading = ref(false)
const selectedSubject = ref('all')
const showCreateTemplate = ref(false)
const editingTemplate = ref<any>(null)

const subjects = [
  { key: 'all', label: '全部科目' },
  { key: 'math', label: '数学' },
  { key: 'chinese', label: '语文' },
  { key: 'english', label: '英语' }
]

const templateForm = ref({
  name: '',
  subject: 'math',
  description: '',
  template: ''
})

// 全局设置
const settings = ref<any>({
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
})

const originalSettings = ref<any>({})

// 计算属性
const filteredTemplates = computed(() => {
  if (selectedSubject.value === 'all') {
    return templates.value
  }
  return templates.value.filter(t => t.subject === selectedSubject.value)
})

const hasSettingsChanged = computed(() => {
  return JSON.stringify(settings.value) !== JSON.stringify(originalSettings.value)
})

// 方法
const loadTemplates = async () => {
  try {
    templatesLoading.value = true
    const response = await api.get('/api/ai-models/prompt-templates')
    if (response.success) {
      templates.value = response.data.templates
      console.log('加载模板成功:', templates.value.length, '个模板')
    }
  } catch (err) {
    console.error('加载模板失败:', err)
  } finally {
    templatesLoading.value = false
  }
}

const loadSettings = async () => {
  try {
    const response = await api.get('/api/ai-models/config')
    if (response.success) {
      settings.value = { ...response.data }
      originalSettings.value = JSON.parse(JSON.stringify(response.data))
      console.log('加载设置成功')
    }
  } catch (err) {
    console.error('加载设置失败:', err)
  }
}

const saveSettings = async () => {
  try {
    const response = await api.put('/api/ai-models/config', settings.value)
    if (response.success) {
      originalSettings.value = JSON.parse(JSON.stringify(settings.value))
      alert('设置保存成功!')
    } else {
      throw new Error(response.message || '保存失败')
    }
  } catch (err: any) {
    console.error('保存设置失败:', err)
    alert('保存设置失败: ' + err.message)
  }
}

const editTemplate = (template: any) => {
  editingTemplate.value = template
  templateForm.value = { ...template }
  showCreateTemplate.value = true
}

const duplicateTemplate = (template: any) => {
  templateForm.value = {
    name: template.name + ' (副本)',
    subject: template.subject,
    description: template.description,
    template: template.template
  }
  editingTemplate.value = null
  showCreateTemplate.value = true
}

const closeCreateTemplate = () => {
  showCreateTemplate.value = false
  editingTemplate.value = null
  templateForm.value = {
    name: '',
    subject: 'math',
    description: '',
    template: ''
  }
}

const saveTemplate = async () => {
  try {
    const response = await api.post('/api/ai-models/prompt-templates', templateForm.value)
    if (response.success) {
      await loadTemplates()
      closeCreateTemplate()
      alert('模板保存成功!')
    } else {
      throw new Error(response.message || '保存失败')
    }
  } catch (err: any) {
    console.error('保存模板失败:', err)
    alert('保存模板失败: ' + err.message)
  }
}

const getSubjectLabel = (subject: string) => {
  const labels: Record<string, string> = {
    'math': '数学',
    'chinese': '语文',
    'english': '英语'
  }
  return labels[subject] || subject
}

const formatTimeAgo = (timestamp: string) => {
  if (!timestamp) return '未知'
  const now = new Date().getTime()
  const time = new Date(timestamp).getTime()
  const diff = now - time
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

const refreshOverviewData = async () => {
  try {
    overviewLoading.value = true
    const response = await api.get('/api/ai-models/overview')
    if (response.success) {
      overviewData.value = response.data
      lastUpdateTime.value = response.data.lastUpdateTime
      console.log('刷新监控数据成功')
    }
  } catch (err) {
    console.error('刷新监控数据失败:', err)
  } finally {
    overviewLoading.value = false
  }
}

// 生命周期
onMounted(async () => {
  console.log('AI模型管理页面加载中...')
  await refreshOverviewData()
  await loadTemplates()
  await loadSettings()
})
</script>

<style scoped>
.ai-models-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
}

.page-header h1 {
  margin: 0;
  color: #333;
}

.page-header p {
  margin: 5px 0 0;
  color: #666;
}

.tab-navigation {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.tab-navigation button {
  padding: 12px 24px;
  border: none;
  background: #f5f5f5;
  cursor: pointer;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}

.tab-navigation button:hover {
  background: #e9ecef;
}

.tab-navigation button.active {
  background: #007bff;
  color: white;
}

.tab-content {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

/* 监控概览样式 */
.overview-section {
  padding: 0;
}

.metrics-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.metric-card:hover {
  transform: translateY(-2px);
}

.metric-icon {
  font-size: 24px;
  width: 50px;
  height: 50px;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-info {
  flex: 1;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.metric-label {
  font-size: 14px;
  opacity: 0.9;
}

.models-status-section {
  margin-bottom: 30px;
}

.models-status-section h3 {
  margin: 0 0 20px;
  color: #333;
  padding-bottom: 10px;
  border-bottom: 2px solid #007bff;
}

.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.model-status-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  transition: box-shadow 0.2s;
}

.model-status-card:hover {
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.model-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.model-header h4 {
  margin: 0;
  color: #333;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.status-badge.inactive {
  background: #f8d7da;
  color: #721c24;
}

.model-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.model-metric {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.metric-name {
  color: #666;
}

.metric-val {
  font-weight: 500;
  color: #333;
}

.system-monitor-section h3 {
  margin: 0 0 20px;
  color: #333;
  padding-bottom: 10px;
  border-bottom: 2px solid #28a745;
}

.monitor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.monitor-item {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  transition: all 0.2s;
}

.monitor-item:hover {
  background: #e9ecef;
  transform: translateY(-1px);
}

.monitor-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.monitor-value {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.actions-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.refresh-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #0056b3;
}

.refresh-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.last-update {
  font-size: 14px;
  color: #666;
}

/* 模板管理样式 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.section-header h2 {
  margin: 0;
  color: #333;
}

.create-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.create-btn:hover {
  background: #218838;
}

.subject-filters {
  display: flex;
  gap: 12px;
  margin-bottom: 25px;
}

.filter-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 20px;
  font-size: 14px;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #f8f9fa;
}

.filter-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
  gap: 25px;
}

.template-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  transition: box-shadow 0.2s;
}

.template-card:hover {
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.template-header h3 {
  margin: 0;
  color: #333;
  flex: 1;
}

.subject-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  color: white;
  margin-left: 10px;
}

.subject-badge.math { background: #007bff; }
.subject-badge.chinese { background: #28a745; }
.subject-badge.english { background: #dc3545; }

.template-description {
  color: #666;
  line-height: 1.5;
  margin-bottom: 15px;
}

.template-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin: 15px 0;
  font-size: 13px;
  color: #666;
}

.template-preview {
  margin: 15px 0;
}

.template-preview strong {
  display: block;
  margin-bottom: 8px;
  color: #333;
}

.template-content {
  background: white;
  padding: 12px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.4;
  max-height: 80px;
  overflow: hidden;
  border: 1px solid #e9ecef;
}

.template-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.edit-btn, .copy-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  transition: all 0.2s;
}

.edit-btn:hover {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.copy-btn:hover {
  background: #6c757d;
  color: white;
  border-color: #6c757d;
}

/* 设置样式 */
.settings-group {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 25px;
  margin-bottom: 25px;
}

.settings-group h3 {
  margin: 0 0 20px;
  color: #333;
}

.setting-item {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 15px;
}

.setting-item label {
  min-width: 180px;
  font-weight: 500;
  color: #333;
}

.setting-item select,
.setting-item input[type="number"] {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 200px;
  background: white;
}

.setting-item.checkbox {
  align-items: flex-start;
  flex-direction: column;
  gap: 8px;
}

.setting-item.checkbox input {
  margin-right: 8px;
}

.setting-item small {
  color: #666;
  font-size: 12px;
  margin-left: 30px;
}

.save-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.save-btn:hover:not(:disabled) {
  background: #218838;
}

.save-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 25px;
}

.modal-footer {
  padding: 20px 25px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 15px;
  justify-content: flex-end;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 14px;
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
  font-family: monospace;
  line-height: 1.4;
}

.cancel-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.cancel-btn:hover {
  background: #5a6268;
}

.confirm-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.confirm-btn:hover {
  background: #0056b3;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 16px;
}
</style> 