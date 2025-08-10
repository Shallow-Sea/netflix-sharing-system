import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Switch, message, Space,
  Popconfirm, Tag, Typography, Card, Tooltip, Checkbox, Row, Col, Descriptions
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined, UserOutlined,
  CrownOutlined, EyeOutlined, SettingOutlined, LockOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  // 获取当前用户信息
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/auth', {
        headers: { 'x-auth-token': token }
      });
      setCurrentUser(res.data);
      console.log('当前用户信息:', res.data); // 调试用
    } catch (err) {
      console.error('获取当前用户信息失败:', err);
      message.error('获取用户信息失败，请重新登录');
    }
  };

  // 获取所有管理员
  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/admins', {
        headers: { 'x-auth-token': token }
      });
      setAdmins(res.data);
      setLoading(false);
    } catch (err) {
      console.error('获取管理员失败:', err);
      if (err.response?.status === 403) {
        console.log('当前用户权限不足，可能需要超级管理员权限');
        setAdmins([]);
        setLoading(false);
        // 不显示错误消息，而是在UI中显示权限提示
      } else {
        message.error('获取管理员失败: ' + (err.response?.data?.msg || err.message));
        setLoading(false);
      }
    }
  };

  // 获取角色列表
  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/admins/roles', {
        headers: { 'x-auth-token': token }
      });
      setRoles(res.data);
    } catch (err) {
      console.error('获取角色失败:', err);
    }
  };

  // 获取权限配置
  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/admins/permissions', {
        headers: { 'x-auth-token': token }
      });
      setPermissions(res.data);
    } catch (err) {
      console.error('获取权限配置失败:', err);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchAdmins();
    fetchRoles();
    fetchPermissions();
  }, []);

  // 角色显示组件
  const RoleTag = ({ role }) => {
    const roleColors = {
      super_admin: 'red',
      admin: 'blue',
      operator: 'green',
      viewer: 'default'
    };

    const roleIcons = {
      super_admin: <CrownOutlined />,
      admin: <UserOutlined />,
      operator: <SettingOutlined />,
      viewer: <EyeOutlined />
    };

    const roleNames = {
      super_admin: '超级管理员',
      admin: '管理员',
      operator: '操作员',
      viewer: '查看者'
    };

    return (
      <Tag color={roleColors[role]} icon={roleIcons[role]}>
        {roleNames[role]}
      </Tag>
    );
  };

  // 添加或更新管理员
  const handleAddOrUpdateAdmin = async (values) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { 'x-auth-token': token }
      };

      const adminData = {
        username: values.username,
        display_name: values.display_name || '',
        role: values.role,
        status: values.status ? 1 : 0
      };

      // 如果是创建新管理员，需要密码
      if (!editingAdminId) {
        adminData.password = values.password;
      }

      // 如果选择了自定义权限，添加权限配置
      if (values.useCustomPermissions) {
        adminData.permissions = {};
        Object.keys(permissions).forEach(module => {
          adminData.permissions[module] = {};
          Object.keys(permissions[module].actions).forEach(action => {
            adminData.permissions[module][action] = values[`${module}_${action}`] || false;
          });
        });
      }

      if (editingAdminId) {
        // 更新管理员
        await axios.put(`/api/admin/admins/${editingAdminId}`, adminData, config);
        message.success('管理员更新成功');
      } else {
        // 创建管理员
        await axios.post('/api/admin/admins', adminData, config);
        message.success('管理员创建成功');
      }

      setModalVisible(false);
      form.resetFields();
      fetchAdmins();
      setEditingAdminId(null);
    } catch (err) {
      console.error('操作失败:', err);
      message.error('操作失败: ' + (err.response?.data?.msg || err.message));
    }
  };

  // 修改密码
  const handleChangePassword = async (values) => {
    try {
      const token = localStorage.getItem('token');
      const { old_password, new_password } = values;

      await axios.put(`/api/admin/admins/${editingAdminId}/password`, {
        old_password,
        new_password
      }, {
        headers: { 'x-auth-token': token }
      });

      message.success('密码修改成功');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
      setEditingAdminId(null);
    } catch (err) {
      console.error('密码修改失败:', err);
      message.error('密码修改失败: ' + (err.response?.data?.msg || err.message));
    }
  };

  // 删除管理员
  const handleDeleteAdmin = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/admins/${id}`, {
        headers: { 'x-auth-token': token }
      });
      message.success('管理员删除成功');
      fetchAdmins();
    } catch (err) {
      console.error('删除失败:', err);
      message.error('删除失败: ' + (err.response?.data?.msg || err.message));
    }
  };

  // 打开编辑模态框
  const showEditModal = (admin) => {
    setEditingAdminId(admin._id);
    
    const initialValues = {
      username: admin.username,
      display_name: admin.display_name || '',
      role: admin.role,
      status: admin.status === 1,
      useCustomPermissions: false
    };

    // 如果用户有自定义权限，设置权限值
    if (admin.permissions) {
      Object.keys(permissions).forEach(module => {
        if (admin.permissions[module]) {
          Object.keys(permissions[module].actions).forEach(action => {
            if (admin.permissions[module][action] !== undefined) {
              initialValues[`${module}_${action}`] = admin.permissions[module][action];
            }
          });
        }
      });
    }

    form.setFieldsValue(initialValues);
    setModalVisible(true);
  };

  // 打开密码修改模态框
  const showPasswordModal = (admin) => {
    setEditingAdminId(admin._id);
    passwordForm.resetFields();
    setPasswordModalVisible(true);
  };

  // 表格列配置
  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '显示名称',
      dataIndex: 'display_name',
      key: 'display_name',
      width: 120,
      render: (text) => text || '-'
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role) => <RoleTag role={role} />
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => (
        <Tag color={status === 1 ? 'green' : 'red'}>
          {status === 1 ? '启用' : '禁用'}
        </Tag>
      )
    },
    {
      title: '最后登录',
      dataIndex: 'last_login',
      key: 'last_login',
      width: 160,
      render: (date) => date ? moment(date).format('YYYY-MM-DD HH:mm:ss') : '从未登录'
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date) => moment(date).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '创建者',
      dataIndex: 'created_by',
      key: 'created_by',
      width: 100,
      render: (creator) => creator ? (creator.display_name || creator.username) : '系统'
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => showEditModal(record)}
              disabled={!currentUser || 
                (currentUser.role !== 'super_admin' && 
                 (!currentUser.permissions?.admin_management?.edit))}
            />
          </Tooltip>
          <Tooltip title="修改密码">
            <Button
              icon={<KeyOutlined />}
              size="small"
              onClick={() => showPasswordModal(record)}
              disabled={!currentUser || 
                (record._id !== currentUser._id && 
                 currentUser.role !== 'super_admin' && 
                 (!currentUser.permissions?.admin_management?.edit))}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除此管理员吗？"
            onConfirm={() => handleDeleteAdmin(record._id)}
            disabled={record._id === currentUser?._id}
          >
            <Tooltip title={record._id === currentUser?._id ? "不能删除自己" : "删除"}>
              <Button
                icon={<DeleteOutlined />}
                size="small"
                danger
                disabled={record._id === currentUser?._id || 
                  !currentUser || 
                  (currentUser.role !== 'super_admin' && 
                   (!currentUser.permissions?.admin_management?.delete))}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 权限配置表单
  const renderPermissionsForm = () => {
    return (
      <div style={{ marginTop: 16 }}>
        <Form.Item
          name="useCustomPermissions"
          valuePropName="checked"
        >
          <Checkbox>使用自定义权限配置</Checkbox>
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => prevValues.useCustomPermissions !== currentValues.useCustomPermissions}
        >
          {({ getFieldValue }) =>
            getFieldValue('useCustomPermissions') ? (
              <Card title="权限配置" size="small">
                {Object.keys(permissions).map(module => (
                  <div key={module} style={{ marginBottom: 16 }}>
                    <Title level={5}>{permissions[module].label}</Title>
                    <Row gutter={16}>
                      {Object.keys(permissions[module].actions).map(action => (
                        <Col span={6} key={action}>
                          <Form.Item
                            name={`${module}_${action}`}
                            valuePropName="checked"
                          >
                            <Checkbox>{permissions[module].actions[action]}</Checkbox>
                          </Form.Item>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ))}
              </Card>
            ) : null
          }
        </Form.Item>
      </div>
    );
  };

  // 检查是否有管理员管理权限
  const hasAdminManagementPermission = currentUser && (
    currentUser.role === 'super_admin' || 
    currentUser.permissions?.admin_management?.view
  );

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={4}>管理员管理</Title>
        {hasAdminManagementPermission && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingAdminId(null);
              form.resetFields();
              setModalVisible(true);
            }}
            disabled={!currentUser || 
              (currentUser.role !== 'super_admin' && 
               (!currentUser.permissions?.admin_management?.create))}
          >
            添加管理员
          </Button>
        )}
      </div>

      {!hasAdminManagementPermission && currentUser && (
        <div style={{ 
          textAlign: 'center', 
          padding: '50px 20px',
          background: '#fafafa',
          border: '1px dashed #d9d9d9',
          borderRadius: '6px'
        }}>
          <LockOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '16px' }} />
          <Title level={3} type="secondary">权限不足</Title>
          <Text type="secondary">
            您当前的角色是 <Tag color="blue">{currentUser.role}</Tag>，无法访问管理员管理功能。
            <br />
            只有超级管理员可以管理其他管理员账号。
          </Text>
        </div>
      )}

      {!currentUser && (
        <div style={{ 
          textAlign: 'center', 
          padding: '50px 20px'
        }}>
          <Text type="secondary">正在获取用户信息...</Text>
        </div>
      )}

      {hasAdminManagementPermission && (
        <Table
          columns={columns}
          dataSource={admins}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
          size="middle"
          bordered={false}
          showSorterTooltip={false}
        />
      )}

      {/* 添加/编辑管理员模态框 */}
      <Modal
        title={editingAdminId ? '编辑管理员' : '添加管理员'}
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingAdminId(null);
        }}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddOrUpdateAdmin}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[{ required: true, message: '请输入用户名!' }]}
              >
                <Input 
                  placeholder="请输入用户名" 
                  disabled={!!editingAdminId}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="display_name"
                label="显示名称"
              >
                <Input placeholder="请输入显示名称（可选）" />
              </Form.Item>
            </Col>
          </Row>

          {!editingAdminId && (
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码!' }]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="角色"
                rules={[{ required: true, message: '请选择角色!' }]}
              >
                <Select placeholder="请选择角色">
                  {roles.map(role => (
                    <Option 
                      key={role.value} 
                      value={role.value}
                      disabled={role.value === 'super_admin' && currentUser?.role !== 'super_admin'}
                    >
                      <Space>
                        <RoleTag role={role.value} />
                        <span>{role.description}</span>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch 
                  checkedChildren="启用" 
                  unCheckedChildren="禁用"
                  disabled={editingAdminId === currentUser?._id}
                />
              </Form.Item>
            </Col>
          </Row>

          {currentUser?.role === 'super_admin' && renderPermissionsForm()}
        </Form>
      </Modal>

      {/* 修改密码模态框 */}
      <Modal
        title="修改密码"
        open={passwordModalVisible}
        onOk={() => passwordForm.submit()}
        onCancel={() => {
          setPasswordModalVisible(false);
          passwordForm.resetFields();
          setEditingAdminId(null);
        }}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          {editingAdminId === currentUser?._id && (
            <Form.Item
              name="old_password"
              label="原密码"
              rules={[{ required: true, message: '请输入原密码!' }]}
            >
              <Input.Password placeholder="请输入原密码" />
            </Form.Item>
          )}
          
          <Form.Item
            name="new_password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码!' },
              { min: 6, message: '密码至少6位!' }
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            label="确认新密码"
            dependencies={['new_password']}
            rules={[
              { required: true, message: '请确认新密码!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致!'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminManagement;
