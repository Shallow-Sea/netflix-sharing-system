# 🚀 宝塔面板部署指南

## 📋 系统要求

- **服务器配置**: 1核2G以上推荐
- **操作系统**: CentOS 7+ / Ubuntu 18+ 
- **宝塔面板**: 7.0+
- **Node.js**: 16+ (在宝塔面板软件商店安装)
- **MongoDB**: 4.0+ (已安装)
- **Nginx**: 1.18+ (宝塔自带)

## 🔧 部署架构

```
前端域名: catnf.dmid.cc    -> Nginx -> 静态文件 (/www/wwwroot/catnf.dmid.cc)
API域名:  catapi.dmid.cc   -> Nginx -> Node.js   (/www/wwwroot/catapi.dmid.cc)
```

## 📦 第一步：准备服务器环境

### 1.1 在宝塔面板安装必要软件
```bash
# 在宝塔面板 -> 软件商店中安装:
- Node.js 版本管理器 (选择Node.js 16+)
- PM2管理器
- MongoDB (如果还没安装)
```

### 1.2 创建网站
在宝塔面板中创建两个网站:
- `catnf.dmid.cc` (前端)
- `catapi.dmid.cc` (API)

## 🚀 第二步：自动部署 (推荐)

### 2.1 上传项目文件
```bash
# 将整个项目上传到服务器临时目录
scp -r netflix-sharing-system root@your-server:/tmp/
```

### 2.2 运行自动部署脚本
```bash
cd /tmp/netflix-sharing-system
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

部署脚本会自动完成:
- ✅ 安装依赖
- ✅ 构建前端
- ✅ 配置PM2
- ✅ 初始化数据库
- ✅ 启动服务

## 🔧 第三步：配置Nginx

### 3.1 配置API域名 (catapi.dmid.cc)
在宝塔面板中:
1. 进入网站 -> catapi.dmid.cc -> 设置 -> 配置文件
2. 替换为以下配置:

```nginx
# 复制 nginx-config/api.conf 的内容到这里
```

### 3.2 配置前端域名 (catnf.dmid.cc)
在宝塔面板中:
1. 进入网站 -> catnf.dmid.cc -> 设置 -> 配置文件
2. 替换为以下配置:

```nginx
# 复制 nginx-config/frontend.conf 的内容到这里
```

## 🔒 第四步：配置SSL证书

### 4.1 申请SSL证书
在宝塔面板中为两个域名申请SSL证书:
1. 网站 -> SSL -> Let's Encrypt (免费证书)
2. 或者上传自有证书

### 4.2 强制HTTPS
在两个网站的SSL设置中开启"强制HTTPS"

## 🗄️ 第五步：配置MongoDB

### 5.1 检查MongoDB状态
```bash
# 在宝塔面板终端中执行
systemctl status mongod
```

### 5.2 创建数据库用户(可选)
```bash
mongo
use netflix_sharing_db
db.createUser({
  user: "netflix_user",
  pwd: "your_secure_password",
  roles: ["readWrite"]
})
```

## 🔐 第六步：安全配置

### 6.1 修改默认密码
```bash
cd /www/wwwroot/catapi.dmid.cc
npm run reset-admin
```

### 6.2 设置环境变量
编辑 `/www/wwwroot/catapi.dmid.cc/.env`:
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/netflix_sharing_db
JWT_SECRET=your_super_secure_jwt_secret_32_chars
DATA_ENCRYPTION_KEY=your_data_encryption_key_32_chars
ALLOW_ADMIN_REGISTRATION=false
```

### 6.3 设置防火墙
在宝塔面板 -> 安全中:
- 只开放 80, 443, SSH端口
- 禁止直接访问 5000 端口

## 🚀 第七步：启动服务

### 7.1 使用PM2启动API服务
```bash
cd /www/wwwroot/catapi.dmid.cc
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 7.2 验证部署
访问以下地址检查:
- 前端: https://catnf.dmid.cc
- API健康检查: https://catapi.dmid.cc/health
- 后台登录: https://catnf.dmid.cc/login

## 📊 监控和维护

### 监控命令
```bash
# 查看API服务状态
pm2 status

# 查看API日志
pm2 logs netflix-sharing-api

# 重启API服务
pm2 restart netflix-sharing-api

# 查看系统资源使用
pm2 monit
```

### 日志位置
- API日志: `/www/wwwroot/catapi.dmid.cc/logs/`
- Nginx日志: `/www/wwwlogs/`
- PM2日志: `~/.pm2/logs/`

## 🔄 更新部署

### 更新代码
```bash
# 1. 上传新代码到临时目录
# 2. 运行更新脚本
cd /tmp/netflix-sharing-system
./deploy/deploy.sh

# 或者手动更新
cd /www/wwwroot/catapi.dmid.cc
git pull  # 如果使用Git
npm install
pm2 restart netflix-sharing-api
```

### 数据库迁移
```bash
cd /www/wwwroot/catapi.dmid.cc
npm run init-db  # 重新初始化(谨慎使用)
```

## 🆘 故障排除

### 常见问题

**1. API无法访问**
```bash
# 检查PM2状态
pm2 status
pm2 logs netflix-sharing-api

# 检查端口占用
netstat -tlnp | grep 5000
```

**2. 前端页面空白**
- 检查构建是否成功
- 检查Nginx配置是否正确
- 查看浏览器控制台错误

**3. 数据库连接失败**
```bash
# 检查MongoDB状态
systemctl status mongod

# 检查MongoDB日志
tail -f /var/log/mongodb/mongod.log
```

**4. CORS错误**
- 检查API的CORS配置
- 确认域名在corsOrigins中配置正确

### 获取帮助
- 查看API日志: `pm2 logs netflix-sharing-api`
- 查看Nginx错误日志: `tail -f /www/wwwlogs/catapi.dmid.cc.error.log`
- 检查系统资源: `htop` 或 `pm2 monit`

## 🎯 性能优化

### 建议配置
- 启用Nginx Gzip压缩
- 配置静态资源缓存
- 使用CDN加速静态资源
- 定期清理日志文件

### 监控建议
- 设置磁盘使用率告警
- 监控API响应时间
- 监控数据库连接数

---

## 🏆 部署成功！

如果按照以上步骤操作，您的奈飞账号共享管理系统现在应该已经成功部署在宝塔面板上了！

**默认登录信息:**
- 前端地址: https://catnf.dmid.cc/login
- 用户名: admin
- 密码: admin123

**请记得第一时间修改默认密码！** 🔐
