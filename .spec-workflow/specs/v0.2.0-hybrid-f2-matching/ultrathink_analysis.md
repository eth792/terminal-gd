# v0.2.0 Hybrid F2 Matching - Ultrathink 失败分析报告

## 执行摘要

**状态**: 失败 (NACK)
**测试日期**: 2025-11-19
**运行 ID**: `run_20251119_19_24`

### KPI 结果

| 指标 | 实际值 | 基线 (v0.1.7b) | 目标 (v0.2.0) | 状态 |
|------|--------|---------------|--------------|------|
| **Exact** | **49** | 71 | 99 | **-31% 回归** |
| Review | 40 | - | <50 | OK |
| Fail | 133 | - | - | 激增 |
| 自动通过率 | 22.1% | 32.0% | 44.6% | **-30.6%** |
| 总耗时 | 3.8min | ~4min | ≤6min | OK |

**回滚条件触发**: Exact = 49 < 71 (基线)

---

## 失败原因分布

1. **FIELD_SIM_LOW_PROJECT**: 69 次（39.9%）← 主要失败模式
2. DELTA_TOO_SMALL: 40 次（23.1%）
3. SUPPLIER_HARD_REJECT: 26 次（15.0%）
4. EXTRACT_EMPTY_PROJECT: 18 次（10.4%）
5. EXTRACT_BOTH_EMPTY: 11 次（6.4%）

---

## Linus 五层 Ultrathink 分析

### 第一层：数据结构分析

**实现的算法**: LCS Substring（最长公共连续子串）
```typescript
// dp[i][j] = dp[i-1][j-1] + 1 仅当 s1[i] === s2[j]
// 归一化: maxLen / max(len1, len2)
```

**根本问题**:
- 使用 `max()` 归一化导致长度差异惩罚过重
- DB 通常比 OCR 长（添加公司名、地块号等）
- 当 DB 是 OCR 的 2 倍长时，理论最大值 = 0.5（无法超过 0.6 阈值）

### 第二层：特殊情况识别

**标点问题（部分原因）**:
- 配置只删除双引号 `""`，未删除中文单引号 `''`
- 保留了括号 `()`，打断连续子串
- 但即使完全删除标点，长度差异问题仍存在

**实验验证**:
```
案例: "武汉市花山185地块项目" vs DB 带括号版本

原始（有引号+括号）: LCS = 0.321
删除引号（保留括号）: LCS = 0.462 (+43%)
删除引号+括号:       LCS = 0.500 (+8%)
理想情况:            LCS = 1.000

结论: 即使删除所有标点，0.500 < 0.6 阈值，仍然失败
```

### 第三层：复杂度审查

**当前算法权重**:
```typescript
return 0.2 * lev + 0.4 * jac + 0.4 * lcs;
```

- Levenshtein (20%): 对长度差异敏感
- Jaccard (40%): 容忍部分差异，但权重不足
- **LCS Substring (40%)**: 归一化公式错误，完全失效

### 第四层：破坏性分析

**向后兼容性破坏**:
- 71 个原本正确的案例 → 49 个（-31%）
- 22 个案例被错误拒绝
- 违反 "Never break userspace" 原则

### 第五层：实用性验证

**典型失败案例**:

| OCR | DB | 期望 F2 | 实际 F2 | 状态 |
|-----|-----|---------|---------|------|
| 武汉市花山185地块项目 | 武汉市"花山185地块项目"（武汉云盛志合置业有限公司） | ~0.85 | 0.362 | 失败 |
| 桥村城中村改造 | 湖北汉江新世纪投资有限公司"汉江村城中村改造K3地块" | ~0.70 | 0.210 | 失败 |

---

## 根本原因（Root Cause）

### 数学问题：归一化公式错误

**当前公式**:
```typescript
return maxLen / Math.max(len1, len2);
```

**问题**:
- OCR: 12 chars, DB: 24 chars
- 最长公共子串: 12 chars
- 结果: 12 / 24 = **0.5 < 0.6 阈值**

**应该使用**:
```typescript
// 选项 1: min() 归一化（奖励完整子串）
return maxLen / Math.min(len1, len2);  // 12/12 = 1.0

// 选项 2: 包含检测
if (shorter 是 longer 的子串) return 1.0;
```

---

## 代码变更记录

### 新增函数

1. **`lcsRatio()`** - similarity.ts:59-100
   - 功能: 计算最长公共子串比例
   - 问题: 使用 `max()` 归一化

2. **`projectFieldSimilarity()`** - similarity.ts:124-160
   - 功能: F2 专用相似度（20% Lev + 40% Jac + 40% LCS）
   - 问题: 依赖 lcsRatio，继承其错误

3. **`singleFieldScore(isProjectField)`** - similarity.ts:186-209
   - 功能: 根据字段类型选择算法
   - 实现: 正确

### 修改函数

1. **`scoreCandidates()`** - rank.ts:30-46
   - 变更: F1 用旧算法，F2 用新算法
   - 实现: 正确

2. **`anchorMatch()`** - strategies.ts:68,76
   - 变更: 传递 `isProjectField` 参数
   - 实现: 正确

---

## 修复建议（下一版本）

### 方案 A: min() 归一化（推荐）

```typescript
export function lcsRatio(s1: string, s2: string): number {
  // ... DP 计算 maxLen ...

  // 修复：使用 min() 归一化
  const minLen = Math.min(len1, len2);
  return minLen === 0 ? 1.0 : maxLen / minLen;
}
```

**预期效果**: "武汉市花山185地块项目" vs 24 chars DB → 12/12 = 1.0

### 方案 B: 包含检测 + LCS 混合

```typescript
export function lcsRatio(s1: string, s2: string): number {
  // 如果短串完全包含在长串中，直接返回 1.0
  const [shorter, longer] = len1 <= len2 ? [s1, s2] : [s2, s1];
  if (longer.includes(shorter)) return 1.0;

  // 否则用 LCS Substring
  // ...
}
```

### 方案 C: 增强标点处理（辅助）

```json
// normalize.user.json 新增
{
  "pattern": "[()（）''']",
  "replace": ""
}
```

---

## 行动要求

1. **立即回滚**: `git revert HEAD`（触发回滚条件）
2. **下一版本**: 修复 `lcsRatio()` 归一化公式
3. **权重调优**: 考虑降低 LCS 权重或提高 Jaccard 权重

---

## 教训总结

1. **算法选择**: LCS Substring 不适合长度差异大的场景
2. **数学验证**: 应该在设计阶段计算理论边界值
3. **回归测试**: 应该先用基线数据验证无回归
4. **标点处理**: 配置不完整（缺少单引号、括号）

---

**分析时间**: 2025-11-19 19:30
**分析者**: Claude Code (Ultrathink)
