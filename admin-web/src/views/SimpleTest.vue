<template>
  <div class="simple-test">
    <h1>🎉 测试页面</h1>
    <p>如果你能看到这个页面，说明Vue应用正常工作！</p>
    <button @click="showMessage" class="test-btn">点击测试</button>
    <div class="status">
      <p>当前时间：{{ currentTime }}</p>
      <p>页面状态：✅ Vue已正常渲染</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const currentTime = ref('')

const showMessage = () => {
  alert('Vue应用工作正常！')
}

const updateTime = () => {
  currentTime.value = new Date().toLocaleString()
}

onMounted(() => {
  updateTime()
  setInterval(updateTime, 1000)
})
</script>

<style scoped>
.simple-test {
  padding: 40px;
  text-align: center;
  background: #f5f5f5;
  min-height: 100vh;
}

h1 {
  color: #409eff;
  margin-bottom: 20px;
  font-size: 2.5em;
}

p {
  margin-bottom: 30px;
  font-size: 18px;
  color: #333;
}

.test-btn {
  background: #409eff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.test-btn:hover {
  background: #66b1ff;
}

.status {
  margin-top: 40px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}
</style> 