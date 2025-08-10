// 本地MongoDB连接配置文件
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 密钥文件路径
const KEY_FILE_PATH = path.join(__dirname, '.secret_keys');

// 生成或加载持久化密钥
const getOrCreateSecretKeys = () => {
  try {
    if (fs.existsSync(KEY_FILE_PATH)) {
      const keys = JSON.parse(fs.readFileSync(KEY_FILE_PATH, 'utf8'));
      return keys;
    }
  } catch (err) {
    console.warn('密钥文件读取失败，将生成新密钥');
  }

  // 生成新密钥
  const keys = {
    jwtSecret: crypto.randomBytes(64).toString('hex'),
    dataEncryptionKey: crypto.randomBytes(32).toString('hex'),
    apiEncryptionKey: crypto.randomBytes(32).toString('hex')
  };

  try {
    fs.writeFileSync(KEY_FILE_PATH, JSON.stringify(keys, null, 2));
    console.log('新密钥已生成并保存');
  } catch (err) {
    console.warn('密钥文件保存失败，使用临时密钥');
  }

  return keys;
};

const secretKeys = getOrCreateSecretKeys();

module.exports = {
  // MongoDB连接URI
  mongoURI: process.env.MONGODB_URI || "mongodb://localhost:27017/netflix_sharing_db",
  
  // JWT配置 - 优先使用环境变量，否则使用持久化密钥
  jwtSecret: process.env.JWT_SECRET || secretKeys.jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h", // 缩短有效期提高安全性
  
  // 数据加密密钥
  dataEncryptionKey: process.env.DATA_ENCRYPTION_KEY || secretKeys.dataEncryptionKey,
  
  // API接口加密密钥
  apiEncryptionKey: process.env.API_ENCRYPTION_KEY || secretKeys.apiEncryptionKey,
  
  // 安全配置
  security: {
    bcryptRounds: 12, // 增强密码哈希强度
    maxLoginAttempts: 5,
    lockoutTime: 15 * 60 * 1000, // 15分钟锁定时间
    sessionTimeout: 24 * 60 * 60 * 1000 // 24小时会话超时
  }
}; 