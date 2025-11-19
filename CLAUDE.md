# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ 强制规则（违反 = 项目失败）

### Rule 1: 单次变更原则
**禁止**同时修改多处代码。每次只改一个文件的一个函数。

**正确做法**:
- ✅ v0.1.8a: 只修复 extractor.ts 行级扫描 bug
- ✅ v0.1.8b: 只添加 noise_words 截断验证

**错误做法**:
- ❌ v0.1.7: 同时改 extractor.ts + label_alias.json + 4 处逻辑 → 100% 失败率

### Rule 2: 失败立即停止
测试失败 → 立即回滚 → 分析原因 → 单独修复
**禁止**在失败基础上继续叠加修复。

### Rule 3: Context 预算
每次实施预算 15k tokens。超出 → 保存方案到临时文档 → 新 session 继续。

---

## 🧭 Quick Navigation（快速导航）

### 新 Session 恢复流程

**Step 1: 项目状态** → Read `docs/PROJECT_STATUS.md`
- 当前版本、KPI、路线图、下一步计划
- 3-step Quick Start guide（项目上下文恢复）

**Step 2: 版本历史** → Read `docs/implementation_record.md`
- 完整版本演进记录（v0.1.0 → 当前）
- 每个版本的技术洞察和代码变更

**Step 3: 测试运行指南** → Read `docs/TEST_GUIDE.md`
- 标准化测试脚本使用方法
- CLI 参数详解和调优建议
- 版本发布测试流程

**Step 4: 发布流程** → Read `analysis/docs-flow-automation/RELEASE_WORKFLOW.md`
- 阶段 0-5 完整工作流
- 文档更新 Checklist
- 常见遗漏提醒

**Step 5: 技术决策** → Read `docs/TECHNICAL_DECISIONS.md`
- 核心架构决策（Monorepo/配置版本化/运行包结构）
- 设计约束和演进教训

### 环境验证（可选）

如需执行代码，运行以下检查：
```bash
git branch --show-current       # 检查分支
git log --oneline -3           # 最新commit
ls -lt runs/ | head -5         # 最新运行包
```

---

## 🛠️ Tool Usage（工具使用）

### Spec Workflow（规格文档工作流）

**何时使用 Spec**：

使用 spec-workflow 的判断标准：
- ✅ **多文件修改**（≥3 个文件）或架构变更
- ✅ **新增 API endpoints/组件/核心函数**（需要详细设计）
- ✅ **复杂实施**（需要分阶段审批和文档记录）
- ❌ 简单 bug fix（单文件、单函数修改）
- ❌ 纯配置调整（label_alias.json、noise_words.json）
- ❌ 文档更新（除非涉及架构级文档重构）

**完整流程**：

详见 `.spec-workflow/WORKFLOW_GUIDE.md` (v2.1)，核心要点：
1. **Dashboard 自动启动** - AI 自动执行，你只需打开浏览器审批
2. **R/D/T 一起提交** - 审批通过后原子化提交（避免部分文档丢失）
3. **正常 Git 习惯** - 小步提交（试错、重构、bug fix），每个 commit 包含 Task ID
4. **Implementation Log** - 反向记录 Task → Commits 映射关系

**与版本发布的关系**：

Spec 可以独立存在（纯重构/文档优化，不发版），也可以关联版本发布。

详见 `analysis/docs-flow-automation/RELEASE_WORKFLOW.md` (v2.0) Stage 0-1。

**快速开始**：

```bash
# AI 会自动判断是否需要 spec
# 如果需要，AI 会自动：
# 1. 启动 dashboard（npx -y @pimzino/spec-workflow-mcp@latest --dashboard）
# 2. 完成 R/D/T 文档（你在 dashboard 审批）
# 3. 提交 R/D/T 文档（一起提交）
# 4. 实施 tasks（遵循 Task 三连流程）

# 你只需要：
# - 打开 http://localhost:3000 审批
# - 验证实施效果
```

**已完成的 Spec 示例**：
- `claude-md-simplification` - CLAUDE.md 重构（218 lines → 文档优化）
- `spec-docs-integration` - Spec workflow 与 docs-flow 集成
- `docs-flow-automation` - 版本发布自动化脚本
- `docs-structure-cleanup` - 文档结构重组
- `workflow-automation-v2` - 工作流自动化 v2.0（本次改造）

### Docs Flow Automation（文档自动化）

**脚本**: `scripts/update-docs.js`

**功能**:
- 自动更新 `PROJECT_STATUS.md` 的 KPI 表格和元数据
- 自动更新 `CLAUDE.md` 的导航指针日期/版本（不更新完整数据）
- 自动更新 `implementation_record.md` 版本条目

**使用**:
```bash
npm run update-docs
```

### MCP Tools

**已配置的 MCP Servers**:
- `spec-workflow` - 规格文档管理
- `context7` - 库文档查询
- `grep` - GitHub 代码搜索

**使用方式**:
- 通过 Claude Code 的工具列表调用（以 `mcp__` 前缀标识）
- 详见工具描述中的使用说明

---

## 🏗️ Architecture Principles（架构原则）

### Monorepo Philosophy

**核心理念**: "两个项目、一套真理"

```
terminal-gd/
├── apps/
│   └── electron-app/        # Desktop Runner (Electron)
├── packages/
│   └── ocr-match-core/      # Shared Core (算法库)
├── configs/vX.Y.Z/<sha>/    # Versioned Configurations
└── runs/run_YYYYmmdd_*/     # Immutable Run Bundles
```

**数据流**:
```
OCR图像 → .txt → 字段提取 → DB模糊匹配 → 分桶 → 运行包
```

### Configuration Immutability（配置不可变性）

- ✅ 配置版本化：`configs/vX.Y.Z/<sha>/`（永不修改历史配置）
- ✅ 指针机制：`configs/latest.json` 指向当前激活版本
- ✅ 完整追溯：每次运行记录 `config_version/config_sha`

**反面教训**：v0.1.7 配置污染导致灾难性回归

### Run Bundle Structure（运行包结构）

每个运行包独立可复现：
```
runs/run_YYYYmmdd_HHMMSS__<tag>/
├── manifest.json          # 元数据
├── summary.md            # 执行总结
├── results.csv           # 单一数据源真理（列契约不可破坏）
└── log.jsonl             # 结构化日志
```

### Processing Pipeline（处理管线）

**四阶段设计**:
1. **Normalize** - 文本清洗（replacements → maps → strip）
2. **Extract** - 字段提取（行级扫描 + 拼接 + 修剪）
3. **Match** - 三级匹配（fast-exact → anchor → recall+rank）
4. **Bucketize** - 分桶决策（exact/review/fail）

**已知问题**：Extract 阶段存在多行布局解析错误（v0.1.6发现，影响50%失败案例）

详见 `docs/TECHNICAL_DECISIONS.md`

---

## 💻 Development Quick Reference（开发快查）

### Core Commands

```bash
# Monorepo 管理
pnpm install                                    # 安装依赖
pnpm -F ./apps/electron-app dev                 # 开发 Electron
pnpm -F ./packages/ocr-match-core build         # 构建 core 包

# 测试运行（推荐使用标准化脚本）
pnpm test:full                                  # 完整测试（带 digest 校验）
pnpm test:quick                                 # 快速测试（跳过校验）
pnpm test:sample [<baseline>]                   # 采样测试（38min → 2-3min，8.8倍加速）⚡
pnpm test:custom -- <args>                      # 自定义参数测试

# 文档生成
npm run update-docs                             # 更新文档自动化

# Git 工作流
git add . && git commit -m "feat: xxx"         # 提交变更
git log --oneline -3                            # 查看历史
```

### Code Style

- **TypeScript strict mode** 已启用
- **文件命名**: `camelCase.ts`（模块）/ `PascalCase.tsx`（React组件）
- **函数要求**: 短小精悍，单一职责，≤3层缩进
- **日志格式**: `[timestamp][level][module][context] message`

### Critical Constraints

- ✅ **永不破坏运行包契约** - `results.csv` 列定义是 API
- ✅ **配置不可变性** - 一旦写入 `configs/vX.Y.Z/<sha>/`，永不修改
- ✅ **DB digest 记录** - 每次运行记录 DB 的 hash
- ✅ **仅构建** `apps/*` 和 `packages/*`（不构建 `examples/` 和 `sandbox/`）

### Package Manager

- **必须使用 pnpm@9.12.2**（通过 `packageManager` 锁定）
- **Path Filter**: 始终使用 `-F ./apps/electron-app` 而非包名

---

## 📚 Related Documentation

**主要文档**（按优先级）:
1. [PROJECT_STATUS.md](docs/PROJECT_STATUS.md) - 项目状态仪表盘
2. [implementation_record.md](docs/implementation_record.md) - 完整版本历史
3. [RELEASE_WORKFLOW.md](analysis/docs-flow-automation/RELEASE_WORKFLOW.md) - 发布流程
4. [TECHNICAL_DECISIONS.md](docs/TECHNICAL_DECISIONS.md) - 技术决策记录

**分析报告**:
- `analysis/v0.1.6/v0.1.6_实测报告.md` - 最新版本详细报告
- `analysis/v0.1.7/v0.1.7_failure_analysis.md` - 失败案例分析
- `analysis/v0.1.4/` - P0-Fix 相关分析

---

<!-- ⚠️ 以下章节已移至独立文档 -->
<!-- "快速状态恢复" → docs/PROJECT_STATUS.md -->
<!-- "版本发布工作流" → analysis/docs-flow-automation/RELEASE_WORKFLOW.md -->
<!-- "关键技术决策记录" → docs/TECHNICAL_DECISIONS.md -->
<!-- "核心架构理念"（详细版）→ docs/TECHNICAL_DECISIONS.md -->

**最后更新**: 2025-11-19 | **文档简化**: CLAUDE.md 现只包含 AI meta-instructions，项目数据已迁移至 docs/
