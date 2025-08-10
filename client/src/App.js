import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import SharePages from './pages/SharePages';
import SharePage from './pages/SharePage';
import Announcements from './pages/Announcements';
import AdminManagement from './pages/AdminManagement';
import AdminLayout from './components/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // 检查是否已认证
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = (token) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  if (loading) {
    return <div>加载中...</div>;
  }

  return (
    <ErrorBoundary>
      <Router 
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Routes>
          {/* 公开路由 */}
          <Route path="/login" element={isAuthenticated ? <Navigate to="/admin" /> : <Login login={login} />} />
          <Route path="/share/:code" element={<SharePage />} />

          {/* 受保护的管理员路由 */}
          <Route path="/admin" element={isAuthenticated ? <AdminLayout logout={logout} /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="share-pages" element={<SharePages />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="admin-management" element={<AdminManagement />} />
          </Route>

          {/* 默认路由重定向 */}
          <Route path="/" element={<Navigate to="/admin" />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
};

export default App; 