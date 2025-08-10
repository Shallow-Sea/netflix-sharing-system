#!/bin/bash

# =================================
# 奈飞共享系统 - 宝塔面板部署脚本
# 域名: catnf.dmid.cc / catapi.dmid.cc
# =================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
FRONTEND_DIR="/www/wwwroot/catnf.dmid.cc"
API_DIR="/www/wwwroot/catapi.dmid.cc"
BACKUP_DIR="/www/backup/netflix-$(date +%Y%m%d_%H%M%S)"
PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)

echo "🚀 开始部署奈飞共享系统..."
echo -e "${BLUE}📋 部署配置:${NC}"
echo -e "  前端域名: catnf.dmid.cc"
echo -e "  API域名: catapi.dmid.cc"
echo -e "  前端目录: ${FRONTEND_DIR}"
echo -e "  API目录: ${API_DIR}"
echo -e "  备份目录: ${BACKUP_DIR}"
echo ""

# 检查运行权限
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}❌ 请使用root权限运行此脚本${NC}"
    exit 1
fi

# 检查Node.js环境
echo -e "${BLUE}🔍 检查Node.js环境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 未找到Node.js，请先在宝塔面板安装Node.js${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js版本: ${NODE_VERSION}${NC}"

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  安装PM2...${NC}"
    npm install -g pm2
fi

# 创建必要目录
echo -e "${BLUE}📁 创建部署目录...${NC}"
mkdir -p "$FRONTEND_DIR"
mkdir -p "$API_DIR"
mkdir -p "$BACKUP_DIR"
mkdir -p "$API_DIR/logs"

# 备份现有文件
if [ -d "$API_DIR/node_modules" ]; then
    echo -e "${YELLOW}💾 备份现有文件...${NC}"
    cp -r "$API_DIR" "$BACKUP_DIR/api" 2>/dev/null || true
    cp -r "$FRONTEND_DIR" "$BACKUP_DIR/frontend" 2>/dev/null || true
fi

# 部署API后端
echo -e "${BLUE}📦 部署API后端...${NC}"
cd "$PROJECT_ROOT"

# 复制后端文件 (排除前端目录)
rsync -av --exclude='client' --exclude='node_modules' --exclude='.git' ./ "$API_DIR/"

cd "$API_DIR"

# 安装后端依赖
echo -e "${BLUE}📦 安装后端依赖...${NC}"
npm install --production

# 安装额外的安全依赖
npm install helmet

# 创建环境变量文件
echo -e "${BLUE}⚙️  配置环境变量...${NC}"
cat > "$API_DIR/.env" << EOF
# 服务器配置
PORT=3000
NODE_ENV=production

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/netflix_sharing_db

# JWT安全配置 - 生成的强密钥
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_EXPIRES_IN=24h

# 数据加密密钥
DATA_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
API_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 安全配置
ALLOW_ADMIN_REGISTRATION=false

# 域名配置
FRONTEND_URL=https://catnf.dmid.cc
API_URL=https://catapi.dmid.cc
CORS_ORIGINS=https://catnf.dmid.cc
EOF

# 构建前端
echo -e "${BLUE}🏗️  构建前端应用...${NC}"
cd "$PROJECT_ROOT/client"

# 更新API配置
cat > src/config/api.js << EOF
const API_BASE_URL = 'https://catapi.dmid.cc/api';
export default API_BASE_URL;
EOF

# 安装前端依赖并构建
npm install
npm run build

# 部署前端文件
echo -e "${BLUE}📁 部署前端文件...${NC}"
rm -rf "$FRONTEND_DIR"/*
cp -r build/* "$FRONTEND_DIR/"

# 设置文件权限
echo -e "${BLUE}🔐 设置文件权限...${NC}"
chown -R www:www "$FRONTEND_DIR"
chown -R www:www "$API_DIR"
chmod -R 755 "$FRONTEND_DIR"
chmod -R 755 "$API_DIR"
chmod 600 "$API_DIR/.env"

# 初始化数据库
echo -e "${BLUE}🗄️  初始化数据库...${NC}"
cd "$API_DIR"
npm run init-db 2>/dev/null || echo "数据库已存在或初始化失败"

# 启动API服务
echo -e "${BLUE}🚀 启动API服务...${NC}"
pm2 stop netflix-api 2>/dev/null || true
pm2 delete netflix-api 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save

# 健康检查
echo -e "${BLUE}🔍 执行健康检查...${NC}"
sleep 10

if pm2 describe netflix-api | grep -q "online"; then
    echo -e "${GREEN}✅ API服务运行正常${NC}"
else
    echo -e "${RED}❌ API服务启动失败${NC}"
    pm2 logs netflix-api --lines 20
    exit 1
fi

# 完成部署
echo ""
echo -e "${GREEN}🎉 部署完成！${NC}"
echo ""
echo -e "${BLUE}📋 访问信息:${NC}"
echo -e "  前端地址: ${GREEN}https://catnf.dmid.cc${NC}"
echo -e "  API地址: ${GREEN}https://catapi.dmid.cc${NC}"
echo -e "  健康检查: ${GREEN}https://catapi.dmid.cc/health${NC}"
echo ""
echo -e "${YELLOW}⚠️  重要提示:${NC}"
echo -e "  1. 请在宝塔面板为两个域名配置SSL证书"
echo -e "  2. 请使用提供的Nginx配置模板"
echo -e "  3. 请创建管理员账户: npm run reset-admin"
echo -e "  4. 请确保MongoDB只允许本地访问"
echo -e "  5. 请定期备份数据库和配置文件"
echo ""
echo -e "${BLUE}📖 管理命令:${NC}"
echo -e "  查看服务状态: ${GREEN}pm2 status${NC}"
echo -e "  查看服务日志: ${GREEN}pm2 logs netflix-api${NC}"
echo -e "  重启API服务: ${GREEN}pm2 restart netflix-api${NC}"
echo -e "  创建管理员: ${GREEN}cd $API_DIR && npm run reset-admin${NC}"
echo ""
