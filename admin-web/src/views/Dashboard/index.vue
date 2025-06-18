<template>
  <div class="dashboard">
    <h2>📊 系统仪表板</h2>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-info">
          <h3>总用户数</h3>
          <p class="stat-number">{{ stats.totalUsers || 0 }}</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">📚</div>
        <div class="stat-info">
          <h3>题目总数</h3>
          <p class="stat-number">{{ stats.totalQuestions || 0 }}</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">📖</div>
        <div class="stat-info">
          <h3>教材数量</h3>
          <p class="stat-number">{{ stats.totalMaterials || 0 }}</p>
        </div>
      </div>
    </div>

    <div class="quick-actions">
      <h3>快速操作</h3>
      <div class="action-grid">
        <button class="action-btn" @click="$router.push('/questions')">
          <div class="action-icon">➕</div>
          <span>添加题目</span>
        </button>
        
        <button class="action-btn" @click="testBackend">
          <div class="action-icon">🔧</div>
          <span>测试后端</span>
        </button>
      </div>
    </div>

    <div class="system-status">
      <h3>系统状态</h3>
      <div class="status-item">
        <span>后端服务:</span>
        <span :class="systemStatus.backend">
          {{ systemStatus.backend === 'online' ? '🟢 正常' : '🔴 异常' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../../utils/api'

export default {
  name: 'Dashboard',
  data() {
    return {
      stats: {
        totalUsers: 0,
        totalQuestions: 0,
        totalMaterials: 0
      },
      systemStatus: {
        backend: 'offline'
      }
    }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    async loadData() {
      try {
        await this.checkSystemStatus()
      } catch (error) {
        console.error('加载数据失败:', error)
      }
    },
    
    async checkSystemStatus() {
      try {
        const health = await api.healthCheck()
        this.systemStatus.backend = 'online'
      } catch (error) {
        this.systemStatus.backend = 'offline'
      }
    },
    
    async testBackend() {
      try {
        const result = await api.healthCheck()
        alert('后端连接正常！')
        console.log('测试结果:', result)
      } catch (error) {
        alert('后端连接失败！')
        console.error('测试失败:', error)
      }
    }
  }
}
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard h2 {
  margin-bottom: 20px;
  color: #2c3e50;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
}

.stat-icon {
  font-size: 32px;
  margin-right: 16px;
}

.stat-info h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666;
}

.stat-number {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
}

.quick-actions {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 30px;
}

.quick-actions h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.action-btn {
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  text-align: center;
}

.action-btn:hover {
  background: #3498db;
  color: white;
}

.action-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.system-status {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.system-status h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
}

.status-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.online {
  color: #27ae60;
}

.offline {
  color: #e74c3c;
}
</style> 