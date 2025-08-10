#!/bin/bash
# 简化部署脚本 - 避免换行符问题

echo "🚀 开始部署奈飞共享系统..."

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装"
    exit 1
fi

echo "✅ Docker环境检查通过"

# 复制环境变量
if [ ! -f ".env" ]; then
    if [ -f ".env.docker" ]; then
        cp .env.docker .env
        echo "✅ 环境变量文件已创建"
    else
        echo "❌ 找不到环境变量模板文件"
        exit 1
    fi
fi

# 创建必要目录
mkdir -p logs nginx/ssl

# 停止现有容器
echo "🛑 停止现有容器..."
docker-compose down

# 构建和启动服务
echo "🏗️ 构建并启动服务..."
docker-compose up -d --build

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 健康检查
echo "🔍 执行健康检查..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ 服务启动成功"
else
    echo "❌ 服务启动失败"
    docker-compose logs
    exit 1
fi

# 显示服务状态
echo "📊 服务状态:"
docker-compose ps

echo ""
echo "🎉 部署完成！"
echo "前端地址: https://catnf.dmid.cc"
echo "API地址: https://catapi.dmid.cc"
echo ""
echo "创建管理员账户:"
echo "docker-compose exec api npm run reset-admin"