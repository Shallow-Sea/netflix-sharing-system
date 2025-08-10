// 生产环境配置文件
module.exports = {
  // MongoDB连接配置
  mongoURI: process.env.MONGODB_URI || "mongodb://localhost:27017/netflix_sharing_db",
  
  // JWT配置
  jwtSecret: process.env.JWT_SECRET || "your_super_secure_jwt_secret_change_this_in_production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  
  // 数据加密密钥
  dataEncryptionKey: process.env.DATA_ENCRYPTION_KEY || "your_data_encryption_key_32_chars",
  
  // 服务器配置
  port: process.env.PORT || 5000,
  
  // CORS配置
  corsOrigins: [
    "https://catnf.dmid.cc",  // 前端域名
    "https://www.catnf.dmid.cc"  // 带www的前端域名
  ],
  
  // 静态文件配置
  staticPath: process.env.STATIC_PATH || "client/build",
  
  // API基础路径
  apiBasePath: process.env.API_BASE_PATH || "/api",
  
  // 是否启用HTTPS
  enableHTTPS: process.env.ENABLE_HTTPS === 'true',
  
  // 日志配置
  logLevel: process.env.LOG_LEVEL || "info",
  
  // 邮件服务配置（如需要）
  emailService: {
    host: process.env.EMAIL_HOST || "",
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || "",
    pass: process.env.EMAIL_PASS || ""
  },
  
  // 管理员注册控制
  allowAdminRegistration: process.env.ALLOW_ADMIN_REGISTRATION === 'true'
};
