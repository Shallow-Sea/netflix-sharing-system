// MongoDB初始化脚本
print('开始初始化MongoDB数据库...');

// 切换到应用数据库
db = db.getSiblingDB('netflix_sharing_db');

// 创建应用用户
db.createUser({
  user: 'netflix_user',
  pwd: 'netflix_password_change_me',
  roles: [
    {
      role: 'readWrite',
      db: 'netflix_sharing_db'
    }
  ]
});

// 创建集合和索引
db.createCollection('admins');
db.createCollection('accounts');
db.createCollection('sharepages');
db.createCollection('announcements');
db.createCollection('settings');
db.createCollection('verificationcodes');

// 创建索引
db.admins.createIndex({ username: 1 }, { unique: true });
db.admins.createIndex({ status: 1 });
db.accounts.createIndex({ platform: 1, status: 1 });
db.accounts.createIndex({ created_at: -1 });
db.sharepages.createIndex({ code: 1 }, { unique: true });
db.sharepages.createIndex({ is_active: 1 });
db.announcements.createIndex({ is_active: 1, priority: -1 });
db.verificationcodes.createIndex({ code: 1 });
db.verificationcodes.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

print('MongoDB数据库初始化完成!');
print('数据库名称: netflix_sharing_db');
print('用户名: netflix_user');
print('请修改默认密码!');