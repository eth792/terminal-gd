# Tasks Document

## Phase 2: 自动化脚本实现

### 2.1 核心脚本实现（update-docs.js）

- [x] 1. 创建 safeExtractKPI 函数（多重模式匹配）
  - File: scripts/update-docs.js
  - Purpose: 实现健壮的 KPI 提取逻辑，支持多种 summary.md 格式
  - _Leverage: scripts/emergency-rollback.sh（参考其严格错误处理模式）
  - _Requirements: Requirement 2（健壮的 KPI 提取）

- [x] 2. 创建 atomicUpdate 函数（原子性文件更新）
  - File: scripts/update-docs.js
  - Purpose: 实现原子性文档更新，确保全部成功或全部失败
  - _Leverage: scripts/emergency-rollback.sh（参考其三阶段执行流程）
  - _Requirements: Requirement 1.3（原子性更新）

- [x] 3. 创建 updateImplementationRecord 函数
  - File: scripts/update-docs.js
  - Purpose: 生成版本条目并插入到 implementation_record.md 顶部
  - _Leverage: CLAUDE.md（参考版本发布工作流的模板结构）
  - _Requirements: Requirement 1.1, 1.4（自动生成版本条目 + 提示补充）

- [x] 4. 创建 updateProjectStatus 函数
  - File: scripts/update-docs.js
  - Purpose: 更新 PROJECT_STATUS.md 的 KPI 表格和版本历史
  - _Leverage: docs/PROJECT_STATUS.md（当前格式）
  - _Requirements: Requirement 1.1（更新 PROJECT_STATUS.md）

- [x] 5. 创建 updateClaudeMd 函数
  - File: scripts/update-docs.js
  - Purpose: 更新 CLAUDE.md 的"快速状态恢复"章节
  - _Leverage: CLAUDE.md（当前快速恢复章节格式）
  - _Requirements: Requirement 1.1（更新 CLAUDE.md）

- [x] 6. 集成主函数 updateDocs
  - File: scripts/update-docs.js
  - Purpose: 编排完整的文档更新流程
  - _Leverage: 前面 5 个任务创建的函数
  - _Requirements: Requirement 1（完整自动化流程）

- [x] 7. 添加到 package.json scripts
  - File: package.json
  - Purpose: 让用户通过 npm run update-docs 运行脚本
  - _Requirements: Requirement 1（可用性 - 命令简洁）

### 2.2 发布流程脚本（release.js）

- [x] 8. 创建 checkTestRuns 函数
  - File: scripts/release.js
  - Purpose: 检查 runs/ 目录是否有测试运行包
  - _Leverage: scripts/update-docs.js（参考类似逻辑）
  - _Requirements: Requirement 4.2（端到端发布 - 预检）

- [x] 9. 创建 promptUserInput 函数
  - File: scripts/release.js
  - Purpose: 暂停并等待用户按 Enter 确认
  - _Requirements: Requirement 4.3（交互式提示）

- [x] 10. 集成主函数 release
  - File: scripts/release.js
  - Purpose: 编排端到端发布流程（测试检查 → 文档更新 → 手动补充 → Git commit）
  - _Leverage: scripts/update-docs.js, CLAUDE.md commit message 模板
  - _Requirements: Requirement 4（端到端发布工作流）

- [x] 11. 添加 release 命令到 package.json
  - File: package.json
  - Purpose: 让用户通过 npm run release 运行发布流程
  - _Requirements: Requirement 4（可用性 - 命令简洁）

## Phase 3: 文档重构

### 3.1 CLAUDE.md 重构

- [x] 12. 添加自动生成标记到 CLAUDE.md
  - File: CLAUDE.md
  - Purpose: 标记快速恢复章节为自动生成，防止手动编辑被覆盖
  - _Leverage: 现有 CLAUDE.md 结构
  - _Requirements: Requirement 3（文档重构 - 自动生成标记）

### 3.2 PROJECT_STATUS.md 精简

- [x] 13. 精简 PROJECT_STATUS.md
  - File: docs/PROJECT_STATUS.md
  - Purpose: 删除重复内容，精简为 ≤200 行（3 分钟读完）
  - _Leverage: 现有 PROJECT_STATUS.md 内容
  - _Requirements: Requirement 3.2（PROJECT_STATUS.md 精简）

### 3.3 implementation_record.md 增强

- [x] 14. 添加快速跳转和 FAQ 到 implementation_record.md
  - File: docs/implementation_record.md
  - Purpose: 提升可发现性，帮助用户快速找到关键技术洞察
  - _Leverage: 现有 implementation_record.md 的版本历史
  - _Requirements: Requirement 3.3（implementation_record.md 增强）

## Testing and Validation

- [x] 15. 端到端测试完整工作流
  - Files: All created scripts and docs
  - Purpose: 验证完整的自动化流程按预期工作
  - _Leverage: 所有前面创建的脚本和文档
  - _Requirements: All requirements（综合验证）

## Summary

Total Tasks: 15

- Phase 2.1 (Core Scripts): Tasks 1-7 - update-docs.js implementation
- Phase 2.2 (Release Flow): Tasks 8-11 - release.js implementation
- Phase 3 (Docs Refactor): Tasks 12-14 - Documentation restructuring
- Testing: Task 15 - End-to-end validation

Estimated Effort: 12-16 hours

Expected Outcomes:
- Context 消耗: 28k → 10k (-64%)
- 文档更新时间: 40min → 15min (-62%)
- 文档遗漏率: 30% → 0% (-100%)
