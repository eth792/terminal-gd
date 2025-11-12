import { app, BrowserWindow, ipcMain, globalShortcut, shell, dialog } from 'electron';
import * as path from 'path';
import * as url from 'url';
import { ScriptExecutor } from './scriptExecutor';
import { EnvironmentChecker } from './environmentChecker';
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
let environmentChecker: EnvironmentChecker | null = null;

const isDevelopment = process.env.NODE_ENV === 'development';
console.log('Application Starting...');
console.log('Environment:', process.env.NODE_ENV);

function createWindow(): void {
  // 根据平台设置不同的窗口尺寸
  const isWindows = process.platform === 'win32';
  const windowWidth = isWindows ? 1400 : 1200; // Windows下宽度设为1400
  const windowHeight = isWindows ? 900 : 800;  // Windows下高度也稍微增加
  const minWindowWidth = isWindows ? 1000 : 800; // Windows下最小宽度也增加
  
  // 创建主窗口
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: minWindowWidth,
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
      // 创建环境检测器实例
      environmentChecker = new EnvironmentChecker();
    }
  });

  // 窗口关闭事件
  mainWindow.on('closed', () => {
    if (scriptExecutor) {
      scriptExecutor.stopAllProcesses();
      scriptExecutor = null;
    }
    environmentChecker = null;
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
ipcMain.handle('execute-script', async (_event, scriptData) => {
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

// 环境检查
ipcMain.handle('check-environments', async () => {
  if (!environmentChecker) {
    return [
      { name: 'Node.js', version: null, status: 'error', message: '环境检测器未初始化' },
      { name: 'Python', version: null, status: 'error', message: '环境检测器未初始化' },
      { name: 'Java', version: null, status: 'error', message: '环境检测器未初始化' },
    ];
  }

  try {
    const results = await environmentChecker.checkAllEnvironments();
    return results;
  } catch (error) {
    log.error('Environment check failed:', error);
    return [
      { name: 'Node.js', version: null, status: 'error', message: '检查失败' },
      { name: 'Python', version: null, status: 'error', message: '检查失败' },
      { name: 'Java', version: null, status: 'error', message: '检查失败' },
    ];
  }
});

// 打开外部链接
ipcMain.handle('open-external', async (_event, url: string) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    log.error('Failed to open external URL:', error);
    return { success: false, error: String(error) };
  }
});

// 打开文件选择对话框
ipcMain.handle('open-file-dialog', async (_event, options?: {
  title?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles' | 'createDirectory'>;
}) => {
  try {
    const result = await dialog.showOpenDialog({
      title: options?.title || '选择文件',
      filters: options?.filters || [
        { name: 'Python Files', extensions: ['py'] },
        { name: 'JavaScript Files', extensions: ['js'] },
        { name: 'Java Files', extensions: ['java'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: options?.properties || ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    return {
      canceled: false,
      filePath: result.filePaths[0]
    };
  } catch (error) {
    log.error('Failed to open file dialog:', error);
    return { canceled: true, error: String(error) };
  }
});