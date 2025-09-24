import { exec } from 'child_process';
import { promisify } from 'util';
import log from 'electron-log';

const execPromise = promisify(exec);

export interface EnvironmentResult {
  name: string;
  version: string | null;
  status: 'success' | 'error' | 'warning';
  message: string;
}

export class EnvironmentChecker {

  /**
   * 检查Node.js环境
   */
  private async checkNodeJs(): Promise<EnvironmentResult> {
    try {
      const { stdout } = await execPromise('node --version');
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
      return {
        name: 'Node.js',
        version: null,
        status: 'error',
        message: '未找到Node.js，请安装Node.js运行环境'
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
        const { stdout } = await execPromise(`${command} --version`);
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
      message: '未找到Python，请安装Python 3.7+运行环境'
    };
  }

  /**
   * 检查Java环境
   */
  private async checkJava(): Promise<EnvironmentResult> {
    try {
      // 检查Java运行时
      const { stdout, stderr } = await execPromise('java -version');
      const versionOutput = stderr || stdout;

      // 检查Java编译器
      try {
        await execPromise('javac -version');
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
      return {
        name: 'Java',
        version: null,
        status: 'error',
        message: '未找到Java，请安装JDK 11+（需要包含java和javac命令）'
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