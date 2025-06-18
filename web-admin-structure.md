# Web管理后台架构规划

## 🏗️ 目录结构

```
smart-tutor-admin/          # Web管理后台
├── public/                 # 静态资源
├── src/
│   ├── components/         # 组件库
│   │   ├── Layout/         # 布局组件
│   │   ├── Tables/         # 表格组件
│   │   ├── Charts/         # 图表组件
│   │   ├── Upload/         # 文件上传组件
│   │   └── Common/         # 通用组件
│   ├── views/              # 页面视图
│   │   ├── Dashboard/      # 仪表板
│   │   ├── Materials/      # 教材管理
│   │   │   ├── List.vue    # 教材列表
│   │   │   ├── Upload.vue  # 教材上传
│   │   │   ├── Edit.vue    # 教材编辑
│   │   │   └── Preview.vue # 教材预览
│   │   ├── Questions/      # 题库管理
│   │   │   ├── List.vue    # 题目列表
│   │   │   ├── Import.vue  # 批量导入
│   │   │   ├── Edit.vue    # 题目编辑
│   │   │   └── Review.vue  # 内容审核
│   │   ├── Users/          # 用户管理
│   │   ├── Analytics/      # 数据分析
│   │   └── Settings/       # 系统设置
│   ├── store/              # 状态管理
│   ├── router/             # 路由配置
│   ├── api/                # API接口
│   └── utils/              # 工具函数
├── package.json
└── README.md
```

## 🛠️ 技术栈建议

### 前端技术栈
- **Vue 3 + TypeScript**：现代化的响应式框架
- **Element Plus**：企业级UI组件库
- **Vue Router 4**：路由管理
- **Pinia**：状态管理
- **Echarts**：数据可视化
- **Vite**：构建工具

### 核心功能模块

#### 1. 教材管理模块
```typescript
// 教材管理接口
interface MaterialManagement {
  // 文件上传（支持大文件、断点续传）
  uploadLargeFile(file: File, onProgress: (progress: number) => void): Promise<string>
  
  // PDF内容解析
  parsePDF(fileId: string): Promise<PDFContent>
  
  // 批量题目生成
  generateQuestions(content: PDFContent): Promise<Question[]>
  
  // 教材分类管理
  manageCategories(): Promise<Category[]>
}
```

#### 2. 题库管理模块
```typescript
// 题库管理接口
interface QuestionBank {
  // 批量导入题目
  batchImport(file: File, format: 'excel' | 'json' | 'csv'): Promise<ImportResult>
  
  // 题目质量检测
  qualityCheck(questions: Question[]): Promise<QualityReport>
  
  // 智能分类标签
  autoTagging(question: Question): Promise<string[]>
  
  // 难度智能评估
  assessDifficulty(question: Question): Promise<DifficultyLevel>
}
```

#### 3. 数据分析模块
```typescript
// 数据分析接口
interface Analytics {
  // 学习效果分析
  analyzeLearningEffectiveness(): Promise<EffectivenessReport>
  
  // 知识点掌握情况
  analyzeKnowledgePoints(): Promise<KnowledgeReport>
  
  // 个性化推荐算法
  generateRecommendations(userId: string): Promise<Recommendation[]>
  
  // 教材使用统计
  getMaterialUsageStats(): Promise<UsageStats>
}
```

## 🔐 权限管理系统

### 角色定义
```typescript
enum UserRole {
  SUPER_ADMIN = 'super_admin',    // 超级管理员
  SYSTEM_ADMIN = 'system_admin',  // 系统管理员
  CONTENT_ADMIN = 'content_admin', // 内容管理员
  TEACHER = 'teacher',            // 教师
  REVIEWER = 'reviewer'           // 审核员
}

// 权限矩阵
const PermissionMatrix = {
  [UserRole.SUPER_ADMIN]: ['*'], // 所有权限
  [UserRole.SYSTEM_ADMIN]: [
    'user.manage', 'system.config', 'data.export'
  ],
  [UserRole.CONTENT_ADMIN]: [
    'material.manage', 'question.manage', 'content.review'
  ],
  [UserRole.TEACHER]: [
    'material.view', 'question.create', 'student.view'
  ],
  [UserRole.REVIEWER]: [
    'content.review', 'quality.check'
  ]
}
```

## 📊 核心功能页面设计

### 1. 仪表板 Dashboard
- 系统概览（用户数、内容数、学习数据）
- 实时监控（在线用户、系统状态）
- 快捷操作入口
- 数据趋势图表

### 2. 教材管理 Materials
- 教材库浏览（分类筛选、搜索）
- 大文件上传（支持拖拽、进度显示）
- PDF预览和标注
- 自动题目提取
- 版权信息管理

### 3. 题库管理 Questions  
- 题目库浏览（多维度筛选）
- 批量导入工具
- 在线题目编辑器
- 质量审核工作流
- 标签和分类管理

### 4. 用户管理 Users
- 用户列表和搜索
- 角色权限分配
- 学习数据查看
- 账户状态管理

### 5. 数据分析 Analytics
- 学习效果分析报告
- 知识点掌握热图
- 个性化推荐效果
- 系统使用统计

## 🚀 部署方案

### 开发环境
```bash
# 启动Web管理后台
cd smart-tutor-admin
npm run dev

# 启动后端API（共用）
cd ../server  
npm run dev
```

### 生产环境
```bash
# Web管理后台
https://admin.smarttutor.com

# 小程序API
https://api.smarttutor.com

# 文件存储
https://files.smarttutor.com
``` 