import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { UserOutlined, LinkOutlined, ClockCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalAccounts: 0,
    activeAccounts: 0,
    totalSharePages: 0,
    activeSharePages: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 设置请求头部添加token
        const token = localStorage.getItem('token');
        const config = {
          headers: { 'x-auth-token': token }
        };
        
        // 获取账号数据
        const accountsRes = await axios.get('/api/admin/accounts', config);
        
        // 获取分享页数据
        const sharePagesRes = await axios.get('/api/admin/share-pages', config);
        
        // 统计数据
        const accounts = accountsRes.data;
        const sharePages = sharePagesRes.data;
        
        setStats({
          totalAccounts: accounts.length,
          activeAccounts: accounts.filter(acc => acc.status === 1).length,
          totalSharePages: sharePages.length,
          activeSharePages: sharePages.filter(page => page.status === 1).length
        });
        
        setLoading(false);
      } catch (err) {
        console.error('获取数据失败:', err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2>系统概览</h2>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总账号数"
              value={stats.totalAccounts}
              prefix={<UserOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃账号数"
              value={stats.activeAccounts}
              prefix={<UserOutlined />}
              loading={loading}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总分享页数"
              value={stats.totalSharePages}
              prefix={<LinkOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃分享页数"
              value={stats.activeSharePages}
              prefix={<ClockCircleOutlined />}
              loading={loading}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard; 