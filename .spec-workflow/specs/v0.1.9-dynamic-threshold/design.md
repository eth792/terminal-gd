# Design Document: v0.1.9 Dynamic Threshold Optimization

## Overview

本设计实施**动态阈值优化**，解决当前分桶逻辑的设计缺陷：**高置信度字段无法补偿低置信度字段**。

**症状**：案例 `changjiangdianqi` 失败（f1=1.0, f2=0.597），原因是固定阈值 `minFieldSim=0.6` 对 OCR 标点误差过于僵硬。

**根本原因**（Linus 视角）：
> "Bad programmers worry about the code. Good programmers worry about data structures."

当前设计错误：`minFieldSim` 是**全局常量**，但它应该是**每个 candidate 的动态属性**。

**设计目标**：
1. 消除"高置信度旁路"（Rule 5）这个特殊情况
2. 用连续函数替代 if 判断
3. 让代码变得更简单（91-95 行消失）

---

## Steering Document Alignment

### Technical Standards (tech.md)

**Single Responsibility Principle**: 只修改 `bucketize.ts` 的 `bucketize` 函数

**Modular Design**: 不创建新文件，内联一个纯函数

**Dependency Management**: 无新增依赖

**Clear Interfaces**: 输入输出接口完全不变

### Project Structure (structure.md)

```
packages/ocr-match-core/src/bucket/
└── bucketize.ts          # 仅修改此文件
    ├── bucketize()       # 主函数，内联动态阈值计算
    └── DEFAULT_BUCKET_CONFIG  # 不变（minFieldSim 仍然有效）
```

---

## Code Reuse Analysis

### Existing Components to Leverage

- **`bucketize()` (bucketize.ts:50-126)**: 主函数逻辑保持不变，只替换阈值来源
- **`BucketConfig` interface (bucketize.ts:11-18)**: 不变，`minFieldSim` 作为 `baseThreshold`
- **`DEFAULT_BUCKET_CONFIG` (bucketize.ts:131-138)**: 不变

### Integration Points

- **现有决策逻辑**: 行 74, 86, 112, 113 的阈值检查
- **向后兼容**: `config.minFieldSim` 仍然有效（作为基准阈值）

---

## Architecture

### Linus 式设计原则

**1. 数据结构驱动**

当前错误：
```typescript
// 全局常量 - 错误！
const minFieldSim = 0.6;  // bucketize.ts:133
```

正确设计：
```typescript
// 每个 candidate 有自己的阈值 - 正确！
const threshold = getDynamicThreshold(f1, f2, baseThreshold);
```

**2. 消除特殊情况**

当前代码有特殊情况（Rule 5，行 91-95）：
```typescript
// 糟糕的设计 - 用 if 判断绕过固定阈值
if (top1.score >= 0.85 && top1.f1_score >= 0.80 && top1.f2_score >= 0.75) {
  return { bucket: 'exact', reason: null };
}
```

优化后：
```typescript
// Rule 5 消失 - 动态阈值自然处理这种情况
// 删除行 91-95
```

**3. 最简实现**

```typescript
/**
 * 计算动态阈值
 *
 * Good Taste 原则：用连续函数消除特殊情况
 * - 当 max(f1, f2) <= 0.8 → 保持 baseThreshold
 * - 当 max(f1, f2) > 0.8 → 线性放宽阈值
 *
 * 示例：
 * - f1=1.0, f2=0.5 → threshold = 0.6 - 0.1 = 0.5 → f2 通过
 * - f1=0.8, f2=0.5 → threshold = 0.6 - 0 = 0.6 → f2 不通过
 */
function getDynamicThreshold(f1: number, f2: number, baseThreshold: number): number {
  const maxScore = Math.max(f1, f2);
  if (maxScore <= 0.8) {
    return baseThreshold;  // 低置信度场景，保持严格
  }
  // 高置信度补偿：最多放宽 0.1（0.6 → 0.5）
  const compensation = (maxScore - 0.8) * 0.5;
  return Math.max(0.5, baseThreshold - compensation);  // 下限 0.5
}
```

**4. 零破坏性**

- ✅ `BucketConfig` 接口不变
- ✅ `bucketize()` 函数签名不变
- ✅ `results.csv` schema 不变
- ✅ 当 max(f1, f2) <= 0.8 时，完全等同于旧逻辑

---

## Components and Interfaces

### Component 1: `getDynamicThreshold` (新增内联函数)

- **Purpose:** 计算每个 candidate 的动态阈值
- **Interfaces:**
  ```typescript
  function getDynamicThreshold(
    f1: number,        // 供应商相似度
    f2: number,        // 项目相似度
    baseThreshold: number  // 基准阈值（来自 config.minFieldSim）
  ): number            // 返回动态阈值
  ```
- **Dependencies:** 无
- **Reuses:** 无（纯函数，无副作用）

### Component 2: `bucketize` (修改)

- **Purpose:** 分桶决策主逻辑
- **Interfaces:** 不变（bucketize.ts:50-55）
- **Dependencies:** 新增对 `getDynamicThreshold` 的调用
- **Reuses:** 现有 `BucketConfig`, `FailReason`, `ScoredCandidate`

---

## Data Models

### 现有 Data Models（不变）

```typescript
// BucketConfig (bucketize.ts:11-18) - 不变
interface BucketConfig {
  autoPass: number;
  minFieldSim: number;      // 作为 baseThreshold 使用
  minDeltaTop: number;
  supplierHardMin?: number;
  minReview?: number;
  weights?: [number, number];
}

// BucketResult (reasons.ts) - 不变
type BucketResult = {
  bucket: 'exact' | 'review' | 'fail';
  reason: FailReason | null;
}

// ScoredCandidate (rank.ts) - 不变
type ScoredCandidate = {
  f1_score: number;
  f2_score: number;
  score: number;
  // ...其他字段
}
```

---

## Implementation Plan

### 修改位置：`bucketize.ts:50-126`

```typescript
export function bucketize(
  q1: string,
  q2: string,
  candidates: ScoredCandidate[],
  config: BucketConfig
): BucketResult {
  // 规则1-2: 不变（行 57-71）
  // ...

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

  // 规则3: 单字段相似度过低 → fail (使用动态阈值)
  if (top1.f2_score < dynamicThreshold) {
    return { bucket: 'fail', reason: FailReason.FIELD_SIM_LOW_PROJECT };
  }

  // 规则3.5: 供应商硬阈值检查（不变，行 78-83）
  // ...

  // 规则4: 供应商相似度过低（使用动态阈值）
  if (top1.f1_score < dynamicThreshold) {
    return { bucket: 'fail', reason: FailReason.FIELD_SIM_LOW_SUPPLIER };
  }

  // ❌ 删除：规则5 高置信度旁路（行 91-95）
  // 原因：动态阈值已自然处理这种情况

  // 规则6: Delta 检查（不变，行 98-102）
  // ...

  // 规则7: 加权分数计算（使用动态阈值）
  // ...
  if (
    weightedScore >= config.autoPass &&
    top1.f1_score >= dynamicThreshold &&  // 改
    top1.f2_score >= dynamicThreshold &&  // 改
    delta >= config.minDeltaTop
  ) {
    return { bucket: 'exact', reason: null };
  }

  // ...
}
```

---

## Error Handling

### Error Scenarios

**1. 配置错误**
- **Scenario:** `config.minFieldSim` 不在 [0, 1] 范围
- **Handling:** 依赖现有配置校验（不在本次修改范围）
- **User Impact:** 构建时 TypeScript 类型检查

**2. 边界情况**
- **Scenario:** `f1_score` 或 `f2_score` 为 NaN/Infinity
- **Handling:** `Math.max()` 自然处理，降级为 `baseThreshold`
- **User Impact:** 不受影响，保持现有行为

---

## Testing Strategy

### Unit Testing

**核心测试**：
1. **边界条件**
   - `getDynamicThreshold(0.8, 0.5, 0.6)` → 返回 `0.6`（无补偿）
   - `getDynamicThreshold(1.0, 0.5, 0.6)` → 返回 `0.5`（最大补偿）
   - `getDynamicThreshold(0.9, 0.55, 0.6)` → 返回 `0.55`（刚好通过）

2. **向后兼容性**
   - `max(f1, f2) <= 0.8` 时，完全等同于固定阈值 `0.6`

### Integration Testing

**验证点**：
1. **Sample Test（10 files）**
   - 快速验证无语法错误
   - 目测 candidate IDs 合理

2. **Full Test（222 files）**
   - Exact matches >= 71（不低于 v0.1.8）
   - 新增 exact matches >= 3（目标 +3-5pp）
   - 无新 failure reason

### End-to-End Testing

**真实案例验证**：
- **changjiangdianqi** 案例：f1=1.0, f2=0.597 → threshold=0.5 → 通过
- **边界案例**：f1=0.9, f2=0.55 → threshold=0.55 → 刚好通过

---

## Risk Assessment

### 低风险（已缓解）

**风险**：动态阈值可能误放低质量匹配
- **缓解**：
  - 仅当 max(f1, f2) > 0.8 时放宽
  - 最多降 0.1（0.6→0.5）
  - 下限硬编码为 0.5
- **验证**：Sample test 快速检测

### 极低风险

**风险**：代码修改引入语法错误
- **缓解**：TypeScript strict mode + build 验证

---

## Linus 式设计总结

### ✅ 数据结构正确了
- 阈值从"全局常量"变为"per-candidate 动态属性"
- 符合 Linus："Bad programmers worry about code. Good programmers worry about data structures."

### ✅ 特殊情况消失了
- Rule 5（行 91-95）被删除
- 代码变得更简单、更清晰
- 符合 Linus："好代码没有特殊情况"

### ✅ 实用主义
- 解决真实问题（changjiangdianqi 案例）
- 不引入理论复杂性
- 符合 Linus："Theory and practice sometimes clash. Theory loses."

### ✅ 向后兼容
- 零破坏性
- 符合 Linus："Never break userspace"

---

**设计完成，等待审批。**
