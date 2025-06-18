#!/bin/bash

# 小学AI家教项目 - 服务状态检查脚本
# 使用方法: chmod +x check-services.sh && ./check-services.sh

echo "🔍 正在检查服务状态..."
echo "=========================================="

# 检查后端API服务
echo "📡 检查后端API服务 (端口:3000)"
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ 后端API服务正常运行"
    curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health
else
    echo "❌ 后端API服务未运行"
fi

echo ""

# 检查前端管理后台
echo "🖥️  检查前端管理后台 (端口:8085)"
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8085/)
if [ "$STATUS_CODE" = "200" ]; then
    echo "✅ 前端管理后台正常运行"
else
    echo "❌ 前端管理后台未运行 (状态码: $STATUS_CODE)"
fi

echo ""

# 检查进程状态
echo "⚙️  检查运行进程"
echo "后端服务进程:"
ps aux | grep "node app.js" | grep -v grep || echo "❌ 后端服务进程未找到"

echo ""
echo "前端服务进程:"
ps aux | grep "admin-web.*vite" | grep -v grep || echo "❌ 前端服务进程未找到"

echo ""
echo "=========================================="
echo "📋 服务访问地址:"
echo "🔗 后端API: http://localhost:3000"
echo "🔗 管理后台: http://localhost:8085"
echo "🔗 健康检查: http://localhost:3000/health"
echo "==========================================" 