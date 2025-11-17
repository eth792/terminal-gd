# Requirements Document

## Introduction

Sample Testing 是一个快速验证功能，用于在代码改动后快速检测潜在的回归问题。通过从 baseline 测试运行包中按类别采样代表性测试用例（30-40 个样本），将测试时间从 38 分钟缩短至 2-3 分钟，提供快速反馈循环，避免像 v0.1.7 那样因完整测试耗时过长而延误问题发现。

**核心价值**：
- 12 倍加速（38 分钟 → 3 分钟）
- 覆盖所有失败类别（exact / review / 各种 fail reason）
- 防止灾难性回归（如 v0.1.7 的 100% 失败率）
- 节省开发时间（每次迭代节省 35 分钟）

## Alignment with Product Vision

此功能支持项目的核心目标：
- **快速迭代**：缩短反馈循环，提高开发效率
- **质量保障**：在不牺牲覆盖率的前提下加速测试
- **风险控制**：及早发现回归，避免完整测试浪费时间

## Requirements

### Requirement 1: 从 Baseline 运行包提取采样

**User Story:** 作为开发者，我希望能从最新的测试运行包中自动提取代表性样本，以便快速验证代码改动是否引入明显错误。

#### Acceptance Criteria

1. WHEN 执行采样脚本并指定 baseline 运行包路径 THEN 系统 SHALL 读取该运行包的 results.csv 文件
2. IF results.csv 存在且格式正确 THEN 系统 SHALL 按 bucket 和 reason 字段对记录进行分组
3. WHEN 分组完成 THEN 系统 SHALL 对每个类别应用采样规则：
   - exact: 采样 5 条（如总数 < 5 则全部采样）
   - review: 采样 5 条（如总数 < 5 则全部采样）
   - fail (EXTRACT_EMPTY_SUPPLIER): 采样 5 条
   - fail (FIELD_SIM_LOW_SUPPLIER): 采样 5 条
   - fail (NO_CANDIDATE): 采样 3 条
   - fail (DELTA_TOO_SMALL): 采样 3 条
   - fail (其他 reason): 各采样 3 条
4. WHEN 采样完成 THEN 系统 SHALL 生成文件列表保存到 `runs/tmp/sample_files.txt`（每行一个文件名）
5. WHEN 生成文件列表 THEN 系统 SHALL 输出统计信息（每个类别的总数和采样数）

### Requirement 2: CLI 支持文件列表输入

**User Story:** 作为开发者，我希望 match-ocr CLI 能够接受文件列表作为输入，以便测试指定的样本而非扫描整个目录。

#### Acceptance Criteria

1. WHEN CLI 接收 `--files <path>` 参数 THEN 系统 SHALL 从该路径读取文件列表（每行一个文件名）
2. IF `--files` 参数存在 THEN 系统 SHALL 跳过目录扫描逻辑，直接使用文件列表
3. WHEN 读取文件列表 THEN 系统 SHALL 将文件名转换为绝对路径（相对于 `--ocr` 目录）
4. IF 文件列表为空或文件不存在 THEN 系统 SHALL 报错并退出
5. WHEN 使用文件列表模式 THEN 系统 SHALL 在日志中显示"Loaded X files from list"

### Requirement 3: 标准化采样测试脚本

**User Story:** 作为开发者，我希望通过一行命令就能完成"采样 + 测试"的完整流程，以便快速验证代码改动。

#### Acceptance Criteria

1. WHEN 执行 `pnpm test:sample` THEN 系统 SHALL 自动执行以下步骤：
   - 从 `runs/run_latest` 符号链接指向的运行包中提取采样
   - 构建最新代码（`pnpm build`）
   - 使用采样文件列表运行测试（`--files` 参数）
   - 生成新的运行包（命名格式：`run_sample_{timestamp}`）
2. IF `runs/run_latest` 符号链接不存在 THEN 系统 SHALL 报错并提示用户创建符号链接
3. WHEN 测试完成 THEN 系统 SHALL 在控制台输出采样测试的统计信息（exact / review / fail 分布）
4. WHEN 测试完成 THEN 系统 SHALL 建议用户对比 baseline 和当前运行包的结果

### Requirement 4: 文档和使用指南

**User Story:** 作为开发者，我希望有清晰的文档说明如何使用采样测试，以便正确理解其适用场景和限制。

#### Acceptance Criteria

1. WHEN 查看 TEST_GUIDE.md THEN 文档 SHALL 包含采样测试的章节，说明：
   - 使用场景（算法改动 / 参数调优 / 配置修改）
   - 使用步骤（建立 baseline → 采样测试 → 完整测试）
   - 命令示例（`pnpm sample` / `pnpm test:sample`）
   - 性能对比（38 分钟 vs 2-3 分钟）
2. WHEN 查看文档 THEN 文档 SHALL 明确说明采样测试的限制：
   - 不适用于版本发布前的最终测试
   - 需要定期更新 baseline（每次完整测试后）
   - 采样测试通过不代表完整测试通过（但能快速发现明显回归）

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility Principle**:
  - 采样脚本（`scripts/sample-test-cases.js`）仅负责采样逻辑
  - CLI 工具（`match-ocr.ts`）仅添加 `--files` 参数支持，不改变现有逻辑
  - 测试脚本（`package.json` scripts）仅负责流程编排

- **Modular Design**:
  - 采样脚本独立可运行（`node scripts/sample-test-cases.js <run_dir>`）
  - CLI 参数向后兼容（`--files` 为可选参数）
  - 采样配置可调整（`SAMPLE_CONFIG` 对象集中管理）

- **Dependency Management**:
  - 采样脚本使用 Node.js 内置模块（fs / path）
  - 不引入新的外部依赖

### Performance

- **采样生成**: < 1 秒（读取 CSV + 分组 + 随机采样）
- **采样测试**: 2-3 分钟（30-40 个样本）
- **加速比**: 12 倍（38 分钟 → 3 分钟）

### Reliability

- **输入验证**: 检查 baseline 运行包是否存在，results.csv 是否有效
- **错误处理**: 提供清晰的错误信息（文件不存在 / CSV 格式错误 / 符号链接缺失）
- **幂等性**: 多次运行采样脚本生成的文件列表可能不同（随机采样），但分布一致

### Usability

- **简单命令**: `pnpm test:sample` 一行命令完成采样测试
- **清晰输出**: 显示每个类别的采样统计（如"exact: 71 → 5 sampled"）
- **符号链接**: 使用 `runs/run_latest` 简化 baseline 管理（无需每次指定路径）
