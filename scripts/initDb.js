const bcrypt = require('bcryptjs');
const connectDB = require('../config/database');
const { Account, SharePage, Admin, Announcement, Settings } = require('../models');

// 初始化数据库
const initDatabase = async () => {
  try {
    console.log('开始初始化数据库...');
    
    // 连接MongoDB
    await connectDB();
    
    // 检查是否已有管理员账号
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      console.log('数据库已初始化，跳过初始化过程');
      process.exit(0);
      return;
    }
    
    // 清空现有集合
    await Promise.all([
      Admin.deleteMany({}),
      Account.deleteMany({}),
      SharePage.deleteMany({}),
      Announcement.deleteMany({}),
      Settings.deleteMany({})
    ]);
    console.log('现有集合已清空');

    // 创建默认管理员账号
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const admin = await Admin.create({
      username: 'admin',
      password: hashedPassword,
      display_name: '系统管理员',
      role: 'super_admin',
      status: 1
    });
    console.log('默认管理员账号创建成功');

    // 创建示例奈飞账号
    const account = await Account.create({
      username: 'netflix_user@example.com',
      password: 'netflix_password',
      profiles: [
        { position: 1, status: 1, pin: '' },
        { position: 2, status: 1, pin: '1234' },
        { position: 3, status: 0, pin: '' },
        { position: 4, status: 1, pin: '5678' },
        { position: 5, status: 0, pin: '' }
      ],
      admin_info: {
        notes: '这是一个示例账号，用于演示管理员备注功能。账号状态良好，车位2和4已设置PIN码。',
        purchase_info: {
          source_platform: '淘宝',
          purchase_amount: 15.80,
          purchase_date: new Date('2024-01-15'),
          expiry_type: '月卡',
          custom_expiry_date: null
        }
      },
      status: 1
    });
    console.log('示例奈飞账号创建成功');

    // 创建示例分享页
    const sharePage = await SharePage.create({
      code: 'demo123',
      account_id: account._id,
      profile_position: 1,
      is_activated: true,
      activated_at: new Date(),
      duration_type: 'month',
      duration_days: 30,
      start_time: new Date(),
      end_time: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      status: 1
    });
    console.log('示例分享页创建成功');

    // 创建示例公告
    const announcement = await Announcement.create({
      title: '系统公告',
      content: '<h3>欢迎使用奈飞账号共享管理系统</h3><p>这是一个示例公告，您可以在管理后台修改或删除它。</p>',
      format: 'html',
      show_as_popup: true,
      countdown_seconds: 5,
      is_active: true,
      display_order: 0
    });
    console.log('示例公告创建成功');

    // 创建默认系统设置
    const defaultSettings = [
      {
        key: 'announcement_popup_enabled',
        value: true,
        type: 'boolean',
        description: '控制前端是否显示弹窗公告的全局开关'
      },
      {
        key: 'announcement_auto_hide_seconds',
        value: 0,
        type: 'number',
        description: '公告弹窗自动隐藏时间（秒），0表示不自动隐藏'
      },
      {
        key: 'announcement_max_display_count',
        value: 1,
        type: 'number',
        description: '同时显示的最大公告数量'
      },
      {
        key: 'system_title',
        value: '奈飞账号共享管理系统',
        type: 'string',
        description: '系统标题'
      },
      {
        key: 'maintenance_mode',
        value: false,
        type: 'boolean',
        description: '维护模式开关'
      },
      {
        key: 'share_page_default_duration',
        value: 30,
        type: 'number',
        description: '分享页默认有效期（天）'
      }
    ];

    for (const setting of defaultSettings) {
      await Settings.create(setting);
    }
    console.log('默认系统设置创建成功');

    console.log('数据库初始化成功！');
    process.exit(0);
  } catch (err) {
    console.error('数据库初始化失败:', err);
    process.exit(1);
  }
};

initDatabase(); 