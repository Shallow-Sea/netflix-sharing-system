import React, { useState } from 'react';
import { Layout, Menu, Button, Typography, Avatar, Dropdown, message } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ShareAltOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  NotificationOutlined,
  SettingOutlined,
  BellOutlined
} from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const AdminLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const toggle = () => {
    setCollapsed(!collapsed);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    message.success('退出登录成功');
    navigate('/login');
  };

  const userMenu = (
    <Menu>
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        个人设置
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        退出登录
      </Menu.Item>
    </Menu>
  );

  const notificationsMenu = (
    <Menu>
      <Menu.Item key="no-notifications">
        暂无通知
      </Menu.Item>
    </Menu>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          boxShadow: '2px 0 6px rgba(0,21,41,0.08)',
          background: '#001529'
        }}
      >
        <div className="logo" style={{ 
          height: '64px', 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#fff',
          fontSize: collapsed ? '16px' : '20px',
          fontWeight: 'bold',
          margin: '16px 0'
        }}>
          {collapsed ? 'NF' : '奈飞管理系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultSelectedKeys={['/dashboard']}
        >
          <Menu.Item key="/dashboard" icon={<DashboardOutlined />}>
            <Link to="/dashboard">仪表盘</Link>
          </Menu.Item>
          <Menu.Item key="/accounts" icon={<UserOutlined />}>
            <Link to="/accounts">账号管理</Link>
          </Menu.Item>
          <Menu.Item key="/share-pages" icon={<ShareAltOutlined />}>
            <Link to="/share-pages">分享页管理</Link>
          </Menu.Item>
          <Menu.Item key="/announcements" icon={<NotificationOutlined />}>
            <Link to="/announcements">公告管理</Link>
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px', 
          boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: toggle,
              style: { fontSize: '18px' }
            })}
            <Title level={4} style={{ margin: '0 0 0 16px' }}>
              {location.pathname === '/dashboard' && '仪表盘'}
              {location.pathname === '/accounts' && '账号管理'}
              {location.pathname === '/share-pages' && '分享页管理'}
              {location.pathname === '/announcements' && '公告管理'}
            </Title>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Dropdown overlay={notificationsMenu} placement="bottomRight">
              <Button type="text" icon={<BellOutlined style={{ fontSize: '18px' }} />} />
            </Dropdown>
            <Dropdown overlay={userMenu} placement="bottomRight">
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                marginLeft: '16px'
              }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                <span style={{ marginLeft: '8px' }}>管理员</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ 
          margin: '24px 16px', 
          padding: 24, 
          background: '#fff', 
          minHeight: 280,
          borderRadius: '4px',
          boxShadow: '0 1px 4px rgba(0,21,41,0.08)'
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout; 