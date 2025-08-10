const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const Admin = require('../models/Admin');
const { authMiddleware } = require('../middleware/auth');

// 权限验证中间件
const requirePermission = (action) => {
  return async (req, res, next) => {
    try {
      const admin = await Admin.findById(req.admin.id);
      if (!admin) {
        return res.status(404).json({ msg: '管理员不存在' });
      }

      // 检查管理员状态
      if (admin.status !== 1) {
        return res.status(403).json({ msg: '账户已被禁用' });
      }

      // 超级管理员拥有所有权限
      if (admin.role === 'super_admin') {
        req.currentAdmin = admin;
        return next();
      }

      // 检查具体权限
      if (!admin.permissions || !admin.permissions.announcements || !admin.permissions.announcements[action]) {
        return res.status(403).json({ msg: '权限不足' });
      }

      req.currentAdmin = admin;
      next();
    } catch (err) {
      console.error(err.message);
      res.status(500).send('服务器错误');
    }
  };
};

// 验证管理员权限中间件
router.use(authMiddleware);

// @route   GET api/admin/announcements
// @desc    获取所有公告
// @access  Private
router.get('/', requirePermission('view'), async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ display_order: 1, created_at: -1 });
    res.json(announcements);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   POST api/admin/announcements
// @desc    添加公告
// @access  Private
router.post('/', async (req, res) => {
  const { 
    title, 
    content, 
    format, 
    show_as_popup, 
    countdown_seconds, 
    is_active,
    display_order,
    start_time,
    end_time
  } = req.body;

  try {
    const newAnnouncement = new Announcement({
      title,
      content,
      format: format || 'html',
      show_as_popup: show_as_popup || false,
      countdown_seconds: countdown_seconds || 0,
      is_active: is_active !== undefined ? is_active : true,
      display_order: display_order || 0,
      start_time,
      end_time
    });

    await newAnnouncement.save();
    res.json(newAnnouncement);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/admin/announcements/:id
// @desc    更新公告
// @access  Private
router.put('/:id', async (req, res) => {
  const { 
    title, 
    content, 
    format, 
    show_as_popup, 
    countdown_seconds, 
    is_active,
    display_order,
    start_time,
    end_time
  } = req.body;

  // 构建更新对象
  const announcementFields = {};
  if (title !== undefined) announcementFields.title = title;
  if (content !== undefined) announcementFields.content = content;
  if (format !== undefined) announcementFields.format = format;
  if (show_as_popup !== undefined) announcementFields.show_as_popup = show_as_popup;
  if (countdown_seconds !== undefined) announcementFields.countdown_seconds = countdown_seconds;
  if (is_active !== undefined) announcementFields.is_active = is_active;
  if (display_order !== undefined) announcementFields.display_order = display_order;
  if (start_time !== undefined) announcementFields.start_time = start_time;
  if (end_time !== undefined) announcementFields.end_time = end_time;

  try {
    let announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ msg: '公告不存在' });
    }

    // 更新公告
    announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { $set: announcementFields },
      { new: true }
    );

    res.json(announcement);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   DELETE api/admin/announcements/:id
// @desc    删除公告
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ msg: '公告不存在' });
    }

    await Announcement.findByIdAndRemove(req.params.id);

    res.json({ msg: '公告已删除' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   DELETE api/admin/announcements
// @desc    批量删除公告
// @access  Private
router.delete('/', async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ msg: '请提供要删除的公告ID' });
  }

  try {
    const result = await Announcement.deleteMany({ _id: { $in: ids } });
    
    res.json({ 
      msg: `已删除 ${result.deletedCount} 条公告`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   POST api/admin/announcements/preview
// @desc    预览公告内容
// @access  Private
router.post('/preview', async (req, res) => {
  const { content, format } = req.body;
  
  if (!content) {
    return res.status(400).json({ msg: '请提供公告内容' });
  }
  
  try {
    // 验证格式
    const validFormats = ['html', 'markdown'];
    const contentFormat = format || 'html';
    
    if (!validFormats.includes(contentFormat)) {
      return res.status(400).json({ msg: '不支持的内容格式' });
    }
    
    // 如果是markdown格式，这里可以添加markdown到html的转换
    // 目前先直接返回，前端负责渲染
    let processedContent = content;
    
    // 基本的安全检查（简单的XSS防护）
    if (contentFormat === 'html') {
      // 这里可以添加更严格的HTML净化
      // 目前只做基本验证
      if (content.includes('<script>') || content.includes('javascript:')) {
        return res.status(400).json({ msg: '内容包含不安全的脚本' });
      }
    }
    
    res.json({
      success: true,
      content: processedContent,
      format: contentFormat,
      preview_info: {
        word_count: content.length,
        format_type: contentFormat,
        is_safe: true
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/admin/announcements/stats
// @desc    获取公告统计信息
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    
    // 统计各种状态的公告数量
    const stats = await Announcement.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { 
            $sum: { 
              $cond: [{ $eq: ['$is_active', true] }, 1, 0] 
            }
          },
          inactive: { 
            $sum: { 
              $cond: [{ $eq: ['$is_active', false] }, 1, 0] 
            }
          },
          popup: { 
            $sum: { 
              $cond: [{ $eq: ['$show_as_popup', true] }, 1, 0] 
            }
          },
          html_format: { 
            $sum: { 
              $cond: [{ $eq: ['$format', 'html'] }, 1, 0] 
            }
          },
          markdown_format: { 
            $sum: { 
              $cond: [{ $eq: ['$format', 'markdown'] }, 1, 0] 
            }
          }
        }
      }
    ]);
    
    // 获取当前有效的弹窗公告
    const activePopupAnnouncement = await Announcement.findOne({
      is_active: true,
      show_as_popup: true,
      $and: [
        { $or: [{ start_time: { $exists: false } }, { start_time: null }, { start_time: { $lte: now } }] },
        { $or: [{ end_time: { $exists: false } }, { end_time: null }, { end_time: { $gte: now } }] }
      ]
    });
    
    const result = stats[0] || {
      total: 0,
      active: 0,
      inactive: 0,
      popup: 0,
      html_format: 0,
      markdown_format: 0
    };
    
    res.json({
      ...result,
      current_popup_active: !!activePopupAnnouncement,
      current_popup_title: activePopupAnnouncement ? activePopupAnnouncement.title : null
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/admin/announcements/settings
// @desc    获取公告系统设置
// @access  Private
router.get('/settings', async (req, res) => {
  try {
    const Settings = require('../models/Settings');
    
    // 获取公告相关的设置
    const announcementSettings = await Settings.find({
      key: { $in: ['announcement_popup_enabled', 'announcement_auto_hide_seconds', 'announcement_max_display_count'] }
    });
    
    // 转换为键值对格式
    const settings = {
      popup_enabled: true,
      auto_hide_seconds: 0,
      max_display_count: 1
    };
    
    announcementSettings.forEach(setting => {
      switch (setting.key) {
        case 'announcement_popup_enabled':
          settings.popup_enabled = setting.value;
          break;
        case 'announcement_auto_hide_seconds':
          settings.auto_hide_seconds = setting.value;
          break;
        case 'announcement_max_display_count':
          settings.max_display_count = setting.value;
          break;
      }
    });
    
    res.json(settings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/admin/announcements/settings
// @desc    更新公告系统设置
// @access  Private
router.put('/settings', async (req, res) => {
  const { popup_enabled, auto_hide_seconds, max_display_count } = req.body;
  
  try {
    const Settings = require('../models/Settings');
    const updatedSettings = {};
    
    // 更新弹窗启用设置
    if (popup_enabled !== undefined) {
      let setting = await Settings.findOne({ key: 'announcement_popup_enabled' });
      if (setting) {
        setting.value = popup_enabled;
        await setting.save();
      } else {
        setting = new Settings({
          key: 'announcement_popup_enabled',
          value: popup_enabled,
          type: 'boolean',
          description: '控制前端是否显示弹窗公告的全局开关'
        });
        await setting.save();
      }
      updatedSettings.popup_enabled = popup_enabled;
    }
    
    // 更新自动隐藏秒数设置
    if (auto_hide_seconds !== undefined) {
      let setting = await Settings.findOne({ key: 'announcement_auto_hide_seconds' });
      if (setting) {
        setting.value = auto_hide_seconds;
        await setting.save();
      } else {
        setting = new Settings({
          key: 'announcement_auto_hide_seconds',
          value: auto_hide_seconds,
          type: 'number',
          description: '公告弹窗自动隐藏时间（秒），0表示不自动隐藏'
        });
        await setting.save();
      }
      updatedSettings.auto_hide_seconds = auto_hide_seconds;
    }
    
    // 更新最大显示数量设置
    if (max_display_count !== undefined) {
      let setting = await Settings.findOne({ key: 'announcement_max_display_count' });
      if (setting) {
        setting.value = max_display_count;
        await setting.save();
      } else {
        setting = new Settings({
          key: 'announcement_max_display_count',
          value: max_display_count,
          type: 'number',
          description: '同时显示的最大公告数量'
        });
        await setting.save();
      }
      updatedSettings.max_display_count = max_display_count;
    }
    
    res.json({
      msg: '公告设置更新成功',
      settings: updatedSettings
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

module.exports = router; 