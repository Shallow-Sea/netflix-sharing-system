import React, { useState } from 'react';
import { Alert } from 'antd';

const DevWarningBanner = () => {
  const [visible, setVisible] = useState(true);

  // 只在开发环境显示
  if (process.env.NODE_ENV !== 'development' || !visible) {
    return null;
  }

  return (
    <Alert
      message="开发环境提示"
      description="您正在使用开发版本。如果看到 ResizeObserver 相关错误，这是正常现象，不会影响生产环境使用。"
      type="info"
      closable
      showIcon
      onClose={() => setVisible(false)}
      style={{
        margin: '8px 16px',
        borderRadius: '6px'
      }}
      banner
    />
  );
};

export default DevWarningBanner;
