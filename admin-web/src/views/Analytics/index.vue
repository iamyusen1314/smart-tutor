<template>
  <div class="analytics">
    <h2>📊 数据分析</h2>
    
    <div class="toolbar">
      <button class="btn-secondary" @click="testAnalyticsAPI">
        🔧 测试API
      </button>
      <button class="btn-secondary" @click="loadData">
        🔄 刷新数据
      </button>
    </div>

    <!-- 核心指标 -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-icon">📈</div>
        <div class="metric-info">
          <h3>学习报告总数</h3>
          <p class="metric-number">{{ metrics.totalReports || 0 }}</p>
          <span class="metric-trend">本月新增: {{ metrics.monthlyReports || 0 }}</span>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-icon">⏱️</div>
        <div class="metric-info">
          <h3>平均学习时长</h3>
          <p class="metric-number">{{ metrics.avgStudyTime || '0分钟' }}</p>
          <span class="metric-trend">较上月: {{ metrics.studyTimeChange || '+0%' }}</span>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-icon">🎯</div>
        <div class="metric-info">
          <h3>平均正确率</h3>
          <p class="metric-number">{{ metrics.avgAccuracy || '0%' }}</p>
          <span class="metric-trend">较上月: {{ metrics.accuracyChange || '+0%' }}</span>
        </div>
      </div>
      
      <div class="metric-card">
        <div class="metric-icon">📱</div>
        <div class="metric-info">
          <h3>今日活跃用户</h3>
          <p class="metric-number">{{ metrics.dailyActiveUsers || 0 }}</p>
          <span class="metric-trend">昨日: {{ metrics.yesterdayActiveUsers || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- 学科分析 -->
    <div class="subject-analysis">
      <h3>学科练习分析</h3>
      <div class="subject-grid">
        <div v-for="subject in subjectStats" :key="subject.name" class="subject-card">
          <div class="subject-header">
            <span class="subject-name">{{ subject.displayName }}</span>
            <span class="subject-percentage">{{ subject.percentage }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: subject.percentage + '%' }"></div>
          </div>
          <div class="subject-details">
            <span>练习次数: {{ subject.count }}</span>
            <span>平均分: {{ subject.avgScore }}分</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 最近报告 -->
    <div class="recent-reports">
      <h3>最近学习报告</h3>
      <div class="reports-list">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="recentReports.length === 0" class="empty">
          暂无报告数据
        </div>
        <div v-else>
          <div class="reports-header">
            <div class="col-user">用户</div>
            <div class="col-subject">科目</div>
            <div class="col-score">得分</div>
            <div class="col-time">时间</div>
            <div class="col-actions">操作</div>
          </div>
          <div v-for="report in recentReports" :key="report._id" class="report-item">
            <div class="col-user">
              <div class="user-info">
                <div class="user-avatar">{{ getAvatarText(report.userName) }}</div>
                <span>{{ report.userName || '匿名用户' }}</span>
              </div>
            </div>
            <div class="col-subject">
              <span class="subject-badge" :class="'subject-' + report.subject">
                {{ getSubjectName(report.subject) }}
              </span>
            </div>
            <div class="col-score">
              <span class="score" :class="getScoreClass(report.score)">
                {{ report.score || 0 }}分
              </span>
            </div>
            <div class="col-time">
              {{ formatDate(report.createdAt) }}
            </div>
            <div class="col-actions">
              <button @click="viewReport(report)" class="btn-view">查看</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 游戏化数据 -->
    <div class="game-stats">
      <h3>游戏化系统数据</h3>
      <div class="game-metrics">
        <div class="game-metric">
          <span class="metric-label">活跃宠物数量:</span>
          <span class="metric-value">{{ gameStats.activePets || 0 }}</span>
        </div>
        <div class="game-metric">
          <span class="metric-label">完成任务总数:</span>
          <span class="metric-value">{{ gameStats.completedTasks || 0 }}</span>
        </div>
        <div class="game-metric">
          <span class="metric-label">平均等级:</span>
          <span class="metric-value">{{ gameStats.avgLevel || 0 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../../utils/api'

export default {
  name: 'Analytics',
  data() {
    return {
      loading: false,
      metrics: {
        totalReports: 0,
        monthlyReports: 0,
        avgStudyTime: '0分钟',
        studyTimeChange: '+0%',
        avgAccuracy: '0%',
        accuracyChange: '+0%',
        dailyActiveUsers: 0,
        yesterdayActiveUsers: 0
      },
      subjectStats: [
        { name: 'math', displayName: '数学', count: 0, percentage: 0, avgScore: 0 },
        { name: 'chinese', displayName: '语文', count: 0, percentage: 0, avgScore: 0 },
        { name: 'english', displayName: '英语', count: 0, percentage: 0, avgScore: 0 }
      ],
      recentReports: [],
      gameStats: {
        activePets: 0,
        completedTasks: 0,
        avgLevel: 0
      }
    }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        await Promise.all([
          this.loadReports(),
          this.loadStatistics(),
          this.loadGameStats()
        ])
      } catch (error) {
        console.error('加载数据失败:', error)
      } finally {
        this.loading = false
      }
    },

    async loadReports() {
      try {
        const result = await api.analytics.getReports({ limit: 10 })
        this.recentReports = result.data || []
        this.metrics.totalReports = result.total || 0
      } catch (error) {
        console.error('加载报告数据失败:', error)
        this.recentReports = []
      }
    },

    async loadStatistics() {
      try {
        const result = await api.analytics.getStatistics()
        this.metrics = { ...this.metrics, ...result }
      } catch (error) {
        console.error('加载统计数据失败:', error)
      }
    },

    async loadGameStats() {
      try {
        // 模拟游戏化数据，实际需要调用相应API
        this.gameStats = {
          activePets: Math.floor(Math.random() * 100) + 50,
          completedTasks: Math.floor(Math.random() * 500) + 200,
          avgLevel: Math.floor(Math.random() * 10) + 5
        }
      } catch (error) {
        console.error('加载游戏化数据失败:', error)
      }
    },

    viewReport(report) {
      alert('查看报告详情功能待实现：' + report._id)
    },

    async testAnalyticsAPI() {
      try {
        const result = await api.analytics.getStatistics()
        alert('数据分析API测试成功！')
        console.log('API测试结果:', result)
      } catch (error) {
        alert('数据分析API测试失败！')
        console.error('API测试失败:', error)
      }
    },

    getAvatarText(name) {
      if (!name) return '?'
      return name.charAt(0).toUpperCase()
    },

    getSubjectName(subject) {
      const subjects = {
        math: '数学',
        chinese: '语文',
        english: '英语'
      }
      return subjects[subject] || subject
    },

    getScoreClass(score) {
      if (score >= 90) return 'excellent'
      if (score >= 80) return 'good'
      if (score >= 60) return 'fair'
      return 'poor'
    },

    formatDate(dateString) {
      if (!dateString) return '未知'
      return new Date(dateString).toLocaleString('zh-CN')
    }
  }
}
</script>

<style scoped>
.analytics {
  max-width: 1200px;
  margin: 0 auto;
}

.analytics h2 {
  margin-bottom: 20px;
  color: #2c3e50;
}

.toolbar {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
}

/* 核心指标 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
}

.metric-icon {
  font-size: 32px;
  margin-right: 16px;
}

.metric-info h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666;
}

.metric-number {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
}

.metric-trend {
  font-size: 12px;
  color: #27ae60;
}

/* 学科分析 */
.subject-analysis {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 30px;
}

.subject-analysis h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
}

.subject-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.subject-card {
  padding: 16px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
}

.subject-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.subject-name {
  font-weight: 600;
  color: #2c3e50;
}

.subject-percentage {
  color: #3498db;
  font-weight: 600;
}

.progress-bar {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: #3498db;
  transition: width 0.3s ease;
}

.subject-details {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

/* 最近报告 */
.recent-reports {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 30px;
}

.recent-reports h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
}

.reports-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: 15px;
  padding: 12px 0;
  border-bottom: 2px solid #e9ecef;
  font-weight: 600;
  color: #495057;
}

.report-item {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: 15px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #3498db;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.subject-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.subject-math {
  background: #e3f2fd;
  color: #1976d2;
}

.subject-chinese {
  background: #fce4ec;
  color: #c2185b;
}

.subject-english {
  background: #e8f5e8;
  color: #388e3c;
}

.score {
  font-weight: 600;
}

.score.excellent {
  color: #27ae60;
}

.score.good {
  color: #3498db;
}

.score.fair {
  color: #f39c12;
}

.score.poor {
  color: #e74c3c;
}

.btn-view {
  background: #17a2b8;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.loading, .empty {
  text-align: center;
  padding: 30px;
  color: #666;
}

/* 游戏化数据 */
.game-stats {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.game-stats h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
}

.game-metrics {
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
}

.game-metric {
  display: flex;
  gap: 10px;
}

.metric-label {
  color: #666;
}

.metric-value {
  font-weight: bold;
  color: #2c3e50;
}

@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .subject-grid {
    grid-template-columns: 1fr;
  }
  
  .reports-header,
  .report-item {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .game-metrics {
    flex-direction: column;
    gap: 15px;
  }
}
</style> 