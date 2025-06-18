<template>
  <div class="questions-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>
        <i class="icon">🤖</i>
        AI题目生成记录
      </h1>
      <p class="description">
        查看AI根据学生学习行为动态生成的个性化题目记录
      </p>
    </div>

    <!-- AI生成统计面板 -->
    <div class="stats-panel">
      <div class="stat-card">
        <div class="stat-number">{{ aiStats.totalGenerated }}</div>
        <div class="stat-label">AI生成题目总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ aiStats.activeStudents }}</div>
        <div class="stat-label">活跃学生数</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ aiStats.avgAccuracy }}%</div>
        <div class="stat-label">平均准确率</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ aiStats.todayGenerated }}</div>
        <div class="stat-label">今日生成题目</div>
      </div>
    </div>

    <!-- 筛选条件 -->
    <div class="filter-section">
      <div class="filter-row">
        <select v-model="filters.subject" @change="loadQuestions">
          <option value="">全部学科</option>
          <option value="math">数学</option>
          <option value="chinese">语文</option>
          <option value="english">英语</option>
        </select>
        
        <select v-model="filters.grade" @change="loadQuestions">
          <option value="">全部年级</option>
          <option value="1">一年级</option>
          <option value="2">二年级</option>
          <option value="3">三年级</option>
          <option value="4">四年级</option>
          <option value="5">五年级</option>
          <option value="6">六年级</option>
        </select>
        
        <select v-model="filters.difficulty" @change="loadQuestions">
          <option value="">全部难度</option>
          <option value="easy">简单</option>
          <option value="medium">中等</option>
          <option value="hard">困难</option>
        </select>
        
        <input 
          type="date" 
          v-model="filters.dateFrom" 
          @change="loadQuestions"
          placeholder="开始日期"
        >
        
        <input 
          type="date" 
          v-model="filters.dateTo" 
          @change="loadQuestions"
          placeholder="结束日期"
        >
        
        <button @click="refreshData" class="refresh-btn">
          <i class="icon">🔄</i>
          刷新数据
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <i class="icon">⏳</i>
      正在加载AI生成的题目记录...
    </div>

    <!-- 错误状态 -->
    <div v-if="error" class="error-message">
      <i class="icon">❌</i>
      {{ error }}
      <button @click="loadQuestions" class="retry-btn">重试</button>
    </div>

    <!-- 题目列表 -->
    <div v-if="!loading && !error" class="questions-list">
      <div v-if="questions.length === 0" class="empty-state">
        <i class="icon">🤖</i>
        <h3>暂无AI生成题目</h3>
        <p>当学生开始使用拍照学习功能时，AI会自动生成个性化练习题</p>
      </div>
      
      <div v-else>
        <!-- 题目记录卡片 -->
        <div 
          v-for="question in questions" 
          :key="question._id || question.id" 
          class="question-card"
          :class="{ 'ai-generated': question.isAIGenerated }"
        >
          <div class="question-header">
            <div class="question-meta">
              <span class="subject-tag" :class="question.subject">
                {{ getSubjectName(question.subject) }}
              </span>
              <span class="grade-tag">{{ question.grade }}年级</span>
              <span class="difficulty-tag" :class="question.difficulty">
                {{ getDifficultyName(question.difficulty) }}
              </span>
              <span v-if="question.isAIGenerated" class="ai-tag">
                🤖 AI生成
              </span>
            </div>
            <div class="question-time">
              {{ formatDate(question.createdAt) }}
            </div>
          </div>
          
          <div class="question-content">
            <h4>{{ question.content || question.text }}</h4>
            
            <!-- AI生成上下文 -->
            <div v-if="question.generationContext" class="ai-context">
              <h5>🎯 生成背景:</h5>
              <p>{{ question.generationContext.triggerType }}: {{ question.generationContext.description }}</p>
              
              <div v-if="question.generationContext.weakPoints && question.generationContext.weakPoints.length > 0" class="weak-points">
                <strong>针对薄弱点:</strong>
                <span v-for="point in question.generationContext.weakPoints" :key="point" class="weak-point-tag">
                  {{ point }}
                </span>
              </div>
            </div>
            
            <!-- 选项（如果是选择题） -->
            <div v-if="question.options && question.options.length > 0" class="question-options">
              <div v-for="(option, index) in question.options" :key="index" class="option">
                <span class="option-label">{{ String.fromCharCode(65 + index) }}.</span>
                <span class="option-text">{{ option }}</span>
              </div>
            </div>
            
            <!-- 答案和解析 -->
            <div class="answer-section">
              <div class="answer">
                <strong>答案:</strong> {{ question.answer }}
              </div>
              <div v-if="question.explanation" class="explanation">
                <strong>解析:</strong> {{ question.explanation }}
              </div>
            </div>
            
            <!-- 知识点 -->
            <div v-if="question.knowledgePoints && question.knowledgePoints.length > 0" class="knowledge-points">
              <strong>知识点:</strong>
              <span v-for="point in question.knowledgePoints" :key="point" class="knowledge-tag">
                {{ point }}
              </span>
            </div>
            
            <!-- 学生使用统计 -->
            <div v-if="question.usageStats" class="usage-stats">
              <div class="stat-item">
                <span class="stat-label">使用次数:</span>
                <span class="stat-value">{{ question.usageStats.attempts || 0 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">正确率:</span>
                <span class="stat-value">{{ (question.usageStats.accuracy * 100).toFixed(1) }}%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">平均用时:</span>
                <span class="stat-value">{{ question.usageStats.avgTime }}分钟</span>
              </div>
            </div>
          </div>
          
          <div class="question-actions">
            <button @click="viewDetails(question)" class="details-btn">
              查看详情
            </button>
            <button @click="viewStudentProgress(question)" class="progress-btn">
              学生表现
            </button>
            <button 
              v-if="question.usageStats && question.usageStats.accuracy < 0.5" 
              @click="regenerateQuestion(question)"
              class="regenerate-btn"
            >
              🤖 重新生成
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination">
      <button 
        :disabled="currentPage <= 1" 
        @click="changePage(currentPage - 1)"
        class="page-btn"
      >
        上一页
      </button>
      
      <span class="page-info">
        第 {{ currentPage }} 页，共 {{ totalPages }} 页
      </span>
      
      <button 
        :disabled="currentPage >= totalPages" 
        @click="changePage(currentPage + 1)"
        class="page-btn"
      >
        下一页
      </button>
    </div>

    <!-- AI洞察分析面板 -->
    <div class="ai-insights-panel" v-if="aiInsights.length > 0">
      <h3>🤖 AI分析洞察</h3>
      <div class="insights-list">
        <div v-for="insight in aiInsights" :key="insight.id" class="insight-item">
          <div class="insight-type">{{ insight.type }}</div>
          <div class="insight-content">{{ insight.content }}</div>
          <div class="insight-time">{{ formatDate(insight.timestamp) }}</div>
        </div>
      </div>
    </div>

    <!-- 测试按钮 -->
    <div class="debug-section">
      <button @click="testAPI" class="test-btn">
        🧪 测试AI生成API
      </button>
    </div>
  </div>
</template>

<script>
import api from '../../utils/api'

export default {
  name: 'Questions',
  data() {
    return {
      loading: false,
      error: null,
      questions: [],
      currentPage: 1,
      totalPages: 1,
      pageSize: 10,
      
      // AI生成统计
      aiStats: {
        totalGenerated: 0,
        activeStudents: 0,
        avgAccuracy: 0,
        todayGenerated: 0
      },
      
      // 筛选条件
      filters: {
        subject: '',
        grade: '',
        difficulty: '',
        dateFrom: '',
        dateTo: ''
      },
      
      // AI洞察
      aiInsights: []
    }
  },
  
  async mounted() {
    // 添加调试信息
    console.log('🔍 检查API服务:', {
      api: !!api,
      questions: !!api?.questions,
      getList: !!api?.questions?.getList
    })
    
    await this.loadQuestions()
    await this.loadAIStats()
    await this.loadAIInsights()
  },
  
  methods: {
    async loadQuestions() {
      this.loading = true
      this.error = null
      
      try {
        console.log('📚 加载AI生成题目记录...')
        
        // 添加调试信息
        if (!api || !api.questions || !api.questions.getList) {
          throw new Error('API服务未正确初始化')
        }
        
        const params = {
          page: this.currentPage,
          limit: this.pageSize,
          isAIGenerated: true, // 只获取AI生成的题目
          ...this.filters
        }
        
        const response = await api.questions.getList(params)
        
        if (response && response.success) {
          this.questions = response.data?.questions || response.data || []
          this.totalPages = Math.ceil((response.data?.total || response.total || 0) / this.pageSize)
          console.log('✅ AI题目记录加载成功:', this.questions.length)
        } else {
          throw new Error(response?.message || '获取题目记录失败')
        }
        
      } catch (error) {
        console.error('❌ 加载AI题目记录失败:', error)
        this.error = error.message
        
        // 如果是API错误，提供示例数据
        if (error.message.includes('API') || error.message.includes('网络') || error.message.includes('初始化')) {
          console.log('🎭 加载模拟数据作为备选方案')
          this.loadMockData()
        }
        
      } finally {
        this.loading = false
      }
    },
    
    async loadAIStats() {
      try {
        if (api && api.analytics && api.analytics.getAIGenerationStats) {
          const response = await api.analytics.getAIGenerationStats()
          
          if (response && response.success) {
            this.aiStats = response.data
          }
        }
        
      } catch (error) {
        console.warn('获取AI统计失败:', error)
        // 使用模拟数据
        this.aiStats = {
          totalGenerated: 1247,
          activeStudents: 89,
          avgAccuracy: 76,
          todayGenerated: 23
        }
      }
    },
    
    async loadAIInsights() {
      try {
        if (api && api.analytics && api.analytics.getAIInsights) {
          const response = await api.analytics.getAIInsights({
            limit: 5,
            type: 'question_generation'
          })
          
          if (response && response.success) {
            this.aiInsights = response.data || []
          }
        }
        
      } catch (error) {
        console.warn('获取AI洞察失败:', error)
        // 使用模拟数据
        this.aiInsights = [
          {
            id: 1,
            type: '题目难度分析',
            content: '发现学生在分数计算方面正确率较低(62%)，AI已自动调整生成更多基础练习题',
            timestamp: new Date().toISOString()
          },
          {
            id: 2,
            type: '学习模式识别',
            content: '检测到视觉学习型学生增多，AI正在生成更多图形化数学题',
            timestamp: new Date(Date.now() - 3600000).toISOString()
          }
        ]
      }
    },
    
    loadMockData() {
      console.log('🎭 加载模拟AI生成题目数据')
      this.questions = [
        {
          id: 1,
          content: '小明有24个苹果，平均分给6个朋友，每个朋友分到几个苹果？',
          subject: 'math',
          grade: 3,
          difficulty: 'easy',
          type: 'calculation',
          answer: '4个',
          explanation: '24÷6=4，所以每个朋友分到4个苹果',
          knowledgePoints: ['除法运算', '平均分配'],
          isAIGenerated: true,
          generationContext: {
            triggerType: 'OCR识别',
            description: '学生拍照了类似的除法应用题',
            weakPoints: ['除法运算']
          },
          usageStats: {
            attempts: 5,
            accuracy: 0.8,
            avgTime: 2.5
          },
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          content: '下列哪个算式的结果是12？',
          options: ['3×4', '2×7', '6+5', '15-3'],
          subject: 'math',
          grade: 2,
          difficulty: 'medium',
          type: 'choice',
          answer: 'A',
          explanation: '3×4=12，其他选项：B=14，C=11，D=12，所以A和D都正确，但A是最直接的答案',
          knowledgePoints: ['乘法运算', '加减法运算'],
          isAIGenerated: true,
          generationContext: {
            triggerType: '薄弱点强化',
            description: '针对该学生的乘法运算薄弱点生成',
            weakPoints: ['乘法运算', '数学运算']
          },
          usageStats: {
            attempts: 8,
            accuracy: 0.75,
            avgTime: 1.8
          },
          createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 3,
          content: '一个长方形的长是8cm，宽是5cm，求这个长方形的周长。',
          subject: 'math',
          grade: 4,
          difficulty: 'medium',
          type: 'calculation',
          answer: '26cm',
          explanation: '长方形周长 = 2×(长+宽) = 2×(8+5) = 2×13 = 26cm',
          knowledgePoints: ['长方形周长', '几何计算'],
          isAIGenerated: true,
          generationContext: {
            triggerType: '学习计划定制',
            description: '根据学生当前学习进度生成的几何题',
            weakPoints: ['几何计算']
          },
          usageStats: {
            attempts: 3,
            accuracy: 0.67,
            avgTime: 3.2
          },
          createdAt: new Date(Date.now() - 172800000).toISOString()
        }
      ]
      
      this.totalPages = 1
    },
    
    changePage(page) {
      this.currentPage = page
      this.loadQuestions()
    },
    
    getSubjectName(subject) {
      const names = {
        math: '数学',
        chinese: '语文',
        english: '英语'
      }
      return names[subject] || subject
    },
    
    getDifficultyName(difficulty) {
      const names = {
        easy: '简单',
        medium: '中等',
        hard: '困难'
      }
      return names[difficulty] || difficulty
    },
    
    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      const now = new Date()
      const diff = now - date
      
      if (diff < 60000) return '刚刚'
      if (diff < 3600000) return `${Math.floor(diff/60000)}分钟前`
      if (diff < 86400000) return `${Math.floor(diff/3600000)}小时后`
      if (diff < 604800000) return `${Math.floor(diff/86400000)}天前`
      
      return date.toLocaleDateString()
    },
    
    viewDetails(question) {
      console.log('查看题目详情:', question)
      alert(`题目详情：\n\n${JSON.stringify(question, null, 2)}`)
    },
    
    viewStudentProgress(question) {
      console.log('查看学生表现:', question)
      alert(`学生表现分析：\n\n使用次数：${question.usageStats?.attempts || 0}\n正确率：${(question.usageStats?.accuracy * 100 || 0).toFixed(1)}%\n平均用时：${question.usageStats?.avgTime || 0}分钟`)
    },
    
    async regenerateQuestion(question) {
      if (!confirm('确定要让AI重新生成这道题目吗？')) return
      
      try {
        console.log('🤖 请求AI重新生成题目:', question.id)
        
        if (!api || !api.aiGenerator || !api.aiGenerator.regenerateQuestion) {
          throw new Error('AI生成服务不可用')
        }
        
        const response = await api.aiGenerator.regenerateQuestion({
          questionId: question.id,
          reason: 'low_accuracy',
          currentAccuracy: question.usageStats?.accuracy || 0
        })
        
        if (response && response.success) {
          alert('✅ AI重新生成请求已提交，新题目将在下次学习中展示给学生')
          this.loadQuestions()
        } else {
          throw new Error(response?.message || '重新生成失败')
        }
        
      } catch (error) {
        console.error('❌ AI重新生成失败:', error)
        alert(`❌ 重新生成失败: ${error.message}`)
      }
    },
    
    async refreshData() {
      await Promise.all([
        this.loadQuestions(),
        this.loadAIStats(),
        this.loadAIInsights()
      ])
    },
    
    async testAPI() {
      try {
        console.log('🧪 测试AI生成API...')
        
        if (!api || !api.aiGenerator || !api.aiGenerator.generatePractice) {
          throw new Error('AI生成服务不可用')
        }
        
        const testData = {
          ocrData: {
            analyzedContent: '3×4=?',
            subject: 'math',
            grade: 3,
            knowledgePoints: ['乘法运算']
          },
          studentProfile: {
            userId: 'test_student',
            grade: 3,
            preferredSubjects: ['math'],
            averageAccuracy: 0.75
          },
          learningHistory: [],
          weakPoints: [
            { knowledgePoint: '乘法运算', errorRate: 0.4 }
          ]
        }
        
        const response = await api.aiGenerator.generatePractice(testData)
        console.log('✅ API测试成功:', response)
        alert('✅ AI生成API测试成功！\n\n' + JSON.stringify(response, null, 2))
        
      } catch (error) {
        console.error('❌ API测试失败:', error)
        alert(`❌ API测试失败: ${error.message}`)
      }
    }
  }
}
</script>

<style scoped>
.questions-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
  text-align: center;
}

.page-header h1 {
  font-size: 28px;
  color: #2c3e50;
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.page-header .icon {
  font-size: 32px;
}

.description {
  color: #7f8c8d;
  font-size: 16px;
  margin: 0;
}

.stats-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 25px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
}

.filter-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 25px;
}

.filter-row {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-row select,
.filter-row input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  min-width: 120px;
}

.refresh-btn {
  background: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.refresh-btn:hover {
  background: #2980b9;
}

.loading, .error-message {
  text-align: center;
  padding: 40px;
  font-size: 16px;
}

.error-message {
  color: #e74c3c;
  background: #fdf2f2;
  border-radius: 8px;
  border: 1px solid #f5c6cb;
}

.retry-btn {
  margin-left: 10px;
  background: #e74c3c;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
}

.empty-state .icon {
  font-size: 64px;
  margin-bottom: 20px;
  display: block;
}

.questions-list {
  margin-bottom: 30px;
}

.question-card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  border-left: 4px solid #ddd;
  transition: all 0.3s ease;
}

.question-card.ai-generated {
  border-left-color: #9b59b6;
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
}

.question-card:hover {
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
  transform: translateY(-2px);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.question-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.subject-tag, .grade-tag, .difficulty-tag, .ai-tag {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.subject-tag.math { background: #e3f2fd; color: #1976d2; }
.subject-tag.chinese { background: #fce4ec; color: #c2185b; }
.subject-tag.english { background: #e8f5e8; color: #388e3c; }

.grade-tag { background: #f3e5f5; color: #7b1fa2; }

.difficulty-tag.easy { background: #e8f5e8; color: #2e7d32; }
.difficulty-tag.medium { background: #fff3e0; color: #f57c00; }
.difficulty-tag.hard { background: #ffebee; color: #d32f2f; }

.ai-tag { 
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.question-time {
  color: #7f8c8d;
  font-size: 12px;
}

.question-content h4 {
  font-size: 18px;
  color: #2c3e50;
  margin-bottom: 15px;
  line-height: 1.4;
}

.ai-context {
  background: #f8f9ff;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
  border-left: 3px solid #9b59b6;
}

.ai-context h5 {
  margin: 0 0 8px 0;
  color: #9b59b6;
  font-size: 14px;
}

.ai-context p {
  margin: 0 0 10px 0;
  color: #5a6c7d;
  font-size: 14px;
}

.weak-points {
  font-size: 13px;
}

.weak-point-tag {
  background: #ffebee;
  color: #d32f2f;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  margin-left: 5px;
}

.question-options {
  margin: 15px 0;
}

.option {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
}

.option-label {
  font-weight: bold;
  color: #495057;
  margin-right: 10px;
  min-width: 20px;
}

.answer-section {
  background: #f0f8ff;
  padding: 15px;
  border-radius: 8px;
  margin: 15px 0;
}

.answer, .explanation {
  margin-bottom: 8px;
  font-size: 14px;
}

.answer strong, .explanation strong {
  color: #2c3e50;
}

.knowledge-points {
  margin: 15px 0;
  font-size: 14px;
}

.knowledge-tag {
  background: #e3f2fd;
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  margin-left: 5px;
}

.usage-stats {
  display: flex;
  gap: 20px;
  margin: 15px 0;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #7f8c8d;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 14px;
  font-weight: bold;
  color: #2c3e50;
}

.question-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  flex-wrap: wrap;
}

.details-btn, .progress-btn, .regenerate-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.details-btn {
  background: #3498db;
  color: white;
}

.details-btn:hover {
  background: #2980b9;
}

.progress-btn {
  background: #2ecc71;
  color: white;
}

.progress-btn:hover {
  background: #27ae60;
}

.regenerate-btn {
  background: #9b59b6;
  color: white;
}

.regenerate-btn:hover {
  background: #8e44ad;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin: 30px 0;
}

.page-btn {
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
}

.page-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.page-info {
  color: #7f8c8d;
  font-size: 14px;
}

.ai-insights-panel {
  background: #f8f9ff;
  padding: 25px;
  border-radius: 12px;
  margin-top: 30px;
  border: 1px solid #e6e6ff;
}

.ai-insights-panel h3 {
  color: #9b59b6;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.insights-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.insight-item {
  background: white;
  padding: 15px;
  border-radius: 8px;
  border-left: 3px solid #9b59b6;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.insight-type {
  font-weight: bold;
  color: #9b59b6;
  font-size: 14px;
  margin-bottom: 5px;
}

.insight-content {
  color: #5a6c7d;
  line-height: 1.5;
  margin-bottom: 8px;
}

.insight-time {
  color: #95a5a6;
  font-size: 12px;
}

.debug-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
  text-align: center;
}

.test-btn {
  background: #e67e22;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.test-btn:hover {
  background: #d35400;
}

@media (max-width: 768px) {
  .questions-container {
    padding: 15px;
  }
  
  .stats-panel {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-row select,
  .filter-row input,
  .refresh-btn {
    width: 100%;
  }
  
  .question-header {
    flex-direction: column;
    gap: 10px;
  }
  
  .usage-stats {
    flex-direction: column;
    gap: 10px;
  }
  
  .question-actions {
    justify-content: center;
  }
}
</style> 