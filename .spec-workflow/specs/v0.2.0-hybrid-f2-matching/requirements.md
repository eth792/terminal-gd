# Requirements Document: v0.2.0 Hybrid F2 Matching

## Introduction

**目标**: 提升项目名称匹配准确率（F2），突破当前 32% 的 exact 通过率瓶颈。

**当前问题**：
- F2 平均比 F1 低 0.142（项目名称匹配是主要瓶颈）
- 60 个 FIELD_SIM_LOW_PROJECT 失败案例中，F2 平均只有 0.324
- 当前使用 `rapidfuzz.fuzz.ratio`（纯字符级相似度），无法容忍 OCR 不完整、DB 额外信息等问题

**价值**：
- 预期 Exact 增加 28 个（+39.4%）
- Auto-pass rate: 32.0% → 44.6% (+12.6pp)
- 减少人工审核工作量 12.6pp

---

## Alignment with Product Vision

本功能支持项目核心目标：
1. **自动化准确率提升**：从 32% → 44.6%，显著减少人工成本
2. **算法健壮性**：容忍 OCR 错误、DB 格式不一致
3. **简洁实用主义**：使用现有库（RapidFuzz），不引入复杂模型

---

## Requirements

### REQ-1: Hybrid Fuzzy Matching

**User Story**: 作为系统开发者，我希望使用混合模糊匹配算法计算 F2，以便容忍 OCR 不完整和 DB 格式差异。

#### Acceptance Criteria

1. **WHEN** 计算 F2 分数 **THEN** 系统 **SHALL** 使用以下公式：
   ```
   f2_score = max(
       fuzz.partial_ratio(q_project, cand_project),
       fuzz.token_set_ratio(q_project, cand_project)
   ) / 100
   ```

2. **IF** OCR 提取的项目名是 DB 的子串 **THEN** 系统 **SHALL** 返回高 F2 分数（>= 0.8）

3. **IF** DB 包含额外括号、引号、补充信息 **THEN** 系统 **SHALL** 忽略这些差异，返回高 F2 分数

4. **WHEN** 项目名称核心部分匹配 **AND** 顺序不同 **THEN** 系统 **SHALL** 使用 `token_set_ratio` 识别为高相似度

#### Data-Driven Validation

根据 Top 5 失败案例：

| 案例 | 当前 F2 | 预期 F2 (partial_ratio) | 是否通过 0.6 阈值 |
|------|---------|------------------------|----------------|
| 1: 新荣TOD vs T0D | 0.599 | ~0.83 | ✅ |
| 2: 光谷项目（不完整） | 0.595 | ~0.96 | ✅ |
| 4: 大桥还建（括号差异） | 0.531 | ~0.92 | ✅ |

预期通过 Rule 3/4 的案例: **7 个**

---

### REQ-2: Backward Compatibility

**User Story**: 作为系统维护者，我希望新算法不破坏现有 exact 案例，以便确保无回归。

#### Acceptance Criteria

1. **WHEN** 运行完整测试（222 files） **THEN** 系统 **SHALL** 保持 Exact >= 71（baseline）

2. **IF** Exact < 71 **THEN** 系统 **SHALL** 立即回滚代码

3. **WHEN** 计算 F2 使用新算法 **THEN** 系统 **SHALL** 不修改 F1 计算逻辑

---

### REQ-3: Performance

**User Story**: 作为系统运维者，我希望新算法不显著增加耗时，以便保持生产环境可用性。

#### Acceptance Criteria

1. **WHEN** 处理单个文件 **THEN** 系统 **SHALL** 在 <= 1500ms 内完成（baseline 986ms，允许 +50%）

2. **WHEN** 处理 222 个文件 **THEN** 系统 **SHALL** 在 <= 6min 内完成（baseline 3.6min，允许 +67%）

3. **IF** 平均耗时 > 1500ms/file **THEN** 系统 **SHALL** 优化算法或回滚

#### Complexity Analysis

- `partial_ratio`: O(N*M)（N, M 是字符串长度）
- `token_set_ratio`: O(N + M)
- `max()`: O(1)
- **总体**: O(N*M)，与当前 `ratio` 相同

---

### REQ-4: Simplicity and Maintainability

**User Story**: 作为未来的维护者，我希望算法简单可解释，以便快速理解和调试。

#### Acceptance Criteria

1. **WHEN** 添加新算法 **THEN** 系统 **SHALL** 使用 RapidFuzz 现有函数（不实现自定义逻辑）

2. **WHEN** 阅读代码 **THEN** 算法逻辑 **SHALL** 在 5 行内表达清楚

3. **IF** 未来需要调优 **THEN** 只需修改 `max()` 中的组合方式，不需要重写算法

#### Code Snippet (Expected)

```python
# Before (v0.1.9)
def calculate_f2(q_project, cand_project):
    return fuzz.ratio(q_project, cand_project) / 100

# After (v0.2.0)
def calculate_f2_hybrid(q_project, cand_project):
    return max(
        fuzz.partial_ratio(q_project, cand_project),
        fuzz.token_set_ratio(q_project, cand_project)
    ) / 100
```

---

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility**: F2 计算函数独立（不修改 F1、recall、bucketize 逻辑）
- **Modular Design**: 新算法在 `rank.py` 中作为独立函数
- **Clear Interfaces**: 输入 `(str, str)`，输出 `float` [0, 1]
- **Testability**: 可独立单元测试，无副作用

### Performance

- **Latency**: <= 1500ms/file（+50% from baseline）
- **Throughput**: >= 11 files/min（222 files in 6min）
- **Complexity**: O(N*M)（与现有算法相同）

### Security

- **Input Validation**: 处理空字符串、None、特殊字符
- **No SQL Injection**: F2 计算不涉及 DB 查询

### Reliability

- **Error Handling**: RapidFuzz 异常不应导致程序崩溃
- **Fallback**: 如果 partial_ratio/token_set_ratio 失败，降级为当前 `ratio`
- **Logging**: 记录 F2 计算异常到 log.jsonl

### Usability

- **Transparency**: 运行包的 results.csv 包含 F2 分数（s_field2 列）
- **Debuggability**: 可通过 log.jsonl 追溯 F2 计算过程

---

## Success Metrics

### Primary KPI

| 指标 | Baseline (v0.1.9) | Target (v0.2.0) | 变化 |
|------|-------------------|----------------|------|
| **Exact** | 71 (32.0%) | **99** (44.6%) | **+28 (+39.4%)** |
| **Review** | 24 (10.8%) | **16** (7.2%) | **-8** |
| **Fail** | 127 (57.2%) | **107** (48.2%) | **-20** |

### Secondary Metrics

- **FIELD_SIM_LOW_PROJECT**: 60 → **40** (-20，-33%)
- **Average F2**: 0.607 → **0.71** (+0.10)
- **Total time**: 3.6min → **<= 6min** (<= +67%)

### Validation Criteria

✅ **Success**: Exact >= 99 **AND** Time <= 6min
⚠️ **Partial Success**: Exact >= 85 **AND** Time <= 6min
❌ **Failure**: Exact < 71 **OR** Time > 6min

---

## Risks and Mitigation

### Risk 1: 过度优化（Overfitting）

**描述**: 针对 Top 10 案例优化，泛化性差。

**缓解**:
- 在全部 222 个文件上验证
- 检查 exact 案例的 F2 分布（确保无回退）

### Risk 2: 性能回退

**描述**: `partial_ratio` 比 `ratio` 慢。

**缓解**:
- 设置 6min 时间上限
- 如超时，考虑只使用 `token_set_ratio`（更快）

### Risk 3: False Positives

**描述**: 新算法可能让错误候选通过。

**缓解**:
- 依赖 delta check 作为第二层防御（Rule 6）
- 如 review 数量暴增（> 50），回滚

---

## Out of Scope

以下不在 v0.2.0 范围内：
- ❌ 修改 F1（供应商匹配）算法
- ❌ 修改 recall 阶段（候选召回）
- ❌ 修改 bucketize 逻辑（Rule 5/6/7）
- ❌ 移除 Scheme A 的动态阈值代码（留到 v0.3.0）
- ❌ Semantic embedding 匹配（复杂度过高）

---

**文档状态**: Draft
**创建日期**: 2025-11-19
**版本**: 1.0
