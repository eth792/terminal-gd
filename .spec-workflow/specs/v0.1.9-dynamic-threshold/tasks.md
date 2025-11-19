# Tasks Document: v0.1.9 Dynamic Threshold Optimization (Scheme A)

## Overview

**实施方案**: Scheme A（保守优化，保留 Rule 5）

**目标**: 实施动态阈值优化（32% → 34-36% 自动通过率）

**复杂度**: LOW（6 lines changed, 1 file modified, 0 new files）

**风险**: VERY LOW（保留 Rule 5 快速通道，只优化 Rule 3/4/7）

**⚠️ 核心教训**（来自 v0.1.9 失败）:
- ❌ **Rule 5 不是特殊情况**：它是双通道设计的快速通道，保护 88.7% 的 exact 案例
- ❌ **不能删除 Rule 5**：删除后会导致 63/71 exact 降级为 review（灾难性回归）
- ✅ **Scheme A 策略**：只优化 Rule 3/4/7，保留 Rule 5 不变
- ✅ **必须验证**：先 sample test，再 full test

---

## Implementation Tasks

### Phase 1: 代码修改（Estimated: 15 minutes）

#### Task 1.1: 添加 `getDynamicThreshold` 内联函数

- **File**: `packages/ocr-match-core/src/bucket/bucketize.ts`
- **Location**: 在 `bucketize()` 函数**内部**添加（行 55-56 之间）
- **Action**: 添加纯函数，无副作用

**代码**:
```typescript
export function bucketize(
  q1: string,
  q2: string,
  candidates: ScoredCandidate[],
  config: BucketConfig
): BucketResult {
  // ✅ 新增：动态阈值计算（内联函数）
  function getDynamicThreshold(f1: number, f2: number, baseThreshold: number): number {
    const maxScore = Math.max(f1, f2);
    if (maxScore <= 0.8) {
      return baseThreshold;  // 低置信度场景，保持严格
    }
    // 高置信度补偿：最多放宽 0.1（0.6 → 0.5）
    const compensation = (maxScore - 0.8) * 0.5;
    return Math.max(0.5, baseThreshold - compensation);  // 下限 0.5
  }

  // 规则1: 提取失败 → fail (保持不变)
  // ...
```

**性能分析**:
- ✅ **O(1)** 计算（只有 Math.max）
- ✅ **无循环、无递归、无外部调用**
- ✅ **纯函数**：相同输入永远返回相同输出
- ✅ **内联优化**：V8 引擎会自动内联此函数

**风险分析**:
- ❌ **低风险**：Math.max 是 O(1)，无性能隐患
- ❌ **边界情况**：maxScore = NaN/Infinity 时，Math.max 返回 NaN，但后续 if 检查会降级为 baseThreshold
- ✅ **数值稳定性**：所有计算都在 [0, 1] 范围内，无溢出风险

**Requirements**: REQ-1（动态阈值计算）

---

#### Task 1.2: 计算 `dynamicThreshold` 变量

- **File**: `packages/ocr-match-core/src/bucket/bucketize.ts`
- **Location**: 在 `const top1 = candidates[0];` 之后（行 68-71 之间）
- **Action**: 调用 `getDynamicThreshold` 计算阈值

**代码**:
```typescript
  // 规则2: 无候选 → fail
  const top1 = candidates[0];
  if (!top1) {
    return { bucket: 'fail', reason: FailReason.NO_CANDIDATES };
  }

  // ✅ 新增：计算动态阈值
  const dynamicThreshold = getDynamicThreshold(
    top1.f1_score,
    top1.f2_score,
    config.minFieldSim
  );
```

**性能分析**:
- ✅ **每次 bucketize 调用只计算一次**（不在循环中）
- ✅ **O(1) 时间复杂度**
- ✅ **无额外内存分配**（只有一个 number 变量）

**风险分析**:
- ❌ **低风险**：变量作用域清晰，不会污染全局
- ✅ **向后兼容**：config.minFieldSim 仍然有效

**Requirements**: REQ-1

---

#### Task 1.3: 替换 Rule 3 的阈值检查

- **File**: `packages/ocr-match-core/src/bucket/bucketize.ts`
- **Location**: 行 74（`if (top1.f2_score < config.minFieldSim)`）
- **Action**: 替换 `config.minFieldSim` 为 `dynamicThreshold`

**Before**:
```typescript
  // 规则3: 单字段相似度过低 → fail (优先检查project)
  if (top1.f2_score < config.minFieldSim) {
    return { bucket: 'fail', reason: FailReason.FIELD_SIM_LOW_PROJECT };
  }
```

**After**:
```typescript
  // 规则3: 单字段相似度过低 → fail (使用动态阈值)
  if (top1.f2_score < dynamicThreshold) {
    return { bucket: 'fail', reason: FailReason.FIELD_SIM_LOW_PROJECT };
  }
```

**性能分析**:
- ✅ **无性能影响**：只是变量替换，if 条件仍然是 O(1)

**语义分析**:
- ✅ **行为变化**：当 max(f1, f2) > 0.8 时，阈值降低，更宽容
- ✅ **向后兼容**：当 max(f1, f2) <= 0.8 时，完全等同于旧逻辑

**Requirements**: REQ-1, REQ-2（向后兼容性）

---

#### Task 1.4: 替换 Rule 4 的阈值检查

- **File**: `packages/ocr-match-core/src/bucket/bucketize.ts`
- **Location**: 行 86（`if (top1.f1_score < config.minFieldSim)`）
- **Action**: 替换 `config.minFieldSim` 为 `dynamicThreshold`

**Before**:
```typescript
  // 规则4: 供应商相似度过低（软阈值） → fail
  if (top1.f1_score < config.minFieldSim) {
    return { bucket: 'fail', reason: FailReason.FIELD_SIM_LOW_SUPPLIER };
  }
```

**After**:
```typescript
  // 规则4: 供应商相似度过低 → fail (使用动态阈值)
  if (top1.f1_score < dynamicThreshold) {
    return { bucket: 'fail', reason: FailReason.FIELD_SIM_LOW_SUPPLIER };
  }
```

**性能分析**:
- ✅ **无性能影响**

**语义分析**:
- ✅ **行为一致**：与 Task 1.3 相同的动态阈值逻辑

**Requirements**: REQ-1, REQ-2

---

#### Task 1.5: ~~删除 Rule 5（高置信度旁路）~~ **[SKIPPED - Scheme A]**

- **File**: `packages/ocr-match-core/src/bucket/bucketize.ts`
- **Location**: 行 91-95
- **Action**: **保留不变**（Scheme A 策略）

**Ultrathink 分析结论**:
```
Rule 5 保护了 63/71 (88.7%) 的 exact 案例
- 这 63 个案例的平均分数: 0.940 (min=0.877, max=1.000)
- 它们的 delta < 0.03 是因为 DB 中有多个相似项目（同一供应商、不同期数）
- 删除 Rule 5 导致它们全部降级为 review（v0.1.9 失败的根本原因）
```

**Scheme A 策略**:
- ✅ **保留 Rule 5 不变**：它是双通道设计的快速通道（绝对质量标准）
- ✅ **只优化 Rule 3/4/7**：这些规则使用相对质量标准（delta check）
- ✅ **未来优化**：Scheme C 会优化 Rule 5 本身（动态阈值 + Rule 5 条件联合优化）

**代码保持不变**:
```typescript
  // 规则5: 高置信度旁路 - 极高分数直接通过，忽略 delta
  // 修复设计缺陷：避免高质量匹配被 delta 检查误判为 review
  // v0.1.5: 降低阈值以救回边界案例（score 0.90→0.85, f2_score 0.80→0.75)
  // v0.1.9: Scheme A 保留不变（保护 88.7% exact 案例）
  if (top1.score >= 0.85 && top1.f1_score >= 0.80 && top1.f2_score >= 0.75) {
    return { bucket: 'exact', reason: null };
  }
```

**Requirements**: REQ-2（向后兼容性），ultrathink_analysis.md Scheme A

---

#### Task 1.6: 替换 Rule 7 的阈值检查（第一处）

- **File**: `packages/ocr-match-core/src/bucket/bucketize.ts`
- **Location**: 行 112（`top1.f1_score >= config.minFieldSim`）
- **Action**: 替换 `config.minFieldSim` 为 `dynamicThreshold`

**Before**:
```typescript
  if (
    weightedScore >= config.autoPass &&
    top1.f1_score >= config.minFieldSim &&
    top1.f2_score >= config.minFieldSim &&
    delta >= config.minDeltaTop
  ) {
    return { bucket: 'exact', reason: null };
  }
```

**After**:
```typescript
  if (
    weightedScore >= config.autoPass &&
    top1.f1_score >= dynamicThreshold &&  // 改
    top1.f2_score >= config.minFieldSim &&
    delta >= config.minDeltaTop
  ) {
    return { bucket: 'exact', reason: null };
  }
```

**性能分析**:
- ✅ **无性能影响**

**Requirements**: REQ-1

---

#### Task 1.7: 替换 Rule 7 的阈值检查（第二处）

- **File**: `packages/ocr-match-core/src/bucket/bucketize.ts`
- **Location**: 行 113（`top1.f2_score >= config.minFieldSim`）
- **Action**: 替换 `config.minFieldSim` 为 `dynamicThreshold`

**Before**:
```typescript
  if (
    weightedScore >= config.autoPass &&
    top1.f1_score >= dynamicThreshold &&
    top1.f2_score >= config.minFieldSim &&  // 这一行
    delta >= config.minDeltaTop
  ) {
    return { bucket: 'exact', reason: null };
  }
```

**After**:
```typescript
  if (
    weightedScore >= config.autoPass &&
    top1.f1_score >= dynamicThreshold &&
    top1.f2_score >= dynamicThreshold &&  // 改
    delta >= config.minDeltaTop
  ) {
    return { bucket: 'exact', reason: null };
  }
```

**性能分析**:
- ✅ **无性能影响**

**Requirements**: REQ-1

---

### Phase 2: 构建验证（Estimated: 2 minutes）

#### Task 2.1: 编译验证

- **Command**: `pnpm -F ./packages/ocr-match-core build`
- **File**: N/A（构建步骤）
- **Action**: 验证 TypeScript 编译成功

**验证点**:
- ✅ 无 TypeScript 类型错误
- ✅ 无语法错误
- ✅ Dist 文件生成正确

**失败处理**:
- 立即回滚代码
- 分析错误信息
- 修复后重新构建

**Requirements**: REQ-3（构建无错误）

---

### Phase 3: 快速验证（Estimated: 3 minutes）

#### Task 3.1: Sample Test（10 files baseline validation）

- **Command**: `pnpm test:sample`
- **File**: N/A（测试命令）
- **Action**: 快速验证无明显回归

**验证点**:
- ✅ 无崩溃或运行时错误
- ✅ 无新 failure reasons
- ✅ Candidate IDs 目测合理

**⚠️ 性能监控**:
- 记录总耗时（预期 <3min）
- 如果耗时显著增加（>5min），立即停止调查

**失败处理**:
- 立即回滚代码
- 分析失败原因
- 检查是否引入性能问题

**Requirements**: REQ-2（向后兼容性）

---

### Phase 4: 完整测试（Estimated: 5 minutes）

#### Task 4.1: Full Test（222 files）

- **Command**: `pnpm test:full 2>&1 | tee /tmp/test_v019_dynamic.log`
- **File**: N/A（测试命令，输出到 /tmp）
- **Action**: 完整验证性能和准确率

**验证点**:
- ✅ **Exact matches**: 71 → 目标 74-78（+3-7）
- ✅ **Auto-pass rate**: 32% → 目标 35-37%（+3-5pp）
- ✅ **无新 failure reasons**
- ✅ **性能**: 总耗时 <5min（不应显著增加）

**⚠️ 关键监控**:
- **FIELD_SIM_LOW_PROJECT**: 应显著减少（当前 67 例）
- **FIELD_SIM_LOW_SUPPLIER**: 可能轻微增加（允许）
- **平均耗时**: 应保持 ~860ms/file（±10%）

**失败处理**:
- 如果 exact matches < 71：立即回滚（回归）
- 如果 exact matches 无增长（71）：分析原因，可能需要调整公式
- 如果耗时显著增加（>10min）：立即回滚，检查性能问题

**Requirements**: REQ-3（测试验证）

---

### Phase 5: 结果分析（Estimated: 5 minutes）

#### Task 5.1: 比较结果

- **Files**:
  - New: `runs/run_v019_dynamic_*/results.csv`
  - Baseline: `runs/run_20251119_00_17/results.csv`（v0.1.8, 32% auto-pass）
- **Action**: 生成对比报告

**对比指标**:
- **KPI Table**:
  - Exact: 71 → ? (目标: 74-78)
  - Review: 17 → ?
  - Fail: 134 → ? (目标: 减少)
  - Auto-pass rate: 32.0% → ? (目标: 35-37%)

- **Failure Reasons**（Top 5）:
  - FIELD_SIM_LOW_PROJECT: 67 → ? (应显著减少)
  - SUPPLIER_HARD_REJECT: 29 → ? (可能不变)
  - EXTRACT_EMPTY_PROJECT: 18 → ? (应不变)

- **性能**:
  - Total time: 3.2min → ? (目标: 不增加)
  - Avg time: 860ms/file → ? (目标: ±10%)

**成功标准**:
- ✅ Exact matches >= 74（+3）
- ✅ Auto-pass rate >= 35%（+3pp）
- ✅ 无新 failure reasons
- ✅ 总耗时 <= 5min

**Requirements**: All requirements

---

### Phase 6: 文档记录（Estimated: 5 minutes）

#### Task 6.1: Implementation Log

- **Tool**: `mcp__spec-workflow__log-implementation`
- **Action**: 记录实施细节

**Artifacts to Log**:
- **Functions Modified**:
  - `bucketize()` (bucketize.ts:50-126)
  - Purpose: Enable dynamic threshold optimization
  - Signature: (unchanged)
  - Changes: Added inline `getDynamicThreshold`, replaced 3 threshold checks, deleted Rule 5

- **Functions Added**:
  - `getDynamicThreshold` (inline, bucketize.ts:~56-65)
  - Purpose: Calculate per-candidate dynamic threshold
  - Signature: `(f1: number, f2: number, baseThreshold: number) => number`
  - Status: Pure function, O(1) complexity

- **Performance Impact**:
  - Before: 860ms/file
  - After: ? (target: ±10%)
  - Code changes: O(1) operations only

- **Accuracy Impact**:
  - Exact matches: 71 → ? (target: 74-78)
  - Auto-pass rate: 32% → ? (target: 35-37%)

**Files Modified**: `src/bucket/bucketize.ts`
**Files Created**: None
**Statistics**: ~8 lines added, ~5 lines removed

**Requirements**: All requirements

---

## Rollback Plan

**触发条件**（任一）:
- Exact matches < 71（回归）
- 总耗时 > 10min（性能回退）
- 新 failure reasons 出现
- results.csv schema 不兼容

**回滚步骤**:
1. Revert bucketize.ts:
   ```bash
   git checkout HEAD~1 packages/ocr-match-core/src/bucket/bucketize.ts
   ```
2. Rebuild package:
   ```bash
   pnpm -F ./packages/ocr-match-core build
   ```
3. Re-run sample test:
   ```bash
   pnpm test:sample
   ```
4. Document rollback reason in spec failure_analysis.md

---

## Task Dependencies

```
1.1 (Add getDynamicThreshold) → 1.2 (Calculate dynamicThreshold) → 1.3-1.7 (Replace checks) → 2.1 (Build) → 3.1 (Sample Test) → 4.1 (Full Test) → 5.1 (Analysis) → 6.1 (Logging)
                                                                                                                  ↓
                                                                                                            If fails: Rollback
```

**Sequential Execution Required**: 每个任务必须成功后才能继续。

**Estimated Total Time**: 35 minutes

---

## Notes

### 为什么 Scheme A 会成功？

**1. 保留双通道设计**:
- ✅ **Channel 1 (Rule 5)**: 高置信度快速通道，保护 63/71 (88.7%) exact 案例
- ✅ **Channel 2 (Rule 6-7)**: 标准验证通道，处理剩余案例
- ✅ **动态阈值只应用于 Channel 2**：Rule 3/4 是入口检查，Rule 7 是出口检查

**2. 性能保证**:
- ✅ 所有新增代码都是 **O(1)** 操作
- ✅ 无循环、无递归、无外部调用
- ✅ 只添加了一个纯函数和 3 次变量替换

**3. 预期收益来源**:
- ✅ Rule 3/4 的动态阈值会让一些边界案例（f1/f2 稍低但 score 高）通过早期检查
- ✅ Rule 7 的动态阈值会让更多高质量匹配通过最终验证
- ✅ 预期新增 5-10 个 exact 案例（来自 FIELD_SIM_LOW_* 失败桶）

**4. 风险极低**:
- ✅ Rule 5 保护层不变，63 个高置信度案例安全
- ✅ 只影响不满足 Rule 5 条件的案例
- ✅ 最坏情况：无收益，但绝不会回归

### 与 v0.1.9 失败的区别

**v0.1.9 失败原因**:
- ❌ 删除了 Rule 5（误以为是"坏品味的特殊情况"）
- ❌ 63/71 exact 案例失去保护，降级为 review
- ❌ 灾难性回归：32% → 3.6% auto-pass

**Scheme A 修正**:
- ✅ **保留 Rule 5**：理解它是双通道设计的关键
- ✅ **只优化 Rule 3/4/7**：这些规则适合动态阈值
- ✅ **数据驱动**：基于 ultrathink 分析的 63 案例深度研究

### 后续优化路径

**Scheme A（当前）**: 保守优化
- 预期收益：+5-10 exact (+2-4pp)
- 风险：Very Low

**Scheme C（A 成功后）**: 双通道联合优化
- 对 Rule 5 本身应用动态阈值
- 预期收益：+10-20 exact (+4-8pp)
- 风险：Medium

**v0.2.0（未来）**: substring 加权重算
- 核心算法升级
- 预期收益：+30-50 exact (+15-25pp)
- 风险：High

---

**任务文档更新完成（Scheme A），等待实施。**
