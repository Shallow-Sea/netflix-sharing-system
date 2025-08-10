const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const Settings = require('../models/Settings');
const crypto = require('crypto');
const config = require('../mongodb');

// 加密函数
const encrypt = (text, secretKey) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey.slice(0, 32).padEnd(32, '0')), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
};

// @route   GET api/public/announcements
// @desc    获取公开的公告
// @access  Public
router.get('/announcements', async (req, res) => {
  try {
    const now = new Date();
    
    // 获取当前有效的公告
    const announcements = await Announcement.find({
      is_active: true,
      $and: [
        { $or: [{ start_time: { $exists: false } }, { start_time: null }, { start_time: { $lte: now } }] },
        { $or: [{ end_time: { $exists: false } }, { end_time: null }, { end_time: { $gte: now } }] }
      ]
    }).sort({ display_order: 1, created_at: -1 });
    
    res.json(announcements);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/public/announcements/popup
// @desc    获取弹窗公告
// @access  Public
router.get('/announcements/popup', async (req, res) => {
  try {
    // 检查全局弹窗设置
    const popupEnabledSetting = await Settings.findOne({ key: 'announcement_popup_enabled' });
    const isPopupEnabled = popupEnabledSetting ? popupEnabledSetting.value : true; // 默认启用
    
    if (!isPopupEnabled) {
      return res.json(null);
    }
    
    const now = new Date();
    
    // 获取当前有效的弹窗公告
    const popupAnnouncement = await Announcement.findOne({
      is_active: true,
      show_as_popup: true,
      $and: [
        { $or: [{ start_time: { $exists: false } }, { start_time: null }, { start_time: { $lte: now } }] },
        { $or: [{ end_time: { $exists: false } }, { end_time: null }, { end_time: { $gte: now } }] }
      ]
    }).sort({ display_order: 1, created_at: -1 });
    
    if (!popupAnnouncement) {
      return res.json(null);
    }
    
    res.json(popupAnnouncement);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// 安全密钥，用于API加密
const API_SECRET = config.dataEncryptionKey || config.jwtSecret;

// @route   POST api/public/secure-data
// @desc    获取加密的数据
// @access  Public
router.post('/secure-data', (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({ msg: '请提供数据' });
    }
    
    // 加密数据
    const encryptedData = encrypt(JSON.stringify(data), API_SECRET);
    
    res.json(encryptedData);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

module.exports = router; 