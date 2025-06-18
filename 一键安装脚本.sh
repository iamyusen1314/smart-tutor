#!/bin/bash
# 🚀 小学AI家教系统 - ECS一键安装脚本
# 使用方法: bash 一键安装脚本.sh

set -e  # 遇到错误立即退出

echo "🚀 开始安装小学AI家教系统..."
echo "📊 服务器信息检查..."

# 检查系统信息
echo "操作系统: $(lsb_release -d | cut -f2)"
echo "内存: $(free -h | awk '/^Mem:/ {print $2}')"
echo "磁盘: $(df -h / | awk 'NR==2 {print $4}') 可用"

# 1. 更新系统
echo "📦 更新系统包..."
apt update && apt upgrade -y

# 2. 安装基础工具
echo "🔧 安装基础工具..."
apt install -y curl wget git vim htop unzip software-properties-common

# 3. 安装Node.js 18.x
echo "🟢 安装Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# 验证Node.js安装
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo "✅ Node.js版本: $NODE_VERSION"
echo "✅ NPM版本: $NPM_VERSION"

# 4. 安装MongoDB 6.0
echo "💾 安装MongoDB 6.0..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update
apt-get install -y mongodb-org

# 5. 启动MongoDB
echo "🔄 启动MongoDB服务..."
systemctl start mongod
systemctl enable mongod

# 检查MongoDB状态
if systemctl is-active --quiet mongod; then
    echo "✅ MongoDB服务运行正常"
else
    echo "❌ MongoDB服务启动失败"
    exit 1
fi

# 6. 安装PM2
echo "⚙️ 安装PM2进程管理器..."
npm install -g pm2

# 7. 创建项目目录
echo "📁 创建项目目录..."
mkdir -p /var/www/smart-tutor
cd /var/www/smart-tutor

# 设置目录权限
chown -R root:root /var/www/smart-tutor

# 8. 配置防火墙（如果需要）
echo "🔥 配置防火墙..."
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw allow 3000  # Node.js应用
echo "y" | ufw enable

# 9. 优化系统配置
echo "⚡ 优化系统配置..."
# 增加文件描述符限制
echo "* soft nofile 65535" >> /etc/security/limits.conf
echo "* hard nofile 65535" >> /etc/security/limits.conf

# 10. 创建环境配置文件模板
echo "📝 创建环境配置模板..."
cat > /var/www/smart-tutor/.env.template << 'EOF'
# MongoDB配置
MONGODB_URI=mongodb://localhost:27017/smart_tutor

# 千问API配置
DASHSCOPE_API_KEY=sk-your-api-key-here

# JWT配置
JWT_SECRET=your-jwt-secret-here

# 服务器配置
PORT=3000
NODE_ENV=production

# 日志级别
LOG_LEVEL=info
EOF

echo ""
echo "🎉 安装完成！"
echo "=================================="
echo "📊 安装总结:"
echo "✅ Node.js: $NODE_VERSION"
echo "✅ NPM: $NPM_VERSION"
echo "✅ MongoDB: 已安装并启动"
echo "✅ PM2: 已安装"
echo "✅ 项目目录: /var/www/smart-tutor"
echo "=================================="
echo ""
echo "📋 下一步操作："
echo "1. 上传您的项目代码到 /var/www/smart-tutor"
echo "2. 配置环境变量文件 .env"
echo "3. 安装项目依赖: npm install"
echo "4. 启动应用: pm2 start app.js"
echo ""
echo "💡 提示: 当前目录是 $(pwd)"
echo "💡 MongoDB状态: $(systemctl is-active mongod)" 