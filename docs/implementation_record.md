# OCR Match Core 实施记录

本文档记录 ocr-match-core 的版本迭代和关键改进。

## 版本历史

### v0.1.3 - P0 优化：标点符号归一化 (2025-11-13)

**实施内容**:
- **P0-1**: 标点符号归一化 (Normalizer 模式)
- **P0-1 Bugfix**: 修复后处理清洗的半角冒号支持
- **P0-2**: 尝试降低 minDeltaTop 阈值 (发现设计缺陷)

#### 代码变更

**1. 引入 Normalizer 函数模式** (`packages/ocr-match-core/src/match/`)

在相似度计算前统一应用标点符号归一化：

- `similarity.ts`: 添加 `Normalizer` 类型和可选 normalizer 参数
  ```typescript
  export type Normalizer = (text: string) => string;

  export function levenshteinSimilarity(
    s1: string,
    s2: string,
    normalizer?: Normalizer
  ): number
  ```

- `rank.ts`: 在候选打分时应用 normalizer
- `strategies.ts`: 在三种匹配策略中传递 normalizer
- `match.ts`: 创建 normalizer 闭包
  ```typescript
  const normalizer = (text: string) => normalize(text, config.normalize);
  const matchResult = match(cleaned.supplier, cleaned.project, index, 0.6, 3, normalizer);
  ```

**2. 修复后处理清洗 bug** (`match.ts:98-108`)

支持全角和半角冒号的 admin prefix 清洗：
```typescript
const adminPrefixes = [
  '项目管理单位：客户服务中心市场及大客户服务室',
  '项目管理单位:客户服务中心市场及大客户服务室',  // 半角版本
  '项目管理单位：运维检修部工程名称：',
  '项目管理单位:运维检修部工程名称:',              // 半角版本
  // ...
];
```

**3. 配置版本更新**

新建配置版本 `configs/v0.labs/958582ab/`:
- `normalize.user.json`: 新增 9 个标点符号归一化规则
  - `：` → `:`
  - `；` → `;`
  - `（` → `(`
  - `）` → `)`
  - `【` → `[`
  - `】` → `]`
  - `"` → `"`
  - `"` → `"`
  - `《》` → `<>`

#### 测试结果

| 版本 | Exact | Review | Fail | 自动通过率 | 运行 ID |
|------|-------|--------|------|------------|---------|
| Baseline | 8 (3.6%) | 79 (35.6%) | 135 (60.8%) | 3.6% | `run_postprocess_20251112_231036` |
| P0-1 Bugfix | 8 (3.6%) | 80 (36.0%) | 134 (60.4%) | 3.6% | `run_p0_1_bugfix_20251113_011205` |
| P0-2 | 8 (3.6%) | 80 (36.0%) | 134 (60.4%) | 3.6% | `run_p0_2_20251113_024120` |

**P0-1 效果分析**:
- ✅ 47 个文件分数改善，平均提升 +0.9%
- ✅ 1 个文件从 fail → review
- ✅ 3 个文件达到完美匹配 (score = 1.0000)
- ✅ 修复了 6 个后处理清洗回归案例
- ❌ 自动通过率无改善 (未达桶位跃迁阈值)

**P0-2 失效原因**:
- ❌ 完全无效，结果与 P0-1 bugfix 完全相同
- 🐛 **发现设计缺陷**: `bucketize.ts:57-76` 规则顺序错误
  - Rule 4 (delta check) 提前返回，阻止 Rule 5 (autoPass check) 执行
  - 导致 minDeltaTop 参数调整无法将 DELTA_TOO_SMALL 案例转为 exact
  - **影响范围**: 80 个 DELTA_TOO_SMALL 案例 (36.0%)，其中 28 个 Top1 >= 0.95

#### 相关文档

- **完整报告**: `runs/P0_optimization_report_20251113.md`
- **失败分析**: `analysis/failure_analysis_report.md`
- **优化路线图**: `analysis/optimization_roadmap.md`

#### 下一步计划

**待修复**: 分桶逻辑设计缺陷
- **Option 1**: 调整规则顺序 (先 autoPass，再 delta)
- **Option 2**: 高置信度旁路 (推荐)
  ```typescript
  if (top1.score >= 0.90 && top1.f1_score >= 0.80 && top1.f2_score >= 0.80) {
    return { bucket: 'exact', reason: null };
  }
  ```

**预期改善**: 修复后自动通过率 **3.6% → 12-16%** (3-4倍提升)

---

### v0.1.2 - 多文件 DB 索引支持 (2025-11-12)

**实施内容**:
- 支持多个 Excel 文件作为 DB 输入
- 自动合并列结构（取 union）
- 生成统一的 DB digest

**代码变更**:
- `build-index.ts`: 支持 `--db` 指向目录或文件
- `manifest.json`: 记录 DB fingerprints

**测试结果**:
- ✅ 成功合并 `ledger-1.xlsx` 和 `ledger-2.xlsx`
- ✅ 总行数：178,043
- ✅ 唯一 supplier：517 个
- ✅ 倒排词条：13,848 个

---

### v0.1.1 - 后处理字段清洗 (2025-11-11)

**实施内容**:
- 实现后处理 admin prefix 清洗
- 添加 `was_cleaned` 标记到 `results.csv`

**代码变更**:
- `match.ts`: 添加 adminPrefixes 检测和清洗逻辑
- `results.csv`: 新增 `was_cleaned` 列

**测试结果**:
- ✅ 29 个文件被清洗
- ✅ 平均分数提升 +5.2%
- ✅ 7 个文件桶位改善

---

### v0.1.0 - 核心流程实现 (2025-11-10)

**实施内容**:
- 完成四阶段处理管线（normalize → extract → match → bucketize）
- 实现三级匹配策略（fast-exact → anchor → recall+rank）
- 生成运行包结构（manifest.json / results.csv / summary.md / log.jsonl）

**代码变更**:
- `normalize/pipeline.ts`: 文本归一化
- `extract/extractor.ts`: 字段提取
- `match/strategies.ts`: 匹配策略
- `bucket/bucketize.ts`: 分桶逻辑
- `report/generator.ts`: 报告生成

**测试结果**:
- ✅ 基础流程打通
- ✅ Baseline 自动通过率：3.6%
- ✅ 平均耗时：8.3s/文件

---

## 关键指标演进

| 版本 | 自动通过率 | 平均分数 | 平均耗时 | 配置版本 |
|------|-----------|---------|---------|---------|
| v0.1.0 | 3.6% | 0.6421 | 8.3s | v0.base |
| v0.1.1 | 3.6% | 0.6690 (+4.2%) | 8.3s | v0.postprocess |
| v0.1.2 | 3.6% | 0.6690 | 8.3s | v0.postprocess |
| v0.1.3 | 3.6% | 0.6751 (+0.9%) | 8.3s | v0.labs/958582ab |

**待突破**: 自动通过率仍需修复分桶逻辑设计缺陷才能提升。

---

## 技术债务

### Critical

1. **分桶逻辑设计缺陷** (`bucketize.ts:57-76`)
   - 影响：DELTA_TOO_SMALL 案例无法转为 exact
   - 修复方案：已明确（Option 1 或 Option 2）
   - 优先级：P0

### High

2. **缺少 results_top3.csv**
   - 影响：无法分析 Top3 候选分数分布
   - 修复方案：在 `report/generator.ts` 中添加 Top3 输出
   - 优先级：P1

3. **缺少 review.html 单页审查器**
   - 影响：无法快速人工审核
   - 修复方案：实现前端单页应用
   - 优先级：P1

---

**最后更新**: 2025-11-13 03:40
