import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import api from './utils/api'

console.log('开始创建Vue应用...')

// 创建应用实例
const app = createApp(App)

// 添加全局属性
app.config.globalProperties.$api = api

// 使用路由
app.use(router)

console.log('Vue应用配置完成，准备挂载...')

// 挂载应用
app.mount('#app')

console.log('Vue应用挂载完成！') 