const config = require('../mongodb');

// 内存存储 - 生产环境建议使用Redis
const requestCounts = new Map();
const loginAttempts = new Map();

// 清理过期记录
const cleanupExpired = () => {
  const now = Date.now();
  
  // 清理请求计数
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.resetTime > 60000) { // 1分钟窗口
      requestCounts.delete(key);
    }
  }
  
  // 清理登录尝试记录
  for (const [ip, data] of loginAttempts.entries()) {
    if (now - data.lockedUntil > 0) {
      loginAttempts.delete(ip);
    }
  }
};

// 定期清理
setInterval(cleanupExpired, 60000); // 每分钟清理一次

// 通用请求频率限制
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 60000, // 1分钟窗口
    max = 100, // 最大请求数
    message = '请求过于频繁，请稍后再试',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    let record = requestCounts.get(key);
    
    if (!record || now - record.resetTime > windowMs) {
      record = {
        count: 0,
        resetTime: now
      };
    }
    
    record.count++;
    requestCounts.set(key, record);
    
    if (record.count > max) {
      return res.status(429).json({ 
        msg: message,
        retryAfter: Math.ceil((record.resetTime + windowMs - now) / 1000)
      });
    }
    
    // 添加响应头
    res.set({
      'X-RateLimit-Limit': max,
      'X-RateLimit-Remaining': Math.max(0, max - record.count),
      'X-RateLimit-Reset': new Date(record.resetTime + windowMs).toISOString()
    });
    
    next();
  };
};

// 登录专用频率限制
const loginRateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  let attempts = loginAttempts.get(ip);
  
  if (!attempts) {
    attempts = {
      count: 0,
      lockedUntil: 0,
      firstAttempt: now
    };
  }
  
  // 检查是否仍在锁定期
  if (attempts.lockedUntil > now) {
    return res.status(429).json({
      msg: '登录尝试过于频繁，请稍后再试',
      lockedUntil: new Date(attempts.lockedUntil).toISOString()
    });
  }
  
  // 重置计数（24小时后）
  if (now - attempts.firstAttempt > 24 * 60 * 60 * 1000) {
    attempts.count = 0;
    attempts.firstAttempt = now;
  }
  
  // 检查是否超过限制
  if (attempts.count >= config.security.maxLoginAttempts) {
    attempts.lockedUntil = now + config.security.lockoutTime;
    loginAttempts.set(ip, attempts);
    
    return res.status(429).json({
      msg: '登录失败次数过多，账户已被临时锁定',
      lockedUntil: new Date(attempts.lockedUntil).toISOString()
    });
  }
  
  // 记录本次尝试
  req.loginAttemptData = { ip, attempts };
  next();
};

// 登录成功后清除记录
const clearLoginAttempts = (ip) => {
  loginAttempts.delete(ip);
};

// 登录失败后增加计数
const recordLoginFailure = (ip) => {
  const attempts = loginAttempts.get(ip) || {
    count: 0,
    lockedUntil: 0,
    firstAttempt: Date.now()
  };
  
  attempts.count++;
  loginAttempts.set(ip, attempts);
};

// 预定义的限制器
const rateLimiters = {
  // 严格限制 - 登录接口
  strict: createRateLimiter({
    windowMs: 60000, // 1分钟
    max: 5, // 5次请求
    message: '请求过于频繁，请1分钟后再试'
  }),
  
  // 普通限制 - 一般API
  normal: createRateLimiter({
    windowMs: 60000, // 1分钟
    max: 30, // 30次请求
    message: '请求过于频繁，请稍后再试'
  }),
  
  // 宽松限制 - 静态资源
  loose: createRateLimiter({
    windowMs: 60000, // 1分钟
    max: 100, // 100次请求
    message: '请求过于频繁，请稍后再试'
  })
};

module.exports = {
  createRateLimiter,
  loginRateLimiter,
  clearLoginAttempts,
  recordLoginFailure,
  rateLimiters
};