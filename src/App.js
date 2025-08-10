import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import SharePages from './pages/SharePages';
import SharePage from './pages/SharePage';
import Announcements from './pages/Announcements';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // 受保护的路由
  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <Router>
      <Routes>
        {/* 公开路由 */}
        <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
        <Route path="/share/:code" element={<SharePage />} />
        
        {/* 管理员路由 */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Dashboard />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/accounts" 
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Accounts />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/share-pages" 
          element={
            <ProtectedRoute>
              <AdminLayout>
                <SharePages />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/announcements" 
          element={
            <ProtectedRoute>
              <AdminLayout>
                <Announcements />
              </AdminLayout>
            </ProtectedRoute>
          } 
        />
        
        {/* 默认路由 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};

export default App; 