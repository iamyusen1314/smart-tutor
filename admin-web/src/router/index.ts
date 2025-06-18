import { createRouter, createWebHistory } from 'vue-router'

// 路由组件
const Dashboard = () => import('../views/Dashboard/index.vue')
const SimpleTest = () => import('../views/Dashboard/SimpleTest.vue')
const Materials = () => import('../views/Materials/index.vue')
const Questions = () => import('../views/Questions/index.vue')
const Users = () => import('../views/Users/index.vue')
const Analytics = () => import('../views/Analytics/index.vue')
const Login = () => import('../views/Login/index.vue')
const AIModels = () => import('../views/AIModels/index.vue')
const Subjects = () => import('../views/Subjects/index.vue')

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { 
      title: '登录',
      hideNav: true 
    }
  },
  {
    path: '/',
    name: 'SimpleTest',
    component: SimpleTest,
    meta: { 
      title: '测试页面',
      icon: '🧪'
    }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { 
      title: '仪表板',
      icon: '📊'
    }
  },
  {
    path: '/ai-models',
    name: 'AIModels',
    component: AIModels,
    meta: { 
      title: 'AI模型管理',
      icon: '🤖'
    }
  },
  {
    path: '/subjects',
    name: 'Subjects',
    component: Subjects,
    meta: { 
      title: '科目管理',
      icon: '🎓'
    }
  },
  {
    path: '/materials',
    name: 'Materials',
    component: Materials,
    meta: { 
      title: '教材管理',
      icon: '📚'
    }
  },
  {
    path: '/questions',
    name: 'Questions',
    component: Questions,
    meta: { 
      title: '题目管理',
      icon: '📝'
    }
  },
  {
    path: '/users',
    name: 'Users',
    component: Users,
    meta: { 
      title: '用户管理',
      icon: '👥'
    }
  },
  {
    path: '/analytics',
    name: 'Analytics',
    component: Analytics,
    meta: { 
      title: '数据分析',
      icon: '📈'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta?.title) {
    document.title = `${to.meta.title} - 小学AI家教管理后台`
  }
  
  // 简单的认证检查（开发阶段可以先跳过）
  const token = localStorage.getItem('admin_token')
  if (to.path !== '/login' && !token && process.env.NODE_ENV === 'production') {
    next('/login')
  } else {
    next()
  }
})

export default router
