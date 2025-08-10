const crypto = require('crypto');
const config = require('../mongodb');

// AES-256-CBC 加密 (简化版本，兼容性更好)
const encrypt = (text, key) => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  } catch (error) {
    throw new Error('加密失败');
  }
};

// AES-256-CBC 解密
const decrypt = (encryptedData, key) => {
  try {
    const { encrypted } = encryptedData;
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('解密失败');
  }
};

// 响应加密中间件
const encryptResponse = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // 只加密JSON响应
    if (res.get('Content-Type') && res.get('Content-Type').includes('application/json')) {
      try {
        const encrypted = encrypt(data, config.apiEncryptionKey);
        return originalSend.call(this, JSON.stringify({
          encrypted: true,
          data: encrypted
        }));
      } catch (error) {
        console.error('响应加密失败:', error.message);
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// 请求解密中间件
const decryptRequest = (req, res, next) => {
  if (req.body && req.body.encrypted) {
    try {
      const decrypted = decrypt(req.body.data, config.apiEncryptionKey);
      req.body = JSON.parse(decrypted);
    } catch (error) {
      return res.status(400).json({ msg: '请求数据格式错误' });
    }
  }
  
  next();
};

// 敏感数据加密
const encryptSensitiveData = (data) => {
  if (!data) return data;
  
  try {
    return encrypt(JSON.stringify(data), config.dataEncryptionKey);
  } catch (error) {
    console.error('敏感数据加密失败:', error.message);
    return data;
  }
};

// 敏感数据解密
const decryptSensitiveData = (encryptedData) => {
  if (!encryptedData || typeof encryptedData !== 'object') return encryptedData;
  
  try {
    const decrypted = decrypt(encryptedData, config.dataEncryptionKey);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('敏感数据解密失败:', error.message);
    return encryptedData;
  }
};

module.exports = {
  encrypt,
  decrypt,
  encryptResponse,
  decryptRequest,
  encryptSensitiveData,
  decryptSensitiveData
};