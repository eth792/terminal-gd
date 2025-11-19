# Tasks Document: v0.2.0 Hybrid F2 Matching

## Ultrathink 分析摘要

**核心问题**：F2（项目名称匹配）平均比 F1 低 0.142，导致 60 个 FIELD_SIM_LOW_PROJECT 失败。

**根本原因**：当前算法（0.5*Levenshtein + 0.5*Jaccard）对长度差异过于敏感。
- 示例：OCR "居住、社会福利项目" vs DB "居住、社会福利项目（光谷P（2023）028地块" → F2 = 0.595
- 惩罚过重：16 个额外字符 → 0.457 penalty

**解决方案**：引入 LCS（Longest Common Substring）容忍子串差异。
- 新权重：`0.2*Lev + 0.4*Jac + 0.4*LCS`
- 预期收益：+28 exact（+39.4%），32.0% → 44.6%

**设计约束**：
- ✅ F1 不变（供应商匹配保持原算法）
- ✅ 向后兼容（`isProjectField` 可选参数）
- ✅ O(N*M) 复杂度（与 baseline 相同）

---

## Phase 1: 核心算法实现（Low Risk）

### Task 1.1: 实现 `lcsRatio()` 函数

- [ ] **文件**: `packages/ocr-match-core/src/match/similarity.ts`
- **位置**: 在 `jaccardSimilarity()` 函数之后添加
- **功能**: 计算最长公共子串（Longest Common Substring）比例
- **接口**:
  ```typescript
  export function lcsRatio(s1: string, s2: string): number
  ```
- **实现要求**:
  1. 边界条件处理：
     - `if (s1 === s2) return 1.0;`
     - `if (!s1 || !s2) return 0.0;`
  2. 动态规划求 LCS 长度：
     - 使用二维 DP 表 `dp[i][j]`
     - 状态转移：`dp[i][j] = dp[i-1][j-1] + 1`（当 `s1[i-1] === s2[j-1]` 时）
     - 记录最大值 `maxLen`
  3. 归一化：`return maxLen / Math.max(s1.length, s2.length)`
  4. 添加 JSDoc 注释解释算法用途
- **复杂度**: O(N*M) 时间，O(N*M) 空间
- **测试案例**（手工验证）:
  - `lcsRatio('ABC', 'ABC')` → 1.0（完全匹配）
  - `lcsRatio('新荣TOD项目', '新荣TOD项目一期')` → ≥ 0.75（子串匹配）
  - `lcsRatio('ABC', 'XYZ')` → 0.0（完全不同）
- **_Leverage_**: 现有 `levenshteinSimilarity()` 和 `jaccardSimilarity()` 的代码结构
- **_Requirements_**: REQ-1（Hybrid Fuzzy Matching）

**Success Criteria**:
1. ✅ 函数定义符合接口规范
2. ✅ 边界条件处理正确
3. ✅ DP 算法实现正确（通过手工测试案例）
4. ✅ 归一化返回 [0, 1] 区间
5. ✅ TypeScript strict mode 编译通过

---

### Task 1.2: 添加 `lcsRatio()` 单元测试

- [ ] **文件**: `packages/ocr-match-core/src/match/__tests__/similarity.test.ts`
- **功能**: 验证 `lcsRatio()` 函数正确性
- **测试用例**（参考 design.md 第 344-364 行）:
  ```typescript
  describe('lcsRatio', () => {
    it('should handle exact match', () => {
      expect(lcsRatio('ABC', 'ABC')).toBe(1.0);
    });

    it('should handle substring match', () => {
      // OCR: '新荣TOD项目'
      // DB:  '新荣TOD项目一期'
      expect(lcsRatio('新荣TOD项目', '新荣TOD项目一期')).toBeGreaterThan(0.75);
    });

    it('should handle extra info in DB', () => {
      const ocr = '大桥现代产业园';
      const db = '大桥现代产业园（武汉江夏）';
      expect(lcsRatio(ocr, db)).toBeGreaterThan(0.7);
    });

    it('should handle completely different strings', () => {
      expect(lcsRatio('ABC', 'XYZ')).toBe(0.0);
    });
  });
  ```
- **验证点**:
  1. 完全匹配 → 1.0
  2. 子串匹配 → 高分（≥ 0.75）
  3. DB 额外信息 → 容忍（≥ 0.7）
  4. 完全不同 → 0.0
- **_Leverage_**: 现有测试框架和断言模式
- **_Requirements_**: REQ-1

**Success Criteria**:
1. ✅ 所有测试用例通过
2. ✅ 测试覆盖边界条件和典型场景
3. ✅ 测试结果符合设计预期

---

## Phase 2: 项目相似度函数（Medium Risk）

### Task 2.1: 实现 `projectFieldSimilarity()` 函数

- [ ] **文件**: `packages/ocr-match-core/src/match/similarity.ts`
- **位置**: 在 `fieldSimilarity()` 函数之后添加
- **功能**: 专为项目名称设计的相似度算法（混合 Lev + Jac + LCS）
- **接口**:
  ```typescript
  export function projectFieldSimilarity(
    q: string,
    f: string,
    normalizer?: Normalizer
  ): number
  ```
- **实现要求**（参考 design.md 第 124-144 行）:
  1. 归一化处理：
     ```typescript
     const ns1 = normalizer ? normalizer(q) : q;
     const ns2 = normalizer ? normalizer(f) : f;
     ```
  2. 边界条件：
     - `if (ns1 === ns2) return 1.0;`
     - `if (!ns1 || !ns2) return 0.0;`
  3. 三种算法组合：
     ```typescript
     const lev = levenshteinSimilarity(q, f, normalizer);
     const jac = jaccardSimilarity(q, f, 2, normalizer);
     const lcs = lcsRatio(ns1, ns2);  // 使用归一化后的字符串
     ```
  4. 混合权重：
     ```typescript
     return 0.2 * lev + 0.4 * jac + 0.4 * lcs;
     ```
  5. 添加详细 JSDoc 注释：
     - 说明用途（针对 F2 优化）
     - 解释权重选择（数据驱动）
     - 提供使用示例
- **_Leverage_**: 现有的 `levenshteinSimilarity()`, `jaccardSimilarity()`, `lcsRatio()`
- **_Requirements_**: REQ-1（Hybrid Fuzzy Matching）

**Success Criteria**:
1. ✅ 函数定义符合接口规范
2. ✅ 正确调用三种算法
3. ✅ 权重计算正确（0.2 + 0.4 + 0.4 = 1.0）
4. ✅ 归一化流程与 `fieldSimilarity()` 一致
5. ✅ TypeScript strict mode 编译通过

---

### Task 2.2: 添加 `projectFieldSimilarity()` 单元测试

- [ ] **文件**: `packages/ocr-match-core/src/match/__tests__/similarity.test.ts`
- **功能**: 验证混合算法效果
- **测试用例**（参考 design.md 第 366-382 行）:
  ```typescript
  describe('projectFieldSimilarity', () => {
    it('should score higher than old algorithm for incomplete OCR', () => {
      const ocr = '居住、社会福利项目';
      const db = '居住、社会福利项目（光谷P（2023）028地块';

      const oldScore = fieldSimilarity(ocr, db, 0.5, 2);
      const newScore = projectFieldSimilarity(ocr, db);

      expect(newScore).toBeGreaterThan(oldScore);
      expect(newScore).toBeGreaterThan(0.75);  // 目标阈值
    });

    it('should not break existing exact matches', () => {
      const exact = '武汉市轨道交通19号线工程';
      expect(projectFieldSimilarity(exact, exact)).toBe(1.0);
    });

    it('should handle DB extra info gracefully', () => {
      const ocr = '大桥现代产业园';
      const db = '大桥现代产业园（武汉江夏）';
      expect(projectFieldSimilarity(ocr, db)).toBeGreaterThan(0.7);
    });
  });
  ```
- **验证点**:
  1. 新算法 > 旧算法（对于不完整 OCR）
  2. 新算法 ≥ 0.75（目标阈值）
  3. 完全匹配 → 1.0（无回归）
  4. DB 额外信息 → 高容忍度
- **_Leverage_**: 现有测试框架
- **_Requirements_**: REQ-1, REQ-2（Backward Compatibility）

**Success Criteria**:
1. ✅ 所有测试用例通过
2. ✅ 新算法确实比旧算法更宽容
3. ✅ 无回归（exact match 仍为 1.0）

---

## Phase 3: 集成到打分系统（High Risk）

### Task 3.1: 修改 `singleFieldScore()` 函数

- [ ] **文件**: `packages/ocr-match-core/src/match/similarity.ts`
- **功能**: 添加 `isProjectField` 参数，根据字段类型选择算法
- **修改内容**（参考 design.md 第 211-237 行）:

**修改前**:
```typescript
export function singleFieldScore(q: string, f: string, normalizer?: Normalizer): number {
  return fieldSimilarity(q, f, 0.5, 2, normalizer);
}
```

**修改后**:
```typescript
/**
 * 计算单个字段的相似度
 * @param q - 查询字符串
 * @param f - 候选字符串
 * @param isProjectField - 是否为项目字段（f2），默认 false
 * @param normalizer - 可选的归一化函数
 */
export function singleFieldScore(
  q: string,
  f: string,
  isProjectField: boolean = false,
  normalizer?: Normalizer
): number {
  if (isProjectField) {
    return projectFieldSimilarity(q, f, normalizer);
  }
  return fieldSimilarity(q, f, 0.5, 2, normalizer);
}
```

- **Breaking Change?**: ❌ 否 - 添加可选参数，默认行为不变
- **_Leverage_**: 现有函数结构和参数模式
- **_Requirements_**: REQ-1, REQ-2（Backward Compatibility）

**Success Criteria**:
1. ✅ 添加 `isProjectField` 可选参数（默认 `false`）
2. ✅ `isProjectField=true` → 调用 `projectFieldSimilarity()`
3. ✅ `isProjectField=false` → 调用 `fieldSimilarity()`（保持原逻辑）
4. ✅ JSDoc 注释完整
5. ✅ TypeScript strict mode 编译通过

---

### Task 3.2: 修改 `rank.ts` 的 `scoreCandidates()` 函数

- [ ] **文件**: `packages/ocr-match-core/src/match/rank.ts`
- **功能**: 在调用 `singleFieldScore()` 时传递字段类型
- **修改内容**（参考 design.md 第 249-272 行）:

**修改前**（当前代码）:
```typescript
export function scoreCandidates(
  q1: string,
  q2: string,
  candidates: DbRow[],
  normalizer?: Normalizer
): ScoredCandidate[] {
  return candidates.map(row => {
    const f1_score = singleFieldScore(q1, row.f1, normalizer);
    const f2_score = singleFieldScore(q2, row.f2, normalizer);
    // ...
  });
}
```

**修改后**:
```typescript
export function scoreCandidates(
  q1: string,
  q2: string,
  candidates: DbRow[],
  normalizer?: Normalizer
): ScoredCandidate[] {
  return candidates.map(row => {
    // F1 使用旧算法（供应商匹配）
    const f1_score = singleFieldScore(q1, row.f1, false, normalizer);

    // F2 使用新算法（项目名称匹配）
    const f2_score = singleFieldScore(q2, row.f2, true, normalizer);

    const score = hybridScore(q1, q2, row.f1, row.f2, 0.5, normalizer);

    return {
      row,
      score,
      f1_score,
      f2_score,
    };
  });
}
```

- **关键变更**:
  1. F1 显式传 `false`（保持原算法）
  2. F2 显式传 `true`（使用新算法）
  3. 添加注释说明原因
- **_Leverage_**: 现有的 `scoreCandidates()` 结构
- **_Requirements_**: REQ-1, REQ-2

**Success Criteria**:
1. ✅ F1 调用时传 `false`
2. ✅ F2 调用时传 `true`
3. ✅ 添加清晰注释
4. ✅ 无其他逻辑变更
5. ✅ TypeScript strict mode 编译通过

---

### Task 3.3: 构建并运行采样测试

- [ ] **操作**: 构建 + 采样测试（快速验证）
- **命令**:
  ```bash
  # 1. 构建
  pnpm -F ./packages/ocr-match-core build

  # 2. 采样测试（29 files，~26s）
  pnpm test:sample
  ```
- **验证点**（参考 design.md 第 389-400 行）:
  1. ✅ 7 个 FIELD_SIM_LOW_PROJECT 案例 → review or exact（目标）
  2. ✅ 现有 5 个 exact 案例保持不变（无回归）
  3. ⚠️ 总耗时 < 30s（baseline 26s，允许 +15%）
- **成功标准**:
  - **Best case**: Exact ≥ 5, Review ≥ 11（+7 from FIELD_SIM_LOW_PROJECT）
  - **Acceptable**: Exact ≥ 5, Review ≥ 9（+5 改善）
  - **Failure**: Exact < 5（回归）→ 立即停止，回滚代码
- **_Requirements_**: REQ-1, REQ-3（Performance）

**Success Criteria**:
1. ✅ 构建成功（无 TypeScript 错误）
2. ✅ 采样测试运行完成
3. ✅ 至少 2 个 FIELD_SIM_LOW_PROJECT 案例改善
4. ✅ 无现有 exact 案例降级为 review/fail
5. ✅ 耗时 <= 30s

---

## Phase 4: 完整测试和验证（Critical）

### Task 4.1: 运行完整测试并验证 KPI

- [ ] **操作**: 完整测试（222 files）
- **命令**:
  ```bash
  pnpm test:full
  ```
- **目标 KPI**（参考 design.md 第 408-414 行）:
  | 指标 | Baseline (v0.1.9) | Target (v0.2.0) | 变化 |
  |------|-------------------|----------------|------|
  | **Exact** | 71 (32.0%) | **99** (44.6%) | **+28 (+39.4%)** |
  | **Review** | 24 (10.8%) | **16** (7.2%) | **-8** |
  | **Fail** | 127 (57.2%) | **107** (48.2%) | **-20** |
- **成功标准**:
  - **✅ Success**: Exact >= 99 **AND** Time <= 6min
  - **⚠️ Partial Success**: Exact >= 85 **AND** Time <= 6min
  - **❌ Failure**: Exact < 71 **OR** Time > 6min
- **回滚条件**（参考 design.md 第 416-420 行）:
  - ❌ Exact < 71（回归）
  - ❌ Time > 6min（性能不可接受）
  - ❌ Review > 50（假阳性过多）
- **_Requirements_**: REQ-1, REQ-2, REQ-3

**Success Criteria**:
1. ✅ Exact >= 99（目标达成）
2. ✅ Exact >= 71（无回归，至少持平）
3. ✅ Time <= 6min（性能可接受）
4. ✅ Review < 50（假阳性控制）
5. ✅ 运行包生成成功（manifest.json, summary.md, results.csv）

---

### Task 4.2: 性能验证

- [ ] **分析**: 检查性能指标
- **数据来源**: `runs/run_v020_*/summary.md` 或 `manifest.json`
- **验证点**（参考 design.md 第 429-446 行）:
  1. **总耗时** <= 6min（baseline 3.6min，允许 +67%）
  2. **平均耗时** <= 1500ms/file（baseline 986ms，允许 +50%）
  3. **F2 计算增量** ~ +0.2ms/file（预测值）
- **复杂度分析**（参考 design.md 第 432-438 行）:
  | 算法 | 时间复杂度 | 空间复杂度 | ���注 |
  |------|-----------|-----------|------|
  | **Levenshtein** | O(N*M) | O(min(N,M)) | fastest-levenshtein |
  | **Jaccard** | O(N + M) | O(N + M) | 2-gram tokenize |
  | **LCS** (新增) | O(N*M) | O(N*M) | 动态规划 DP 表 |
  | **总体** | **O(N*M)** | **O(N*M)** | 与 baseline 相同 |
- **_Requirements_**: REQ-3（Performance）

**Success Criteria**:
1. ��� 总耗时 <= 6min
2. ✅ 平均耗时 <= 1500ms/file
3. ✅ 与 baseline 性能差异在可接受范围内（+50%）
4. ✅ 无明显性能退化（如某个文件耗时异常）

---

### Task 4.3: 回归测试（确保无破坏）

- [ ] **验证**: 检查现有功能未受影响
- **验证点**:
  1. **F1 分数不变**:
     - 对比 `run_20251119_15_19` (Scheme A baseline) 和 `run_v020_*` 的 F1 分数分布
     - 使用 Python 脚本：
       ```python
       import pandas as pd
       baseline = pd.read_csv('runs/run_20251119_15_19/results.csv')
       new = pd.read_csv('runs/run_v020_*/results.csv')

       # 检查 F1 分数分布
       print("F1 mean:", baseline['s_field1'].mean(), "vs", new['s_field1'].mean())
       print("F1 std:", baseline['s_field1'].std(), "vs", new['s_field1'].std())
       ```
  2. **Rule 5 旁路案例不受影响**:
     - 统计 bucket=exact 且 reason=null 的案例数量
     - 应该保持在 63 个左右（与 ultrathink 分析一致）
  3. **results.csv 契约不变**:
     - 列名称不变：file_name, score, s_field1, s_field2, bucket, reason, etc.
     - 只有分数数值变化，结构不变
  4. **63 个 Rule 5 案例保持 exact**:
     - 这些案例 score ≥ 0.85 且 f2 ≥ 0.75，不受 F2 算法影响
- **_Requirements_**: REQ-2（Backward Compatibility）

**Success Criteria**:
1. ✅ F1 分数分布不变（mean, std 差异 < 0.01）
2. ✅ Rule 5 旁路案例保持 exact（63 个）
3. ✅ results.csv 列定义不变
4. ✅ 无现有 exact 案例降级为 review/fail

---

## Phase 5: 清理和优化（Optional - 如果 v0.2.0 成功）

### Task 5.1: 移除 Scheme A 动态阈值代码

- [ ] **文件**: `packages/ocr-match-core/src/bucket/bucketize.ts`
- **功能**: 移除 Scheme A 的动态阈值逻辑（参考 design.md 第 505-520 行）
- **移除内容**:
  1. `getDynamicThreshold()` 函数（bucketize.ts:58-66）
  2. `dynamicThreshold` 变量计算（bucketize.ts:87-91）
  3. Rule 3/4/7 中的动态阈值引用（恢复为 `config.minFieldSim`）
- **理由**（参考 scheme_a_result.md）:
  - Scheme A 无收益（exact 不变）
  - 增加性能开销（+14.7%）
  - v0.2.0 直接解决 F2 问题，动态阈值不再需要
- **Git 操作**:
  ```bash
  git add packages/ocr-match-core/src/bucket/bucketize.ts
  git commit -m "chore(ocr-core): remove Scheme A (superseded by v0.2.0)

  Scheme A 动态阈值无 KPI 收益（exact 不变），且增加 +14.7% 耗时。
  v0.2.0 通过改进 F2 算法直接解决了问题，Scheme A 不再需要。

  详见：.spec-workflow/specs/v0.1.9-dynamic-threshold/scheme_a_result.md"
  ```
- **_Requirements_**: Design 文档 Migration Path

**Success Criteria**:
1. ✅ `getDynamicThreshold()` 函数移除
2. ✅ `dynamicThreshold` 变量计算移除
3. ✅ Rule 3/4/7 恢复为 `config.minFieldSim`（0.6）
4. ✅ 构建成功
5. ✅ 采样测试确认无回归

---

## Implementation Sequence（推荐顺序）

**遵循 Linus 原则**：一次只改一个函数，失败立即停止。

### Stage 1: 核心算法（最低风险）
1. Task 1.1: 实现 `lcsRatio()`
2. Task 1.2: 单元测试 `lcsRatio()`
3. **验证**: 运行测试，确保通过

### Stage 2: 项目相似度（低���险）
4. Task 2.1: 实现 `projectFieldSimilarity()`
5. Task 2.2: 单元测试 `projectFieldSimilarity()`
6. **验证**: 运行测试，确保通过

### Stage 3: 集成（高风险 - 修改调用链）
7. Task 3.1: 修改 `singleFieldScore()`
8. Task 3.2: 修改 `scoreCandidates()`
9. Task 3.3: 构建 + 采样测试
10. **验证**: Exact ≥ 5, Review ≥ 9, Time <= 30s

### Stage 4: 完整验证（Critical）
11. Task 4.1: 完整测试（目标：Exact >= 99）
12. Task 4.2: 性能验证（Time <= 6min）
13. Task 4.3: 回归测试（F1 不变，Rule 5 保持）
14. **Decision Point**:
    - ✅ Exact >= 99 → **Success**, 继续 Stage 5
    - ⚠️ Exact 85-98 → **Partial**, 权重调优（参考 design.md 第 449-477 行）
    - ❌ Exact < 71 → **Failure**, 回滚并分析

### Stage 5: 清理（Optional）
15. Task 5.1: 移除 Scheme A 代码（如果 v0.2.0 成功）

---

## Testing After Each Phase

- **After Stage 1**: 运行 `npm test similarity.test.ts`，确保 `lcsRatio()` 测试通过
- **After Stage 2**: 运行 `npm test similarity.test.ts`，确保 `projectFieldSimilarity()` 测试通过
- **After Stage 3**: 运行 `pnpm test:sample`，检查 Exact ≥ 5, Review 改善
- **After Stage 4**: 运行 `pnpm test:full`，验证 Exact >= 99，Time <= 6min

---

## Rollback Plan（失败处理）

### 触发条件（参考 design.md 第 480-503 行）
- ❌ Exact < 71（回归）
- ❌ Time > 6min（性能不可接受）
- ❌ Review > 50（假阳性过多）

### 回滚步骤
```bash
# 1. 恢复代码
git revert HEAD

# 2. 重新构建
pnpm -F ./packages/ocr-match-core build

# 3. 验证回滚成功
pnpm test:sample
# 期望：Exact = 5, Review = 4, Fail = 20（采样测试 baseline）
```

### 保留数据（用于分析）
- 完整测试结果: `runs/run_v020_*/`
- 失败案例分析: `.spec-workflow/specs/v0.2.0-hybrid-f2-matching/failure_analysis.md`（待创建）

---

## Notes

- **原子化任务**: 每个任务只修改 1-3 个文件，单一职责
- **失败即停止**: Stage 3 采样测试失败 → 立即停止，不进入 Stage 4
- **数据驱动**: 权重 `0.2*Lev + 0.4*Jac + 0.4*LCS` 可在后续版本调优（参考 design.md 第 449-477 行）
- **向后兼容**: `isProjectField` 默认 `false`，确保无破坏
- **性能预算**: 允许 +50% 耗时（986ms → 1500ms/file）

---

**文档状态**: Draft
**创建日期**: 2025-11-19
**版本**: 1.0
