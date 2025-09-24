import React, { useEffect, useRef } from 'react';
import {
  Box,
  List,
  ListItem,
  Typography,
  Chip,
  TextField,
  IconButton,
  Toolbar,
  Button,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  GetApp as DownloadIcon,
} from '@mui/icons-material';
import { LogMessage } from '../types';

interface LogViewerProps {
  logs: LogMessage[];
  maxHeight?: string;
  searchable?: boolean;
  exportable?: boolean;
}

const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  maxHeight = '400px',
  searchable = true,
  exportable = true,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [autoScroll, setAutoScroll] = React.useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // 过滤日志
  const filteredLogs = logs.filter(log =>
    log.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 获取日志级别的颜色
  const getLogLevelColor = (level: LogMessage['level']) => {
    switch (level) {
      case 'SUCCESS':
        return 'success';
      case 'WARNING':
        return 'warning';
      case 'ERROR':
        return 'error';
      case 'INFO':
      default:
        return 'default';
    }
  };

  // 导出日志
  const handleExport = () => {
    const logContent = logs
      .map(log => `[${log.timestamp.toLocaleString()}] ${log.level}: ${log.message}`)
      .join('\n');

    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rpa-logs-${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 清空日志
  const handleClear = () => {
    // 这个功能需要父组件支持
    console.log('Clear logs');
  };

  // 处理滚动事件
  const handleScroll = (e: React.UIEvent) => {
    const element = e.target as HTMLDivElement;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
    setAutoScroll(isAtBottom);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 工具栏 */}
      {(searchable || exportable) && (
        <Toolbar variant="dense" sx={{ minHeight: 48, px: 2 }}>
          {searchable && (
            <TextField
              size="small"
              placeholder="搜索日志..."
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
              }}
              sx={{ flexGrow: 1, mr: 1 }}
            />
          )}

          {exportable && (
            <Button
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              disabled={logs.length === 0}
            >
              导出
            </Button>
          )}

          <IconButton
            size="small"
            onClick={handleClear}
            disabled={logs.length === 0}
            sx={{ ml: 1 }}
          >
            <ClearIcon />
          </IconButton>
        </Toolbar>
      )}

      {/* 日志列表 */}
      <Box
        ref={listRef}
        sx={{
          flexGrow: 1,
          maxHeight,
          overflow: 'auto',
          bgcolor: 'grey.50',
          border: '1px solid',
          borderColor: 'divider',
        }}
        onScroll={handleScroll}
      >
        {filteredLogs.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
            {logs.length === 0 ? '暂无日志' : '未找到匹配的日志'}
          </Box>
        ) : (
          <List dense sx={{ p: 0 }}>
            {filteredLogs.map((log, index) => (
              <ListItem
                key={log.id}
                sx={{
                  py: 0.5,
                  px: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: index % 2 === 0 ? 'background.default' : 'grey.50',
                }}
              >
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Chip
                      size="small"
                      label={log.level}
                      color={getLogLevelColor(log.level) as any}
                      variant="outlined"
                      sx={{ mr: 1, minWidth: 80 }}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {log.timestamp.toLocaleTimeString()}
                    </Typography>
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      color: log.level === 'ERROR' ? 'error.main' : 'text.primary',
                    }}
                  >
                    {log.message}
                  </Typography>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
        <div ref={endRef} />
      </Box>

      {/* 状态栏 */}
      <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'grey.100' }}>
        <Typography variant="caption" color="text.secondary">
          共 {logs.length} 条日志
          {searchTerm && ` (筛选出 ${filteredLogs.length} 条)`}
          {!autoScroll && ' - 点击底部可自动滚动'}
        </Typography>
      </Box>
    </Box>
  );
};

export default LogViewer;