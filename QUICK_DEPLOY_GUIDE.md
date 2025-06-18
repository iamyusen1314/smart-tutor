# 🚀 小学AI家教系统 - 阿里云快速部署指南

> **💡 通过云端部署，彻底解决本地MongoDB连接问题和网络不稳定问题！**

## 📋 前置准备

### 🛒 购买阿里云服务
1. **ECS云服务器** (¥200-300/月)
   - 配置：2核4GB，40GB SSD
   - 操作系统：Ubuntu 20.04 LTS
   - 带宽：3Mbps

2. **域名** (¥55/年，可选)
   - 推荐 `.com` 域名
   - 用于HTTPS访问

### 🔑 准备材料
- [ ] 阿里云ECS服务器公网IP
- [ ] 服务器SSH登录密码
- [ ] GitHub仓库地址 (需提前上传代码)
- [ ] 千问大模型API密钥
- [ ] 域名 (如果需要HTTPS)

## 🚀 一键部署流程

### 第1步：连接服务器
```bash
# 使用SSH连接到服务器
ssh root@your-server-ip

# 创建普通用户 (安全考虑)
adduser smarttutor
usermod -aG sudo smarttutor
su - smarttutor
```

### 第2步：下载部署脚本
```bash
# 下载部署脚本包
wget https://github.com/your-username/smart_tutor/raw/main/deploy.tar.gz
tar -xzf deploy.tar.gz
cd deploy

# 或者直接克隆
git clone https://github.com/your-username/smart_tutor.git
cd smart_tutor/deploy
```

### 第3步：初始化服务器
```bash
# 运行服务器初始化脚本 (约5-10分钟)
bash server_init.sh

# 脚本会自动安装：
# ✅ Node.js 18.x
# ✅ MongoDB 6.0
# ✅ PM2 进程管理器
# ✅ Nginx 反向代理
# ✅ 防火墙配置
```

### 第4步：部署项目
```bash
# 运行项目部署脚本
bash deploy.sh [你的GitHub仓库地址] [千问API密钥]

# 示例:
bash deploy.sh https://github.com/username/smart_tutor.git sk-your-dashscope-api-key

# 脚本会自动：
# ✅ 克隆代码
# ✅ 安装依赖
# ✅ 配置环境变量
# ✅ 启动后端服务
# ✅ 配置开机自启
```

### 第5步：配置HTTPS (可选)
```bash
# 如果有域名，配置SSL证书
bash ssl_setup.sh your-domain.com

# 示例:
bash ssl_setup.sh api.smarttutor.com

# 脚本会自动：
# ✅ 配置Nginx反向代理
# ✅ 申请免费SSL证书
# ✅ 设置自动续期
```

## 🔧 验证部署

### 📊 检查服务状态
```bash
# 查看所有服务状态
./smart-tutor-status.sh

# 查看应用日志
./smart-tutor-logs.sh app

# 查看进程状态
pm2 status
```

### 🌐 访问测试
```bash
# HTTP访问 (IP部署)
curl http://your-server-ip:3000/health

# HTTPS访问 (域名部署)
curl https://your-domain.com/health

# 期望返回: {"status":"ok","timestamp":...}
```

## 📱 更新小程序配置

### 🔧 修改网络配置
```javascript
// miniprogram/utils/config.js
const config = {
  // IP部署
  apiBaseUrl: 'http://your-server-ip:3000',
  
  // 域名部署 (推荐)
  apiBaseUrl: 'https://your-domain.com',
  
  isDev: false,
  timeout: 30000
}
```

### 📋 微信小程序后台配置
1. 登录 [微信小程序后台](https://mp.weixin.qq.com)
2. 开发 → 开发管理 → 开发设置
3. 服务器域名 → request合法域名
4. 添加: `https://your-domain.com` (HTTPS) 或配置IP白名单

### 🔄 重新编译小程序
```bash
# 在微信开发者工具中：
1. 点击"编译"按钮
2. 测试网络连接
3. 验证所有功能正常
```

## 🛠️ 日常维护

### 📊 监控命令
```bash
# 查看系统状态
./smart-tutor-status.sh

# 查看实时日志
./smart-tutor-logs.sh app

# 重启服务
pm2 restart smart-tutor-backend

# 重新部署
./smart-tutor-deploy.sh
```

### 💾 备份数据
```bash
# 手动备份
./smart-tutor-backup.sh

# 自动备份 (建议设置定时任务)
crontab -e
# 添加: 0 2 * * * /home/smarttutor/smart-tutor-backup.sh
```

### 🔒 SSL证书管理
```bash
# 查看证书状态
sudo certbot certificates

# 测试续期
./ssl-renew.sh

# 手动续期
sudo certbot renew
```

## 🆘 故障排除

### ❌ 常见问题

**1. 服务启动失败**
```bash
# 查看详细日志
./smart-tutor-logs.sh app

# 检查MongoDB状态
sudo systemctl status mongod

# 重启MongoDB
sudo systemctl restart mongod
```

**2. 网络连接问题**
```bash
# 检查防火墙
sudo ufw status

# 检查端口占用
netstat -tulpn | grep :3000

# 检查Nginx状态
sudo systemctl status nginx
```

**3. SSL证书问题**
```bash
# 检查域名解析
dig your-domain.com

# 重新申请证书
sudo certbot delete
bash ssl_setup.sh your-domain.com
```

### 🔧 性能优化

**1. 数据库优化**
```bash
# MongoDB性能监控
mongo --eval "db.runCommand({serverStatus: 1})"

# 创建索引
mongo smart_tutor --eval "db.users.createIndex({phone: 1})"
```

**2. 应用优化**
```bash
# PM2集群模式
pm2 delete smart-tutor-backend
pm2 start ecosystem.config.js --env production
```

## 💰 成本控制

### 📊 费用优化建议
- 🎯 选择合适的ECS规格，避免过度配置
- 🕐 使用包年包月计费模式，享受折扣
- 📦 定期清理日志和备份文件
- 🔄 监控带宽使用，避免超额费用

### 📈 扩展计划
- 📊 监控系统负载，适时升级配置
- 🔄 考虑使用CDN加速静态资源
- 💾 大量数据时考虑升级到云数据库MongoDB版

## 🎉 部署完成

### ✅ 成功标志
- [ ] 后端服务正常运行 (`http://ip:3000/health` 返回200)
- [ ] MongoDB连接正常
- [ ] 小程序可以正常连接API
- [ ] 所有功能测试通过

### 🌟 享受稳定的云端开发环境
- 🌐 无需依赖本地IP，随时随地开发
- 💾 MongoDB连接稳定，不再有超时问题
- 🔒 HTTPS加密传输，安全可靠
- 🚀 24/7在线服务，支持多设备访问

---

**🎯 完成部署后，您就拥有了一个完全独立的云端AI家教系统！**

需要支持或有问题，请参考 `阿里云部署指南.md` 中的详细说明。 