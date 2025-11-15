# 版本发布工作流

**版本**: v1.0
**最后更新**: 2025-11-15
**适用项目**: terminal-gd (OCR Match Core)

---

## 📋 概述

本文档定义了项目版本发布的完整工作流程。**每次实施新版本时**，必须按以下流程完整执行，确保文档与代码同步更新。

**核心原则**:
- ✅ 文档先行（规划 → 代码 → 测试 → 文档更新 → 提交）
- ✅ 零信息丢失（所有变更必须体现在文档中）
- ✅ 可追溯性（版本号、配置哈希、运行包ID全链路记录）

---

## 阶段 0: 版本规划

**目标**: 明确本次版本要做什么、预期效果如何

### 必须完成

- [ ] 在 `analysis/vX.Y.Z/` 创建实施计划文档（如 `vX.Y.Z_plan.md`）
- [ ] 明确优化目标、技术方案、预期 KPI、风险评估
- [ ] **区分"核心任务"和"附加任务"**：
  - **核心任务**：必须完成，否则不发版
  - **附加任务**：可延后到下一版本
- [ ] 在 `docs/PROJECT_STATUS.md` 中标记当前阶段为 "🔥 进行中"

### 规划文档模板结构

```markdown
# vX.Y.Z 实施计划

## 版本定位
- 简短描述本次版本的核心目标

## 任务列表

### 核心任务（必须完成，否则不发版）
- [ ] 任务1
- [ ] 任务2

### 附加任务（可延后）
- [ ] 任务3

## 技术方案
- 详细的实施方案

## 预期效果
- KPI 目标
- 预期收益

## 风险评估
- 可能的风险点
```

### 输出产物

- `analysis/vX.Y.Z/vX.Y.Z_plan.md` - 详细实施计划

---

## 阶段 0.5: 提交规划文档

**目标**: 规划完成后，先 commit 规划文档，作为"版本契约"

### 必须完成

- [ ] 确认规划文档已创建且内容完整
- [ ] 确认 `docs/PROJECT_STATUS.md` 已更新（路线图标记"进行中"）
- [ ] 提交规划文档到 Git（使用 `plan:` 前缀）

### Commit Message 模板

```
plan: vX.Y.Z [简短描述]

[规划详情]

**Planned Changes**:
- [计划变更1]
- [计划变更2]

**Expected Results**:
- [预期效果]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 必须包含的文件

- [ ] `analysis/vX.Y.Z/vX.Y.Z_plan.md`
- [ ] `docs/PROJECT_STATUS.md`

### 价值

- ✅ 规划可追溯（Git 历史有明确的"规划 commit"）
- ✅ 实施前有检查点（可以 review 规划，发现问题可以及时调整）
- ✅ 多人协作时，其他人可以看到"接下来要做什么"

---

## 阶段 1: 代码实施

**目标**: 完成代码变更和功能实现

### 必须完成

- [ ] 修改核心代码（`packages/ocr-match-core/src/`）
- [ ] 构建项目（`pnpm -F ./packages/ocr-match-core build`）
- [ ] 本地验证（单个样本快速测试）

### 输出产物

- 修改的 `.ts` 文件
- 编译后的 `dist/` 文件

### 📋 Spec Workflow 集成（可选）

如果本次版本实施基于 spec（规格文档），可以使用 `mcp__spec-workflow__log-implementation` 工具记录实施日志：
- 使用 `npm run update-docs` 时提供第 5 个参数 `specName`（kebab-case）
- 文档生成器会自动创建引用链接到 `.spec-workflow/specs/{specName}/` 而非列出文件清单
- 详见 `.spec-workflow/specs/spec-docs-integration/` 示例

### 🔄 如果发现问题需要延后（重要！）

当实施过程中发现某些任务无法完成或不适合在本版本完成时，按以下流程处理：

#### Step 1: 在规划文档中标记"实施调整"

在 `analysis/vX.Y.Z/vX.Y.Z_plan.md` 末尾添加：

```markdown
---

## 🔄 实施调整（Deferred Items）

**调整日期**: YYYY-MM-DD

### 延后到 vX.Y.Z+1 的任务

**任务**: [任务名称]

**原因**：
- [为什么延后]
- [当前状态]

**预期影响**：
- vX.Y.Z 预期收益：[调整后的预期]
- vX.Y.Z+1 预期收益：[延后任务的预期]

**下一步**：
- [vX.Y.Z 完成后的行动计划]
```

#### Step 2: 更新 PROJECT_STATUS.md

在 `docs/PROJECT_STATUS.md` 的"下一步计划"章节中明确延后的任务：

```markdown
### 下一步计划（vX.Y.Z+1 - [延后任务名称]）

**当前阶段**: Phase X ([任务名称]) - **下一阶段** 🔥

**任务来源**: 从 vX.Y.Z 延后

**P1 级任务**：
- [ ] [延后的具体任务]

**预期成果**: [预期效果]
```

#### Step 3: 提交调整后的规划文档

创建一个单独的 commit：

```bash
git add analysis/vX.Y.Z/vX.Y.Z_plan.md docs/PROJECT_STATUS.md
git commit -m "plan: adjust vX.Y.Z scope (defer [任务名称] to vX.Y.Z+1)

[调整原因说明]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 版本号语义规则

- ✅ 版本号对应"已完成的功能"，不对应"最初的规划"
- ✅ 如果核心任务完成，附加任务延后 → 仍然发布本版本号
- ✅ 如果核心任务无法完成 → 重新评估是否发版

---

## 阶段 2: 完整测试

**目标**: 在完整数据集上验证效果

### 必须完成

- [ ] 运行完整测试（222个样本）
- [ ] 生成运行包（`runs/run_vX.Y.Z_fix_YYYYMMDD_HHMMSS/`）
- [ ] 确认 `summary.md` 和 `results.csv` 生成成功
- [ ] 记录运行包 ID

### 输出产物

- `runs/run_vX.Y.Z_fix_YYYYMMDD_HHMMSS/` - 完整运行包

---

## 阶段 3: 文档更新（核心！不可遗漏）

**目标**: 确保所有文档反映最新实施情况

### 3.1 创建测试报告

**必须完成**：
- [ ] 在 `analysis/vX.Y.Z/` 创建实测报告（如 `vX.Y.Z_实测报告.md`）
- [ ] 包含 KPI 对比、代码变更、Bug 记录、下一步建议

**模板结构**：
```markdown
# vX.Y.Z 实测报告

## 执行总结
- 实施内容
- 核心 KPI 对比

## 正面成果
- 改善数据

## 发现的问题
- 问题分析

## 代码变更记录
- 具体修改

## 下一步行动建议
- 优化方向
```

### 3.2 更新 implementation_record.md

**必须完成**：
- [ ] 在 `docs/implementation_record.md` **顶部**添加新版本条目
- [ ] 包含：版本号、日期、代码变更、测试结果、技术洞察

**检查点**：
- ✅ 新版本条目在文件最上方
- ✅ 包含完整的测试结果表格
- ✅ 代码变更包含文件路径和行号
- ✅ 更新"关键指标演进"表格

### 3.3 更新 PROJECT_STATUS.md

**必须完成**：
- [ ] 更新顶部元数据（最后更新时间、当前版本、下一版本）
- [ ] 更新"核心指标"表格（当前 KPI 数值）
- [ ] 在"版本历史"表格添加新版本行
- [ ] 移动路线图中的阶段（完成的阶段从"进行中"移至"已完成"）
- [ ] 更新"待解决的核心问题"（如有新发现）

**检查点**：
- ✅ 日期是今天
- ✅ 当前版本号正确
- ✅ KPI 数值与测试运行包一致
- ✅ 路线图阶段状态正确

---

## 阶段 4: Git 提交

**目标**: 将所有变更提交到版本控制

### 必须完成

- [ ] 确认所有代码和文档文件已暂存
- [ ] 创建规范的 commit message（参考 Git Safety Protocol）
- [ ] 验证 commit 包含所有必需文件

### Commit Message 模板

```
feat(ocr-core): [简短描述] (vX.Y.Z)

[详细说明本次优化内容]

**Changes**:
- [变更1]
- [变更2]

**Results** (222 samples):
- Exact: X → Y (+Z, +W%)
- [其他 KPI 变化]

**Bug Fixed** (if any):
- [修复的 Bug]

**Documentation**:
- [文档更新说明]

Run ID: run_vX.Y.Z_fix_YYYYMMDD_HHMMSS
Spec: spec-name (可选，如果本次版本有对应的 spec 实施)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 必须包含的文件

- [ ] 修改的源代码文件（`packages/ocr-match-core/src/`）
- [ ] `docs/implementation_record.md`
- [ ] `docs/PROJECT_STATUS.md`
- [ ] `analysis/vX.Y.Z/` 新建的分析报告
- [ ] `analysis/vX.Y.Z/plan.md` 计划文档（如有新建）
- [ ] `.spec-workflow/specs/{spec-name}/` 实施日志（**如果有 spec 实施**）

---

## 阶段 5: 更新 CLAUDE.md（闭环！）

**目标**: 更新 CLAUDE.md 顶部的"快速状态恢复"章节，确保新 session 能看到最新信息

### 必须完成

- [ ] 更新"最后更新"日期
- [ ] 更新"当前版本"为刚发布的版本
- [ ] 更新"下一版本"为计划中的下一个版本
- [ ] 更新"核心 KPI"表格（使用最新数值）
- [ ] 更新"最近完成的工作"章节：
  - 实施日期
  - Git Commit ID
  - 代码变更文件
  - 成果数据
  - 测试运行包 ID
- [ ] 更新"下一步计划"章节（基于实测报告的建议）
- [ ] 如有新的技术决策，添加到"关键技术决策记录"

### 创建独立的 Git Commit

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md quick recovery section for vX.Y.Z

Updated status dashboard with latest vX.Y.Z results and next steps planning.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## ✅ 完整 Checklist（每次发布前核对）

### 代码与测试

- [ ] 代码已实施并构建成功
- [ ] 完整测试已运行（222 样本）
- [ ] 运行包已生成并验证

### 文档更新（关键！）

- [ ] `analysis/vX.Y.Z/vX.Y.Z_实测报告.md` 已创建
- [ ] `docs/implementation_record.md` 已更新（顶部添加新版本）
- [ ] `docs/PROJECT_STATUS.md` 已更新（5个位置）
  - [ ] 顶部元数据
  - [ ] 核心指标表格
  - [ ] 版本历史表格
  - [ ] 路线图阶段状态
  - [ ] 待解决问题列表
- [ ] `analysis/vX.Y.Z/plan.md` 计划文档已处理（如有新建）

### Git 提交

- [ ] 主 commit 已创建（包含代码 + 文档）
- [ ] Commit message 遵循规范
- [ ] 所有必需文件已包含在 commit 中

### CLAUDE.md 更新（闭环！）

- [ ] CLAUDE.md 顶部"快速状态恢复"章节已更新（7个位置）
  - [ ] 最后更新日期
  - [ ] 当前版本
  - [ ] 下一版本
  - [ ] 核心 KPI 表格
  - [ ] 最近完成的工作
  - [ ] 下一步计划
  - [ ] 关键技术决策记录
- [ ] CLAUDE.md 更新已创建独立 commit

### 验证

- [ ] 运行 `git log --oneline -2` 确认两个 commit 都已创建
- [ ] 运行 `cat CLAUDE.md | head -50` 确认快速恢复章节已更新
- [ ] 运行 `cat docs/PROJECT_STATUS.md | head -30` 确认状态文档已更新

---

## 🚨 常见遗漏提醒

**最容易忘记的步骤**（请特别注意！）：

### 1. 忘记更新 PROJECT_STATUS.md 的路线图阶段
- **症状**：阶段还停留在"进行中"，实际已完成
- **修复**：移动对应阶段到"已完成"，更新"进行中"为下一阶段

### 2. 忘记更新 CLAUDE.md 顶部章节
- **症状**：新 session 看到的还是旧版本信息
- **修复**：按"阶段 5"完整执行 CLAUDE.md 更新

### 3. implementation_record.md 新版本不在顶部
- **症状**：版本历史顺序混乱
- **修复**：确保新版本条目插入到文件最上方

### 4. 测试运行包 ID 没有记录
- **症状**：无法追溯测试结果
- **修复**：在所有文档中明确标注运行包路径

### 5. Git commit 缺少文档文件
- **症状**：代码提交了，文档没提交
- **修复**：提交前运行 `git status` 仔细检查

---

## 📚 相关文档

- [CLAUDE.md](../../CLAUDE.md) - AI meta-instructions and quick recovery
- [PROJECT_STATUS.md](../../docs/PROJECT_STATUS.md) - Current project status dashboard
- [implementation_record.md](../../docs/implementation_record.md) - Complete version history
- [TECHNICAL_DECISIONS.md](../../docs/TECHNICAL_DECISIONS.md) - Technical decision log

---

**文档版本**: v1.0
**最后更新**: 2025-11-15
**维护者**: Project Team
