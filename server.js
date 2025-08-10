const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');

// 数据库连接
const connectDB = require('./config/database');

// 生产环境配置
const productionConfig = process.env.NODE_ENV === 'production' 
  ? require('./config/production') 
  : require('./mongodb');

// 中间件导入
const { rateLimiters } = require('./middleware/rateLimiter');
const { encryptResponse, decryptRequest } = require('./middleware/encryption');

// 初始化Express应用
const app = express();

// 信任代理设置（用于获取真实IP）
app.set('trust proxy', true);

// 安全头部设置
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS配置 - 生产环境使用特定域名
const corsOptions = process.env.NODE_ENV === 'production' 
  ? {
      origin: productionConfig.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
    }
  : {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
    };

// 基础中间件
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// 请求解密中间件
app.use(decryptRequest);

// 响应加密中间件
app.use(encryptResponse);

// 静态文件目录
app.use(express.static('public'));
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
}

// 连接数据库
connectDB();

// 路由 - 应用不同的频率限制
app.use('/api/admin/accounts', rateLimiters.normal, require('./routes/accounts'));
app.use('/api/admin/share-pages', rateLimiters.normal, require('./routes/sharePages'));
app.use('/api/admin/auth', require('./routes/auth')); // 认证路由有自己的频率限制
app.use('/api/admin/announcements', rateLimiters.normal, require('./routes/announcements'));
app.use('/api/admin/settings', rateLimiters.strict, require('./routes/settings')); // 设置接口使用严格限制
app.use('/api/admin/admins', rateLimiters.strict, require('./routes/admins')); // 管理员接口使用严格限制
app.use('/api/share', rateLimiters.loose, require('./routes/share')); // 分享接口使用宽松限制
app.use('/api/public', rateLimiters.loose, require('./routes/public')); // 公共接口使用宽松限制

// 根路由
app.get('/api', (req, res) => {
  res.json({ 
    message: '奈飞账号共享管理系统API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 在生产环境中为任何未匹配的路由提供前端文件
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || productionConfig.port || 5000;

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📦 环境: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`🌐 API域名: catapi.dmid.cc`);
    console.log(`🖥️  前端域名: catnf.dmid.cc`);
  }
}); 