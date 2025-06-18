<template>
  <div id="app">
    <!-- 登录页面不显示导航 -->
    <div v-if="$route.meta?.hideNav" class="login-layout">
      <router-view />
    </div>
    
    <!-- 主要布局 -->
    <div v-else class="admin-layout">
      <!-- 侧边栏 -->
      <aside class="sidebar">
        <div class="logo">
          <h2>🎓 AI家教管理</h2>
        </div>
        
        <nav class="nav-menu">
          <router-link 
            v-for="route in navRoutes" 
            :key="route.path"
            :to="route.path" 
            class="nav-item"
            :class="{ active: $route.path === route.path }"
          >
            <span class="nav-icon">{{ route.meta.icon }}</span>
            <span class="nav-text">{{ route.meta.title }}</span>
          </router-link>
        </nav>
      </aside>
      
      <!-- 主内容区 -->
      <main class="main-content">
        <!-- 顶部栏 -->
        <header class="header">
          <div class="header-left">
            <h1>{{ $route.meta?.title || '管理后台' }}</h1>
          </div>
          <div class="header-right">
            <button class="logout-btn" @click="logout">
              退出登录
            </button>
          </div>
        </header>
        
        <!-- 页面内容 -->
        <div class="content">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<script>
export default {
  name: 'App',
  computed: {
    navRoutes() {
      return this.$router.getRoutes().filter(route => 
        !route.meta?.hideNav && route.path !== '/login'
      )
    }
  },
  methods: {
    logout() {
      localStorage.removeItem('admin_token')
      this.$router.push('/login')
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

#app {
  height: 100vh;
}

/* 登录布局 */
.login-layout {
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 管理布局 */
.admin-layout {
  display: flex;
  height: 100vh;
}

/* 侧边栏 */
.sidebar {
  width: 260px;
  background: #2c3e50;
  color: white;
  flex-shrink: 0;
}

.logo {
  padding: 20px;
  border-bottom: 1px solid #34495e;
  text-align: center;
}

.logo h2 {
  color: #ecf0f1;
  font-size: 18px;
  font-weight: 600;
}

.nav-menu {
  padding: 20px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  color: #bdc3c7;
  text-decoration: none;
  transition: all 0.3s ease;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background: #34495e;
  color: #ecf0f1;
  border-left-color: #3498db;
}

.nav-item.active {
  background: #34495e;
  color: #3498db;
  border-left-color: #3498db;
}

.nav-icon {
  font-size: 20px;
  margin-right: 12px;
}

.nav-text {
  font-size: 14px;
  font-weight: 500;
}

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

/* 顶部栏 */
.header {
  height: 60px;
  background: white;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.header h1 {
  font-size: 20px;
  color: #2c3e50;
  font-weight: 600;
}

.logout-btn {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s ease;
}

.logout-btn:hover {
  background: #c0392b;
}

/* 内容区 */
.content {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    width: 200px;
  }
  
  .nav-text {
    font-size: 12px;
  }
  
  .content {
    padding: 20px;
  }
}
</style> 