import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BrowserWindow } from 'electron';

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

export class ScriptExecutor {
  private runningProcesses: Map<string, ChildProcess> = new Map();

  constructor(private mainWindow: BrowserWindow | null) {}

  /**
   * 执行脚本
   */
  async executeScript(data: ScriptExecutionData): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // 检查运行环境
      const envCheck = await this.checkEnvironment(data.type);
      if (!envCheck.available) {
        return {
          success: false,
          error: `${data.type} 环境不可用: ${envCheck.message}`,
          executionTime: Date.now() - startTime,
        };
      }

      this.sendLog('INFO', `开始执行 ${data.type} 脚本`);

      // 创建临时文件
      const tempFile = await this.createTempFile(data.type, data.code);
      this.sendLog('INFO', `临时文件创建: ${tempFile}`);

      // 执行脚本
      const result = await this.runScript(data.type, tempFile, data.args || []);

      // 清理临时文件
      this.cleanupTempFile(tempFile);

      return {
        ...result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      this.sendLog('ERROR', `执行失败: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 检查运行环境
   */
  private async checkEnvironment(type: string): Promise<{ available: boolean; message?: string; version?: string }> {
    if (type === 'python') {
      // 对于Python，优先尝试python3，然后尝试python
      const pythonCommands = ['python3', 'python'];

      for (const cmd of pythonCommands) {
        try {
          const { stdout, stderr } = await this.execCommand(cmd, ['--version']);
          const version = stdout || stderr;
          return { available: true, version: version.trim() };
        } catch (error) {
          continue; // 尝试下一个命令
        }
      }

      return {
        available: false,
        message: 'Python 未安装或不在 PATH 中（尝试了python3和python命令）',
      };
    }

    if (type === 'java') {
      // 检查Java运行时和编译器
      try {
        // 检查java命令
        const { stdout: javaStdout, stderr: javaStderr } = await this.execCommand('java', ['-version']);
        const javaVersion = javaStdout || javaStderr;

        // 检查javac命令
        await this.execCommand('javac', ['-version']);

        return { available: true, version: javaVersion.trim() };
      } catch (error) {
        return {
          available: false,
          message: 'Java 环境不完整：需要安装 JDK（包含java和javac命令）',
        };
      }
    }

    const commands = {
      nodejs: ['node', '--version'],
    };

    const command = commands[type as keyof typeof commands];
    if (!command) {
      return { available: false, message: '不支持的脚本类型' };
    }

    try {
      const { stdout, stderr } = await this.execCommand(command[0], [command[1]]);
      const version = stdout || stderr;
      return { available: true, version: version.trim() };
    } catch (error) {
      return {
        available: false,
        message: `${type} 未安装或不在 PATH 中`,
      };
    }
  }

  /**
   * 创建临时文件
   */
  private async createTempFile(type: string, code: string): Promise<string> {
    const extensions = {
      python: '.py',
      java: '.java',
      nodejs: '.js',
    };

    const extension = extensions[type as keyof typeof extensions];
    const tempDir = os.tmpdir();
    const fileName = `rpa_script_${Date.now()}${extension}`;
    const filePath = path.join(tempDir, fileName);

    // 对于 Java，需要确保类名与文件名匹配
    let finalCode = code;
    if (type === 'java') {
      const className = path.basename(fileName, '.java');
      // 简单的类名替换（实际项目中可能需要更复杂的解析）
      finalCode = code.replace(/public\s+class\s+\w+/g, `public class ${className}`);
    }

    await fs.promises.writeFile(filePath, finalCode, 'utf8');
    return filePath;
  }

  /**
   * 获取Python命令
   */
  private async getPythonCommand(): Promise<string> {
    const pythonCommands = ['python3', 'python'];

    for (const cmd of pythonCommands) {
      try {
        await this.execCommand(cmd, ['--version']);
        return cmd; // 返回第一个可用的命令
      } catch (error) {
        continue;
      }
    }

    throw new Error('Python 未找到');
  }

  /**
   * 编译Java文件
   */
  private async compileJavaFile(javaFilePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('javac', [javaFilePath]);

      let stderr = '';

      process.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        this.sendLog('ERROR', `编译错误: ${output.trim()}`);
      });

      process.stdout?.on('data', (data) => {
        const output = data.toString();
        this.sendLog('INFO', `编译信息: ${output.trim()}`);
      });

      process.on('close', (code) => {
        if (code === 0) {
          this.sendLog('SUCCESS', 'Java文件编译成功');
          resolve();
        } else {
          reject(new Error(`编译失败，退出码: ${code}。错误信息: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`编译进程错误: ${error.message}`));
      });
    });
  }

  /**
   * 执行脚本
   */
  private async runScript(type: string, scriptPath: string, args: string[]): Promise<ExecutionResult> {
    return new Promise(async (resolve) => {
      let command: string;

      if (type === 'python') {
        try {
          command = await this.getPythonCommand();
        } catch (error) {
          resolve({
            success: false,
            error: 'Python 未找到或不可用',
          });
          return;
        }
      } else {
        const commands = {
          java: 'java',
          nodejs: 'node',
        };
        command = commands[type as keyof typeof commands] || type;
      }

      let processArgs = [scriptPath, ...args];

      // Java 需要特殊处理：先编译，再执行
      if (type === 'java') {
        try {
          // 先编译Java文件
          await this.compileJavaFile(scriptPath);

          const dir = path.dirname(scriptPath);
          const className = path.basename(scriptPath, '.java');
          command = 'java';
          processArgs = ['-cp', dir, className, ...args];
        } catch (compileError) {
          resolve({
            success: false,
            error: `Java编译失败: ${compileError}`,
          });
          return;
        }
      }

      const process = spawn(command, processArgs);
      const processId = Date.now().toString();
      this.runningProcesses.set(processId, process);

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        this.sendLog('INFO', output.trim());
      });

      process.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        this.sendLog('ERROR', output.trim());
      });

      process.on('close', (code) => {
        this.runningProcesses.delete(processId);

        if (code === 0) {
          this.sendLog('SUCCESS', '脚本执行完成');
          resolve({
            success: true,
            output: stdout,
          });
        } else {
          this.sendLog('ERROR', `脚本执行失败，退出码: ${code}`);
          resolve({
            success: false,
            error: stderr || `进程退出码: ${code}`,
            output: stdout,
          });
        }
      });

      process.on('error', (error) => {
        this.runningProcesses.delete(processId);
        this.sendLog('ERROR', `进程错误: ${error.message}`);
        resolve({
          success: false,
          error: error.message,
        });
      });
    });
  }

  /**
   * 执行命令（用于环境检查）
   */
  private execCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 清理临时文件
   */
  private cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // 对于 Java，还需要清理编译后的 .class 文件
      if (filePath.endsWith('.java')) {
        const classFile = filePath.replace('.java', '.class');
        if (fs.existsSync(classFile)) {
          fs.unlinkSync(classFile);
        }
      }
    } catch (error) {
      console.error('清理临时文件失败:', error);
    }
  }

  /**
   * 发送日志到渲染进程
   */
  private sendLog(level: string, message: string): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('log-message', {
        level,
        message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 停止所有运行中的进程
   */
  stopAllProcesses(): void {
    this.runningProcesses.forEach((process, id) => {
      try {
        process.kill('SIGTERM');
        this.sendLog('WARNING', `已终止进程: ${id}`);
      } catch (error) {
        console.error('停止进程失败:', error);
      }
    });
    this.runningProcesses.clear();
  }

  /**
   * 获取系统资源使用情况
   */
  getSystemResources(): Promise<{ cpu: number; memory: number }> {
    return new Promise((resolve) => {
      // 简单的系统资源监控（实际项目中可能需要更复杂的实现）
      const memoryUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;

      resolve({
        cpu: 0, // CPU 使用率需要更复杂的计算
        memory: (usedMemory / totalMemory) * 100,
      });
    });
  }
}