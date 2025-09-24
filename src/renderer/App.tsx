import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ExecutionPage from './pages/ExecutionPage';

const App: React.FC = () => {
  // 从 localStorage 读取认证状态
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  // 监听认证状态变化，同步到 localStorage
  const handleAuthChange = (status: boolean) => {
    setIsAuthenticated(status);
    localStorage.setItem('isAuthenticated', status.toString());
  };

  return (
    <Box sx={{ height: '100vh', width: '100vw', m: 0, p: 0, overflow: 'hidden' }}>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ?
            <Navigate to="/dashboard" replace /> :
            <LoginPage onLogin={() => handleAuthChange(true)} />
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ?
            <DashboardPage onLogout={() => handleAuthChange(false)} /> :
            <Navigate to="/login" replace />
          }
        />
        <Route
          path="/execution/:type"
          element={
            isAuthenticated ?
            <ExecutionPage /> :
            <Navigate to="/login" replace />
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Box>
  );
};

export default App;