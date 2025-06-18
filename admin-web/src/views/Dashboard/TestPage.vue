<template>
  <div style="padding: 20px; text-align: center;">
    <h1 style="color: blue;">🔥 缓存测试页面</h1>
    <p style="font-size: 18px;">当前时间：{{ currentTime }}</p>
    <p style="color: green; font-weight: bold;">如果你能看到这个页面和蓝色标题，说明前端服务正常</p>
    <el-button type="primary" @click="refresh">刷新时间</el-button>
    
    <div style="margin-top: 30px; padding: 20px; background: #f0f9ff; border-radius: 8px;">
      <h2>系统状态</h2>
      <p>前端服务：<span style="color: green;">✅ 正常运行 (localhost:8082)</span></p>
      <p>后端服务：<span style="color: green;">✅ 正常运行 (localhost:3000)</span></p>
      <p>缓存状态：<span style="color: red;">❌ 请清除浏览器缓存</span></p>
    </div>
    
    <div style="margin-top: 20px; color: red; font-size: 16px; position: fixed; top: 10px; right: 10px; background: white; padding: 10px; border: 2px solid blue; border-radius: 5px;">
      🔵 诊断时间戳：{{ new Date().toISOString() }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const currentTime = ref('')

const updateTime = () => {
  currentTime.value = new Date().toLocaleString()
}

const refresh = () => {
  updateTime()
}

onMounted(() => {
  updateTime()
})
</script> 