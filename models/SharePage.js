const mongoose = require('mongoose');

const SharePageSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  account_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  },
  // 指定使用的车位位置
  profile_position: {
    type: Number,
    default: 1
  },
  // 激活状态
  is_activated: {
    type: Boolean,
    default: false
  },
  // 激活时间
  activated_at: {
    type: Date
  },
  // 有效期类型
  duration_type: {
    type: String,
    enum: ['day', 'week', 'month', 'quarter', 'year'],
    default: 'month'
  },
  // 有效期天数
  duration_days: {
    type: Number,
    default: 30
  },
  start_time: {
    type: Date
  },
  end_time: {
    type: Date
  },
  status: {
    type: Number,
    default: 1 // 1-启用，0-停用
  },
  // 访问密码，可选
  access_password: {
    type: String,
    default: ''
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

module.exports = mongoose.model('SharePage', SharePageSchema); 