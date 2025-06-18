# 小学AI家教 - 管理后台

Vue 3 + Vite 构建的管理后台应用，用于管理小学AI家教系统的题目、教材、用户和数据分析。

## 🚀 快速开始

### 前置要求
- Node.js 16+ 
- npm 或 yarn

### 启动应用

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

3. 访问应用：
```
http://localhost:8083
```

### 登录信息
- 用户名：`admin`
- 密码：`admin123`

## 📁 项目结构

```
admin-web/
├── src/
│   ├── components/          # 公共组件
│   ├── views/              # 页面组件
│   │   ├── Dashboard/      # 仪表板
│   │   ├── Questions/      # 题目管理
│   │   ├── Materials/      # 教材管理
│   │   ├── Users/          # 用户管理
│   │   ├── Analytics/      # 数据分析
│   │   └── Login/          # 登录页面
│   ├── router/             # 路由配置
│   ├── utils/              # 工具函数
│   │   └── api.js          # API服务
│   ├── App.vue             # 根组件
│   └── main.ts             # 入口文件
├── public/                 # 静态资源
├── vite.config.ts         # Vite配置
└── package.json           # 依赖配置
```

## 🔧 功能特性

### 🏠 仪表板 (Dashboard)
- 系统概览和关键指标
- 后端服务状态监控
- 快速操作入口

### 📚 题目管理 (Questions)
- 题目列表查看
- 新增题目
- 题目编辑和删除
- 按科目分类

### 📖 教材管理 (Materials)
- 教材文件上传
- 教材列表管理
- 文件类型支持：PDF, DOC, DOCX, TXT

### 👥 用户管理 (Users)
- 用户列表查看
- 用户信息管理
- 用户状态跟踪

### 📊 数据分析 (Analytics)
- 学习数据统计
- 学科练习分析
- 学习报告查看
- 游戏化系统数据

## 🔌 API 集成

### 后端API地址
- 开发环境：`http://localhost:3000`
- 生产环境：配置在 `src/utils/api.js`

### 主要API端点
- `/health` - 健康检查
- `/api/questions/*` - 题目管理
- `/api/materials/*` - 教材管理
- `/api/users/*` - 用户管理
- `/api/report/*` - 数据分析

### 认证机制
- 使用JWT Token进行身份验证
- Token存储在localStorage中
- 自动在请求头中添加Authorization

## 🎨 UI设计

### 设计原则
- 简洁易用的管理界面
- 响应式设计，支持移动端
- 统一的视觉风格

### 颜色系统
- 主色调：#3498db (蓝色)
- 辅助色：#2c3e50 (深灰)
- 成功色：#27ae60 (绿色)
- 警告色：#f39c12 (橙色)
- 错误色：#e74c3c (红色)

## 🛠️ 开发指南

### 添加新页面
1. 在 `src/views/` 下创建新目录
2. 创建 `index.vue` 组件
3. 在 `src/router/index.ts` 中添加路由
4. 在 `src/App.vue` 中添加导航链接

### API调用方式
```javascript
import api from '@/utils/api'

// 示例：获取题目列表
const questions = await api.questions.getList()

// 示例：创建新题目
await api.questions.create(questionData)
```

### 错误处理
- API错误会在控制台输出
- 用户友好的错误提示使用alert()
- 网络错误自动重试

## 📱 响应式设计

- 桌面端：>=1200px
- 平板端：768px - 1199px  
- 移动端：<768px

导航在移动端会自动适配为折叠样式。

## 🔍 调试说明

### 开发者工具
- 在浏览器中按F12打开开发者工具
- Network标签查看API请求
- Console标签查看日志输出

### 常见问题
1. **页面空白**：检查路由配置和组件导入
2. **API调用失败**：确认后端服务运行在localhost:3000
3. **登录失败**：检查用户名密码是否为admin/admin123

## 📈 性能优化

- 组件懒加载
- API请求并行化
- 合理的缓存策略
- 响应式图片加载

## 🚀 部署说明

### 构建生产版本
```bash
npm run build
```

### 预览生产版本
```bash
npm run preview
```

构建后的文件将在 `dist/` 目录中。

---

**技术栈：** Vue 3 + Vite + Vue Router + JavaScript ES6+ 