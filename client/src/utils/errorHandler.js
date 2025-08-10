// 开发环境错误处理工具
// 用于抑制已知的无害错误和警告

// 抑制ResizeObserver循环错误
const suppressResizeObserverError = () => {
  // 保存原始的console.error
  const originalConsoleError = console.error;
  
  // 重写console.error以过滤特定错误
  console.error = (...args) => {
    // 检查是否是需要抑制的开发环境错误
    const errorMessage = args[0]?.toString() || '';
    
    if (process.env.NODE_ENV === 'development') {
      // ResizeObserver相关错误
      if (
        errorMessage.includes('ResizeObserver loop completed with undelivered notifications') ||
        errorMessage.includes('ResizeObserver loop limit exceeded')
      ) {
        return;
      }
      
      // CSS弃用警告
      if (
        errorMessage.includes('-ms-high-contrast is in the process of being deprecated') ||
        errorMessage.includes('Deprecation') && errorMessage.includes('-ms-high-contrast')
      ) {
        return;
      }
      
      // React Router未来版本警告（这些是信息性的）
      if (
        errorMessage.includes('React Router Future Flag Warning') ||
        errorMessage.includes('v7_startTransition') ||
        errorMessage.includes('v7_relativeSplatPath')
      ) {
        return;
      }
    }
    
    // 对于其他错误，正常输出
    originalConsoleError.apply(console, args);
  };
};

// 全局错误处理器
const setupGlobalErrorHandlers = () => {
  // 处理未捕获的Promise错误
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    // 检查是否是ResizeObserver相关错误
    if (error?.message?.includes('ResizeObserver')) {
      event.preventDefault(); // 阻止错误显示
      return;
    }
    
    // 其他错误正常处理
    console.error('Unhandled promise rejection:', error);
  });

  // 处理运行时错误
  window.addEventListener('error', (event) => {
    const error = event.error;
    
    // 检查是否是ResizeObserver相关错误
    if (error?.message?.includes('ResizeObserver')) {
      event.preventDefault(); // 阻止错误显示
      return;
    }
    
    // 其他错误正常处理
    console.error('Runtime error:', error);
  });
};

// ResizeObserver polyfill/fix
const fixResizeObserver = () => {
  // 如果ResizeObserver存在，添加错误处理
  if (window.ResizeObserver) {
    const OriginalResizeObserver = window.ResizeObserver;
    
    window.ResizeObserver = class extends OriginalResizeObserver {
      constructor(callback) {
        const wrappedCallback = (entries, observer) => {
          window.requestAnimationFrame(() => {
            try {
              callback(entries, observer);
            } catch (error) {
              // 忽略ResizeObserver循环错误
              if (error.message.includes('ResizeObserver loop')) {
                return;
              }
              throw error;
            }
          });
        };
        super(wrappedCallback);
      }
    };
  }
};

// 添加样式来减少布局抖动
const addStabilityStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    /* 减少布局抖动的样式 */
    .ant-table-wrapper {
      contain: layout style paint;
    }
    
    .ant-table-tbody > tr > td {
      transition: none !important;
    }
    
    .ant-modal {
      contain: layout;
    }
    
    /* 防止某些组件导致的重排 */
    .ant-form-item {
      contain: layout;
    }
  `;
  document.head.appendChild(style);
};

// 初始化错误处理
export const initErrorHandling = () => {
  if (process.env.NODE_ENV === 'development') {
    suppressResizeObserverError();
    setupGlobalErrorHandlers();
    fixResizeObserver();
    addStabilityStyles();
    
    console.log('🛡️ Development error handling initialized');
    console.log('📐 ResizeObserver fixes applied');
  }
};

export default {
  initErrorHandling,
  suppressResizeObserverError,
  setupGlobalErrorHandlers
};
