import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layout, Button, Card, Tabs, Modal, message, Spin, Input, Form } from 'antd';
import {
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  LockOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import './SharePage.css';

const { Content } = Layout;
const { TabPane } = Tabs;

const SharePage = () => {
  const { code } = useParams();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginCodeModalVisible, setLoginCodeModalVisible] = useState(false);
  const [deviceCodeModalVisible, setDeviceCodeModalVisible] = useState(false);
  const [updateDeviceModalVisible, setUpdateDeviceModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [activateModalVisible, setActivateModalVisible] = useState(false);
  const [announcementModalVisible, setAnnouncementModalVisible] = useState(false);
  const [verifyCode, setVerifyCode] = useState(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');
  const [announcement, setAnnouncement] = useState(null);
  const [countdownTime, setCountdownTime] = useState(0);
  const [form] = Form.useForm();

  // 获取分享页数据
  const fetchPageData = async (password = '') => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/share/${code}`);
      
      // 如果需要密码访问
      if (res.data.requires_password) {
        setPasswordModalVisible(true);
        setLoading(false);
        return;
      }
      
      // 如果需要激活
      if (res.data.requires_activation) {
        setPageData(res.data);
        setActivateModalVisible(true);
        setLoading(false);
        return;
      }
      
      setPageData(res.data);
      
      // 检查是否有公告需要显示
      fetchAnnouncement();
    } catch (err) {
      console.error('获取分享页信息失败:', err);
      message.error('获取分享页信息失败: ' + (err.response?.data?.msg || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 获取公告
  const fetchAnnouncement = async () => {
    try {
      const res = await axios.get('/api/public/announcements/popup');
      if (res.data) {
        setAnnouncement(res.data);
        setAnnouncementModalVisible(true);
        
        // 如果有倒计时
        if (res.data.countdown_seconds > 0) {
          setCountdownTime(res.data.countdown_seconds);
          startCountdown(res.data.countdown_seconds);
        }
      }
    } catch (err) {
      console.error('获取公告失败:', err);
    }
  };

  // 倒计时功能
  const startCountdown = (seconds) => {
    const timer = setInterval(() => {
      setCountdownTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 验证密码
  const verifyPassword = async () => {
    try {
      const res = await axios.post(`/api/share/${code}/access`, { password: accessPassword });
      if (res.data.success) {
        setPasswordModalVisible(false);
        fetchPageData(accessPassword);
      }
    } catch (err) {
      message.error('密码错误');
    }
  };

  // 激活分享页
  const activatePage = async () => {
    try {
      const res = await axios.post(`/api/share/${code}/activate`);
      if (res.data.is_activated) {
        setActivateModalVisible(false);
        fetchPageData();
      }
    } catch (err) {
      message.error('激活失败: ' + (err.response?.data?.msg || err.message));
    }
  };

  // 初始加载
  useEffect(() => {
    fetchPageData();
  }, [code]);

  // 获取登录验证码
  const getLoginCode = async () => {
    setLoadingCode(true);
    try {
      const res = await axios.post(`/api/share/${code}/verify-code`, { type: 'login' });
      setVerifyCode(res.data.code);
      setLoginCodeModalVisible(true);
    } catch (err) {
      console.error('获取验证码失败:', err);
      message.error('获取验证码失败');
    } finally {
      setLoadingCode(false);
    }
  };

  // 获取同户验证码
  const getDeviceCode = async () => {
    setLoadingCode(true);
    try {
      const res = await axios.post(`/api/share/${code}/verify-code`, { type: 'device' });
      setVerifyCode(res.data.code);
      setDeviceCodeModalVisible(true);
    } catch (err) {
      console.error('获取验证码失败:', err);
      message.error('获取验证码失败');
    } finally {
      setLoadingCode(false);
    }
  };

  // 更新同户设备
  const updateDevice = async () => {
    setLoadingCode(true);
    try {
      const res = await axios.post(`/api/share/${code}/update-device`);
      setUpdateDeviceModalVisible(true);
    } catch (err) {
      console.error('更新设备失败:', err);
      message.error('更新设备失败');
    } finally {
      setLoadingCode(false);
    }
  };

  // 复制文本到剪贴板
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('复制成功');
    });
  };

  // 密码保护页面
  if (passwordModalVisible) {
    return (
      <Layout className="share-page-layout">
        <Content className="share-page-content">
          <div className="password-container">
            <h2 className="password-title">该分享页需要密码访问</h2>
            <div className="password-form">
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入访问密码"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                onPressEnter={verifyPassword}
              />
              <Button 
                type="primary" 
                onClick={verifyPassword} 
                style={{ marginTop: 16, width: '100%' }}
              >
                确认
              </Button>
            </div>
          </div>
        </Content>
      </Layout>
    );
  }

  // 激活页面
  if (activateModalVisible && pageData?.requires_activation) {
    return (
      <Layout className="share-page-layout">
        <Content className="share-page-content">
          <div className="activate-container">
            <h2 className="activate-title">激活分享页</h2>
            <p className="activate-description">
              该分享页尚未激活，激活后有效期为 {pageData.duration_days} 天
            </p>
            <Button 
              type="primary" 
              className="activate-button"
              onClick={activatePage}
            >
              立即激活
            </Button>
          </div>
        </Content>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout className="share-page-layout">
        <Content className="share-page-content">
          <div className="share-page-loading">
            <Spin size="large" />
            <p>正在加载中...</p>
          </div>
        </Content>
      </Layout>
    );
  }

  if (!pageData) {
    return (
      <Layout className="share-page-layout">
        <Content className="share-page-content">
          <div className="share-page-error">
            <ExclamationCircleOutlined style={{ fontSize: 48 }} />
            <h2>分享页不存在或已失效</h2>
          </div>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className="share-page-layout">
      <Content className="share-page-content">
        <div className="share-page-container">
          <Card className="share-page-card">
            <div className="share-page-header">
              <h3 className="share-page-title">小牛合租</h3>
              <div className="share-page-invite">
                <span>邀请好友购买享 20% 佣金</span>
                <Button type="primary" size="small">去推荐</Button>
              </div>
            </div>

            <div className="share-page-info">
              <h4>我的车票 登录信息</h4>
              <p className="share-page-notice">请对号入座严禁二次共享,违规使用将封号拉黑</p>
              
              <div className="share-page-account">
                {/* 账号显示 */}
                <div className="share-page-account-item">
                  <div className="share-page-account-label">账号:</div>
                  <div className="share-page-account-value">
                    {pageData.account?.username || '*****'}
                  </div>
                  <button 
                    className="share-page-account-btn"
                    onClick={() => copyToClipboard(pageData.account?.username)}
                  >
                    复制
                  </button>
                </div>
                
                {/* 密码显示 */}
                <div className="share-page-account-item">
                  <div className="share-page-account-label">密码:</div>
                  <div className="share-page-account-value">
                    {pageData.account?.password || '*****'}
                  </div>
                  <button 
                    className="share-page-account-btn"
                    onClick={() => copyToClipboard(pageData.account?.password)}
                  >
                    复制
                  </button>
                </div>
                
                {/* 头像位置显示 */}
                <div className="share-page-profile">
                  <span className="share-page-account-label">位置:</span>
                  <span className="profile-position">{pageData.account?.profile_position || 1}</span>
                  <span>号位置</span>
                </div>
                
                {/* PIN码显示（如果有） */}
                {pageData.account?.pin && (
                  <div className="pin-container">
                    <div className="pin-title">PIN码:</div>
                    <div className="pin-value">{pageData.account.pin}</div>
                  </div>
                )}
              </div>

              <div className="share-page-actions">
                <div className="share-page-action-btn" onClick={getLoginCode}>
                  <span>获取临时/旅游验证码</span>
                </div>
                <div className="share-page-action-btn" onClick={updateDevice}>
                  <span>电视更新同户设备</span>
                </div>
              </div>

              <div className="share-page-time">
                <div className="time-item">
                  <span className="time-label">开始时间</span>
                  <span className="time-value">
                    {pageData.activated_at ? moment(pageData.activated_at).format('YYYY-MM-DD') : '-'}
                  </span>
                </div>
                <div className="time-item">
                  <span className="time-label">到期时间</span>
                  <span className="time-value">
                    {pageData.end_time ? moment(pageData.end_time).format('YYYY-MM-DD') : '-'}
                  </span>
                </div>
              </div>

              <div className="share-page-ticket">
                <span>奈飞高级车 - 提前续费不换号</span>
                <span className="ticket-code">( {code} )</span>
              </div>

              <div className="share-page-faq-btn">
                <Button type="primary">👉️奈飞密码错误及常见问题解决👈️点击查看</Button>
              </div>

              <div className="share-page-tips">
                <p>推荐使用一次性验证码登录，发送验证码后，可在当前页面下方点击"获取验证码"</p>
              </div>
            </div>

            <div className="share-page-faq">
              <Tabs defaultActiveKey="1">
                <TabPane tab="解决 提示该地区不支持" key="1">
                  <div className="faq-content">
                    <p>如果显示该地区不支持，是因为亲的魔法没有解锁流媒体</p>
                    <p>手机操作方法: 关闭app，然后手机网络切换一下地区，换成，美、新、台、日，切换成功之后再重新打开app登录。还是不行的话重启一下设备。</p>
                    <p>电脑操作方法: 切换地区网络换，美、新、台、日，切换成功之后清除浏览器缓存重新登录。或者浏览器开无痕模式登录</p>
                    <p>电视或者苹果tv操作方法: 建议重启设备，切换节点之后重新打开证码。</p>
                  </div>
                </TabPane>
                <TabPane tab="出现同户验证，需要接受验证码？" key="2">
                  <div className="faq-content">
                    <p>1、点 我在旅行（暂时收看） 然后 传送邮件，点一次就行</p>
                    <p>2、在车票页面点击按钮 获取临时/旅行验证码</p>
                    <p>3、获取到验证码后，打开奈飞输入验证码 完成操作</p>
                  </div>
                </TabPane>
                <TabPane tab="为什么只能看到很少的剧（只有自制剧）？" key="3">
                  <div className="faq-content">
                    <p>资源随地区，更换其他地区即可，内容是根据地区显示的,很多地区不能完全解锁奈飞,所以只能看自制剧,会造成找的剧没有,尽量多切换地区去尝试下。</p>
                  </div>
                </TabPane>
                <TabPane tab="为什么提示几天后到期？" key="4">
                  <div className="faq-content">
                    <p>无需担心，该提示不影响观看，系统会自动续费</p>
                  </div>
                </TabPane>
              </Tabs>
            </div>
          </Card>
        </div>

        {/* 登录验证码模态框 */}
        <Modal
          title="登录验证码"
          visible={loginCodeModalVisible}
          onCancel={() => setLoginCodeModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setLoginCodeModalVisible(false)}>取消</Button>,
            <Button key="confirm" type="primary" onClick={() => setLoginCodeModalVisible(false)}>确认</Button>
          ]}
        >
          <div className="code-modal-content">
            <p>请在需要登录的设备上点击使用登录代码</p>
            <div className="verify-code">{verifyCode}</div>
          </div>
        </Modal>

        {/* 同户验证码模态框 */}
        <Modal
          title="同户验证码"
          visible={deviceCodeModalVisible}
          onCancel={() => setDeviceCodeModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setDeviceCodeModalVisible(false)}>取消</Button>,
            <Button key="confirm" type="primary" onClick={() => setDeviceCodeModalVisible(false)}>确认</Button>
          ]}
        >
          <div className="code-modal-content">
            <p>请在需要验证的设备上点击发送验证码</p>
            <div className="verify-code">{verifyCode}</div>
          </div>
        </Modal>

        {/* 更新同户设备模态框 */}
        <Modal
          title="电视更新同户设备"
          visible={updateDeviceModalVisible}
          onCancel={() => setUpdateDeviceModalVisible(false)}
          footer={[
            <Button key="confirm" type="primary" onClick={() => setUpdateDeviceModalVisible(false)}>确认</Button>
          ]}
        >
          <div className="code-modal-content">
            <p>如果提示您的电视不属于此账户的同户设备，请在电视上点击"更新同户设备"系统将为您自动更新</p>
            <div className="update-success">
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span>更新成功</span>
            </div>
          </div>
        </Modal>

        {/* 公告弹窗 */}
        {announcement && (
          <Modal
            title={null}
            visible={announcementModalVisible}
            onCancel={() => setAnnouncementModalVisible(false)}
            footer={null}
            className="announcement-modal"
            closable={countdownTime === 0}
            maskClosable={countdownTime === 0}
          >
            <div className="announcement-title">{announcement.title}</div>
            <div 
              className="announcement-content"
              dangerouslySetInnerHTML={{ 
                __html: announcement.format === 'html' 
                  ? announcement.content 
                  : announcement.content 
              }}
            />
            {countdownTime > 0 && (
              <div className="announcement-countdown">
                {countdownTime}秒后可关闭
              </div>
            )}
            {countdownTime === 0 && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Button type="primary" onClick={() => setAnnouncementModalVisible(false)}>
                  我知道了
                </Button>
              </div>
            )}
          </Modal>
        )}
      </Content>
    </Layout>
  );
};

export default SharePage; 