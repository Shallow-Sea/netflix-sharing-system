const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const { authMiddleware, blacklistToken, generateSecureToken } = require('../middleware/auth');
const { loginRateLimiter, clearLoginAttempts, recordLoginFailure } = require('../middleware/rateLimiter');
const config = require('../mongodb');

// @route   POST api/admin/auth
// @desc    管理员登录认证
// @access  Public
router.post('/', loginRateLimiter, async (req, res) => {
  const { username, password } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';

  try {
    // 输入验证
    if (!username || !password) {
      recordLoginFailure(clientIP);
      return res.status(400).json({ 
        msg: '用户名和密码不能为空',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // 检查管理员是否存在
    let admin = await Admin.findOne({ username });

    if (!admin) {
      recordLoginFailure(clientIP);
      return res.status(400).json({ 
        msg: '无效的登录凭据',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      recordLoginFailure(clientIP);
      return res.status(400).json({ 
        msg: '无效的登录凭据',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // 检查管理员状态
    if (admin.status !== 1) {
      recordLoginFailure(clientIP);
      return res.status(400).json({ 
        msg: '账户已被禁用',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // 登录成功，清除失败记录
    clearLoginAttempts(clientIP);

    // 更新登录信息
    admin.last_login = new Date();
    admin.last_login_ip = clientIP;
    await admin.save();

    // JWT Payload
    const payload = {
      admin: {
        id: admin._id
      }
    };

    // 生成安全Token
    const token = generateSecureToken(payload, userAgent, clientIP);
    
    // 返回响应
    res.json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        role: admin.role,
        last_login: admin.last_login
      }
    });
  } catch (err) {
    console.error('登录错误:', err.message);
    recordLoginFailure(clientIP);
    res.status(500).json({ 
      msg: '服务器错误',
      code: 'SERVER_ERROR'
    });
  }
});

// @route   POST api/admin/auth/register
// @desc    注册管理员 (初始化时使用，生产环境应移除或限制访问)
// @access  Private - 需要现有管理员权限
router.post('/register', authMiddleware, async (req, res) => {
  // 检查是否允许注册新管理员
  const allowRegistration = process.env.ALLOW_ADMIN_REGISTRATION === 'true';
  if (!allowRegistration) {
    return res.status(403).json({ msg: '管理员注册功能已禁用' });
  }

  const { username, password } = req.body;

  try {
    // 检查管理员是否已存在
    let admin = await Admin.findOne({ username });

    if (admin) {
      return res.status(400).json({ msg: '管理员已存在' });
    }

    // 创建新管理员
    admin = new Admin({
      username,
      password
    });

    // 加密密码
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(password, salt);

    await admin.save();

    // JWT Payload
    const payload = {
      admin: {
        id: admin._id
      }
    };

    // 生成Token
    jwt.sign(
      payload,
      process.env.JWT_SECRET || config.jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || config.jwtExpiresIn },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/admin/auth
// @desc    获取当前登录的管理员信息
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    res.json(admin);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      msg: '服务器错误',
      code: 'SERVER_ERROR'
    });
  }
});

// @route   POST api/admin/auth/logout
// @desc    管理员登出
// @access  Private
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // 将当前token加入黑名单
    blacklistToken(req.token);
    
    res.json({ 
      msg: '登出成功',
      code: 'LOGOUT_SUCCESS'
    });
  } catch (err) {
    console.error('登出错误:', err.message);
    res.status(500).json({ 
      msg: '服务器错误',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router; 