import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import * as path from 'path';
import * as url from 'url';
import { ScriptExecutor } from './scriptExecutor';
import log from 'electron-log';

// 配置日志
log.initialize({ preload: true });

// 设置日志文件路径
log.transports.file.resolvePathFn = () => path.join(app.getPath('logs'), 'main.log');

// 设置日志级别
log.transports.file.level = 'info';
log.transports.console.level = 'info';

// 将控制台日志重定向到日志文件
console.log = log.log;
console.error = log.error;
console.warn = log.warn;
console.info = log.info;

let mainWindow: BrowserWindow | null = null;
let scriptExecutor: ScriptExecutor | null = null;

const isDevelopment = process.env.NODE_ENV === 'development';
console.log('Application Starting...');
console.log('Environment:', process.env.NODE_ENV);

function createWindow(): void {
  // 创建主窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: isDevelopment,
    },
    titleBarStyle: 'default',
    show: false,
  });

  // 加载应用页面
  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // 生产环境下从构建目录加载
    const rendererPath = path.join(__dirname, 'renderer/index.html');
    console.log('Loading renderer from:', rendererPath);
    console.log('__dirname:', __dirname);
    mainWindow.loadURL(
      url.format({
        pathname: rendererPath,
        protocol: 'file:',
        slashes: true,
      })
    );

    // 生产环境下禁用DevTools
    // mainWindow.webContents.on('devtools-opened', () => {
    //   mainWindow?.webContents.closeDevTools();
    // });
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      // 创建脚本执行器实例
      scriptExecutor = new ScriptExecutor(mainWindow);
    }
  });

  // 窗口关闭事件
  mainWindow.on('closed', () => {
    if (scriptExecutor) {
      scriptExecutor.stopAllProcesses();
      scriptExecutor = null;
    }
    mainWindow = null;
  });
}

// 应用准备就绪
app.whenReady().then(() => {
  createWindow();
  
  // 注册开发者工具快捷键
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });
});

// 所有窗口关闭时退出应用 (macOS 除外)
// 注销所有快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// 所有窗口关闭时退出应用 (macOS 除外)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS 激活应用时创建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC 通信处理
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// 执行脚本的 IPC 处理器
ipcMain.handle('execute-script', async (event, scriptData) => {
  if (!scriptExecutor) {
    return { success: false, error: '脚本执行器未初始化' };
  }

  try {
    const result = await scriptExecutor.executeScript(scriptData);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

// 获取系统资源使用情况
ipcMain.handle('get-system-resources', async () => {
  if (!scriptExecutor) {
    return { cpu: 0, memory: 0 };
  }

  return await scriptExecutor.getSystemResources();
});

// 停止所有运行中的脚本
ipcMain.handle('stop-all-scripts', async () => {
  if (scriptExecutor) {
    scriptExecutor.stopAllProcesses();
  }
  return { success: true };
});