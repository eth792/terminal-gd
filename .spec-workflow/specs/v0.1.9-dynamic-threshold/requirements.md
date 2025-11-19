# Requirements Document: v0.1.9 Dynamic Threshold Optimization

## Introduction

本 spec 实施"动态阈值优化"，解决当前 OCR 匹配系统中"高置信度字段无法补偿低置信度字段"的问题。

**背景**：当前 `minFieldSim=0.6` 是固定阈值，导致类似 `changjiangdianqi` 的案例（f1=1.0, f2=0.597）因标点差异而 FAIL，尽管供应商字段完全匹配。

**位置**：本 spec 是准确率突破路线图（详见 `docs/PROJECT_STATUS.md` Roadmap Phase 4）的 **Step 1**。

**三步走规划**：
1. **v0.1.9 - 动态阈值**（本 spec）
2. v0.2.0 - 子串加权
3. v0.3.0+ - 可观测性

## Alignment with Product Vision

**核心目标**：提升自动通过率从 32% 到 35-37%（+3-5pp）

**设计原则** (Linus式)：
- ✅ 单次变更原则：只改一个文件一个函数
- ✅ 消除特殊情况：用连续函数替代 if 判断
- ✅ 数据结构驱动：问题在算法参数，不在架构
- ✅ 可立即回滚：纯阈值逻辑，无副作用

## Requirements

### REQ-1: 动态阈值计算

**User Story:** 作为系统运营人员，我希望当一个字段有高置信度匹配时，另一个字段的阈值能适当放宽，以便减少因 OCR 标点/换行误差导致的误杀。

#### Acceptance Criteria

1. **WHEN** 候选的 max(f1, f2) > 0.8 **THEN** 系统 **SHALL** 降低 minFieldSim 阈值，降幅与置信度成正比
2. **WHEN** 候选的 max(f1, f2) <= 0.8 **THEN** 系统 **SHALL** 保持 minFieldSim = 0.6 不变
3. **WHEN** 计算动态阈值时 **THEN** 系统 **SHALL** 使用公式：`threshold = 0.6 - max(0, (max(f1, f2) - 0.8)) * 0.5`

**示例**：
- f1=1.0, f2=0.5 → threshold = 0.6 - (1.0 - 0.8) * 0.5 = 0.5 → f2 通过
- f1=0.8, f2=0.5 → threshold = 0.6 - 0 = 0.6 → f2 不通过
- f1=0.9, f2=0.55 → threshold = 0.6 - 0.05 = 0.55 → f2 刚好通过

### REQ-2: 保持向后兼容性

**User Story:** 作为系统维护人员，我希望本次改动不影响现有接口和输出格式，以便保持 results.csv 和 downstream tools 的兼容性。

#### Acceptance Criteria

1. **WHEN** 实施动态阈值 **THEN** 系统 **SHALL** 保持 `MatchResult` 接口不变
2. **WHEN** 实施动态阈值 **THEN** 系统 **SHALL** 保持 `results.csv` schema 不变
3. **WHEN** 实施动态阈值 **THEN** 系统 **SHALL** 保持现有 bucket 决策逻辑的顺序（先检查 field similarity，再检查 delta）
4. **WHEN** 实施动态阈值 **AND** 配置中未指定 minFieldSim **THEN** 系统 **SHALL** 使用默认值 0.6 作为基准

### REQ-3: 测试验证

**User Story:** 作为 QA 人员，我希望能通过标准测试流程验证改动的有效性和安全性，以便确保不引入回归。

#### Acceptance Criteria

1. **WHEN** 完成代码修改 **THEN** 系统 **SHALL** 通过 `pnpm -F ./packages/ocr-match-core build` 无错误
2. **WHEN** 运行完整测试（222 样本）**THEN** 系统 **SHALL** 保持 exact match 数量 >= 71（不低于 v0.1.8）
3. **WHEN** 运行完整测试 **THEN** 系统 **SHALL** 新增 exact match >= 3（目标 +3-5pp）
4. **WHEN** 运行完整测试 **THEN** 系统 **SHALL** 不引入新的 failure reason 类型

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility Principle**: 只修改 `bucketize.ts` 的 `getBucketDecision` 函数
- **Modular Design**: 动态阈值计算内联在决策函数中，不创建新文件
- **Dependency Management**: 无新增依赖
- **Clear Interfaces**: 输入输出接口完全不变

### Performance

- **计算开销**: 动态阈值计算为 O(1)，无性能影响
- **内存开销**: 无额外内存分配

### Security

- 不涉及安全敏感操作

### Reliability

- **可回滚性**: 单行 git revert 即可回滚
- **降级策略**: 若 max(f1, f2) <= 0.8，自动退化为固定阈值 0.6

### Usability

- **透明性**: 动态阈值在 log 中可见（DEBUG level）
- **可配置性**: 基准阈值 0.6 仍可通过 config 修改

## Risk Assessment

### Low Risk (已缓解)

**风险**: 动态阈值可能误放低质量匹配
- **缓解**: 仅当 max(f1, f2) > 0.8 时放宽，且最多降 0.1（0.6→0.5）
- **验证**: 通过 sample test (10 files) 快速验证

### Very Low Risk

**风险**: 代码修改引入语法错误
- **缓解**: TypeScript strict mode + build 验证

## Success Metrics

| 指标 | 基线 (v0.1.8) | 目标 (v0.1.9) | 最低可接受 |
|------|--------------|--------------|-----------|
| 自动通过率 | 32.0% | 35-37% | 33% |
| Exact matches | 71 | 74-78 | 72 |
| 新 failure reasons | 0 | 0 | 0 |
| 构建时间 | baseline | 不增加 | +10% |

## Out of Scope

- 子串加权匹配（v0.2.0）
- 可观测性增强（v0.3.0+）
- 提取逻辑修复
- 配置界面修改
