#!/bin/bash

# 小学AI家教系统启动脚本
echo "🚀 启动小学AI家教系统..."

# 检查依赖
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

# 启动后端服务器
echo "📡 启动后端服务器..."
cd server
if [ ! -d "node_modules" ]; then
    echo "📦 安装后端依赖..."
    npm install
fi

# 在后台启动后端
nohup node app.js > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ 后端服务器已启动 (PID: $BACKEND_PID) - 端口: 3000"

# 等待后端启动
sleep 3

# 检查后端是否启动成功
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ 后端服务器启动成功"
else
    echo "❌ 后端服务器启动失败"
    exit 1
fi

# 启动前端管理后台
echo "🖥️ 启动前端管理后台..."
cd ../admin-web
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi

# 在后台启动前端
nohup npm run dev -- --port 8082 > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ 前端管理后台已启动 (PID: $FRONTEND_PID) - 端口: 8082"

cd ..

echo ""
echo "🎉 系统启动完成！"
echo "================================="
echo "📡 后端服务器: http://localhost:3000"
echo "🖥️ 管理后台: http://localhost:8082"
echo "📱 微信小程序: 开发者工具中打开 miniprogram 目录"
echo "================================="
echo ""
echo "📄 日志文件:"
echo "  - 后端日志: backend.log"
echo "  - 前端日志: frontend.log"
echo ""
echo "🛑 停止所有服务: ./stop-all.sh"
echo ""
echo "🔍 健康检查:"
echo "  curl http://localhost:3000/health"
echo "  curl http://localhost:3000/api/health"
echo ""

# 保存进程ID到文件
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

echo "✨ 请等待几秒钟，然后打开浏览器访问管理后台..." 