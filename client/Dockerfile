# Netflix共享系统 - 前端 Docker镜像
FROM node:18-alpine as builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 设置构建时环境变量
ARG REACT_APP_API_BASE_URL=https://catapi.dmid.cc/api
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

# 构建应用
RUN npm run build

# 生产阶段 - 使用nginx
FROM nginx:alpine

# 安装curl用于健康检查
RUN apk add --no-cache curl

# 删除默认nginx配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制nginx配置
COPY nginx.conf /etc/nginx/conf.d/

# 复制构建产物
COPY --from=builder /app/build /usr/share/nginx/html

# 创建非root用户
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx

# 设置权限
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# 切换到非root用户
USER nginx

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost || exit 1

# 暴露端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]