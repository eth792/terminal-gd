import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  ArrowForward as NextIcon,
} from '@mui/icons-material';

interface EnvironmentStatus {
  name: string;
  version: string | null;
  status: 'checking' | 'success' | 'error' | 'warning';
  message: string;
  required: boolean;
}

interface EnvironmentCheckPageProps {
  onComplete: () => void;
}

const EnvironmentCheckPage: React.FC<EnvironmentCheckPageProps> = ({ onComplete }) => {
  const [environments, setEnvironments] = useState<EnvironmentStatus[]>([
    { name: 'Node.js', version: null, status: 'checking', message: '检查中...', required: true },
    { name: 'Python', version: null, status: 'checking', message: '检查中...', required: true },
    { name: 'Java', version: null, status: 'checking', message: '检查中...', required: true },
  ]);

  const [isChecking, setIsChecking] = useState(true);
  const [overallStatus, setOverallStatus] = useState<'checking' | 'success' | 'error' | 'warning'>('checking');

  const checkEnvironments = async () => {
    setIsChecking(true);
    setOverallStatus('checking');

    // 重置所有环境状态为检查中
    setEnvironments(prev => prev.map(env => ({ ...env, status: 'checking' as const, message: '检查中...' })));

    try {
      // 调用主进程检查环境
      const result = await window.electronAPI.checkEnvironments();

      const updatedEnvs = environments.map(env => {
        const envResult = result.find((r: any) => r.name === env.name);
        if (envResult) {
          return {
            ...env,
            version: envResult.version,
            status: envResult.status,
            message: envResult.message,
          };
        }
        return { ...env, status: 'error' as const, message: '检查失败' };
      });

      setEnvironments(updatedEnvs);

      // 计算整体状态
      const hasError = updatedEnvs.some(env => env.required && env.status === 'error');
      const hasWarning = updatedEnvs.some(env => env.status === 'warning');

      if (hasError) {
        setOverallStatus('error');
      } else if (hasWarning) {
        setOverallStatus('warning');
      } else {
        setOverallStatus('success');
      }

    } catch (error) {
      console.error('Environment check failed:', error);
      setEnvironments(prev => prev.map(env => ({
        ...env,
        status: 'error' as const,
        message: '检查失败，请重试'
      })));
      setOverallStatus('error');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkEnvironments();
  }, []);

  const getStatusIcon = (status: EnvironmentStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: EnvironmentStatus['status']) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  const canContinue = () => {
    return true;
    return !isChecking && !environments.some(env => env.required && env.status === 'error');
  };

  const getOverallMessage = () => {
    switch (overallStatus) {
      case 'success':
        return '所有必需环境已就绪，可以继续使用';
      case 'warning':
        return '部分环境存在警告，但可以继续使用';
      case 'error':
        return '存在关键环境问题，请解决后重试';
      default:
        return '正在检查环境...';
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
        环境检查
      </Typography>

      <Paper sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column' }}>
        {/* 整体状态提示 */}
        <Alert
          severity={overallStatus === 'checking' ? 'info' : getStatusColor(overallStatus)}
          sx={{ mb: 3 }}
        >
          {getOverallMessage()}
        </Alert>

        {/* 进度条 */}
        {isChecking && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              正在检查运行环境...
            </Typography>
          </Box>
        )}

        {/* 环境检查结果 */}
        <Grid container spacing={2} sx={{ flex: 1 }}>
          {environments.map((env, index) => (
            <Grid item xs={12} md={4} key={env.name}>
              <Card sx={{ height: '100%', position: 'relative' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                      {env.name}
                    </Typography>
                    {env.required && (
                      <Chip label="必需" size="small" color="primary" variant="outlined" />
                    )}
                  </Box>

                  <List dense>
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {env.status === 'checking' ? (
                          <Box sx={{ width: 20, height: 20, position: 'relative' }}>
                            <LinearProgress
                              variant="indeterminate"
                              sx={{
                                position: 'absolute',
                                top: '50%',
                                left: 0,
                                right: 0,
                                transform: 'translateY(-50%)',
                                height: 4,
                                borderRadius: 2,
                              }}
                            />
                          </Box>
                        ) : (
                          getStatusIcon(env.status)
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary="状态"
                        secondary={
                          <Chip
                            label={env.status === 'checking' ? '检查中' : env.status === 'success' ? '已安装' : env.status === 'warning' ? '警告' : '未找到'}
                            size="small"
                            color={getStatusColor(env.status)}
                            variant="outlined"
                          />
                        }
                      />
                    </ListItem>

                    {env.version && (
                      <ListItem>
                        <ListItemIcon sx={{ minWidth: 36 }} />
                        <ListItemText primary="版本" secondary={env.version} />
                      </ListItem>
                    )}

                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 36 }} />
                      <ListItemText primary="详情" secondary={env.message} />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* 操作按钮 */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={checkEnvironments}
            disabled={isChecking}
          >
            重新检查
          </Button>

          <Button
            variant="contained"
            endIcon={<NextIcon />}
            onClick={onComplete}
            disabled={!canContinue()}
            size="large"
          >
            {canContinue() ? '继续' : '请先解决环境问题'}
          </Button>
        </Box>

        {/* 帮助信息 */}
        {overallStatus === 'error' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>环境安装提示：</strong><br />
              • Node.js: 访问 <a href="#" onClick={(e) => { e.preventDefault(); window.electronAPI?.openExternal?.('https://nodejs.org'); }}>https://nodejs.org</a> 下载安装<br />
              • Python: 访问 <a href="#" onClick={(e) => { e.preventDefault(); window.electronAPI?.openExternal?.('https://python.org'); }}>https://python.org</a> 下载安装<br />
              • Java: 访问 <a href="#" onClick={(e) => { e.preventDefault(); window.electronAPI?.openExternal?.('https://adoptium.net'); }}>https://adoptium.net</a> 下载 OpenJDK
            </Typography>
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default EnvironmentCheckPage;