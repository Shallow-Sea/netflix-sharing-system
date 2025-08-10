import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Switch, Select, message, Space,
  Popconfirm, Card, Typography, Tag, Divider, Alert, InputNumber
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  SettingOutlined, BellOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [settingsForm] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [previewFormat, setPreviewFormat] = useState('html');
  const [stats, setStats] = useState({});
  const [globalSettings, setGlobalSettings] = useState({});

  // 获取所有公告
  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/announcements', {
        headers: { 'x-auth-token': token }
      });
      setAnnouncements(res.data);
      setLoading(false);
    } catch (err) {
      console.error('获取公告失败:', err);
      message.error('获取公告失败: ' + (err.response?.data?.msg || err.message));
      setLoading(false);
    }
  };

  // 获取公告统计
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/announcements/stats', {
        headers: { 'x-auth-token': token }
      });
      setStats(res.data);
    } catch (err) {
      console.error('获取统计失败:', err);
    }
  };

  // 获取全局设置
  const fetchGlobalSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/admin/announcements/settings', {
        headers: { 'x-auth-token': token }
      });
      setGlobalSettings(res.data);
      settingsForm.setFieldsValue(res.data);
    } catch (err) {
      console.error('获取设置失败:', err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchStats();
    fetchGlobalSettings();
  }, []);

  // 提交表单
  const handleSubmit = async (values) => {
    try {
      const token = localStorage.getItem('token');

      // 转换字段名和数据类型
      const submitData = {
        ...values,
        is_active: values.status // 将前端的status字段映射到后端的is_active字段
      };
      
      // 移除前端特有的status字段
      delete submitData.status;

      if (editingId) {
        await axios.put(`/api/admin/announcements/${editingId}`, submitData, {
          headers: { 'x-auth-token': token }
        });
        message.success('公告更新成功');
      } else {
        await axios.post('/api/admin/announcements', submitData, {
          headers: { 'x-auth-token': token }
        });
        message.success('公告添加成功');
      }

      setModalVisible(false);
      form.resetFields();
      setEditingId(null);
      fetchAnnouncements();
      fetchStats();
    } catch (err) {
      console.error('保存失败:', err);
      message.error('保存失败: ' + (err.response?.data?.msg || err.message));
    }
  };

  // 保存全局设置
  const handleSettingsSubmit = async (values) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/admin/announcements/settings', values, {
        headers: { 'x-auth-token': token }
      });
      message.success('设置保存成功');
      setSettingsModalVisible(false);
      fetchGlobalSettings();
    } catch (err) {
      console.error('设置保存失败:', err);
      message.error('设置保存失败: ' + (err.response?.data?.msg || err.message));
    }
  };

  // 删除公告
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/announcements/${id}`, {
        headers: { 'x-auth-token': token }
      });
      message.success('公告删除成功');
      fetchAnnouncements();
      fetchStats();
    } catch (err) {
      console.error('删除失败:', err);
      message.error('删除失败: ' + (err.response?.data?.msg || err.message));
    }
  };

  // 打开编辑模态框
  const showEditModal = (record) => {
    setEditingId(record._id);
    form.setFieldsValue({
      title: record.title,
      content: record.content,
      format: record.format,
      show_as_popup: record.show_as_popup,
      countdown_seconds: record.countdown_seconds,
      status: record.is_active // 将后端的is_active映射到前端的status
    });
    setModalVisible(true);
  };

  // 预览公告
  const handlePreview = async (record) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/admin/announcements/preview', {
        content: record.content,
        format: record.format
      }, {
        headers: { 'x-auth-token': token }
      });
      setPreviewContent(res.data.rendered_content || record.content);
      setPreviewFormat(record.format);
      setPreviewModalVisible(true);
    } catch (err) {
      console.error('预览失败:', err);
      message.error('预览失败: ' + (err.response?.data?.msg || err.message));
    }
  };

  // 表格列配置
  const columns = [
    {
      title: 'ID',
      dataIndex: '_id',
      key: '_id',
      width: 100,
      render: (text) => text.slice(-6)
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true
    },
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      width: 80,
      render: (format) => (
        <Tag color={format === 'html' ? 'orange' : 'blue'}>
          {format.toUpperCase()}
        </Tag>
      )
    },
    {
      title: '弹窗显示',
      dataIndex: 'show_as_popup',
      key: 'show_as_popup',
      width: 100,
      render: (show) => (
        <Tag color={show ? 'green' : 'default'}>
          {show ? '是' : '否'}
        </Tag>
      )
    },
    {
      title: '倒计时',
      dataIndex: 'countdown_seconds',
      key: 'countdown_seconds',
      width: 100,
      render: (seconds) => seconds ? `${seconds}秒` : '无'
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (is_active) => (
        <Tag color={is_active ? 'green' : 'red'}>
          {is_active ? '启用' : '停用'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date) => new Date(date).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record)}
            size="small"
          >
            预览
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
            type="primary"
            size="small"
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这个公告吗？"
            onConfirm={() => handleDelete(record._id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              icon={<DeleteOutlined />}
              danger
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2}>
          <BellOutlined /> 公告管理
        </Title>
        <Space>
          <Button
            icon={<SettingOutlined />}
            onClick={() => setSettingsModalVisible(true)}
          >
            全局设置
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingId(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            添加公告
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <div style={{ marginBottom: '24px' }}>
        <Space size="large">
          <Card size="small">
            <div>
              <Text type="secondary">总公告数</Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {stats.total || 0}
              </div>
            </div>
          </Card>
          <Card size="small">
            <div>
              <Text type="secondary">启用公告</Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                {stats.active || 0}
              </div>
            </div>
          </Card>
          <Card size="small">
            <div>
              <Text type="secondary">停用公告</Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff4d4f' }}>
                {stats.inactive || 0}
              </div>
            </div>
          </Card>
          <Card size="small">
            <div>
              <Text type="secondary">弹窗公告</Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {stats.popup || 0}
              </div>
            </div>
          </Card>
        </Space>
      </div>

      {/* 全局设置提示 */}
      {!globalSettings.popup_enabled && (
        <Alert
          message="公告弹窗已全局禁用"
          description="前端将不会显示任何弹窗公告，请在全局设置中启用。"
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 表格 */}
      <Table
        columns={columns}
        dataSource={announcements}
        rowKey="_id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`
        }}
      />

      {/* 添加/编辑公告模态框 */}
      <Modal
        title={editingId ? '编辑公告' : '添加公告'}
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingId(null);
        }}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="title"
            label="公告标题"
            rules={[{ required: true, message: '请输入公告标题' }]}
          >
            <Input placeholder="请输入公告标题" />
          </Form.Item>

          <Form.Item
            name="format"
            label="内容格式"
            initialValue="html"
            rules={[{ required: true, message: '请选择内容格式' }]}
          >
            <Select>
              <Option value="html">HTML</Option>
              <Option value="markdown">Markdown</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="content"
            label="公告内容"
            rules={[{ required: true, message: '请输入公告内容' }]}
          >
            <TextArea 
              rows={8} 
              placeholder="请输入公告内容，支持HTML或Markdown格式"
            />
          </Form.Item>

          <Form.Item
            name="show_as_popup"
            label="显示为弹窗"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>

          <Form.Item
            name="countdown_seconds"
            label="倒计时（秒）"
            extra="设置弹窗自动关闭时间，0表示不自动关闭"
          >
            <InputNumber min={0} max={300} placeholder="0" />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 全局设置模态框 */}
      <Modal
        title="公告全局设置"
        open={settingsModalVisible}
        onOk={() => settingsForm.submit()}
        onCancel={() => setSettingsModalVisible(false)}
        width={600}
      >
        <Form
          form={settingsForm}
          layout="vertical"
          onFinish={handleSettingsSubmit}
        >
          <Form.Item
            name="popup_enabled"
            label="启用弹窗公告"
            valuePropName="checked"
            extra="关闭后，前端将不显示任何弹窗公告"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item
            name="auto_hide_seconds"
            label="默认自动隐藏时间（秒）"
            extra="弹窗公告的默认自动隐藏时间，0表示不自动隐藏"
          >
            <InputNumber min={0} max={300} placeholder="10" />
          </Form.Item>

          <Form.Item
            name="max_display_count"
            label="最大显示数量"
            extra="同时显示的弹窗公告最大数量"
          >
            <InputNumber min={1} max={10} placeholder="3" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 预览模态框 */}
      <Modal
        title="公告预览"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        <div style={{ 
          border: '1px solid #d9d9d9', 
          borderRadius: '6px', 
          padding: '16px',
          backgroundColor: '#fafafa'
        }}>
          {previewFormat === 'html' ? (
            <div dangerouslySetInnerHTML={{ __html: previewContent }} />
          ) : (
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {previewContent}
            </pre>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Announcements;
