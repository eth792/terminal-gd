# Requirements: Multi-Excel Support with Flexible Column Validation

**Spec ID**: `multi-excel-support`
**Version**: 1.0
**Created**: 2025-11-20
**Author**: Claude (Linus Ultrathink Mode)

---

## Executive Summary

**Problem**: 当前 `builder.ts` 要求所有 DB Excel 文件的**全部列**必须完全一致（列名、顺序、数量），但实际只使用 3 个字段（supplier, project, order）。这导致用户无法合并结构不同的 Excel 文件。

**User Request**:
> "每个 excel 表可能都不一样，只需要根据配置的字段名去找匹配列"

**Current Blocker**:
```typescript
// builder.ts:167 - 过度约束
if (columns.join(',') !== firstFileColumns.join(',')) {
  throw new Error('Column mismatch...');
}
```

**Impact**:
- ❌ 无法合并 ledger-1.xlsx (38列) + ledger-2.xlsx (51列)
- ❌ 损失 ~163,000 行数据（只用了 14,451 行）
- ❌ KPI 受限（测试覆盖不全）

---

## 🧠 Linus Ultrathink Five-Layer Analysis

### 层 1: 数据结构问题 ❌

**当前设计缺陷**:

```typescript
// 全文件列验证（不必要的约束）
type DbFile = {
  columns: string[];  // 要求所有列一致
  rows: string[][];
};

// 实际只用到 3 个字段
const { supplierIdx, projectIdx, orderIdx } = resolveColumns(columns);
```

**问题根源**:
- 验证 100% 的列（columns.join(',')）
- 但只使用 **7.9%** 的列（3/38）
- 这是**过度约束**（Over-specification）

**正确的数据结构**:

```typescript
// 每个文件独立解析关键字段
type ParsedDbFile = {
  filePath: string;
  totalColumns: number;
  resolvedColumns: {
    supplier: number;
    project: number;
    order?: number;
  };
  rows: IndexRow[];
};

// 合并时只关心行数据
type MergedIndex = {
  files: ParsedDbFile[];
  totalRows: number;
  invertedIndex: Map<string, number[]>;
};
```

**Linus 判断**:
> "We're validating what we don't need, and not validating what we do need. This is backwards. The data structure should reflect **what matters**, not what exists."

---

### 层 2: 特殊情况识别 ✅

**当前代码的"特殊情况"**:

```typescript
// 不同列数 → 报错
if (columns.length !== firstFileColumns.length) throw Error;

// 不同列名 → 报错
if (columns[i] !== firstFileColumns[i]) throw Error;

// 不同顺序 → 报错
if (columns.join(',') !== firstFileColumns.join(',')) throw Error;
```

**这些都是正常情况！**

Excel 文件来自不同系统、不同时间、不同导出格式：
- ledger-1: 38列（旧系统）
- ledger-2: 51列（新系统，多了 13 列业务字段）
- 关键字段位置一致：supplier=21, project=8, order=33 ✅

**好的设计：消除特殊情况**

```typescript
// 只验证必需字段能解析
if (!resolvedIndices.supplierIdx) {
  throw new Error(`Cannot find 'supplier' field in ${file}`);
}
if (!resolvedIndices.projectIdx) {
  throw new Error(`Cannot find 'project' field in ${file}`);
}
// order 是可选的，不报错
```

**Linus 判断**:
> "Good code has no special cases. When you find yourself adding if/else for edge cases, you're treating **normal variance** as **exceptional**. Fix the data structure instead."

---

### 层 3: 复杂度审查 ❌

**当前验证逻辑的复杂度**:

```typescript
// O(N) 字符串连接
const col1 = firstFileColumns.join(','); // 38 列 → 长字符串
const col2 = columns.join(',');          // 51 列 → 更长字符串

// O(M) 字符串比较
if (col1 !== col2) throw Error; // 比较 200+ 字符
```

**正确的简单方案**:

```typescript
// O(1) 整数比较
if (resolvedIndices.supplierIdx === -1) throw Error; // 比较 1 个数字
if (resolvedIndices.projectIdx === -1) throw Error;  // 比较 1 个数字
```

**复杂度对比**:

| 操作 | 当前方案 | 正确方案 | 改善 |
|------|---------|---------|------|
| 时间复杂度 | O(N*M) | O(1) | **N*M 倍** |
| 空间复杂度 | O(N+M) | O(1) | **N+M 倍** |
| 代码行数 | 5 行 | 3 行 | **40% 减少** |

**Linus 判断**:
> "Simplicity is the ultimate sophistication. We're using O(N) string operations to validate something that should be O(1) integer checks. This is **algorithmic waste**."

---

### 层 4: 破坏性分析 ✅

**修改后的兼容性**:

| 场景 | 修改前 | 修改后 | 兼容性 |
|------|--------|--------|--------|
| 单文件（38列） | ✅ 通过 | ✅ 通过 | ✅ 不破坏 |
| 单文件（51列） | ✅ 通过 | ✅ 通过 | ✅ 不破坏 |
| 多文件（相同列） | ✅ 通过 | ✅ 通过 | ✅ 不破坏 |
| 多文件（不同列） | ❌ 报错 | ✅ 通过 | ✅ **修复** |

**API 兼容性**:
- ✅ 不改变 CLI 参数（`--db` 仍然接受目录或文件）
- ✅ 不改变输出格式（`index.json` 结构不变）
- ✅ 不改变配置文件（`label_alias.json` 不变）

**Linus 判断**:
> "Never break userspace. This change **fixes** a broken constraint, it doesn't break working code. Existing single-file users won't notice anything. Multi-file users will thank you."

---

### 层 5: 实用性验证 ✅

**这是真问题还是臆想？**

**真问题** - 用户实际场景：

```
data/db/
├── ledger-1.xlsx  (14,451 行, 38 列)
│   └── 列: 计划编号, ..., 供应单位名称(21), ..., 订号(33)
└── ledger-2.xlsx  (~163,000 行, 51 列)
    └── 列: 计划编号, ..., 供应单位名称(21), ..., 订单号(33), ...
```

**关键字段位置一致**:
- `supplier` = 索引 21 (`供应单位名称`)
- `project` = 索引 8 (`单体工程名称`)
- `order` = 索引 33 (`订号` / `订单号`)

**额外的 13 列**（ledger-2 独有）:
- 结算采购申请号/行号（迁改完善）
- 结算采购订单号/行号（常变量）
- WBS元素, 预留号, 入库单号, 出库单号, ...

**这些额外列不影响匹配算法**！

**实用方案验证**:
- ✅ 用户已手工验证：ledger-1 第 2386 行存在正确匹配
- ✅ Column mapping 已修复：`supplier` → `供应单位名称` (v0.1.9 配置)
- ✅ 只需移除列验证约束，即可合并两个文件

**预期收益**:
- 数据量：14,451 → **177,451 行** (+1,127%)
- 测试覆盖：ledger-1 only → **ledger-1 + ledger-2** (完整数据)
- KPI 预期：Exact 71 → **90+** (+19-30, +27-42%)

**Linus 判断**:
> "Theory and practice sometimes clash. Theory loses. Every single time. The theory says 'all columns must match'. Practice says 'we only need 3 columns'. Listen to practice."

---

## Requirements

### FR1: 移除全列验证约束

**Priority**: P0
**Effort**: 1 point (10 lines code change)

**Current Behavior**:
```typescript
// builder.ts:167
if (columns.join(',') !== firstFileColumns.join(',')) {
  throw new Error('Column mismatch between files!');
}
```

**Required Behavior**:
```typescript
// 移除此检查，允许列结构不同
// (验证逻辑下移到字段解析阶段)
```

---

### FR2: 强化字段解析验证

**Priority**: P0
**Effort**: 2 points (20 lines code change)

**Current Behavior**:
```typescript
// 解析成功 → 静默继续
// 解析失败 → 使用 fallback column (可能错误)
```

**Required Behavior**:
```typescript
// 解析失败 → 立即报错，指明缺失字段
if (resolvedIndices.supplierIdx === -1) {
  throw new Error(
    `Cannot resolve 'supplier' field in ${filename}\n` +
    `  Tried aliases: ${labelAliasConfig.supplier.join(', ')}\n` +
    `  Available columns: ${columns.slice(0, 10).join(', ')}...`
  );
}

// 同样验证 project
// order 是可选的（某些文件可能没有订单号）
```

---

### FR3: 增强错误信息

**Priority**: P1
**Effort**: 1 point (5 lines code change)

**Current Behavior**:
```
Column mismatch between files!
  First file: 计划编号, 计划行号, 创建日期, 项目属性, 支付方式...
  Current file (ledger-2.xlsx): 计划编号, 计划行号, 创建日期, 项目属性, 支付方式...
```
（显示前 5 列，无法看出差异）

**Required Behavior**:
```
File: ledger-1.xlsx
  Total columns: 38
  Resolved: supplier=21, project=8, order=33

File: ledger-2.xlsx
  Total columns: 51
  Resolved: supplier=21, project=8, order=33

✓ All files have required fields resolved
✓ Index built successfully with 177,451 rows
```

---

### FR4: 保持向后兼容

**Priority**: P0
**Effort**: 0 points (no code change, only test)

**Test Cases**:
1. 单文件 38 列 → 应该与之前行为一致
2. 单文件 51 列 → 应该与之前行为一致
3. 多文件相同列 → 应该与之前行为一致
4. 多文件不同列 → 新支持，应该成功合并

---

## Non-Requirements

### NR1: 不支持关键字段位置不同
如果两个文件的 `supplier` 在不同索引（如 21 vs 25），这**不是**本次支持的场景。

**理由**: 这会引入"列名重复"等复杂情况，超出当前需求。

### NR2: 不验证列语义一致性
例如，ledger-1 的 `订号` 和 ledger-2 的 `订单号` 是否真的是同一个字段，本次**不验证**。

**理由**: 这需要业务知识，应该由用户通过配置 `label_alias.json` 来保证。

---

## Success Criteria

### 功能验证

1. ✅ 支持合并 ledger-1 (38列) + ledger-2 (51列)
2. ✅ 索引构建成功，包含 **177,451 行**
3. ✅ 关键字段解析正确：`supplier=21, project=8, order=33`
4. ✅ 向后兼容：单文件场景不受影响

### KPI 验证

| 指标 | Baseline (v0.1.7b) | Target (v0.1.9) | 说明 |
|------|-------------------|----------------|------|
| **DB 行数** | 14,451 | **177,451** | +1,127% |
| **Exact** | 71 (32.0%) | **≥90** (≥40.5%) | +19-30 |
| **Fail** | 134 | **≤110** | 改善 18% |

### 代码质量

- ✅ 代码行数减少（移除不必要验证）
- ✅ 复杂度降低（O(N*M) → O(1)）
- ✅ 错误信息清晰（显示解析结果而非列名）

---

## Risks & Mitigation

### Risk 1: 关键字段解析失败
**Scenario**: 某个文件的列名与 `label_alias.json` 不匹配
**Impact**: 索引构建失败
**Mitigation**:
- 在解析失败时立即报错（FR2）
- 错误信息包含候选列名（FR3）
- 用户可以更新 `label_alias.json` 重试

### Risk 2: 列名重复
**Scenario**: 某个文件有两列都叫 `供应单位名称`
**Impact**: 解析到错误的列
**Mitigation**:
- 本次**不处理**（超出需求范围）
- 如果用户遇到，需要预处理 Excel（重命名重复列）

### Risk 3: order 字段缺失
**Scenario**: 某个文件没有 `订单号` / `订号` 列
**Impact**: `orderIdx = -1`
**Mitigation**:
- 将 `order` 字段标记为**可选**
- 解析失败不报错，记录 warning
- 索引中该字段留空

---

## Dependencies

- ✅ **v0.1.9 配置已创建** (`configs/v0.1.9/c358299a/`)
- ✅ **label_alias.json 已修复** (`supplier` → `供应单位名称`)
- ❌ **builder.ts 待修改**（本 spec 实施内容）

---

## Timeline

| Phase | Tasks | Effort | Owner |
|-------|-------|--------|-------|
| **Design** | Linus Ultrathink 架构设计 | 1h | Claude |
| **Implementation** | 修改 builder.ts 验证逻辑 | 0.5h | Claude |
| **Testing** | 完整测试 (222 样本) | 0.5h | Claude |
| **Documentation** | 更新 implementation_record.md | 0.2h | Claude |
| **Total** | - | **2.2h** | - |

---

**作者**: Claude (Linus Torvalds Ultrathink Mode)
**方法论**: Five-Layer Root Cause Analysis + Simplicity First
**核心原则**: "好代码没有特殊情况。当前代码把正常差异当成错误来处理。修复数据结构，特殊情况自然消失。"
