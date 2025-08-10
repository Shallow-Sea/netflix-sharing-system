const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const { authMiddleware } = require('../middleware/auth');

// 权限验证中间件
const requirePermission = (module, action) => {
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
      if (!admin.permissions || !admin.permissions[module] || !admin.permissions[module][action]) {
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

// @route   GET api/admin/admins
// @desc    获取所有管理员
// @access  Private (需要admin_management.view权限)
router.get('/', requirePermission('admin_management', 'view'), async (req, res) => {
  try {
    const admins = await Admin.find()
      .select('-password')
      .populate('created_by', 'username display_name')
      .sort({ created_at: -1 });
    
    res.json(admins);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   POST api/admin/admins
// @desc    创建新管理员
// @access  Private (需要admin_management.create权限)
router.post('/', requirePermission('admin_management', 'create'), async (req, res) => {
  const { username, password, display_name, role, permissions } = req.body;

  try {
    // 检查管理员是否已存在
    let existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ msg: '用户名已存在' });
    }

    // 检查权限：只有超级管理员可以创建超级管理员
    if (role === 'super_admin' && req.currentAdmin.role !== 'super_admin') {
      return res.status(403).json({ msg: '权限不足，无法创建超级管理员' });
    }

    // 创建新管理员
    const admin = new Admin({
      username,
      password,
      display_name: display_name || '',
      role: role || 'admin',
      created_by: req.admin.id,
      status: 1
    });

    // 如果提供了自定义权限配置，应用它（仅超级管理员可以设置）
    if (permissions && req.currentAdmin.role === 'super_admin') {
      admin.permissions = permissions;
    }

    // 加密密码
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(password, salt);

    await admin.save();

    // 返回不包含密码的管理员信息
    const adminResponse = await Admin.findById(admin._id)
      .select('-password')
      .populate('created_by', 'username display_name');

    res.json(adminResponse);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/admin/admins/:id
// @desc    更新管理员信息
// @access  Private (需要admin_management.edit权限)
router.put('/:id', requirePermission('admin_management', 'edit'), async (req, res) => {
  const { display_name, role, permissions, status } = req.body;

  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ msg: '管理员不存在' });
    }

    // 防止管理员修改自己的权限或禁用自己
    if (admin._id.toString() === req.admin.id) {
      if (role && role !== admin.role) {
        return res.status(400).json({ msg: '不能修改自己的角色' });
      }
      if (status !== undefined && status !== admin.status) {
        return res.status(400).json({ msg: '不能修改自己的状态' });
      }
    }

    // 检查权限：只有超级管理员可以修改超级管理员或设置为超级管理员
    if ((admin.role === 'super_admin' || role === 'super_admin') && req.currentAdmin.role !== 'super_admin') {
      return res.status(403).json({ msg: '权限不足，无法修改超级管理员' });
    }

    // 更新字段
    const updateData = {};
    if (display_name !== undefined) updateData.display_name = display_name;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (permissions !== undefined && req.currentAdmin.role === 'super_admin') {
      updateData.permissions = permissions;
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password').populate('created_by', 'username display_name');

    res.json(updatedAdmin);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/admin/admins/:id/password
// @desc    修改管理员密码
// @access  Private (管理员可以修改自己的密码，或需要admin_management.edit权限修改他人密码)
router.put('/:id/password', authMiddleware, async (req, res) => {
  const { old_password, new_password } = req.body;

  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ msg: '管理员不存在' });
    }

    const isOwnAccount = admin._id.toString() === req.admin.id;

    // 如果不是修改自己的密码，需要检查权限
    if (!isOwnAccount) {
      const currentAdmin = await Admin.findById(req.admin.id);
      if (!currentAdmin || 
          currentAdmin.role !== 'super_admin' && 
          (!currentAdmin.permissions || !currentAdmin.permissions.admin_management || !currentAdmin.permissions.admin_management.edit)) {
        return res.status(403).json({ msg: '权限不足' });
      }
    }

    // 如果是修改自己的密码，需要验证原密码
    if (isOwnAccount) {
      if (!old_password) {
        return res.status(400).json({ msg: '请提供原密码' });
      }

      const isMatch = await bcrypt.compare(old_password, admin.password);
      if (!isMatch) {
        return res.status(400).json({ msg: '原密码错误' });
      }
    }

    // 加密新密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    await Admin.findByIdAndUpdate(req.params.id, { password: hashedPassword });

    res.json({ msg: '密码修改成功' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   DELETE api/admin/admins/:id
// @desc    删除管理员
// @access  Private (需要admin_management.delete权限)
router.delete('/:id', requirePermission('admin_management', 'delete'), async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ msg: '管理员不存在' });
    }

    // 防止删除自己
    if (admin._id.toString() === req.admin.id) {
      return res.status(400).json({ msg: '不能删除自己的账号' });
    }

    // 检查权限：只有超级管理员可以删除超级管理员
    if (admin.role === 'super_admin' && req.currentAdmin.role !== 'super_admin') {
      return res.status(403).json({ msg: '权限不足，无法删除超级管理员' });
    }

    // 检查是否是系统中唯一的超级管理员
    if (admin.role === 'super_admin') {
      const superAdminCount = await Admin.countDocuments({ role: 'super_admin', status: 1 });
      if (superAdminCount <= 1) {
        return res.status(400).json({ msg: '不能删除系统中唯一的超级管理员' });
      }
    }

    await Admin.findByIdAndRemove(req.params.id);
    res.json({ msg: '管理员删除成功' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/admin/admins/roles
// @desc    获取所有可用角色
// @access  Private
router.get('/roles', authMiddleware, (req, res) => {
  const roles = [
    { value: 'viewer', label: '查看者', description: '只能查看数据，无法进行任何修改操作' },
    { value: 'operator', label: '操作员', description: '可以管理账号和分享页，但不能管理公告和系统设置' },
    { value: 'admin', label: '管理员', description: '可以管理账号、分享页和公告，但不能管理其他管理员' },
    { value: 'super_admin', label: '超级管理员', description: '拥有系统全部权限，包括管理其他管理员' }
  ];

  res.json(roles);
});

// @route   GET api/admin/admins/permissions
// @desc    获取权限配置模板
// @access  Private
router.get('/permissions', authMiddleware, (req, res) => {
  const permissions = {
    accounts: {
      label: '账号管理',
      actions: {
        view: '查看账号',
        create: '创建账号',
        edit: '编辑账号',
        delete: '删除账号'
      }
    },
    share_pages: {
      label: '分享页管理',
      actions: {
        view: '查看分享页',
        create: '创建分享页',
        edit: '编辑分享页',
        delete: '删除分享页'
      }
    },
    announcements: {
      label: '公告管理',
      actions: {
        view: '查看公告',
        create: '创建公告',
        edit: '编辑公告',
        delete: '删除公告'
      }
    },
    admin_management: {
      label: '管理员管理',
      actions: {
        view: '查看管理员',
        create: '创建管理员',
        edit: '编辑管理员',
        delete: '删除管理员'
      }
    },
    system_settings: {
      label: '系统设置',
      actions: {
        view: '查看设置',
        edit: '修改设置'
      }
    }
  };

  res.json(permissions);
});

module.exports = router;
