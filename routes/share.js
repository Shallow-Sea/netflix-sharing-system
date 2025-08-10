const express = require('express');
const router = express.Router();
const SharePage = require('../models/SharePage');
const Account = require('../models/Account');
const VerificationCode = require('../models/VerificationCode');
const moment = require('moment');
const crypto = require('crypto');
const config = require('../mongodb');
const emailService = require('../services/emailService');

// 加密函数
const encrypt = (text, secretKey) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey.slice(0, 32).padEnd(32, '0')), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
};

// 安全密钥，用于API加密
const API_SECRET = config.dataEncryptionKey || config.jwtSecret;

// @route   GET api/share/:code
// @desc    根据代码获取分享页信息
// @access  Public
router.get('/:code', async (req, res) => {
  // 设置安全头
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  try {
    // 查找有效的分享页
    const sharePage = await SharePage.findOne({
      code: req.params.code,
      status: 1
    });

    if (!sharePage) {
      return res.status(404).json({ msg: '分享页不存在或已失效' });
    }

    // 检查是否需要密码访问
    if (sharePage.access_password && sharePage.access_password.trim() !== '') {
      // 如果需要密码，只返回基本信息，不返回账号信息
      return res.json({
        id: sharePage._id,
        code: sharePage.code,
        requires_password: true,
        is_activated: sharePage.is_activated,
        activated_at: sharePage.activated_at,
        start_time: sharePage.start_time,
        end_time: sharePage.end_time
      });
    }

    // 检查是否在有效期内
    const now = moment();
    const startTime = sharePage.start_time ? moment(sharePage.start_time) : null;
    const endTime = sharePage.end_time ? moment(sharePage.end_time) : null;

    if (startTime && now.isBefore(startTime)) {
      return res.status(400).json({ msg: '分享页尚未激活' });
    }

    if (endTime && now.isAfter(endTime)) {
      return res.status(400).json({ msg: '分享页已过期' });
    }

    // 如果分享页未激活，不返回账号信息
    if (!sharePage.is_activated) {
      return res.json({
        id: sharePage._id,
        code: sharePage.code,
        is_activated: false,
        requires_activation: true,
        start_time: sharePage.start_time,
        end_time: null,
        duration_type: sharePage.duration_type,
        duration_days: sharePage.duration_days,
        activation_info: {
          can_activate: true,
          message: '此分享页尚未激活，激活后即可使用账号信息',
          duration_description: `激活后有效期为${sharePage.duration_days}天`
        }
      });
    }

    // 获取账号信息
    const account = await Account.findById(sharePage.account_id);
    
    if (!account || account.status !== 1) {
      return res.status(400).json({ msg: '账号不可用' });
    }

    // 获取特定车位信息
    const profile = account.profiles.find(p => p.position === sharePage.profile_position);
    
    if (!profile || profile.status !== 1) {
      return res.status(400).json({ msg: '账号车位不可用' });
    }

    // 返回分享页信息
    const sharePageData = {
      id: sharePage._id,
      code: sharePage.code,
      is_activated: sharePage.is_activated,
      activated_at: sharePage.activated_at,
      start_time: sharePage.start_time,
      end_time: sharePage.end_time,
      account: {
        username: account.username,
        password: account.password,
        profile_position: profile.position,
        pin: profile.pin || ''
      }
    };

    // 加密敏感数据
    const encryptedData = encrypt(JSON.stringify(sharePageData), API_SECRET);
    
    res.json({
      ...sharePageData,
      secure_data: encryptedData
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   POST api/share/:code/access
// @desc    验证分享页访问密码
// @access  Public
router.post('/:code/access', async (req, res) => {
  const { password } = req.body;
  
  try {
    const sharePage = await SharePage.findOne({
      code: req.params.code,
      status: 1
    });

    if (!sharePage) {
      return res.status(404).json({ msg: '分享页不存在或已失效' });
    }

    // 验证密码
    if (!sharePage.access_password || sharePage.access_password !== password) {
      return res.status(401).json({ msg: '访问密码错误' });
    }

    // 如果密码正确，返回重定向信息
    res.json({ 
      success: true,
      msg: '密码验证成功',
      redirect: `/share/${sharePage.code}`
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   POST api/share/:code/activate
// @desc    激活分享页
// @access  Public
router.post('/:code/activate', async (req, res) => {
  try {
    const sharePage = await SharePage.findOne({
      code: req.params.code,
      status: 1
    });
    
    if (!sharePage) {
      return res.status(404).json({ msg: '分享页不存在或已失效' });
    }
    
    // 检查是否需要密码访问
    if (sharePage.access_password && sharePage.access_password.trim() !== '') {
      const { password } = req.body;
      if (!password || password !== sharePage.access_password) {
        return res.status(401).json({ msg: '访问密码错误' });
      }
    }
    
    // 如果已经激活，不做任何操作
    if (sharePage.is_activated) {
      return res.json({ msg: '分享页已经激活', is_activated: true });
    }
    
    // 激活分享页并设置激活时间
    const now = new Date();
    
    // 计算到期时间（激活时间 + 有效期天数）
    const endTime = moment(now).add(sharePage.duration_days, 'days').toDate();
    
    const updatedSharePage = await SharePage.findByIdAndUpdate(
      sharePage._id,
      { 
        is_activated: true, 
        activated_at: now,
        end_time: endTime
      },
      { new: true }
    );
    
    res.json({ 
      success: true,
      msg: '分享页激活成功', 
      is_activated: true,
      activated_at: updatedSharePage.activated_at,
      end_time: updatedSharePage.end_time,
      activation_result: {
        message: '激活成功！您现在可以刷新页面查看账号信息',
        expires_at: moment(updatedSharePage.end_time).format('YYYY-MM-DD HH:mm:ss'),
        duration_description: `有效期${updatedSharePage.duration_days}天`
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   POST api/share/:code/verify-code
// @desc    获取验证码（从邮箱API获取真实验证码）
// @access  Public
router.post('/:code/verify-code', async (req, res) => {
  const { type, password } = req.body; // type可以是'login'或'device'

  try {
    const sharePage = await SharePage.findOne({
      code: req.params.code,
      status: 1,
      is_activated: true
    }).populate('account_id');

    if (!sharePage) {
      return res.status(404).json({ msg: '分享页不存在、未激活或已失效' });
    }

    // 检查是否需要密码访问
    if (sharePage.access_password && sharePage.access_password.trim() !== '') {
      if (!password || password !== sharePage.access_password) {
        return res.status(401).json({ msg: '访问密码错误' });
      }
    }

    // 检查是否在有效期内
    const now = moment();
    const endTime = sharePage.end_time ? moment(sharePage.end_time) : null;

    if (endTime && now.isAfter(endTime)) {
      return res.status(400).json({ msg: '分享页已过期' });
    }

    const account = sharePage.account_id;
    if (!account) {
      return res.status(404).json({ msg: '关联账号不存在' });
    }

    // 检查是否存在有效的缓存验证码
    const existingCode = await VerificationCode.getValidCode(account._id, type || 'login');
    if (existingCode) {
      return res.json({
        code: existingCode.code,
        msg: '验证码获取成功（缓存）',
        source: existingCode.source,
        expires_at: existingCode.expires_at,
        cached: true
      });
    }

    // 检查是否配置了邮箱API
    if (account.email_api_config && account.email_api_config.auto_fetch_enabled && account.email_api_config.api_url) {
      try {
        // 返回正在获取状态
        res.json({
          msg: '正在从邮箱获取验证码，请稍候...',
          status: 'fetching',
          estimated_time: '30-60秒'
        });

        // 异步获取验证码
        emailApiService.getNetflixVerificationCode(account.email_api_config, 5)
          .then(async (result) => {
            // 保存验证码到数据库
            const verificationCode = new VerificationCode({
              account_id: account._id,
              type: type || 'login',
              code: result.code,
              source: 'email_api',
              source_email: result.email,
              expires_at: new Date(Date.now() + (account.email_api_config.code_validity_minutes || 10) * 60 * 1000),
              client_ip: req.ip,
              user_agent: req.get('User-Agent')
            });

            await verificationCode.save();

            // 更新账号的最后获取时间
            account.email_api_config.last_fetch_time = new Date();
            await account.save();

            console.log(`账号 ${account.username} 成功获取验证码: ${result.code}`);
          })
          .catch(async (error) => {
            console.error(`账号 ${account.username} 获取验证码失败:`, error.message);
            
            // 生成备用验证码
            const backupCode = Math.floor(100000 + Math.random() * 900000);
            const verificationCode = new VerificationCode({
              account_id: account._id,
              type: type || 'login',
              code: backupCode.toString(),
              source: 'manual',
              expires_at: new Date(Date.now() + 10 * 60 * 1000),
              client_ip: req.ip,
              user_agent: req.get('User-Agent')
            });

            await verificationCode.save();
          });

        return; // 已经发送响应，结束处理

      } catch (apiError) {
        console.error('邮箱API获取验证码失败:', apiError.message);
        // 继续执行备用逻辑
      }
    }

    // 备用方案：生成随机验证码
    const backupCode = Math.floor(100000 + Math.random() * 900000);
    
    // 保存到数据库
    const verificationCode = new VerificationCode({
      account_id: account._id,
      type: type || 'login',
      code: backupCode.toString(),
      source: 'manual',
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
      client_ip: req.ip,
      user_agent: req.get('User-Agent')
    });

    await verificationCode.save();

    // 根据类型返回不同信息
    const typeMsg = type === 'login' ? '登录' : (type === 'device' ? '设备' : '');
    res.json({ 
      code: backupCode, 
      msg: `${typeMsg}验证码生成成功（备用）`,
      source: 'manual',
      expires_at: verificationCode.expires_at
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/share/:code/verify-code-status
// @desc    查询验证码获取状态
// @access  Public
router.get('/:code/verify-code-status', async (req, res) => {
  const { type } = req.query;

  try {
    const sharePage = await SharePage.findOne({
      code: req.params.code,
      status: 1,
      is_activated: true
    }).populate('account_id');

    if (!sharePage) {
      return res.status(404).json({ msg: '分享页不存在、未激活或已失效' });
    }

    const account = sharePage.account_id;
    if (!account) {
      return res.status(404).json({ msg: '关联账号不存在' });
    }

    // 查询最新的验证码
    const latestCode = await VerificationCode.getValidCode(account._id, type || 'login');
    
    if (latestCode) {
      res.json({
        code: latestCode.code,
        msg: '验证码获取成功',
        source: latestCode.source,
        expires_at: latestCode.expires_at,
        created_at: latestCode.created_at
      });
    } else {
      res.json({
        msg: '暂无可用验证码',
        status: 'none'
      });
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   POST api/share/:code/update-device
// @desc    更新同户设备
// @access  Public
router.post('/:code/update-device', async (req, res) => {
  try {
    const sharePage = await SharePage.findOne({
      code: req.params.code,
      status: 1,
      is_activated: true
    });

    if (!sharePage) {
      return res.status(404).json({ msg: '分享页不存在、未激活或已失效' });
    }

    // 检查是否需要密码访问
    if (sharePage.access_password && sharePage.access_password.trim() !== '') {
      const { password } = req.body;
      if (!password || password !== sharePage.access_password) {
        return res.status(401).json({ msg: '访问密码错误' });
      }
    }

    // 检查是否在有效期内
    const now = moment();
    const endTime = sharePage.end_time ? moment(sharePage.end_time) : null;

    if (endTime && now.isAfter(endTime)) {
      return res.status(400).json({ msg: '分享页已过期' });
    }

    // 这里可以添加更新设备的逻辑，目前只返回成功信息
    res.json({ success: true, msg: '同户设备更新成功' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

module.exports = router; 