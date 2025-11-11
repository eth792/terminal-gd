import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  ShoppingCart as OrderIcon,
  LocalShipping as ShippingIcon,
  Receipt as ExpenseIcon,
  AccountCircle,
  Logout,
} from '@mui/icons-material';
import { RPAFunction } from '../types';
import SystemMonitor from '../components/SystemMonitor';
import logoImage from '../../logo.jpg';

interface DashboardPageProps {
  onLogout: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  // RPA 功能列表
  const rpaFunctions: RPAFunction[] = [
    {
      id: '1',
      type: 'order-generation',
      name: '订单生成',
      description: '自动化生成销售订单、采购订单，处理订单流程和审批',
      icon: 'shopping_cart',
      enabled: true,
    },
    {
      id: '2',
      type: 'shipping-receiving',
      name: '收发货',
      description: '自动化处理货物收发、物流跟踪、入库出库和库存管理',
      icon: 'local_shipping',
      enabled: true,
    },
    {
      id: '3',
      type: 'expense-reimbursement',
      name: '财务报销',
      description: '自动化处理报销申请、发票识别、审批流程和财务记账',
      icon: 'receipt',
      enabled: true,
    },
  ];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'shopping_cart':
        return <OrderIcon sx={{ fontSize: 48 }} />;
      case 'local_shipping':
        return <ShippingIcon sx={{ fontSize: 48 }} />;
      case 'receipt':
        return <ExpenseIcon sx={{ fontSize: 48 }} />;
      default:
        return <OrderIcon sx={{ fontSize: 48 }} />;
    }
  };

  const handleFunctionClick = (functionType: string) => {
    // 订单生成、收发货和财务报销使用专用页面
    if (functionType === 'order-generation') {
      navigate('/order-generation');
    } else if (functionType === 'shipping-receiving') {
      navigate('/shipping-receiving');
    } else if (functionType === 'expense-reimbursement') {
      navigate('/expense-reimbursement');
    } else {
      navigate(`/execution/${functionType}`);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    onLogout();
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部应用栏 */}
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <img
              src={logoImage}
              alt="Logo"
              style={{
                height: 40,
                width: 'auto',
                marginRight: 8,
              }}
            />
          </Box>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          电力物资合同履约智能化管理
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">
              欢迎，admin
            </Typography>
            <IconButton
              size="large"
              onClick={handleMenuOpen}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} />
              退出登录
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* 主要内容区 */}
      <Box sx={{ flex: 1, p: 2, px: 3, overflow: 'auto' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          电力物资合同履约智能化管理
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          选择您需要使用的业务自动化模块，系统将引导您完成订单生成、收发货管理和财务报销等流程的自动化配置。
        </Typography>

        <Grid container spacing={3}>
          {rpaFunctions.map((func) => (
            <Grid item xs={12} md={6} lg={4} key={func.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                    cursor: 'pointer',
                  },
                }}
                onClick={() => handleFunctionClick(func.type)}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: 3 }}>
                  <Box sx={{ color: 'primary.main', mb: 2 }}>
                    {getIcon(func.icon)}
                  </Box>

                  <Typography variant="h5" component="h2" gutterBottom>
                    {func.name}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    {func.description}
                  </Typography>
                </CardContent>

                <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    disabled={!func.enabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFunctionClick(func.type);
                    }}
                  >
                    开始使用
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* 固定在底部的系统监控和状态信息 */}
      <Box sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        bgcolor: 'background.paper', 
        borderTop: 1, 
        borderColor: 'divider',
        p: 2,
        zIndex: 1000
      }}>
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md={8}>
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                系统状态：正常运行 | 核心模块：订单生成、收发货、财务报销 | 支持的脚本语言：Python, Java, Node.js
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <SystemMonitor compact updateInterval={10000} />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default DashboardPage;