# v0.1.9 Failure Analysis

## Executive Summary

**Status**: ❌ FAILED - Catastrophic regression, must rollback

**Test Results**:
- Auto-pass rate: 32.0% → **11.3%** (-20.7%, **0.35x**)
- Exact: 71 → **25** (-46, -64.8%)
- FIELD_SIM_LOW_PROJECT: 67 → **148** (+81, +120.9%)
- New failures: EXTRACT_EMPTY_PROJECT (+18), EXTRACT_EMPTY_SUPPLIER (+9)

**Conclusion**: Solution A (field type differentiation) has fatal design flaw. Do NOT merge.

---

## Test Data

### KPI Comparison

| Metric | v0.1.8 Baseline | v0.1.9 Actual | Target | Status |
|--------|----------------|--------------|--------|--------|
| Auto-pass rate | 32.0% | **11.3%** | >= 32% | ❌ **-20.7%** |
| Exact | 71 | **25** | >= 71 | ❌ **-46 (-64.8%)** |
| Review | 17 | 4 | - | -13 |
| Fail | 134 | **193** | - | +59 |
| FIELD_SIM_LOW_PROJECT | 67 | **148** | < 60 | ❌ **+81 (+120.9%)** |
| EXTRACT_EMPTY_PROJECT | 0 | **18** | 0 | ❌ **+18 (NEW)** |
| EXTRACT_EMPTY_SUPPLIER | 0 | **9** | 0 | ❌ **+9 (NEW)** |
| EXTRACT_BOTH_EMPTY | 11 | 11 | - | No change |
| SUPPLIER_HARD_REJECT | 29 | 7 | - | -22 |
| DELTA_TOO_SMALL | 17 | 4 | - | -13 |

**Run ID**: `run_20251118_15_02`
**Duration**: 62.8 min (17.0s/file)

### Failure Reason Distribution

```
147 FIELD_SIM_LOW_PROJECT  (76.2% of failures, was 50.0%)
 18 EXTRACT_EMPTY_PROJECT  (NEW - 9.3% of failures)
 11 EXTRACT_BOTH_EMPTY     (unchanged)
  9 EXTRACT_EMPTY_SUPPLIER (NEW - 4.7% of failures)
  7 SUPPLIER_HARD_REJECT   (down from 29)
  4 DELTA_TOO_SMALL        (down from 17)
```

---

## Root Cause Analysis

### Design Assumption Failure

**Design Document Claim** (design.md:141-153):
> **Case 2: Project name on previous line (rare)**
> ```
> Line 4: [深度缩进]某工程项目名称
> Line 5: 工程名称：
> ```
> **Handling**: **Will fail** after fix (value = empty string)
> - Check test results for such cases
> - If regression found, add special handling

**Actual Reality**: NOT rare - **18 cases (8.1%)**

### Fatal Flaw in Solution A

**What Solution A Did**:
```typescript
// extractor.ts:101
if (fieldType === 'supplier' && needLookupPrev && i > 0) {
  // ... upward lookup logic
}
```

**Why It Failed**:
1. **One-size-fits-all gating**: Disabled ALL upward lookup for project fields
2. **Ignored legitimate use cases**: OCR layouts where label has empty value
3. **Broke bidirectional logic**: Upward lookup + continuation are complementary strategies

### Evidence: EXTRACT_EMPTY_PROJECT Cases

**Example**: `baoshengkejichuangxingufenyouxiangongsi4100964959.txt`

```
Line 4: 报装编号：2020041001供应商：宝胜科技创新股份有限公司
Line 5: 公被开境保技资的路分限情"
Line 6: 项目管理单位：客户服务中心市场及大客户服务室工程名称：
Line 7: 供应商联系人/电话：王扣斌18952589209承运商联系人/电话：
```

**v0.1.8 Extraction** (with upward lookup):
- `q2 = [something from Line 4/5]` (needs verification, but NOT empty)

**v0.1.9 Extraction** (upward lookup disabled):
- Line 6: `工程名称：` → `value = ""`
- No upward lookup allowed → **EXTRACT_EMPTY_PROJECT**
- Continuation logic (Line 7) has no valid content → still empty

**Pattern**: When OCR label has empty value, upward lookup is the ONLY way to extract content.

### Evidence: FIELD_SIM_LOW_PROJECT Increase

**Target Case** `baodingshiwuxingdianqi4100967040.txt` shows the **unintended consequence**:

**v0.1.8**:
- `q2 = "武汉市润达房地产开发有限公司"居住、社会福利项目"`
- f2_score: 0.55 (FIELD_SIM_LOW_PROJECT)

**v0.1.9**:
- `q2 = "住、社会福利项目"` ✅ Company name removed
- f2_score: **0.548** (still FIELD_SIM_LOW_PROJECT, worse!)
- **Reason**: Over-trimmed, missing full project name

**Pattern**: Disabling upward lookup doesn't just prevent wrong concatenation - it also prevents CORRECT continuation from previous lines.

### The Logical Loop Was NOT the Real Problem

**Design Document Diagnosis** (design.md:10-26):
> **Root Cause**: Upward lookup logic uses same entity word pattern for both trigger and confirmation
>
> **Logic Error**:
> 1. Strategy 3: `!/公司|有限|集团/.test(value)` → triggers lookup
> 2. Line 112: `/公司|有限|集团|.../.test(prevLine)` → confirms concatenation
> 3. Result: Company name from Line 4 incorrectly merged

**This diagnosis is INCOMPLETE**:
- Yes, there's a logical loop
- But the real issue is **context-insensitive pattern matching**
- The pattern `/公司|有限|集团/` appears in BOTH company names AND project names
- Disabling upward lookup throws out the baby with the bathwater

---

## Why Solution A Failed

### Incorrect Problem Decomposition

**Design Document's Three Questions** were answered wrong:

1. **"这是个真问题还是臆想出来的？"**
   - Answer: Real problem (1 case: baodingshiwuxingdianqi4100967040.txt)
   - **Mistake**: Didn't verify how many cases depend on upward lookup (turned out to be 18+)

2. **"有更简单的方法吗？"**
   - Answer: Field type differentiation (< 10 lines)
   - **Mistake**: "Simple" ≠ "Correct". Ignored bidirectional dependencies.

3. **"会破坏什么吗？"**
   - Answer: Design doc acknowledged risk (Case 2), but deemed it "rare"
   - **Mistake**: 18 cases (8.1%) is NOT rare. Should have validated with data.

### The Real Problem (Revised Understanding)

**Not a logical loop, but a classification problem**:
- Upward lookup is CORRECT for some cases (empty label value)
- Upward lookup is WRONG for other cases (company name contamination)
- The current logic cannot distinguish between the two

**Key Insight**:
```
"工程名称：武汉市润达房地产开发有限公司"居住..."
            └──────── Company name ────────┘
```

The entity words `/公司|有限|集团/` appear in **project field VALUE**, not just in supplier field. This makes them useless as discriminators.

---

## Lessons Learned

### 1. Data Validation > Intuition

**Mistake**: Assumed "rare case" without checking actual frequency
**Impact**: 18 cases (8.1%) is a critical failure mode, not an edge case

**Fix**: Always query `results.csv` to validate assumptions:
```bash
awk -F',' '$12=="EXTRACT_EMPTY_PROJECT" {print $1}' results.csv | wc -l
```

### 2. Bidirectional Logic Requires Holistic Analysis

**Mistake**: Focused on upward lookup in isolation, ignored continuation dependency
**Impact**: Disabling one direction broke the other

**Fix**: Map full data flow before modifying:
```
Label Found → Value Extraction → Upward Lookup (if empty/short)
                                → Continuation (if next line valid)
```

### 3. "Conservative Fix" Still Needs Full Testing

**Mistake**: Trusted "< 10 lines changed" as low risk indicator
**Impact**: Small change, catastrophic outcome

**Fix**:
- Sample test is NOT sufficient (target case not in sample)
- Full test is REQUIRED even for "conservative" changes

### 4. Pattern Matching Has Blind Spots

**Mistake**: Relied on regex `/公司|有限|集团/` to distinguish supplier vs project
**Impact**: These words appear in BOTH contexts (e.g., "...公司"某项目"")

**Fix**: Need context-aware logic:
- Check if entity word is BEFORE or AFTER label
- Check if line contains label keywords
- Validate semantic consistency

---

## Next Steps (v0.1.10 Design)

### Immediate Action

1. **Rollback Code**:
```bash
git checkout packages/ocr-match-core/src/extract/extractor.ts
pnpm -F ./packages/ocr-match-core build
```

2. **Preserve Learnings**:
- This failure analysis document
- Test run `run_20251118_15_02` for reference

### Recommended Approach for v0.1.10

**Option 1: Smarter Condition (Preferred)**

Instead of `fieldType` gating, use **contextual checks**:

```typescript
// Only lookup if previous line does NOT contain labels
const prevHasLabel = labels.some(l => prevLine.includes(l));

// Only lookup if previous line is NOT a company name (heuristic)
const prevIsCompanyName = /^[^工程项目]*公司[^工程项目]*$/.test(prevLine);

if (needLookupPrev && i > 0 && !prevHasLabel && !prevIsCompanyName) {
  // ... upward lookup
}
```

**Option 2: Separate Entity Word Lists**

```typescript
const supplierEntities = /公司|有限|集团|股份/;
const projectEntities = /工程|项目|线路|站|小区|改造|建设/;

// Trigger lookup only if value lacks PROJECT entities
const needLookupPrev = !/工程|项目/.test(value) && /工程|项目/.test(prevLine);
```

**Option 3: Post-Processing Cleanup (Safest)**

Don't modify extraction, add cleanup step:
```typescript
// After extraction, detect and remove company name prefix
if (q_project.startsWith(companyNamePattern)) {
  q_project = q_project.replace(companyNamePattern, '');
}
```

### Success Criteria for v0.1.10

1. ✅ Fix target case: `baodingshiwuxingdianqi4100967040.txt`
2. ✅ No EXTRACT_EMPTY_PROJECT regression (maintain 0)
3. ✅ FIELD_SIM_LOW_PROJECT < 60 (down from 67)
4. ✅ Auto-pass rate >= 32% (no regression)

---

## References

- **Design Document**: `.spec-workflow/specs/v0.1.9-extraction-fix/design.md`
- **Failed Run**: `runs/run_20251118_15_02/`
- **Test Log**: `/tmp/test_v019_full.log`
- **Baseline**: `runs/run_20251118_13_46/` (v0.1.8, 32% auto-pass)

---

**Date**: 2025-11-18
**Author**: Claude
**Status**: Documented for v0.1.10 redesign
