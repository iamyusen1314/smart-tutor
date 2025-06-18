# 千问VL模型配置指南

## 🎯 目标
配置阿里云千问VL模型API密钥，实现真实的图像文字识别功能。

## 📋 步骤一：获取API密钥

### 1. 登录阿里云控制台
访问：https://dashscope.console.aliyun.com/

### 2. 开通服务
- 开通**DashScope模型服务**
- 选择**通义千问VL模型**
- 确认服务条款并开通

### 3. 创建API密钥
1. 进入**API密钥管理**页面
2. 点击**创建API密钥**
3. 复制生成的API密钥（格式类似：`sk-xxxxxxxxxxxxxxxxxx`）

## 📋 步骤二：配置环境变量

### 创建环境变量文件
在 `server/` 目录下创建 `.env` 文件：

```bash
# 在 server 目录下执行
touch .env
```

### 添加配置内容
打开 `.env` 文件，添加以下内容：

```bash
# 阿里云DashScope API配置
DASHSCOPE_API_KEY=sk-your-actual-api-key-here
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com

# 应用配置
NODE_ENV=development
PORT=3000

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/smart_tutor

# JWT配置
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d

# 服务配置
CORS_ORIGIN=http://localhost:8085
```

**⚠️ 重要提醒**：
- 将 `sk-your-actual-api-key-here` 替换为您的真实API密钥
- 请勿将 `.env` 文件提交到代码仓库

## 📋 步骤三：重启服务

配置完成后，重启后端服务：

```bash
# 在 server 目录下执行
node app.js
```

## 📋 步骤四：验证配置

### 检查OCR状态
```bash
curl -s http://localhost:3000/api/ocr/status | python3 -m json.tool
```

**期望结果**：
- `status`: "active"（而不是 "not_configured"）
- `configured`: true

### 测试真实识别
在小程序中：
1. 进入OCR拍照页面
2. 上传图片
3. 查看识别结果（应该是真实的图片内容）

## 💰 计费说明

千问VL模型按使用量计费：
- **输入Token**：约 0.008元/1K tokens
- **输出Token**：约 0.024元/1K tokens
- 一次OCR识别大概消耗 100-500 tokens
- 成本约：0.001-0.005元/次

## 🔧 故障排除

### 常见问题

**1. API密钥错误**
- 确认API密钥格式正确（sk-开头）
- 检查是否有复制错误或多余空格

**2. 服务未开通**
- 确认在阿里云控制台开通了DashScope服务
- 确认账户余额充足

**3. 网络连接问题**
- 检查网络连接
- 确认没有防火墙阻止

### 调试方法

查看后端服务日志：
```bash
# 重启服务并查看详细日志
node app.js
```

关键日志信息：
- `🚀 调用千问VL模型进行OCR识别...`
- `🔍 千问VL模型API响应状态: 200`
- `📝 千问VL模型识别内容: ...`

## 📞 技术支持

如果遇到问题，请：
1. 检查API密钥配置
2. 查看后端服务日志
3. 确认网络连接正常
4. 检查阿里云服务状态 