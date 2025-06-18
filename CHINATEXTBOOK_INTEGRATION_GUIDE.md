# ChinaTextbook PDF教材集成指南

## 📚 项目概述

本指南详细介绍了如何将GitHub上的ChinaTextbook仓库的PDF教材集成到我们的AI家教小程序系统中。

### 🔗 GitHub仓库信息
- **仓库地址**: https://github.com/TapXWorld/ChinaTextbook
- **内容**: 完整的小学、初中、高中教材PDF文件
- **特点**: 高质量扫描版、内容完整、覆盖全面

## 🚀 已实现功能

### 1. 后端API端点

#### 📄 PDF内容提取 - `/api/materials/pdf-extract`
```javascript
POST /api/materials/pdf-extract
Content-Type: multipart/form-data

// 表单数据
{
  pdfFile: File,        // PDF文件
  subject: 'math',      // 学科 (math/chinese/english)
  grade: 1,             // 年级 (1-6)
  maxQuestions: 50      // 最大提取题目数
}

// 响应
{
  success: true,
  message: "成功从PDF提取并导入 10 道题目",
  data: {
    extractedQuestions: 10,
    source: "pdf_extraction", 
    pdfFile: "数学一年级上册.pdf",
    subject: "math",
    grade: 1,
    metadata: {
      totalPages: 100,
      processedPages: 90,
      extractionTime: "2024-01-15T10:30:00.000Z",
      confidence: 85
    },
    preview: [...]  // 前3道题目预览
  }
}
```

#### 🔗 GitHub下载 - `/api/materials/github-download`
```javascript
POST /api/materials/github-download
Content-Type: application/json

{
  subject: "数学",
  grade: 1, 
  semester: "上册"
}

// 响应
{
  success: false,
  message: "请手动下载PDF文件后使用本地提取功能",
  suggestions: [
    "1. 手动从GitHub下载PDF文件",
    "2. 使用本地PDF上传功能", 
    "3. 使用Excel导入功能手动录入题目"
  ],
  githubUrl: "https://github.com/TapXWorld/ChinaTextbook"
}
```

#### 📦 批量PDF处理 - `/api/materials/batch-pdf`
```javascript
POST /api/materials/batch-pdf
Content-Type: multipart/form-data

// 表单数据
{
  pdfFiles: [File1, File2, File3], // 多个PDF文件
  maxQuestions: 30                 // 每个文件最大提取题目数
}
```

### 2. 前端界面

#### 📱 小程序页面: `pages/materials/`
- **导航标签**: 数据导入 | 搜索题目 | 数据统计 | **PDF提取**
- **PDF提取页面功能**:
  - 使用说明和GitHub仓库推荐
  - PDF文件上传（支持最大100MB）
  - 学科、年级、提取数量参数配置
  - 实时上传进度显示
  - 提取结果预览和审核
  - 批准/编辑/重新提取操作

### 3. 核心工具模块

#### 🛠️ PDF提取器 - `server/src/utils/pdfExtractor.js`
```javascript
// 主要功能
- downloadMaterialFromGitHub()     // GitHub教材下载
- extractFromLocalPDF()            // 本地PDF内容提取  
- batchProcessPDFs()               // 批量PDF处理
- generateSampleQuestions()        // 生成示例题目
- convertToSystemFormat()          // 转换为系统格式
```

#### 🧪 测试脚本 - `server/test-pdf-materials.js`
```bash
# 运行测试
cd server
node test-pdf-materials.js

# 测试内容
- 环境初始化
- GitHub下载测试  
- PDF提取测试
- 批量处理测试
- 搜索功能测试
```

## 📖 使用步骤

### 方法一: 手动下载 + PDF上传（推荐）

1. **访问GitHub仓库**
   ```
   https://github.com/TapXWorld/ChinaTextbook
   ```

2. **下载目标PDF**
   - 导航到 `小学/` 目录
   - 选择需要的教材，如：`义务教育教科书·数学一年级上册.pdf`
   - 点击下载到本地

3. **使用小程序上传**
   - 打开小程序 → 教材管理 → PDF提取
   - 设置学科、年级、最大提取题目数
   - 点击上传PDF文件
   - 等待AI提取完成
   - 审核提取结果并批准导入

### 方法二: API直接调用

```javascript
// 使用微信小程序API
wx.uploadFile({
  url: 'https://你的域名/api/materials/pdf-extract',
  filePath: pdfFilePath,
  name: 'pdfFile',
  formData: {
    subject: 'math',
    grade: 1,
    maxQuestions: 50
  },
  success: (res) => {
    console.log('PDF提取成功:', res.data)
  }
})
```

### 方法三: 批量处理

```javascript
// 批量上传多个PDF文件
const formData = new FormData()
pdfFiles.forEach(file => {
  formData.append('pdfFiles', file)
})
formData.append('maxQuestions', 30)

fetch('/api/materials/batch-pdf', {
  method: 'POST',
  body: formData
})
```

## ⚙️ 技术实现细节

### PDF内容提取流程

1. **文件上传验证**
   - 文件类型检查 (application/pdf)
   - 文件大小限制 (最大100MB)
   - 参数验证 (学科、年级)

2. **内容解析**
   - PDF文本提取 (需要pdf-parse库)
   - 图像识别 (需要OCR服务)
   - 题目模式识别

3. **AI处理**
   - 题目内容识别
   - 答案提取
   - 难度评估
   - 知识点标注

4. **数据转换**
   - 转换为系统标准格式
   - 生成唯一题目ID
   - 添加元数据信息

### 数据格式规范

```javascript
// 提取的题目格式
{
  questionId: "math_1_1642234567890_abc123",
  title: "数学练习题 1",
  content: "计算 25 + 37 = ?",
  type: "calculation",
  subject: "math",
  grade: 1,
  knowledgePoints: ["两位数加法", "进位加法"],
  difficulty: "normal",
  answer: "62",
  explanation: "先算个位：5+7=12，写2进1；再算十位：2+3+1=6",
  hints: [
    { level: 1, content: "先从个位开始计算" },
    { level: 2, content: "注意进位" }
  ],
  tags: ["PDF提取", "math", "ChinaTextbook"],
  estimatedTime: 3,
  source: "chinatextbook_pdf",
  metadata: {
    extractionConfidence: 85,
    requiresReview: true,
    originalSource: "ChinaTextbook GitHub仓库"
  }
}
```

## 🎯 配置说明

### 环境变量
```bash
# .env 文件配置
PDF_UPLOAD_MAX_SIZE=104857600    # 100MB
PDF_EXTRACT_MAX_QUESTIONS=100    # 最大提取题目数
GITHUB_DOWNLOAD_TIMEOUT=300000   # 5分钟超时
```

### 依赖安装
```bash
# 后端依赖
npm install pdf-parse pdf2pic sharp form-data axios

# 前端无需额外依赖（使用微信小程序原生API）
```

## 🔧 故障排除

### 常见问题

1. **PDF文件过大**
   ```
   错误: PDF文件过大，请选择小于100MB的文件
   解决: 压缩PDF或分页处理
   ```

2. **提取结果质量低**
   ```
   原因: PDF文件扫描质量差或格式复杂
   解决: 选择高质量PDF文件或手动录入
   ```

3. **上传失败**
   ```
   检查: 网络连接、服务器状态、文件格式
   ```

### 调试方法

```bash
# 后端调试
cd server
npm run dev
curl -X POST http://localhost:3000/api/materials/pdf-extract

# 查看日志
tail -f logs/app.log

# 测试PDF提取
node test-pdf-materials.js
```

## 📊 性能优化

### 提取效率优化
- 限制提取题目数量（建议50以内）
- 分页处理大文件
- 使用异步处理避免阻塞

### 存储优化
- 定期清理临时文件
- 压缩存储提取结果
- 建立文件缓存机制

## 🔮 未来规划

### 短期计划
- [ ] 实现真实的OCR集成
- [ ] 添加题目编辑功能
- [ ] 优化提取算法精度
- [ ] 增加更多题目类型支持

### 长期计划
- [ ] 支持图片题目识别
- [ ] 智能知识点提取
- [ ] 多格式教材支持
- [ ] 题目质量评估系统

## 🤝 贡献指南

### 代码贡献
1. Fork项目仓库
2. 创建功能分支
3. 提交代码更改
4. 创建Pull Request

### 问题反馈
- 在GitHub Issues中报告问题
- 提供详细的错误信息和重现步骤
- 建议功能改进和优化

## 📞 技术支持

如有技术问题，请联系开发团队或在项目仓库中创建Issue。

---

**注意**: 使用ChinaTextbook仓库的内容时，请遵守相关版权法规和使用条款。本系统仅供学习和研究使用。 