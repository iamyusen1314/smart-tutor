#!/bin/bash
# 🔒 小学AI家教系统 - SSL证书配置脚本
# 使用方法: bash ssl_setup.sh [your-domain.com]

set -e  # 遇到错误立即退出

# 参数检查
if [ $# -lt 1 ]; then
    echo "❌ 参数不足"
    echo "📋 使用方法: bash ssl_setup.sh [your-domain.com]"
    echo "📋 示例: bash ssl_setup.sh api.smarttutor.com"
    exit 1
fi

DOMAIN=$1

echo "🔒 开始配置SSL证书..."
echo "🌐 域名: $DOMAIN"

# 1. 检查域名解析
echo "🔍 检查域名解析..."
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    echo "⚠️  警告: 域名解析不匹配"
    echo "🌐 服务器IP: $SERVER_IP"
    echo "🌐 域名解析IP: $DOMAIN_IP"
    echo "💡 请确保域名A记录指向服务器IP地址"
    read -p "是否继续配置? (y/N): " confirm
    if [[ $confirm != [yY] ]]; then
        exit 1
    fi
fi

# 2. 检查Nginx是否安装
if ! command -v nginx &> /dev/null; then
    echo "📦 安装Nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
fi

# 3. 安装Certbot
echo "📦 安装Certbot..."
sudo apt-get install -y certbot python3-certbot-nginx

# 4. 创建Nginx配置
echo "🔧 配置Nginx..."
sudo tee /etc/nginx/sites-available/smart-tutor << EOF
# 小学AI家教系统 - Nginx配置
server {
    listen 80;
    server_name $DOMAIN;
    
    # 强制HTTPS重定向（SSL证书申请后自动添加）
    
    # API代理
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 请求大小限制
        client_max_body_size 50M;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
    
    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # 隐藏Nginx版本
    server_tokens off;
}
EOF

# 5. 启用站点配置
echo "🔧 启用Nginx站点..."
sudo ln -sf /etc/nginx/sites-available/smart-tutor /etc/nginx/sites-enabled/

# 6. 删除默认站点（如果存在）
sudo rm -f /etc/nginx/sites-enabled/default

# 7. 测试Nginx配置
echo "🔍 测试Nginx配置..."
sudo nginx -t

# 8. 重启Nginx
echo "🔄 重启Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# 9. 检查防火墙
echo "🔥 配置防火墙..."
sudo ufw allow 'Nginx Full'

# 10. 申请SSL证书
echo "🔒 申请SSL证书..."
echo "📧 请输入您的邮箱地址（用于证书通知）:"
read -p "邮箱: " email

if [ -z "$email" ]; then
    echo "❌ 邮箱地址不能为空"
    exit 1
fi

# 申请证书
sudo certbot --nginx -d $DOMAIN --email $email --agree-tos --no-eff-email

# 11. 设置自动续期
echo "🔄 配置证书自动续期..."
sudo crontab -l 2>/dev/null | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | sudo crontab -

# 12. 验证SSL配置
echo "🔍 验证SSL配置..."
sleep 5

if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/health | grep -q "200"; then
    echo "✅ SSL配置成功！"
else
    echo "⚠️  SSL配置可能有问题，请检查"
fi

# 13. 创建SSL管理脚本
echo "📝 创建SSL管理脚本..."
cat > /home/$USER/ssl-renew.sh << 'EOF'
#!/bin/bash
# SSL证书续期脚本

echo "🔒 检查SSL证书状态..."
sudo certbot certificates

echo "🔄 尝试续期证书..."
sudo certbot renew --dry-run

echo "✅ 证书检查完成"
EOF

chmod +x /home/$USER/ssl-renew.sh

# 14. 更新小程序配置示例
cat > /home/$USER/miniprogram-config.js << EOF
// 小程序网络配置更新
// 文件路径: miniprogram/utils/config.js

const config = {
  // 云端HTTPS API地址
  apiBaseUrl: 'https://$DOMAIN',
  
  // 生产环境配置
  isDev: false,
  
  // 请求超时时间
  timeout: 30000,
  
  // 重试配置
  retryCount: 3,
  retryDelay: 1000
}

export default config
EOF

# 15. 输出完成信息
echo ""
echo "🎉 SSL证书配置完成！"
echo ""
echo "📋 配置摘要:"
echo "✅ 域名: $DOMAIN"
echo "✅ SSL证书: 已申请并配置"
echo "✅ Nginx反向代理: 已配置"
echo "✅ 自动续期: 已设置"
echo "✅ 防火墙: 已配置"
echo ""
echo "🌐 访问地址:"
echo "🔗 HTTPS API: https://$DOMAIN"
echo "🔗 健康检查: https://$DOMAIN/health"
echo "🔗 HTTP重定向: http://$DOMAIN → https://$DOMAIN"
echo ""
echo "🔧 管理命令:"
echo "查看证书状态: sudo certbot certificates"
echo "测试证书续期: ./ssl-renew.sh"
echo "查看Nginx状态: sudo systemctl status nginx"
echo "查看Nginx日志: sudo journalctl -u nginx -f"
echo ""
echo "📱 小程序配置:"
echo "1. 在微信小程序后台配置服务器域名: https://$DOMAIN"
echo "2. 更新小程序代码中的API地址"
echo "3. 参考配置文件: ~/miniprogram-config.js"
echo ""
echo "🔒 安全提醒:"
echo "- SSL证书将在3个月后到期，系统已设置自动续期"
echo "- 如需手动续期: sudo certbot renew"
echo "- 建议定期检查证书状态: sudo certbot certificates" 