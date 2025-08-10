import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Modal, Form, Input, Switch, Select, DatePicker, 
  message, Space, Popconfirm, Typography, InputNumber, Tabs, 
  Checkbox, Tag, Tooltip, Badge
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, LinkOutlined, 
  CopyOutlined, ExclamationCircleOutlined, SettingOutlined,
  LockOutlined, UnlockOutlined, CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { confirm } = Modal;

const SharePages = () => {
  const [sharePages, setSharePages] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [batchEditModalVisible, setBatchEditModalVisible] = useState(false);
  const [batchCreateModalVisible, setBatchCreateModalVisible] = useState(false);
  const [selectedPages, setSelectedPages] = useState([]);
  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();
  const [batchCreateForm] = Form.useForm();
  const [editingPageId, setEditingPageId] = useState(null);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    // 设置基础URL
    setBaseUrl(`${window.location.protocol}//${window.location.host}/share/`);
    
    // 获取数据
    fetchSharePages();
    fetchAccounts();
  }, []);

  // 获取所有分享页
  const fetchSharePages = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/share-pages', {
        headers: { 'x-auth-token': token }
      });
      setSharePages(res.data);
      setLoading(false);
    } catch (err) {
      console.error('获取分享页失败:', err);
      message.error('获取分享页失败: ' + (err.response?.data?.msg || err.message));
      setLoading(false);
    }
  };

  // 获取所有账号（用于选择）
  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/accounts', {
        headers: { 'x-auth-token': token }
      });
      setAccounts(res.data.filter(acc => acc.status === 1));
    } catch (err) {
      console.error('获取账号失败:', err);
    }
  };

  // 添加或更新分享页
  const handleAddOrUpdateSharePage = async (values) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { 'x-auth-token': token }
      };

      // 处理日期格式
      const formattedValues = {
        ...values,
        start_time: values.start_time ? values.start_time.format('YYYY-MM-DD HH:mm:ss') : null,
        end_time: values.end_time ? values.end_time.format('YYYY-MM-DD HH:mm:ss') : null
      };

      if (editingPageId) {
        // 更新分享页
        await axios.put(`/api/admin/share-pages/batch`, {
          sharePages: [{
            id: editingPageId,
            account_id: formattedValues.account_id,
            profile_position: formattedValues.profile_position,
            start_time: formattedValues.start_time,
            end_time: formattedValues.end_time,
            status: formattedValues.status ? 1 : 0,
            access_password: formattedValues.access_password || '',
            duration_type: formattedValues.duration_type
          }]
        }, config);
        
        message.success('分享页更新成功');
      } else {
        // 添加分享页
        await axios.post('/api/admin/share-pages', formattedValues, config);
        message.success('分享页添加成功');
      }
      
      setModalVisible(false);
      form.resetFields();
      fetchSharePages();
      setEditingPageId(null);
    } catch (err) {
      console.error('操作失败:', err);
      message.error('操作失败: ' + (err.response?.data?.msg || err.message));
    }
  };

  // 批量修改分享页
  const handleBatchEditSharePages = async (values) => {
    try {
      const token = localStorage.getItem('token');
      
      // 处理日期格式
      const formattedValues = {
        ...values,
        start_time: values.start_time ? values.start_time.format('YYYY-MM-DD HH:mm:ss') : undefined,
        end_time: values.end_time ? values.end_time.format('YYYY-MM-DD HH:mm:ss') : undefined,
        status: values.status !== undefined ? values.status : undefined
      };
      
      // 构建要更新的分享页数组
      const pagesToUpdate = selectedPages.map(id => {
        return {
          id,
          ...formattedValues
        };
      });

      await axios.put('/api/admin/share-pages/batch', {
        sharePages: pagesToUpdate
      }, {
        headers: { 'x-auth-token': token }
      });

      message.success(`成功修改 ${selectedPages.length} 个分享页`);
      setBatchEditModalVisible(false);
      batchForm.resetFields();
      fetchSharePages();
      setSelectedPages([]);
    } catch (err) {
      console.error('批量修改失败:', err);
      message.error('批量修改失败: ' + (err.response?.data?.msg || err.message));
    }
  };

  // 批量生成分享页
  const handleBatchCreateSharePages = async (values) => {
    try {
      const token = localStorage.getItem('token');
      
      // 处理日期格式
      const formattedValues = {
        ...values,
        start_time: values.start_time ? values.start_time.format('YYYY-MM-DD HH:mm:ss') : null,
        end_time: values.end_time ? values.end_time.format('YYYY-MM-DD HH:mm:ss') : null,
        account_ids: values.account_ids || []
      };
      
      await axios.post('/api/admin/share-pages/batch', formattedValues, {
        headers: { 'x-auth-token': token }
      });

      message.success(`成功生成 ${values.count} 个分享页`);
      setBatchCreateModalVisible(false);
      batchCreateForm.resetFields();
      fetchSharePages();
    } catch (err) {
      console.error('批量生成失败:', err);
      message.error('批量生成失败: ' + (err.response?.data?.msg || err.message));
    }
  };

  // 删除分享页
  const handleDeleteSharePage = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/share-pages/${id}`, {
        headers: { 'x-auth-token': token }
      });
      message.success('分享页删除成功');
      fetchSharePages();
    } catch (err) {
      console.error('删除失败:', err);
      message.error('删除失败: ' + (err.response?.data?.msg || err.message));
    }
  };

  // 批量删除分享页
  const handleBatchDeleteSharePages = () => {
    if (selectedPages.length === 0) {
      message.warning('请选择要删除的分享页');
      return;
    }

    confirm({
      title: '确定要删除选中的分享页吗？',
      icon: <ExclamationCircleOutlined />,
      content: '此操作不可恢复',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const token = localStorage.getItem('token');
          
          await axios.delete('/api/admin/share-pages', {
            headers: { 'x-auth-token': token },
            data: { ids: selectedPages }
          });
          
          message.success(`成功删除 ${selectedPages.length} 个分享页`);
          fetchSharePages();
          setSelectedPages([]);
        } catch (err) {
          console.error('批量删除失败:', err);
          message.error('批量删除失败: ' + (err.response?.data?.msg || err.message));
        }
      }
    });
  };

  // 激活分享页
  const handleActivateSharePage = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/admin/share-pages/${id}/activate`, {}, {
        headers: { 'x-auth-token': token }
      });
      message.success('分享页激活成功');
      fetchSharePages();
    } catch (err) {
      console.error('激活失败:', err);
      message.error('激活失败: ' + (err.response?.data?.msg || err.message));
    }
  };

  // 打开编辑模态框
  const showEditModal = (sharePage) => {
    setEditingPageId(sharePage.id);
    form.setFieldsValue({
      account_id: sharePage.account_id,
      profile_position: sharePage.profile_position,
      start_time: sharePage.start_time ? moment(sharePage.start_time) : null,
      end_time: sharePage.end_time ? moment(sharePage.end_time) : null,
      status: sharePage.status === 1,
      access_password: sharePage.access_password || '',
      duration_type: sharePage.duration_type || 'month'
    });
    setModalVisible(true);
  };

  // 复制分享链接
  const copyShareLink = (code) => {
    const link = baseUrl + code;
    navigator.clipboard.writeText(link).then(() => {
      message.success('链接已复制到剪贴板');
    });
  };

  // 获取有效期类型显示文本
  const getDurationTypeText = (type) => {
    switch (type) {
      case 'day': return '天卡';
      case 'week': return '周卡';
      case 'month': return '月卡';
      case 'quarter': return '季卡';
      case 'year': return '年卡';
      default: return '月卡';
    }
  };

  // 获取有效期类型对应的天数
  const getDurationDays = (type) => {
    switch (type) {
      case 'day': return 1;
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      case 'year': return 365;
      default: return 30;
    }
  };

  // 表格列配置
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 220,
      ellipsis: true
    },
    {
      title: '分享代码',
      dataIndex: 'code',
      key: 'code',
      render: (code) => (
        <Button type="link" icon={<LinkOutlined />} onClick={() => copyShareLink(code)}>
          {code}
        </Button>
      ),
    },
    {
      title: '关联账号',
      dataIndex: 'account',
      key: 'account',
      render: (account) => {
        if (!account) return '-';
        return (
          <span>
            {account.username} 
            <Tag color="blue" style={{ marginLeft: 8 }}>
              位置: {account.currentProfile?.position || '-'}
            </Tag>
          </span>
        );
      }
    },
    {
      title: '有效期',
      key: 'duration',
      render: (_, record) => {
        return (
          <Tag color="green">
            {getDurationTypeText(record.duration_type)} ({record.duration_days}天)
          </Tag>
        );
      }
    },
    {
      title: '激活状态',
      key: 'activation',
      render: (_, record) => {
        if (record.is_activated) {
          return (
            <Badge status="success" text={
              <Tooltip title={`激活时间: ${record.activated_at ? moment(record.activated_at).format('YYYY-MM-DD') : '未知'}`}>
                <span>已激活</span>
              </Tooltip>
            } />
          );
        }
        return (
          <Space>
            <Badge status="warning" text="未激活" />
            <Button 
              size="small" 
              type="link" 
              onClick={() => handleActivateSharePage(record.id)}
            >
              激活
            </Button>
          </Space>
        );
      }
    },
    {
      title: '到期时间',
      dataIndex: 'end_time',
      key: 'end_time',
      render: (end_time) => end_time ? moment(end_time).format('YYYY-MM-DD') : '-',
    },
    {
      title: '访问保护',
      key: 'access_password',
      render: (_, record) => {
        return record.access_password ? (
          <Tooltip title={`密码: ${record.access_password}`}>
            <Tag icon={<LockOutlined />} color="orange">已设置</Tag>
          </Tooltip>
        ) : (
          <Tag icon={<UnlockOutlined />} color="default">无</Tag>
        );
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        return status === 1 ? (
          <Tag icon={<CheckCircleOutlined />} color="success">启用</Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">停用</Tag>
        );
      }
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
            title="确定要删除此分享页吗?"
            onConfirm={() => handleDeleteSharePage(record.id)}
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
          <Button
            icon={<CopyOutlined />}
            onClick={() => copyShareLink(record.code)}
            size="small"
          >
            复制链接
          </Button>
        </Space>
      ),
    },
  ];

  // 批量操作的表格行选择配置
  const rowSelection = {
    selectedRowKeys: selectedPages,
    onChange: (selectedRowKeys) => {
      setSelectedPages(selectedRowKeys);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={4}>分享页管理</Title>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingPageId(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            添加分享页
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              batchCreateForm.resetFields();
              setBatchCreateModalVisible(true);
            }}
          >
            批量生成
          </Button>
          <Button
            type="primary"
            disabled={selectedPages.length === 0}
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
            disabled={selectedPages.length === 0}
            onClick={handleBatchDeleteSharePages}
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
        dataSource={sharePages}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />

      {/* 添加/编辑分享页模态框 */}
      <Modal
        title={editingPageId ? '编辑分享页' : '添加分享页'}
        visible={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingPageId(null);
        }}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddOrUpdateSharePage}
        >
          <Tabs defaultActiveKey="basic">
            <TabPane tab="基本信息" key="basic">
              <Form.Item
                name="account_id"
                label="关联账号"
                rules={[{ required: true, message: '请选择关联账号!' }]}
              >
                <Select placeholder="请选择账号">
                  {accounts.map(account => (
                    <Select.Option key={account._id} value={account._id}>
                      {account.username}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item
                name="profile_position"
                label="车位位置"
                initialValue={1}
                rules={[{ required: true, message: '请选择车位位置!' }]}
              >
                <Select placeholder="请选择车位位置">
                  {[1, 2, 3, 4, 5].map(pos => (
                    <Select.Option key={pos} value={pos}>
                      位置 {pos}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item
                name="duration_type"
                label="有效期类型"
                initialValue="month"
              >
                <Select>
                  <Option value="day">天卡 (1天)</Option>
                  <Option value="week">周卡 (7天)</Option>
                  <Option value="month">月卡 (30天)</Option>
                  <Option value="quarter">季卡 (90天)</Option>
                  <Option value="year">年卡 (365天)</Option>
                </Select>
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
            
            <TabPane tab="时间设置" key="time">
              <Form.Item
                name="start_time"
                label="激活时间"
              >
                <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="end_time"
                label="到期时间"
              >
                <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: '100%' }} />
              </Form.Item>
              <Text type="secondary">
                注意：如果不设置激活时间，则用户首次访问时需要激活。如果不设置到期时间，系统将根据有效期类型自动计算。
              </Text>
            </TabPane>
            
            <TabPane tab="访问设置" key="access">
              <Form.Item
                name="access_password"
                label="访问密码"
              >
                <Input placeholder="可选，设置后需要密码才能访问" />
              </Form.Item>
              <Text type="secondary">
                设置访问密码后，用户需要输入正确的密码才能查看分享页内容。
              </Text>
            </TabPane>
          </Tabs>
        </Form>
      </Modal>

      {/* 批量编辑模态框 */}
      <Modal
        title="批量编辑分享页"
        open={batchEditModalVisible}
        onOk={() => batchForm.submit()}
        onCancel={() => {
          setBatchEditModalVisible(false);
          batchForm.resetFields();
        }}
        width={700}
      >
        <p>已选择 {selectedPages.length} 个分享页</p>
        <Form
          form={batchForm}
          layout="vertical"
          onFinish={handleBatchEditSharePages}
        >
          <Tabs defaultActiveKey="basic">
            <TabPane tab="基本信息" key="basic">
              <Form.Item
                name="account_id"
                label="关联账号"
              >
                <Select placeholder="不修改请留空" allowClear>
                  {accounts.map(account => (
                    <Select.Option key={account._id} value={account._id}>
                      {account.username}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item
                name="profile_position"
                label="车位位置"
              >
                <Select placeholder="不修改请留空" allowClear>
                  {[1, 2, 3, 4, 5].map(pos => (
                    <Select.Option key={pos} value={pos}>
                      位置 {pos}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item
                name="duration_type"
                label="有效期类型"
              >
                <Select placeholder="不修改请留空" allowClear>
                  <Option value="day">天卡 (1天)</Option>
                  <Option value="week">周卡 (7天)</Option>
                  <Option value="month">月卡 (30天)</Option>
                  <Option value="quarter">季卡 (90天)</Option>
                  <Option value="year">年卡 (365天)</Option>
                </Select>
              </Form.Item>
              
              <Form.Item
                name="status"
                label="状态"
              >
                <Select placeholder="不修改请留空" allowClear>
                  <Select.Option value={1}>启用</Select.Option>
                  <Select.Option value={0}>停用</Select.Option>
                </Select>
              </Form.Item>
            </TabPane>
            
            <TabPane tab="时间设置" key="time">
              <Form.Item
                name="start_time"
                label="激活时间"
              >
                <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="end_time"
                label="到期时间"
              >
                <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: '100%' }} />
              </Form.Item>
            </TabPane>
            
            <TabPane tab="访问设置" key="access">
              <Form.Item
                name="access_password"
                label="访问密码"
              >
                <Input placeholder="不修改请留空" />
              </Form.Item>
            </TabPane>
          </Tabs>
        </Form>
      </Modal>

      {/* 批量生成模态框 */}
      <Modal
        title="批量生成分享页"
        open={batchCreateModalVisible}
        onOk={() => batchCreateForm.submit()}
        onCancel={() => {
          setBatchCreateModalVisible(false);
          batchCreateForm.resetFields();
        }}
        width={700}
      >
        <Form
          form={batchCreateForm}
          layout="vertical"
          onFinish={handleBatchCreateSharePages}
          initialValues={{
            count: 10,
            duration_type: 'month',
            random_account: false,
            random_profile: false
          }}
        >
          <Form.Item
            name="count"
            label="生成数量"
            rules={[{ required: true, message: '请输入生成数量!' }]}
          >
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="duration_type"
            label="有效期类型"
            rules={[{ required: true, message: '请选择有效期类型!' }]}
          >
            <Select>
              <Option value="day">天卡 (1天)</Option>
              <Option value="week">周卡 (7天)</Option>
              <Option value="month">月卡 (30天)</Option>
              <Option value="quarter">季卡 (90天)</Option>
              <Option value="year">年卡 (365天)</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="random_account"
            valuePropName="checked"
            label="随机选择账号"
          >
            <Checkbox>启用随机账号</Checkbox>
          </Form.Item>
          
          <Form.Item
            name="account_ids"
            label="指定账号"
            dependencies={['random_account']}
          >
            <Select 
              mode="multiple" 
              placeholder="请选择账号（不选择且未启用随机账号则不设置账号）"
              disabled={batchCreateForm.getFieldValue('random_account')}
            >
              {accounts.map(account => (
                <Select.Option key={account._id} value={account._id}>
                  {account.username}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="random_profile"
            valuePropName="checked"
            label="随机选择车位"
          >
            <Checkbox>启用随机车位</Checkbox>
          </Form.Item>
          
          <Form.Item
            name="start_time"
            label="激活时间"
          >
            <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="end_time"
            label="到期时间"
          >
            <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="access_password"
            label="访问密码"
          >
            <Input placeholder="可选，设置后需要密码才能访问" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SharePages; 