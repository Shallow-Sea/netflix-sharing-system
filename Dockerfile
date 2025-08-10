# Netflix共享系统 - 后端API Docker镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# 安装系统依赖
RUN apk add --no-cache \
    curl \
    tzdata

# 设置时区
ENV TZ=Asia/Shanghai

# 复制package文件
COPY package*.json ./

# 删除package-lock.json以避免版本冲突
RUN rm -f package-lock.json

# 安装依赖
RUN npm install --only=production && \
    npm cache clean --force

# 复制源代码 (排除前端文件)
COPY --chown=nextjs:nodejs . .

# 删除不需要的文件
RUN rm -rf client node_modules/.cache

# 创建日志目录
RUN mkdir -p logs && \
    chown -R nextjs:nodejs logs

# 切换到非root用户
USER nextjs

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "server.js"]