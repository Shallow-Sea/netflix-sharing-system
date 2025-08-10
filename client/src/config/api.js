// API配置文件
const config = {
  development: {
    apiBaseUrl: 'http://localhost:5000',
    timeout: 10000
  },
  production: {
    apiBaseUrl: 'https://catapi.dmid.cc',
    timeout: 30000
  }
};

const env = process.env.NODE_ENV || 'development';
export const API_CONFIG = config[env];

// 创建axios实例的辅助函数
export const createApiInstance = () => {
  const axios = require('axios');
  
  const instance = axios.create({
    baseURL: API_CONFIG.apiBaseUrl,
    timeout: API_CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // 请求拦截器
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['x-auth-token'] = token;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // 响应拦截器
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

export default API_CONFIG;
