<template>
  <div class="users">
    <h2>👥 用户管理</h2>
    
    <div class="toolbar">
      <button class="btn-secondary" @click="testUserAPI">
        🔧 测试API
      </button>
      <button class="btn-secondary" @click="loadData">
        🔄 刷新数据
      </button>
    </div>

    <div class="stats-summary">
      <div class="stat-item">
        <span class="stat-label">用户总数:</span>
        <span class="stat-value">{{ stats.total || 0 }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">今日新增:</span>
        <span class="stat-value">{{ stats.todayNew || 0 }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">活跃用户:</span>
        <span class="stat-value">{{ stats.activeUsers || 0 }}</span>
      </div>
    </div>

    <div class="user-list">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="users.length === 0" class="empty">
        暂无用户数据
      </div>
      <div v-else>
        <div class="list-header">
          <div class="col-name">用户信息</div>
          <div class="col-status">状态</div>
          <div class="col-date">注册时间</div>
          <div class="col-actions">操作</div>
        </div>
        <div v-for="user in users" :key="user._id" class="user-item">
          <div class="col-name">
            <div class="user-info">
              <div class="user-avatar">{{ getAvatarText(user.nickname) }}</div>
              <div class="user-details">
                <h4>{{ user.nickname || '未设置' }}</h4>
                <p>{{ user.openid || 'N/A' }}</p>
              </div>
            </div>
          </div>
          <div class="col-status">
            <span class="status-badge" :class="user.active ? 'active' : 'inactive'">
              {{ user.active ? '活跃' : '非活跃' }}
            </span>
          </div>
          <div class="col-date">
            {{ formatDate(user.createdAt) }}
          </div>
          <div class="col-actions">
            <button @click="viewUser(user)" class="btn-view">查看</button>
            <button @click="deleteUser(user._id)" class="btn-delete">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="users.length > 0" class="pagination">
      <button @click="loadPrevPage" :disabled="currentPage <= 1">上一页</button>
      <span>第 {{ currentPage }} 页 / 共 {{ totalPages }} 页</span>
      <button @click="loadNextPage" :disabled="currentPage >= totalPages">下一页</button>
    </div>
  </div>
</template>

<script>
import api from '../../utils/api'

export default {
  name: 'Users',
  data() {
    return {
      loading: false,
      users: [],
      stats: {
        total: 0,
        todayNew: 0,
        activeUsers: 0
      },
      currentPage: 1,
      pageSize: 10,
      totalPages: 1
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
          this.loadUsers(),
          this.loadStats()
        ])
      } catch (error) {
        console.error('加载数据失败:', error)
      } finally {
        this.loading = false
      }
    },

    async loadUsers() {
      try {
        const params = {
          page: this.currentPage,
          limit: this.pageSize
        }
        const result = await api.users.getList(params)
        this.users = result.data || []
        this.totalPages = Math.ceil((result.total || 0) / this.pageSize)
      } catch (error) {
        console.error('加载用户列表失败:', error)
        this.users = []
      }
    },

    async loadStats() {
      try {
        const result = await api.users.getStats()
        this.stats = result || {}
      } catch (error) {
        console.error('加载统计数据失败:', error)
      }
    },

    async loadPrevPage() {
      if (this.currentPage > 1) {
        this.currentPage--
        await this.loadUsers()
      }
    },

    async loadNextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++
        await this.loadUsers()
      }
    },

    async deleteUser(id) {
      if (!confirm('确定要删除这个用户吗？')) return
      
      try {
        await api.users.delete(id)
        alert('用户删除成功！')
        await this.loadData()
      } catch (error) {
        alert('删除用户失败：' + error.message)
      }
    },

    viewUser(user) {
      alert('查看用户详情功能待实现：' + user.nickname)
    },

    async testUserAPI() {
      try {
        const result = await api.users.getStats()
        alert('用户API测试成功！')
        console.log('API测试结果:', result)
      } catch (error) {
        alert('用户API测试失败！')
        console.error('API测试失败:', error)
      }
    },

    getAvatarText(nickname) {
      if (!nickname) return '?'
      return nickname.charAt(0).toUpperCase()
    },

    formatDate(dateString) {
      if (!dateString) return '未知'
      return new Date(dateString).toLocaleDateString('zh-CN')
    }
  }
}
</script>

<style scoped>
.users {
  max-width: 1200px;
  margin: 0 auto;
}

.users h2 {
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

.stats-summary {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
  display: flex;
  gap: 30px;
}

.stat-item {
  display: flex;
  gap: 10px;
}

.stat-label {
  color: #666;
}

.stat-value {
  font-weight: bold;
  color: #2c3e50;
}

.user-list {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  min-height: 400px;
}

.loading, .empty {
  text-align: center;
  padding: 50px;
  color: #666;
}

.list-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 15px;
  padding: 15px 20px;
  background: #f8f9fa;
  border-bottom: 2px solid #e9ecef;
  font-weight: 600;
  color: #495057;
}

.user-item {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 15px;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.user-item:last-child {
  border-bottom: none;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #3498db;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
}

.user-details h4 {
  margin: 0 0 4px 0;
  color: #2c3e50;
  font-size: 14px;
}

.user-details p {
  margin: 0;
  color: #666;
  font-size: 12px;
  font-family: monospace;
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

.col-actions {
  display: flex;
  gap: 8px;
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

.btn-delete {
  background: #dc3545;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.pagination button {
  background: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.pagination button:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.pagination span {
  color: #666;
  font-size: 14px;
}

@media (max-width: 768px) {
  .stats-summary {
    flex-direction: column;
    gap: 15px;
  }
  
  .list-header,
  .user-item {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .user-info {
    justify-content: flex-start;
  }
}
</style>
