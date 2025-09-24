// 用户认证相关类型
export interface User {
  username: string;
  isAuthenticated: boolean;
}

// 脚本执行相关类型
export interface ScriptExecutionData {
  type: 'python' | 'java' | 'nodejs';
  code: string;
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
  id: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  message: string;
  timestamp: Date;
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