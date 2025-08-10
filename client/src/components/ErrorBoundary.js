import React from 'react';
import { Result, Button } from 'antd';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 检查是否是ResizeObserver相关的错误
    if (
      error?.message?.includes('ResizeObserver') ||
      error?.stack?.includes('ResizeObserver')
    ) {
      // 对于ResizeObserver错误，不显示错误页面，只是重置状态
      this.setState({ hasError: false, error: null, errorInfo: null });
      return;
    }

    // 你也可以将错误日志上报给服务器
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReload = () => {
    // 重新加载页面
    window.location.reload();
  };

  handleReset = () => {
    // 重置错误状态
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // 自定义降级后的 UI
      return (
        <div style={{ padding: '50px', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Result
            status="error"
            title="应用程序遇到了错误"
            subTitle="抱歉，页面出现了意外错误。您可以尝试刷新页面或联系技术支持。"
            extra={[
              <Button type="primary" key="reload" onClick={this.handleReload}>
                刷新页面
              </Button>,
              <Button key="reset" onClick={this.handleReset}>
                重试
              </Button>,
            ]}
          >
            {process.env.NODE_ENV === 'development' && (
              <div style={{ textAlign: 'left', marginTop: 20 }}>
                <details style={{ whiteSpace: 'pre-wrap' }}>
                  <summary>错误详情（开发模式）</summary>
                  <div style={{ marginTop: 10, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                    <strong>错误信息:</strong> {this.state.error && this.state.error.toString()}
                    <br />
                    <strong>错误堆栈:</strong>
                    <pre style={{ fontSize: '12px', marginTop: 5 }}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
              </div>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
