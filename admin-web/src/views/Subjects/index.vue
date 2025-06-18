<template>
  <div class="subjects-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1>🎓 科目管理</h1>
      <p>管理语文、数学、英语、科学四门核心科目</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card" @click="scrollToSubjects">
        <div class="stat-icon">📚</div>
        <div class="stat-info">
          <h3>{{ stats.totalSubjects }}</h3>
          <p>科目总数</p>
        </div>
      </div>
      <div class="stat-card" @click="scrollToSkills">
        <div class="stat-icon">🎯</div>
        <div class="stat-info">
          <h3>{{ stats.totalSkills }}</h3>
          <p>技能类型</p>
        </div>
      </div>
      <div class="stat-card" @click="scrollToGrades">
        <div class="stat-icon">📈</div>
        <div class="stat-info">
          <h3>{{ stats.totalGrades }}</h3>
          <p>年级覆盖</p>
        </div>
      </div>
      <div class="stat-card" @click="scrollToErrors">
        <div class="stat-icon">⚠️</div>
        <div class="stat-info">
          <h3>{{ stats.totalErrors }}</h3>
          <p>常见错误</p>
        </div>
      </div>
    </div>

    <!-- 科目列表 -->
    <div class="subjects-list" ref="subjectsSection">
      <h2>📋 科目详情</h2>
      <div class="subject-grid">
        <div 
          v-for="subject in subjects" 
          :key="subject.key"
          class="subject-card"
          @click="viewSubjectDetail(subject)"
        >
          <div class="subject-header">
            <span class="subject-icon">{{ subject.icon }}</span>
            <h3>{{ subject.name }}</h3>
            <span class="subject-status" :class="{ active: subject.isSupported }">
              {{ subject.isSupported ? '已启用' : '未启用' }}
            </span>
          </div>
          
          <div class="subject-description">
            {{ subject.description }}
          </div>
          
          <div class="subject-stats">
            <div class="stat-item">
              <span class="stat-label">年级范围:</span>
              <span class="stat-value">{{ subject.grades.join('、') }}年级</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">技能类型:</span>
              <span class="stat-value">{{ subject.skillCount }}种</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">常见错误:</span>
              <span class="stat-value">{{ subject.errorTypes }}类</span>
            </div>
          </div>
          
          <div class="subject-skills" ref="skillsSection">
            <h4>🎯 技能类型</h4>
            <div class="skill-tags">
              <span v-for="skill in subject.skillTypes" :key="skill" class="skill-tag">
                {{ skill }}
              </span>
            </div>
          </div>
          
          <div class="subject-errors" ref="errorsSection">
            <h4>⚠️ 常见错误</h4>
            <div class="error-tags">
              <span v-for="error in subject.commonErrors" :key="error" class="error-tag">
                {{ error }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 年级分布图表 -->
    <div class="grade-distribution" ref="gradesSection">
      <h2>📊 年级分布</h2>
      <div class="grade-chart">
        <div v-for="grade in [1,2,3,4,5,6]" :key="grade" class="grade-bar">
          <div class="grade-label">{{ grade }}年级</div>
          <div class="grade-subjects">
            <span 
              v-for="subject in getSubjectsForGrade(grade)" 
              :key="subject.key"
              class="grade-subject"
              :style="{ backgroundColor: getSubjectColor(subject.key) }"
            >
              {{ subject.icon }} {{ subject.name }}
            </span>
          </div>
          <div class="grade-count">{{ getSubjectsForGrade(grade).length }}门</div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>正在加载科目信息...</p>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      <p>❌ {{ error }}</p>
      <button @click="loadSubjects" class="retry-btn">重试</button>
    </div>
  </div>
</template>

<script>
import api from '../../utils/api'

export default {
  name: 'Subjects',
  data() {
    return {
      loading: false,
      error: null,
      subjects: [],
      
      // 统计数据
      stats: {
        totalSubjects: 0,
        totalSkills: 0, 
        totalGrades: 0,
        totalErrors: 0
      }
    }
  },
  
  async mounted() {
    await this.loadSubjects()
  },
  
  methods: {
    /**
     * 加载科目数据
     */
    async loadSubjects() {
      this.loading = true
      this.error = null
      
      try {
        console.log('🎓 开始加载科目数据...')
        
        // 添加请求地址日志
        const apiUrl = '/api/ai-chat/subjects'
        console.log('📡 请求地址:', apiUrl)
        
        const response = await api.get(apiUrl)
        console.log('📦 API响应:', response)
        
        // 更健壮的数据处理
        if (!response) {
          throw new Error('API响应为空')
        }
        
        if (!response.data) {
          throw new Error('API响应数据为空')
        }
        
        console.log('📊 响应数据结构:', {
          hasData: !!response.data,
          hasSuccess: !!response.data.success,
          successValue: response.data.success,
          hasDataData: !!(response.data.data),
          hasSubjects: !!(response.data.data && response.data.data.subjects),
          subjectsLength: response.data.data && response.data.data.subjects ? response.data.data.subjects.length : 0
        })
        
        // 检查响应格式
        if (response.data.success === true) {
          // 方式1：标准响应格式 { success: true, data: { subjects: [...] } }
          if (response.data.data && response.data.data.subjects) {
            this.subjects = response.data.data.subjects
            console.log('✅ 使用标准格式加载科目数据:', this.subjects.length, '个科目')
          } else {
            throw new Error('响应数据中缺少subjects字段')
          }
        } else if (Array.isArray(response.data)) {
          // 方式2：直接返回数组 [...]
          this.subjects = response.data
          console.log('✅ 使用数组格式加载科目数据:', this.subjects.length, '个科目')
        } else if (response.data.subjects) {
          // 方式3：直接在data中 { subjects: [...] }
          this.subjects = response.data.subjects
          console.log('✅ 使用直接格式加载科目数据:', this.subjects.length, '个科目')
        } else {
          console.error('❌ 未知的数据格式:', response.data)
          throw new Error(`科目数据格式错误: ${JSON.stringify(response.data).substring(0, 200)}...`)
        }
        
        // 验证科目数据
        if (!Array.isArray(this.subjects)) {
          throw new Error('科目数据不是数组格式')
        }
        
        if (this.subjects.length === 0) {
          console.warn('⚠️ 科目数据为空')
        }
        
        // 验证科目数据结构
        this.subjects.forEach((subject, index) => {
          if (!subject.key || !subject.name) {
            console.warn(`⚠️ 科目 ${index} 缺少必要字段:`, subject)
          }
        })
        
        this.calculateStats()
        console.log('✅ 科目数据加载和统计计算完成:', {
          subjectsCount: this.subjects.length,
          stats: this.stats
        })
        
      } catch (error) {
        console.error('❌ 科目数据加载失败:', {
          error: error.message,
          stack: error.stack,
          response: error.response
        })
        
        // 提供更具体的错误信息
        if (error.response) {
          if (error.response.status === 404) {
            this.error = 'API接口不存在，请检查服务器状态'
          } else if (error.response.status === 500) {
            this.error = '服务器内部错误，请稍后重试'
          } else {
            this.error = `网络错误 (${error.response.status}): ${error.response.statusText}`
          }
        } else if (error.message.includes('科目数据格式错误')) {
          this.error = `数据格式错误: ${error.message}`
        } else if (error.message.includes('Network Error')) {
          this.error = '网络连接失败，请检查网络或服务器状态'
        } else {
          this.error = error.message || '加载科目信息失败'
        }
        
        // 设置空数据避免页面崩溃
        this.subjects = []
        this.calculateStats()
        
      } finally {
        this.loading = false
      }
    },
    
    /**
     * 计算统计数据
     */
    calculateStats() {
      if (!this.subjects || this.subjects.length === 0) {
        this.stats = {
          totalSubjects: 0,
          totalSkills: 0,
          totalGrades: 0,
          totalErrors: 0
        }
        return
      }
      
      // 科目总数
      this.stats.totalSubjects = this.subjects.length
      
      // 技能类型总数
      this.stats.totalSkills = this.subjects.reduce((total, subject) => {
        return total + (subject.skillTypes ? subject.skillTypes.length : 0)
      }, 0)
      
      // 年级覆盖数（所有科目覆盖的不重复年级数）
      const allGrades = new Set()
      this.subjects.forEach(subject => {
        if (subject.grades) {
          subject.grades.forEach(grade => allGrades.add(grade))
        }
      })
      this.stats.totalGrades = allGrades.size
      
      // 常见错误总数
      this.stats.totalErrors = this.subjects.reduce((total, subject) => {
        return total + (subject.commonErrors ? subject.commonErrors.length : 0)
      }, 0)
      
      console.log('📊 统计数据计算完成:', this.stats)
    },
    
    /**
     * 获取指定年级的科目
     */
    getSubjectsForGrade(grade) {
      return this.subjects.filter(subject => 
        subject.grades && subject.grades.includes(grade)
      )
    },
    
    /**
     * 获取科目颜色
     */
    getSubjectColor(subjectKey) {
      const colors = {
        math: '#FF6B6B',
        chinese: '#4ECDC4', 
        english: '#45B7D1',
        science: '#96CEB4'
      }
      return colors[subjectKey] || '#9B59B6'
    },
    
    /**
     * 滚动到科目列表
     */
    scrollToSubjects() {
      this.$refs.subjectsSection?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      })
    },
    
    /**
     * 滚动到技能类型
     */
    scrollToSkills() {
      this.$refs.skillsSection?.[0]?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      })
    },
    
    /**
     * 滚动到年级分布
     */
    scrollToGrades() {
      this.$refs.gradesSection?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      })
    },
    
    /**
     * 滚动到错误类型
     */
    scrollToErrors() {
      this.$refs.errorsSection?.[0]?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      })
    },
    
    /**
     * 查看科目详情
     */
    viewSubjectDetail(subject) {
      // 可以跳转到科目详情页面或打开弹窗
      console.log('查看科目详情:', subject.name)
      // this.$router.push(`/subjects/${subject.key}`)
    }
  }
}
</script>

<style scoped>
.subjects-management {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.page-header p {
  color: #7f8c8d;
  font-size: 14px;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 15px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.2);
}

.stat-card:nth-child(2) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-card:nth-child(3) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-card:nth-child(4) {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-icon {
  font-size: 2.5em;
  margin-right: 15px;
}

.stat-info h3 {
  font-size: 2em;
  margin: 0;
  font-weight: bold;
}

.stat-info p {
  margin: 5px 0 0 0;
  opacity: 0.9;
}

/* 科目列表 */
.subjects-list h2 {
  color: #2c3e50;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #ecf0f1;
}

.subject-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 25px;
}

.subject-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  border: 2px solid transparent;
}

.subject-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
  border-color: #3498db;
}

.subject-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.subject-icon {
  font-size: 2em;
  margin-right: 10px;
}

.subject-header h3 {
  flex: 1;
  margin: 0;
  color: #2c3e50;
}

.subject-status {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
}

.subject-status.active {
  background: #2ecc71;
  color: white;
}

.subject-status:not(.active) {
  background: #e74c3c;
  color: white;
}

.subject-description {
  color: #7f8c8d;
  margin-bottom: 20px;
  line-height: 1.5;
}

.subject-stats {
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #ecf0f1;
}

.stat-label {
  color: #7f8c8d;
  font-weight: 500;
}

.stat-value {
  color: #2c3e50;
  font-weight: bold;
}

.subject-skills,
.subject-errors {
  margin-bottom: 20px;
}

.subject-skills h4,
.subject-errors h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 14px;
}

.skill-tags,
.error-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-tag {
  background: #3498db;
  color: white;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 500;
}

.error-tag {
  background: #e74c3c;
  color: white;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 500;
}

/* 年级分布 */
.grade-distribution h2 {
  color: #2c3e50;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #ecf0f1;
}

.grade-chart {
  display: grid;
  gap: 15px;
}

.grade-bar {
  display: grid;
  grid-template-columns: 80px 1fr 60px;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.grade-label {
  font-weight: bold;
  color: #2c3e50;
  text-align: center;
}

.grade-subjects {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.grade-subject {
  padding: 6px 12px;
  border-radius: 15px;
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.grade-count {
  text-align: center;
  font-weight: bold;
  color: #3498db;
}

/* 加载和错误状态 */
.loading {
  text-align: center;
  padding: 40px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #ecf0f1;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  text-align: center;
  padding: 40px;
  color: #e74c3c;
}

.retry-btn {
  margin-top: 15px;
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.retry-btn:hover {
  background: #2980b9;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .subject-grid {
    grid-template-columns: 1fr;
  }
  
  .grade-bar {
    grid-template-columns: 60px 1fr 40px;
    gap: 10px;
  }
}
</style> 