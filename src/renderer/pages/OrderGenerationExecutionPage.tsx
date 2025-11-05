import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Grid,
  Paper,
  LinearProgress,
  Divider,
  Chip,
  Alert,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ArrowBack,
  PlayArrow,
  Stop,
  Refresh,
  FolderOpen,
} from '@mui/icons-material';
import { ExecutionState, ExecutionStatus, LogMessage } from '../types';
import LogViewer from '../components/LogViewer';

const OrderGenerationExecutionPage: React.FC = () => {
  const navigate = useNavigate();
  const [executionState, setExecutionState] = useState<ExecutionState>({
    status: 'idle',
    progress: 0,
    logs: [],
  });

  const [scriptConfig, setScriptConfig] = useState({
    language: 'python',
    filePath: 'test_scripts/hello.py', // 默认文件路径
    args: '',
  });

  // 添加日志消息
  const addLog = (level: LogMessage['level'], message: string) => {
    const newLog: LogMessage = {
      id: Date.now().toString(),
      level,
      message,
      timestamp: new Date().toISOString(),
    };

    setExecutionState(prev => ({
      ...prev,
      logs: [...prev.logs, newLog],
    }));
  };

  // 设置日志监听
  useEffect(() => {
    if (window.electronAPI) {
      const unsubscribe = window.electronAPI.onLogMessage((logData: any) => {
        addLog(logData.level, logData.message);
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  // 选择文件
  const handleSelectFile = async () => {
    if (!window.electronAPI) {
      addLog('WARNING', 'Electron API 不可用');
      return;
    }

    try {
      const result = await window.electronAPI.openFileDialog({
        title: '选择脚本文件',
        filters: [
          { name: 'Python Files', extensions: ['py'] },
          { name: 'JavaScript Files', extensions: ['js'] },
          { name: 'Java Files', extensions: ['java'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (!result.canceled && result.filePath) {
        setScriptConfig(prev => ({ ...prev, filePath: result.filePath ?? '' }));
        addLog('INFO', `已选择文件: ${result.filePath}`);

        // 根据文件扩展名自动设置语言
        if (result.filePath.endsWith('.py')) {
          setScriptConfig(prev => ({ ...prev, language: 'python' }));
        } else if (result.filePath.endsWith('.js')) {
          setScriptConfig(prev => ({ ...prev, language: 'nodejs' }));
        } else if (result.filePath.endsWith('.java')) {
          setScriptConfig(prev => ({ ...prev, language: 'java' }));
        }
      }
    } catch (error) {
      addLog('ERROR', `选择文件失败: ${error}`);
    }
  };

  // 执行脚本
  const handleExecute = async () => {
    setExecutionState(prev => ({ ...prev, status: 'running', progress: 0 }));
    addLog('INFO', '开始执行脚本...');

    try {
      // 模拟执行过程
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setExecutionState(prev => ({ ...prev, progress: i }));

        if (i === 30) {
          addLog('INFO', '正在初始化执行环境...');
        } else if (i === 60) {
          addLog('SUCCESS', '脚本执行中...');
        } else if (i === 90) {
          addLog('INFO', '正在生成执行结果...');
        }
      }

      // 调用 Electron API 执行脚本（实际实现）
      if (window.electronAPI) {
        const executionData: any = {
          type: scriptConfig.language,
          filePath: scriptConfig.filePath,
          args: scriptConfig.args ? scriptConfig.args.split(' ') : [],
        };

        const result = await window.electronAPI.executeScript(executionData);

        if (result.success) {
          addLog('SUCCESS', '脚本执行完成');
          setExecutionState(prev => ({ ...prev, status: 'completed' }));
        } else {
          addLog('ERROR', `执行失败: ${result.error || '未知错误'}`);
          setExecutionState(prev => ({ ...prev, status: 'error' }));
        }
      } else {
        addLog('SUCCESS', '脚本执行完成（模拟模式）');
        setExecutionState(prev => ({ ...prev, status: 'completed' }));
      }
    } catch (error) {
      addLog('ERROR', `执行错误: ${error}`);
      setExecutionState(prev => ({ ...prev, status: 'error' }));
    }
  };

  // 停止执行
  const handleStop = () => {
    setExecutionState(prev => ({ ...prev, status: 'idle', progress: 0 }));
    addLog('WARNING', '执行已停止');
  };

  // 重置状态
  const handleReset = () => {
    setExecutionState({
      status: 'idle',
      progress: 0,
      logs: [],
    });
  };

  const getStatusColor = (status: ExecutionStatus) => {
    switch (status) {
      case 'running':
        return 'primary';
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'paused':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: ExecutionStatus) => {
    switch (status) {
      case 'idle':
        return '待运行';
      case 'running':
        return '运行中';
      case 'completed':
        return '已完成';
      case 'error':
        return '执行错误';
      case 'paused':
        return '已暂停';
      default:
        return '未知状态';
    }
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100vh' }}>
      {/* 顶部操作栏 */}
      <AppBar position="static" elevation={2}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            startIcon={<ArrowBack />}
            color="inherit"
            onClick={() => navigate('/dashboard')}
          >
            返回主页
          </Button>

          <Typography variant="h6" component="div" color="inherit">
            订单生成
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Chip
              label={getStatusText(executionState.status)}
              color={getStatusColor(executionState.status) as any}
              variant="filled"
              sx={{ mr: 2 }}
            />

            {executionState.status === 'idle' || executionState.status === 'completed' || executionState.status === 'error' ? (
              <Button
                variant="contained"
                startIcon={<PlayArrow />}
                onClick={handleExecute}
                disabled={!scriptConfig.filePath.trim()}
              >
                运行
              </Button>
            ) : (
              <Button
                variant="contained"
                color="error"
                startIcon={<Stop />}
                onClick={handleStop}
              >
                停止
              </Button>
            )}

            <Button
              startIcon={<Refresh />}
              color="inherit"
              onClick={handleReset}
              sx={{ ml: 1 }}
            >
              重置
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* 进度条 */}
      {executionState.status === 'running' && (
        <LinearProgress
          variant="determinate"
          value={executionState.progress}
          sx={{ height: 4 }}
        />
      )}

      {/* 主要内容区 */}
      <Box sx={{ p: 2, px: 3, height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
        <Grid container spacing={3} sx={{ height: '100%' }}>
          {/* 左侧配置区 */}
          <Grid item xs={12} md={6} sx={{ height: '100%' }}>
            <Paper sx={{ p: 2, height: '100%', overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                脚本配置
              </Typography>

              <FormControl fullWidth margin="normal">
                <InputLabel>脚本语言</InputLabel>
                <Select
                  value={scriptConfig.language}
                  label="脚本语言"
                  onChange={(e) => setScriptConfig(prev => ({ ...prev, language: e.target.value }))}
                >
                  <MenuItem value="python">Python</MenuItem>
                  <MenuItem value="java">Java</MenuItem>
                  <MenuItem value="nodejs">Node.js</MenuItem>
                </Select>
              </FormControl>

              {/* 文件选择 */}
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<FolderOpen />}
                  onClick={handleSelectFile}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  选择脚本文件
                </Button>
                {scriptConfig.filePath && (
                  <Alert severity="info">
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                      已选择文件: {scriptConfig.filePath}
                    </Typography>
                  </Alert>
                )}
              </Box>

              <TextField
                fullWidth
                label="命令行参数"
                variant="outlined"
                margin="normal"
                value={scriptConfig.args}
                onChange={(e) => setScriptConfig(prev => ({ ...prev, args: e.target.value }))}
                placeholder="例如: --input data.csv --output result.json"
              />

              {executionState.currentStep && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  当前步骤: {executionState.currentStep}
                </Alert>
              )}
            </Paper>
          </Grid>

          {/* 右侧日志区 */}
          <Grid item xs={12} md={6} sx={{ height: '100%' }}>
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6">
                  运行日志
                </Typography>
              </Box>
              <Divider />
              <LogViewer
                logs={executionState.logs}
                maxHeight="calc(100vh - 200px)"
              />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default OrderGenerationExecutionPage;
