const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  // 设置键名
  key: {
    type: String,
    required: true,
    unique: true
  },
  // 设置值
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  // 设置描述
  description: {
    type: String,
    default: ''
  },
  // 设置类型
  type: {
    type: String,
    enum: ['boolean', 'string', 'number', 'object'],
    default: 'string'
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

module.exports = mongoose.model('Settings', SettingsSchema);
