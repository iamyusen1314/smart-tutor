#!/bin/bash
# 🚀 小学AI家教系统 - 阿里云服务器初始化脚本
# 使用方法: bash server_init.sh

set -e  # 遇到错误立即退出

echo "🚀 开始初始化阿里云服务器..."

# 检查是否为root用户
if [ "$EUID" -eq 0 ]; then
    echo "❌ 请不要使用root用户运行此脚本"
    echo "💡 请使用普通用户并确保有sudo权限"
    exit 1
fi

# 1. 更新系统
echo "📦 更新系统包..."
sudo apt update && sudo apt upgrade -y

# 2. 安装基础工具
echo "🔧 安装基础工具..."
sudo apt-get install -y curl wget git vim htop

# 3. 安装Node.js 18.x
echo "📦 安装Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证Node.js安装
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo "✅ Node.js版本: $NODE_VERSION"
echo "✅ NPM版本: $NPM_VERSION"

# 4. 安装MongoDB
echo "📦 安装MongoDB..."
sudo apt-get install -y gnupg curl

# 导入MongoDB公钥
curl -fsSL https://pgp.mongodb.com/server-6.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg

# 添加MongoDB源
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# 更新包列表并安装MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# 5. 安装PM2 (进程管理)
echo "📦 安装PM2..."
sudo npm install -g pm2

# 6. 安装Nginx
echo "📦 安装Nginx..."
sudo apt-get install -y nginx

# 7. 创建项目目录
echo "📁 创建项目目录..."
sudo mkdir -p /var/www/smart-tutor
sudo chown -R $USER:$USER /var/www/smart-tutor

# 8. 配置MongoDB
echo "🔧 配置MongoDB..."
sudo systemctl start mongod
sudo systemctl enable mongod

# 创建MongoDB配置备份
sudo cp /etc/mongod.conf /etc/mongod.conf.backup

# 9. 配置防火墙
echo "🔥 配置防火墙..."
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw --force enable

# 10. 优化系统性能
echo "⚡ 优化系统性能..."
# 增加文件描述符限制
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# 11. 创建日志目录
echo "📝 创建日志目录..."
sudo mkdir -p /var/log/smart-tutor
sudo chown -R $USER:$USER /var/log/smart-tutor

# 12. 安装监控工具
echo "📊 安装监控工具..."
sudo apt-get install -y htop iotop nethogs

# 13. 设置时区
echo "🕐 设置时区为上海..."
sudo timedatectl set-timezone Asia/Shanghai

# 14. 验证安装
echo "🔍 验证安装..."
echo "Node.js: $(node -v)"
echo "NPM: $(npm -v)"
echo "PM2: $(pm2 -v)"
echo "MongoDB: $(mongod --version | head -1)"
echo "Nginx: $(nginx -v 2>&1)"

# 15. 创建快捷脚本
echo "📝 创建管理脚本..."
cat > /home/$USER/smart-tutor-status.sh << 'EOF'
#!/bin/bash
echo "=== 小学AI家教系统状态 ==="
echo "📊 PM2进程状态:"
pm2 status
echo ""
echo "🔧 MongoDB状态:"
sudo systemctl status mongod --no-pager -l
echo ""
echo "🌐 Nginx状态:"
sudo systemctl status nginx --no-pager -l
echo ""
echo "💾 磁盘使用:"
df -h
echo ""
echo "🧠 内存使用:"
free -h
EOF

chmod +x /home/$USER/smart-tutor-status.sh

# 16. 输出完成信息
echo ""
echo "🎉 服务器初始化完成！"
echo ""
echo "📋 安装摘要:"
echo "✅ Node.js: $NODE_VERSION"
echo "✅ NPM: $NPM_VERSION"  
echo "✅ PM2: 已安装"
echo "✅ MongoDB: 已安装并启动"
echo "✅ Nginx: 已安装"
echo "✅ 防火墙: 已配置"
echo "✅ 项目目录: /var/www/smart-tutor"
echo ""
echo "🔧 管理命令:"
echo "查看系统状态: ./smart-tutor-status.sh"
echo "查看MongoDB日志: sudo journalctl -u mongod -f"
echo "查看Nginx日志: sudo journalctl -u nginx -f"
echo ""
echo "🚀 下一步: 运行部署脚本 deploy.sh" 