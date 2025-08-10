#!/bin/bash

# =================================
# Docker一键部署脚本
# =================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
PROJECT_NAME="奈飞共享系统"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

echo -e "${BLUE}🚀 开始部署 ${PROJECT_NAME}${NC}"
echo "=================================="

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker未安装，请先安装Docker${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose未安装，请先安装Docker Compose${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker环境检查通过${NC}"

# 检查环境变量文件
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  环境变量文件不存在，从模板创建...${NC}"
    
    if [ -f ".env.docker" ]; then
        cp .env.docker .env
        echo -e "${YELLOW}📝 请编辑 .env 文件配置必要的环境变量${NC}"
        echo -e "${YELLOW}特别是以下变量需要设置强密钥:${NC}"
        echo -e "  - JWT_SECRET"
        echo -e "  - DATA_ENCRYPTION_KEY"
        echo -e "  - API_ENCRYPTION_KEY"
        echo -e "  - MONGO_ROOT_PASSWORD"
        echo ""
        echo -e "${BLUE}生成密钥命令:${NC}"
        echo "docker run --rm node:18-alpine node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        echo ""
        read -p "请配置完环境变量后按回车继续..."
    else
        echo -e "${RED}❌ 找不到环境变量模板文件${NC}"
        exit 1
    fi
fi

# 检查关键环境变量
source $ENV_FILE

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your_jwt_secret_64_chars_here" ]; then
    echo -e "${RED}❌ JWT_SECRET 未正确配置${NC}"
    exit 1
fi

if [ -z "$MONGO_ROOT_PASSWORD" ] || [ "$MONGO_ROOT_PASSWORD" = "your_mongodb_password_here" ]; then
    echo -e "${RED}❌ MONGO_ROOT_PASSWORD 未正确配置${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 环境变量检查通过${NC}"

# 创建必要目录
echo -e "${BLUE}📁 创建必要目录...${NC}"
mkdir -p logs
mkdir -p nginx/ssl
mkdir -p backups

# 停止现有容器
if docker-compose ps | grep -q "Up"; then
    echo -e "${YELLOW}🛑 停止现有容器...${NC}"
    docker-compose down
fi

# 拉取最新镜像
echo -e "${BLUE}📦 拉取最新镜像...${NC}"
docker-compose pull

# 构建和启动服务
echo -e "${BLUE}🏗️  构建并启动服务...${NC}"
docker-compose up -d --build

# 等待服务启动
echo -e "${BLUE}⏳ 等待服务启动...${NC}"
sleep 30

# 健康检查
echo -e "${BLUE}🔍 执行健康检查...${NC}"

# 检查MongoDB
if docker-compose exec -T mongodb mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MongoDB 服务正常${NC}"
else
    echo -e "${RED}❌ MongoDB 服务异常${NC}"
fi

# 检查API服务
if docker-compose exec -T api curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API 服务正常${NC}"
else
    echo -e "${RED}❌ API 服务异常${NC}"
    echo -e "${YELLOW}查看API日志:${NC}"
    docker-compose logs api | tail -20
fi

# 检查前端服务
if docker-compose exec -T frontend curl -f http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 前端 服务正常${NC}"
else
    echo -e "${RED}❌ 前端 服务异常${NC}"
    echo -e "${YELLOW}查看前端日志:${NC}"
    docker-compose logs frontend | tail -20
fi

# 显示服务状态
echo -e "${BLUE}📊 服务状态:${NC}"
docker-compose ps

# 创建管理员账户
echo -e "${BLUE}👤 创建管理员账户...${NC}"
docker-compose exec -T api npm run reset-admin || echo -e "${YELLOW}⚠️  管理员账户创建失败或已存在${NC}"

# 完成部署
echo ""
echo -e "${GREEN}🎉 部署完成！${NC}"
echo "=================================="
echo -e "${BLUE}📋 访问信息:${NC}"
echo -e "  前端地址: ${GREEN}https://catnf.dmid.cc${NC}"
echo -e "  API地址: ${GREEN}https://catapi.dmid.cc${NC}"
echo -e "  健康检查: ${GREEN}https://catapi.dmid.cc/health${NC}"
echo ""
echo -e "${YELLOW}⚠️  注意事项:${NC}"
echo -e "  1. 请确保域名已正确解析到服务器"
echo -e "  2. 请配置SSL证书到 nginx/ssl/ 目录"
echo -e "  3. 首次使用请创建管理员账户"
echo -e "  4. 定期备份数据库数据"
echo ""
echo -e "${BLUE}📖 管理命令:${NC}"
echo -e "  查看状态: ${GREEN}docker-compose ps${NC}"
echo -e "  查看日志: ${GREEN}docker-compose logs -f${NC}"
echo -e "  重启服务: ${GREEN}docker-compose restart${NC}"
echo -e "  停止服务: ${GREEN}docker-compose down${NC}"
echo ""