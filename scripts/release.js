#!/usr/bin/env node
/**
 * 端到端发布流程脚本
 *
 * 功能：自动化版本发布流程
 * - 检查测试运行包
 * - 更新文档
 * - 提示手动补充
 * - 创建 Git commit
 *
 * 使用方式：npm run release
 */

import fs from 'fs/promises';
import { execSync } from 'child_process';

/**
 * 检查 runs/ 目录是否有测试运行包
 *
 * @returns {Promise<{hasRuns: boolean, latestRun: string|null, allRuns: string[]}>}
 * @throws {Error} 读取目录失败时抛出错误
 */
async function checkTestRuns() {
  console.log('🔍 Checking for test runs in runs/ directory...\n');

  try {
    // 读取 runs/ 目录
    const runsDir = 'runs';
    let entries;

    try {
      entries = await fs.readdir(runsDir, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn('⚠️  Warning: runs/ directory does not exist');
        return { hasRuns: false, latestRun: null, allRuns: [] };
      }
      throw error;
    }

    // 过滤出目录（运行包）
    const runDirs = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .filter(name => name.startsWith('run_')); // 只包含以 run_ 开头的目录

    if (runDirs.length === 0) {
      console.warn('⚠️  Warning: No test runs found in runs/ directory');
      console.warn('   Expected format: run_vX.Y.Z_*_YYYYMMDD_HHMMSS\n');
      return { hasRuns: false, latestRun: null, allRuns: [] };
    }

    // 按时间戳排序（最新的在前）
    // 运行包格式：run_vX.Y.Z_*_YYYYMMDD_HHMMSS
    const sortedRuns = runDirs.sort((a, b) => {
      // 提取时间戳部分（最后两个下划线之间的部分）
      const extractTimestamp = (name) => {
        const parts = name.split('_');
        if (parts.length >= 3) {
          const date = parts[parts.length - 2]; // YYYYMMDD
          const time = parts[parts.length - 1]; // HHMMSS
          return `${date}_${time}`;
        }
        return name;
      };

      const timestampA = extractTimestamp(a);
      const timestampB = extractTimestamp(b);
      return timestampB.localeCompare(timestampA); // 降序排列（最新的在前）
    });

    const latestRun = sortedRuns[0];

    // 检查最新运行包是否有 summary.md
    const summaryPath = `${runsDir}/${latestRun}/summary.md`;
    let hasSummary = false;

    try {
      await fs.access(summaryPath);
      hasSummary = true;
    } catch (error) {
      // summary.md 不存在
    }

    console.log(`✅ Found ${runDirs.length} test run(s)\n`);
    console.log(`📦 Latest run: ${latestRun}`);

    if (hasSummary) {
      console.log(`   ✓ summary.md exists`);
    } else {
      console.warn(`   ⚠️  summary.md not found`);
    }

    console.log('');

    if (sortedRuns.length > 1) {
      console.log(`📋 All runs (${sortedRuns.length} total):`);
      sortedRuns.slice(0, 5).forEach((run, index) => {
        console.log(`   ${index + 1}. ${run}`);
      });

      if (sortedRuns.length > 5) {
        console.log(`   ... and ${sortedRuns.length - 5} more`);
      }
      console.log('');
    }

    return {
      hasRuns: true,
      latestRun: latestRun,
      allRuns: sortedRuns,
      hasSummary: hasSummary
    };

  } catch (error) {
    throw new Error(`Failed to check test runs: ${error.message}`);
  }
}

/**
 * 暂停并等待用户按 Enter 确认
 *
 * @param {string} message - 提示信息
 * @param {string} [defaultValue=""] - 默认回复值（用于非交互式环境）
 * @returns {Promise<string>} 用户输入的内容
 */
async function promptUserInput(message, defaultValue = "") {
  console.log(message);
  console.log('（按 Enter 继续，或q退出）');

  return new Promise((resolve) => {
    // 检查是否在非交互式环境中运行
    if (!process.stdin.isTTY) {
      console.log('🔄 Detected non-interactive environment, continuing automatically...');
      resolve(defaultValue);
      return;
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (data) => {
      if (data === '\u0003') { // Ctrl+C
        console.log('\n\n❌ Operation cancelled by user');
        process.exit(130);
      }

      if (data === '\n' || data === '\r') { // Enter
        removeListeners();
        resolve(defaultValue);
        return;
      }

      if (data === 'q' || data === 'Q') { // q 退出
        removeListeners();
        console.log('\n\n⬅️  Exiting...');
        process.exit(0);
      }

      // 忽略其他按键
    };

    // Set up readable stream from stdin
    process.stdin.on('data', onData);

    const removeListeners = () => {
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(false);
    };

    // Set a timeout to prevent hanging forever (5 minutes)
    setTimeout(() => {
      console.log('\n\n⚠️  Timeout waiting for user input, continuing...');
      removeListeners();
      resolve(defaultValue);
    }, 300000); // 5 minutes

  });
}

/**
 * 主函数：编排端到端发布流程
 *
 * 流程：
 * 1. 检查测试运行包
 * 2. 自动更新文档（implementation_record.md、PROJECT_STATUS.md、CLAUDE.md）
 * 3. 提示用户手动补充文档
 * 4. 创建 Git commit
 *
 * @param {Object} config - 配置对象
 * @param {string} config.version - 版本号（如 'v0.1.7'）
 * @param {string} config.title - 版本标题（如 '提取逻辑修复'）
 * @param {string} [config.runId] - 指定运行包 ID（可选，如果不指定则使用最新的）
 * @param {string} [config.nextVersion] - 下一版本号（可选）
 * @returns {Promise<void>}
 * @throws {Error} 任何步骤失败时抛出错误
 */
async function release(config) {
  const { version, title, runId, nextVersion } = config;
  const date = new Date().toISOString().split('T')[0];

  console.log('🚀 Starting release process...\n');
  console.log(`Version: ${version}`);
  console.log(`Title: ${title}`);
  if (runId) {
    console.log(`Run ID: ${runId}`);
  }
  if (nextVersion) {
    console.log(`Next Version: ${nextVersion}`);
  }
  console.log('');

  try {
    // 步骤 1: 检查测试运行包
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 1/4: Checking test runs...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const runCheck = await checkTestRuns();

    let selectedRunId = runId;

    if (runId) {
      // 用户指定了运行包
      if (!runCheck.allRuns.includes(runId)) {
        throw new Error(`Specified run ID not found: ${runId}\nAvailable runs: ${runCheck.allRuns.join(', ')}`);
      }
      console.log(`✅ Using specified run: ${runId}\n`);
    } else if (runCheck.hasRuns) {
      // 未指定，使用最新的
      selectedRunId = runCheck.latestRun;

      if (!runCheck.hasSummary) {
        throw new Error('Latest test run does not have summary.md\nPlease ensure the test was completed successfully.');
      }

      // 确认使用最新运行包
      await promptUserInput(`Use latest test run: ${selectedRunId}？`);
      console.log('');
    } else {
      throw new Error('No test runs found in runs/ directory\nPlease run full test before release.');
    }

    // 步骤 2: 自动更新文档
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Step 2/4: Updating documentation...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 动态导入 updateDocs
    const { updateDocs } = await import('./update-docs.js');

    await updateDocs({
      version,
      date,
      title,
      runId: selectedRunId,
      nextVersion
    });

    console.log('');

    // 步骤 3: 提示用户手动补充
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✏️  Step 3/4: Manual documentation review...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ 文档已自动更新，请手动补充以下内容：\n');
    console.log('📖 docs/implementation_record.md 需要补充：');
    console.log('   1. 实施内容详细说明');
    console.log('   2. 代码变更详细说明');
    console.log('   3. 改善效果对比分析');
    console.log('   4. 技术洞察和关键发现\n');

    console.log('📝 CLAUDE.md 需要补充：');
    console.log('   1. 具体代码变更（文件路径 + 行号）');
    console.log('   2. 关键发现详细说明');
    console.log('   3. 下一步计划详细信息\n');

    await promptUserInput('请完成上述手动补充，然后继续：');
    console.log('');

    // 步骤 4: 创建 Git commit
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 Step 4/4: Creating Git commit...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 检查 Git 状态
    let gitStatus;
    try {
      gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' });
    } catch (error) {
      throw new Error('Failed to check Git status:\n' + error.message);
    }

    if (!gitStatus.trim()) {
      throw new Error('No changes detected in Git. Please ensure you have made modifications before creating a commit.');
    }

    const changedFiles = gitStatus.split('\n').filter(line => line.trim());
    console.log('📋 Detected changes:');
    changedFiles.forEach(line => {
      console.log(`   ${line}`);
    });
    console.log('');

    // 生成 commit message
    const commitMessage = `feat(ocr-core): ${title} (${version})

**实施内容**：
[📝 待补充] 请根据实际修改内容填写

**Results** (${changedFiles.length} files changed):
- update-docs 自动更新项目文档
- ${changedFiles.length} 个文件被修改

**Documentation**:
- docs/implementation_record.md - 添加新版本条目
- docs/PROJECT_STATUS.md - 更新 KPI 和版本历史
- CLAUDE.md - 更新快速恢复章节

**Manual Steps Required**:
- 请补充 implementation_record.md 中的 [📝 待补充] 部分
- 请补充 CLAUDE.md 中的代码变更和关键发现

${selectedRunId ? `Run ID: ${selectedRunId}` : ''}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>`;

    console.log('📝 Generated commit message:');
    console.log(commitMessage);
    console.log('');

    await promptUserInput('确认创建上述 Git commit？');

    // 创建 commit
    try {
      execSync(`git add .`, {
        encoding: 'utf-8',
        stdio: 'inherit'
      });

      execSync(`git commit -m "${commitMessage}"`, {
        encoding: 'utf-8',
        stdio: 'inherit'
      });
    } catch (error) {
      throw new Error('Failed to create Git commit:\n' + error.message);
    }

    // 成功完成
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Release completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎉 版本发布流程已完成：');
    console.log('   ✓ 测试包验证');
    console.log('   ✓ 文档自动更新');
    console.log('   ✓ 手动补充提示');
    console.log('   ✓ Git commit 创建');
    console.log('');
    console.log('⚠️  下一步建议：');
    console.log('   1. 查看 commit: git log --oneline -1');
    console.log('   2. 比较变化: git diff HEAD~1');
    console.log('   3. 如有需要，可以 git commit --amend 完善 message');
    console.log('   4. 推送到远程: git push origin HEAD\n');

  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Release failed!');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.error('Error details:', error.message);
    throw error;
  }
}

/**
 * CLI 入口点（仅在直接运行脚本时执行）
 */
async function main() {
  // 解析命令行参数
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: npm run release -- <version> <title> [runId] [nextVersion]');
    console.error('');
    console.error('Arguments:');
    console.error('  version      Version number (e.g., v0.1.7)');
    console.error('  title        Version title (e.g., "提取逻辑修复")');
    console.error('  runId        Run package ID (optional, auto-detect)');
    console.error('  nextVersion  Next version number (optional)');
    console.error('');
    console.error('Example:');
    console.error('  npm run release -- v0.1.7 "提取逻辑修复"');
    console.error('  npm run release -- v0.1.7 "提取逻辑修复" run_v0.1.7_fix_20251114_123456 v0.1.8');
    console.error('');
    console.error('Notes:');
    console.error('  1. Please run full test before release');
    console.error('  2. Ensure git working directory is clean');
    console.error('  3. Manual documentation review is required');
    console.error('');
    process.exit(1);
  }

  const [version, title, runId, nextVersion] = args;

  const config = {
    version,
    title,
    runId,
    nextVersion
  };

  try {
    await release(config);
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

// 导出函数供测试使用
export { checkTestRuns, promptUserInput, release };

// 检测是否为直接运行（而非被导入）
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
