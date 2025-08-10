# Git 设置和上传到 GitHub 指南

## 🚀 快速上传步骤

### 1. 初始化 Git 仓库
```bash
# 进入项目目录
cd "C:\Users\yuhan\Desktop\奈飞系统新版"

# 初始化Git仓库
git init

# 添加所有文件
git add .

# 创建初始提交
git commit -m "feat: 初始化奈飞共享系统 - Docker版本

✨ 主要特性:
- 🔐 企业级安全认证
- 🚀 Docker一键部署
- 📱 响应式UI设计
- 🛡️ 多层安全防护
- 📊 完整监控日志

🏗️ 技术栈:
- 后端: Node.js + Express + MongoDB
- 前端: React + Ant Design
- 部署: Docker + Nginx
- 安全: JWT + AES加密 + 频率限制"
```

### 2. 在 GitHub 创建仓库
1. 访问 [GitHub](https://github.com)
2. 点击右上角 "+" 号，选择 "New repository"
3. 仓库名称填写：`netflix-sharing-system`
4. 描述填写：`🎬 现代化奈飞账号共享管理系统 - 支持Docker一键部署`
5. 选择 Public 或 Private
6. **不要**勾选 "Add a README file" (我们已经有了)
7. 点击 "Create repository"

### 3. 连接远程仓库并推送
```bash
# 添加远程仓库 (替换 YOUR_USERNAME 为你的GitHub用户名)
git remote add origin https://github.com/YOUR_USERNAME/netflix-sharing-system.git

# 设置默认分支
git branch -M main

# 推送到GitHub
git push -u origin main
```

## 📁 项目文件结构
推送到GitHub的文件包括：
```
netflix-sharing-system/
├── 📄 README.md                    # 项目说明文档
├── 📄 LICENSE                      # MIT许可证
├── 📄 .gitignore                   # Git忽略文件
├── 📄 docker-compose.yml           # Docker编排文件
├── 📄 Dockerfile                   # 后端Docker镜像
├── 📄 .env.docker                  # 环境变量模板
├── 📄 package.json                 # 后端依赖配置
├── 📄 server.js                    # 服务器入口文件
├── 📄 ecosystem.config.js          # PM2配置文件
├── 📄 SECURITY_OPTIMIZATION.md     # 安全优化文档
├── 📁 .github/workflows/           # GitHub Actions CI/CD
├── 📁 client/                      # 前端React应用
├── 📁 config/                      # 配置文件
├── 📁 middleware/                  # 中间件
├── 📁 models/                      # 数据库模型
├── 📁 routes/                      # API路由
├── 📁 services/                    # 业务服务
├── 📁 scripts/                     # 脚本文件
├── 📁 nginx/                       # Nginx配置
└── 📁 utils/                       # 工具函数
```

## 🔧 Git 配置优化

### 设置用户信息
```bash
git config --global user.name "你的姓名"
git config --global user.email "你的邮箱"
```

### 设置默认编辑器 (可选)
```bash
git config --global core.editor "code --wait"  # VS Code
```

### 启用颜色输出
```bash
git config --global color.ui auto
```

## 📝 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 提交类型
- `feat:` 新功能
- `fix:` 修复bug
- `docs:` 文档更新
- `style:` 代码格式化
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动

### 提交示例
```bash
# 新功能
git commit -m "feat: 添加用户权限管理功能"

# 修复bug
git commit -m "fix: 修复登录页面验证码显示问题"

# 文档更新
git commit -m "docs: 更新Docker部署文档"

# 安全更新
git commit -m "security: 增强JWT Token验证机制"
```

## 🚀 部署到服务器

### 服务器端操作
```bash
# 克隆项目
git clone https://github.com/YOUR_USERNAME/netflix-sharing-system.git
cd netflix-sharing-system

# 给部署脚本执行权限
chmod +x scripts/deploy.sh

# 执行部署
./scripts/deploy.sh
```

## 🔄 后续更新流程

### 本地开发完成后
```bash
# 添加修改的文件
git add .

# 提交更改
git commit -m "feat: 添加新功能描述"

# 推送到GitHub
git push origin main
```

### 服务器更新
```bash
cd netflix-sharing-system

# 拉取最新代码
git pull origin main

# 重新部署
./scripts/deploy.sh
```

## 🛡️ 安全注意事项

### 环境变量安全
- ✅ `.env` 文件已被 `.gitignore` 忽略
- ✅ 只提交 `.env.docker` 模板文件
- ✅ 密钥和密码不会被上传到GitHub

### 敏感文件保护
- ✅ SSL证书文件被忽略
- ✅ 日志文件被忽略
- ✅ 数据库文件被忽略
- ✅ 临时文件被忽略

## 📊 GitHub 功能利用

### Issues 管理
- 用于跟踪bug和功能请求
- 可以创建模板便于用户报告问题

### Actions 自动化
- 自动构建Docker镜像
- 代码质量检查
- 安全扫描
- 自动部署

### Releases 版本管理
- 创建版本标签
- 发布更新日志
- 提供下载包

### Wiki 文档
- 详细的使用说明
- 常见问题解答
- 开发指南

## 🤝 贡献指南

### Fork 和 Pull Request
1. Fork 项目到自己的GitHub
2. 创建功能分支：`git checkout -b feature/新功能`
3. 提交更改：`git commit -m "feat: 添加新功能"`
4. 推送分支：`git push origin feature/新功能`
5. 创建 Pull Request

### 代码规范
- 遵循项目现有代码风格
- 添加必要的注释
- 确保测试通过
- 更新相关文档

## 🆘 常见问题

### 推送失败
```bash
# 如果推送被拒绝，先拉取远程更改
git pull origin main --rebase
git push origin main
```

### 忘记添加 .gitignore
```bash
# 如果已经提交了敏感文件，使用以下命令移除
git rm --cached .env
git commit -m "chore: 移除敏感配置文件"
```

### 修改最后一次提交
```bash
# 修改最后一次提交消息
git commit --amend -m "新的提交消息"

# 强制推送 (谨慎使用)
git push --force-with-lease origin main
```

---

现在您可以将项目安全地上传到GitHub，并利用Docker在服务器上快速部署！🎉