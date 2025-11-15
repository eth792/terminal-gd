#!/usr/bin/env node
/**
 * 文档自动更新脚本
 *
 * 功能：从 git log 和 runs/ 提取信息，自动更新项目文档
 * - implementation_record.md（顶部插入新版本条目）
 * - PROJECT_STATUS.md（更新 KPI 表格和元数据）
 *
 * ⚠️ CLAUDE.md 简化后：不再自动更新（仅包含静态 AI meta-instructions）
 *
 * 使用方式：npm run update-docs
 */

import fs from 'fs/promises';
import { execSync } from 'child_process';

/**
 * 验证 specName 格式（kebab-case）
 *
 * @param {string|null|undefined} specName - spec 名称（可选参数）
 * @throws {Error} specName 格式不合法时抛出错误
 *
 * @example
 * validateSpecName('spec-docs-integration'); // ✓ 通过
 * validateSpecName('my-feature-v2');          // ✓ 通过
 * validateSpecName(null);                     // ✓ 通过（可选参数）
 * validateSpecName('My-Spec');                // ✗ 抛出错误（包含大写）
 * validateSpecName('my spec');                // ✗ 抛出错误（包含空格）
 */
function validateSpecName(specName) {
  // 允许 null/undefined/empty（可选参数）
  if (!specName) {
    return;
  }

  // 验证 kebab-case 格式：仅小写字母、数字、连字符
  const kebabCasePattern = /^[a-z0-9-]+$/;

  if (!kebabCasePattern.test(specName)) {
    throw new Error(
      `Invalid specName: '${specName}'. Must use kebab-case format (lowercase letters, numbers, and hyphens only). ` +
      `Examples: 'spec-docs-integration', 'my-feature-v2'`
    );
  }
}

/**
 * 安全提取 KPI 数据（多重模式匹配）
 *
 * @param {string} content - summary.md 的完整内容
 * @param {string} metric - 指标类型（'exact' | 'review' | 'fail'）
 * @returns {{count: number, percent: number}} KPI 数据
 * @throws {Error} 所有模式都匹配失败时抛出错误
 */
function safeExtractKPI(content, metric) {
  // 为每个指标定义多个正则模式（按优先级排序）
  const patterns = {
    exact: [
      // 主模式：Exact | 71 / 222 | 32.0%
      /Exact\s*[|:]\s*(\d+)\s*\/\s*\d+\s*\((\d+(?:\.\d+)?)%\)/,
      // 备份模式1：Exact: 71 (32.0%)
      /Exact\s*:\s*(\d+)\s*\((\d+(?:\.\d+)?)%\)/,
      // 备份模式2：Exact ... 71 ... 32.0%（最宽松）
      /Exact.*?(\d+).*?(\d+\.\d+)%/
    ],
    review: [
      /Review\s*[|:]\s*(\d+)\s*\/\s*\d+\s*\((\d+(?:\.\d+)?)%\)/,
      /Review\s*:\s*(\d+)\s*\((\d+(?:\.\d+)?)%\)/,
      /Review.*?(\d+).*?(\d+\.\d+)%/
    ],
    fail: [
      /Fail\s*[|:]\s*(\d+)\s*\/\s*\d+\s*\((\d+(?:\.\d+)?)%\)/,
      /Fail\s*:\s*(\d+)\s*\((\d+(?:\.\d+)?)%\)/,
      /Fail.*?(\d+).*?(\d+\.\d+)%/
    ]
  };

  const metricPatterns = patterns[metric];
  if (!metricPatterns) {
    throw new Error(`Unknown metric: ${metric}. Expected 'exact', 'review', or 'fail'`);
  }

  // 按顺序尝试每个模式
  for (const pattern of metricPatterns) {
    const match = content.match(pattern);
    if (match) {
      const kpi = {
        count: parseInt(match[1], 10),
        percent: parseFloat(match[2])
      };

      // 验证数据合法性
      if (kpi.count > 0 && kpi.percent >= 0 && kpi.percent <= 100) {
        return kpi;
      }

      // 数据不合法，尝试下一个模式
      console.warn(`⚠️  Warning: Extracted invalid ${metric} data (count=${kpi.count}, percent=${kpi.percent}), trying next pattern...`);
    }
  }

  // 所有模式都失败，抛出详细错误
  const preview = content.substring(0, 200);
  throw new Error(
    `❌ Failed to extract ${metric} KPI from summary.md\n` +
    `All ${metricPatterns.length} patterns failed to match.\n` +
    `Summary.md preview (first 200 chars):\n${preview}\n\n` +
    `Expected format examples:\n` +
    `  - "Exact | 71 / 222 | 32.0%"\n` +
    `  - "Exact: 71 (32.0%)"\n` +
    `\nPlease check if summary.md format has changed.`
  );
}

/**
 * 原子性文件更新（全部成功或全部失败）
 *
 * @param {Map<string, string>} files - 文件路径到新内容的映射
 * @throws {Error} 任何文件操作失败时抛出错误（已回滚所有变更）
 */
async function atomicUpdate(files) {
  const backups = new Map();

  try {
    // 阶段 1：备份所有文件
    console.log('📋 Phase 1/3: Creating backups...');
    for (const [filePath, _] of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        backups.set(filePath, content);
        console.log(`  ✓ Backed up: ${filePath}`);
      } catch (error) {
        throw new Error(`Failed to read file for backup: ${filePath}\n${error.message}`);
      }
    }

    // 阶段 2：写入所有新内容
    console.log('\n📝 Phase 2/3: Writing new content...');
    for (const [filePath, newContent] of files) {
      try {
        await fs.writeFile(filePath, newContent, 'utf-8');
        console.log(`  ✓ Updated: ${filePath}`);
      } catch (error) {
        throw new Error(`Failed to write file: ${filePath}\n${error.message}`);
      }
    }

    console.log('\n✅ Phase 3/3: Atomic update succeeded');
    console.log(`   ${files.size} file(s) updated successfully\n`);

  } catch (error) {
    // 阶段 3：失败时回滚所有变更
    console.error('\n❌ Update failed, rolling back all changes...');

    for (const [filePath, originalContent] of backups) {
      try {
        await fs.writeFile(filePath, originalContent, 'utf-8');
        console.log(`  ✓ Rolled back: ${filePath}`);
      } catch (rollbackError) {
        console.error(`  ❌ Rollback failed for ${filePath}: ${rollbackError.message}`);
      }
    }

    throw new Error(`Atomic update failed and rolled back:\n${error.message}`);
  }
}

/**
 * 更新 implementation_record.md（在顶部插入新版本条目）
 *
 * @param {Object} config - 配置对象
 * @param {string} config.version - 版本号（如 'v0.1.7'）
 * @param {string} config.date - 日期（如 '2025-11-14'）
 * @param {string} config.title - 版本标题（如 '提取逻辑修复'）
 * @param {string} config.runId - 运行包 ID（如 'run_v0.1.7_fix_20251114_123456'）
 * @returns {Promise<string>} 更新后的文档内容
 * @throws {Error} 文件读取失败或格式不匹配时抛出错误
 */
async function updateImplementationRecord(config) {
  const { version, date, title, runId, specName } = config;

  // 步骤 1: 从 runs/{runId}/summary.md 提取 KPI
  console.log(`📊 Extracting KPIs from ${runId}/summary.md...`);
  const summaryPath = `runs/${runId}/summary.md`;

  let summaryContent;
  try {
    summaryContent = await fs.readFile(summaryPath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read summary.md: ${summaryPath}\n${error.message}`);
  }

  const exact = safeExtractKPI(summaryContent, 'exact');
  const review = safeExtractKPI(summaryContent, 'review');
  const fail = safeExtractKPI(summaryContent, 'fail');

  console.log(`  ✓ Extracted: Exact=${exact.count} (${exact.percent}%), Review=${review.count} (${review.percent}%), Fail=${fail.count} (${fail.percent}%)`);

  // 步骤 2: 生成版本条目（基本框架 + 自动填充部分）
  console.log(`📝 Generating version entry for ${version}...`);

  // 根据是否有 specName 生成不同的代码变更内容
  const codeChangesSection = specName
    ? `详细信息请查看：[${specName} Implementation Logs](./.spec-workflow/specs/${specName}/)

**核心变更摘要**（手动补充）:
[📝 待补充 - 简要描述关键变更，无需列出文件清单]`
    : `[📝 待补充] 请补充代码变更详情（文件路径 + 行号 + 变更说明）`;

  const entry = `### ${version} - ${title} (${date})

**实施内容**:
- [📝 待补充] 请根据实际修改内容填写

**实际效果**: Exact **${exact.count}** (${exact.percent}%), Review **${review.count}** (${review.percent}%), Fail **${fail.count}** (${fail.percent}%)

#### 代码变更

${codeChangesSection}

#### 测试结果

| 版本 | Exact | Review | Fail | 自动通过率 | 运行 ID |
|------|-------|--------|------|------------|---------|
| [上一版本] | [📝 待补充] | [📝 待补充] | [📝 待补充] | [📝 待补充] | [📝 待补充] |
| **${version}** | **${exact.count} (${exact.percent}%)** | **${review.count} (${review.percent}%)** | **${fail.count} (${fail.percent}%)** | **${exact.percent}%** | \`${runId}\` |

**改善效果**:
- [📝 待补充] 请补充改善效果分析（对比上一版本的变化）

#### 相关文档

- **完整报告**: \`analysis/${version}/${version}_实测报告.md\`
- **运行包**: \`runs/${runId}/\`

#### 技术洞察

[📝 待补充] 请补充技术洞察（关键发现、设计决策、经验教训等）

---

`;

  // 步骤 3: 读取现有 implementation_record.md
  console.log('📖 Reading existing implementation_record.md...');
  const recordPath = 'docs/implementation_record.md';

  let content;
  try {
    content = await fs.readFile(recordPath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read implementation_record.md: ${recordPath}\n${error.message}`);
  }

  // 步骤 4: 在 "## 版本历史" 后插入新条目（保持最新版本在顶部）
  const insertMarker = '## 版本历史\n\n';
  const insertIndex = content.indexOf(insertMarker);

  if (insertIndex === -1) {
    throw new Error(
      `Cannot find "## 版本历史" marker in implementation_record.md.\n` +
      `Expected format: "## 版本历史\\n\\n" followed by version entries.`
    );
  }

  const newContent =
    content.substring(0, insertIndex + insertMarker.length) +
    entry +
    content.substring(insertIndex + insertMarker.length);

  console.log(`  ✓ Generated ${entry.split('\n').length} lines for ${version}`);
  console.log(`  ✓ Entry will be inserted at top of version history`);

  return newContent;
}

/**
 * 更新 PROJECT_STATUS.md（顶部元数据 + 核心指标表格 + 版本历史表格）
 *
 * @param {Object} config - 配置对象
 * @param {string} config.version - 版本号（如 'v0.1.7'）
 * @param {string} config.date - 日期（如 '2025-11-14'）
 * @param {string} config.title - 版本标题（如 '提取逻辑修复'）
 * @param {string} config.runId - 运行包 ID（如 'run_v0.1.7_fix_20251114_123456'）
 * @param {string} config.nextVersion - 下一版本号（如 'v0.1.8'，可选）
 * @returns {Promise<string>} 更新后的文档内容
 * @throws {Error} 文件读取失败或格式不匹配时抛出错误
 */
async function updateProjectStatus(config) {
  const { version, date, title, runId, nextVersion } = config;

  // 步骤 1: 从 runs/{runId}/summary.md 提取 KPI
  console.log(`📊 Extracting KPIs from ${runId}/summary.md...`);
  const summaryPath = `runs/${runId}/summary.md`;

  let summaryContent;
  try {
    summaryContent = await fs.readFile(summaryPath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read summary.md: ${summaryPath}\n${error.message}`);
  }

  const exact = safeExtractKPI(summaryContent, 'exact');
  const review = safeExtractKPI(summaryContent, 'review');
  const fail = safeExtractKPI(summaryContent, 'fail');

  console.log(`  ✓ Extracted: Exact=${exact.count} (${exact.percent}%), Review=${review.count} (${review.percent}%), Fail=${fail.count} (${fail.percent}%)`);

  // 步骤 2: 读取现有 PROJECT_STATUS.md
  console.log('📖 Reading existing PROJECT_STATUS.md...');
  const statusPath = 'docs/PROJECT_STATUS.md';

  let content;
  try {
    content = await fs.readFile(statusPath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read PROJECT_STATUS.md: ${statusPath}\n${error.message}`);
  }

  // 步骤 3: 更新顶部元数据（行 3-6）
  console.log('📝 Updating top metadata...');

  // 更新"最后更新"行
  const today = new Date().toISOString().split('T')[0];
  content = content.replace(
    /^(\*\*最后更新\*\*): .+$/m,
    `$1: ${today}`
  );

  // 更新"当前版本"行
  content = content.replace(
    /^(\*\*当前版本\*\*): .+$/m,
    `$1: ${version} (${title})`
  );

  // 更新"下一版本"行（如果提供了 nextVersion）
  if (nextVersion) {
    content = content.replace(
      /^(\*\*下一版本\*\*): .+$/m,
      `$1: ${nextVersion} - 计划中`
    );
  }

  console.log(`  ✓ Updated metadata: date=${today}, version=${version}`);

  // 步骤 4: 更新核心指标表格（行 14-19）
  console.log('📊 Updating KPI table...');

  // 更新自动通过率
  content = content.replace(
    /(\| \*\*自动通过率\*\* \| \*\*)[^*]+(\*\*)/,
    `$1${exact.percent}%$2`
  );

  // 更新 Exact
  content = content.replace(
    /(\| Exact \| )[\d \/]+( \|)/,
    `$1${exact.count} / 222$2`
  );

  // 更新 Review
  content = content.replace(
    /(\| Review \| )[\d \/]+( \|)/,
    `$1${review.count} / 222$2`
  );

  // 更新 Fail
  content = content.replace(
    /(\| Fail \| )[\d \/]+( \|)/,
    `$1${fail.count} / 222$2`
  );

  console.log(`  ✓ Updated KPI table with latest metrics`);

  // 步骤 5: 在版本历史表格末尾添加新版本行
  console.log('📋 Adding new version to history table...');

  // 找到版本历史表格的位置（在 "### 版本历史" 之后）
  const versionHistoryMarker = '### 版本历史';
  const versionHistoryIndex = content.indexOf(versionHistoryMarker);

  if (versionHistoryIndex === -1) {
    throw new Error(
      `Cannot find "### 版本历史" marker in PROJECT_STATUS.md.\n` +
      `Expected format: "### 版本历史" followed by a table.`
    );
  }

  // 找到表格结束位置（下一个 --- 或 ## 标题）
  const afterHistory = content.substring(versionHistoryIndex);
  const tableEndMatch = afterHistory.match(/\n\n(---|##)/);

  if (!tableEndMatch) {
    throw new Error(
      `Cannot find end of version history table in PROJECT_STATUS.md.\n` +
      `Expected to find "---" or "##" after the table.`
    );
  }

  const tableEndIndex = versionHistoryIndex + tableEndMatch.index;

  // 生成新版本行（注意：PROJECT_STATUS.md 中的文档链接格式）
  const newVersionRow = `| **${version}** | **${date}** | **${exact.percent}%** | **${title}** | **[实测报告](../analysis/${version}/${version}_实测报告.md)** |\n`;

  // 在表格末尾插入新行（在 \n\n--- 之前）
  const newContent =
    content.substring(0, tableEndIndex) +
    newVersionRow +
    content.substring(tableEndIndex);

  console.log(`  ✓ Added version ${version} to history table`);

  return newContent;
}

/**
 * DEPRECATED: 更新 CLAUDE.md（已简化为静态AI指令，不再自动更新）
 *
 * ⚠️ CLAUDE.md 简化后（2025-11-15）：
 * - 现在只包含静态 AI meta-instructions（~200 lines）
 * - 所有项目数据已迁移至 docs/PROJECT_STATUS.md
 * - 不再包含"快速状态恢复"等自动生成章节
 * - 此函数保留为 no-op（保持 API 兼容性）
 *
 * @param {Object} config - 配置对象（已弃用，保留为兼容性参数）
 * @returns {Promise<string>} 返回当前 CLAUDE.md 内容（不做任何修改）
 * @throws {Error} 文件读取失败时抛出错误
 */
async function updateClaudeMd(config) {
  // No-op: CLAUDE.md is now static AI instructions, no automatic updates needed
  console.log('📖 Reading CLAUDE.md (no updates - static AI instructions)...');
  const claudePath = 'CLAUDE.md';

  let content;
  try {
    content = await fs.readFile(claudePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read CLAUDE.md: ${claudePath}\n${error.message}`);
  }

  console.log('  ✓ CLAUDE.md unchanged (contains static AI meta-instructions only)');
  console.log('  ℹ️  All project data updates are in PROJECT_STATUS.md');

  return content;
}

/**
 * 主函数：编排完整的文档更新流程
 *
 * @param {Object} config - 配置对象
 * @param {string} config.version - 版本号（如 'v0.1.7'）
 * @param {string} config.date - 日期（如 '2025-11-14'）
 * @param {string} config.title - 版本标题（如 '提取逻辑修复'）
 * @param {string} config.runId - 运行包 ID（如 'run_v0.1.7_fix_20251114_123456'）
 * @param {string} [config.nextVersion] - 下一版本号（可选）
 * @param {string} [config.specName] - Spec 名称（可选，kebab-case，如 'spec-docs-integration'）
 * @throws {Error} 任何步骤失败时抛出错误
 */
async function updateDocs(config) {
  console.log('🚀 Starting document update process...\n');
  console.log(`Version: ${config.version}`);
  console.log(`Title: ${config.title}`);
  console.log(`Run ID: ${config.runId}`);
  console.log(`Date: ${config.date}`);
  if (config.nextVersion) {
    console.log(`Next Version: ${config.nextVersion}`);
  }
  if (config.specName) {
    console.log(`Spec Name: ${config.specName}`);
  }
  console.log('');

  // 验证 specName 格式（如果提供）
  validateSpecName(config.specName);

  try {
    // 步骤 1: 生成所有新文档内容
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Step 1/2: Generating new content...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const updates = new Map();

    // 1.1 更新 implementation_record.md
    console.log('1️⃣  Updating implementation_record.md...\n');
    const implementationRecord = await updateImplementationRecord(config);
    updates.set('docs/implementation_record.md', implementationRecord);
    console.log('');

    // 1.2 更新 PROJECT_STATUS.md
    console.log('2️⃣  Updating PROJECT_STATUS.md...\n');
    const projectStatus = await updateProjectStatus(config);
    updates.set('docs/PROJECT_STATUS.md', projectStatus);
    console.log('');

    // 1.3 读取 CLAUDE.md（不再更新 - 保持静态AI指令）
    console.log('3️⃣  Reading CLAUDE.md (static, no updates)...\n');
    const claudeMd = await updateClaudeMd(config);
    // CLAUDE.md现在是静态的，不加入updates（不会被写入）
    // updates.set('CLAUDE.md', claudeMd); // DEPRECATED: 不再自动更新
    console.log('');

    // 步骤 2: 原子性写入所有文档
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💾 Step 2/2: Atomic file update...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await atomicUpdate(updates);

    // 成功
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Document update completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Updated files:');
    for (const filePath of updates.keys()) {
      console.log(`   ✓ ${filePath}`);
    }

    console.log('\n⚠️  Next steps:');
    console.log('   1. Review implementation_record.md and fill in [📝 待补充] sections');
    console.log('   2. Run git diff to verify all changes');
    console.log('   3. Create git commit with updated documentation');
    console.log('   4. (Optional) Update docs/PROJECT_STATUS.md roadmap if needed\n');

  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Document update failed!');
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

  if (args.length < 3) {
    console.error('Usage: npm run update-docs -- <version> <title> <runId> [nextVersion] [specName]');
    console.error('');
    console.error('Arguments:');
    console.error('  version      Version number (e.g., v0.1.7)');
    console.error('  title        Version title (e.g., "提取逻辑修复")');
    console.error('  runId        Run package ID (e.g., run_v0.1.7_fix_20251114_123456)');
    console.error('  nextVersion  Next version number (optional, e.g., v0.1.8)');
    console.error('  specName     Spec name for reference links (optional, kebab-case, e.g., spec-docs-integration)');
    console.error('');
    console.error('Examples:');
    console.error('  npm run update-docs -- v0.1.7 "提取逻辑修复" run_v0.1.7_fix_20251114_123456 v0.1.8');
    console.error('  npm run update-docs -- v0.1.7 "提取逻辑修复" run_v0.1.7_fix_20251114_123456 v0.1.8 spec-docs-integration');
    console.error('');
    process.exit(1);
  }

  const [version, title, runId, nextVersion, specName] = args;

  // 验证 specName 格式（如果提供）
  if (specName && !/^[a-z0-9-]+$/.test(specName)) {
    console.error(`\n❌ Error: Invalid specName '${specName}'`);
    console.error('   Spec name must use kebab-case format (lowercase letters, numbers, and hyphens only).');
    console.error('   Examples: spec-docs-integration, my-feature-v2\n');
    process.exit(1);
  }

  // 自动生成日期（今天）
  const date = new Date().toISOString().split('T')[0];

  const config = {
    version,
    date,
    title,
    runId,
    nextVersion,
    specName
  };

  try {
    await updateDocs(config);
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

// 🎯 End-to-End Test
// This section verifies the complete automation workflow
// The function below simulates the full process without actual file modifications

/**
 * 端到端集成测试用函数
 * 仅在 test 模式下调用，验证整个 workflow 的可行性
 *
 * @returns {Promise<boolean>} 测试是否通过
 */
async function runEndToEndTest() {
  console.log('🧪 Running end-to-end test...\n');

  try {
    // 测试参数 - 使用真实数据
    const testConfig = {
      version: 'v0.1.6',
      date: '2025-11-14',
      title: '端到端测试验证',
      runId: 'run_v0.1.6_full_20251113_214123',
      nextVersion: 'v0.1.7'
    };

    // 1. 验证 KPI 提取
    const summaryPath = `runs/${testConfig.runId}/summary.md`;
    const summary = await fs.readFile(summaryPath, 'utf-8');
    const exact = safeExtractKPI(summary, 'exact');
    const review = safeExtractKPI(summary, 'review');
    const fail = safeExtractKPI(summary, 'fail');

    console.log(`✅ KPI extraction successful: Exact=${exact.count}, Review=${review.count}, Fail=${fail.count}`);

    // 2. 验证 doc generation functions
    const implRecord = await updateImplementationRecord(testConfig);
    console.log(`✅ implementation_record.md generation (simulated): ${implRecord.split('\n').length} lines`);

    const projStatus = await updateProjectStatus(testConfig);
    console.log(`✅ PROJECT_STATUS.md update (simulated): ${projStatus.split('\n').length} lines`);

    const claudeMd = await updateClaudeMd(testConfig);
    console.log(`✅ CLAUDE.md update (simulated): ${claudeMd.split('\n').length} lines`);

    console.log('\n✅ End-to-end test completed successfully!');
    return true;

  } catch (error) {
    console.error('✅ End-to-end test failed:', error.message);
    return false;
  }
}

// 导出所有函数，包括 test 函数
export { safeExtractKPI, atomicUpdate, updateImplementationRecord, updateProjectStatus, updateClaudeMd, updateDocs, runEndToEndTest };

// 检测是否为直接运行（而非被导入）
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
