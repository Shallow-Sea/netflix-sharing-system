// 创建默认管理员脚本
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const connectDB = require('./config/database');

const createDefaultAdmin = async () => {
  try {
    console.log('连接数据库...');
    await connectDB();
    
    // 检查是否已有admin用户
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('✅ admin用户已存在');
      console.log('📋 用户信息:');
      console.log(`   用户名: ${existingAdmin.username}`);
      console.log(`   角色: ${existingAdmin.role}`);
      console.log(`   状态: ${existingAdmin.status === 1 ? '启用' : '禁用'}`);
      console.log('');
      console.log('🔑 登录凭据:');
      console.log('   用户名: admin');
      console.log('   密码: admin123');
      process.exit(0);
      return;
    }
    
    console.log('创建默认管理员账号...');
    
    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // 创建管理员
    const admin = await Admin.create({
      username: 'admin',
      password: hashedPassword,
      display_name: '系统管理员',
      role: 'super_admin',
      status: 1,
      permissions: {
        accounts: { view: true, create: true, edit: true, delete: true },
        share_pages: { view: true, create: true, edit: true, delete: true },
        announcements: { view: true, create: true, edit: true, delete: true },
        admin_management: { view: true, create: true, edit: true, delete: true },
        system_settings: { view: true, edit: true }
      }
    });
    
    console.log('✅ 默认管理员账号创建成功！');
    console.log('📋 账号信息:');
    console.log(`   用户名: ${admin.username}`);
    console.log(`   角色: ${admin.role}`);
    console.log(`   状态: 启用`);
    console.log('');
    console.log('🔑 登录凭据:');
    console.log('   用户名: admin');
    console.log('   密码: admin123');
    console.log('   权限: 超级管理员（拥有所有权限）');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ 创建管理员失败:', err);
    process.exit(1);
  }
};

// 运行脚本
createDefaultAdmin();