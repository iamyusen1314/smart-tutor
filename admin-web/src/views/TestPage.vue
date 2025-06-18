<template>
  <div style="padding: 20px; font-family: Arial, sans-serif;">
    <h1 style="color: #4A90E2;">🔧 系统诊断页面</h1>
    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h2>当前状态</h2>
      <p><strong>时间：</strong>{{ currentTime }}</p>
      <p><strong>页面：</strong>TestPage.vue</p>
      <p><strong>路由：</strong>{{ $route.path }}</p>
      <p><strong>状态：</strong><span style="color: green;">✅ 页面加载正常</span></p>
    </div>
    
    <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h2>服务测试</h2>
      <p><strong>后端服务：</strong>{{ backendStatus }}</p>
      <p><strong>前端服务：</strong><span style="color: green;">✅ 正常运行</span></p>
    </div>
    
    <div style="background: #f0fff4; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h2>访问指导</h2>
      <p>请访问以下地址：</p>
      <ul>
        <li><a href="/dashboard" target="_blank">http://localhost:8082/dashboard</a> - 管理仪表板</li>
        <li><a href="/materials" target="_blank">http://localhost:8082/materials</a> - 教材管理</li>
        <li><a href="/questions" target="_blank">http://localhost:8082/questions</a> - 题库管理</li>
      </ul>
    </div>
    
    <div style="margin: 20px 0;">
      <el-button type="primary" @click="$router.push('/dashboard')">
        跳转到仪表板
      </el-button>
      <el-button @click="testBackend">测试后端连接</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const currentTime = ref('')
const backendStatus = ref('检测中...')

onMounted(() => {
  currentTime.value = new Date().toLocaleString()
  testBackend()
})

const testBackend = async () => {
  try {
    const response = await axios.get('/api/health')
    if (response.data.status === 'ok') {
      backendStatus.value = '✅ 连接正常'
    } else {
      backendStatus.value = '⚠️ 响应异常'
    }
  } catch (error) {
    backendStatus.value = '❌ 连接失败'
  }
}
</script> 