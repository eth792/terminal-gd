// 用户认证相关类型
export interface User {
  username: string;
  isAuthenticated: boolean;
}

// 脚本执行相关类型
export interface ScriptExecutionData {
  type: 'python' | 'java' | 'nodejs';
  code?: string; // 内联代码（可选）
  filePath?: string; // 脚本文件路径（可选）
  args?: string[];
  workingDirectory?: string;
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
}

// 日志相关类型
export interface LogMessage {
  id?: string;
  level: string;
  message: string;
  timestamp: string;
}

// RPA 功能类型
export type RPAFunctionType = 'order-generation' | 'shipping-receiving' | 'expense-reimbursement';

export interface RPAFunction {
  id: string;
  type: RPAFunctionType;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

// 执行状态
export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'error' | 'paused';

export interface ExecutionState {
  status: ExecutionStatus;
  progress: number;
  currentStep?: string;
  logs: LogMessage[];
}

// 环境检测相关类型
export interface EnvironmentResult {
  name: string;
  version: string | null;
  status: 'success' | 'error' | 'warning';
  message: string;
}

// 系统资源类型
export interface SystemResources {
  cpu: number;
  memory: number;
}

// Electron API 类型定义
export interface ElectronAPI {
  // 应用信息
  getAppVersion: () => Promise<string>;

  // 脚本执行
  executeScript: (scriptData: ScriptExecutionData) => Promise<ExecutionResult>;

  // 系统资源
  getSystemResources: () => Promise<SystemResources>;

  // 停止所有脚本
  stopAllScripts: () => Promise<{ success: boolean }>;

  // 日志监听
  onLogMessage: (callback: (message: LogMessage) => void) => () => void;

  // 移除日志监听器
  removeLogListener: () => void;

  // 环境检查
  checkEnvironments: () => Promise<EnvironmentResult[]>;

  // 打开外部链接
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;

  // 打开文件选择对话框
  openFileDialog: (options?: {
    title?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<{ canceled: boolean; filePath?: string }>;
}

// 扩展Window接口
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}