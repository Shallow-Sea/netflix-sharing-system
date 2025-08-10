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

// 创建默认管理员账户
// 密码: admin123 的bcrypt哈希值
const defaultAdmin = {
  username: 'admin',
  password: '$2b$10$8K1p/a0dRdwjq8YQQhOhReNpN2QkOrLlbNj7QgQWZLj3GgZrF.qTy', // admin123
  email: 'admin@netflix-sharing.com',
  role: 'admin',
  status: 'active',
  created_at: new Date(),
  updated_at: new Date(),
  last_login: null,
  login_attempts: 0,
  locked_until: null
};

// 检查是否已存在admin用户
const existingAdmin = db.admins.findOne({ username: 'admin' });
if (!existingAdmin) {
  db.admins.insertOne(defaultAdmin);
  print('✅ 默认管理员账户已创建');
  print('用户名: admin');
  print('密码: admin123');
  print('⚠️  请登录后立即修改密码!');
} else {
  print('ℹ️  管理员账户已存在，跳过创建');
}

print('MongoDB数据库初始化完成!');
print('数据库名称: netflix_sharing_db');
print('用户名: netflix_user');
print('请修改默认密码!');