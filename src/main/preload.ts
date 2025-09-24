import { contextBridge, ipcRenderer } from 'electron';

// 定义暴露给渲染进程的 API
const electronAPI = {
  // 应用信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // 脚本执行
  executeScript: (scriptData: any) => ipcRenderer.invoke('execute-script', scriptData),

  // 系统资源
  getSystemResources: () => ipcRenderer.invoke('get-system-resources'),

  // 停止所有脚本
  stopAllScripts: () => ipcRenderer.invoke('stop-all-scripts'),

  // 日志监听
  onLogMessage: (callback: (message: any) => void) => {
    ipcRenderer.on('log-message', (_, message) => callback(message));
    return () => ipcRenderer.removeAllListeners('log-message');
  },

  // 移除日志监听器
  removeLogListener: () => {
    ipcRenderer.removeAllListeners('log-message');
  },
};

// 将 API 暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 类型声明
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}