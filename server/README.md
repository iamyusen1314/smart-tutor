# 小学AI家教后端服务

## 📋 项目说明

这是小学AI家教小程序的后端服务，主要提供OCR识别、用户认证等功能。

## 🚀 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

在 `server` 目录下创建 `.env` 文件，添加以下配置：

```env
# 服务器端口
PORT=3000

# 阿里通义千问API配置
QWEN_API_KEY=你的阿里通义千问API_Key

# 数据库配置（可选，当前版本暂未使用）
MONGODB_URI=mongodb://localhost:27017/smart_tutor

# JWT密钥（可选，当前版本暂未使用）
JWT_SECRET=your_jwt_secret_key

# 环境标识
NODE_ENV=development
```

### 3. 获取阿里通义千问API密钥

1. 访问 [阿里云灵积平台](https://dashscope.console.aliyun.com/)

### 4. 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

### 5. 验证服务

访问以下地址验证服务状态：

- 健康检查：http://localhost:3000/health
- OCR状态：http://localhost:3000/api/ocr/status

## 📡 API接口

### OCR识别接口

**POST** `/api/ocr/recognize`

请求体：
```json
{
  "imageData": "base64编码的图片数据",
  "accurate": false
}
```

响应：
```json
{
  "message": "OCR识别成功",
  "data": {
    "ocrText": ["识别的文字行1", "识别的文字行2"],
    "subject": "math",
    "grade": 3,
    "questionCount": 5,
    "estimatedTotalTime": 15,
    "confidence": 0.92,
    "recognitionTime": 1.23
  }
}
```

### 认证接口

**POST** `/api/auth/wechat-login`

请求体：
```json
{
  "code": "微信登录code",
  "userInfo": {
    "nickName": "用户昵称",
    "avatarUrl": "头像URL"
  }
}
```

## 🛠️ 技术栈

- **Node.js** - 运行环境
- **Express** - Web框架
- **axios** - HTTP客户端
- **form-data** - 表单数据处理
- **dotenv** - 环境变量管理

## 📁 项目结构

```
server/
├── app.js              # 应用入口文件
├── package.json        # 项目配置
├── .env               # 环境变量（需要自己创建）
├── routes/            # 路由文件
│   ├── ocr.js         # OCR相关路由
│   └── auth.js        # 认证相关路由
└── README.md          # 项目文档
```

## 🚨 注意事项

1. **API密钥安全**：请务必将阿里通义千问的API密钥配置在`.env`文件中，不要硬编码在代码里
2. **网络配置**：确保小程序能访问到后端服务地址
3. **图片大小**：建议图片大小不超过4MB，以确保识别效果和性能
4. **并发限制**：阿里通义千问API有并发和调用次数限制，请根据实际需求选择合适的套餐

## 🐛 常见问题

### 1. 无法启动服务

- 检查Node.js版本是否>=16.0.0
- 检查是否已安装依赖：`npm install`
- 检查端口是否被占用

### 2. OCR识别失败

- 检查`.env`文件中的阿里通义千问API密钥是否正确
- 检查网络连接是否正常
- 检查图片格式和大小是否符合要求

### 3. 小程序无法连接后端

- 检查小程序中的`baseURL`配置
- 确保后端服务已正常启动
- 检查防火墙和网络配置 