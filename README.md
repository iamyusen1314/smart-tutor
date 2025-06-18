# 小学AI家教 - Web管理后台

## 🎯 项目介绍

这是小学AI家教系统的Web管理后台，专门为教师、教研员和系统管理员提供内容管理和数据分析功能。

## 🏗️ 技术栈

- **前端框架**: Vue 3 + TypeScript
- **UI组件库**: Element Plus
- **构建工具**: Vite
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **图表库**: ECharts

## 📦 安装依赖

```bash
# 安装依赖
npm install

# 如果遇到依赖问题，可以尝试
npm install --legacy-peer-deps
```

## 🚀 运行项目

### 开发环境

```bash
# 启动开发服务器
npm run dev

# 访问地址
http://localhost:8080
```

### 生产环境

```bash
# 构建项目
npm run build

# 预览构建结果
npm run preview
```

## 🔗 API连接

Web管理后台会自动连接到后端API服务：

- **后端API**: http://localhost:3000
- **代理配置**: 已配置在`vite.config.ts`中

**确保后端服务正在运行**：
```bash
# 在项目根目录的server文件夹中
cd ../server
npm start
```

## 📋 功能模块

### ✅ 已实现功能

- [x] **基础框架**: Vue3 + Element Plus + TypeScript
- [x] **路由系统**: 多页面导航
- [x] **仪表板**: 系统概览和统计
- [x] **教材管理**: 基础界面和上传功能

### 🚧 开发中功能

- [ ] **题库管理**: 批量导入导出、质量审核
- [ ] **用户管理**: 角色权限、学习数据查看
- [ ] **数据分析**: 可视化图表、效果分析
- [ ] **系统设置**: 配置管理、权限控制

## 🎛️ 页面路由

| 路径 | 页面 | 状态 |
|------|------|------|
| `/dashboard` | 仪表板 | ✅ 完成 |
| `/materials` | 教材管理 | ✅ 基础版 |
| `/questions` | 题库管理 | 🚧 开发中 |
| `/users` | 用户管理 | 🚧 开发中 |
| `/analytics` | 数据分析 | 🚧 开发中 |

## 🔧 开发指南

### 添加新页面

1. 在`src/views/`下创建新的目录和组件
2. 在`src/router/index.ts`中添加路由配置
3. 在仪表板侧边栏中添加导航

### 调用API

```typescript
import axios from 'axios'

// API调用示例
const fetchData = async () => {
  try {
    const res = await axios.get('/api/materials/search')
    console.log(res.data)
  } catch (error) {
    console.error('API调用失败:', error)
  }
}
```

### 组件开发

```vue
<template>
  <div class="your-component">
    <!-- 使用Element Plus组件 -->
    <el-card>
      <el-button type="primary">按钮</el-button>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// TypeScript + Composition API
</script>
```

## 🧪 测试步骤

1. **启动后端服务**（必须）
   ```bash
   cd ../server && npm start
   ```

2. **启动Web管理后台**
   ```bash
   npm run dev
   ```

3. **访问管理后台**
   - 打开浏览器访问: http://localhost:8080
   - 自动跳转到仪表板页面

4. **功能测试**
   - 查看仪表板统计数据
   - 测试教材管理功能
   - 测试页面导航

## 📄 文件结构

```
admin-web/
├── src/
│   ├── views/          # 页面组件
│   │   ├── Dashboard/  # 仪表板
│   │   ├── Materials/  # 教材管理
│   │   ├── Questions/  # 题库管理
│   │   ├── Users/      # 用户管理
│   │   └── Analytics/  # 数据分析
│   ├── components/     # 公共组件
│   ├── router/         # 路由配置
│   ├── stores/         # 状态管理
│   ├── api/           # API接口
│   └── utils/         # 工具函数
├── package.json
├── vite.config.ts
└── README.md
```

## 🔍 故障排除

### 常见问题

1. **依赖安装失败**
   ```bash
   rm -rf node_modules package-lock.json
   npm install --legacy-peer-deps
   ```

2. **API连接失败**
   - 确保后端服务 `http://localhost:3000` 正在运行
   - 检查代理配置是否正确

3. **页面无法访问**
   - 检查路由配置
   - 确认组件文件路径正确

### 开发工具

- **Chrome DevTools**: 调试和网络检查
- **Vue DevTools**: Vue组件调试
- **Element Plus文档**: https://element-plus.org/

## 📞 支持

如果遇到问题，请检查：
1. 后端服务是否正常运行
2. 依赖是否正确安装
3. 浏览器控制台是否有错误信息 