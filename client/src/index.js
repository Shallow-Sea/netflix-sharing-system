import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import 'antd/dist/antd.css';
import './index.css';
import './styles/modern-accessibility.css';
import { initErrorHandling } from './utils/errorHandler';

// 初始化开发环境错误处理
initErrorHandling();

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
); 