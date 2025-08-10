const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const SharePage = require('../models/SharePage');
const Admin = require('../models/Admin');
const { authMiddleware } = require('../middleware/auth');
const emailApiService = require('../services/emailApiService');

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
      if (!admin.permissions || !admin.permissions.accounts || !admin.permissions.accounts[action]) {
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

// @route   GET api/admin/accounts
// @desc    获取所有账号
// @access  Private
router.get('/', requirePermission('view'), async (req, res) => {
  try {
    const accounts = await Account.find().sort({ created_at: -1 });
    res.json(accounts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   POST api/admin/accounts
// @desc    添加账号
// @access  Private
router.post('/', requirePermission('create'), async (req, res) => {
  const { username, password, profiles, admin_info } = req.body;

  try {
    const newAccount = new Account({
      username,
      password,
      profiles: profiles || undefined,
      admin_info: admin_info || {
        notes: '',
        purchase_info: {
          source_platform: '其他',
          purchase_amount: 0,
          purchase_date: null,
          expiry_type: '月卡',
          custom_expiry_date: null
        }
      },
      status: 1
    });

    await newAccount.save();
    res.json(newAccount);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/admin/accounts/batch
// @desc    批量修改账号
// @access  Private
router.put('/batch', requirePermission('edit'), async (req, res) => {
  const { accounts } = req.body;

  try {
    const updatedAccounts = [];

    for (let account of accounts) {
      const { _id, username, password, profiles, status, admin_info } = account;
      
      // 构建更新对象
      const updateData = {};
      if (username !== undefined) updateData.username = username;
      if (password !== undefined) updateData.password = password;
      if (profiles !== undefined) updateData.profiles = profiles;
      if (status !== undefined) updateData.status = status;
      if (admin_info !== undefined) updateData.admin_info = admin_info;
      
      const updatedAccount = await Account.findByIdAndUpdate(
        _id,
        updateData,
        { new: true }
      );

      if (updatedAccount) {
        updatedAccounts.push(updatedAccount);
      }
    }

    res.json(updatedAccounts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/admin/accounts/:id/status
// @desc    停用/启用账号
// @access  Private
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;

  try {
    const updatedAccount = await Account.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (updatedAccount) {
      res.json(updatedAccount);
    } else {
      res.status(404).json({ msg: '账号不存在' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/admin/accounts/:id/profiles/:position
// @desc    更新特定账号的特定车位
// @access  Private
router.put('/:id/profiles/:position', async (req, res) => {
  const { status, pin } = req.body;
  const position = parseInt(req.params.position);

  if (position < 1 || position > 5) {
    return res.status(400).json({ msg: '车位位置无效，必须在1-5之间' });
  }

  try {
    const account = await Account.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ msg: '账号不存在' });
    }

    // 查找并更新指定位置的车位
    const profileIndex = account.profiles.findIndex(p => p.position === position);
    
    if (profileIndex !== -1) {
      if (status !== undefined) account.profiles[profileIndex].status = status;
      if (pin !== undefined) account.profiles[profileIndex].pin = pin;
    } else {
      // 如果不存在该位置的车位，添加一个
      account.profiles.push({
        position,
        status: status !== undefined ? status : 1,
        pin: pin || ''
      });
    }

    await account.save();
    res.json(account);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   DELETE api/admin/accounts/:id
// @desc    删除账号
// @access  Private
router.delete('/:id', requirePermission('delete'), async (req, res) => {
  const { force } = req.body;
  
  try {
    // 查找关联的分享页
    const relatedSharePages = await SharePage.find({ account_id: req.params.id });
    
    if (relatedSharePages.length > 0 && !force) {
      return res.status(400).json({ 
        msg: '该账号有关联的分享页，请先删除或更新这些分享页',
        sharePages: relatedSharePages
      });
    }

    // 如果强制删除，则将相关分享页的账号ID设为null
    if (force && relatedSharePages.length > 0) {
      await SharePage.updateMany(
        { account_id: req.params.id },
        { $set: { account_id: null } }
      );
    }

    const account = await Account.findById(req.params.id);
    
    if (!account) {
      return res.status(404).json({ msg: '账号不存在' });
    }

    await Account.findByIdAndRemove(req.params.id);
    res.json({ msg: '账号删除成功' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   DELETE api/admin/accounts
// @desc    批量删除账号
// @access  Private
router.delete('/', requirePermission('delete'), async (req, res) => {
  const { ids, force } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ msg: '请提供要删除的账号ID' });
  }

  try {
    // 检查是否有关联的分享页
    if (!force) {
      const relatedSharePages = await SharePage.find({ account_id: { $in: ids } });
      
      if (relatedSharePages.length > 0) {
        return res.status(400).json({ 
          msg: '有账号存在关联的分享页，请先删除或更新这些分享页，或使用强制删除',
          sharePages: relatedSharePages
        });
      }
    } else {
      // 强制删除时，将关联的分享页的账号ID设为null
      await SharePage.updateMany(
        { account_id: { $in: ids } },
        { $set: { account_id: null } }
      );
    }

    const result = await Account.deleteMany({ _id: { $in: ids } });
    
    res.json({ 
      msg: `已删除 ${result.deletedCount} 个账号`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/admin/accounts/:id/profiles/batch
// @desc    批量更新账号所有车位设置
// @access  Private
router.put('/:id/profiles/batch', async (req, res) => {
  const { profiles } = req.body;

  if (!profiles || !Array.isArray(profiles)) {
    return res.status(400).json({ msg: '请提供有效的车位配置数组' });
  }

  try {
    const account = await Account.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ msg: '账号不存在' });
    }

    // 验证车位配置
    for (const profile of profiles) {
      const { position, status, pin } = profile;
      
      if (!position || position < 1 || position > 5) {
        return res.status(400).json({ msg: `车位位置 ${position} 无效，必须在1-5之间` });
      }
      
      if (status !== undefined && ![0, 1].includes(status)) {
        return res.status(400).json({ msg: `车位 ${position} 状态无效，必须是0或1` });
      }
    }

    // 批量更新车位
    profiles.forEach(profileUpdate => {
      const { position, status, pin } = profileUpdate;
      const profileIndex = account.profiles.findIndex(p => p.position === position);
      
      if (profileIndex !== -1) {
        // 更新现有车位
        if (status !== undefined) account.profiles[profileIndex].status = status;
        if (pin !== undefined) account.profiles[profileIndex].pin = pin;
      } else {
        // 添加新车位
        account.profiles.push({
          position,
          status: status !== undefined ? status : 1,
          pin: pin || ''
        });
      }
    });

    // 按位置排序车位
    account.profiles.sort((a, b) => a.position - b.position);
    
    await account.save();

    res.json({
      msg: '车位批量更新成功',
      account: {
        id: account._id,
        username: account.username,
        profiles: account.profiles,
        status: account.status
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/admin/accounts/:id/profiles/toggle-all
// @desc    一键开启/关闭所有车位
// @access  Private
router.put('/:id/profiles/toggle-all', async (req, res) => {
  const { status } = req.body;

  if (![0, 1].includes(status)) {
    return res.status(400).json({ msg: '状态值无效，必须是0或1' });
  }

  try {
    const account = await Account.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ msg: '账号不存在' });
    }

    // 确保有5个车位
    for (let i = 1; i <= 5; i++) {
      const profileIndex = account.profiles.findIndex(p => p.position === i);
      if (profileIndex !== -1) {
        account.profiles[profileIndex].status = status;
      } else {
        account.profiles.push({
          position: i,
          status: status,
          pin: ''
        });
      }
    }

    // 按位置排序
    account.profiles.sort((a, b) => a.position - b.position);
    
    await account.save();

    res.json({
      msg: `所有车位已${status === 1 ? '启用' : '停用'}`,
      account: {
        id: account._id,
        username: account.username,
        profiles: account.profiles,
        status: account.status
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/admin/accounts/:id/email-api-config
// @desc    配置账号邮箱API设置
// @access  Private
router.put('/:id/email-api-config', async (req, res) => {
  const { 
    api_type, 
    api_url, 
    api_method, 
    api_headers, 
    api_params, 
    auth_token, 
    api_key, 
    email_address, 
    auto_fetch_enabled, 
    code_validity_minutes,
    response_config
  } = req.body;

  try {
    const account = await Account.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ msg: '账号不存在' });
    }

    // 更新邮箱API配置
    account.email_api_config = {
      api_type: api_type || account.email_api_config?.api_type || 'custom',
      api_url: api_url || account.email_api_config?.api_url || '',
      api_method: api_method || account.email_api_config?.api_method || 'GET',
      api_headers: api_headers ? new Map(Object.entries(api_headers)) : (account.email_api_config?.api_headers || new Map()),
      api_params: api_params ? new Map(Object.entries(api_params)) : (account.email_api_config?.api_params || new Map()),
      auth_token: auth_token || account.email_api_config?.auth_token || '',
      api_key: api_key || account.email_api_config?.api_key || '',
      email_address: email_address || account.email_api_config?.email_address || '',
      auto_fetch_enabled: auto_fetch_enabled !== undefined ? auto_fetch_enabled : (account.email_api_config?.auto_fetch_enabled || false),
      code_validity_minutes: code_validity_minutes || account.email_api_config?.code_validity_minutes || 10,
      response_config: response_config || account.email_api_config?.response_config || {
        emails_path: 'data.emails',
        subject_field: 'subject',
        content_field: 'content',
        sender_field: 'from',
        date_field: 'date'
      }
    };

    await account.save();

    // 返回配置（隐藏敏感信息）
    const responseConfig = { ...account.email_api_config.toObject() };
    responseConfig.auth_token = responseConfig.auth_token ? '***masked***' : '';
    responseConfig.api_key = responseConfig.api_key ? '***masked***' : '';

    res.json({
      msg: '邮箱API配置更新成功',
      email_api_config: responseConfig
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/admin/accounts/:id/email-api-config
// @desc    获取账号邮箱API配置
// @access  Private
router.get('/:id/email-api-config', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id).select('email_api_config');

    if (!account) {
      return res.status(404).json({ msg: '账号不存在' });
    }

    // 返回配置（隐藏敏感信息）
    const responseConfig = account.email_api_config ? { ...account.email_api_config.toObject() } : {};
    if (responseConfig.auth_token) {
      responseConfig.auth_token = '***masked***';
    }
    if (responseConfig.api_key) {
      responseConfig.api_key = '***masked***';
    }

    res.json({ email_api_config: responseConfig });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   POST api/admin/accounts/:id/test-email-api
// @desc    测试账号邮箱API连接
// @access  Private
router.post('/:id/test-email-api', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ msg: '账号不存在' });
    }

    if (!account.email_api_config || !account.email_api_config.api_url) {
      return res.status(400).json({ msg: '邮箱API配置不完整' });
    }

    const testResult = await emailApiService.testApiConnection(account.email_api_config);
    
    if (testResult.success) {
      // 同时获取API统计信息
      try {
        const stats = await emailApiService.getApiStats(account.email_api_config);
        res.json({
          success: true,
          message: testResult.message,
          stats: stats,
          sampleData: testResult.sampleData
        });
      } catch (statsError) {
        res.json({
          success: true,
          message: testResult.message,
          stats: null,
          statsError: statsError.message,
          sampleData: testResult.sampleData
        });
      }
    } else {
      res.status(400).json(testResult);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false, 
      message: '测试过程中发生错误: ' + err.message 
    });
  }
});

// @route   DELETE api/admin/accounts/:id/email-api-config
// @desc    清除账号邮箱API配置
// @access  Private
router.delete('/:id/email-api-config', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ msg: '账号不存在' });
    }

    // 清空邮箱API配置
    account.email_api_config = {
      api_type: 'custom',
      api_url: '',
      api_method: 'GET',
      api_headers: new Map(),
      api_params: new Map(),
      auth_token: '',
      api_key: '',
      email_address: '',
      auto_fetch_enabled: false,
      code_validity_minutes: 10,
      response_config: {
        emails_path: 'data.emails',
        subject_field: 'subject',
        content_field: 'content',
        sender_field: 'from',
        date_field: 'date'
      }
    };

    await account.save();

    res.json({ msg: '邮箱API配置已清除' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/admin/accounts/:id/admin-info
// @desc    更新账号管理员信息（备注和采购信息）
// @access  Private
router.put('/:id/admin-info', async (req, res) => {
  const { notes, purchase_info } = req.body;

  try {
    const account = await Account.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ msg: '账号不存在' });
    }

    // 确保admin_info存在
    if (!account.admin_info) {
      account.admin_info = {
        notes: '',
        purchase_info: {
          source_platform: '其他',
          purchase_amount: 0,
          purchase_date: null,
          expiry_type: '月卡',
          custom_expiry_date: null
        }
      };
    }

    // 更新备注
    if (notes !== undefined) {
      account.admin_info.notes = notes;
    }

    // 更新采购信息
    if (purchase_info !== undefined) {
      if (purchase_info.source_platform !== undefined) {
        account.admin_info.purchase_info.source_platform = purchase_info.source_platform;
      }
      if (purchase_info.purchase_amount !== undefined) {
        account.admin_info.purchase_info.purchase_amount = purchase_info.purchase_amount;
      }
      if (purchase_info.purchase_date !== undefined) {
        account.admin_info.purchase_info.purchase_date = purchase_info.purchase_date;
      }
      if (purchase_info.expiry_type !== undefined) {
        account.admin_info.purchase_info.expiry_type = purchase_info.expiry_type;
      }
      if (purchase_info.custom_expiry_date !== undefined) {
        account.admin_info.purchase_info.custom_expiry_date = purchase_info.custom_expiry_date;
      }
    }

    await account.save();

    res.json({ 
      msg: '管理员信息更新成功',
      admin_info: account.admin_info
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/admin/accounts/:id/admin-info
// @desc    获取账号管理员信息
// @access  Private
router.get('/:id/admin-info', async (req, res) => {
  try {
    const account = await Account.findById(req.params.id).select('admin_info');

    if (!account) {
      return res.status(404).json({ msg: '账号不存在' });
    }

    res.json({ 
      admin_info: account.admin_info || {
        notes: '',
        purchase_info: {
          source_platform: '其他',
          purchase_amount: 0,
          purchase_date: null,
          expiry_type: '月卡',
          custom_expiry_date: null
        }
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

module.exports = router; 