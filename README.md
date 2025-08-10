# 🎬 奈飞共享系统

一个基于Node.js + React的现代化奈飞账号共享管理系统，支持Docker一键部署。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)

## ✨ 主要特性

- 🔐 **企业级安全**: JWT认证、接口加密、频率限制
- 🚀 **Docker部署**: 一键部署，开箱即用
- 📱 **响应式设计**: 完美适配PC和移动端
- 🛡️ **安全加固**: 多层防护，防止恶意攻击
- 📊 **实时监控**: 完整的日志和健康检查
- 🔧 **易于维护**: 模块化架构，清晰的代码结构

## 🏗️ 技术栈

### 后端
- **Node.js 18** + **Express** - 服务端框架
- **MongoDB** - 数据库
- **JWT** - 身份认证
- **Helmet** - 安全头部
- **Bcrypt** - 密码加密

### 前端
- **React 17** - 前端框架
- **Ant Design** - UI组件库
- **React Router** - 路由管理
- **Axios** - HTTP客户端

### 部署
- **Docker** + **Docker Compose** - 容器化部署
- **Nginx** - 反向代理和负载均衡
- **Let's Encrypt** - SSL证书

## 🚀 快速开始

### 前提条件
- Docker 20.0+
- Docker Compose 1.29+
- 域名并已解析到服务器

### 1. 克隆项目
```bash
git clone https://github.com/你的用户名/netflix-sharing-system.git
cd netflix-sharing-system
```

### 2. 配置环境变量
```bash
# 复制环境变量模板
cp .env.docker .env

# 生成安全密钥
docker run --rm node:18-alpine node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 编辑 .env 文件，设置生成的密钥
nano .env
```

### 3. 一键部署
```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 4. 配置SSL证书
将SSL证书文件放置到 `nginx/ssl/` 目录：
```
nginx/ssl/
├── catnf.dmid.cc.crt
├── catnf.dmid.cc.key
├── catapi.dmid.cc.crt
└── catapi.dmid.cc.key
```

### 5. 创建管理员账户
```bash
docker-compose exec api npm run reset-admin
```

### 6. 访问系统
- **前端**: https://catnf.dmid.cc
- **API**: https://catapi.dmid.cc
- **健康检查**: https://catapi.dmid.cc/health

## 📋 服务说明

| 服务 | 端口 | 说明 |
|------|------|------|
| mongodb | 27017 | MongoDB数据库 |
| api | 3000 | 后端API服务 |
| frontend | 8080 | 前端React应用 |
| nginx | 80/443 | 反向代理服务器 |

## 🛡️ 安全特性

### 认证安全
- ✅ JWT Token指纹验证
- ✅ 会话超时检查
- ✅ Token黑名单机制
- ✅ 登录失败锁定

### 数据安全
- ✅ AES-256加密存储
- ✅ 传输数据加密
- ✅ 密码强度验证
- ✅ 敏感信息脱敏

### 访问控制
- ✅ API频率限制
- ✅ IP访问控制
- ✅ CORS跨域保护
- ✅ 请求体大小限制

## 🔧 管理命令

### Docker管理
```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f [service_name]

# 更新服务
docker-compose pull && docker-compose up -d
```

### 应用管理
```bash
# 创建管理员
docker-compose exec api npm run reset-admin

# 初始化数据库
docker-compose exec api npm run init-db

# 查看API日志
docker-compose exec api tail -f logs/combined.log
```

## 📊 功能特性

### 管理员后台
- 账号管理：添加、编辑、批量修改、启用/停用
- 分享页管理：创建、编辑、删除分享页面
- 管理员管理：多级权限控制
- 系统设置：全局配置管理
- 公告管理：系统通知发布

### 用户分享页
- 账号信息展示
- 验证码获取功能
- 设备管理功能
- 常见问题解答
- 到期时间提醒

## 🔄 更新部署

### 更新应用
```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
docker-compose build --no-cache
docker-compose up -d
```

### 备份数据
```bash
# 备份MongoDB数据
docker-compose exec mongodb mongodump --out /backup

# 导出备份
docker cp netflix-mongodb:/backup ./backup
```

## 🆘 故障排除

### 常见问题
1. **容器启动失败** - 检查端口占用和环境变量配置
2. **数据库连接失败** - 确认MongoDB容器状态
3. **SSL证书问题** - 验证证书文件路径和有效期
4. **前端无法访问API** - 检查CORS和域名配置

详细的故障排除指南请参考项目文档。

## 📄 许可证

本项目采用 MIT 许可证。详情请见 [LICENSE](LICENSE) 文件。

## 🤝 贡献

欢迎提交Pull Request或Issue来改进本项目！

---

**⚠️ 免责声明**: 本系统仅供学习和研究使用，请遵守相关法律法规和服务条款。 