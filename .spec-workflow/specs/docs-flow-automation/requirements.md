# Requirements Document

## Introduction

基于 v0.1.7 事故复盘（Context 爆炸 50k+ tokens，6 小时调试，0 进展），我们需要自动化文档更新流程，将手动更新 7 处文档的工作改为脚本驱动，消除 30% 的遗漏率和人为错误。

**核心价值**：
- Context 消耗从 28k 降至 10k（-64%）
- 文档更新时间从 40 分钟降至 15 分钟（-62%）
- 错误率从 30% 降至 0%（-100%）

**范围**：Phase 2（自动化脚本）和 Phase 3（文档重构）

## Alignment with Product Vision

本方案直接解决 v0.1.7 事故暴露的核心问题：
- 同时修改多处 → 复杂性失控 → Context 爆炸 → 信息丢失
- 手动更新文档 → 遗漏/不一致 → 新 session 无法快速恢复

符合项目核心理念：
1. **简洁性是王道** - 消除手动重复工作
2. **单一数据源真理** - implementation_record.md 作为唯一手动源
3. **信息金字塔** - 数据只向上流动（汇总），不向下传递

## Requirements

### Requirement 1: 自动化文档更新脚本

**User Story**: 作为开发者，我希望有一个脚本能自动提取测试结果和 git 信息，并更新所有相关文档，这样我就不会遗漏任何文档更新，也不会出现不一致。

#### Acceptance Criteria

1. **WHEN** 运行 `npm run update-docs` **THEN** 系统 **SHALL** 自动执行以下操作：
   - 从 git log 提取最新版本号（vX.Y.Z）
   - 从 runs/ 目录找到最新测试运行包
   - 从 summary.md 提取 KPI 数据（Exact/Review/Fail 的数值和百分比）
   - 生成版本条目并插入到 implementation_record.md 顶部
   - 更新 PROJECT_STATUS.md 的 KPI 表格和版本历史
   - 更新 CLAUDE.md 的"快速状态恢复"章节

2. **WHEN** summary.md 格式发生变化导致正则匹配失败 **THEN** 系统 **SHALL** 抛出明确的错误信息，指示哪个字段提取失败，并展示前 200 字符的原文

3. **WHEN** 自动更新过程中任一文件写入失败 **THEN** 系统 **SHALL** 回滚所有变更（atomic update），恢复到更新前的状态

4. **WHEN** implementation_record.md 新版本条目生成后 **THEN** 系统 **SHALL** 标记"[等待补充标题]"和"[等待手动补充具体变更]"，提示用户手动补充技术洞察

5. **WHEN** 脚本执行成功 **THEN** 系统 **SHALL** 输出清晰的日志，列出所有更新的文件和待补充的内容

### Requirement 2: 健壮的 KPI 提取

**User Story**: 作为开发者，我希望 KPI 提取逻辑能应对多种格式变化，这样即使 summary.md 格式轻微调整，脚本也不会崩溃。

#### Acceptance Criteria

1. **WHEN** Exact KPI 格式为 `Exact | 71 / 222 | 32.0%` **THEN** 系统 **SHALL** 提取 count=71, percent=32.0

2. **WHEN** Exact KPI 格式为 `Exact: 71 (32.0%)` **THEN** 系统 **SHALL** 提取 count=71, percent=32.0

3. **IF** 所有已知模式都匹配失败 **THEN** 系统 **SHALL** 抛出错误并展示 summary.md 的前 200 字符，帮助调试

4. **WHEN** 提取到 KPI 数据 **THEN** 系统 **SHALL** 验证数据合法性（count 为正整数，percent 为 0-100 之间的浮点数）

### Requirement 3: 文档结构重构

**User Story**: 作为新 session 的开发者，我希望能在 3 分钟内从 CLAUDE.md 快速恢复项目状态并开始工作，而不是阅读 40% 重复的冗长文档。

#### Acceptance Criteria

1. **WHEN** 新 session 读取 CLAUDE.md 快速恢复章节 **THEN** 系统 **SHALL** 展示：
   - 当前版本号、最后更新时间
   - 核心 KPI 表格（4 行数据）
   - 最近完成的工作（代码变更 + 测试运行包 ID）
   - 下一步计划（P0 级任务清单）

2. **WHEN** CLAUDE.md 的自动生成章节被修改 **THEN** 系统 **SHALL** 在下次 update-docs 时覆盖修改（通过 `<!-- AUTO-GENERATED -->` 标记）

3. **WHEN** PROJECT_STATUS.md 被访问 **THEN** 系统 **SHALL** 展示：
   - 核心指标表格（单一 KPI 表格）
   - 当前阶段（Phase X）
   - 下一步计划（Top 3 任务）
   - 待解决问题（Top 3 问题）
   - 详细历史跳转链接（→ implementation_record.md）

4. **WHEN** implementation_record.md 被访问 **THEN** 系统 **SHALL** 展示：
   - 顶部快速跳转（关键技术洞察的 anchor links）
   - 常见问题 FAQ（折叠式 details）
   - 完整版本历史（倒序排列，最新在最上）

### Requirement 4: 端到端发布工作流

**User Story**: 作为开发者，我希望有一个端到端的发布脚本，它能引导我完成测试 → 文档更新 → Git commit 的完整流程，这样我就不会遗漏任何步骤。

#### Acceptance Criteria

1. **WHEN** 运行 `npm run release` **THEN** 系统 **SHALL** 执行以下流程：
   - 检查 runs/ 目录是否有最新测试运行包
   - 自动执行 update-docs 更新文档
   - 暂停并提示用户补充 implementation_record.md 的技术洞察
   - 等待用户按 Enter 确认
   - 创建 git commit（文档更新）

2. **IF** 没有找到测试运行包 **THEN** 系统 **SHALL** 抛出错误："❌ No test runs found. Run tests first."

3. **WHEN** 用户补充完 implementation_record.md **THEN** 系统 **SHALL** 生成规范的 commit message：
   ```
   docs: update docs for vX.Y.Z

   Auto-generated KPI updates + manual insights.

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

## Non-Functional Requirements

### Code Architecture and Modularity

- **单一职责原则**：
  - `scripts/update-docs.mjs` - 负责数据提取和文档更新
  - `scripts/release.mjs` - 负责端到端发布流程编排
  - 每个函数只做一件事（extractKPI/updateImplementationRecord/updateProjectStatus/updateClaudeMd）

- **模块化设计**：
  - KPI 提取逻辑封装为 `safeExtractKPI(content)` - 可独立测试
  - 原子更新封装为 `atomicUpdate(files)` - 确保事务性
  - 文档更新逻辑分离为独立函数 - 易于维护

- **依赖管理**：
  - 仅依赖 Node.js 标准库（fs/promises, child_process）
  - 无外部 npm 依赖 - 降低复杂度

- **清晰接口**：
  - 输入：runs/ 目录、git log、现有文档内容
  - 输出：更新后的 Markdown 文件
  - 错误处理：明确的错误类型和上下文信息

### Performance

- **脚本执行时间**：≤ 5 秒（提取 + 更新 3 个文档）
- **文件读写**：使用异步 I/O，避免阻塞
- **内存占用**：≤ 50MB（处理 Markdown 文本）

### Security

- **路径验证**：所有文件路径必须在项目根目录下
- **命令注入防护**：execSync 参数不包含用户输入
- **文件权限**：生成的文档权限与原文件一致

### Reliability

- **错误处理**：
  - 所有关键操作都有 try-catch
  - 错误信息包含上下文（哪个文件/哪个字段失败）
  - Atomic update 确保更新失败时不留下半成品

- **数据验证**：
  - KPI 数值范围检查（count > 0, 0 ≤ percent ≤ 100）
  - 版本号格式验证（vX.Y.Z 或 vX.Y.Za）
  - 文件存在性检查（runs/、docs/、CLAUDE.md）

- **可追溯性**：
  - 每次更新都记录运行包 ID
  - Git commit 包含完整的变更上下文

### Usability

- **命令简洁**：
  - `npm run update-docs` - 自动更新文档
  - `npm run release` - 端到端发布流程

- **输出友好**：
  - 彩色 emoji + 进度提示
  - 明确的错误信息和修复建议
  - 待补充内容清单（checklist）

- **文档可读性**：
  - CLAUDE.md 快速恢复章节 ≤ 100 行
  - PROJECT_STATUS.md ≤ 200 行（3 分钟读完）
  - implementation_record.md 有快速跳转和 FAQ

### Maintainability

- **代码注释**：
  - 每个函数有 JSDoc 注释
  - 关键算法有行内注释（为什么这样做）

- **测试友好**：
  - 纯函数设计 - 易于单元测试
  - Mock 友好 - fs/execSync 可替换

- **版本管理**：
  - 脚本本身纳入版本控制
  - 文档更新模式可配置（通过 config 对象）

## Success Metrics

| 指标 | 当前值 | 目标值 | 验证方式 |
|------|--------|--------|----------|
| Context 消耗 | 28k tokens | ≤10k tokens | 新 session 读取 CLAUDE.md 快速恢复即可开始工作 |
| 文档更新时间 | 40min | ≤15min | `npm run update-docs` + 手动补充 ≤15min |
| 文档遗漏率 | 30% | 0% | 自动化脚本保证 7 处同步更新 |
| 新 session 理解时间 | ≥10min | ≤3min | 读 CLAUDE.md + PROJECT_STATUS.md ≤3min |
| 脚本执行成功率 | - | 100% | 包含健壮的错误处理和回滚机制 |

## References

- **DOCS_FLOW_REDESIGN.md** - 原始方案
- **DOCS_FLOW_REDESIGN-refine.md** - Linus 式深度分析评审
- **v0.1.7 失败时间线** - DOCS_FLOW_REDESIGN.md 附录
- **scripts/emergency-rollback.sh** - Phase 1 回滚脚本参考
