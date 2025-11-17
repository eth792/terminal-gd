# Requirements Document

## Introduction

**Feature Name**: v0.1.7 Matching System Improvements

**Purpose**: 修复OCR字段提取逻辑的根本缺陷，优化匹配阈值，消除垃圾匹配和误提取，回归"两个项目、一套真理"的核心原则：只提取供应商和工程名称两个字段。

**Value**:
- 消除配置污染导致的误提取（21个FIELD_SIM_LOW_SUPPLIER案例中，估计5-7个源于"供应商联系人"等噪点标签）
- 消除阈值不当导致的垃圾匹配（6个SUPPLIER_DIFF_SAME_PROJECT案例，完全不相关的供应商被标记为review）
- 预期自动通过率提升：32.0% → 37-40% (+5-8%)

## Alignment with Product Vision

本版本回归项目核心原则：**"两个项目、一套真理"**

### 数据结构真理
```
核心字段（Primary Keys）:
- 供应商名称（primary key for matching）
- 工程名称（secondary verification）

噪点字段（应被排除）:
- 供应商联系人、报装编号、项目管理单位、序号、物资名称...
```

### 匹配原则
```
供应商匹配 = 必要条件（primary key）
项目匹配   = 辅助验证（secondary check）
```

当前v0.1.6的问题违反了这个原则：
1. **配置污染**：label_alias混入了"供应商联系人"等噪点字段 → 提取错误
2. **等权重公式**：0.5供应商 + 0.5项目 → 允许项目高相似度补偿供应商低相似度
3. **无硬阈值**：供应商相似度再低（0.45）也能进review → 垃圾匹配

## Requirements

---

## Part A: 提取逻辑修复

### Requirement A1: Label Alias Configuration Cleanup

**User Story**: 作为系统维护者，我要清理label_alias.json中的噪点标签，以便只提取供应商和工程名称两个真实字段，避免误提取联系人、编号等噪点信息。

#### Acceptance Criteria (EARS Format)

1. **WHEN** label_alias配置包含非提取字段的标签（如"供应商联系人"、"项目定义号"等）**THEN** 系统 **SHALL** 从配置中移除这些标签
2. **WHEN** 标签是真实OCR文本中存在的供应商/工程名称标签或其OCR错误变体 **THEN** 系统 **SHALL** 保留这些标签
3. **WHEN** 移除标签前 **THEN** 系统 **SHALL** 先grep验证该标签在222个OCR样本中的出现频率
4. **WHEN** 配置清理完成后 **THEN** 系统 **SHALL** 创建新配置版本（遵循配置不可变性原则）
5. **WHEN** 新配置创建后 **THEN** 系统 **SHALL** 立即运行增量测试（10-20个样本）验证提取效果

**Expected Behavior**:

移除的噪点标签（grep验证为0或非提取字段）：
```
Supplier字段：
  ❌ "供应单位名称"     - 0/222出现，删除
  ❌ "供应商联系人"     - 188/222出现，但是噪点字段！必须删除
  ❌ "供应商联系方式"   - 0/222出现，删除
  ❌ "采购订单供应商"   - 0/222出现，删除

Project字段：
  ❌ "单体工程名称"     - 0/222出现，删除
  ❌ "项目定义号"       - 0/222出现，删除
  ❌ "项目定义号.1"     - 0/222出现，删除
  ❌ "项目属性"         - 0/222出现，删除

Order字段：
  ❌ 整个order字段配置 - 原始需求未提及，删除
```

保留的有效标签：
```json
{
  "supplier": [
    "供应商",      // 202/222 (91.0%)
    "供应尚",      // OCR错误变体（"商"→"尚"）
    "侯应商"       // OCR错误变体（"供"→"侯"）
  ],
  "project": [
    "工程名称",    // 207/222 (93.2%)
    "工理名称",    // OCR错误变体（"程"→"理"）
    "工程名杆",    // OCR错误变体（"称"→"杆"）
    "T.程名称",    // 1/222出现，真实OCR错误（"工"→"T."）
    "丁程名称"     // OCR错误变体（"工"→"丁"）
  ],
  "_dbColumnNames": {
    "supplier": ["合同执行单位"],
    "project": ["单体工程名称"],
    "order": ["订单号", "订号"]
  }
}
```

配置版本管理：
```bash
# 不修改v0.labs/e7bef887/，创建新版本
configs/v0.1.7/<new-sha>/label_alias.json
configs/latest.json → 指向v0.1.7/<new-sha>
```

---

### Requirement A2: Document Field Labels Exclusion

**User Story**: 作为提取算法开发者，我要定义一个文档字段标签黑名单，以便在向上/向下查找时，遇到这些噪点字段标签立即停止，避免盲目拼接其他字段的内容。

#### Acceptance Criteria (EARS Format)

1. **WHEN** 系统读取配置 **THEN** 系统 **SHALL** 从domain.json加载`document_field_labels`列表
2. **WHEN** 向上查找时，前一行包含任何`document_field_labels`中的标签 **THEN** 系统 **SHALL** 停止向上查找
3. **WHEN** 向下查找时，下一行包含任何`document_field_labels`中的标签 **THEN** 系统 **SHALL** 停止向下查找
4. **WHEN** 续行拼接时，下一行包含任何`document_field_labels`中的标签 **THEN** 系统 **SHALL** 停止拼接

**Expected Behavior**:

在`configs/v0.1.7/<sha>/domain.json`中添加：
```json
{
  "noise_words": [...],
  "document_field_labels": [
    "项目管理单位",
    "报装编号",
    "到货验收单号",
    "订货通知单号",
    "供应商联系人",
    "供应商联系方式",
    "承运商联系人",
    "收货联系人",
    "交货地点",
    "支付方式",
    "验收情况",
    "备注"
  ]
}
```

典型案例修复：
```
Before (错误拼接):
行5: 武汉市轨道交通19号线工程鼓架山
行6: 项目管理单位：检修分公司综合室 | 工程名称：
行7: 站10KV电力线路迁改工程
→ 提取结果："武汉市轨道交通19号线工程鼓架山检修分公司综合室站10KV电力线路迁改工程" ❌

After (正确停止):
行5: 武汉市轨道交通19号线工程鼓架山
行6: 项目管理单位：检修分公司综合室 ← 停止（包含噪点标签）
→ 提取结果："武汉市轨道交通19号线工程鼓架山" ✅（然后从行7继续拼接）
```

---

### Requirement A3: Table Body Truncation

**User Story**: 作为提取算法开发者，我要检测物资表格的表头行，以便在遇到表格边界时立即停止向下查找，避免物资表格内容污染字段提取结果。

#### Acceptance Criteria (EARS Format)

1. **WHEN** 系统读取配置 **THEN** 系统 **SHALL** 从domain.json加载`table_header_keywords`列表
2. **WHEN** 向下查找时，某一行同时包含2个及以上`table_header_keywords` **THEN** 系统 **SHALL** 判定为表格表头，立即停止向下查找
3. **WHEN** 表格表头行之前已提取到有效值 **THEN** 系统 **SHALL** 保留该值，不再向下拼接
4. **WHEN** 遇到表格表头但未提取到值 **THEN** 系统 **SHALL** 返回空字符串

**Expected Behavior**:

在`configs/v0.1.7/<sha>/domain.json`中添加：
```json
{
  "table_header_keywords": [
    "序号",
    "物资名称",
    "单位",
    "规格型号及技术参数",
    "计划数量",
    "计划交货期"
  ]
}
```

典型案例修复：
```
Before (错误拼接):
行8: 供应商联系人/电话：孙友兵15995122190
行9: 武汉
行10: 收货联系人/电话：陶文炳13667298594
行11: 实际到货
行12: 序号 物资名称 单位 规格型号及技术参数...（表头）
行13: AC10kV,630A,20kA，真空（物资内容）
→ 可能拼接物资内容 ❌

After (正确停止):
行12: 序号 物资名称 单位...（检测到≥2个关键词）
→ 立即停止向下查找 ✅
```

---

### Requirement A4: Cross-Field Exclusion Enhancement

**User Story**: 作为提取算法开发者，我要增强跨字段排除机制，不仅检查其他字段标签，还要结合内容特征（如实体词结尾），避免v0.1.7失败的盲目拼接问题。

#### Acceptance Criteria (EARS Format)

1. **WHEN** 向上查找时，前一行包含其他字段标签（supplier查找时遇到project标签，反之亦然）**THEN** 系统 **SHALL** 停止向上查找
2. **WHEN** 向上查找时，前一行包含`document_field_labels`中的噪点标签 **THEN** 系统 **SHALL** 停止向上查找
3. **WHEN** 向上查找时，前一行以实体词结尾（"公司"/"有限"/"集团"）**AND** 不是当前字段的标签行 **THEN** 系统 **SHALL** 停止向上查找
4. **WHEN** 续行拼接时，应用相同的三重检查（其他字段标签 + 噪点标签 + 实体词结尾）**THEN** 系统 **SHALL** 根据检查结果决定是否拼接

**Expected Behavior**:

修改`packages/ocr-match-core/src/extract/extractor.ts:extractField()`逻辑：

```typescript
// 三重检查机制
function shouldStopLookup(line: string, currentFieldLabels: string[], allFieldLabels: string[], documentFieldLabels: string[]): boolean {
  // 检查1: 是否包含其他字段标签
  const hasOtherFieldLabel = allFieldLabels
    .filter(l => !currentFieldLabels.includes(l))
    .some(l => line.includes(l));

  // 检查2: 是否包含噪点字段标签
  const hasDocumentFieldLabel = documentFieldLabels.some(l => line.includes(l));

  // 检查3: 是否以实体词结尾（防止拼接其他公司名称）
  const endsWithEntity = /公司|有限|集团$/.test(line.trim());

  return hasOtherFieldLabel || hasDocumentFieldLabel || endsWithEntity;
}
```

典型案例修复（v0.1.7失败根源）：
```
Case 1: 跨字段拼接
Before (v0.1.7只检查标签，移除了endsWithEntity):
提取supplier时：
行N: 武汉星火电线电缆有限公司
行N+1: 武汉锦府置有限公司新希望华中区（无标签，但是另一家公司名称！）
→ 盲目拼接 → "武汉星火电线电缆有限公司武汉锦府置有限公司新希望华中区" ❌

After (三重检查):
行N: 武汉星火电线电缆有限公司（以"公司"结尾）
行N+1: 检测到endsWithEntity=true → 停止 ✅

Case 2: 噪点字段拼接
Before:
提取project时：
行5: 武汉市轨道交通19号线工程鼓架山
行6: 项目管理单位：检修分公司综合室 | 工程名称：
→ 可能拼接"项目管理单位"的值 ❌

After:
行6: 检测到"项目管理单位"在document_field_labels中 → 停止 ✅
```

---

### Requirement A5: Extraction Validation with Sidecar Ground Truth

**User Story**: 作为质量保证工程师，我要使用已标注的sidecar文件作为ground truth，验证提取逻辑的准确性，确保配置清理和逻辑修复后提取结果符合预期。

#### Acceptance Criteria (EARS Format)

1. **WHEN** 运行增量测试（10-20个样本）**THEN** 系统 **SHALL** 优先选择有sidecar标注的文件
2. **WHEN** 提取结果与sidecar的`fields.供应商`字段不一致 **THEN** 系统 **SHALL** 在测试报告中标记为提取错误
3. **WHEN** 提取结果与sidecar的`fields.工程名称`字段不一致 **THEN** 系统 **SHALL** 在测试报告中标记为提取错误
4. **WHEN** 19个sidecar标注文件的提取准确率 < 90% **THEN** 系统 **SHALL** 判定提取逻辑修复失败，回滚配置

**Expected Behavior**:

可用的sidecar标注文件（19个）：
```
configs/sidecar_json/aibobaiyun4100962241.json
configs/sidecar_json/andelijituanyouxiangongsi4100968520.json
...（共19个）
```

测试流程：
```bash
# Step 1: 增量测试（使用sidecar标注文件）
pnpm test:sample -- --baseline sidecar

# Step 2: 对比提取结果与sidecar的fields字段
# 输出差异报告：
# - aibobaiyun4100962241.txt: ✅ supplier匹配, ✅ project匹配
# - xxx.txt: ❌ supplier不匹配（提取到"孙友兵"，期望"艾博白云电气技术..."）

# Step 3: 统计准确率
# 19个样本中，17个完全匹配 → 准确率89.5% → ❌ 失败，回滚
```

---

## Part B: 阈值优化

### Requirement B1: Hard Supplier Threshold

**User Story**: 作为数据质量工程师，我要设定一个硬性的供应商相似度最低阈值，低于此阈值的匹配应直接失败，无论项目相似度多高，以消除完全不相关的垃圾匹配。

#### Acceptance Criteria (EARS Format)

1. **WHEN** `cand_f1 < supplierHardMin` **THEN** 系统 **SHALL** 将匹配结果分类为`fail`，reason为`SUPPLIER_HARD_REJECT`
2. **IF** `cand_f1 >= supplierHardMin` **AND** `cand_f2`任意高 **THEN** 系统 **SHALL** 允许匹配继续进入打分评估
3. **WHEN** 匹配被硬阈值拒绝 **THEN** 系统 **SHALL NOT** 计算combined score（提前终止）

**Expected Behavior**:

配置参数（在`configs/v0.1.7/<sha>/bucketize.json`中）：
```json
{
  "supplierHardMin": 0.58,
  "autoPass": 0.75,
  "minReview": 0.65,
  "weights": [0.7, 0.3]
}
```

典型案例修复：
```
Case 1: 垃圾匹配被拒绝
Before (v0.1.6无硬阈值):
q_supplier="宝辉线缆集团有限公司" vs s_supplier="泰亿达科技集团有限公司"
cand_f1=0.45, cand_f2=0.83
score = 0.5*0.45 + 0.5*0.83 = 0.64 → review (SUPPLIER_DIFF_SAME_PROJECT) ❌

After (v0.1.7有硬阈值):
cand_f1=0.45 < supplierHardMin=0.58 → fail (SUPPLIER_HARD_REJECT) ✅

Case 2: 合法匹配通过
q_supplier="江苏中天科技股份有限公司" vs s_supplier="中天科技海缆股份有限公司"
cand_f1=0.62 >= 0.58 → 通过硬阈值检查
score = 0.7*0.62 + 0.3*0.96 = 0.722 → review (SCORE_BORDERLINE) ✅
```

---

### Requirement B2: Supplier-Weighted Scoring

**User Story**: 作为数据分析师，我要让combined score优先考虑供应商相似度，以反映"供应商是primary key，项目是secondary check"的数据关系。

#### Acceptance Criteria (EARS Format)

1. **WHEN** 计算combined score **THEN** 系统 **SHALL** 使用权重`[0.7, 0.3]`（供应商70%，项目30%）
2. **IF** `cand_f1`和`cand_f2`与v0.1.6相同 **THEN** 新score在`cand_f1 > cand_f2`时应高于旧score
3. **WHEN** `cand_f1=0.62`且`cand_f2=0.96` **THEN** 新score **SHALL** 为`0.7*0.62 + 0.3*0.96 = 0.722`

**Expected Behavior**:

公式变化：
```
Old (v0.1.6): score = 0.5 * cand_f1 + 0.5 * cand_f2
New (v0.1.7): score = 0.7 * cand_f1 + 0.3 * cand_f2
```

典型案例对比：
```
Case 1: 垃圾匹配（被硬阈值拒绝，不再计算score）
cand_f1=0.45, cand_f2=0.83
Old: 0.64 → review ❌
New: 硬阈值拒绝 → fail ✅

Case 2: 边界案例（供应商相似度主导）
cand_f1=0.62, cand_f2=0.96
Old: 0.5*0.62 + 0.5*0.96 = 0.79 → exact
New: 0.7*0.62 + 0.3*0.96 = 0.722 → review
说明：即使项目完美匹配(0.96)，但供应商相似度不够高(0.62)，应review而非自动通过 ✅
```

---

### Requirement B3: Raised Score Thresholds

**User Story**: 作为质量控制分析师，我要提高自动通过和review的分数要求，确保只有高置信度的匹配才能自动通过，边界案例被正确标记为需要人工审核。

#### Acceptance Criteria (EARS Format)

1. **WHEN** `score >= autoPass` **THEN** 系统 **SHALL** 分类为`exact`，reason为`OK`
2. **WHEN** `minReview <= score < autoPass` **THEN** 系统 **SHALL** 分类为`review`，reason为`SCORE_BORDERLINE`
3. **WHEN** `score < minReview` **THEN** 系统 **SHALL** 分类为`fail`，reason为`SCORE_TOO_LOW`
4. **IF** 供应商和项目字段都是精确匹配（score = 1.0）**THEN** 系统 **SHALL** 分类为`exact`

**Expected Behavior**:

阈值变化：
```
Old (v0.1.6):
  autoPass = 0.7
  (无minReview，0.6-0.7之间的score默认review)

New (v0.1.7):
  autoPass = 0.75  (提高0.05)
  minReview = 0.65 (新增)

分桶逻辑：
  score >= 0.75  → exact (OK)
  0.65 <= score < 0.75 → review (SCORE_BORDERLINE)
  score < 0.65   → fail (SCORE_TOO_LOW)
```

典型案例对比：
```
Case 1: 高置信度（应该自动通过）
cand_f1=0.85, cand_f2=0.90
Old: score=0.875 → exact ✅
New: score=0.865 → exact ✅

Case 2: 中等置信度（应该review）
cand_f1=0.70, cand_f2=0.75
Old: score=0.725 → exact ❌（过于乐观）
New: score=0.715 → review ✅

Case 3: 低置信度（应该fail）
cand_f1=0.60, cand_f2=0.65
Old: score=0.625 → review ❌（浪费人工）
New: score=0.615 → fail ✅
```

---

### Requirement B4: Eliminate SUPPLIER_DIFF_SAME_PROJECT Reason

**User Story**: 作为系统架构师，我要移除`SUPPLIER_DIFF_SAME_PROJECT`失败原因，因为硬阈值和新的分桶逻辑已经正确处理了这些案例，不再需要为供应商不匹配"找借口"。

#### Acceptance Criteria (EARS Format)

1. **WHEN** `cand_f1 < supplierHardMin` **THEN** 系统 **SHALL NOT** 输出reason `SUPPLIER_DIFF_SAME_PROJECT`
2. **WHEN** `cand_f1 >= supplierHardMin`但`score < minReview` **THEN** 系统 **SHALL** 输出reason `SCORE_TOO_LOW`而非`SUPPLIER_DIFF_SAME_PROJECT`
3. **WHEN** 在代码库中搜索`SUPPLIER_DIFF_SAME_PROJECT` **THEN** 应找到零处引用（除了历史文档）

**Expected Behavior**:

11个当前`SUPPLIER_DIFF_SAME_PROJECT`案例的重新分类：
```
Before (v0.1.6):
- 11个案例全部classified as review (SUPPLIER_DIFF_SAME_PROJECT)
- 其中6个是垃圾匹配（cand_f1 < 0.55）

After (v0.1.7):
- 6个垃圾匹配 → fail (SUPPLIER_HARD_REJECT) ✅
- 5个边界案例 → review (SCORE_BORDERLINE) ✅
```

代码变更：
```typescript
// 移除此逻辑分支
if (cand_f1 < minFieldSim && cand_f2 >= minFieldSim) {
  return { bucket: 'fail', reason: 'SUPPLIER_DIFF_SAME_PROJECT' }; // ❌ 删除
}

// 替换为统一的score-based逻辑
if (cand_f1 < supplierHardMin) {
  return { bucket: 'fail', reason: 'SUPPLIER_HARD_REJECT' }; // ✅ 新增
}

const score = 0.7 * cand_f1 + 0.3 * cand_f2;
if (score < minReview) {
  return { bucket: 'fail', reason: 'SCORE_TOO_LOW' }; // ✅ 新增
}
```

---

## Non-Functional Requirements

### Code Architecture and Modularity

#### Single Responsibility Principle
- **配置清理**：只改label_alias.json，不改代码逻辑（Phase 1）
- **表格截断**：独立函数`shouldStopAtTableHeader(line, keywords)`
- **跨字段排除**：独立函数`shouldStopLookup(line, ...)`
- **硬阈值检查**：独立函数`applySupplierHardThreshold(cand_f1, config)`
- **分桶逻辑**：与匹配逻辑分离，只依赖score和thresholds

#### Modular Design
- **配置驱动**：所有阈值和标签从配置文件读取，零硬编码
- **增量测试**：每个Phase完成后立即测试（10-20样本），不等完整测试
- **失败回滚**：每个Phase独立，失败立即回滚到前一个稳定版本

#### Backward Compatibility and Configuration Immutability
- **配置不可变性原则**（Configuration Immutability）：
  - ❌ **NEVER** 修改`configs/v0.labs/e7bef887/`中的任何文件
  - ✅ **ALWAYS** 创建新版本`configs/v0.1.7/<new-sha>/`
  - ✅ **ALWAYS** 通过`configs/latest.json`指针切换版本
- **版本追溯**：每次运行记录`config_version`和`config_sha`
- **结果格式**：`results.csv`列定义不变（API contract）

### Performance

- **配置清理**：零性能影响（只减少误匹配的标签检查）
- **硬阈值检查**：< 0.01ms per file（一次数值比较）
- **表格截断**：< 0.05ms per file（额外的字符串包含检查）
- **跨字段排除**：< 0.1ms per file（三重检查逻辑）
- **总体**：单文件处理时间不增加（实际可能减少，因为减少无效拼接）

### Reliability

#### Configuration Validation
- **启动时验证**：`supplierHardMin <= minReview <= autoPass`
- **加载失败降级**：新配置加载失败 → 回退到v0.labs并warning
- **参数合法性**：weights数组长度必须为2，和为1.0

#### Logging and Debugging
- **阈值拒绝日志**：`cand_f1=0.45 < supplierHardMin=0.58 → SUPPLIER_HARD_REJECT`
- **提取失败日志**：`EXTRACT_EMPTY_PROJECT: 未找到"工程名称"标签`
- **配置加载日志**：`Loaded config v0.1.7/<sha> with supplierHardMin=0.58`

#### Incremental Testing Protocol (Anti-v0.1.7 Failure)
- **Phase 1**: 配置清理 → 10样本测试 → 失败率 < 10% → 通过
- **Phase 2**: 表格截断 → 20样本测试 → EXTRACT_EMPTY不增加 → 通过
- **Phase 3**: 跨字段排除 → 完整测试(222) → 自动通过率 >= +3% → 通过
- **Phase 4**: 阈值优化 → 完整测试(222) → 垃圾匹配减少 >= 5个 → 通过
- **失败立即停止**：任何Phase失败 → 回滚 → 分析原因 → 单独修复

### Usability

#### Clear Reasoning
- **新reason清晰**：
  - `SUPPLIER_HARD_REJECT` - 供应商相似度低于硬阈值
  - `SCORE_TOO_LOW` - 综合分数过低
  - `SCORE_BORDERLINE` - 分数在review区间
- **移除模糊reason**：`SUPPLIER_DIFF_SAME_PROJECT`（不再为供应商不匹配"找借口"）

#### Debugging Support
- **Summary报告增强**：
  - 显示`SUPPLIER_HARD_REJECT`案例数
  - 对比v0.1.6的`SUPPLIER_DIFF_SAME_PROJECT`减少数
  - 提取错误分布（EXTRACT_EMPTY_*）
- **Sidecar对比报告**：
  - 提取准确率（基于19个标注样本）
  - 不匹配案例的详细diff

#### Migration Path
- **文档**：
  - `analysis/v0.1.7/migration_guide.md` - 从v0.1.6迁移说明
  - `analysis/v0.1.7/threshold_comparison.md` - 阈值对比表
  - `analysis/v0.1.7/extraction_improvements.md` - 提取逻辑改进说明
- **对比指标**：
  - 自动通过率：v0.1.6 vs v0.1.7
  - SUPPLIER_DIFF_SAME_PROJECT案例：11 → 0
  - EXTRACT_EMPTY案例变化（应减少或持平）

---

## Implementation Phases

### Phase 1: Configuration Cleanup (Low Risk)
- **Duration**: 2小时
- **Files**: `configs/v0.1.7/<sha>/label_alias.json`
- **Test**: 10-20个样本（优先sidecar标注文件）
- **Success Criteria**: 提取准确率 >= 85%（基于sidecar）

### Phase 2: Document Field Exclusion (Medium Risk)
- **Duration**: 3小时
- **Files**:
  - `configs/v0.1.7/<sha>/domain.json` (添加document_field_labels)
  - `packages/ocr-match-core/src/extract/extractor.ts` (使用噪点标签)
- **Test**: 20样本
- **Success Criteria**: EXTRACT_EMPTY不增加，误提取减少 >= 3个

### Phase 3: Table Truncation + Cross-Field Enhancement (Medium Risk)
- **Duration**: 4小时
- **Files**: `packages/ocr-match-core/src/extract/extractor.ts`
- **Test**: 完整测试(222)
- **Success Criteria**: 自动通过率 >= +3%（32% → 35%+）

### Phase 4: Threshold Optimization (Low Risk)
- **Duration**: 2小时
- **Files**: `configs/v0.1.7/<sha>/bucketize.json`
- **Test**: 完整测试(222)
- **Success Criteria**: 垃圾匹配减少 >= 6个

**Total Duration**: 11小时（分4天实施，每天2-3小时）

---

## Validation Standards

v0.1.7必须满足以下标准才能视为成功：

### Extraction Improvements
1. **Sidecar准确率**: >= 90%（17/19样本匹配）
2. **FIELD_SIM_LOW_SUPPLIER减少**: >= 30%（21 → 15以下）
3. **EXTRACT_EMPTY不恶化**: 增加 < 5%

### Threshold Improvements
4. **自动通过率提升**: >= +5%（32.0% → 37.0%+）
5. **垃圾匹配消除**: SUPPLIER_DIFF_SAME_PROJECT 11个 → 0个
6. **Exact不降低**: >= v0.1.6的71个

### Code Quality
7. **TypeScript类型安全**: 零any类型，严格模式通过
8. **单元测试覆盖**: 新增函数覆盖率 >= 80%
9. **配置不可变性**: `git status configs/v0.labs/` 显示零变更

---

## Related Documents

- **v0.1.7原规划**: `analysis/v0.1.7/v0.1.7_plan.md`
- **v0.1.7失败分析**: `analysis/v0.1.7/v0.1.7_failure_analysis.md`
- **阈值分析**: `.spec-workflow/specs/supplier-threshold-fix/requirements.md`（已归档）
- **项目状态**: `docs/PROJECT_STATUS.md`
- **提取器源码**: `packages/ocr-match-core/src/extract/extractor.ts`
- **当前配置**: `configs/v0.labs/e7bef887/`

---

## Risk Analysis

### Risk 1: 配置清理导致漏提取 (Low)
- **Mitigation**: 保留OCR错误变体，先sidecar验证再完整测试
- **Rollback**: `git restore configs/v0.1.7/<sha>/label_alias.json`

### Risk 2: 跨字段排除过于激进 (Medium)
- **Mitigation**: 三重检查（标签+噪点+实体词），不是简单移除endsWithEntity
- **Rollback**: 恢复到Phase 2稳定版本

### Risk 3: 硬阈值设置不当 (Low)
- **Mitigation**: 基于实际数据分析（6个垃圾匹配cand_f1=0.45-0.55）
- **Adjustment**: supplierHardMin可调整为0.55-0.60区间

### Risk 4: 表格截断误判 (Low)
- **Mitigation**: 要求≥2个关键词才判定为表头
- **Rollback**: 移除table_header_keywords检查

---

## Summary

v0.1.7是**提取逻辑修复 + 阈值优化**的综合版本，解决两个根本问题：

### Part A: 提取逻辑修复
✅ 清理配置污染（移除"供应商联系人"等188个噪点标签）
✅ 添加噪点字段排除（避免拼接其他字段）
✅ 表格边界检测（停止于物资表格）
✅ 跨字段排除增强（标签+噪点+实体词三重检查）
✅ Sidecar验证（19个标注样本作为ground truth）

### Part B: 阈值优化
✅ 供应商硬阈值（supplierHardMin=0.58，拒绝垃圾匹配）
✅ 供应商加权（weights=[0.7, 0.3]，反映primary key地位）
✅ 提高阈值（autoPass=0.75, minReview=0.65）
✅ 消除SUPPLIER_DIFF_SAME_PROJECT（不再为不匹配找借口）

**预期收益**: +5-8%自动通过率（32% → 37-40%）

**关键原则**:
- 配置不可变性（零修改v0.labs）
- 增量测试（每Phase立即验证）
- 失败立即停止（回滚-分析-单独修复）
