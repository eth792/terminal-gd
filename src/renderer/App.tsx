import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ExecutionPage from './pages/ExecutionPage';
import EnvironmentCheckPage from './pages/EnvironmentCheckPage';
import ShippingReceivingExecutionPage from './pages/ShippingReceivingExecutionPage';
import OrderGenerationExecutionPage from './pages/OrderGenerationExecutionPage';
import ExpenseReimbursementExecutionPage from './pages/ExpenseReimbursementExecutionPage';

const App: React.FC = () => {
  // 从 localStorage 读取认证状态
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  // 从 localStorage 读取环境检查状态
  const [isEnvironmentChecked, setIsEnvironmentChecked] = React.useState<boolean>(() => {
    return localStorage.getItem('isEnvironmentChecked') === 'true';
  });

  // 监听认证状态变化，同步到 localStorage
  const handleAuthChange = (status: boolean) => {
    setIsAuthenticated(status);
    localStorage.setItem('isAuthenticated', status.toString());

    // 登出时清除环境检查状态
    if (!status) {
      setIsEnvironmentChecked(false);
      localStorage.removeItem('isEnvironmentChecked');
    }
  };

  // 监听环境检查状态变化
  const handleEnvironmentCheckComplete = () => {
    setIsEnvironmentChecked(true);
    localStorage.setItem('isEnvironmentChecked', 'true');
  };

  return (
    <Box sx={{ height: '100vh', width: '100vw', m: 0, p: 0, overflow: 'hidden' }}>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ?
            <Navigate to="/environment-check" replace /> :
            <LoginPage onLogin={() => handleAuthChange(true)} />
          }
        />
        <Route
          path="/environment-check"
          element={
            isAuthenticated ? (
              isEnvironmentChecked ?
              <Navigate to="/dashboard" replace /> :
              <EnvironmentCheckPage onComplete={handleEnvironmentCheckComplete} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated && isEnvironmentChecked ?
            <DashboardPage onLogout={() => handleAuthChange(false)} /> :
            <Navigate to={isAuthenticated ? "/environment-check" : "/login"} replace />
          }
        />
        <Route
          path="/execution/:type"
          element={
            isAuthenticated && isEnvironmentChecked ?
            <ExecutionPage /> :
            <Navigate to={isAuthenticated ? "/environment-check" : "/login"} replace />
          }
        />
        <Route
          path="/shipping-receiving"
          element={
            isAuthenticated && isEnvironmentChecked ?
            <ShippingReceivingExecutionPage /> :
            <Navigate to={isAuthenticated ? "/environment-check" : "/login"} replace />
          }
        />
        <Route
          path="/order-generation"
          element={
            isAuthenticated && isEnvironmentChecked ?
            <OrderGenerationExecutionPage /> :
            <Navigate to={isAuthenticated ? "/environment-check" : "/login"} replace />
          }
        />
        <Route
          path="/expense-reimbursement"
          element={
            isAuthenticated && isEnvironmentChecked ?
            <ExpenseReimbursementExecutionPage /> :
            <Navigate to={isAuthenticated ? "/environment-check" : "/login"} replace />
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Box>
  );
};

export default App;