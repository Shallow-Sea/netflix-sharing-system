import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Switch,
  DatePicker,
  message,
  Popconfirm,
  Select,
  InputNumber,
  Typography,
  Tabs
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;
const { confirm } = Modal;

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [form] = Form.useForm();

  // 获取所有公告
  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/announcements');
      setAnnouncements(res.data);
    } catch (err) {
      message.error('获取公告列表失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // 添加/编辑公告
  const handleSaveAnnouncement = async (values) => {
    try {
      if (editingAnnouncement) {
        // 更新公告
        await axios.put(`/api/admin/announcements/${editingAnnouncement._id}`, values);
        message.success('公告更新成功');
      } else {
        // 添加公告
        await axios.post('/api/admin/announcements', values);
        message.success('公告添加成功');
      }
      setModalVisible(false);
      fetchAnnouncements();
    } catch (err) {
      message.error('操作失败');
      console.error(err);
    }
  };

  // 删除公告
  const handleDeleteAnnouncement = async (id) => {
    try {
      await axios.delete(`/api/admin/announcements/${id}`);
      message.success('公告删除成功');
      fetchAnnouncements();
    } catch (err) {
      message.error('删除失败');
      console.error(err);
    }
  };

  // 批量删除公告
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的公告');
      return;
    }

    confirm({
      title: '确定要删除选中的公告吗？',
      icon: <ExclamationCircleOutlined />,
      content: '此操作不可恢复',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await axios.delete('/api/admin/announcements', {
            data: { ids: selectedRowKeys }
          });
          message.success('批量删除成功');
          setSelectedRowKeys([]);
          fetchAnnouncements();
        } catch (err) {
          message.error('批量删除失败');
          console.error(err);
        }
      }
    });
  };

  // 打开编辑模态框
  const handleEdit = (record) => {
    setEditingAnnouncement(record);
    form.setFieldsValue({
      ...record,
      start_time: record.start_time ? moment(record.start_time) : null,
      end_time: record.end_time ? moment(record.end_time) : null
    });
    setModalVisible(true);
  };

  // 打开添加模态框
  const handleAdd = () => {
    setEditingAnnouncement(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 表格列定义
  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true
    },
    {
      title: '内容格式',
      dataIndex: 'format',
      key: 'format',
      render: (format) => format === 'html' ? 'HTML' : 'Markdown'
    },
    {
      title: '弹窗显示',
      dataIndex: 'show_as_popup',
      key: 'show_as_popup',
      render: (show_as_popup) => (
        <span>{show_as_popup ? '是' : '否'}</span>
      )
    },
    {
      title: '倒计时(秒)',
      dataIndex: 'countdown_seconds',
      key: 'countdown_seconds',
      render: (seconds) => seconds > 0 ? seconds : '无'
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (is_active) => (
        <span style={{ color: is_active ? '#52c41a' : '#ff4d4f' }}>
          {is_active ? '启用' : '停用'}
        </span>
      )
    },
    {
      title: '显示顺序',
      dataIndex: 'display_order',
      key: 'display_order'
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (start_time) => start_time ? moment(start_time).format('YYYY-MM-DD HH:mm') : '无限制'
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      key: 'end_time',
      render: (end_time) => end_time ? moment(end_time).format('YYYY-MM-DD HH:mm') : '无限制'
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (created_at) => moment(created_at).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此公告吗？"
            onConfirm={() => handleDeleteAnnouncement(record._id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // 表格行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys)
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={4}>公告管理</Title>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            添加公告
          </Button>
          <Button
            type="primary"
            danger
            icon={<DeleteOutlined />}
            onClick={handleBatchDelete}
            disabled={selectedRowKeys.length === 0}
          >
            批量删除
          </Button>
        </Space>
      </div>

      <Table
        rowKey="_id"
        rowSelection={rowSelection}
        columns={columns}
        dataSource={announcements}
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 'max-content' }}
      />

      {/* 添加/编辑公告模态框 */}
      <Modal
        title={editingAnnouncement ? '编辑公告' : '添加公告'}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveAnnouncement}
          initialValues={{
            format: 'html',
            show_as_popup: false,
            countdown_seconds: 0,
            is_active: true,
            display_order: 0
          }}
        >
          <Tabs defaultActiveKey="basic">
            <TabPane tab="基本信息" key="basic">
              <Form.Item
                name="title"
                label="公告标题"
                rules={[{ required: true, message: '请输入公告标题' }]}
              >
                <Input placeholder="请输入公告标题" />
              </Form.Item>

              <Form.Item
                name="content"
                label="公告内容"
                rules={[{ required: true, message: '请输入公告内容' }]}
              >
                <TextArea rows={6} placeholder="请输入公告内容" />
              </Form.Item>

              <Form.Item
                name="format"
                label="内容格式"
              >
                <Select>
                  <Option value="html">HTML</Option>
                  <Option value="markdown">Markdown</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="is_active"
                label="是否启用"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </TabPane>

            <TabPane tab="显示设置" key="display">
              <Form.Item
                name="show_as_popup"
                label="弹窗显示"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                name="countdown_seconds"
                label="弹窗倒计时(秒)"
                tooltip="设置为0表示无倒计时，用户可以立即关闭"
              >
                <InputNumber min={0} />
              </Form.Item>

              <Form.Item
                name="display_order"
                label="显示顺序"
                tooltip="数字越小越靠前显示"
              >
                <InputNumber min={0} />
              </Form.Item>

              <Form.Item
                name="start_time"
                label="开始时间"
              >
                <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" />
              </Form.Item>

              <Form.Item
                name="end_time"
                label="结束时间"
              >
                <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" />
              </Form.Item>
            </TabPane>
          </Tabs>

          <Form.Item style={{ marginTop: 16, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Announcements; 