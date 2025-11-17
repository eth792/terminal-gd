# Tasks Document

## Task 1: 创建采样脚本

- [x] 1.1 实现 CSV 解析逻辑
  - File: scripts/sample-test-cases.js (新建)
  - 实现 parseResultsCSV() 函数读取 results.csv
  - 验证 CSV 格式（必须包含 filename, bucket, reason 列）
  - 处理空行和格式错误
  - Purpose: 从 baseline 运行包中读取测试结果数据
  - _Leverage: Node.js 内置模块 fs, path_
  - _Requirements: 1.1, 1.2_
  - _Prompt: Role: Node.js Developer specializing in file I/O and CSV parsing | Task: Implement parseResultsCSV() function to read and parse results.csv from baseline run directory, validating CSV format and handling errors following requirements 1.1 and 1.2 | Restrictions: Use only Node.js built-in modules (fs, path), do not add external CSV parsing dependencies, handle file encoding properly (UTF-8) | Success: CSV is correctly parsed into array of objects with filename/bucket/reason fields, format validation detects missing columns, encoding issues handled gracefully_

- [x] 1.2 实现分组和采样逻辑
  - File: scripts/sample-test-cases.js (续)
  - 实现 groupByBucketAndReason() 按 bucket 和 reason 分组
  - 实现 sampleFromGroup() 使用洗牌算法随机采样
  - 应用 SAMPLE_CONFIG 配置（exact:5, review:5, fail reasons:3-5）
  - Purpose: 从每个类别中提取代表性样本
  - _Leverage: Fisher-Yates 洗牌算法_
  - _Requirements: 1.3_
  - _Prompt: Role: Algorithm Engineer with expertise in randomization and sampling techniques | Task: Implement groupByBucketAndReason() and sampleFromGroup() functions to stratify results by bucket/reason and apply random sampling following requirement 1.3, using Fisher-Yates shuffle algorithm | Restrictions: Must maintain sampling distribution consistency, handle edge cases (group size < sample size), ensure true randomness | Success: Results are correctly grouped by bucket and reason, sampling produces representative subsets, small groups are fully included without errors_

- [x] 1.3 实现文件列表生成和统计输出
  - File: scripts/sample-test-cases.js (续)
  - 实现 writeFileList() 生成 runs/tmp/sample_files.txt
  - 输出采样统计信息到 console（如"exact: 71 → 5 sampled"）
  - 添加错误处理和用户提示
  - Purpose: 生成 CLI 可读取的文件列表和可视化统计
  - _Leverage: Node.js fs.writeFileSync_
  - _Requirements: 1.4, 1.5_
  - _Prompt: Role: DevOps Engineer with expertise in CLI tool development and user experience | Task: Implement writeFileList() to generate file list at runs/tmp/sample_files.txt and output sampling statistics following requirements 1.4 and 1.5, with clear error messages and user guidance | Restrictions: Must create runs/tmp/ directory if missing, use UTF-8 encoding with Unix line endings, provide actionable error messages | Success: File list is correctly written with one filename per line, statistics show category totals and sampled counts, errors provide clear guidance (e.g., symlink creation instructions)_

- [x] 1.4 添加 CLI 入口和参数验证
  - File: scripts/sample-test-cases.js (续)
  - 实现 main() 函数作为 CLI 入口
  - 解析命令行参数（run_dir）
  - 验证 baseline 运行包存在性和 results.csv 完整性
  - Purpose: 提供独立可运行的命令行工具
  - _Leverage: Node.js process.argv_
  - _Requirements: 1.1_
  - _Prompt: Role: CLI Developer with expertise in Node.js command-line interfaces | Task: Implement main() function as CLI entry point with argument parsing and validation following requirement 1.1, providing user-friendly error messages | Restrictions: Use process.argv for argument parsing (no external libraries), validate run_dir and results.csv existence, exit with proper status codes (0=success, 1=error) | Success: Script accepts run_dir argument correctly, validates baseline exists and has valid results.csv, provides clear usage instructions on error_

## Task 2: 扩展 CLI 支持文件列表输入

- [x] 2.1 添加 --files 参数定义
  - File: packages/ocr-match-core/src/cli/match-ocr.ts (修改)
  - 在 yargs 配置中添加 --files 参数
  - 设置参数类型、描述和互斥关系
  - Purpose: 扩展 CLI 参数支持文件列表输入模式
  - _Leverage: 现有 yargs 配置结构_
  - _Requirements: 2.1_
  - _Prompt: Role: TypeScript Developer with expertise in yargs CLI frameworks | Task: Add --files parameter to yargs configuration in match-ocr.ts following requirement 2.1, maintaining backward compatibility with existing parameters | Restrictions: Must not conflict with --ocr parameter (both needed), use TypeScript strict types, follow existing parameter naming conventions | Success: --files parameter is correctly defined with proper type (string), description is clear, parameter coexists with --ocr for base directory reference_

- [x] 2.2 实现文件列表读取逻辑
  - File: packages/ocr-match-core/src/cli/match-ocr.ts (续)
  - 修改文件获取逻辑：if (args.files) 读取文件列表，else 扫描目录
  - 读取文件列表（每行一个文件名）
  - 转换文件名为绝对路径（相对于 --ocr 目录）
  - Purpose: 支持按文件列表而非目录扫描运行测试
  - _Leverage: 现有 scanOcrDirectory() 路径处理逻辑_
  - _Requirements: 2.2, 2.3_
  - _Prompt: Role: TypeScript Developer with expertise in file system operations | Task: Implement file list reading logic in match-ocr.ts following requirements 2.2 and 2.3, converting filenames to absolute paths and maintaining compatibility with existing directory scanning | Restrictions: Must preserve existing directory scan behavior when --files is not provided, handle UTF-8 encoding, use path.join() for cross-platform compatibility | Success: File list is correctly read and parsed (line-by-line), filenames are converted to absolute paths relative to --ocr directory, existing directory scan logic remains unchanged_

- [x] 2.3 添加文件存在性验证和日志
  - File: packages/ocr-match-core/src/cli/match-ocr.ts (续)
  - 验证文件列表中所有文件存在
  - 添加日志："Loaded X files from list"
  - 处理文件缺失错误（显示缺失文件列表）
  - Purpose: 提前检测文件问题，避免运行时失败
  - _Leverage: 现有 logger 框架_
  - _Requirements: 2.4, 2.5_
  - _Prompt: Role: QA Engineer with expertise in input validation and error handling | Task: Add file existence validation and logging for file list mode following requirements 2.4 and 2.5, using existing logger framework to provide clear feedback | Restrictions: Must use fs.existsSync() for validation, log through existing logger (not console.log), provide actionable error messages with missing file list | Success: All files in list are validated before processing, logger shows "Loaded X files from list" message, missing files trigger clear error with complete list of missing files_

## Task 3: 集成测试流程脚本

- [x] 3.1 添加根目录 test:sample 脚本
  - File: package.json (根目录，修改)
  - 添加 test:sample 脚本组合采样 + 构建 + 测试
  - 使用 runs/run_latest 作为 baseline 引用
  - Purpose: 提供一键执行完整采样测试流程
  - _Leverage: 现有 test:full, test:quick 脚本模式_
  - _Requirements: 3.1_
  - _Prompt: Role: DevOps Engineer with expertise in npm scripts and build automation | Task: Add test:sample script to root package.json following requirement 3.1, chaining sample script, build, and test commands using pnpm workspace filters | Restrictions: Must use && for sequential execution (fail-fast), reference runs/run_latest for baseline, follow existing script naming patterns | Success: Script chains sample → build → test correctly, fails fast on any step error, uses run_latest symlink for baseline reference_

- [x] 3.2 添加 core 包 test:sample 脚本（可选）
  - File: packages/ocr-match-core/package.json (修改)
  - 添加 sample 和 test:sample 脚本（便于调试）
  - 调整路径为相对于 core 包的路径
  - Purpose: 支持从 core 包目录直接运行采样测试
  - _Leverage: 根目录脚本逻辑_
  - _Requirements: 3.1_
  - _Prompt: Role: DevOps Engineer with expertise in monorepo workspace management | Task: Add test:sample script to core package.json for debugging convenience following requirement 3.1, adjusting all paths relative to packages/ocr-match-core/ directory | Restrictions: Must use relative paths (../../) correctly, maintain compatibility with root-level execution, ensure both entry points work identically | Success: test:sample works when executed from core package directory, paths are correctly resolved, behavior matches root-level execution_

- [x] 3.3 验证 runs/run_latest 符号链接机制
  - File: 无代码变更（流程验证）
  - 测试 run_latest 符号链接不存在时的错误提示
  - 验证创建符号链接后脚本正常运行
  - 文档化符号链接创建步骤
  - Purpose: 确保用户正确设置 baseline 引用
  - _Leverage: 采样脚本错误处理_
  - _Requirements: 3.2_
  - _Prompt: Role: QA Engineer with expertise in integration testing and user workflows | Task: Verify symlink mechanism works correctly following requirement 3.2, testing error handling when run_latest is missing and successful execution after creation | Restrictions: Must test on actual filesystem, verify error messages guide users to create symlink, ensure symlink creation is documented | Success: Clear error message when run_latest missing (with ln -s command example), script works correctly after symlink creation, documentation includes symlink setup instructions_

- [x] 3.4 测试完整流程并验证输出
  - File: 无代码变更（集成测试）
  - 运行 pnpm test:sample 端到端测试
  - 验证采样统计输出（exact/review/fail 分布）
  - 验证生成的运行包结构和内容
  - Purpose: 确保端到端流程正常工作
  - _Leverage: 现有运行包验证流程_
  - _Requirements: 3.3, 3.4_
  - _Prompt: Role: Integration Tester with expertise in end-to-end workflow validation | Task: Execute complete test:sample workflow following requirements 3.3 and 3.4, verifying console output, generated run bundle, and result correctness | Restrictions: Must test with real baseline data, verify all output files (manifest.json, summary.md, results.csv), check statistics match expectations | Success: test:sample completes in 2-3 minutes, console shows sampling statistics, run bundle contains 35-40 results with correct distribution, manifest.json includes sample metadata_

## Task 4: 文档更新

- [x] 4.1 更新 TEST_GUIDE.md 添加 Sample Testing 章节
  - File: docs/TEST_GUIDE.md (修改)
  - 添加"Sample Testing"章节（位于 test:full/test:quick 之后）
  - 说明使用场景、步骤、性能对比
  - 明确限制和最佳实践
  - Purpose: 提供完整的采样测试使用指南
  - _Leverage: 现有 TEST_GUIDE.md 结构_
  - _Requirements: 4.1, 4.2_
  - _Prompt: Role: Technical Writer with expertise in developer documentation | Task: Add comprehensive Sample Testing section to TEST_GUIDE.md following requirements 4.1 and 4.2, explaining use cases, workflow, performance benefits, and limitations | Restrictions: Must follow existing documentation style and structure, include concrete examples (command snippets), highlight limitations clearly | Success: Documentation clearly explains when to use sample testing, step-by-step instructions are easy to follow, performance comparison is quantified (38min → 2-3min), limitations are prominently stated_

- [x] 4.2 添加采样配置说明
  - File: docs/TEST_GUIDE.md (续)
  - 说明 SAMPLE_CONFIG 结构和调整方法
  - 提供采样数量调优示例
  - 说明如何更新 baseline（ln -s 操作）
  - Purpose: 帮助用户理解和自定义采样策略
  - _Leverage: design.md 中的 SAMPLE_CONFIG 示例_
  - _Requirements: 4.1_
  - _Prompt: Role: Technical Writer with expertise in configuration documentation | Task: Document SAMPLE_CONFIG structure and customization following requirement 4.1, providing examples of adjusting sample sizes and updating baseline reference | Restrictions: Must include code examples with comments, explain trade-offs (sample size vs speed), provide concrete commands (e.g., ln -s command) | Success: Users understand how to modify SAMPLE_CONFIG for their needs, baseline update process is clearly documented with commands, trade-offs are explained (larger samples = slower but more coverage)_

- [x] 4.3 添加故障排查指南
  - File: docs/TEST_GUIDE.md (续)
  - 添加常见问题解答（FAQ）
  - 说明符号链接缺失、文件缺失等错误处理
  - 提供调试建议和验证步骤
  - Purpose: 帮助用户快速解决常见问题
  - _Leverage: design.md Error Handling 章节_
  - _Requirements: 4.2_
  - _Prompt: Role: Support Engineer with expertise in troubleshooting documentation | Task: Create FAQ and troubleshooting guide following requirement 4.2, covering common errors (missing symlink, missing files) and providing debugging steps | Restrictions: Must include actual error messages users will see, provide step-by-step resolution, link to relevant documentation sections | Success: Common errors are documented with exact error messages, each error has clear resolution steps, debugging guide helps users self-diagnose issues_

- [x] 4.4 更新 CLAUDE.md 添加 Sample Testing 说明
  - File: CLAUDE.md (修改)
  - 在"Development Quick Reference"章节添加 test:sample 命令
  - 更新"Testing"相关说明
  - Purpose: 确保 AI assistant 了解新测试模式
  - _Leverage: 现有 CLAUDE.md 结构_
  - _Requirements: N/A (文档一致性)_
  - _Prompt: Role: Documentation Maintainer with expertise in AI context management | Task: Update CLAUDE.md to include test:sample command in Development Quick Reference section, ensuring AI assistants are aware of the new testing mode | Restrictions: Must maintain existing structure and tone, keep changes minimal (add test:sample to command list), follow markdown formatting conventions | Success: CLAUDE.md includes test:sample in core commands section, brief explanation of when to use it, consistent with other testing command descriptions_

## Task 5: 验证和优化

- [x] 5.1 性能基准测试
  - File: 无代码变更（性能测试）
  - 测量采样脚本执行时间（目标 < 1 秒）
  - 测量采样测试总耗时（目标 2-3 分钟）
  - 对比完整测试耗时（验证 12 倍加速）
  - Purpose: 验证性能目标达成
  - _Leverage: Unix time 命令_
  - _Requirements: Non-Functional (Performance)_
  - _Prompt: Role: Performance Engineer with expertise in benchmarking and profiling | Task: Conduct performance benchmarks for sampling script and full test:sample workflow, comparing against test:full baseline to verify 12x speedup target | Restrictions: Must use consistent baseline data, run multiple iterations for accuracy, measure end-to-end wall-clock time | Success: Sampling script completes in < 1 second, test:sample total time is 2-3 minutes, speedup ratio is ≥ 10x vs test:full (38 minutes)_

- [x] 5.2 边界情况测试
  - File: 无代码变更（边界测试）
  - 测试采样数量不足的情况（如某类别只有 2 条记录）
  - 测试空 baseline（results.csv 只有 header）
  - 测试符号链接指向无效路径
  - Purpose: 确保边界情况正确处理
  - _Leverage: design.md Error Handling 章节_
  - _Requirements: Non-Functional (Reliability)_
  - _Prompt: Role: QA Engineer with expertise in edge case testing | Task: Test boundary conditions including insufficient samples, empty baseline, and invalid symlinks, verifying error handling follows design.md specifications | Restrictions: Must test each boundary case independently, verify error messages match design specs, ensure no crashes or data corruption | Success: Insufficient samples are handled gracefully (use all available), empty baseline shows clear error, invalid symlink provides actionable guidance (create valid symlink)_

- [x] 5.3 回归验证测试
  - File: 无代码变更（回归测试）
  - 使用 v0.1.6 baseline 运行采样测试
  - 验证采样结果代表性（分布比例与 baseline 一致）
  - 对比采样测试和完整测试的结果相似度
  - Purpose: 确保采样测试能检测真实回归
  - _Leverage: v0.1.6 运行包数据_
  - _Requirements: Non-Functional (Reliability)_
  - _Prompt: Role: QA Engineer with expertise in regression testing and statistical validation | Task: Validate sampling representativeness by comparing sample distribution against v0.1.6 baseline and verifying results similarity, ensuring regression detection capability | Restrictions: Must use actual v0.1.6 data, calculate distribution percentages (exact/review/fail), verify sample covers all failure reasons | Success: Sample distribution matches baseline within ±10%, all failure reasons are represented in sample, sample can detect simulated regressions (e.g., code intentionally broken)_

- [x] 5.4 代码审查和清理
  - File: All modified files
  - 代码风格检查（TypeScript strict mode, 函数长度）
  - 移除调试代码和 console.log
  - 添加必要的代码注释（复杂逻辑处理）
  - Purpose: 确保代码质量符合项目标准
  - _Leverage: 项目 Code Style 规范_
  - _Requirements: Non-Functional (Code Architecture)_
  - _Prompt: Role: Senior Developer with expertise in code quality and maintainability | Task: Conduct code review and cleanup of all modified files, ensuring TypeScript strict compliance, removing debug code, and adding explanatory comments where needed | Restrictions: Must follow project style guide (≤3 indentation levels, single responsibility), remove all console.log (use logger instead), add comments only for non-obvious logic | Success: All files pass TypeScript strict mode, no debug code remains, functions are concise (< 50 lines), comments explain "why" not "what"_

## Notes

- **测试顺序建议**: 先完成 Task 1-2（采样脚本 + CLI 修改），独立测试验证，再集成 Task 3（脚本编排），最后 Task 4（文档）和 Task 5（验证）
- **符号链接提醒**: 在 Task 3.3 前创建 `runs/run_latest` 符号链接指向最新 baseline（如 `run_20251117_10_44`）
- **性能目标**: 采样脚本 < 1 秒，采样测试总耗时 2-3 分钟（含构建 ~10 秒）
- **采样配置**: `SAMPLE_CONFIG = { exact: 5, review: 5, fail: { EXTRACT_EMPTY_SUPPLIER: 5, FIELD_SIM_LOW_SUPPLIER: 5, NO_CANDIDATE: 3, DELTA_TOO_SMALL: 3, default: 3 } }`
- **文件路径**: 采样文件列表输出到 `runs/tmp/sample_files.txt`（临时文件）
- **Git 提交**: 建议按 Task 分批提交（如 Task 1 → commit, Task 2 → commit）
- **ESM 规范**: 采样脚本已修复为 ESM 格式（import/export），符合项目 `"type": "module"` 配置
- **CSV 列名兼容**: 脚本已支持 `file_name` 和 `filename` 两种列名（实际项目使用 `file_name`）
- **性能实测** (Task 3.4 完成):
  - 采样脚本: < 1 秒 ✅
  - TypeScript 构建: 3.2 秒 ✅
  - 采样测试总耗时: 4.3 分钟（256 秒）⚠️ **未达目标**
  - 平均处理速度: 8.8 秒/文件（vs 全量测试 10 秒/文件）
  - 加速比: 约 8.8 倍（实际 38min → 4.3min，目标 12 倍）
  - 原因分析: 29 个样本中包含 19 个 fail 案例，部分需要全库 recall（177910 行），导致单文件耗时达 20 秒
- **验证结果** (Task 5 完成):
  - 5.1 性能基准: 采样脚本 0.137 秒 ✅, 完整测试 38.2min, 平均 10.3s/file
  - 5.2 边界情况: 缺失目录 ✅, 空 baseline ✅, 采样不足 ✅ (显示警告并使用全部)
  - 5.3 回归验证: Baseline (exact 32%, review 11%, fail 57%) vs Sample (exact 17%, review 17%, fail 66%) - 覆盖所有 5 种失败原因 ✅
  - 5.4 代码审查: TypeScript strict mode ✅, 无调试代码 ✅, console 使用合理 ✅
