import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Switch, InputNumber, message, Space,
  Popconfirm, Select, Tabs, Card, Typography, Tag, Collapse, Tooltip, DatePicker
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined,
  CloseCircleOutlined, KeyOutlined, SettingOutlined, ExclamationCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';
import axios from 'axios';

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { Panel } = Collapse;
const { confirm } = Modal;

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [batchEditModalVisible, setBatchEditModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();
  const [profileForm] = Form.useForm();
  const [emailApiForm] = Form.useForm();
  const [adminInfoForm] = Form.useForm();
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [currentProfilePosition, setCurrentProfilePosition] = useState(null);
  const [emailApiTesting, setEmailApiTesting] = useState(false);
  const [emailApiTestResult, setEmailApiTestResult] = useState(null);

  // 获取所有账号
  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/accounts', {
        headers: { 'x-auth-token': token }
      });
      setAccounts(res.data);
      setLoading(false);
    } catch (err) {
      console.error('获取账号失败:', err);
      message.error('获取账号失败: ' + (err.response?.data?.msg || err.message));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // 添加或更新账号
  const handleAddOrUpdateAccount = async (values) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { 'x-auth-token': token }
      };

      // 处理profiles数据
      const profiles = Array.from({ length: 5 }, (_, i) => ({
        position: i + 1,
        status: values[`profile_${i+1}_status`] ? 1 : 0,
        pin: values[`profile_${i+1}_pin`] || ''
      }));

      const accountData = {
        username: values.username,
        password: values.password,
        profiles,
        status: values.status ? 1 : 0,
        admin_info: {
          notes: values.admin_notes || '',
          purchase_info: {
            source_platform: values.source_platform || '其他',
            purchase_amount: values.purchase_amount || 0,
            purchase_date: values.purchase_date ? values.purchase_date.format('YYYY-MM-DD') : null,
            expiry_type: values.expiry_type || '月卡',
            custom_expiry_date: values.custom_expiry_date ? values.custom_expiry_date.format('YYYY-MM-DD') : null
          }
        }
      };

      if (editingAccountId) {
        // 更新账号
        await axios.put(`/api/admin/accounts/batch`, {
          accounts: [{
            _id: editingAccountId,
            ...accountData
          }]
        }, config);
        message.success('账号更新成功');
      } else {
        // 添加账号
        await axios.post('/api/admin/accounts', accountData, config);
        message.success('账号添加成功');
      }

      setModalVisible(false);
      form.resetFields();
      fetchAccounts();
      setEditingAccountId(null);
    } catch (err) {
      console.error('操作失败:', err);
      message.error('操作失败: ' + (err.response?.data?.msg || err.message));
    }
  };

  // 批量修改账号
  const handleBatchEditAccounts = async (values) => {
    try {
      const token = localStorage.getItem('token');

      // 构建要更新的账号数组
      const accountsToUpdate = selectedAccounts.map(id => {
        const account = accounts.find(acc => acc._id === id);
        const updateData = { _id: id };

        if (values.username) updateData.username = values.username;
        if (values.password) updateData.password = values.password;
        if (values.status !== undefined) updateData.status = values.status;

        return updateData;
      });

      await axios.put('/api/admin/accounts/batch', {
        accounts: accountsToUpdate
      }, {
        headers: { 'x-auth-token': token }
      });

      message.success(`成功修改 ${selectedAccounts.length} 个账号`);
      setBatchEditModalVisible(false);
      batchForm.resetFields();
      fetchAccounts();
      setSelectedAccounts([]);
    } catch (err) {
      console.error('批量修改失败:', err);
      message.error('批量修改失败: ' + (err.response?.data?.msg || err.message));
    }
  };

  // 更改账号状态
  const handleStatusChange = async (id, status) => {
    try {
      const token = localStorage.getItem('token');

      await axios.put(`/api/admin/accounts/${id}/status`, {
        status: status ? 1 : 0
      }, {
        headers: { 'x-auth-token': token }
      });

      message.success(`账号状态已${status ? '启用' : '停用'}`);
      fetchAccounts();
    } catch (err) {
      console.error('状态更新失败:', err);
      message.error('状态更新失败: ' + (err.response?.data?.msg || err.message));
    }
  };

  // 更新车位设置
  const handleUpdateProfile = async (values) => {
    try {
      const token = localStorage.getItem('token');

      await axios.put(`/api/admin/accounts/${currentAccount._id}/profiles/${currentProfilePosition}`, {
        status: values.status ? 1 : 0,
        pin: values.pin
      }, {
        headers: { 'x-auth-token': token }
      });

      message.success('车位设置更新成功');
      setProfileModalVisible(false);
      fetchAccounts();
    } catch (err) {
      console.error('车位设置更新失败:', err);
      message.error('车位设置更新失败: ' + (err.response?.data?.msg || err.message));
    }
  };

  // 获取账号管理员信息
  const fetchAdminInfo = async (accountId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/admin/accounts/${accountId}/admin-info`, {
        headers: { 'x-auth-token': token }
      });
      return res.data.admin_info || {};
    } catch (err) {
      console.error('获取管理员信息失败:', err);
      return {};
    }
  };

  // 打开编辑模态框
  const showEditModal = async (account) => {
    setEditingAccountId(account._id);

    // 设置表单初始值
    const initialValues = {
      username: account.username,
      password: account.password,
      status: account.status === 1
    };

    // 设置每个车位的状态和PIN码
    account.profiles.forEach(profile => {
      initialValues[`profile_${profile.position}_status`] = profile.status === 1;
      initialValues[`profile_${profile.position}_pin`] = profile.pin || '';
    });

    // 加载管理员信息
    const adminInfo = await fetchAdminInfo(account._id);
    if (adminInfo) {
      initialValues.admin_notes = adminInfo.notes || '';
      initialValues.source_platform = adminInfo.purchase_info?.source_platform || '其他';
      initialValues.purchase_amount = adminInfo.purchase_info?.purchase_amount || 0;
      initialValues.purchase_date = adminInfo.purchase_info?.purchase_date ? moment(adminInfo.purchase_info.purchase_date) : null;
      initialValues.expiry_type = adminInfo.purchase_info?.expiry_type || '月卡';
      initialValues.custom_expiry_date = adminInfo.purchase_info?.custom_expiry_date ? moment(adminInfo.purchase_info.custom_expiry_date) : null;
    }

    form.setFieldsValue(initialValues);

    // 加载邮箱API配置
    if (account._id) {
      const emailApiConfig = await fetchEmailApiConfig(account._id);
      const emailApiValues = {
        api_type: emailApiConfig.api_type || 'custom',
        api_url: emailApiConfig.api_url || '',
        api_method: emailApiConfig.api_method || 'GET',
        email_address: emailApiConfig.email_address || '',
        auth_token: emailApiConfig.auth_token === '***masked***' ? '' : emailApiConfig.auth_token || '',
        api_key: emailApiConfig.api_key === '***masked***' ? '' : emailApiConfig.api_key || '',
        auto_fetch_enabled: emailApiConfig.auto_fetch_enabled || false,
        code_validity_minutes: emailApiConfig.code_validity_minutes || 10,
        api_headers: emailApiConfig.api_headers ? 
          (emailApiConfig.api_headers instanceof Map ? 
            JSON.stringify(Object.fromEntries(emailApiConfig.api_headers)) : 
            JSON.stringify(emailApiConfig.api_headers)) : '{}',
        api_params: emailApiConfig.api_params ? 
          (emailApiConfig.api_params instanceof Map ? 
            JSON.stringify(Object.fromEntries(emailApiConfig.api_params)) : 
            JSON.stringify(emailApiConfig.api_params)) : '{}',
        response_config: emailApiConfig.response_config ? JSON.stringify(emailApiConfig.response_config) : JSON.stringify({
          emails_path: 'data.emails',
          subject_field: 'subject',
          content_field: 'content',
          sender_field: 'from',
          date_field: 'date'
        })
      };
      emailApiForm.setFieldsValue(emailApiValues);
      setEmailApiTestResult(null);
    }

    setModalVisible(true);
  };

  // 打开车位设置模态框
  const showProfileModal = (account, position) => {
    setCurrentAccount(account);
    setCurrentProfilePosition(position);

    const profile = account.profiles.find(p => p.position === position);

    profileForm.setFieldsValue({
      status: profile ? profile.status === 1 : true,
      pin: profile ? profile.pin : ''
    });

    setProfileModalVisible(true);
  };

  // 获取邮箱API配置
  const fetchEmailApiConfig = async (accountId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/admin/accounts/${accountId}/email-api-config`, {
        headers: { 'x-auth-token': token }
      });
      return res.data.email_api_config || {};
    } catch (err) {
      console.error('获取邮箱API配置失败:', err);
      return {};
    }
  };

  // 保存邮箱API配置
  const saveEmailApiConfig = async (values) => {
    try {
      const token = localStorage.getItem('token');
      
      // 处理api_headers和api_params为对象格式
      const parseJsonSafely = (jsonString, defaultValue = {}) => {
        try {
          return jsonString && jsonString.trim() ? JSON.parse(jsonString) : defaultValue;
        } catch (error) {
          console.error('JSON解析失败:', error);
          return defaultValue;
        }
      };

      const configData = {
        ...values,
        api_headers: parseJsonSafely(values.api_headers, {}),
        api_params: parseJsonSafely(values.api_params, {}),
        response_config: parseJsonSafely(values.response_config, {
          emails_path: 'data.emails',
          subject_field: 'subject',
          content_field: 'content',
          sender_field: 'from',
          date_field: 'date'
        })
      };

      await axios.put(`/api/admin/accounts/${editingAccountId}/email-api-config`, configData, {
        headers: { 'x-auth-token': token }
      });

      message.success('邮箱API配置保存成功');
      setEmailApiTestResult(null);
    } catch (err) {
      console.error('保存邮箱API配置失败:', err);
      message.error('保存失败: ' + (err.response?.data?.msg || err.message));
    }
  };

  // 测试邮箱API连接
  const testEmailApi = async () => {
    try {
      setEmailApiTesting(true);
      setEmailApiTestResult(null);
      
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/admin/accounts/${editingAccountId}/test-email-api`, {}, {
        headers: { 'x-auth-token': token }
      });

      setEmailApiTestResult({
        success: true,
        message: res.data.message,
        stats: res.data.stats,
        sampleData: res.data.sampleData
      });
      message.success('API连接测试成功');
    } catch (err) {
      console.error('API连接测试失败:', err);
      setEmailApiTestResult({
        success: false,
        message: err.response?.data?.message || err.message
      });
      message.error('测试失败: ' + (err.response?.data?.message || err.message));
    } finally {
      setEmailApiTesting(false);
    }
  };

  // 清除邮箱API配置
  const clearEmailApiConfig = () => {
    confirm({
      title: '确认清除邮箱API配置？',
      content: '此操作将清除所有邮箱API配置信息',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`/api/admin/accounts/${editingAccountId}/email-api-config`, {
            headers: { 'x-auth-token': token }
          });
          message.success('邮箱API配置已清除');
          emailApiForm.resetFields();
          setEmailApiTestResult(null);
        } catch (err) {
          console.error('清除配置失败:', err);
          message.error('清除失败: ' + (err.response?.data?.msg || err.message));
        }
      }
    });
  };

  // 批量删除账号
  const handleBatchDelete = () => {
    if (selectedAccounts.length === 0) {
      message.warning('请选择要删除的账号');
      return;
    }

    confirm({
      title: '确定要删除选中的账号吗？',
      icon: <ExclamationCircleOutlined />,
      content: '此操作不可恢复，相关的分享页也可能受到影响。',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const token = localStorage.getItem('token');

          await axios.delete('/api/admin/accounts', {
            headers: { 'x-auth-token': token },
            data: {
              ids: selectedAccounts,
              force: true // 强制删除，相关分享页的账号ID会被设为null
            }
          });

          message.success(`成功删除 ${selectedAccounts.length} 个账号`);
          fetchAccounts();
          setSelectedAccounts([]);
        } catch (err) {
          console.error('批量删除失败:', err);
          message.error('批量删除失败: ' + (err.response?.data?.msg || err.message));
        }
      }
    });
  };

  // 表格列配置
  const columns = [
    {
      title: 'ID',
      dataIndex: '_id',
      key: '_id',
      width: 220,
      ellipsis: true
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '密码',
      dataIndex: 'password',
      key: 'password',
    },
    {
      title: '车位状态',
      key: 'profiles',
      render: (_, record) => (
        <Space>
          {record.profiles.map(profile => (
            <Tooltip
              key={profile.position}
              title={`${profile.status === 1 ? '启用' : '停用'}${profile.pin ? ' | PIN: ' + profile.pin : ''}`}
            >
              <Tag
                color={profile.status === 1 ? 'green' : 'red'}
                style={{ cursor: 'pointer' }}
                onClick={() => showProfileModal(record, profile.position)}
              >
                {profile.position}{profile.pin && <KeyOutlined style={{ marginLeft: 4 }} />}
              </Tag>
            </Tooltip>
          ))}
        </Space>
      )
    },
    {
      title: '备注',
      key: 'admin_info',
      width: 200,
      render: (_, record) => {
        const adminInfo = record.admin_info;
        if (!adminInfo || (!adminInfo.notes && !adminInfo.purchase_info?.source_platform)) {
          return <Text type="secondary">无备注</Text>;
        }
        
        return (
          <div>
            {adminInfo.notes && (
              <div>
                <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 4 }} />
                <Text ellipsis style={{ maxWidth: 120 }}>{adminInfo.notes}</Text>
              </div>
            )}
            {adminInfo.purchase_info?.source_platform && adminInfo.purchase_info.source_platform !== '其他' && (
              <div style={{ marginTop: 4 }}>
                <Tag size="small" color="blue">
                  {adminInfo.purchase_info.source_platform}
                </Tag>
                {adminInfo.purchase_info.purchase_amount > 0 && (
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    ¥{adminInfo.purchase_info.purchase_amount}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <Switch
          checkedChildren={<CheckCircleOutlined />}
          unCheckedChildren={<CloseCircleOutlined />}
          checked={status === 1}
          onChange={(checked) => handleStatusChange(record._id, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
            type="primary"
            size="small"
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此账号吗？"
            onConfirm={() => {
              confirm({
                title: '确定要删除此账号吗？',
                icon: <ExclamationCircleOutlined />,
                content: '此操作不可恢复，相关的分享页也可能受到影响。',
                okText: '确定',
                okType: 'danger',
                cancelText: '取消',
                onOk: async () => {
                  try {
                    await axios.delete(`/api/admin/accounts/${record._id}`, {
                      headers: { 'x-auth-token': localStorage.getItem('token') },
                      data: { force: true }
                    });
                    message.success('账号删除成功');
                    fetchAccounts();
                  } catch (err) {
                    if (err.response?.status === 400) {
                      message.error('该账号有关联的分享页，已强制删除');
                      fetchAccounts();
                    } else {
                      message.error('删除失败: ' + (err.response?.data?.msg || err.message));
                    }
                  }
                }
              });
            }}
            okText="确定"
            cancelText="取消"
          >
            <Button
              icon={<DeleteOutlined />}
              type="primary"
              danger
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 批量操作的表格行选择配置
  const rowSelection = {
    selectedRowKeys: selectedAccounts,
    onChange: (selectedRowKeys) => {
      setSelectedAccounts(selectedRowKeys);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={4}>账号管理</Title>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingAccountId(null);
              form.resetFields();
              // 设置新建账号时的默认值
              form.setFieldsValue({
                status: true,
                admin_notes: '',
                source_platform: '其他',
                purchase_amount: 0,
                expiry_type: '月卡'
              });
              setModalVisible(true);
            }}
          >
            添加账号
          </Button>
          <Button
            type="primary"
            disabled={selectedAccounts.length === 0}
            onClick={() => {
              batchForm.resetFields();
              setBatchEditModalVisible(true);
            }}
          >
            批量修改
          </Button>
          <Button
            type="primary"
            danger
            icon={<DeleteOutlined />}
            disabled={selectedAccounts.length === 0}
            onClick={handleBatchDelete}
          >
            批量删除
          </Button>
        </Space>
      </div>

      <Table
        rowSelection={{
          type: 'checkbox',
          ...rowSelection,
        }}
        columns={columns}
        dataSource={accounts}
        loading={loading}
        rowKey="_id"
        pagination={{ pageSize: 10 }}
      />

      {/* 添加/编辑账号模态框 */}
      <Modal
        title={editingAccountId ? '编辑账号' : '添加账号'}
        visible={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingAccountId(null);
        }}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddOrUpdateAccount}
        >
          <Tabs defaultActiveKey="basic">
            <TabPane tab="基本信息" key="basic">
              <Form.Item
                name="username"
                label="用户名"
                rules={[{ required: true, message: '请输入用户名!' }]}
              >
                <Input placeholder="请输入用户名" />
              </Form.Item>
              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: true, message: '请输入密码!' }]}
              >
                <Input.Password placeholder="请输入密码" />
              </Form.Item>
              <Form.Item
                name="status"
                label="状态"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch checkedChildren="启用" unCheckedChildren="停用" />
              </Form.Item>
            </TabPane>
            <TabPane tab="车位设置" key="profiles">
              <Collapse defaultActiveKey={['1']}>
                {[1, 2, 3, 4, 5].map(position => (
                  <Panel header={`车位 ${position}`} key={position}>
                    <Form.Item
                      name={`profile_${position}_status`}
                      label="状态"
                      valuePropName="checked"
                      initialValue={true}
                    >
                      <Switch checkedChildren="启用" unCheckedChildren="停用" />
                    </Form.Item>
                    <Form.Item
                      name={`profile_${position}_pin`}
                      label="PIN码"
                    >
                      <Input placeholder="可选，如果账号设置了PIN码" />
                    </Form.Item>
                  </Panel>
                ))}
              </Collapse>
            </TabPane>
            <TabPane tab="管理员信息" key="admin-info">
              <Form.Item
                name="admin_notes"
                label="管理员备注"
              >
                <Input.TextArea 
                  rows={4} 
                  placeholder="请输入管理员备注信息..." 
                  maxLength={500}
                  showCount
                />
              </Form.Item>

              <Card title="采购信息" size="small" style={{ marginBottom: 16 }}>
                <Form.Item
                  name="source_platform"
                  label="上家平台"
                >
                  <Select placeholder="请选择上家平台">
                    <Select.Option value="拼多多">拼多多</Select.Option>
                    <Select.Option value="淘宝">淘宝</Select.Option>
                    <Select.Option value="闲鱼">闲鱼</Select.Option>
                    <Select.Option value="微信">微信</Select.Option>
                    <Select.Option value="TG">TG</Select.Option>
                    <Select.Option value="其他">其他</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="purchase_amount"
                  label="采购金额"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    precision={2}
                    placeholder="请输入采购金额"
                    addonBefore="¥"
                  />
                </Form.Item>

                <Form.Item
                  name="purchase_date"
                  label="采购时间"
                >
                  <DatePicker 
                    style={{ width: '100%' }}
                    placeholder="请选择采购时间"
                    format="YYYY-MM-DD"
                  />
                </Form.Item>

                <Form.Item
                  name="expiry_type"
                  label="到期时间类型"
                >
                  <Select placeholder="请选择到期时间类型">
                    <Select.Option value="周卡">周卡</Select.Option>
                    <Select.Option value="月卡">月卡</Select.Option>
                    <Select.Option value="季度卡">季度卡</Select.Option>
                    <Select.Option value="半年卡">半年卡</Select.Option>
                    <Select.Option value="年卡">年卡</Select.Option>
                    <Select.Option value="自定义">自定义</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  noStyle
                  shouldUpdate={(prevValues, currentValues) => prevValues.expiry_type !== currentValues.expiry_type}
                >
                  {({ getFieldValue }) =>
                    getFieldValue('expiry_type') === '自定义' ? (
                      <Form.Item
                        name="custom_expiry_date"
                        label="自定义到期时间"
                        rules={[{ required: true, message: '请选择自定义到期时间' }]}
                      >
                        <DatePicker 
                          style={{ width: '100%' }}
                          placeholder="请选择到期时间"
                          format="YYYY-MM-DD"
                        />
                      </Form.Item>
                    ) : null
                  }
                </Form.Item>
              </Card>
            </TabPane>
            <TabPane tab="邮箱API配置" key="email-api">
              <Form
                form={emailApiForm}
                layout="vertical"
                onFinish={saveEmailApiConfig}
              >
                <div style={{ marginBottom: 16 }}>
                  <Space>
                    <Button 
                      type="primary" 
                      onClick={() => emailApiForm.submit()}
                    >
                      保存配置
                    </Button>
                    <Button 
                      onClick={testEmailApi}
                      loading={emailApiTesting}
                    >
                      测试连接
                    </Button>
                    <Button 
                      danger
                      onClick={clearEmailApiConfig}
                    >
                      清除配置
                    </Button>
                  </Space>
                </div>

                <Form.Item
                  name="auto_fetch_enabled"
                  label="启用自动获取验证码"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                </Form.Item>

                <Form.Item
                  name="api_type"
                  label="API类型"
                  rules={[{ required: true, message: '请选择API类型' }]}
                >
                  <Select placeholder="选择API类型">
                    <Select.Option value="custom">自定义API</Select.Option>
                    <Select.Option value="gmail_api">Gmail API</Select.Option>
                    <Select.Option value="outlook_api">Outlook API</Select.Option>
                    <Select.Option value="webhook">Webhook</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="api_url"
                  label="API接口地址"
                  rules={[{ required: true, message: '请输入API接口地址' }]}
                >
                  <Input placeholder="https://api.example.com/emails" />
                </Form.Item>

                <Form.Item
                  name="api_method"
                  label="请求方法"
                >
                  <Select>
                    <Select.Option value="GET">GET</Select.Option>
                    <Select.Option value="POST">POST</Select.Option>
                    <Select.Option value="PUT">PUT</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="email_address"
                  label="关联邮箱地址"
                >
                  <Input placeholder="example@gmail.com" />
                </Form.Item>

                <Form.Item
                  name="auth_token"
                  label="认证Token"
                >
                  <Input.Password placeholder="Bearer token或API密钥" />
                </Form.Item>

                <Form.Item
                  name="api_key"
                  label="API密钥"
                >
                  <Input.Password placeholder="API Key" />
                </Form.Item>

                <Form.Item
                  name="code_validity_minutes"
                  label="验证码有效期（分钟）"
                >
                  <InputNumber min={1} max={60} placeholder="10" />
                </Form.Item>

                <Form.Item
                  name="api_headers"
                  label="请求头（JSON格式）"
                >
                  <Input.TextArea 
                    rows={3}
                    placeholder='{"Content-Type": "application/json"}'
                  />
                </Form.Item>

                <Form.Item
                  name="api_params"
                  label="请求参数（JSON格式）"
                >
                  <Input.TextArea 
                    rows={3}
                    placeholder='{"limit": 10, "folder": "inbox"}'
                  />
                </Form.Item>

                <Form.Item
                  name="response_config"
                  label="响应数据解析配置（JSON格式）"
                >
                  <Input.TextArea 
                    rows={5}
                    placeholder={`{
  "emails_path": "data.emails",
  "subject_field": "subject", 
  "content_field": "content",
  "sender_field": "from",
  "date_field": "date"
}`}
                  />
                </Form.Item>

                {emailApiTestResult && (
                  <Card 
                    title={emailApiTestResult.success ? "连接测试成功" : "连接测试失败"}
                    type="inner"
                    style={{ 
                      marginTop: 16,
                      borderColor: emailApiTestResult.success ? '#52c41a' : '#ff4d4f'
                    }}
                  >
                    <p><strong>消息：</strong>{emailApiTestResult.message}</p>
                    {emailApiTestResult.stats && (
                      <div>
                        <p><strong>邮件统计：</strong></p>
                        <ul>
                          <li>总邮件数：{emailApiTestResult.stats.total}</li>
                          <li>Netflix邮件数：{emailApiTestResult.stats.netflix}</li>
                          <li>API地址：{emailApiTestResult.stats.api_url}</li>
                        </ul>
                      </div>
                    )}
                    {emailApiTestResult.sampleData && emailApiTestResult.sampleData.length > 0 && (
                      <div>
                        <p><strong>示例数据：</strong></p>
                        <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '8px' }}>
                          {JSON.stringify(emailApiTestResult.sampleData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </Card>
                )}
              </Form>
            </TabPane>
          </Tabs>
        </Form>
      </Modal>

      {/* 批量编辑模态框 */}
      <Modal
        title="批量编辑账号"
        open={batchEditModalVisible}
        onOk={() => batchForm.submit()}
        onCancel={() => {
          setBatchEditModalVisible(false);
          batchForm.resetFields();
        }}
      >
        <p>已选择 {selectedAccounts.length} 个账号</p>
        <Form
          form={batchForm}
          layout="vertical"
          onFinish={handleBatchEditAccounts}
        >
          <Form.Item
            name="username"
            label="用户名"
          >
            <Input placeholder="不修改请留空" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
          >
            <Input.Password placeholder="不修改请留空" />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
          >
            <Select placeholder="不修改请留空">
              <Select.Option value={1}>启用</Select.Option>
              <Select.Option value={0}>停用</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 车位设置模态框 */}
      <Modal
        title={`车位 ${currentProfilePosition} 设置`}
        open={profileModalVisible}
        onOk={() => profileForm.submit()}
        onCancel={() => setProfileModalVisible(false)}
      >
        <Form
          form={profileForm}
          layout="vertical"
          onFinish={handleUpdateProfile}
        >
          <Form.Item
            name="status"
            label="状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
          <Form.Item
            name="pin"
            label="PIN码"
          >
            <Input placeholder="可选，如果账号设置了PIN码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Accounts; 