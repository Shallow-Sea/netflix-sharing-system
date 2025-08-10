const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../mongodb');
const Admin = require('../models/Admin');

// Token黑名单 - 生产环境建议使用Redis
const tokenBlacklist = new Set();

// 清理过期的黑名单token
const cleanupBlacklist = () => {
  // 由于我们无法直接检查JWT是否过期，这里简单地定期清空黑名单
  // 生产环境中应该使用Redis的TTL功能
  if (tokenBlacklist.size > 10000) {
    tokenBlacklist.clear();
  }
};

setInterval(cleanupBlacklist, 60 * 60 * 1000); // 每小时清理一次

// 生成token指纹
const generateTokenFingerprint = (userAgent, ip) => {
  return crypto.createHash('sha256')
    .update(`${userAgent}-${ip}`)
    .digest('hex')
    .substring(0, 16);
};

// 验证token指纹
const verifyTokenFingerprint = (token, userAgent, ip) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded.fingerprint) return false;
    
    const expectedFingerprint = generateTokenFingerprint(userAgent, ip);
    return decoded.fingerprint === expectedFingerprint;
  } catch (err) {
    return false;
  }
};

const authMiddleware = async (req, res, next) => {
  try {
    // 获取token
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        msg: '无访问权限，需要身份验证',
        code: 'NO_TOKEN'
      });
    }

    // 检查token是否在黑名单中
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ 
        msg: 'Token已失效',
        code: 'TOKEN_BLACKLISTED'
      });
    }

    // 验证token指纹（防止token被盗用）
    const userAgent = req.headers['user-agent'] || '';
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!verifyTokenFingerprint(token, userAgent, clientIP)) {
      return res.status(401).json({ 
        msg: '身份验证失败，请重新登录',
        code: 'INVALID_FINGERPRINT'
      });
    }

    // 验证JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || config.jwtSecret);

    // 检查token是否即将过期（30分钟内）
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;
    
    if (timeUntilExpiry < 30 * 60) { // 30分钟
      res.set('X-Token-Refresh-Needed', 'true');
    }

    // 验证管理员是否仍然存在且状态正常
    const admin = await Admin.findById(decoded.admin.id).select('-password');
    
    if (!admin) {
      return res.status(401).json({ 
        msg: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    if (admin.status !== 1) {
      return res.status(401).json({ 
        msg: '账户已被禁用',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // 检查会话超时
    if (admin.last_login) {
      const sessionAge = Date.now() - admin.last_login.getTime();
      if (sessionAge > config.security.sessionTimeout) {
        return res.status(401).json({ 
          msg: '会话已超时，请重新登录',
          code: 'SESSION_TIMEOUT'
        });
      }
    }

    // 将管理员信息添加到请求中
    req.admin = {
      id: admin._id,
      username: admin.username,
      role: admin.role,
      permissions: admin.permissions
    };
    
    req.token = token;
    next();
  } catch (err) {
    console.error('认证中间件错误:', err.message);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        msg: '无效的Token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        msg: 'Token已过期',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    res.status(500).json({ 
      msg: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 添加token到黑名单
const blacklistToken = (token) => {
  tokenBlacklist.add(token);
};

// 生成安全的JWT
const generateSecureToken = (payload, userAgent, ip) => {
  const fingerprint = generateTokenFingerprint(userAgent, ip);
  
  const tokenPayload = {
    ...payload,
    fingerprint,
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(
    tokenPayload,
    process.env.JWT_SECRET || config.jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || config.jwtExpiresIn }
  );
};

module.exports = {
  authMiddleware,
  blacklistToken,
  generateSecureToken
}; 