import React, { useState } from 'react';
import { Layout, Menu, Breadcrumb } from 'antd';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  ShareAltOutlined,
  BellOutlined,
  LogoutOutlined,
  TeamOutlined
} from '@ant-design/icons';
import DevWarningBanner from './DevWarningBanner';

const { Header, Content, Footer, Sider } = Layout;

const AdminLayout = ({ logout }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  
  // 根据当前路径确定选中的菜单项
  const selectedKey = location.pathname.split('/')[2] || 'dashboard';
  
  // 面包屑导航映射
  const breadcrumbNameMap = {
    'dashboard': '仪表盘',
    'accounts': '账号管理',
    'share-pages': '分享页管理',
    'announcements': '公告管理',
    'admin-management': '管理员管理'
  };
  
  // 当前路径的面包屑名称
  const currentBreadcrumb = breadcrumbNameMap[selectedKey] || '仪表盘';

  return (
    <Layout className="app-container">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
      >
        <div className="logo">奈飞管理系统</div>
        <Menu 
          theme="dark" 
          selectedKeys={[selectedKey]} 
          mode="inline"
          items={[
            {
              key: 'dashboard',
              icon: <DashboardOutlined />,
              label: <Link to="/admin">仪表盘</Link>
            },
            {
              key: 'accounts',
              icon: <UserOutlined />,
              label: <Link to="/admin/accounts">账号管理</Link>
            },
            {
              key: 'share-pages',
              icon: <ShareAltOutlined />,
              label: <Link to="/admin/share-pages">分享页管理</Link>
            },
            {
              key: 'announcements',
              icon: <BellOutlined />,
              label: <Link to="/admin/announcements">公告管理</Link>
            },
            {
              key: 'admin-management',
              icon: <TeamOutlined />,
              label: <Link to="/admin/admin-management">管理员管理</Link>
            },
            {
              key: 'logout',
              icon: <LogoutOutlined />,
              label: '退出系统',
              onClick: logout
            }
          ]}
        />
      </Sider>
      <Layout>
        <Header className="site-layout-background" style={{ padding: 0 }} />
        <DevWarningBanner />
        <Content style={{ margin: '0 16px' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item>管理后台</Breadcrumb.Item>
            <Breadcrumb.Item>{currentBreadcrumb}</Breadcrumb.Item>
          </Breadcrumb>
          <div className="content-container">
            <Outlet />
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>奈飞账号共享管理系统 ©2023</Footer>
      </Layout>
    </Layout>
  );
};

export default AdminLayout; 