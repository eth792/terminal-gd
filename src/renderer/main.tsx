import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';

// Material UI 主题配置
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#009c86',
      light: '#4db6ac',
      dark: '#00695c',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#26a69a',
      light: '#80cbc4',
      dark: '#00695c',
      contrastText: '#ffffff',
    },
    success: {
      main: '#4caf50',
    },
    warning: {
      main: '#ff9800',
    },
    error: {
      main: '#f44336',
    },
    background: {
      default: '#f5f7fa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Microsoft YaHei", "PingFang SC", "Helvetica Neue", "Arial", sans-serif',
    h1: {
      color: '#009c86',
    },
    h2: {
      color: '#009c86',
    },
    h3: {
      color: '#009c86',
    },
    h4: {
      color: '#009c86',
    },
    h5: {
      color: '#009c86',
    },
    h6: {
      color: '#009c86',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0, 156, 134, 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#009c86',
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <App />
      </HashRouter>
    </ThemeProvider>
  </React.StrictMode>
);