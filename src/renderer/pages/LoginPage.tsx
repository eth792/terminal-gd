import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // 清除错误信息
    if (error) setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // 表单验证
    if (!formData.username.trim()) {
      setError('请输入用户名');
      return;
    }

    if (!formData.password.trim()) {
      setError('请输入密码');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 模拟登录请求（实际项目中应该调用真实的认证 API）
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 简单的模拟认证逻辑
      if (formData.username === 'admin' && formData.password === 'admin') {
        // 如果选择记住密码，可以在这里保存到本地存储
        if (formData.rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('username', formData.username);
        }
        onLogin();
      } else {
        setError('用户名或密码错误');
      }
    } catch (err) {
      setError('登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 组件挂载时检查是否有记住的用户信息
  React.useEffect(() => {
    const rememberMe = localStorage.getItem('rememberMe');
    const savedUsername = localStorage.getItem('username');

    if (rememberMe === 'true' && savedUsername) {
      setFormData(prev => ({
        ...prev,
        username: savedUsername,
        rememberMe: true,
      }));
    }
  }, []);

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #009c86 0%, #4db6ac 100%)',
      }}
    >
      <Paper
        elevation={10}
        sx={{
          p: 4,
          maxWidth: 400,
          width: '100%',
          mx: 2,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <LoginIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            RPA自动化工具
          </Typography>
          <Typography variant="body2" color="text.secondary">
            请登录以继续使用
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            name="username"
            label="用户名"
            variant="outlined"
            margin="normal"
            value={formData.username}
            onChange={handleInputChange}
            disabled={isLoading}
            autoFocus
          />

          <TextField
            fullWidth
            name="password"
            label="密码"
            type="password"
            variant="outlined"
            margin="normal"
            value={formData.password}
            onChange={handleInputChange}
            disabled={isLoading}
          />

          <FormControlLabel
            control={
              <Checkbox
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            }
            label="记住密码"
            sx={{ mt: 1, mb: 2 }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{ mt: 1, py: 1.5 }}
          >
            {isLoading ? (
              <CircularProgress size={24} />
            ) : (
              '登录'
            )}
          </Button>
        </Box>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            默认用户名/密码: admin/admin
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default LoginPage;