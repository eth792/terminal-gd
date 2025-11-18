# Design Document

## Feature Name
v0.1.9 Extraction Logic Fix - Field Type Differentiation

## Architecture Overview

### Current Problem

**Root Cause**: Upward lookup logic (extractor.ts:83-120) uses the same entity word pattern for both trigger condition and confirmation, causing logical loop.

**Failing Case**: baodingshiwuxingdianqi4100967040.txt
```
Line 4: [深度缩进]武汉市润达房地产开发有限公司"居
Line 5: 项目管理单位：[...] 工程名称：住、社会福利项目（光谷P

Current extraction: "武汉市润达房地产开发有限公司"居住、社会福利项目"
                     └────── Line 4 (WRONG) ──────┘ └─── Line 5 ───┘

Expected: "居住、社会福利项目（光谷P（2023）028地块）项目"
```

**Logic Error**:
1. Strategy 3 (line 91): `!/公司|有限|集团/.test(value)` → triggers lookup
2. Line 112: `/公司|有限|集团|.../.test(prevLine)` → confirms concatenation
3. Result: Company name from Line 4 incorrectly merged into project name

### Design Decision: Solution A (Conservative Fix)

**Principle**: "Never break userspace" - Minimize change scope, surgical fix only

**Core Idea**: Differentiate field types - supplier fields allow upward lookup, project fields do not

**Why Solution A?**
- ✅ Backward compatibility: Supplier field extraction unchanged
- ✅ Single responsibility: v0.1.9 fixes project extraction only
- ✅ Testability: Clear impact scope, easy to verify
- ✅ Incremental: v0.2.0 can further optimize if needed

**Alternative (Rejected): Solution B - Stricter Conditions**
```typescript
// Remove strategy 3 entirely
const needLookupPrev =
  (prevIndent >= 60) ||
  (value.length < 3);  // Changed from 5 to 3, removed strategy 3
```
- ❌ Might affect other cases depending on strategy 3
- ❌ Not minimal change

## Component Design

### 1. Function Signature Change

**File**: `packages/ocr-match-core/src/extract/extractor.ts`

**Before**:
```typescript
function extractField(
  lines: string[],
  linesRaw: string[],
  labels: string[],
  noiseWords: string[]
): string
```

**After**:
```typescript
function extractField(
  lines: string[],
  linesRaw: string[],
  labels: string[],
  noiseWords: string[],
  fieldType: 'supplier' | 'project'  // NEW PARAMETER
): string
```

### 2. Upward Lookup Gating

**Location**: extractor.ts:93 (if block entry)

**Before**:
```typescript
if (needLookupPrev && i > 0) {
  // ... upward lookup logic
}
```

**After**:
```typescript
// Only apply upward lookup for supplier fields
if (fieldType === 'supplier' && needLookupPrev && i > 0) {
  // ... upward lookup logic (unchanged)
}
```

**Rationale**:
- Project field values are typically on the same line as label or next line (continuation)
- Company names appearing above project label are NOT part of project name
- Upward lookup was designed for supplier field table misalignment, not project

### 3. Caller Updates

**Location**: extractor.ts:33, 39

**Before**:
```typescript
const supplier = extractField(lines, linesRaw, config.label_alias.supplier, config.domain.noise_words);
let project = extractField(lines, linesRaw, config.label_alias.project, config.domain.noise_words);
```

**After**:
```typescript
const supplier = extractField(lines, linesRaw, config.label_alias.supplier, config.domain.noise_words, 'supplier');
let project = extractField(lines, linesRaw, config.label_alias.project, config.domain.noise_words, 'project');
```

## Data Flow

```
OCR Text → extractField('supplier') → Upward Lookup ENABLED → Supplier Name
         → extractField('project')  → Upward Lookup DISABLED → Project Name
         → normalize() → Match → Bucketize
```

**Change Impact**:
- Supplier extraction: **No change**
- Project extraction: **No upward lookup** → More accurate

## Edge Cases

### Case 1: Project name split across lines (continuation)
```
Line 5: 工程名称：武汉市轨道交通19号线工程鼓架山站
Line 6: [深度缩进]10KV电力线路迁改工程
```

**Handling**: Downward continuation logic (lines 122-142) still works
- `nextLine.isDeepIndent && !hasOtherLabel` → concatenate Line 6
- Result: "武汉市轨道交通19号线工程鼓架山站 10KV电力线路迁改工程" ✅

### Case 2: Project name on previous line (rare)
```
Line 4: [深度缩进]某工程项目名称
Line 5: 工程名称：
```

**Handling**: **Will fail** after fix (value = empty string)
- Before: Upward lookup → "某工程项目名称" ✅
- After: No upward lookup → "" ❌

**Mitigation**:
- Check test results for such cases
- If regression found, add special handling: `if (value === '' && prevIndent >= 60)`

### Case 3: Mixed company + project on same line
```
Line 5: 工程名称：武汉公司某项目名称
```

**Handling**: Unchanged (no upward lookup triggered)
- Result: "武汉公司某项目名称" ✅

## Testing Strategy

### Regression Test Cases
1. **Baseline**: v0.1.8 `run_20251118_13_46` (71 exact, 67 FIELD_SIM_LOW_PROJECT)
2. **Target Case**: baodingshiwuxingdianqi4100967040.txt
   - Expected: q2 does NOT include "武汉市润达房地产开发有限公司"
   - Expected: q2 includes "居住、社会福利项目"
3. **Supplier Field**: Verify no regression in supplier extraction
4. **Continuation**: Verify multi-line project names still work

### Success Criteria
1. ✅ FIELD_SIM_LOW_PROJECT reduces from 67 to < 60 (10% improvement)
2. ✅ EXTRACT_EMPTY_PROJECT does NOT increase
3. ✅ EXTRACT_EMPTY_SUPPLIER remains 0
4. ✅ Auto-pass rate >= 32% (no regression)

### Test Commands
```bash
# Quick validation (sample test)
pnpm test:sample

# Full validation
pnpm test:full

# Compare against v0.1.8 baseline
npm run update-docs -- v0.1.9 "Field Type Differentiation" <run_id> v0.2.0
```

## Implementation Plan

### Phase 1: Code Modification (< 10 lines)
1. Add `fieldType` parameter to `extractField()` function signature
2. Add `fieldType === 'supplier'` condition to upward lookup gating (line 93)
3. Update two caller sites (lines 33, 39) with fieldType argument

### Phase 2: Testing
1. Build: `pnpm -F ./packages/ocr-match-core build`
2. Sample test: `pnpm test:sample` (~3min)
3. Review sample results for regressions
4. Full test: `pnpm test:full` (~40min)
5. Compare KPIs against v0.1.8

### Phase 3: Documentation
1. Update `docs/implementation_record.md` with v0.1.9 entry
2. Update `docs/PROJECT_STATUS.md` with new KPIs
3. Git commit following RELEASE_WORKFLOW.md

## Alternatives Considered

### Alternative 1: Remove Strategy 3 Entirely (Solution B)
**Rejected**: Too risky, might break other working cases

### Alternative 2: Better Entity Word Matching
```typescript
// Use different word lists for supplier vs project
const supplierEntities = /公司|有限|集团/;
const projectEntities = /工程|项目|线路|站|小区|改造/;
```
**Rejected**: More complex, violates "simplicity" principle

### Alternative 3: Machine Learning for Field Boundary Detection
**Rejected**: Over-engineering, not a real problem we're solving

## Risks and Mitigations

### Risk 1: Project names legitimately on previous line
**Probability**: Low (estimated < 5 cases in 222 files)
**Impact**: EXTRACT_EMPTY_PROJECT increases
**Mitigation**: Monitor test results, add special case if > 3 regressions

### Risk 2: Supplier extraction breaks
**Probability**: Very low (no code change in supplier path)
**Impact**: EXTRACT_EMPTY_SUPPLIER increases
**Mitigation**: Regression test confirms EXTRACT_EMPTY_SUPPLIER = 0

### Risk 3: No improvement in FIELD_SIM_LOW_PROJECT
**Probability**: Medium (if upward lookup wasn't the main issue)
**Impact**: v0.1.9 doesn't achieve goal
**Mitigation**: Analyze remaining failures, iterate in v0.1.10

## Rollback Plan

If v0.1.9 fails regression tests:
1. `git revert <commit-hash>`
2. Update `configs/latest.json` to point back to v0.1.8
3. Document failure in `analysis/v0.1.9/failure_analysis.md`
4. Re-analyze problem before attempting v0.1.10

## References

- Requirements: `.spec-workflow/specs/v0.1.9-extraction-fix/requirements.md`
- Current Code: `packages/ocr-match-core/src/extract/extractor.ts` (v0.1.6, 201 lines)
- Failing Test: `runs/run_20251118_13_46/` (v0.1.8 baseline)
- OCR Sample: `data/ocr_txt/baodingshiwuxingdianqi4100967040.txt`

---

**Last Updated**: 2025-11-18
**Status**: Design approved, ready for implementation
