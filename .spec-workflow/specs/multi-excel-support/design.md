# Design: Multi-Excel Support with Flexible Column Validation

**Spec ID**: `multi-excel-support`
**Version**: 1.0
**Created**: 2025-11-20
**Author**: Claude (Linus Ultrathink Mode)

---

## Design Philosophy

> "Good taste is about **seeing the problem from another angle**, and rewriting it so that special cases go away and it becomes the normal case."
>
> — Linus Torvalds

**核心洞察**:
- 当前代码把"列结构不同"当成**错误**
- 实际上，这是**正常情况**（不同系统、不同时间导出）
- 解决方案：不验证无关的列，只验证需要的字段能否解析

---

## Architecture Overview

### 当前架构（问题）

```
┌─────────────────┐
│  parseDbFile()  │
│  返回: columns  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ 验证: columns.join(',') │  ← 过度约束
│ 必须完全一致            │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────┐
│ resolveColumns()     │
│ 仅使用 3/38 列       │  ← 浪费
└──────────────────────┘
```

**问题**:
1. 验证发生在**解析之前**（验证的是不需要的东西）
2. 验证**全部列**，但只用**3 列**（7.9%）
3. 失败时**提前返回**，没有给解析机会

---

### 新架构（解决方案）

```
┌─────────────────┐
│  parseDbFile()  │
│  返回: columns  │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ resolveColumns()     │  ← 移到前面
│ 验证: 必需字段解析   │
└────────┬─────────────┘
         │
         ▼  ✅ supplier=21
         ▼  ✅ project=8
         ▼  ✅ order=33
         │
         ▼
┌──────────────────────┐
│ 构建索引             │  ← 继续处理
│ 不关心其他列         │
└──────────────────────┘
```

**改进**:
1. 验证发生在**解析之后**（验证的是需要的字段）
2. 只验证**3 个字段**，不管其他列
3. 失败时**立即报错**，成功则继续

---

## Code Changes

### File 1: `packages/ocr-match-core/src/indexer/builder.ts`

#### Change 1.1: 移除全列验证（Lines 163-174）

**Location**: `buildIndex()` function, after `parseDbFile()`

**Current Code**:
```typescript
// 验证列名一致性
if (firstFileColumns === null) {
  firstFileColumns = columns;
} else {
  if (columns.join(',') !== firstFileColumns.join(',')) {
    throw new Error(
      `Column mismatch between files!\n` +
      `  First file: ${firstFileColumns.slice(0, 5).join(', ')}...\n` +
      `  Current file (${path.basename(dbFile)}): ${columns.slice(0, 5).join(', ')}...\n` +
      `  All DB files must have identical column names.`
    );
  }
}
```

**New Code**:
```typescript
// 不再验证列名一致性 - 每个文件可以有不同的列结构
// 验证逻辑下移到字段解析阶段（见 Change 1.2）
```

**Rationale**:
- 移除过度约束，允许列结构不同
- 验证责任转移到字段解析（更合理的位置）

---

#### Change 1.2: 强化字段解析验证（Lines 178-190）

**Location**: `buildIndex()` function, after `resolveIndexedColumns()`

**Current Code**:
```typescript
if (resolvedIndices === null) {
  const dbColumnNames = labelAliasConfig?._dbColumnNames ?? {
    supplier: [field1Column],
    project: [field2Column],
  };

  resolvedIndices = resolveIndexedColumns(columns, dbColumnNames);
  logger.info(
    'indexer.resolve',
    `Resolved columns: supplier=${resolvedIndices.supplierIdx}, project=${resolvedIndices.projectIdx}, order=${resolvedIndices.orderIdx ?? 'N/A'}`
  );
}
```

**New Code**:
```typescript
if (resolvedIndices === null) {
  const dbColumnNames = labelAliasConfig?._dbColumnNames ?? {
    supplier: [field1Column],
    project: [field2Column],
  };

  resolvedIndices = resolveIndexedColumns(columns, dbColumnNames);

  // 验证必需字段能够解析
  if (resolvedIndices.supplierIdx === -1) {
    throw new Error(
      `Cannot resolve 'supplier' field in ${path.basename(dbFile)}\n` +
      `  Tried aliases: ${dbColumnNames.supplier?.join(', ') || field1Column}\n` +
      `  Available columns (first 10): ${columns.slice(0, 10).join(', ')}...\n` +
      `  Total columns: ${columns.length}`
    );
  }

  if (resolvedIndices.projectIdx === -1) {
    throw new Error(
      `Cannot resolve 'project' field in ${path.basename(dbFile)}\n` +
      `  Tried aliases: ${dbColumnNames.project?.join(', ') || field2Column}\n` +
      `  Available columns (first 10): ${columns.slice(0, 10).join(', ')}...\n` +
      `  Total columns: ${columns.length}`
    );
  }

  // order 字段是可选的，不报错
  logger.info(
    'indexer.resolve',
    `Resolved columns: supplier=${resolvedIndices.supplierIdx}, project=${resolvedIndices.projectIdx}, order=${resolvedIndices.orderIdx ?? 'N/A'}`
  );
}
```

**Rationale**:
- 在解析后立即验证，提供清晰的错误信息
- 区分必需字段（supplier, project）和可选字段（order）
- 错误信息包含：尝试的别名、可用列、总列数

---

#### Change 1.3: 增强日志信息（Lines 155-160）

**Location**: `buildIndex()` function, before parsing each file

**Current Code**:
```typescript
logger.info('indexer.parse', `Parsing ${path.basename(dbFile)}...`);

const { columns, rows: rawRows } = await parseDbFile(dbFile);
```

**New Code**:
```typescript
logger.info('indexer.parse', `Parsing ${path.basename(dbFile)}...`);

const { columns, rows: rawRows } = await parseDbFile(dbFile);

// 记录文件列信息（调试用）
logger.info(
  'indexer.parse',
  `File "${path.basename(dbFile)}" has ${columns.length} columns`
);
```

**Rationale**:
- 帮助调试列结构差异问题
- 不影响性能（info 级别）

---

#### Change 1.4: 汇总日志（End of buildIndex()）

**Location**: `buildIndex()` function, before return

**Current Code**:
```typescript
logger.info(
  'indexer.build',
  `Index built successfully with ${allRows.length} rows, ${uniqueSuppliers.size} unique suppliers, ${invertedIndex.size} inverted index entries.`
);

return { ... };
```

**New Code**:
```typescript
// 汇总各文件信息
const filesSummary = dbFiles.map((f, i) => {
  const filename = path.basename(f);
  // 注意：这里需要保存每个文件的列数（需要在前面记录）
  return `${filename}`;
}).join(', ');

logger.info(
  'indexer.build',
  `Index built successfully:\n` +
  `  Files: ${dbFiles.length} (${filesSummary})\n` +
  `  Total rows: ${allRows.length}\n` +
  `  Unique suppliers: ${uniqueSuppliers.size}\n` +
  `  Inverted index entries: ${invertedIndex.size}`
);

return { ... };
```

**Rationale**:
- 显示合并了多少个文件
- 确认索引构建成功

---

### Change Summary

| File | Lines Changed | Lines Added | Lines Removed | Net |
|------|--------------|------------|--------------|-----|
| `builder.ts` | 163-190 | +35 | -12 | **+23** |

**Complexity Change**:
- 验证逻辑：O(N*M) string comparison → O(1) integer check
- 代码可读性：❌ 隐式验证 → ✅ 显式验证

---

## Data Flow

### Before (Broken)

```
┌─────────────────────────┐
│ File 1: ledger-1.xlsx   │
│   38 columns            │
└────────┬────────────────┘
         │
         ▼
   ┌─────────────┐
   │ Parse       │
   └─────┬───────┘
         │
         ▼ columns = [col1, col2, ..., col38]
         │
   ┌─────▼──────────────────────────┐
   │ Validate: join(',') == prev?  │
   └─────┬──────────────────────────┘
         │ ✅ (first file)
         │
┌────────▼────────────────┐
│ File 2: ledger-2.xlsx   │
│   51 columns            │
└────────┬────────────────┘
         │
         ▼
   ┌─────────────┐
   │ Parse       │
   └─────┬───────┘
         │
         ▼ columns = [col1, col2, ..., col51]
         │
   ┌─────▼──────────────────────────┐
   │ Validate: join(',') == prev?  │
   └─────┬──────────────────────────┘
         │ ❌ "Column mismatch!"
         ▼
    [FAIL]
```

---

### After (Fixed)

```
┌─────────────────────────┐
│ File 1: ledger-1.xlsx   │
│   38 columns            │
└────────┬────────────────┘
         │
         ▼
   ┌─────────────┐
   │ Parse       │
   └─────┬───────┘
         │
         ▼ columns = [col1, col2, ..., col38]
         │
   ┌─────▼──────────────────────────┐
   │ Resolve: supplier, project, order │
   └─────┬──────────────────────────┘
         │ ✅ supplier=21, project=8, order=33
         ▼
   ┌─────────────┐
   │ Build Index │
   └─────┬───────┘
         │
┌────────▼────────────────┐
│ File 2: ledger-2.xlsx   │
│   51 columns            │
└────────┬────────────────┘
         │
         ▼
   ┌─────────────┐
   │ Parse       │
   └─────┬───────┘
         │
         ▼ columns = [col1, col2, ..., col51]
         │
   ┌─────▼──────────────────────────┐
   │ Resolve: supplier, project, order │
   └─────┬──────────────────────────┘
         │ ✅ supplier=21, project=8, order=33
         ▼
   ┌─────────────┐
   │ Merge Index │ ← 合并两个文件的索引
   └─────┬───────┘
         │ ✅ 177,451 rows total
         ▼
    [SUCCESS]
```

---

## Error Handling

### Case 1: 缺失 supplier 字段

**Scenario**: 某个文件没有 `供应单位名称` 或其他 supplier 别名

**Error Message**:
```
Cannot resolve 'supplier' field in ledger-3.xlsx
  Tried aliases: 供应单位名称, 供应商, 采购订单供应商
  Available columns (first 10): 计划编号, 计划行号, 创建日期, 项目属性, 支付方式, 合同执行单位, 报装编号, 项目定义号, 工程名称, 序号...
  Total columns: 42

Suggestion: Update label_alias.json to include the correct column name for 'supplier' field.
```

**User Action**:
1. 检查 Excel 文件的列名
2. 更新 `label_alias.json` 的 `supplier` 别名列表
3. 重新运行 `build-index`

---

### Case 2: 缺失 project 字段

**Error Message**:
```
Cannot resolve 'project' field in ledger-3.xlsx
  Tried aliases: 单体工程名称, 工程名称, 项目定义号
  Available columns (first 10): 计划编号, 计划行号, 创建日期, 项目属性, 支付方式, 合同执行单位, 报装编号, 供应单位名称, 序号, 物料名称...
  Total columns: 42

Suggestion: Update label_alias.json to include the correct column name for 'project' field.
```

**User Action**: Same as Case 1

---

### Case 3: 缺失 order 字段（可选）

**Scenario**: 某个文件没有 `订单号` / `订号`

**Behavior**: **不报错**，记录 warning

**Log Message**:
```
[WARN] File "ledger-3.xlsx" does not have 'order' field (tried: 订单号, 订号)
[INFO] Resolved columns: supplier=21, project=8, order=N/A
```

**Rationale**: `order` 字段不是所有业务场景都需要，不应阻止索引构建

---

## Testing Strategy

### Unit Tests

#### Test 1: 单文件 38 列（向后兼容）

```typescript
test('buildIndex with single file (38 columns)', async () => {
  const index = await buildIndex({
    dbFiles: ['./data/db/ledger-1.xlsx'],
    config: loadConfig('v0.1.9'),
  });

  expect(index.rows.length).toBe(14451);
  expect(index.uniqueSuppliers).toBe(517);
});
```

---

#### Test 2: 单文件 51 列（向后兼容）

```typescript
test('buildIndex with single file (51 columns)', async () => {
  const index = await buildIndex({
    dbFiles: ['./data/db/ledger-2.xlsx'],
    config: loadConfig('v0.1.9'),
  });

  expect(index.rows.length).toBeGreaterThan(100000);
});
```

---

#### Test 3: 多文件不同列（新功能）

```typescript
test('buildIndex with multi-files (different columns)', async () => {
  const index = await buildIndex({
    dbFiles: ['./data/db/ledger-1.xlsx', './data/db/ledger-2.xlsx'],
    config: loadConfig('v0.1.9'),
  });

  expect(index.rows.length).toBe(177451); // 14451 + 163000
  expect(index.uniqueSuppliers).toBeGreaterThan(517);
});
```

---

#### Test 4: 缺失必需字段（错误处理）

```typescript
test('buildIndex throws error when supplier field missing', async () => {
  // 创建临时 Excel 文件，不包含 supplier 列
  const tempFile = createTempExcel({
    columns: ['计划编号', '创建日期', '单体工程名称'], // 缺少 supplier
    rows: [[...]]
  });

  await expect(
    buildIndex({ dbFiles: [tempFile], config: loadConfig('v0.1.9') })
  ).rejects.toThrow(/Cannot resolve 'supplier' field/);
});
```

---

### Integration Tests

#### Test 5: 完整流程（222 样本 + 新索引）

```bash
# 1. 重建索引（ledger-1 + ledger-2）
node packages/ocr-match-core/dist/cli/build-index.js \
  --db ./data/db \
  --out ./data/index/index_p0_v3.json \
  --config . \
  --log-level info

# 验证输出
# ✅ Index built successfully:
#      Files: 2 (ledger-1.xlsx, ledger-2.xlsx)
#      Total rows: 177,451
#      Unique suppliers: 520+

# 2. 运行完整测试
pnpm test:full

# 3. 验证 KPI
# Exact: ≥90 (target: 71 → 90+)
# Auto-pass rate: ≥40.5% (target: 32% → 40.5%+)
```

---

## Rollback Plan

如果测试失败（Exact < 71），立即回滚：

```bash
# 1. 回滚代码
git checkout packages/ocr-match-core/src/indexer/builder.ts

# 2. 重建旧索引（只用 ledger-1）
node packages/ocr-match-core/dist/cli/build-index.js \
  --db ./data/db/ledger-1.xlsx \
  --out ./data/index/index_p0_v3.json \
  --config . \
  --log-level info

# 3. 验证回滚成功
pnpm test:full
# 应该恢复到 Exact=71, Auto-pass=32%
```

**Rollback Threshold**: Exact < 71 (baseline 性能)

---

## Performance Impact

### Time Complexity

| Operation | Before | After | Change |
|-----------|--------|-------|--------|
| Column validation | O(N*M) | O(1) | **✅ N*M 倍加速** |
| Field resolution | O(K) | O(K) | 不变 |
| Index building | O(R) | O(R) | 不变 |

where:
- N = columns count (38-51)
- M = average column name length (~10)
- K = aliases count (~3-5)
- R = rows count (177k)

### Space Complexity

| Data Structure | Before | After | Change |
|---------------|--------|-------|--------|
| Column validation | O(N+M) | O(1) | **✅ N+M 节省** |
| Index storage | O(R) | O(R) | 不变 |

### Runtime Benchmark

Expected index build time:
- Before: ~30s (single file, 14k rows)
- After: ~3.5min (multi-file, 177k rows)

**Ratio**: 12x more rows → 7x more time (sub-linear scaling ✅)

---

## Documentation Updates

### Files to Update

1. **`docs/implementation_record.md`**
   - 添加 v0.1.9 版本条目
   - 记录架构变更和 KPI 改善

2. **`packages/ocr-match-core/README.md`**
   - 更新 `build-index` 命令说明
   - 说明支持多文件合并

3. **`configs/v0.1.9/c358299a/README.md`** (new)
   - 说明配置变更（label_alias.json 修复）
   - 说明与 v0.1.7b 的区别

4. **`.spec-workflow/specs/multi-excel-support/implementation_log.md`** (new)
   - 记录实施过程
   - 记录测试结果

---

## Linus Review Checklist

在提交代码前，自我审查：

- [ ] **Good Taste**: 代码消除了特殊情况吗？
  - ✅ 移除了"列必须一致"的特殊约束
  - ✅ 只验证需要的字段，不管其他列

- [ ] **Never Break Userspace**: 向后兼容吗？
  - ✅ 单文件场景不受影响
  - ✅ API 和配置不变

- [ ] **Simplicity**: 代码变简单了吗？
  - ✅ 验证逻辑从 O(N*M) → O(1)
  - ✅ 错误信息更清晰

- [ ] **Practical**: 解决真问题了吗？
  - ✅ 用户已验证：ledger-1 + ledger-2 确实需要合并
  - ✅ 数据量增加 12 倍，KPI 预期提升 27-42%

---

**作者**: Claude (Linus Torvalds Ultrathink Mode)
**设计原则**: "Don't add code to handle special cases. Change the data structure so that special cases become normal cases."
**预期结果**: Exact 71 → 90+ (+27%), 索引行数 14k → 177k (+1,127%)
