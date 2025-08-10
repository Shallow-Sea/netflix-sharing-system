import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layout, Button, Card, Tabs, Modal, message, Spin, notification } from 'antd';
import { 
  ExclamationCircleOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CloseOutlined,
  WechatOutlined,
  LinkOutlined,
  UserOutlined,
  LockOutlined,
  CalendarOutlined,
  SafetyOutlined,
  GiftOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import './SharePage.css';

const { Content } = Layout;

const SharePage = () => {
  const { code } = useParams();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginCodeModalVisible, setLoginCodeModalVisible] = useState(false);
  const [deviceCodeModalVisible, setDeviceCodeModalVisible] = useState(false);
  const [updateDeviceModalVisible, setUpdateDeviceModalVisible] = useState(false);
  const [verifyCode, setVerifyCode] = useState(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [visibleAnnouncements, setVisibleAnnouncements] = useState([]);
  const [accessPassword, setAccessPassword] = useState('');
  const [wechatModalVisible, setWechatModalVisible] = useState(false);

  // 获取公告数据
  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get('/api/public/announcements');
      const activeAnnouncements = res.data.filter(announcement => 
        announcement.is_active && announcement.show_as_popup
      );
      setAnnouncements(activeAnnouncements);
      setVisibleAnnouncements(activeAnnouncements.slice(0, 3)); // 最多显示3个公告
    } catch (err) {
      console.error('获取公告失败:', err);
    }
  };

  // 获取分享页数据
  useEffect(() => {
    const fetchPageData = async () => {
      try {
        const res = await axios.get(`/api/share/${code}`);
        setPageData(res.data);
      } catch (err) {
        console.error('获取分享页信息失败:', err);
        message.error('获取分享页信息失败: ' + (err.response?.data?.msg || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
    fetchAnnouncements(); // 同时获取公告
  }, [code]);

  // 显示公告弹窗
  useEffect(() => {
    if (visibleAnnouncements.length > 0) {
      visibleAnnouncements.forEach((announcement, index) => {
        const key = `announcement-${announcement._id}`;
        const hasCountdown = announcement.countdown_seconds > 0;
        const duration = hasCountdown ? announcement.countdown_seconds : 0;
        
        setTimeout(() => {
          const AnnouncementContent = ({ announcement, onClose }) => {
            const [countdown, setCountdown] = useState(announcement.countdown_seconds || 0);
            const [canClose, setCanClose] = useState(!hasCountdown);

            useEffect(() => {
              if (countdown > 0) {
                const timer = setInterval(() => {
                  setCountdown(prev => {
                    if (prev <= 1) {
                      setCanClose(true);
                      clearInterval(timer);
                      return 0;
                    }
                    return prev - 1;
                  });
                }, 1000);
                return () => clearInterval(timer);
              } else {
                setCanClose(true);
              }
            }, [countdown]);

            const handleClose = () => {
              if (canClose) {
                onClose();
              }
            };

            return (
              <div className="custom-announcement">
                <div className="announcement-header">
                  <span>{announcement.title}</span>
                  <Button
                    className="announcement-close-btn"
                    icon={<CloseOutlined />}
                    onClick={handleClose}
                    disabled={!canClose}
                    size="small"
                  />
                </div>
                <div className="announcement-content">
                  {announcement.format === 'html' ? (
                    <div dangerouslySetInnerHTML={{ __html: announcement.content }} />
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{announcement.content}</div>
                  )}
                </div>
                {hasCountdown && (
                  <div className="announcement-countdown">
                    <span>
                      {countdown > 0 ? (
                        <>自动关闭倒计时：<span className="countdown-timer">{countdown}</span> 秒</>
                      ) : (
                        '现在可以手动关闭'
                      )}
                    </span>
                  </div>
                )}
              </div>
            );
          };

          notification.open({
            key,
            message: null,
            description: (
              <AnnouncementContent
                announcement={announcement}
                onClose={() => closeAnnouncement(announcement._id)}
              />
            ),
            duration: 0, // 不自动关闭，由我们控制
            placement: 'topRight',
            style: {
              marginTop: index * 140 + 20,
              padding: 0,
              background: 'transparent',
              boxShadow: 'none',
              border: 'none',
            },
            className: 'custom-announcement-notification',
            closeIcon: null, // 隐藏默认关闭按钮
          });
        }, index * 500);
      });
    }
  }, [visibleAnnouncements]);

  // 手动关闭公告
  const closeAnnouncement = (announcementId) => {
    notification.destroy(`announcement-${announcementId}`);
    setVisibleAnnouncements(prev => 
      prev.filter(a => a._id !== announcementId)
    );
  };

  // 显示微信推荐弹窗
  const showWechatModal = () => {
    setWechatModalVisible(true);
  };

  // 复制微信号并跳转到微信
  const copyWechatAndOpen = async () => {
    const wechatId = 'CatCar88';
    try {
      await navigator.clipboard.writeText(wechatId);
      message.success('微信号已复制到剪贴板！');
      
      // 尝试打开微信
      const wechatUrl = `weixin://`;
      window.location.href = wechatUrl;
      
      // 如果微信协议不起作用，显示提示
      setTimeout(() => {
        message.info('请在微信中搜索：' + wechatId);
      }, 1000);
    } catch (err) {
      // 复制失败的备用方案
      const textArea = document.createElement('textarea');
      textArea.value = wechatId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      message.success('微信号已复制到剪贴板！');
    }
  };

  // 只复制微信号
  const copyWechatId = async () => {
    const wechatId = 'CatCar88';
    try {
      await navigator.clipboard.writeText(wechatId);
      message.success('微信号已复制！');
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = wechatId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      message.success('微信号已复制！');
    }
  };

  // 获取登录验证码
  const getLoginCode = async () => {
    setLoadingCode(true);
    try {
      const res = await axios.post(`/api/share/${code}/verify-code`, { 
        type: 'login',
        password: accessPassword
      });
      
      if (res.data.status === 'fetching') {
        // 显示获取中状态
        setVerifyCode('获取中...');
        setLoginCodeModalVisible(true);
        
        message.info({
          content: res.data.msg || '正在从邮箱获取验证码，请稍候...',
          duration: 0,
          key: 'fetching-login-code'
        });
        
        // 开始轮询检查验证码状态
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await axios.get(`/api/share/${code}/verify-code-status`, {
              params: { type: 'login' }
            });
            
            if (statusResponse.data.code && statusResponse.data.code !== '获取中...') {
              setVerifyCode(statusResponse.data.code);
              message.destroy('fetching-login-code');
              message.success(`验证码已获取${statusResponse.data.source === 'email_api' ? '（邮箱）' : ''}`);
              clearInterval(pollInterval);
            }
          } catch (pollError) {
            console.error('轮询验证码状态失败:', pollError);
          }
        }, 5000);
        
        // 60秒后停止轮询
        setTimeout(() => {
          clearInterval(pollInterval);
          message.destroy('fetching-login-code');
          if (verifyCode === '获取中...') {
            setVerifyCode('获取超时，请重试');
            message.warning('验证码获取超时，请重试或联系管理员');
          }
        }, 60000);
        
      } else if (res.data.code) {
      setVerifyCode(res.data.code);
      setLoginCodeModalVisible(true);
        message.success(res.data.msg || '验证码已获取');
      }
    } catch (err) {
      console.error('获取验证码失败:', err);
      message.error(err.response?.data?.msg || '获取验证码失败');
    } finally {
      setLoadingCode(false);
    }
  };

  // 获取同户验证码
  const getDeviceCode = async () => {
    setLoadingCode(true);
    try {
      const res = await axios.post(`/api/share/${code}/verify-code`, { 
        type: 'device',
        password: accessPassword
      });
      
      if (res.data.status === 'fetching') {
        // 显示获取中状态
        setVerifyCode('获取中...');
        setDeviceCodeModalVisible(true);
        
        message.info({
          content: res.data.msg || '正在从邮箱获取验证码，请稍候...',
          duration: 0,
          key: 'fetching-device-code'
        });
        
        // 开始轮询检查验证码状态
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await axios.get(`/api/share/${code}/verify-code-status`, {
              params: { type: 'device' }
            });
            
            if (statusResponse.data.code && statusResponse.data.code !== '获取中...') {
              setVerifyCode(statusResponse.data.code);
              message.destroy('fetching-device-code');
              message.success(`验证码已获取${statusResponse.data.source === 'email_api' ? '（邮箱）' : ''}`);
              clearInterval(pollInterval);
            }
          } catch (pollError) {
            console.error('轮询验证码状态失败:', pollError);
          }
        }, 5000);
        
        // 60秒后停止轮询
        setTimeout(() => {
          clearInterval(pollInterval);
          message.destroy('fetching-device-code');
          if (verifyCode === '获取中...') {
            setVerifyCode('获取超时，请重试');
            message.warning('验证码获取超时，请重试或联系管理员');
          }
        }, 60000);
        
      } else if (res.data.code) {
      setVerifyCode(res.data.code);
      setDeviceCodeModalVisible(true);
        message.success(res.data.msg || '验证码已获取');
      }
    } catch (err) {
      console.error('获取验证码失败:', err);
      message.error(err.response?.data?.msg || '获取验证码失败');
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
  const copyToClipboard = async (text, label = '内容') => {
    try {
      await navigator.clipboard.writeText(text);
      notification.success({
        message: '复制成功',
        description: `${label}已复制到剪贴板`,
        placement: 'topRight',
        duration: 2,
      });
    } catch (err) {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      message.success(`${label}复制成功`);
    }
  };

  // 激活分享页
  const activateSharePage = async () => {
    setIsActivating(true);
    try {
      const res = await axios.post(`/api/share/${code}/activate`);
      message.success(res.data.msg || '激活成功');
      
      // 重新获取页面数据
      const updatedRes = await axios.get(`/api/share/${code}`);
      setPageData(updatedRes.data);
    } catch (err) {
      console.error('激活失败:', err);
      message.error('激活失败: ' + (err.response?.data?.msg || err.message));
    } finally {
      setIsActivating(false);
    }
  };

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

  // 处理未激活状态
  if (pageData && pageData.requires_activation) {
    return (
      <Layout className="share-page-layout">
        <Content className="share-page-content">
          <div className="share-page-container">
            <Card className="activation-card">
              <div className="activation-header">
                <SafetyOutlined className="activation-icon" />
                <h2>分享页激活</h2>
              </div>
              <div className="activation-content">
                <p className="activation-notice">
                  {pageData.activation_info?.message || '此分享页尚未激活，请点击下方按钮激活使用'}
                </p>
                <p className="activation-duration">
                  {pageData.activation_info?.duration_description || `激活后有效期为${pageData.duration_days}天`}
                </p>
                <Button 
                  type="primary" 
                  size="large" 
                  onClick={activateSharePage}
                  loading={isActivating}
                  className="activation-btn"
                >
                  {isActivating ? '激活中...' : '立即激活'}
                </Button>
              </div>
            </Card>
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
            <h2>分享页不存在或已过期</h2>
          </div>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className="share-page-layout">
      <Content className="share-page-content">
        <div className="share-page-container">
          {/* 头部卡片 */}
          <Card className="header-card">
            <div className="header-content">
              <div className="brand-section">
                <GiftOutlined className="brand-icon" />
                <h1 className="brand-title">奈飞高级合租</h1>
                <span className="brand-subtitle">优质稳定 · 即时激活</span>
              </div>
              <div className="invite-section">
                <span className="invite-text">邀请好友购买享20%佣金</span>
                <Button type="primary" className="invite-btn" onClick={showWechatModal}>去推荐</Button>
              </div>
            </div>
          </Card>

          {/* 账号信息卡片 */}
          <Card className="account-card">
            <div className="account-header">
              <UserOutlined className="account-icon" />
              <h2>我的车票 · 登录信息</h2>
              <span className="account-code">#{code}</span>
            </div>
            
            <div className="account-notice">
              <ExclamationCircleOutlined />
              <span>请对号入座，严禁二次共享，违规使用将封号拉黑</span>
            </div>

            <div className="account-info">
              {/* 账号信息 */}
              <div className="credential-item">
                <div className="credential-label">
                  <UserOutlined />
                  <span>账号</span>
                </div>
                <div className="credential-value">
                  <span className="credential-text">{pageData.account?.username}</span>
                  <Button 
                    type="text" 
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(pageData.account?.username, '账号')}
                    className="copy-btn"
                  >
                    复制
                  </Button>
                </div>
              </div>

              {/* 密码信息 */}
              <div className="credential-item">
                <div className="credential-label">
                  <LockOutlined />
                  <span>密码</span>
                </div>
                <div className="credential-value">
                  <span className="credential-text">
                    {passwordVisible ? pageData.account?.password : '••••••••'}
                  </span>
                  <Button 
                    type="text" 
                    icon={passwordVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="toggle-btn"
                  />
                  <Button 
                    type="text" 
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(pageData.account?.password, '密码')}
                    className="copy-btn"
                  >
                    复制
                  </Button>
                </div>
              </div>

              {/* 车位信息 */}
              <div className="profile-section">
                <div className="profile-info">
                  <span className="profile-text">请使用第</span>
                  <span className="profile-number">{pageData.account?.profile_position}</span>
                  <span className="profile-text">个头像位置</span>
                  {pageData.account?.pin && (
                    <div className="pin-info">
                      <span className="pin-label">PIN码:</span>
                      <span className="pin-value">{pageData.account.pin}</span>
                      <Button 
                        type="text" 
                        icon={<CopyOutlined />}
                        onClick={() => copyToClipboard(pageData.account.pin, 'PIN码')}
                        size="small"
                      />
                </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* 操作按钮卡片 */}
          <Card className="actions-card">
            <div className="actions-grid">
              <Button 
                className="action-btn primary"
                onClick={getLoginCode}
                loading={loadingCode}
                icon={<SafetyOutlined />}
              >
                <span className="btn-title">获取验证码</span>
                <span className="btn-subtitle">临时/旅游验证</span>
              </Button>
              
              <Button 
                className="action-btn secondary"
                onClick={updateDevice}
                loading={loadingCode}
                icon={<SafetyOutlined />}
              >
                <span className="btn-title">更新设备</span>
                <span className="btn-subtitle">电视同户设备</span>
              </Button>
              </div>
          </Card>

          {/* 时间信息卡片 */}
          <Card className="time-card">
            <div className="time-header">
              <CalendarOutlined />
              <span>使用期限</span>
            </div>
            <div className="time-info">
              <div className="time-item">
                <span className="time-label">开始时间</span>
                <span className="time-value">
                  {pageData.start_time ? moment(pageData.start_time).format('YYYY年MM月DD日') : '立即开始'}
                </span>
              </div>
              <div className="time-divider">~</div>
              <div className="time-item">
                <span className="time-label">到期时间</span>
                <span className="time-value highlight">
                  {pageData.end_time ? moment(pageData.end_time).format('YYYY年MM月DD日') : '未设置'}
                </span>
              </div>
            </div>
          </Card>

          {/* 服务说明卡片 */}
          <Card className="service-card">
            <div className="service-header">
              <h3>🎬 奈飞高级车 · 提前续费不换号</h3>
            </div>
            <div className="service-features">
              <div className="feature-item">✨ 4K超高清画质</div>
              <div className="feature-item">📱 支持4台设备同时观看</div>
              <div className="feature-item">🌍 全球内容库访问</div>
              <div className="feature-item">🔄 自动续费保障</div>
            </div>
          </Card>

          {/* 常见问题卡片 */}
          <Card className="faq-card">
            <div className="faq-header">
              <h3>常见问题解决方案</h3>
              <p className="faq-subtitle">遇到问题？这里有详细的解决方案</p>
            </div>
            <Tabs 
              defaultActiveKey="1" 
              className="faq-tabs"
              items={[
                {
                  key: '1',
                  label: '🌐 地区不支持',
                  children: (
                    <div className="faq-content">
                      <h4>解决方案：</h4>
                      <div className="solution-list">
                        <div className="solution-item">
                          <strong>📱 手机操作：</strong>
                          <p>关闭App → 切换网络地区（美国/新加坡/台湾/日本）→ 重新打开App登录</p>
                        </div>
                        <div className="solution-item">
                          <strong>💻 电脑操作：</strong>
                          <p>切换网络地区 → 清除浏览器缓存 → 无痕模式登录</p>
                        </div>
                        <div className="solution-item">
                          <strong>📺 电视操作：</strong>
                          <p>重启设备 → 切换节点 → 重新登录</p>
                        </div>
                      </div>
                    </div>
                  )
                },
                {
                  key: '2',
                  label: '🔐 同户验证',
                  children: (
                    <div className="faq-content">
                      <h4>操作步骤：</h4>
                      <div className="step-list">
                        <div className="step-item">
                          <span className="step-number">1</span>
                          <p>点击"我在旅行（暂时收看）"→ 发送邮件</p>
                        </div>
                        <div className="step-item">
                          <span className="step-number">2</span>
                          <p>在车票页面点击"获取验证码"按钮</p>
                        </div>
                        <div className="step-item">
                          <span className="step-number">3</span>
                          <p>输入获取到的验证码完成验证</p>
                        </div>
                      </div>
                    </div>
                  )
                },
                {
                  key: '3',
                  label: '📺 内容少',
                  children: (
                    <div className="faq-content">
                      <h4>解决方案：</h4>
                      <p>内容库随地区变化，如果只能看到自制剧，请尝试切换到其他地区节点：</p>
                      <div className="region-list">
                        <span className="region-tag">🇺🇸 美国</span>
                        <span className="region-tag">🇯🇵 日本</span>
                        <span className="region-tag">🇸🇬 新加坡</span>
                        <span className="region-tag">🇹🇼 台湾</span>
                      </div>
                    </div>
                  )
                },
                {
                  key: '4',
                  label: '⏰ 到期提示',
                  children: (
                    <div className="faq-content">
                      <h4>无需担心：</h4>
                      <p>系统显示的到期提示不影响正常观看，我们的系统会自动续费，请放心使用。</p>
                      <div className="assurance">
                        <CheckCircleOutlined className="check-icon" />
                        <span>自动续费保障，无需担心中断</span>
                      </div>
                    </div>
                  )
                }
              ]}
            />
          </Card>

          {/* 使用提醒 */}
          <div className="usage-tips">
            <p>💡 推荐使用一次性验证码登录，更加安全便捷</p>
          </div>
        </div>

        {/* 登录验证码模态框 */}
        <Modal
          title="登录验证码"
          open={loginCodeModalVisible}
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
          open={deviceCodeModalVisible}
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
          open={updateDeviceModalVisible}
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

        {/* 微信推荐弹窗 */}
        <Modal
          title="联系售后客服"
          open={wechatModalVisible}
          onCancel={() => setWechatModalVisible(false)}
          footer={null}
          className="wechat-modal"
          centered
        >
          <div className="wechat-contact-content">
            <WechatOutlined className="wechat-icon" />
            
            <div className="wechat-info">
              <div className="wechat-label">售后微信</div>
              <div className="wechat-id">CatCar88</div>
              
              <div className="wechat-actions">
                <Button 
                  className="wechat-copy-btn"
                  icon={<CopyOutlined />}
                  onClick={copyWechatId}
                >
                  复制微信号
                </Button>
                <Button 
                  className="wechat-open-btn"
                  icon={<LinkOutlined />}
                  onClick={copyWechatAndOpen}
                >
                  复制并打开微信
                </Button>
              </div>
            </div>

            <div className="wechat-tip">
              💡 复制微信号后，在微信中搜索添加好友即可联系我们的专业售后团队
            </div>
          </div>
        </Modal>
      </Content>
    </Layout>
  );
};

export default SharePage; 