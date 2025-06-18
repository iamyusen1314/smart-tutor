<template>
  <div class="simple-test">
    <h1>🚀 管理后台测试页面</h1>
    <p>如果你能看到这个页面，说明 Vue 应用基本工作正常！</p>
    <p>当前时间: {{ currentTime }}</p>
    <button @click="testClick">点击测试</button>
    <p v-if="clicked">✅ 按钮点击正常工作！</p>
  </div>
</template>

<script>
export default {
  name: 'SimpleTest',
  data() {
    return {
      currentTime: new Date().toLocaleString(),
      clicked: false
    }
  },
  methods: {
    testClick() {
      this.clicked = true
      console.log('测试按钮被点击')
    }
  }
}
</script>

<style scoped>
.simple-test {
  padding: 40px;
  text-align: center;
}

h1 {
  color: #2c3e50;
  margin-bottom: 20px;
}

button {
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  margin: 20px;
}

button:hover {
  background: #2980b9;
}
</style> 