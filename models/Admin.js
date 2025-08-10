const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  // 显示名称
  display_name: {
    type: String,
    default: ''
  },
  // 角色权限系统
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'operator', 'viewer'],
    default: 'admin'
  },
  // 具体权限配置
  permissions: {
    // 账号管理权限
    accounts: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: true },
      edit: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    // 分享页管理权限
    share_pages: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: true },
      edit: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    // 公告管理权限
    announcements: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: true },
      edit: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    // 管理员管理权限
    admin_management: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    // 系统设置权限
    system_settings: {
      view: { type: Boolean, default: false },
      edit: { type: Boolean, default: false }
    }
  },
  // 账户状态
  status: {
    type: Number,
    default: 1 // 1-启用，0-禁用
  },
  // 最后登录时间
  last_login: {
    type: Date
  },
  // 最后登录IP
  last_login_ip: {
    type: String
  },
  // 创建者ID（谁创建的这个管理员）
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// 根据角色设置默认权限
AdminSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('role')) {
    switch (this.role) {
      case 'super_admin':
        // 超级管理员拥有所有权限
        this.permissions = {
          accounts: { view: true, create: true, edit: true, delete: true },
          share_pages: { view: true, create: true, edit: true, delete: true },
          announcements: { view: true, create: true, edit: true, delete: true },
          admin_management: { view: true, create: true, edit: true, delete: true },
          system_settings: { view: true, edit: true }
        };
        break;
      case 'admin':
        // 普通管理员
        this.permissions = {
          accounts: { view: true, create: true, edit: true, delete: false },
          share_pages: { view: true, create: true, edit: true, delete: false },
          announcements: { view: true, create: true, edit: true, delete: false },
          admin_management: { view: false, create: false, edit: false, delete: false },
          system_settings: { view: false, edit: false }
        };
        break;
      case 'operator':
        // 操作员
        this.permissions = {
          accounts: { view: true, create: true, edit: true, delete: false },
          share_pages: { view: true, create: true, edit: true, delete: false },
          announcements: { view: true, create: false, edit: false, delete: false },
          admin_management: { view: false, create: false, edit: false, delete: false },
          system_settings: { view: false, edit: false }
        };
        break;
      case 'viewer':
        // 只读用户
        this.permissions = {
          accounts: { view: true, create: false, edit: false, delete: false },
          share_pages: { view: true, create: false, edit: false, delete: false },
          announcements: { view: true, create: false, edit: false, delete: false },
          admin_management: { view: false, create: false, edit: false, delete: false },
          system_settings: { view: false, edit: false }
        };
        break;
    }
  }
  next();
});

module.exports = mongoose.model('Admin', AdminSchema); 