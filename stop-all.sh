#!/bin/bash

# 小学AI家教系统停止脚本
echo "🛑 停止小学AI家教系统..."

# 停止后端服务器
if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    if ps -p $BACKEND_PID > /dev/null; then
        echo "📡 停止后端服务器 (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        echo "✅ 后端服务器已停止"
    else
        echo "⚠️ 后端服务器进程不存在"
    fi
    rm .backend.pid
else
    echo "⚠️ 未找到后端进程ID文件，尝试通过端口停止..."
    pkill -f "node app.js" || echo "未找到后端进程"
fi

# 停止前端服务器
if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null; then
        echo "🖥️ 停止前端服务器 (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        echo "✅ 前端服务器已停止"
    else
        echo "⚠️ 前端服务器进程不存在"
    fi
    rm .frontend.pid
else
    echo "⚠️ 未找到前端进程ID文件，尝试通过端口停止..."
    lsof -ti:8082 | xargs kill -9 2>/dev/null || echo "未找到端口8082上的进程"
fi

# 额外清理：强制停止相关进程
echo "🧹 清理相关进程..."
pkill -f "vite.*8082" 2>/dev/null || true
pkill -f "node.*app.js" 2>/dev/null || true

# 清理日志文件（可选）
echo "📄 清理日志文件..."
[ -f "backend.log" ] && rm backend.log && echo "已删除 backend.log"
[ -f "frontend.log" ] && rm frontend.log && echo "已删除 frontend.log"

echo ""
echo "✅ 系统已完全停止"
echo "🚀 重新启动请运行: ./start-all.sh" 