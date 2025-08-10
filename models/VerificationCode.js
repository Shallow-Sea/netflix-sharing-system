const mongoose = require('mongoose');

const VerificationCodeSchema = new mongoose.Schema({
  // 关联的账号ID
  account_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  // 验证码类型
  type: {
    type: String,
    enum: ['login', 'device', 'email'],
    required: true
  },
  // 验证码
  code: {
    type: String,
    required: true
  },
  // 验证码来源
  source: {
    type: String,
    enum: ['manual', 'email', 'api'],
    default: 'manual'
  },
  // 来源邮箱（如果是从邮箱获取）
  source_email: {
    type: String
  },
  // 是否已使用
  is_used: {
    type: Boolean,
    default: false
  },
  // 使用时间
  used_at: {
    type: Date
  },
  // 过期时间
  expires_at: {
    type: Date,
    required: true,
    default: function() {
      // 默认10分钟后过期
      return new Date(Date.now() + 10 * 60 * 1000);
    }
  },
  // 创建时间
  created_at: {
    type: Date,
    default: Date.now
  },
  // IP地址记录
  client_ip: {
    type: String
  },
  // 用户代理记录
  user_agent: {
    type: String
  }
});

// 创建索引
VerificationCodeSchema.index({ account_id: 1, type: 1, created_at: -1 });
VerificationCodeSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// 自动清理过期验证码
VerificationCodeSchema.pre('save', function(next) {
  if (this.isNew && this.expires_at < new Date()) {
    return next(new Error('验证码已过期'));
  }
  next();
});

// 静态方法：清理过期验证码
VerificationCodeSchema.statics.cleanupExpired = function() {
  return this.deleteMany({ expires_at: { $lt: new Date() } });
};

// 静态方法：获取有效验证码
VerificationCodeSchema.statics.getValidCode = function(accountId, type) {
  return this.findOne({
    account_id: accountId,
    type: type,
    is_used: false,
    expires_at: { $gt: new Date() }
  }).sort({ created_at: -1 });
};

// 实例方法：标记为已使用
VerificationCodeSchema.methods.markAsUsed = function() {
  this.is_used = true;
  this.used_at = new Date();
  return this.save();
};

module.exports = mongoose.model('VerificationCode', VerificationCodeSchema);
