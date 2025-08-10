const mongoose = require('mongoose');

// 定义车位子模式
const ProfileSchema = new mongoose.Schema({
  position: {
    type: Number,
    required: true
  },
  status: {
    type: Number,
    default: 1 // 1-启用，0-停用
  },
  pin: {
    type: String,
    default: ''
  }
});

// 邮箱API配置子模式
const EmailApiConfigSchema = new mongoose.Schema({
  // 邮箱API类型
  api_type: {
    type: String,
    enum: ['custom', 'gmail_api', 'outlook_api', 'webhook'],
    default: 'custom'
  },
  // API接口地址
  api_url: {
    type: String,
    default: ''
  },
  // API请求方法
  api_method: {
    type: String,
    enum: ['GET', 'POST', 'PUT'],
    default: 'GET'
  },
  // API请求头
  api_headers: {
    type: Map,
    of: String,
    default: new Map()
  },
  // API请求参数/Body
  api_params: {
    type: Map,
    of: String,
    default: new Map()
  },
  // API认证信息
  auth_token: {
    type: String,
    default: ''
  },
  // API密钥
  api_key: {
    type: String,
    default: ''
  },
  // 关联的邮箱地址
  email_address: {
    type: String,
    default: ''
  },
  // 是否启用验证码自动获取
  auto_fetch_enabled: {
    type: Boolean,
    default: false
  },
  // 上次验证码获取时间
  last_fetch_time: {
    type: Date
  },
  // 验证码有效期（分钟）
  code_validity_minutes: {
    type: Number,
    default: 10
  },
  // API响应数据解析配置
  response_config: {
    // 邮件列表的JSON路径
    emails_path: {
      type: String,
      default: 'data.emails'
    },
    // 邮件主题的字段名
    subject_field: {
      type: String,
      default: 'subject'
    },
    // 邮件内容的字段名
    content_field: {
      type: String,
      default: 'content'
    },
    // 发件人的字段名
    sender_field: {
      type: String,
      default: 'from'
    },
    // 时间字段名
    date_field: {
      type: String,
      default: 'date'
    }
  }
});

// 主账号模式
const AccountSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  // 替换单一车位为多车位数组
  profiles: {
    type: [ProfileSchema],
    default: function() {
      // 默认创建5个车位
      return Array.from({length: 5}, (_, i) => ({
        position: i + 1,
        status: 1,
        pin: ''
      }));
    }
  },
  // 邮箱API配置
  email_api_config: {
    type: EmailApiConfigSchema,
    default: () => ({})
  },
  // 管理员专用字段 - 前台不可见
  admin_info: {
    // 管理员备注
    notes: {
      type: String,
      default: ''
    },
    // 采购信息
    purchase_info: {
      // 上家平台
      source_platform: {
        type: String,
        enum: ['拼多多', '淘宝', '闲鱼', '微信', 'TG', '其他'],
        default: '其他'
      },
      // 采购金额
      purchase_amount: {
        type: Number,
        default: 0
      },
      // 采购时间
      purchase_date: {
        type: Date
      },
      // 到期时间类型
      expiry_type: {
        type: String,
        enum: ['自定义', '周卡', '月卡', '季度卡', '半年卡', '年卡'],
        default: '月卡'
      },
      // 自定义到期时间（当expiry_type为'自定义'时使用）
      custom_expiry_date: {
        type: Date
      }
    }
  },
  status: {
    type: Number,
    default: 1 // 1-启用，0-停用
  }
}, { 
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

module.exports = mongoose.model('Account', AccountSchema); 