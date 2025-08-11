// 测试服务器 - 使用内存数据库
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

// 简单的内存存储
const memoryDB = {
  admins: [],
  accounts: [],
  sharePages: [],
  announcements: []
};

const app = express();

// CORS配置
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8081'],
  credentials: true
}));

app.use(express.json());

// 根路由
app.get('/api', (req, res) => {
  res.json({ 
    message: '奈飞账号共享管理系统API',
    version: '1.0.0',
    environment: 'test',
    timestamp: new Date().toISOString()
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: 'test'
  });
});

// 创建默认管理员
app.post('/api/admin/auth/create-admin', async (req, res) => {
  try {
    // 检查是否已有admin用户
    const existingAdmin = memoryDB.admins.find(a => a.username === 'admin');
    
    if (existingAdmin) {
      return res.json({
        success: true,
        message: '管理员已存在',
        admin: {
          username: 'admin',
          role: 'super_admin'
        }
      });
    }
    
    // 创建新管理员
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const admin = {
      id: Date.now().toString(),
      username: 'admin',
      password: hashedPassword,
      display_name: '系统管理员',
      role: 'super_admin',
      status: 1,
      created_at: new Date()
    };
    
    memoryDB.admins.push(admin);
    
    res.json({
      success: true,
      message: '管理员创建成功',
      admin: {
        username: 'admin',
        role: 'super_admin'
      }
    });
  } catch (err) {
    console.error('创建管理员失败:', err);
    res.status(500).json({ error: '创建管理员失败' });
  }
});

// 管理员登录
app.post('/api/admin/auth', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ msg: '用户名和密码不能为空' });
    }
    
    const admin = memoryDB.admins.find(a => a.username === username);
    if (!admin) {
      return res.status(400).json({ msg: '无效的登录凭据' });
    }
    
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ msg: '无效的登录凭据' });
    }
    
    // 返回简单的token
    const token = Buffer.from(JSON.stringify({ id: admin.id, username: admin.username })).toString('base64');
    
    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// 获取管理员信息
app.get('/api/admin/auth', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ msg: '未提供认证令牌' });
  }
  
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    const admin = memoryDB.admins.find(a => a.id === decoded.id);
    
    if (!admin) {
      return res.status(401).json({ msg: '无效的令牌' });
    }
    
    res.json({
      id: admin.id,
      username: admin.username,
      role: admin.role,
      display_name: admin.display_name
    });
  } catch (err) {
    res.status(401).json({ msg: '无效的令牌' });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 测试服务器运行在端口 ${PORT}`);
  console.log(`📦 环境: test`);
  console.log(`🔗 API地址: http://localhost:${PORT}/api`);
  console.log(`❤️  健康检查: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📋 测试步骤:');
  console.log(`1. 创建管理员: POST http://localhost:${PORT}/api/admin/auth/create-admin`);
  console.log(`2. 测试登录: POST http://localhost:${PORT}/api/admin/auth`);
  console.log('   Body: {"username": "admin", "password": "admin123"}');
});