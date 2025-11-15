# v0.1.7 实施计划 - 提取逻辑修复（P0 级）

**创建日期**: 2025-11-13 21:45
**计划版本**: v1.0 (替换字段语义化计划)
**状态**: 🔥 待启动（v0.1.6 完整测试后立即开始）
**负责人**: Claude Code (Linus Mode)

---

## 📊 版本概览

### 版本定位

v0.1.7 = **提取逻辑 Bug 修复** - 救回 50% 失败案例

**核心目标**：
- 修复标签匹配无优先级问题（Bug #1）
- 修复向上查找过于激进问题（Bug #2）
- 将 21/22 失败的目标测试案例救回至少 15-18 个

**业务价值**：
- ✅ 高ROI：预期 +5-7% 自动通过率（31.5% → 37-39%）
- ✅ 技术债消除：解决提取器核心缺陷
- ✅ 可测量：目标测试样本可直接验证效果

---

## 🎯 KPI 目标

| 指标 | v0.1.6 基线 | v0.1.7 目标 | 说明 |
|------|-------------|-------------|------|
| **自动通过率** | 31.5% | **37-39%** | +5-7% (高ROI修复) |
| **目标测试通过** | 0/22 (0%) | **15-18/22 (68-82%)** | 目标测试验证 |
| **Exact数量** | 70 / 222 | **82-88 / 222** | +12-18 cases |

---

## 🐛 Bug 诊断

### Bug #1: 标签匹配无优先级（核心问题）

**文件**: `packages/ocr-match-core/src/extract/extractor.ts:68-154`

**问题描述**：
- 提取器遍历所有标签，找到多个匹配时，**后面的标签会覆盖前面的正确值**
- 案例：`label_alias.supplier = ["供应商", "供应单位名称", "供应商联系人", ...]`
  - 第4行找到"供应商" → 正确提取"长江电气集团股份有限公司"
  - 第8行找到"供应商联系人" → 提取"/电话："（值太短）
  - 触发向上查找 → 第7行"工程" → **错误覆盖正确值**

**影响范围**：
- 21/22 目标测试样本失败（95.5%）
- 预计 50% 的完整测试失败案例受影响

---

### Bug #2: 向上查找过于激进

**文件**: `packages/ocr-match-core/src/extract/extractor.ts:88-120`

**问题描述**：
- 向上查找触发条件太宽松：`value.length < 5`
- 没有验证上一行内容是否合理（如单个词"工程"不应是供应商）

**代码片段**：
```typescript
const needLookupPrev =
  (prevIndent >= 60) ||       // ✅ 合理（表格错位）
  (value.length < 5) ||       // ⚠️ 过于激进
  (...);                      // ✅ 有实体词验证
```

**影响范围**：
- 与 Bug #1 联合作用，导致大量错误提取
- 单独影响 ~10-15% 的失败案例

---

## 🗺️ 任务拆解

### Phase 1: Bug #1 修复（标签优先级）（1 hr）

#### Task 1.1: 按标签长度降序排序（Linus 风格 - 最优方案）

**文件**: `packages/ocr-match-core/src/extract/extractor.ts`

**修改位置**: `extractField` 函数开头（第 68 行）

**修改前**：
```typescript
function extractField(lines: string[], linesRaw: string[], labels: string[], noiseWords: string[]): string {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 查找标签
    for (const label of labels) {
      const labelIndex = line.indexOf(label);
      if (labelIndex === -1) continue;
      // ...
    }
  }
}
```

**修改后**：
```typescript
function extractField(lines: string[], linesRaw: string[], labels: string[], noiseWords: string[]): string {
  // Linus 原则: "Good taste" - 用数据结构消除特殊情况
  // 长标签（如"供应商联系人"）更具体，应优先匹配，避免被短标签（如"供应商"）误匹配
  const sortedLabels = [...labels].sort((a, b) => b.length - a.length);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 查找标签（按长度降序）
    for (const label of sortedLabels) {
      const labelIndex = line.indexOf(label);
      if (labelIndex === -1) continue;
      // ...

      if (value) {
        return value;  // ✅ 找到第一个有效值，立即返回
      }
    }
  }

  return '';
}
```

**设计原则**：
> "Bad programmers worry about the code. Good programmers worry about data structures."
> —— Linus Torvalds

- 通过排序数据，消除"标签优先级"的特殊情况
- 代码逻辑保持不变，只改变遍历顺序

**测试验证**：
- 案例：`changjiangdianqi4100904488.txt`
- 预期：`q_supplier` 从 "工程" 修复为 "长江电气集团股份有限公司"

---

### Phase 2: Bug #2 修复（向上查找验证）（1 hr）

#### Task 2.1: 增强向上查找的实体词验证

**文件**: `packages/ocr-match-core/src/extract/extractor.ts:88-120`

**修改位置**: 向上查找逻辑（第 116 行）

**修改前**：
```typescript
if (prevLine && !hasOtherLabel && (hasEntity || isDeepIndentValue)) {
  // 拼接找到的行 + 当前行的值
  value = prevLine + (value ? ' ' + value : '');
}
```

**修改后**：
```typescript
// Linus 原则: "Never break userspace" - 保持现有正确案例的行为
// 增强验证，拒绝单个词且无实体词的情况
const isSingleWordWithoutEntity = prevLine.split(/\s+/).length === 1 && !/公司|有限|集团/.test(prevLine);

if (prevLine && !hasOtherLabel && (hasEntity || isDeepIndentValue) && !isSingleWordWithoutEntity) {
  // 拼接找到的行 + 当前行的值
  value = prevLine + (value ? ' ' + value : '');
}
```

**设计原则**：
> "Never break userspace" - 向后兼容是铁律

- 只拒绝明显错误的情况（单个词"工程"）
- 保持现有正确案例的向上查找逻辑不变

**测试验证**：
- 案例：`changjiangdianqi4100904488.txt`
- 预期：即使"供应商联系人"触发向上查找，也不会采纳"工程"

---

### Phase 3: 单元测试（30 min）

#### Task 3.1: 创建单元测试

**文件**: `packages/ocr-match-core/src/extract/extractor.test.ts` (新建)

**测试用例**：
```typescript
describe('extractField - Label Priority', () => {
  it('should prioritize longer labels over shorter ones', () => {
    const lines = [
      '供应商：长江电气集团股份有限公司',
      '供应商联系人/电话：',
      '陈旭15858871756',
    ];
    const labels = ['供应商', '供应商联系人'];
    const result = extractField(lines, lines, labels, []);

    expect(result).toBe('长江电气集团股份有限公司');
  });
});

describe('extractField - Lookup Validation', () => {
  it('should reject single-word lookup without entity markers', () => {
    const lines = [
      '工程',
      '供应商联系人/电话：',
    ];
    const linesRaw = lines;
    const labels = ['供应商联系人'];
    const result = extractField(lines, linesRaw, labels, []);

    expect(result).not.toBe('工程');
  });
});
```

---

### Phase 4: 集成测试（目标测试）（30 min）

#### Task 4.1: 运行目标测试（22 样本）

**测试数据**: `runs/tmp/targeted_test_v0.1.6/` (22 个失败案例)

**运行命令**：
```bash
pnpm -F ./packages/ocr-match-core match-ocr \
  --ocr ../../runs/tmp/targeted_test_v0.1.6 \
  --index ../../runs/tmp/index_p0_v3.json \
  --config ../.. \
  --out "../../runs/targeted_v0.1.7_test" \
  --autoPass 0.70 --minFieldSim 0.60 --minDeltaTop 0.03
```

**验证标准**：
- ✅ **15-18/22 通过** (68-82% 成功率)
- ✅ Fail 案例中 FIELD_SIM_LOW_SUPPLIER 大幅减少（21 → 3-6）

---

### Phase 5: 完整回归测试（222 样本）（~35 min）

#### Task 5.1: 运行完整测试

**运行命令**：
```bash
pnpm -F ./packages/ocr-match-core match-ocr \
  --ocr ../../data/ocr_txt \
  --index ../../runs/tmp/index_p0_v3.json \
  --config ../.. \
  --out "../../runs/run_v0.1.7_fix_$(date +%Y%m%d_%H%M%S)" \
  --autoPass 0.70 --minFieldSim 0.60 --minDeltaTop 0.03
```

**验证标准**：
- ✅ Exact: 70 → **82-88** (+12-18, +17-26%)
- ✅ 自动通过率: 31.5% → **37-39%** (+5-7%)
- ✅ 无功能回归（Review/Fail 总数减少）

---

### Phase 6: 文档更新（30 min）

#### 必须更新的文档

- [ ] `analysis/v0.1.7/v0.1.7_实测报告.md` - 完整测试报告
- [ ] `docs/implementation_record.md` - 新增 v0.1.7 条目（顶部）
- [ ] `docs/PROJECT_STATUS.md` - 更新核心指标和路线图
- [ ] `CLAUDE.md` - 更新快速恢复章节（v0.1.7 信息）

---

## 📅 实施时间线

**前置条件**: v0.1.6 完整测试完成，确认基线 KPI

### 第 1 天（v0.1.6 测试完成当天）

**上午**（2 hrs）:
- [ ] Phase 1: Bug #1 修复（标签优先级，1 hr）
- [ ] Phase 2: Bug #2 修复（向上查找验证，1 hr）

**下午**（1.5 hrs）:
- [ ] Phase 3: 单元测试（30 min）
- [ ] Phase 4: 目标测试（22 样本，30 min）
- [ ] Phase 5: 完整回归测试（35 min，可后台运行）

### 第 2 天

**上午**（1 hr）:
- [ ] 分析完整测试结果，确认 KPI 达成
- [ ] Phase 6: 文档更新（30 min）

**下午**（30 min）:
- [ ] 创建 Git commit（遵循规范）
- [ ] 更新 CLAUDE.md 顶部章节
- [ ] 发布 v0.1.7

**预计总工作量**: 5 小时（分 2 天完成）

---

## ⚠️ 风险管理

### 高风险项

#### 1. 功能回归（标签排序副作用）
- **风险**: 长标签优先可能破坏某些边界案例
- **缓解**:
  - 完整回归测试（222 样本），对比 v0.1.6
  - 单元测试覆盖已知正确案例
- **验证标准**: Review/Fail 总数不增加

#### 2. 向上查找逻辑变更影响表格错位案例
- **风险**: 增强验证可能拒绝某些正确的向上查找
- **缓解**:
  - 只拒绝单个词且无实体词的情况
  - 保持深度缩进（≥60）的向上查找不变
- **验证标准**: v0.1.6 中的 Exact 案例在 v0.1.7 中仍为 Exact

---

## 🎯 成功标准

### 必须达成（P0）

- ✅ 目标测试：15-18/22 通过（68-82%）
- ✅ 完整测试：Exact +12-18 案例（+17-26%）
- ✅ 自动通过率：31.5% → 37-39%（+5-7%）
- ✅ 无功能回归：v0.1.6 的 70 个 Exact 案例在 v0.1.7 中仍为 Exact

### 期望达成（P1）

- ✅ 单元测试全部通过
- ✅ FIELD_SIM_LOW_SUPPLIER 失败原因大幅减少（67 → <50）

---

## 📝 交付物清单

### 代码变更

- [ ] `packages/ocr-match-core/src/extract/extractor.ts` - 修复 Bug #1 和 Bug #2
- [ ] `packages/ocr-match-core/src/extract/extractor.test.ts` - 新增单元测试（可选）

### 测试产物

- [ ] `runs/targeted_v0.1.7_test/` - 目标测试运行包（22 样本）
- [ ] `runs/run_v0.1.7_fix_<timestamp>/` - 完整运行包（222 样本）

### 文档更新

- [ ] `analysis/v0.1.7/v0.1.7_实测报告.md` - 完整测试报告
- [ ] `analysis/v0.1.7/plan.md` - 本文件
- [ ] `docs/implementation_record.md` - 新增 v0.1.7 条目
- [ ] `docs/PROJECT_STATUS.md` - 更新核心指标和路线图
- [ ] `CLAUDE.md` - 更新快速恢复章节

---

## 🔄 后续版本规划

### v0.1.8 (计划中)

**重点**（按优先级）：
1. **字段语义化重构**（之前 v0.1.7 的计划，现推迟）
   - 输出列名从 `s_field1/s_field2` 改为 "供应商"/"工程名称"
   - 配置驱动的字段映射
   - 预期工作量：6 小时
2. **地名/术语归一化增强**
   - 补充常见 OCR 错误（"武汉市"→"武汉巿"）
   - 数字归一化（"一期"→"1期"）
3. **DB 缺失记录处理**
   - 识别"订货通知单" vs "验收单"
   - 提供友好的 NO_CANDIDATES 原因

**预期时间**: 2-3 天

---

## 💡 设计哲学（Linus 风格）

> **"Bad programmers worry about the code. Good programmers worry about data structures and their relationships."**
>
> Bug #1 的修复不是增加 if/else 判断，而是改变数据遍历顺序（标签排序）。这是"好品味"的体现。

---

> **"Never break userspace."**
>
> Bug #2 的修复只拒绝明显错误的情况（单个词"工程"），保持现有正确案例的行为不变。向后兼容是铁律。

---

> **"I'm a huge proponent of having good taste."**
>
> 提取器的核心问题不是代码复杂度，而是逻辑设计缺陷。修复后，代码更简洁，逻辑更清晰。

---

**最后更新**: 2025-11-13 21:45
**状态**: 🔥 待启动（v0.1.6 完整测试完成后立即开始）
**预计开始时间**: v0.1.6 完整测试分析后当天
