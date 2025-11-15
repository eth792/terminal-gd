# 文档流重构方案（v0.1.7 事故复盘）

**创建时间**: 2025-11-14
**触发原因**: v0.1.7 事故 - Context 爆炸导致多次失败
**目标**: 降低 Context 消耗 64%，减少文档更新时间 62%

---

## 🔥 核心思路（30 秒理解）

### 问题本质
**同时改 4 处代码 → 失败 → 反复调试 → Context 爆炸（50k+ tokens）→ 信息丢失 → 继续失败**

### 解决方案核心
1. **"每次只做一件事"** - 强制单次变更，失败立即定位
2. **"单一数据源真理"** - 信息金字塔，向上汇总不向下传递
3. **"自动化重复工作"** - 脚本更新文档，消除人工错误

### 预期效果
| 指标 | Before | After | 提升 |
|------|--------|-------|------|
| Context 消耗 | 28k | 10k | **-64%** |
| 文档更新时间 | 40min | 15min | **-62%** |
| 错误率 | 30% | 0% | **-100%** |

---

## 📋 实施计划（优先级排序）

### Phase 1: 紧急止血（立即执行）⚡

**目标**: 防止下次 v0.1.8 再次 context 爆炸

1. **强制工作流规则**（更新 CLAUDE.md）
   ```markdown
   ## ⚠️ 强制规则（违反 = 失败）

   ### Rule 1: 单次变更原则
   **禁止**同时修改多处代码。每次只改一个文件的一个函数。

   **正确示例**:
   - v0.1.8a: 只修复 extractor.ts 行级扫描 bug
   - v0.1.8b: 只添加 noise_words 截断验证

   **错误示例**:
   - ❌ v0.1.7: 同时改 extractor.ts + label_alias.json + 4 处逻辑

   ### Rule 2: 失败立即停止
   测试失败 → 立即回滚 → 分析原因 → 单独修复
   **禁止**在失败基础上继续叠加修复。

   ### Rule 3: Context 预算
   每次实施预算 15k tokens。超出 → 保存方案到临时文档 → 新 session 继续。
   ```

2. **创建快速回滚脚本**（scripts/rollback.sh）
   ```bash
   #!/bin/bash
   # 完整回滚三要素

   echo "🔄 Starting complete rollback..."

   # 1. 源代码回滚
   git restore packages/ocr-match-core/src/
   git restore configs/

   # 2. 重新构建
   pnpm -F ./packages/ocr-match-core build

   # 3. 重建索引（防止 v0.1.7 式索引损坏）
   node packages/ocr-match-core/dist/cli/build-index.js \
     --db data/db \
     --out runs/tmp/index.json \
     --config . \
     --field1 "供应单位名称" \
     --field2 "单体工程名称"

   echo "✅ Rollback complete. Safe to test."
   ```

### Phase 2: 自动化脚本（本周内）🤖

**目标**: 消除手动更新 7 处文档的错误

#### 脚本 1: `scripts/update-docs.mjs`

**核心逻辑**:
```javascript
// 单一数据源: implementation_record.md
// 自动生成: CLAUDE.md + PROJECT_STATUS.md 的当前状态部分

import fs from 'fs/promises';
import { execSync } from 'child_process';

async function updateDocs() {
  // 1. 从 git log 提取最新版本
  const latestCommit = execSync('git log -1 --format="%h|%s|%ai"').toString();
  const [hash, subject, date] = latestCommit.split('|');
  const version = subject.match(/v\d+\.\d+\.\d+[a-z]?/)?.[0];

  if (!version) {
    console.error('❌ No version found in latest commit');
    return;
  }

  // 2. 从 runs/ 提取最新测试结果
  const runsDir = await fs.readdir('runs');
  const latestRun = runsDir
    .filter(d => d.startsWith('run_'))
    .sort()
    .reverse()[0];

  const summaryPath = `runs/${latestRun}/summary.md`;
  const summary = await fs.readFile(summaryPath, 'utf-8');

  // 提取 KPI
  const exactMatch = summary.match(/Exact.*?(\d+).*?(\d+\.\d+)%/);
  const reviewMatch = summary.match(/Review.*?(\d+).*?(\d+\.\d+)%/);
  const failMatch = summary.match(/Fail.*?(\d+).*?(\d+\.\d+)%/);

  const kpi = {
    exact: { count: exactMatch[1], percent: exactMatch[2] },
    review: { count: reviewMatch[1], percent: reviewMatch[2] },
    fail: { count: failMatch[1], percent: failMatch[2] }
  };

  // 3. 更新 implementation_record.md（顶部插入）
  await updateImplementationRecord(version, hash, date, kpi, latestRun);

  // 4. 更新 PROJECT_STATUS.md（只更新 KPI 表格）
  await updateProjectStatus(version, kpi);

  // 5. 更新 CLAUDE.md（快速恢复章节）
  await updateClaudeMd(version, kpi, latestRun);

  console.log(`✅ All docs updated for ${version}`);
}

async function updateImplementationRecord(version, hash, date, kpi, runId) {
  const record = await fs.readFile('docs/implementation_record.md', 'utf-8');

  const versionEntry = `
## ${version} - [等待补充标题] (${date.split(' ')[0]})

**Git Commit**: ${hash}
**Run ID**: \`${runId}\`

**测试结果**:
| 指标 | 数值 | 占比 |
|------|------|------|
| Exact | ${kpi.exact.count} | ${kpi.exact.percent}% |
| Review | ${kpi.review.count} | ${kpi.review.percent}% |
| Fail | ${kpi.fail.count} | ${kpi.fail.percent}% |

**代码变更**:
- [等待手动补充具体变更]

**关键洞察**:
- [等待手动补充技术洞察]

---

`;

  // 插入到第一个 ## 之前
  const firstVersionIndex = record.indexOf('\n## v');
  const updated = record.slice(0, firstVersionIndex) + '\n' + versionEntry + record.slice(firstVersionIndex + 1);

  await fs.writeFile('docs/implementation_record.md', updated);
  console.log('  ✓ implementation_record.md updated');
}

async function updateProjectStatus(version, kpi) {
  const status = await fs.readFile('docs/PROJECT_STATUS.md', 'utf-8');

  // 更新 KPI 表格
  const kpiTableRegex = /\| \*\*自动通过率\*\* \| \*\*[\d.]+%\*\*/;
  const updated = status.replace(kpiTableRegex, `| **自动通过率** | **${kpi.exact.percent}%**`);

  // 更新 Exact 行
  const exactRegex = /\| Exact \| \d+ \/ 222 \| [^|]+ \|/;
  const updatedExact = updated.replace(exactRegex,
    `| Exact | ${kpi.exact.count} / 222 | +${kpi.exact.count - 8} (+${((kpi.exact.count - 8) / 8 * 100).toFixed(0)}%) |`
  );

  await fs.writeFile('docs/PROJECT_STATUS.md', updatedExact);
  console.log('  ✓ PROJECT_STATUS.md updated');
}

async function updateClaudeMd(version, kpi, runId) {
  const claude = await fs.readFile('CLAUDE.md', 'utf-8');

  // 查找快速恢复章节
  const quickRecoveryStart = claude.indexOf('## 🚀 快速状态恢复');
  const quickRecoveryEnd = claude.indexOf('---\n\n## 📋 版本发布工作流');

  if (quickRecoveryStart === -1 || quickRecoveryEnd === -1) {
    console.error('❌ Cannot find quick recovery section in CLAUDE.md');
    return;
  }

  const newQuickRecovery = `## 🚀 快速状态恢复（新 Session 必读）

**最后更新**: ${new Date().toISOString().split('T')[0]}
**当前版本**: ${version}

### 核心 KPI（${version}）

| 指标 | 数值 | 占比 |
|------|------|------|
| **自动通过率** | **${kpi.exact.percent}%** | - |
| Exact | ${kpi.exact.count} / 222 | ${kpi.exact.percent}% |
| Review | ${kpi.review.count} / 222 | ${kpi.review.percent}% |
| Fail | ${kpi.fail.count} / 222 | ${kpi.fail.percent}% |

**测试运行包**: \`${runId}\`

### 下一步计划

查看 [PROJECT_STATUS.md](docs/PROJECT_STATUS.md) 了解当前阶段和计划。

`;

  const updated = claude.slice(0, quickRecoveryStart) + newQuickRecovery + '\n' + claude.slice(quickRecoveryEnd);

  await fs.writeFile('CLAUDE.md', updated);
  console.log('  ✓ CLAUDE.md updated');
}

// 执行
updateDocs().catch(console.error);
```

**使用方式**:
```bash
# package.json 添加
"scripts": {
  "update-docs": "node scripts/update-docs.mjs"
}

# 测试完成后执行
npm run update-docs

# 然后手动补充 implementation_record.md 的变更和洞察
```

#### 脚本 2: `scripts/release.mjs`（端到端发布）

```javascript
import { execSync } from 'child_process';

async function release() {
  console.log('🚀 Starting release workflow...');

  // 1. 检查是否有测试运行包
  const runs = execSync('ls -t runs/ | head -1').toString().trim();
  if (!runs) {
    throw new Error('❌ No test runs found. Run tests first.');
  }

  // 2. 更新文档（自动）
  console.log('📝 Updating docs...');
  execSync('npm run update-docs');

  // 3. 提示用户补充信息
  console.log('\n⚠️  Please edit docs/implementation_record.md to fill in:');
  console.log('   - Version title');
  console.log('   - Code changes');
  console.log('   - Key insights');
  console.log('\n   Press Enter when done...');

  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  // 4. 创建 git commits
  console.log('📦 Creating commits...');

  const version = execSync('git log -1 --format="%s"').toString().match(/v\d+\.\d+\.\d+[a-z]?/)?.[0];

  // Commit 1: 文档更新
  execSync('git add docs/ CLAUDE.md');
  execSync(`git commit -m "docs: update docs for ${version}

Auto-generated KPI updates + manual insights.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"`);

  console.log('✅ Release complete!');
  console.log(`   Version: ${version}`);
  console.log('   Commits: 1 (docs)');
}

release().catch(console.error);
```

### Phase 3: 文档重构（下周）📚

**目标**: 降低重复率 40% → 10%

#### 3.1 CLAUDE.md 结构调整

**删除**:
- ❌ 手动维护的 KPI 表格
- ❌ 手动维护的"最近完成工作"
- ❌ 手动维护的"下一步计划"

**保留**:
- ✅ 强制规则（Rule 1-3）
- ✅ 快速恢复章节（自动生成）
- ✅ 关键技术决策（索引跳转）
- ✅ 版本发布工作流（简化版）

**添加自动生成标记**:
```markdown
<!-- AUTO-GENERATED: DO NOT EDIT MANUALLY -->
<!-- Last updated: 2025-11-14 by scripts/update-docs.mjs -->

## 🚀 快速状态恢复（新 Session 必读）
[自动生成内容]

<!-- END AUTO-GENERATED -->
```

#### 3.2 PROJECT_STATUS.md 精简

**删除**（移到 implementation_record.md）:
- ❌ 版本历史表格（重复）
- ❌ 关键技术决策详情（重复）
- ❌ 详细路线图（简化为 Top 3）

**保留**（目标 3 分钟读完）:
```markdown
# 项目状态

**最后更新**: 2025-11-14
**当前版本**: v0.1.6

## 核心指标
[单一 KPI 表格 - 自动更新]

## 当前阶段
Phase 4: 提取逻辑修复 🔥

## 下一步计划（Top 3）
1. 修复行级扫描逻辑（P0 - 高 ROI）
2. 调试多行布局解析
3. DB 缺失记录处理

## 待解决问题（Top 3）
1. 提取器 Bug（50% 失败案例根源）
2. DB 缺失记录
3. 文档类型检测

---
📖 详细历史 → [implementation_record.md](implementation_record.md)
📊 所有测试结果 → [runs/](../runs/)
```

#### 3.3 implementation_record.md 增强

**添加顶部快速跳转**:
```markdown
# 实施记录

## 🔍 快速跳转

### 关键技术洞察
- [Rule 3.5 上界约束](#v015) - 为何设为 0.60
- [高置信度旁路](#v014) - 如何救回 53 个案例
- [索引版本依赖](#v017) - index.json 损坏事故
- [单次变更原则](#强制规则) - v0.1.7 事故教训

### 常见问题 FAQ
<details>
<summary>Q: 如何完整回滚到稳定版本？</summary>

```bash
# 三要素回滚（v0.1.7 事故教训）
bash scripts/rollback.sh

# 或手动执行：
git restore packages/ocr-match-core/src/ configs/
pnpm -F ./packages/ocr-match-core build
node packages/ocr-match-core/dist/cli/build-index.js \
  --db data/db --out runs/tmp/index.json --config . \
  --field1 "供应单位名称" --field2 "单体工程名称"
```
</details>

<details>
<summary>Q: 列名映射在哪配置？</summary>

Excel 使用中文列名:
- 供应商: "供应单位名称"
- 项目: "单体工程名称"

见 [OCR_MATCH_CORE_IMPLEMENTATION.md](OCR_MATCH_CORE_IMPLEMENTATION.md#列名映射)
</details>

<details>
<summary>Q: 为什么必须每次只改一处？</summary>

**v0.1.7 灾难性失败案例**:
- 同时改 4 处 → 全部失败
- Context 爆炸 50k+ tokens
- 反复调试 6 小时
- 最终全部回滚

**正确做法**:
- 每次只改 1 处 → 失败立即定位
- Context 控制在 15k 以内
- 单次调试 30 分钟
- 成功积累，失败隔离

见 [v0.1.7 失败分析](../analysis/v0.1.7/v0.1.7_failure_analysis.md)
</details>
```

**标准化版本条目模板**:
```markdown
## vX.Y.Z - [一句话描述] (YYYY-MM-DD)

**为什么做**: [决策理由，1-2 句话]

**改了什么**:
- `文件路径:行号` - 具体变更

**测试结果**:
| 指标 | Before | After | 变化 |
|------|--------|-------|------|
| Exact | A | B | +X (+Y%) |

**关键洞察** 💡:
- [最重要的经验1]
- [技术发现2]

**遗留问题**:
- [ ] [未解决问题]

**运行包**: `runs/run_vX.Y.Z_*`

---
```

---

## 🎯 成功标准

### 定量指标

| 指标 | 当前值 | 目标值 | 验证方式 |
|------|--------|--------|---------|
| 新 session Context 消耗 | 28k tokens | ≤10k tokens | 读取 CLAUDE.md 快速恢复章节即可开始工作 |
| 文档更新时间 | 40min | ≤15min | `npm run update-docs` → 补充信息 → commit |
| 文档更新遗漏率 | 30% | 0% | 自动化脚本保证 7 处同步更新 |
| 版本发布 Checklist | 42 steps | ≤10 steps | 简化工作流 |

### 定性指标

1. **新 session 能在 3 分钟内理解状态并开始工作**
   - ✅ 读 CLAUDE.md 快速恢复章节（1min）
   - ✅ 读 PROJECT_STATUS.md 当前阶段（2min）
   - ✅ 开始编码

2. **失败能在 30 分钟内定位原因**
   - ✅ 单次变更 → 明确失败源
   - ✅ 完整回滚脚本 → 快速恢复
   - ✅ Context 预算 → 避免爆炸

3. **文档始终保持一致性**
   - ✅ 自动化脚本更新
   - ✅ 单一数据源真理
   - ✅ Git commit 验证

---

## 📝 实施 Checklist

### Phase 1: 紧急止血（今天完成）✅

- [ ] 更新 CLAUDE.md 添加强制规则（Rule 1-3）
- [ ] 创建 `scripts/rollback.sh` 完整回滚脚本
- [ ] 添加 `scripts/` 到 .gitignore（如果包含临时文件）
- [ ] 测试回滚脚本确保可用
- [ ] Git commit: "feat: add forced rules and rollback script"

### Phase 2: 自动化脚本（本周）🤖

- [ ] 创建 `scripts/update-docs.mjs`
- [ ] 添加 `npm run update-docs` 到 package.json
- [ ] 测试脚本能正确提取和更新
- [ ] 创建 `scripts/release.mjs`（可选）
- [ ] 更新 CLAUDE.md 文档更新章节（引用自动化脚本）
- [ ] Git commit: "feat: add automated docs update scripts"

### Phase 3: 文档重构（下周）📚

- [ ] CLAUDE.md 添加 AUTO-GENERATED 标记
- [ ] PROJECT_STATUS.md 精简（删除重复内容）
- [ ] implementation_record.md 添加快速跳转和 FAQ
- [ ] 运行 `npm run update-docs` 生成初始自动内容
- [ ] 验证 context 消耗降低到 10k 以内
- [ ] Git commit: "refactor: restructure docs flow (reduce 64% context)"

---

## 🔥 关键决策记录

### 决策 1: 为什么选择自动化而非模板？

**问题**: 手动更新 7 处文档，遗漏率 30%

**方案 A**: 更详细的 checklist（42 → 50 steps）
- ❌ 步骤更多 → 更难遵守

**方案 B**: 创建更好的模板
- ❌ 仍然手动 → 仍然会忘

**方案 C**: 脚本自动更新**（选择）**
- ✅ 零遗漏
- ✅ 零人工错误
- ✅ 快速（15min vs 40min）

**Linus 原则**: "自动化可重复的事情"

### 决策 2: 为什么强制单次变更？

**v0.1.7 数据**:
- 同时改 4 处 → 100% 失败率
- Context 消耗 50k+ tokens
- 调试时间 6+ 小时
- 最终全部回滚（0 进展）

**v0.1.6 数据**:
- 只改 2 行 → 100% 成功率
- Context 消耗 5k tokens
- 调试时间 0（一次成功）
- 结果 +789% 自动通过率

**结论**: 单次变更不是"保守"，而是"更快"

**Linus 原则**: "Slow is fast, fast is slow"

### 决策 3: 为什么采用信息金字塔而非平行文档？

**当前问题**:
```
CLAUDE.md ←→ PROJECT_STATUS.md ←→ implementation_record.md
      ↓              ↓                    ↓
   重复 40%       重复 40%             重复 40%
```

**新设计**:
```
              CLAUDE.md (汇总层)
                  ↑
          PROJECT_STATUS.md (当前层)
                  ↑
      implementation_record.md (历史层)
                  ↑
        analysis/*.md (详情层)
```

**好处**:
- 信息只向上流动（汇总）
- 每层职责清晰
- 重复率 40% → 10%

**Linus 原则**: "Good taste means eliminating special cases"
- 每个文档都"自成体系" = 每个都是特殊情况 = 坏设计

---

## 附录：v0.1.7 事故时间线

### 00:00 - 计划阶段
- ✅ 创建 v0.1.7_plan.md
- ✅ 识别 4 处需要修改的地方

### 00:30 - 实施阶段（错误开始）
- ❌ **同时修改 4 处**（违反单次变更原则）
- ❌ 未进行单元测试

### 01:00 - 测试失败
- 结果: 32.0% → 0.0%（灾难性失败）
- Context 开始爬升: 10k → 20k

### 01:30 - 第一次回滚
- ❌ **只回滚源代码，忘记重新构建**
- 验证测试: 仍然 0%

### 02:00 - 第二次回滚
- ✅ 重新构建 dist/
- ❌ **验证测试: 仍然 0%**（发现索引损坏）
- Context: 30k → 40k

### 02:30 - 根因分析
- 对比同一文件的 baseline vs 验证结果
- **发现索引文件被 v0.1.7 代码污染**
- Context: 40k → 50k

### 03:00 - 索引重建失败
- 错误: "Required columns not found: s_field1, s_field2"
- Context: 50k → 60k

### 03:30 - 最终解决
- 发现 `--field1` 和 `--field2` CLI 选项
- 使用正确列名重建索引
- **验证成功: 71 exact (32.0%)**

### 总耗时: 6+ 小时
### Context 消耗: 60k+ tokens
### 结果: 全部回滚，0 进展

**如果遵循单次变更原则**:
- 每次 30 分钟
- 4 次共 2 小时
- Context 每次 10k，共 40k
- 至少保留部分成功的变更

---

## 结论

**核心教训**:
1. "做得太多"永远是错的
2. 自动化重复工作
3. 简洁性是王道

**立即行动**:
1. 创建强制规则（今天）
2. 实施自动化脚本（本周）
3. 重构文档流（下周）

**长期目标**:
- Context 消耗 -64%
- 更新时间 -62%
- 错误率 -100%
