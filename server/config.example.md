# 后端环境配置说明

## 环境变量配置

请在 `server` 目录下创建 `.env` 文件，并配置以下环境变量：

```bash
# 服务器配置
PORT=3000
NODE_ENV=development

# 阿里通义千问API配置 (必需)
# 在阿里云灵积平台获取: https://dashscope.console.aliyun.com/
QWEN_API_KEY=your_qwen_api_key_here
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# JWT密钥配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# 数据库配置 (MongoDB)
MONGODB_URI=mongodb://localhost:27017/smart_tutor

# 文件上传配置
UPLOAD_MAX_SIZE=10485760  # 10MB
```

## 获取API密钥步骤

### 1. 阿里通义千问 API
1. 访问 [阿里云灵积平台](https://dashscope.console.aliyun.com/)
2. 注册或登录账户
3. 创建API密钥
4. 复制API Key到环境变量

## 测试配置

配置完成后，启动服务器并访问以下接口测试：

- OCR服务状态: `GET http://localhost:3000/api/ocr/status`
- 健康检查: `GET http://localhost:3000/health`

## 注意事项

- 如果不配置阿里通义千问密钥，系统将使用模拟数据运行 