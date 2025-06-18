<template>
  <div class="materials">
    <h2>📖 教材管理</h2>
    
    <div class="toolbar">
      <button class="btn-primary" @click="showUploadModal = true">
        📁 上传教材
      </button>
      <button class="btn-secondary" @click="testMaterialAPI">
        🔧 测试API
      </button>
    </div>

    <div class="stats-summary">
      <div class="stat-item">
        <span class="stat-label">教材总数:</span>
        <span class="stat-value">{{ stats.total || 0 }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">存储大小:</span>
        <span class="stat-value">{{ stats.totalSize || '0 MB' }}</span>
      </div>
    </div>

    <div class="material-list">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="materials.length === 0" class="empty">
        暂无教材数据
      </div>
      <div v-else>
        <div v-for="material in materials" :key="material._id" class="material-item">
          <div class="material-info">
            <h4>{{ material.name || '教材名称' }}</h4>
            <p>{{ material.description || '教材描述' }}</p>
            <span class="material-meta">
              大小: {{ material.size || '未知' }} | 
              类型: {{ material.type || '未知' }} | 
              上传时间: {{ formatDate(material.createdAt) }}
            </span>
          </div>
          <div class="material-actions">
            <button @click="viewMaterial(material)" class="btn-view">查看</button>
            <button @click="deleteMaterial(material._id)" class="btn-delete">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 上传教材弹窗 -->
    <div v-if="showUploadModal" class="modal-overlay" @click="showUploadModal = false">
      <div class="modal" @click.stop>
        <h3>上传教材</h3>
        <form @submit.prevent="uploadMaterial">
          <div class="form-group">
            <label>教材名称:</label>
            <input v-model="newMaterial.name" type="text" required>
          </div>
          <div class="form-group">
            <label>教材描述:</label>
            <textarea v-model="newMaterial.description"></textarea>
          </div>
          <div class="form-group">
            <label>选择文件:</label>
            <input type="file" @change="handleFileSelect" accept=".pdf,.doc,.docx,.txt" required>
          </div>
          <div class="form-actions">
            <button type="button" @click="showUploadModal = false">取消</button>
            <button type="submit" class="btn-primary" :disabled="uploading">
              {{ uploading ? '上传中...' : '上传' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import api from '../../utils/api'

export default {
  name: 'Materials',
  data() {
    return {
      loading: false,
      uploading: false,
      materials: [],
      stats: {
        total: 0,
        totalSize: '0 MB'
      },
      showUploadModal: false,
      newMaterial: {
        name: '',
        description: '',
        file: null
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
          this.loadMaterials(),
          this.loadStats()
        ])
      } catch (error) {
        console.error('加载数据失败:', error)
      } finally {
        this.loading = false
      }
    },

    async loadMaterials() {
      try {
        const result = await api.materials.search({})
        this.materials = result.data || []
      } catch (error) {
        console.error('加载教材列表失败:', error)
        this.materials = []
      }
    },

    async loadStats() {
      try {
        const result = await api.materials.getStats()
        this.stats = result || {}
      } catch (error) {
        console.error('加载统计数据失败:', error)
      }
    },

    handleFileSelect(event) {
      const file = event.target.files[0]
      if (file) {
        this.newMaterial.file = file
        if (!this.newMaterial.name) {
          this.newMaterial.name = file.name
        }
      }
    },

    async uploadMaterial() {
      if (!this.newMaterial.file) {
        alert('请选择文件')
        return
      }

      this.uploading = true
      try {
        const formData = new FormData()
        formData.append('file', this.newMaterial.file)
        formData.append('name', this.newMaterial.name)
        formData.append('description', this.newMaterial.description)

        await api.materials.upload(formData)
        alert('教材上传成功！')
        this.showUploadModal = false
        this.newMaterial = { name: '', description: '', file: null }
        await this.loadData()
      } catch (error) {
        alert('上传教材失败：' + error.message)
      } finally {
        this.uploading = false
      }
    },

    async deleteMaterial(id) {
      if (!confirm('确定要删除这个教材吗？')) return
      
      try {
        // TODO: 实现删除API
        alert('删除功能待实现')
      } catch (error) {
        alert('删除教材失败：' + error.message)
      }
    },

    viewMaterial(material) {
      alert('查看功能待实现：' + material.name)
    },

    async testMaterialAPI() {
      try {
        const result = await api.materials.getStats()
        alert('教材API测试成功！')
        console.log('API测试结果:', result)
      } catch (error) {
        alert('教材API测试失败！')
        console.error('API测试失败:', error)
      }
    },

    formatDate(dateString) {
      if (!dateString) return '未知'
      return new Date(dateString).toLocaleDateString('zh-CN')
    }
  }
}
</script>

<style scoped>
.materials {
  max-width: 1200px;
  margin: 0 auto;
}

.materials h2 {
  margin-bottom: 20px;
  color: #2c3e50;
}

.toolbar {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.btn-primary {
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
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

.material-list {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  min-height: 300px;
}

.loading, .empty {
  text-align: center;
  padding: 50px;
  color: #666;
}

.material-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.material-item:last-child {
  border-bottom: none;
}

.material-info h4 {
  margin: 0 0 5px 0;
  color: #2c3e50;
}

.material-info p {
  margin: 0 0 5px 0;
  color: #666;
  font-size: 14px;
}

.material-meta {
  font-size: 12px;
  color: #999;
}

.material-actions {
  display: flex;
  gap: 10px;
}

.btn-view {
  background: #27ae60;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.btn-delete {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 30px;
  border-radius: 8px;
  width: 500px;
  max-width: 90vw;
}

.modal h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #2c3e50;
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group textarea {
  min-height: 60px;
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.form-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.form-actions button[type="button"] {
  background: #95a5a6;
  color: white;
}

.form-actions button:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}
</style>