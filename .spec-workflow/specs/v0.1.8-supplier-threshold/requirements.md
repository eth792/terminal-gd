# Requirements Document

## Introduction

**Feature Name**: v0.1.8 Supplier Matching Threshold Fix (Extracted from v0.1.7)

**Purpose**: Isolate and release the supplier-threshold optimization code (commit 852050be) WITHOUT the broken extraction logic refactor, fixing the fundamental design flaw in supplier-project matching algorithm.

**Value**:
- Eliminate 6+ false positive "review" cases where completely unrelated suppliers (e.g., "宝辉线缆" → "泰亿达科技", similarity 0.45) are classified as "review"
- Introduce SUPPLIER_HARD_REJECT mechanism to prevent garbage matches
- Implement supplier-weighted scoring [0.7, 0.3] to prioritize supplier identity

**Context**: This is a **code extraction** from the failed v0.1.7 release. Commit 852050be contains working supplier-threshold code that was incorrectly bundled with broken extraction logic (commit f30c784c). This spec salvages the good parts.

## Alignment with Product Vision

Implements the **"供应商 = 必要条件, 项目 = 辅助验证"** principle - supplier name is the primary key, not the project name.

## Requirements

### Requirement 1: Code Already Exists (Salvage Operation)

**User Story:** As a release engineer, I want to extract working supplier-threshold code from the failed v0.1.7 release, so that we don't lose valuable optimization work.

#### Acceptance Criteria

1. **WHEN** extracting code **THEN** bucketize.ts changes from commit 852050be **SHALL** be preserved
2. **WHEN** extracting code **THEN** extractor.ts **SHALL** remain at v0.1.6 version (commit 309093aa)
3. **WHEN** building **THEN** TypeScript **SHALL** compile without errors

**Current Status**: ✅ Code already in working state
- `packages/ocr-match-core/src/bucket/bucketize.ts` contains supplier-threshold logic
- `packages/ocr-match-core/src/extract/extractor.ts` restored to v0.1.6 (201 lines)

### Requirement 2: Hard Supplier Threshold

**Implementation**: ALREADY DONE in bucketize.ts:26-28

```typescript
function applySupplierHardThreshold(f1_score: number, supplierHardMin: number): boolean {
  return f1_score >= supplierHardMin;
}
```

**Verification**: Test shows SUPPLIER_HARD_REJECT triggered 6 times in 29-sample test

### Requirement 3: Supplier-Weighted Scoring

**Implementation**: ALREADY DONE in bucketize.ts:37-39

```typescript
function calculateWeightedScore(f1_score: number, f2_score: number, weights: [number, number]): number {
  return weights[0] * f1_score + weights[1] * f2_score;
}
```

**Verification**: Logs show `weights: [0.7,0.3] (config)` correctly loaded

### Requirement 4: New Bucketize Configuration

**Implementation**: ALREADY DONE
- `configs/v0.1.7b/9d2376d2/bucketize.json` contains new thresholds
- `src/config/schema.ts` contains BucketizeConfigSchema
- `src/config/load.ts` loads bucketize.json

**Verification**: Logs show `supplierHardMin=0.58, autoPass=0.75` loaded from config

### Requirement 5: Validation Testing

**User Story:** As a QA engineer, I want to verify supplier-threshold code works correctly with v0.1.6 extraction logic, before full release.

#### Acceptance Criteria

1. **WHEN** running test:sample **THEN** SUPPLIER_HARD_REJECT **SHALL** trigger for low-supplier matches (f1 < 0.58)
2. **WHEN** running test:sample **THEN** no EXTRACT_EMPTY regressions **SHALL** occur compared to v0.1.6
3. **WHEN** running test:full **THEN** auto-pass rate **SHALL** be >= v0.1.6 baseline (32%)

**Current Status**: ✅ Sample test passed
- SUPPLIER_HARD_REJECT: 6 occurrences
- No extraction regressions (using v0.1.6 logic)
- Ready for full test

## Non-Functional Requirements

### Release Safety

- **Rollback Plan**: If v0.1.8 fails, update `configs/latest.json` to point to v0.1.6
- **A/B Testing**: Both v0.1.6 and v0.1.8 configs must remain accessible
- **Documentation**: Clearly mark v0.1.8 as "salvaged from v0.1.7"

### Version Numbering

- **Version**: v0.1.8 (not v0.1.7c)
- **Reason**: v0.1.7 is a "cursed" version number, skip to v0.1.8
- **Config**: Continue using v0.1.7b config (already created and tested)

## Out of Scope

**Explicitly NOT included in v0.1.8**:
- ❌ Extraction logic refactor (shouldStopLookup, isTableHeader)
- ❌ Label alias cleanup
- ❌ Document field labels exclusion
- ❌ Table body truncation

These will be addressed in v0.1.9+ after proper analysis.

## Success Criteria

1. ✅ TypeScript builds without errors
2. ✅ test:sample shows SUPPLIER_HARD_REJECT working
3. ✅ test:full achieves auto-pass rate >= 32% (v0.1.6 baseline)
4. ✅ No EXTRACT_EMPTY regressions
5. ✅ Documentation updated with v0.1.8 entry

## References

- Failed v0.1.7 commit: 852050be (supplier-threshold code)
- v0.1.6 baseline: 309093aa (stable extraction logic)
- Test run: run_sample_20251118_11_16 (17.2% auto-pass, 6 SUPPLIER_HARD_REJECT)
