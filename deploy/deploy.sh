#!/bin/bash
# 📦 小学AI家教系统 - 项目部署脚本
# 使用方法: bash deploy.sh [github_repo_url] [dashscope_api_key]

set -e  # 遇到错误立即退出

# 参数检查
if [ $# -lt 2 ]; then
    echo "❌ 参数不足"
    echo "📋 使用方法: bash deploy.sh [github_repo_url] [dashscope_api_key]"
    echo "📋 示例: bash deploy.sh https://github.com/yourusername/smart_tutor.git sk-your-api-key"
    exit 1
fi

REPO_URL=$1
API_KEY=$2
PROJECT_DIR="/var/www/smart-tutor"

echo "📦 开始部署小学AI家教系统..."
echo "📍 仓库地址: $REPO_URL"
echo "📁 部署目录: $PROJECT_DIR"

# 1. 检查必要服务状态
echo "🔍 检查系统服务状态..."

# 检查MongoDB
if ! sudo systemctl is-active --quiet mongod; then
    echo "🔧 启动MongoDB..."
    sudo systemctl start mongod
fi

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先运行 server_init.sh"
    exit 1
fi

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2未安装，请先运行 server_init.sh"
    exit 1
fi

# 2. 创建项目目录
echo "📁 准备项目目录..."
if [ ! -d "$PROJECT_DIR" ]; then
    sudo mkdir -p $PROJECT_DIR
    sudo chown -R $USER:$USER $PROJECT_DIR
fi

cd $PROJECT_DIR

# 3. 克隆或更新代码
if [ -d ".git" ]; then
    echo "🔄 更新现有代码..."
    git pull origin main
else
    echo "📥 首次部署，克隆代码..."
    git clone $REPO_URL .
fi

# 4. 后端部署
echo "🚀 部署后端服务..."
cd server

# 安装依赖
echo "📚 安装后端依赖..."
npm install

# 5. 创建环境变量文件
echo "🔧 配置环境变量..."
cat > .env << EOF
# 数据库配置
MONGODB_URI=mongodb://localhost:27017/smart_tutor

# AI服务配置  
DASHSCOPE_API_KEY=$API_KEY

# 服务器配置
PORT=3000
NODE_ENV=production

# JWT配置
JWT_SECRET=$(openssl rand -base64 32)

# 日志配置
LOG_LEVEL=info
LOG_DIR=/var/log/smart-tutor

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10MB
EOF

# 6. 创建日志目录
echo "📝 创建日志目录..."
mkdir -p /var/log/smart-tutor
mkdir -p ./uploads

# 7. 运行数据库初始化（如果需要）
echo "🗄️ 初始化数据库..."
if ! mongo smart_tutor --eval "db.stats()" &> /dev/null; then
    echo "🆕 首次部署，创建数据库..."
    mongo smart_tutor --eval "db.createCollection('users')"
fi

# 8. PM2配置文件
echo "🔧 创建PM2配置..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'smart-tutor-backend',
    script: 'app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/smart-tutor/error.log',
    out_file: '/var/log/smart-tutor/out.log',
    log_file: '/var/log/smart-tutor/combined.log',
    time: true
  }]
}
EOF

# 9. 启动后端服务
echo "🚀 启动后端服务..."
pm2 delete smart-tutor-backend 2>/dev/null || true
pm2 start ecosystem.config.js

# 10. 配置PM2开机启动
echo "🔄 配置开机自启..."
pm2 startup
pm2 save

# 11. 健康检查
echo "🔍 健康检查..."
sleep 5

# 等待服务启动
for i in {1..30}; do
    if curl -f http://localhost:3000/health &> /dev/null; then
        echo "✅ 后端服务启动成功"
        break
    fi
    echo "⏳ 等待服务启动... ($i/30)"
    sleep 2
    if [ $i -eq 30 ]; then
        echo "❌ 服务启动超时"
        pm2 logs smart-tutor-backend --lines 20
        exit 1
    fi
done

# 12. 创建管理脚本
echo "📝 创建管理脚本..."
cd /home/$USER

cat > smart-tutor-deploy.sh << 'EOF'
#!/bin/bash
# 快速重新部署脚本

echo "🔄 重新部署小学AI家教系统..."
cd /var/www/smart-tutor

# 更新代码
git pull origin main

# 更新后端
cd server
npm install

# 重启服务
pm2 reload smart-tutor-backend

echo "✅ 部署完成"
pm2 status
EOF

cat > smart-tutor-logs.sh << 'EOF'
#!/bin/bash
# 查看日志脚本

case "$1" in
    "app")
        pm2 logs smart-tutor-backend
        ;;
    "mongo")
        sudo journalctl -u mongod -f
        ;;
    "nginx")
        sudo journalctl -u nginx -f
        ;;
    "error")
        tail -f /var/log/smart-tutor/error.log
        ;;
    *)
        echo "使用方法: ./smart-tutor-logs.sh [app|mongo|nginx|error]"
        ;;
esac
EOF

chmod +x smart-tutor-deploy.sh smart-tutor-logs.sh

# 13. 创建备份脚本
cat > smart-tutor-backup.sh << 'EOF'
#!/bin/bash
# 备份脚本

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/smart-tutor"

echo "📦 开始备份..."

# 创建备份目录
sudo mkdir -p $BACKUP_DIR

# 备份MongoDB
echo "💾 备份数据库..."
mongodump --db smart_tutor --out $BACKUP_DIR/mongodb_$DATE

# 备份代码
echo "📁 备份代码..."
tar -czf $BACKUP_DIR/code_$DATE.tar.gz /var/www/smart-tutor

# 备份配置
echo "⚙️ 备份配置..."
sudo tar -czf $BACKUP_DIR/config_$DATE.tar.gz /etc/nginx/sites-available/ /etc/mongod.conf

# 清理7天前的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete 2>/dev/null || true

echo "✅ 备份完成: $BACKUP_DIR"
ls -la $BACKUP_DIR/
EOF

chmod +x smart-tutor-backup.sh

# 14. 获取服务器IP
SERVER_IP=$(curl -s ifconfig.me)

# 15. 输出完成信息
echo ""
echo "🎉 部署完成！"
echo ""
echo "📋 部署摘要:"
echo "✅ 代码仓库: $REPO_URL"
echo "✅ 项目目录: $PROJECT_DIR"
echo "✅ 后端服务: 已启动"
echo "✅ PM2管理: 已配置"
echo "✅ 开机自启: 已配置"
echo ""
echo "🌐 访问地址:"
echo "🔗 API服务: http://$SERVER_IP:3000"
echo "🔗 健康检查: http://$SERVER_IP:3000/health"
echo ""
echo "🔧 管理命令:"
echo "查看状态: ./smart-tutor-status.sh"
echo "查看日志: ./smart-tutor-logs.sh app"
echo "重新部署: ./smart-tutor-deploy.sh"
echo "系统备份: ./smart-tutor-backup.sh"
echo ""
echo "📱 小程序配置:"
echo "请将小程序API地址更新为: http://$SERVER_IP:3000"
echo ""
echo "🔒 下一步: 配置域名和SSL证书"
echo "运行: bash ssl_setup.sh [your-domain.com]" 