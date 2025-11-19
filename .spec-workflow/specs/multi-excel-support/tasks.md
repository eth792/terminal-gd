# Tasks: Multi-Excel Support with Flexible Column Validation

**Spec ID**: `multi-excel-support`
**Version**: 1.0
**Created**: 2025-11-20
**Author**: Claude (Linus Ultrathink Mode)

---

## Task Breakdown

### Phase 1: Code Implementation

#### Task 1.1: 移除全列验证约束
**Status**: [ ] Pending
**Effort**: 0.5 points (5 min)
**Owner**: Claude

**Description**: 删除 `builder.ts:163-174` 的列名验证逻辑

**Files**:
- `packages/ocr-match-core/src/indexer/builder.ts`

**Changes**:
```typescript
// DELETE lines 163-174
// if (firstFileColumns === null) {
//   firstFileColumns = columns;
// } else {
//   if (columns.join(',') !== firstFileColumns.join(',')) {
//     throw new Error('Column mismatch...');
//   }
// }
```

**Success Criteria**:
- ✅ 代码通过 TypeScript 编译
- ✅ 不再抛出 "Column mismatch" 错误

---

#### Task 1.2: 强化字段解析验证
**Status**: [ ] Pending
**Effort**: 2 points (20 min)
**Owner**: Claude

**Description**: 在字段解析后立即验证必需字段，提供清晰错误信息

**Files**:
- `packages/ocr-match-core/src/indexer/builder.ts`

**Changes**:
```typescript
// AFTER resolveIndexedColumns() (line ~190)

// 验证 supplier 字段
if (resolvedIndices.supplierIdx === -1) {
  throw new Error(
    `Cannot resolve 'supplier' field in ${path.basename(dbFile)}\n` +
    `  Tried aliases: ${dbColumnNames.supplier?.join(', ') || field1Column}\n` +
    `  Available columns (first 10): ${columns.slice(0, 10).join(', ')}...\n` +
    `  Total columns: ${columns.length}`
  );
}

// 验证 project 字段
if (resolvedIndices.projectIdx === -1) {
  throw new Error(
    `Cannot resolve 'project' field in ${path.basename(dbFile)}\n` +
    `  Tried aliases: ${dbColumnNames.project?.join(', ') || field2Column}\n` +
    `  Available columns (first 10): ${columns.slice(0, 10).join(', ')}...\n` +
    `  Total columns: ${columns.length}`
  );
}

// order 字段可选，不验证
```

**Success Criteria**:
- ✅ 缺失 supplier 字段时抛出清晰错误
- ✅ 缺失 project 字段时抛出清晰错误
- ✅ 缺失 order 字段时不报错（记录 N/A）

---

#### Task 1.3: 增强日志信息
**Status**: [ ] Pending
**Effort**: 0.5 points (5 min)
**Owner**: Claude

**Description**: 记录每个文件的列数，方便调试

**Files**:
- `packages/ocr-match-core/src/indexer/builder.ts`

**Changes**:
```typescript
// AFTER parseDbFile() (line ~160)
logger.info(
  'indexer.parse',
  `File "${path.basename(dbFile)}" has ${columns.length} columns`
);
```

**Success Criteria**:
- ✅ 日志显示每个文件的列数

---

#### Task 1.4: 重新编译
**Status**: [ ] Pending
**Effort**: 0.5 points (2 min)
**Owner**: Claude

**Description**: 编译 TypeScript 代码

**Commands**:
```bash
cd /Users/caron/Developer/milk/terminal-gd
pnpm -F ./packages/ocr-match-core build
```

**Success Criteria**:
- ✅ 编译无错误
- ✅ `dist/indexer/builder.js` 已更新

---

### Phase 2: Index Rebuild

#### Task 2.1: 重建完整索引（ledger-1 + ledger-2）
**Status**: [ ] Pending
**Effort**: 1 point (5 min)
**Owner**: Claude

**Description**: 使用新配置 v0.1.9 重建索引

**Commands**:
```bash
node packages/ocr-match-core/dist/cli/build-index.js \
  --db ./data/db \
  --out ./data/index/index_p0_v3.json \
  --config . \
  --log-level info
```

**Expected Output**:
```
[INFO] Found 2 DB file(s):
[INFO]   [1] ledger-1.xlsx
[INFO]   [2] ledger-2.xlsx
[INFO] Parsing ledger-1.xlsx...
[INFO] File "ledger-1.xlsx" has 38 columns
[INFO] Using first visible sheet: "9.25后汇总" (index 2)
[INFO] Resolved columns: supplier=21, project=8, order=33
[INFO] Parsed 14451 rows from ledger-1.xlsx
[INFO] Parsing ledger-2.xlsx...
[INFO] File "ledger-2.xlsx" has 51 columns
[INFO] Using first visible sheet: "综合查询20250118" (index 0)
[INFO] Resolved columns: supplier=21, project=8, order=33
[INFO] Parsed ~163000 rows from ledger-2.xlsx
[INFO] Index built successfully:
        Files: 2 (ledger-1.xlsx, ledger-2.xlsx)
        Total rows: 177,451
        Unique suppliers: 520+
        Inverted index entries: 14000+
```

**Success Criteria**:
- ✅ 索引构建成功
- ✅ 总行数 = 177,451
- ✅ 包含两个文件的数据

---

### Phase 3: Testing

#### Task 3.1: 运行完整测试（222 样本）
**Status**: [ ] Pending
**Effort**: 2 points (5 min runtime)
**Owner**: Claude

**Description**: 使用新索引运行完整测试

**Commands**:
```bash
pnpm test:full
```

**Expected KPI**:
| Metric | Baseline (v0.1.8) | Target (v0.1.9) | Status |
|--------|------------------|----------------|--------|
| **Exact** | 71 (32.0%) | **≥90** (≥40.5%) | [ ] |
| **Review** | 17 (7.7%) | ≤30 | [ ] |
| **Fail** | 134 (60.4%) | **≤110** (≤49.5%) | [ ] |
| **Auto-pass rate** | 32.0% | **≥40.5%** | [ ] |

**Success Criteria**:
- ✅ Exact ≥ 90 (+19 vs baseline)
- ✅ Auto-pass rate ≥ 40.5% (+8.5%)
- ✅ Fail ≤ 110 (-24)

**Rollback Threshold**:
- ❌ Exact < 71 → 立即回滚

---

#### Task 3.2: 验证关键案例
**Status**: [ ] Pending
**Effort**: 1 point (10 min)
**Owner**: Claude

**Description**: 验证之前失败的关键案例是否修复

**Test Cases**:
1. `baoshengkejichuangxingufenyouxiangongsi4100931841.txt`
   - Baseline: F1=1.0, F2=0.374 (FIELD_SIM_LOW_PROJECT)
   - Expected: Exact match (找到 ledger-1 row 2386)

2. `jiangsuzhongtiankejigufenyouxiangongsi4100961781.txt`
   - Baseline: F1=1.0, F2=0.470 (FIELD_SIM_LOW_PROJECT)
   - Expected: Exact match or improved F2

3. Check Top 10 failures from case study
   - Expected: 至少 3-5 个案例转为 Exact

**Success Criteria**:
- ✅ Case 1 匹配成功
- ✅ Case 2 改善
- ✅ Top 10 至少 30-50% 改善率

---

### Phase 4: Documentation

#### Task 4.1: 提交 Git 变更
**Status**: [ ] Pending
**Effort**: 0.5 points (3 min)
**Owner**: Claude

**Description**: 提交配置和代码变更

**Commands**:
```bash
git add configs/v0.1.9/
git add configs/latest.json
git add packages/ocr-match-core/src/indexer/builder.ts
git add .spec-workflow/specs/multi-excel-support/

git commit -m "$(cat <<'EOF'
feat(indexer): support multi-Excel with flexible column validation

**Problem**: builder.ts required all Excel files to have identical column
structure (names, order, count), but only 3 fields are actually used.

**Solution**: Remove column validation constraint, only validate that
required fields (supplier, project) can be resolved.

**Changes**:
- Remove full-column validation (builder.ts:163-174)
- Add field resolution validation with clear error messages
- Support merging ledger-1 (38 cols) + ledger-2 (51 cols)

**Config**:
- Created v0.1.9 config (configs/v0.1.9/c358299a/)
- Fixed label_alias.json: supplier → "供应单位名称"

**Testing**:
- Index rows: 14,451 → 177,451 (+1,127%)
- Exact: 71 → [待填充] ([待填充]%)
- Auto-pass: 32.0% → [待填充]%

**Architecture**: Linus Ultrathink - "Good code has no special cases.
Column structure differences are normal, not exceptional."

Task: multi-excel-support

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Success Criteria**:
- ✅ Commit 包含所有文件变更
- ✅ Commit message 清晰描述问题和解决方案

---

#### Task 4.2: 更新 implementation_record.md
**Status**: [ ] Pending
**Effort**: 1 point (10 min)
**Owner**: Claude

**Description**: 添加 v0.1.9 版本条目

**File**: `docs/implementation_record.md`

**Content**:
```markdown
### v0.1.9 - Multi-Excel Support (2025-11-20)

**实施内容**:
- 移除全列验证约束（builder.ts）
- 支持合并不同列结构的 Excel 文件
- 修复 label_alias.json: supplier → "供应单位名称"
- 创建 v0.1.9 配置 (configs/v0.1.9/c358299a/)

**版本定位**: 架构修复 - 从过度约束到灵活验证

**实际效果**: Exact **[待填充]**, Auto-pass **[待填充]%**

#### 测试结果

| 版本 | Exact | Review | Fail | 自动通过率 | 运行 ID |
|------|-------|--------|------|------------|---------|
| v0.1.8 | 71 (32%) | 17 (7.7%) | 134 (60.4%) | 32% | `run_20251118_13_46` |
| **v0.1.9** | **[待填充]** | **[待填充]** | **[待填充]** | **[待填充]%** | `run_[待填充]` |

**改善效果**:
- ✅ DB 行数: 14,451 → **177,451** (+1,127%)
- ✅ Exact: +[待填充] (+[待填充]%)
- ✅ 支持多源 Excel 合并

#### 代码变更

**文件**: `packages/ocr-match-core/src/indexer/builder.ts`

**变更**:
1. 移除全列验证 (lines 163-174)
2. 强化字段解析验证 (lines 178-210)
3. 增强日志信息

#### 技术洞察

**Linus Ultrathink 架构分析**:

1. **数据结构问题** → 验证 100% 列但只用 7.9%
2. **特殊情况识别** → 列结构差异是正常情况，不是错误
3. **复杂度审查** → O(N*M) string comparison → O(1) integer check
4. **破坏性分析** → 不破坏向后兼容，修复被阻止的场景
5. **实用性验证** → 用户实际有 2 个不同结构的 Excel 需要合并

**关键教训**:
- ✅ "Good taste is seeing the problem from another angle"
- ✅ 不要为正常差异添加特殊处理
- ✅ 验证需要的东西，而不是存在的东西

**文档**: 详见 `.spec-workflow/specs/multi-excel-support/`
```

**Success Criteria**:
- ✅ 版本条目完整
- ✅ 包含 Linus Ultrathink 分析
- ✅ 待填充项在测试后更新

---

#### Task 4.3: 记录 Implementation Log
**Status**: [ ] Pending
**Effort**: 2 points (15 min)
**Owner**: Claude

**Description**: 使用 MCP tool 记录实施细节

**Tool**: `mcp__spec-workflow__log-implementation`

**Data**:
```json
{
  "specName": "multi-excel-support",
  "taskId": "1.1-1.4",
  "summary": "Removed column validation constraint and enhanced field resolution validation in builder.ts",
  "filesModified": [
    "packages/ocr-match-core/src/indexer/builder.ts"
  ],
  "filesCreated": [
    "configs/v0.1.9/c358299a/label_alias.json",
    "configs/v0.1.9/c358299a/bucketize.json",
    "configs/v0.1.9/c358299a/domain.json",
    "configs/v0.1.9/c358299a/normalize.user.json",
    "configs/latest.json"
  ],
  "statistics": {
    "linesAdded": 35,
    "linesRemoved": 12
  },
  "artifacts": {
    "functions": [
      {
        "name": "buildIndex (modified validation logic)",
        "purpose": "Removed full-column validation, added field resolution validation",
        "location": "packages/ocr-match-core/src/indexer/builder.ts:163-210",
        "signature": "async function buildIndex(...): Promise<Index>",
        "isExported": true
      }
    ],
    "integrations": [
      {
        "description": "Multi-file Excel merging now supported by validating only required fields",
        "frontendComponent": "build-index CLI",
        "backendEndpoint": "buildIndex()",
        "dataFlow": "Parse each file → Resolve fields independently → Validate required fields → Merge rows → Build inverted index"
      }
    ]
  }
}
```

**Success Criteria**:
- ✅ Implementation log 记录完整
- ✅ 包含 artifacts（functions, integrations）

---

## Task Dependency Graph

```
Phase 1: Code Implementation
├── 1.1 移除全列验证 (5 min)
├── 1.2 强化字段解析验证 (20 min)
├── 1.3 增强日志信息 (5 min)
└── 1.4 重新编译 (2 min)
     │
     ▼
Phase 2: Index Rebuild
└── 2.1 重建完整索引 (5 min)
     │
     ▼
Phase 3: Testing
├── 3.1 运行完整测试 (5 min)
└── 3.2 验证关键案例 (10 min)
     │
     ▼ (如果 Exact ≥ 90)
Phase 4: Documentation
├── 4.1 提交 Git 变更 (3 min)
├── 4.2 更新 implementation_record.md (10 min)
└── 4.3 记录 Implementation Log (15 min)

Total: ~1.5 hours
```

---

## Rollback Criteria

如果任何阶段失败，立即回滚：

### Rollback Trigger 1: 编译失败（Task 1.4）
```bash
git checkout packages/ocr-match-core/src/indexer/builder.ts
pnpm -F ./packages/ocr-match-core build
```

### Rollback Trigger 2: 索引构建失败（Task 2.1）
```bash
git checkout packages/ocr-match-core/src/indexer/builder.ts
pnpm -F ./packages/ocr-match-core build

# 重建旧索引（只用 ledger-1）
node packages/ocr-match-core/dist/cli/build-index.js \
  --db ./data/db/ledger-1.xlsx \
  --out ./data/index/index_p0_v3.json \
  --config . \
  --log-level info
```

### Rollback Trigger 3: KPI 回归（Task 3.1）
**Condition**: Exact < 71

```bash
# 完整回滚
git checkout packages/ocr-match-core/src/indexer/builder.ts
git checkout configs/latest.json
git clean -fd configs/v0.1.9/

pnpm -F ./packages/ocr-match-core build

# 重建旧索引
node packages/ocr-match-core/dist/cli/build-index.js \
  --db ./data/db/ledger-1.xlsx \
  --out ./data/index/index_p0_v3.json \
  --config . \
  --log-level info

# 验证回滚
pnpm test:full
# 应该恢复到 Exact=71
```

---

## Task Status Tracking

**开始时间**: [待填充]
**完成时间**: [待填充]
**总耗时**: [待填充]

**当前进度**: 0/13 tasks (0%)

---

**作者**: Claude (Linus Ultrathink Mode)
**方法论**: 单次变更原则 + 失败立即停止 + 完整回滚路径
**预期结果**: Exact 71 → 90+ (+27%), DB rows 14k → 177k (+1,127%)
