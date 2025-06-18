#!/bin/bash
echo "🚀 开始小学AI家教系统云端一键安装..."
echo "=========================================="

# 更新系统
echo "📦 更新系统包..."
sudo apt update && sudo apt upgrade -y

# 安装基础工具
echo "🔧 安装基础工具..."
sudo apt install -y curl wget git vim htop ufw

# 安装Node.js 18.x
echo "📦 安装Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证Node.js安装
echo "✅ 验证Node.js版本..."
node --version
npm --version

# 安装MongoDB 6.0
echo "📦 安装MongoDB 6.0..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# 启动MongoDB
echo "🔧 配置并启动MongoDB..."
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod

# 安装PM2
echo "📦 安装PM2进程管理器..."
sudo npm install -g pm2

# 配置防火墙
echo "🔧 配置防火墙..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw --force enable

# 创建项目目录
echo "📁 创建项目目录..."
sudo mkdir -p /var/www/smart-tutor
sudo chown -R $USER:$USER /var/www/smart-tutor
cd /var/www/smart-tutor

# 创建环境变量模板
echo "📝 创建环境变量模板..."
cat > .env << 'ENVEOF'
# 数据库配置
MONGODB_URI=mongodb://localhost:27017/smart_tutor
DB_NAME=smart_tutor

# 服务器配置
PORT=3000
NODE_ENV=production

# API密钥 (需要您填写)
DASHSCOPE_API_KEY=您的阿里云DashScope API Key
JWT_SECRET=您的JWT密钥

# 可选配置
LOG_LEVEL=info
UPLOAD_PATH=/var/www/smart-tutor/uploads
ENVEOF

echo "🎉 一键安装完成！"
echo "=========================================="
echo "📋 下一步操作："
echo "1. 上传项目代码到 /var/www/smart-tutor"
echo "2. 配置 .env 文件中的API密钥"
echo "3. 安装项目依赖：npm install"
echo "4. 启动应用：pm2 start app.js"
echo "=========================================="
