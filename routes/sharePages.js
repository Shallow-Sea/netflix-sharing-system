const express = require('express');
const router = express.Router();
const SharePage = require('../models/SharePage');
const Account = require('../models/Account');
const Admin = require('../models/Admin');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const XLSX = require('xlsx');

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
      if (!admin.permissions || !admin.permissions.share_pages || !admin.permissions.share_pages[action]) {
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

// 计算不同类型的有效期天数
const getDurationDays = (durationType) => {
  switch (durationType) {
    case 'day': return 1;
    case 'week': return 7;
    case 'month': return 30;
    case 'quarter': return 90;
    case 'year': return 365;
    default: return 30;
  }
};

// @route   GET api/admin/share-pages
// @desc    获取所有分享页
// @access  Private
router.get('/', async (req, res) => {
  try {
    const sharePages = await SharePage.find().populate('account_id', 'username profiles status');
    
    // 处理响应格式以与前端保持一致
    const formattedPages = sharePages.map(page => {
      const { _id, code, account_id, profile_position, is_activated, activated_at, 
              duration_type, duration_days, start_time, end_time, status, access_password, 
              created_at, updated_at } = page;
      
      // 找到对应的车位信息
      let profileInfo = null;
      if (account_id && account_id.profiles) {
        profileInfo = account_id.profiles.find(p => p.position === profile_position) || null;
      }
      
      return {
        id: _id,
        code,
        account_id: account_id ? account_id._id : null,
        account: account_id ? {
          ...account_id._doc,
          currentProfile: profileInfo
        } : null,
        profile_position,
        is_activated,
        activated_at,
        duration_type,
        duration_days,
        start_time,
        end_time,
        status,
        access_password,
        created_at,
        updated_at
      };
    });
    
    res.json(formattedPages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   POST api/admin/share-pages
// @desc    添加分享页
// @access  Private
router.post('/', async (req, res) => {
  const { 
    account_id, 
    profile_position, 
    duration_type, 
    start_time, 
    end_time,
    access_password 
  } = req.body;

  try {
    // 生成唯一代码
    const code = uuidv4().substring(0, 8);
    
    // 计算有效期天数
    const duration_days = getDurationDays(duration_type || 'month');

    const newSharePage = new SharePage({
      code,
      account_id,
      profile_position: profile_position || 1,
      is_activated: false,
      duration_type: duration_type || 'month',
      duration_days,
      start_time,
      end_time,
      status: 1,
      access_password: access_password || ''
    });

    await newSharePage.save();
    
    // 获取完整信息
    const sharePage = await SharePage.findById(newSharePage._id)
      .populate('account_id', 'username profiles status');
    
    // 格式化响应
    const profileInfo = sharePage.account_id && sharePage.account_id.profiles ? 
      sharePage.account_id.profiles.find(p => p.position === sharePage.profile_position) || null : null;
    
    const formattedPage = {
      id: sharePage._id,
      code: sharePage.code,
      account_id: sharePage.account_id ? sharePage.account_id._id : null,
      account: sharePage.account_id ? {
        ...sharePage.account_id._doc,
        currentProfile: profileInfo
      } : null,
      profile_position: sharePage.profile_position,
      is_activated: sharePage.is_activated,
      activated_at: sharePage.activated_at,
      duration_type: sharePage.duration_type,
      duration_days: sharePage.duration_days,
      start_time: sharePage.start_time,
      end_time: sharePage.end_time,
      status: sharePage.status,
      access_password: sharePage.access_password,
      created_at: sharePage.created_at,
      updated_at: sharePage.updated_at
    };

    res.json(formattedPage);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   POST api/admin/share-pages/batch
// @desc    批量生成分享页
// @access  Private
router.post('/batch', async (req, res) => {
  const { 
    count, 
    account_ids, 
    random_account, 
    random_profile,
    duration_type, 
    start_time, 
    end_time,
    access_password 
  } = req.body;

  if (!count || count < 1 || count > 100) {
    return res.status(400).json({ msg: '请提供有效的生成数量（1-100）' });
  }

  try {
    // 如果指定了账号列表，或者需要随机选择账号
    let availableAccounts = [];
    if (random_account || (account_ids && account_ids.length > 0)) {
      // 获取所有启用的账号
      const query = random_account ? { status: 1 } : { _id: { $in: account_ids }, status: 1 };
      availableAccounts = await Account.find(query);
      
      if (availableAccounts.length === 0) {
        return res.status(400).json({ msg: '没有可用的账号' });
      }
    }

    const newSharePages = [];
    const duration_days = getDurationDays(duration_type || 'month');

    // 批量生成分享页
    for (let i = 0; i < count; i++) {
      // 生成唯一代码
      const code = uuidv4().substring(0, 8);
      
      // 随机选择账号和车位
      let selectedAccount = null;
      let selectedProfilePosition = 1;
      
      if (availableAccounts.length > 0) {
        selectedAccount = availableAccounts[Math.floor(Math.random() * availableAccounts.length)];
        
        // 如果需要随机选择车位
        if (random_profile && selectedAccount.profiles && selectedAccount.profiles.length > 0) {
          const activeProfiles = selectedAccount.profiles.filter(p => p.status === 1);
          if (activeProfiles.length > 0) {
            const randomProfile = activeProfiles[Math.floor(Math.random() * activeProfiles.length)];
            selectedProfilePosition = randomProfile.position;
          }
        }
      }

      const newSharePage = new SharePage({
        code,
        account_id: selectedAccount ? selectedAccount._id : null,
        profile_position: selectedProfilePosition,
        is_activated: false,
        duration_type: duration_type || 'month',
        duration_days,
        start_time,
        end_time,
        status: 1,
        access_password: access_password || ''
      });

      await newSharePage.save();
      newSharePages.push(newSharePage);
    }
    
    res.json({ 
      msg: `成功生成 ${newSharePages.length} 个分享页`,
      count: newSharePages.length,
      sharePages: newSharePages
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/admin/share-pages/batch
// @desc    批量修改分享页
// @access  Private
router.put('/batch', async (req, res) => {
  const { sharePages } = req.body;

  try {
    const updatedSharePages = [];

    for (let sharePage of sharePages) {
      const { 
        id, 
        account_id, 
        profile_position, 
        is_activated, 
        duration_type, 
        start_time, 
        end_time, 
        status,
        access_password
      } = sharePage;
      
      // 如果修改了有效期类型，重新计算天数
      let updateData = { 
        account_id, 
        profile_position, 
        is_activated, 
        start_time, 
        end_time, 
        status,
        access_password
      };
      
      if (duration_type) {
        updateData.duration_type = duration_type;
        updateData.duration_days = getDurationDays(duration_type);
      }
      
      const updatedSharePage = await SharePage.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      ).populate('account_id', 'username profiles status');

      if (updatedSharePage) {
        // 格式化响应
        const profileInfo = updatedSharePage.account_id && updatedSharePage.account_id.profiles ? 
          updatedSharePage.account_id.profiles.find(p => p.position === updatedSharePage.profile_position) || null : null;
        
        const formattedPage = {
          id: updatedSharePage._id,
          code: updatedSharePage.code,
          account_id: updatedSharePage.account_id ? updatedSharePage.account_id._id : null,
          account: updatedSharePage.account_id ? {
            ...updatedSharePage.account_id._doc,
            currentProfile: profileInfo
          } : null,
          profile_position: updatedSharePage.profile_position,
          is_activated: updatedSharePage.is_activated,
          activated_at: updatedSharePage.activated_at,
          duration_type: updatedSharePage.duration_type,
          duration_days: updatedSharePage.duration_days,
          start_time: updatedSharePage.start_time,
          end_time: updatedSharePage.end_time,
          status: updatedSharePage.status,
          access_password: updatedSharePage.access_password,
          created_at: updatedSharePage.created_at,
          updated_at: updatedSharePage.updated_at
        };
        
        updatedSharePages.push(formattedPage);
      }
    }

    res.json(updatedSharePages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   DELETE api/admin/share-pages/:id
// @desc    删除分享页
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const deletedSharePage = await SharePage.findByIdAndRemove(req.params.id);

    if (deletedSharePage) {
      res.json({ msg: '分享页删除成功' });
    } else {
      res.status(404).json({ msg: '分享页不存在' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   DELETE api/admin/share-pages
// @desc    批量删除分享页
// @access  Private
router.delete('/', async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ msg: '请提供要删除的分享页ID' });
  }

  try {
    const result = await SharePage.deleteMany({ _id: { $in: ids } });
    
    res.json({ 
      msg: `已删除 ${result.deletedCount} 个分享页`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/admin/share-pages/:id/account
// @desc    修改分享页账号设置
// @access  Private
router.put('/:id/account', async (req, res) => {
  const { account_id, profile_position } = req.body;

  try {
    const updatedSharePage = await SharePage.findByIdAndUpdate(
      req.params.id,
      { 
        account_id,
        profile_position: profile_position || 1
      },
      { new: true }
    ).populate('account_id', 'username profiles status');

    if (updatedSharePage) {
      // 格式化响应
      const profileInfo = updatedSharePage.account_id && updatedSharePage.account_id.profiles ? 
        updatedSharePage.account_id.profiles.find(p => p.position === updatedSharePage.profile_position) || null : null;
      
      const formattedPage = {
        id: updatedSharePage._id,
        code: updatedSharePage.code,
        account_id: updatedSharePage.account_id ? updatedSharePage.account_id._id : null,
        account: updatedSharePage.account_id ? {
          ...updatedSharePage.account_id._doc,
          currentProfile: profileInfo
        } : null,
        profile_position: updatedSharePage.profile_position,
        is_activated: updatedSharePage.is_activated,
        activated_at: updatedSharePage.activated_at,
        duration_type: updatedSharePage.duration_type,
        duration_days: updatedSharePage.duration_days,
        start_time: updatedSharePage.start_time,
        end_time: updatedSharePage.end_time,
        status: updatedSharePage.status,
        access_password: updatedSharePage.access_password,
        created_at: updatedSharePage.created_at,
        updated_at: updatedSharePage.updated_at
      };
      
      res.json(formattedPage);
    } else {
      res.status(404).json({ msg: '分享页不存在' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/admin/share-pages/:id/start-time
// @desc    设置分享页激活时间
// @access  Private
router.put('/:id/start-time', async (req, res) => {
  const { start_time } = req.body;

  try {
    const updatedSharePage = await SharePage.findByIdAndUpdate(
      req.params.id,
      { start_time },
      { new: true }
    ).populate('account_id', 'username profiles status');

    if (updatedSharePage) {
      // 格式化响应
      const profileInfo = updatedSharePage.account_id && updatedSharePage.account_id.profiles ? 
        updatedSharePage.account_id.profiles.find(p => p.position === updatedSharePage.profile_position) || null : null;
      
      const formattedPage = {
        id: updatedSharePage._id,
        code: updatedSharePage.code,
        account_id: updatedSharePage.account_id ? updatedSharePage.account_id._id : null,
        account: updatedSharePage.account_id ? {
          ...updatedSharePage.account_id._doc,
          currentProfile: profileInfo
        } : null,
        profile_position: updatedSharePage.profile_position,
        is_activated: updatedSharePage.is_activated,
        activated_at: updatedSharePage.activated_at,
        duration_type: updatedSharePage.duration_type,
        duration_days: updatedSharePage.duration_days,
        start_time: updatedSharePage.start_time,
        end_time: updatedSharePage.end_time,
        status: updatedSharePage.status,
        access_password: updatedSharePage.access_password,
        created_at: updatedSharePage.created_at,
        updated_at: updatedSharePage.updated_at
      };
      
      res.json(formattedPage);
    } else {
      res.status(404).json({ msg: '分享页不存在' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/admin/share-pages/:id/end-time
// @desc    设置分享页到期时间
// @access  Private
router.put('/:id/end-time', async (req, res) => {
  const { end_time } = req.body;

  try {
    const updatedSharePage = await SharePage.findByIdAndUpdate(
      req.params.id,
      { end_time },
      { new: true }
    ).populate('account_id', 'username profiles status');

    if (updatedSharePage) {
      // 格式化响应
      const profileInfo = updatedSharePage.account_id && updatedSharePage.account_id.profiles ? 
        updatedSharePage.account_id.profiles.find(p => p.position === updatedSharePage.profile_position) || null : null;
      
      const formattedPage = {
        id: updatedSharePage._id,
        code: updatedSharePage.code,
        account_id: updatedSharePage.account_id ? updatedSharePage.account_id._id : null,
        account: updatedSharePage.account_id ? {
          ...updatedSharePage.account_id._doc,
          currentProfile: profileInfo
        } : null,
        profile_position: updatedSharePage.profile_position,
        is_activated: updatedSharePage.is_activated,
        activated_at: updatedSharePage.activated_at,
        duration_type: updatedSharePage.duration_type,
        duration_days: updatedSharePage.duration_days,
        start_time: updatedSharePage.start_time,
        end_time: updatedSharePage.end_time,
        status: updatedSharePage.status,
        access_password: updatedSharePage.access_password,
        created_at: updatedSharePage.created_at,
        updated_at: updatedSharePage.updated_at
      };
      
      res.json(formattedPage);
    } else {
      res.status(404).json({ msg: '分享页不存在' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/admin/share-pages/:id/activate
// @desc    手动激活分享页
// @access  Private
router.put('/:id/activate', async (req, res) => {
  try {
    const sharePage = await SharePage.findById(req.params.id);
    
    if (!sharePage) {
      return res.status(404).json({ msg: '分享页不存在' });
    }
    
    // 如果已经激活，不做任何操作
    if (sharePage.is_activated) {
      return res.json({ msg: '分享页已经激活', sharePage });
    }
    
    // 激活分享页并设置激活时间
    const now = new Date();
    
    // 计算到期时间（激活时间 + 有效期天数）
    const endTime = moment(now).add(sharePage.duration_days, 'days').toDate();
    
    const updatedSharePage = await SharePage.findByIdAndUpdate(
      req.params.id,
      { 
        is_activated: true, 
        activated_at: now,
        end_time: endTime
      },
      { new: true }
    ).populate('account_id', 'username profiles status');
    
    // 格式化响应
    const profileInfo = updatedSharePage.account_id && updatedSharePage.account_id.profiles ? 
      updatedSharePage.account_id.profiles.find(p => p.position === updatedSharePage.profile_position) || null : null;
    
    const formattedPage = {
      id: updatedSharePage._id,
      code: updatedSharePage.code,
      account_id: updatedSharePage.account_id ? updatedSharePage.account_id._id : null,
      account: updatedSharePage.account_id ? {
        ...updatedSharePage.account_id._doc,
        currentProfile: profileInfo
      } : null,
      profile_position: updatedSharePage.profile_position,
      is_activated: updatedSharePage.is_activated,
      activated_at: updatedSharePage.activated_at,
      duration_type: updatedSharePage.duration_type,
      duration_days: updatedSharePage.duration_days,
      start_time: updatedSharePage.start_time,
      end_time: updatedSharePage.end_time,
      status: updatedSharePage.status,
      access_password: updatedSharePage.access_password,
      created_at: updatedSharePage.created_at,
      updated_at: updatedSharePage.updated_at
    };
    
    res.json({ 
      msg: '分享页激活成功', 
      sharePage: formattedPage
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   POST api/admin/share-pages/export
// @desc    导出分享页链接
// @access  Private
router.post('/export', async (req, res) => {
  const { format, ids, include_inactive = false } = req.body;

  // 验证格式
  if (!format || !['txt', 'excel'].includes(format)) {
    return res.status(400).json({ msg: '请提供有效的导出格式（txt或excel）' });
  }

  try {
    // 构建查询条件
    let query = {};
    if (ids && Array.isArray(ids) && ids.length > 0) {
      query._id = { $in: ids };
    }
    if (!include_inactive) {
      query.status = 1;
    }

    // 获取分享页数据
    const sharePages = await SharePage.find(query)
      .populate('account_id', 'username profiles status')
      .sort({ created_at: -1 });

    if (sharePages.length === 0) {
      return res.status(400).json({ msg: '没有找到要导出的分享页' });
    }

    // 准备导出数据
    const exportData = sharePages.map(page => {
      const baseUrl = req.get('origin') || `${req.protocol}://${req.get('host')}`;
      const shareUrl = `${baseUrl}/share/${page.code}`;
      
      // 找到对应的车位信息
      let profileInfo = null;
      if (page.account_id && page.account_id.profiles) {
        profileInfo = page.account_id.profiles.find(p => p.position === page.profile_position) || null;
      }

      return {
        code: page.code,
        shareUrl: shareUrl,
        account_username: page.account_id ? page.account_id.username : '未绑定',
        profile_position: page.profile_position,
        profile_pin: profileInfo ? profileInfo.pin || '' : '',
        is_activated: page.is_activated ? '已激活' : '未激活',
        activated_at: page.activated_at ? moment(page.activated_at).format('YYYY-MM-DD HH:mm:ss') : '',
        duration_type: page.duration_type,
        duration_days: page.duration_days,
        start_time: page.start_time ? moment(page.start_time).format('YYYY-MM-DD HH:mm:ss') : '',
        end_time: page.end_time ? moment(page.end_time).format('YYYY-MM-DD HH:mm:ss') : '',
        status: page.status === 1 ? '启用' : '停用',
        access_password: page.access_password || '',
        created_at: moment(page.created_at).format('YYYY-MM-DD HH:mm:ss')
      };
    });

    if (format === 'txt') {
      // 生成TXT格式
      let txtContent = '分享页链接导出\n';
      txtContent += '='.repeat(50) + '\n';
      txtContent += `导出时间: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n`;
      txtContent += `总数: ${exportData.length}\n\n`;

      exportData.forEach((item, index) => {
        txtContent += `${index + 1}. 分享码: ${item.code}\n`;
        txtContent += `   链接: ${item.shareUrl}\n`;
        txtContent += `   账号: ${item.account_username}\n`;
        txtContent += `   车位: ${item.profile_position}`;
        if (item.profile_pin) {
          txtContent += ` (PIN: ${item.profile_pin})`;
        }
        txtContent += `\n`;
        txtContent += `   状态: ${item.is_activated}\n`;
        if (item.activated_at) {
          txtContent += `   激活时间: ${item.activated_at}\n`;
        }
        txtContent += `   有效期: ${item.duration_days}天 (${item.duration_type})\n`;
        if (item.end_time) {
          txtContent += `   到期时间: ${item.end_time}\n`;
        }
        if (item.access_password) {
          txtContent += `   访问密码: ${item.access_password}\n`;
        }
        txtContent += `   创建时间: ${item.created_at}\n`;
        txtContent += '-'.repeat(30) + '\n\n';
      });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="share_pages_${moment().format('YYYYMMDD_HHmmss')}.txt"`);
      res.send(txtContent);

    } else if (format === 'excel') {
      // 生成Excel格式
      const worksheet = XLSX.utils.json_to_sheet(exportData.map(item => ({
        '分享码': item.code,
        '分享链接': item.shareUrl,
        '账号用户名': item.account_username,
        '车位位置': item.profile_position,
        '车位PIN': item.profile_pin,
        '激活状态': item.is_activated,
        '激活时间': item.activated_at,
        '有效期类型': item.duration_type,
        '有效期天数': item.duration_days,
        '开始时间': item.start_time,
        '到期时间': item.end_time,
        '页面状态': item.status,
        '访问密码': item.access_password,
        '创建时间': item.created_at
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '分享页列表');

      // 设置列宽
      const colWidths = [
        { wch: 12 }, // 分享码
        { wch: 30 }, // 分享链接
        { wch: 20 }, // 账号用户名
        { wch: 8 },  // 车位位置
        { wch: 8 },  // 车位PIN
        { wch: 8 },  // 激活状态
        { wch: 18 }, // 激活时间
        { wch: 10 }, // 有效期类型
        { wch: 10 }, // 有效期天数
        { wch: 18 }, // 开始时间
        { wch: 18 }, // 到期时间
        { wch: 8 },  // 页面状态
        { wch: 12 }, // 访问密码
        { wch: 18 }  // 创建时间
      ];
      worksheet['!cols'] = colWidths;

      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="share_pages_${moment().format('YYYYMMDD_HHmmss')}.xlsx"`);
      res.send(excelBuffer);
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

module.exports = router; 