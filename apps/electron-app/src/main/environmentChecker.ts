import { exec } from 'child_process';
import { promisify } from 'util';
import log from 'electron-log';
import * as os from 'os';
import * as path from 'path';

const execPromise = promisify(exec);

export interface EnvironmentResult {
  name: string;
  version: string | null;
  status: 'success' | 'error' | 'warning';
  message: string;
}

export class EnvironmentChecker {

  /**
   * 获取带有shell环境的执行选项
   */
  private getShellExecOptions(): { shell: string; env: NodeJS.ProcessEnv } {
    const platform = os.platform();
    const homeDir = os.homedir();
    
    let shell: string;
    let envFiles: string[] = [];

    if (platform === 'win32') {
      shell = 'cmd.exe';
      // Windows通常不需要特殊的环境文件加载
      return { shell, env: process.env };
    } else {
      // Unix-like系统 (macOS, Linux)
      shell = process.env.SHELL || '/bin/bash';
      
      // 根据shell类型确定要加载的配置文件
      if (shell.includes('zsh')) {
        envFiles = [
          path.join(homeDir, '.zshrc'),
          path.join(homeDir, '.zprofile'),
          '/etc/zshrc'
        ];
      } else if (shell.includes('bash')) {
        envFiles = [
          path.join(homeDir, '.bashrc'),
          path.join(homeDir, '.bash_profile'),
          path.join(homeDir, '.profile'),
          '/etc/bashrc',
          '/etc/profile'
        ];
      } else {
        // 其他shell，尝试通用配置文件
        envFiles = [
          path.join(homeDir, '.profile'),
          '/etc/profile'
        ];
      }
    }

    return { shell, env: process.env };
  }

  /**
   * 使用shell环境执行命令
   */
  private async execWithShellEnv(command: string): Promise<{ stdout: string; stderr: string }> {
    const platform = os.platform();

    // 首先尝试直接执行，避免shell环境问题
    try {
      log.debug(`Direct execution: ${command}`);
      return await execPromise(command, {
        env: { ...process.env },
        timeout: 10000 // 10秒超时
      });
    } catch (directError) {
      log.debug(`Direct execution failed: ${directError}. Trying with shell environment...`);

      // 如果直接执行失败，尝试使用shell环境
      if (platform === 'win32') {
        throw directError; // Windows下直接抛出错误
      }

      try {
        const { shell } = this.getShellExecOptions();
        const homeDir = os.homedir();

        // 为了避免ICU库冲突，我们使用更简单的环境加载方式
        let envCommand: string;

        if (shell.includes('zsh')) {
          // 使用login shell来加载完整的环境
          envCommand = `/bin/zsh -l -c "${command}"`;
        } else if (shell.includes('bash')) {
          // 使用login shell来加载完整的环境
          envCommand = `/bin/bash -l -c "${command}"`;
        } else {
          // 默认使用bash
          envCommand = `/bin/bash -l -c "${command}"`;
        }

        log.debug(`Shell execution: ${envCommand}`);
        return await execPromise(envCommand, {
          env: {
            ...process.env,
            // 清理可能导致库冲突的环境变量
            DYLD_LIBRARY_PATH: undefined,
            DYLD_FALLBACK_LIBRARY_PATH: undefined
          },
          timeout: 15000 // 15秒超时
        });
      } catch (shellError) {
        log.error(`Both direct and shell execution failed for command: ${command}`);
        log.error(`Direct error:`, directError);
        log.error(`Shell error:`, shellError);
        throw directError; // 抛出原始错误
      }
    }
  }

  /**
   * 查找Node.js的安装位置
   */
  private async findNodePath(): Promise<string | null> {
    const possiblePaths = [
      '/usr/local/bin/node',
      '/opt/homebrew/bin/node',
      '/usr/bin/node',
      '/bin/node'
    ];

    for (const nodePath of possiblePaths) {
      try {
        await execPromise(`test -f "${nodePath}"`);
        log.debug(`Found Node.js at: ${nodePath}`);
        return nodePath;
      } catch (error) {
        continue;
      }
    }

    // 如果固定路径都找不到，尝试使用which命令
    try {
      const { stdout } = await execPromise('which node');
      const nodePath = stdout.trim();
      if (nodePath) {
        log.debug(`Found Node.js via which: ${nodePath}`);
        return nodePath;
      }
    } catch (error) {
      log.debug('which node failed:', error);
    }

    return null;
  }

  /**
   * 修复Homebrew ICU库冲突的特殊处理
   */
  private async executeNodeCommand(): Promise<{ stdout: string; stderr: string }> {
    // 首先尝试直接使用node命令（最常见的情况）
    try {
      log.debug('Trying direct node command');
      return await execPromise('node --version', { timeout: 5000 });
    } catch (directError) {
      log.debug('Direct node command failed, trying alternatives');
    }

    // 查找Node.js的实际位置
    const nodePath = await this.findNodePath();

    const nodeCommands: string[] = [];

    if (nodePath) {
      nodeCommands.push(`"${nodePath}" --version`);
    }

    // 添加其他检测方法
    nodeCommands.push(
      // nvm方法（最常见的Node.js版本管理器）
      'source ~/.nvm/nvm.sh && nvm use default && node --version 2>/dev/null',
      'source ~/.nvm/nvm.sh && node --version 2>/dev/null',
      // 直接使用nvm的当前版本路径
      'bash -c "source ~/.nvm/nvm.sh && which node && node --version" 2>/dev/null',
      // fnm方法
      'eval "$(fnm env)" && node --version 2>/dev/null',
      // 直接PATH查找
      '/usr/bin/env node --version'
    );

    for (const cmd of nodeCommands) {
      try {
        log.debug(`Trying Node.js command: ${cmd}`);
        const result = await this.execWithShellEnv(cmd);
        log.debug(`Node.js command succeeded: ${cmd}`);
        return result;
      } catch (error) {
        log.debug(`Node.js command failed: ${cmd}, error: ${error}`);
        continue;
      }
    }

    throw new Error('所有Node.js检测方法都失败了');
  }

  /**
   * 检查Node.js环境
   */
  private async checkNodeJs(): Promise<EnvironmentResult> {
    try {
      const { stdout } = await this.executeNodeCommand();
      const version = stdout.trim();

      // 解析版本号
      const versionMatch = version.match(/v(\d+)\.(\d+)\.(\d+)/);
      if (versionMatch) {
        const major = parseInt(versionMatch[1]);

        // 检查版本是否满足要求（建议 >= 16）
        if (major >= 16) {
          return {
            name: 'Node.js',
            version,
            status: 'success',
            message: '版本符合要求'
          };
        } else {
          return {
            name: 'Node.js',
            version,
            status: 'warning',
            message: `建议升级到 Node.js 16+ 以获得更好的性能，当前版本：${version}`
          };
        }
      } else {
        return {
          name: 'Node.js',
          version,
          status: 'warning',
          message: '无法解析版本号，但Node.js已安装'
        };
      }
    } catch (error) {
      log.error('Node.js check failed:', error);

      // 根据错误类型提供更具体的建议
      let errorMessage = '未找到Node.js，请安装Node.js运行环境';

      if (error instanceof Error) {
        const errorStr = error.message.toLowerCase();

        if (errorStr.includes('libicu')) {
          errorMessage = 'Node.js存在ICU库版本冲突。建议解决方案：\n' +
                        '1. 重新安装Node.js: brew reinstall node\n' +
                        '2. 或使用nvm管理Node.js版本\n' +
                        '3. 或更新Homebrew: brew update && brew upgrade';
        } else if (errorStr.includes('command not found') || errorStr.includes('not found')) {
          errorMessage = 'Node.js未安装或不在PATH中。请访问 https://nodejs.org 下载安装';
        } else if (errorStr.includes('timeout')) {
          errorMessage = 'Node.js检测超时，可能系统负载过高，请稍后重试';
        }
      }

      return {
        name: 'Node.js',
        version: null,
        status: 'error',
        message: errorMessage
      };
    }
  }

  /**
   * 检查Python环境
   */
  private async checkPython(): Promise<EnvironmentResult> {
    const pythonCommands = ['python3', 'python'];

    for (const command of pythonCommands) {
      try {
        const { stdout } = await this.execWithShellEnv(`${command} --version`);
        const version = stdout.trim();

        // 解析Python版本号
        const versionMatch = version.match(/Python (\d+)\.(\d+)\.(\d+)/);
        if (versionMatch) {
          const major = parseInt(versionMatch[1]);
          const minor = parseInt(versionMatch[2]);

          // 检查版本是否满足要求（建议 >= 3.7）
          if (major === 3 && minor >= 7) {
            return {
              name: 'Python',
              version,
              status: 'success',
              message: `版本符合要求，使用命令：${command}`
            };
          } else if (major === 3 && minor >= 6) {
            return {
              name: 'Python',
              version,
              status: 'warning',
              message: `建议升级到Python 3.7+，当前版本：${version}`
            };
          } else {
            return {
              name: 'Python',
              version,
              status: 'warning',
              message: `版本可能不兼容，建议使用Python 3.7+，当前版本：${version}`
            };
          }
        } else {
          return {
            name: 'Python',
            version,
            status: 'warning',
            message: '无法解析版本号，但Python已安装'
          };
        }
      } catch (error) {
        // 继续尝试下一个命令
        continue;
      }
    }

    log.error('Python check failed: no Python found');
    return {
      name: 'Python',
      version: null,
      status: 'error',
      message: '未找到Python（尝试了python3和python命令）。建议解决方案：\n' +
               '1. macOS: brew install python3\n' +
               '2. 或访问 https://python.org 下载安装\n' +
               '3. 确保Python在系统PATH中'
    };
  }

  /**
   * 检查Java环境
   */
  private async checkJava(): Promise<EnvironmentResult> {
    try {
      // 检查Java运行时
      const { stdout, stderr } = await this.execWithShellEnv('java -version');
      const versionOutput = stderr || stdout;

      // 检查Java编译器
      try {
        await this.execWithShellEnv('javac -version');
      } catch (javacError) {
        return {
          name: 'Java',
          version: null,
          status: 'error',
          message: '找到Java运行时但未找到编译器javac，请安装完整的JDK'
        };
      }

      if (versionOutput) {
        // 解析Java版本信息
        const versionMatch = versionOutput.match(/version "([^"]+)"/);
        if (versionMatch) {
          const versionString = versionMatch[1];

          // 解析版本号（支持新旧格式）
          let majorVersion: number;
          if (versionString.startsWith('1.')) {
            // 旧格式：1.8.0_xxx
            const oldFormatMatch = versionString.match(/1\.(\d+)/);
            majorVersion = oldFormatMatch ? parseInt(oldFormatMatch[1]) : 0;
          } else {
            // 新格式：11.0.x, 17.0.x 等
            const newFormatMatch = versionString.match(/^(\d+)/);
            majorVersion = newFormatMatch ? parseInt(newFormatMatch[1]) : 0;
          }

          // 检查版本是否满足要求（建议 >= Java 8）
          if (majorVersion >= 11) {
            return {
              name: 'Java',
              version: `Java ${versionString}`,
              status: 'success',
              message: 'JDK版本符合要求（包含java和javac）'
            };
          } else if (majorVersion >= 8) {
            return {
              name: 'Java',
              version: `Java ${versionString}`,
              status: 'warning',
              message: `JDK已安装但建议升级到Java 11+，当前版本：${versionString}`
            };
          } else {
            return {
              name: 'Java',
              version: `Java ${versionString}`,
              status: 'warning',
              message: `JDK版本过低，建议升级到Java 11+，当前版本：${versionString}`
            };
          }
        } else {
          return {
            name: 'Java',
            version: 'Java (未知版本)',
            status: 'warning',
            message: '无法解析Java版本号，但JDK已安装（包含java和javac）'
          };
        }
      } else {
        throw new Error('No version output');
      }
    } catch (error) {
      log.error('Java check failed:', error);

      let errorMessage = '未找到Java，请安装JDK 11+（需要包含java和javac命令）';

      if (error instanceof Error) {
        const errorStr = error.message.toLowerCase();

        if (errorStr.includes('command not found') || errorStr.includes('not found')) {
          errorMessage = '未找到Java环境。建议解决方案：\n' +
                        '1. macOS: brew install openjdk\n' +
                        '2. 或访问 https://adoptium.net 下载安装OpenJDK\n' +
                        '3. 确保JAVA_HOME环境变量正确设置';
        } else if (errorStr.includes('timeout')) {
          errorMessage = 'Java检测超时，可能系统负载过高，请稍后重试';
        }
      }

      return {
        name: 'Java',
        version: null,
        status: 'error',
        message: errorMessage
      };
    }
  }

  /**
   * 检查所有环境
   */
  public async checkAllEnvironments(): Promise<EnvironmentResult[]> {
    log.info('Starting environment check...');

    const results = await Promise.all([
      this.checkNodeJs(),
      this.checkPython(),
      this.checkJava()
    ]);

    // 记录检查结果
    results.forEach(result => {
      log.info(`Environment check - ${result.name}: ${result.status} - ${result.message}`);
    });

    return results;
  }

  /**
   * 获取环境摘要信息
   */
  public getEnvironmentSummary(results: EnvironmentResult[]): {
    allReady: boolean;
    criticalIssues: number;
    warnings: number;
  } {
    const criticalIssues = results.filter(r => r.status === 'error').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const allReady = criticalIssues === 0;

    return {
      allReady,
      criticalIssues,
      warnings
    };
  }
}