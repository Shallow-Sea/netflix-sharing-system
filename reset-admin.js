// 重置管理员脚本 - 将现有的admin用户升级为超级管理员
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const connectDB = require('./config/database');

const resetAdminToSuperAdmin = async () => {
  try {
    console.log('连接数据库...');
    await connectDB();
    
    // 查找现有的admin用户
    const admin = await Admin.findOne({ username: 'admin' });
    
    if (!admin) {
      console.log('❌ 没有找到admin用户');
      process.exit(1);
    }
    
    console.log('📋 当前admin用户信息:');
    console.log(`   用户名: ${admin.username}`);
    console.log(`   角色: ${admin.role}`);
    console.log(`   状态: ${admin.status === 1 ? '启用' : '禁用'}`);
    
    // 更新为超级管理员
    admin.role = 'super_admin';
    admin.status = 1;
    admin.display_name = '系统管理员';
    
    // 手动设置超级管理员权限（虽然pre-save hook会自动设置，但确保万无一失）
    admin.permissions = {
      accounts: { view: true, create: true, edit: true, delete: true },
      share_pages: { view: true, create: true, edit: true, delete: true },
      announcements: { view: true, create: true, edit: true, delete: true },
      admin_management: { view: true, create: true, edit: true, delete: true },
      system_settings: { view: true, edit: true }
    };
    
    await admin.save();
    
    console.log('✅ admin用户已成功升级为超级管理员');
    console.log('📋 更新后的信息:');
    console.log(`   角色: ${admin.role}`);
    console.log(`   权限已设置: 所有模块的完整权限`);
    console.log('');
    console.log('🎉 现在可以使用以下凭据登录管理后台:');
    console.log('   用户名: admin');
    console.log('   密码: admin123');
    console.log('   权限: 超级管理员（可以管理其他管理员）');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ 重置失败:', err);
    process.exit(1);
  }
};

// 运行脚本
resetAdminToSuperAdmin();
