import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Grid,
  Paper,
  Chip,
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Speed as CpuIcon,
  Computer as SystemIcon,
} from '@mui/icons-material';

interface SystemResources {
  cpu: number;
  memory: number;
}

interface SystemMonitorProps {
  updateInterval?: number;
  compact?: boolean;
}

const SystemMonitor: React.FC<SystemMonitorProps> = ({
  updateInterval = 5000,
  compact = false,
}) => {
  const [resources, setResources] = useState<SystemResources>({ cpu: 0, memory: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchSystemResources = async () => {
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.getSystemResources();
        setResources(data);
        setIsLoading(false);
      } catch (error) {
        console.error('获取系统资源失败:', error);
        setIsLoading(false);
      }
    } else {
      // 开发环境模拟数据
      setResources({
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
      });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemResources();

    const interval = setInterval(() => {
      fetchSystemResources();
    }, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval]);

  const getUsageColor = (usage: number) => {
    if (usage < 50) return 'success';
    if (usage < 80) return 'warning';
    return 'error';
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (compact) {
    return (
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Chip
          icon={<CpuIcon />}
          label={`CPU: ${formatPercentage(resources.cpu)}`}
          color={getUsageColor(resources.cpu) as any}
          variant="outlined"
          size="small"
        />
        <Chip
          icon={<MemoryIcon />}
          label={`内存: ${formatPercentage(resources.memory)}`}
          color={getUsageColor(resources.memory) as any}
          variant="outlined"
          size="small"
        />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <SystemIcon sx={{ mr: 1 }} />
        <Typography variant="h6">系统资源监控</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                CPU 使用率
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {formatPercentage(resources.cpu)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={resources.cpu}
              color={getUsageColor(resources.cpu) as any}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                内存使用率
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {formatPercentage(resources.memory)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={resources.memory}
              color={getUsageColor(resources.memory) as any}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        </Grid>
      </Grid>

      {isLoading && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            正在获取系统资源信息...
          </Typography>
        </Box>
      )}

      {!isLoading && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            每 {updateInterval / 1000} 秒更新一次
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default SystemMonitor;