const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
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
      if (!admin.permissions || !admin.permissions.system_settings || !admin.permissions.system_settings[action]) {
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

// @route   GET api/admin/settings
// @desc    获取所有设置
// @access  Private
router.get('/', requirePermission('view'), async (req, res) => {
  try {
    const settings = await Settings.find().sort({ key: 1 });
    
    // 转换为键值对格式
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = {
        value: setting.value,
        type: setting.type,
        description: setting.description,
        updated_at: setting.updated_at
      };
    });
    
    res.json(settingsObj);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/admin/settings/:key
// @desc    获取特定设置
// @access  Private
router.get('/:key', async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key });
    
    if (!setting) {
      return res.status(404).json({ msg: '设置不存在' });
    }
    
    res.json({
      key: setting.key,
      value: setting.value,
      type: setting.type,
      description: setting.description,
      updated_at: setting.updated_at
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/admin/settings/:key
// @desc    更新或创建设置
// @access  Private
router.put('/:key', requirePermission('edit'), async (req, res) => {
  const { value, description, type } = req.body;
  
  if (value === undefined) {
    return res.status(400).json({ msg: '请提供设置值' });
  }
  
  try {
    let setting = await Settings.findOne({ key: req.params.key });
    
    if (setting) {
      // 更新现有设置
      setting.value = value;
      if (description !== undefined) setting.description = description;
      if (type !== undefined) setting.type = type;
      await setting.save();
    } else {
      // 创建新设置
      setting = new Settings({
        key: req.params.key,
        value,
        description: description || '',
        type: type || 'string'
      });
      await setting.save();
    }
    
    res.json({
      key: setting.key,
      value: setting.value,
      type: setting.type,
      description: setting.description,
      updated_at: setting.updated_at
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   DELETE api/admin/settings/:key
// @desc    删除设置
// @access  Private
router.delete('/:key', async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key });
    
    if (!setting) {
      return res.status(404).json({ msg: '设置不存在' });
    }
    
    await Settings.findByIdAndRemove(setting._id);
    res.json({ msg: '设置已删除' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   POST api/admin/settings/batch
// @desc    批量更新设置
// @access  Private
router.post('/batch', requirePermission('edit'), async (req, res) => {
  const { settings } = req.body;
  
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ msg: '请提供有效的设置对象' });
  }
  
  try {
    const updatedSettings = {};
    
    for (const [key, settingData] of Object.entries(settings)) {
      const { value, description, type } = settingData;
      
      if (value === undefined) {
        continue;
      }
      
      let setting = await Settings.findOne({ key });
      
      if (setting) {
        // 更新现有设置
        setting.value = value;
        if (description !== undefined) setting.description = description;
        if (type !== undefined) setting.type = type;
        await setting.save();
      } else {
        // 创建新设置
        setting = new Settings({
          key,
          value,
          description: description || '',
          type: type || 'string'
        });
        await setting.save();
      }
      
      updatedSettings[key] = {
        value: setting.value,
        type: setting.type,
        description: setting.description,
        updated_at: setting.updated_at
      };
    }
    
    res.json(updatedSettings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

module.exports = router;
