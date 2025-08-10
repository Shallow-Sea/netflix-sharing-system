const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  // 内容格式：html或markdown
  format: {
    type: String,
    enum: ['html', 'markdown'],
    default: 'html'
  },
  // 是否显示为弹窗
  show_as_popup: {
    type: Boolean,
    default: false
  },
  // 弹窗倒计时（秒）
  countdown_seconds: {
    type: Number,
    default: 0
  },
  // 是否激活
  is_active: {
    type: Boolean,
    default: true
  },
  // 显示顺序
  display_order: {
    type: Number,
    default: 0
  },
  // 显示开始时间
  start_time: {
    type: Date
  },
  // 显示结束时间
  end_time: {
    type: Date
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

module.exports = mongoose.model('Announcement', AnnouncementSchema); 