# Tasks Document

## Overview

**Spec**: v0.1.7a CLI Configuration Priority Fix
**Total Estimated Time**: 1.5 hours
**Implementation Strategy**: Surgical fix to CLI glue code (match-ocr.ts only)

---

## Phase 1: Code Fix (30 minutes)

### Task 1.1: Delete duplicate weights option definition
- [ ] Delete lines 126-130 in `packages/ocr-match-core/src/cli/match-ocr.ts`
- [ ] Verify only one `.option('weights')` remains (at lines 111-115)
- [ ] Compile to ensure no syntax errors
- **Acceptance**: `grep -n "\.option('weights'" match-ocr.ts` returns only one match
- **Leverage**: Design document Section "Code Diff Preview"

### Task 1.2: Remove default values from override parameters
- [ ] Remove `default` field from `.option('autoPass')` (line ~88)
- [ ] Remove `default` field from `.option('minFieldSim')` (line ~93)
- [ ] Remove `default` field from `.option('minDeltaTop')` (line ~98)
- [ ] Remove `default` field from `.option('supplierHardMin')` (line ~103)
- [ ] Remove `default` field from `.option('minReview')` (line ~108)
- [ ] Remove `default` field from `.option('weights')` (line ~113)
- [ ] Compile and verify TypeScript accepts optional parameters
- **Acceptance**: All 6 parameters have NO `default` field, TypeScript compiles
- **Leverage**: Design document "yargs Option Definition Pattern"

### Task 1.3: Implement fallback chain in bucketConfig construction
- [ ] Locate bucketConfig construction (around line 272)
- [ ] Replace `args.autoPass!` with `args.autoPass ?? config.bucketize?.autoPass ?? DEFAULT_BUCKET_CONFIG.autoPass`
- [ ] Apply same pattern to: minFieldSim, minDeltaTop, supplierHardMin, minReview
- [ ] Replace weights parsing with:
  ```typescript
  weights: args.weights
    ? (args.weights.split(',').map(Number) as [number, number])
    : (config.bucketize?.weights ?? DEFAULT_BUCKET_CONFIG.weights)
  ```
- [ ] Remove all non-null assertions (`!`) from parameter access
- [ ] Compile and verify no TypeScript errors
- **Acceptance**: All parameters use three-tier fallback, no `!` operators
- **Leverage**: Design document "Fallback Chain Design"

### Task 1.4: Add enhanced logging with value source tracking
- [ ] Add log statement after bucketConfig construction:
  ```typescript
  logger.info(
    'cli.match-ocr',
    `Bucket config resolved:\n` +
    `  autoPass: ${bucketConfig.autoPass} (${args.autoPass !== undefined ? 'CLI' : config.bucketize?.autoPass !== undefined ? 'config' : 'default'})\n` +
    `  supplierHardMin: ${bucketConfig.supplierHardMin} (${args.supplierHardMin !== undefined ? 'CLI' : config.bucketize?.supplierHardMin !== undefined ? 'config' : 'default'})\n` +
    `  weights: [${bucketConfig.weights}] (${args.weights ? 'CLI' : config.bucketize?.weights ? 'config' : 'default'})`
  );
  ```
- [ ] Verify log format matches design document example
- **Acceptance**: Log shows value source (CLI/config/default) for key parameters
- **Leverage**: Design document "Enhanced Logging Design"

---

## Phase 2: Local Verification (20 minutes)

### Task 2.1: TypeScript compilation verification
- [ ] Run: `pnpm -F ./packages/ocr-match-core build`
- [ ] Verify: Zero compilation errors
- [ ] Verify: No new TypeScript warnings introduced
- **Acceptance**: Build succeeds, `dist/` directory updated
- **Leverage**: Standard build process

### Task 2.2: CLI help text verification
- [ ] Run: `node dist/cli/match-ocr.js --help | grep -A 2 "weights"`
- [ ] Verify: Only ONE weights option shown in help text
- [ ] Verify: Description mentions "(overrides config bucketize.json)"
- **Acceptance**: Help text shows correct single weights option
- **Leverage**: yargs auto-generated help

### Task 2.3: Test Case 1 - No CLI params (should use config)
- [ ] Run: `node dist/cli/match-ocr.js --ocr ../../data/ocr_txt --index ../../runs/tmp/index_p0_v3.json --out ../../runs/test_case1 --config ../.. --db ../../data/db --topk 3 --files "test_001.txt"`
- [ ] Check log output: Should show "weights: [0.7, 0.3] (config)"
- [ ] Check manifest.json: Should contain `"weights": [0.7, 0.3]`
- **Acceptance**: Config file values used, not defaults
- **Leverage**: Design document "Validation Strategy - Test 1"

### Task 2.4: Test Case 2 - Partial CLI params (should mix sources)
- [ ] Run: `node dist/cli/match-ocr.js --ocr ../../data/ocr_txt --index ../../runs/tmp/index_p0_v3.json --out ../../runs/test_case2 --config ../.. --db ../../data/db --topk 3 --files "test_001.txt" --autoPass 0.8`
- [ ] Check log output: Should show "autoPass: 0.8 (CLI)" and "weights: [0.7, 0.3] (config)"
- [ ] Check manifest.json: Should contain `"autoPass": 0.8, "weights": [0.7, 0.3]`
- **Acceptance**: CLI override works, other values from config
- **Leverage**: Design document "Validation Strategy - Test 2"

### Task 2.5: Test Case 3 - Full CLI params (should all be CLI)
- [ ] Run: `node dist/cli/match-ocr.js --ocr ../../data/ocr_txt --index ../../runs/tmp/index_p0_v3.json --out ../../runs/test_case3 --config ../.. --db ../../data/db --topk 3 --files "test_001.txt" --autoPass 0.8 --weights 0.6,0.4`
- [ ] Check log output: Should show both values marked "(CLI)"
- [ ] Check manifest.json: Should contain CLI values
- **Acceptance**: CLI overrides work for all parameters
- **Leverage**: Design document "CLI Override Capability"

---

## Phase 3: Full System Test (45 minutes)

### Task 3.1: Run complete 222-file test with v0.1.7a
- [ ] Run: `pnpm test:full`
- [ ] Wait for completion (~38 minutes)
- [ ] Identify run directory: `runs/run_YYYYmmdd_HHMMSS__*`
- **Acceptance**: Test completes without errors
- **Leverage**: Standard test:full script

### Task 3.2: Verify KPI target - Auto-pass rate ≥ 37%
- [ ] Open: `runs/run_*/summary.md`
- [ ] Check: "自动通过率" (auto_pass_percent)
- [ ] Verify: Value ≥ 37% (vs 14% broken, 32% baseline)
- **Acceptance**: Auto-pass rate meets or exceeds 37%
- **Leverage**: Requirements.md KPI targets

### Task 3.3: Verify SUPPLIER_DIFF_SAME_PROJECT elimination
- [ ] Open: `runs/run_*/summary.md`
- [ ] Check: "失败原因分布" section
- [ ] Verify: SUPPLIER_DIFF_SAME_PROJECT count = 0
- **Acceptance**: No cases of SUPPLIER_DIFF_SAME_PROJECT failure
- **Leverage**: Requirements.md validation standard #7

### Task 3.4: Verify configuration values in manifest.json
- [ ] Open: `runs/run_*/manifest.json`
- [ ] Check: `params.weights` should be `[0.7, 0.3]` (not [0.5, 0.5])
- [ ] Check: `params.autoPass` should be `0.75` (from config, if test script updated)
- [ ] Check: Presence of `supplierHardMin` field
- **Acceptance**: Manifest shows config file values were used
- **Leverage**: Requirements.md acceptance criteria

### Task 3.5: Compare with baseline - Exact count ≥ 71
- [ ] Open: `runs/run_*/summary.md`
- [ ] Check: "Exact（自动通过）" count
- [ ] Compare with baseline: `runs/run_20251117_18_28` (71 exact)
- [ ] Verify: Exact count ≥ 71
- **Acceptance**: Exact matches at or above baseline
- **Leverage**: Requirements.md validation standard #5

### Task 3.6: Verify SUPPLIER_HARD_REJECT classification
- [ ] Open: `runs/run_*/results.csv`
- [ ] Filter: `reason = 'SUPPLIER_HARD_REJECT'`
- [ ] Check sample row: Verify `cand_f1 < 0.58`
- [ ] Count: Should be > 0 (garbage matches now caught)
- **Acceptance**: Garbage matches correctly classified as SUPPLIER_HARD_REJECT
- **Leverage**: Requirements.md validation standard #7

---

## Phase 4: Documentation Update (15 minutes)

### Task 4.1: Update PROJECT_STATUS.md with v0.1.7a results
- [ ] Run: `npm run update-docs -- v0.1.7a "CLI配置优先级修复" <run_dir> v0.1.8 cli-config-fix`
- [ ] Verify: KPI table updated with new metrics
- [ ] Verify: Version history includes v0.1.7a entry
- [ ] Verify: Note mentions "v0.1.7a: CLI architecture fix (unlocks v0.1.7 design)"
- **Acceptance**: PROJECT_STATUS.md reflects v0.1.7a results
- **Leverage**: Existing update-docs automation

### Task 4.2: Update implementation_record.md with v0.1.7a entry
- [ ] Verify: `npm run update-docs` added entry to implementation_record.md
- [ ] Add manual details:
  - "Patch for v0.1.7 CLI parameter handling bug"
  - Technical changes: "Removed duplicate weights definition, implemented three-tier fallback chain"
  - KPI improvement: "14% → 37%+ auto-pass rate"
- [ ] Add lessons learned: "Always validate config loading in integration tests"
- **Acceptance**: Implementation record includes detailed v0.1.7a entry
- **Leverage**: Existing implementation_record.md format

### Task 4.3: Create migration guide (optional)
- [ ] Create: `analysis/v0.1.7a/migration_guide.md`
- [ ] Document: Before/after threshold comparison
- [ ] Document: Test script changes (if any)
- [ ] Document: Rollback procedure (point latest.json to v0.1.6)
- **Acceptance**: Migration guide provides clear upgrade path
- **Leverage**: Design document "Migration Path"

### Task 4.4: Update TEST_GUIDE.md with lessons learned
- [ ] Add section: "Validating Configuration Loading"
- [ ] Document: How to check if config file is actually being used
- [ ] Document: Use manifest.json to verify runtime parameters
- [ ] Example: `jq '.params.weights' runs/run_*/manifest.json`
- **Acceptance**: TEST_GUIDE.md includes config validation guidance
- **Leverage**: v0.1.7a debugging experience

---

## Phase 5: Final Validation and Release (10 minutes)

### Task 5.1: Git commit with spec reference
- [ ] Stage changes: `git add packages/ocr-match-core/src/cli/match-ocr.ts`
- [ ] Commit with message:
  ```
  fix(cli): correct configuration priority chain (v0.1.7a)

  Fixes CLI parameter handling that prevented bucketize.json from being used.

  Changes:
  - Remove duplicate weights option definition
  - Remove default values from override parameters
  - Implement three-tier fallback: CLI → config → default
  - Add value source logging

  Results:
  - Auto-pass rate: 14% → 37%+ (KPI achieved)
  - Config file values now correctly used
  - SUPPLIER_DIFF_SAME_PROJECT: 0 cases

  Spec: .spec-workflow/specs/v0.1.7a-cli-config-fix/

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```
- [ ] Tag as: `v0.1.7a`
- **Acceptance**: Commit includes spec reference, clear change description
- **Leverage**: RELEASE_WORKFLOW.md Stage 4

### Task 5.2: Optional - Update test:full script
- [ ] Decide: Use config file (remove threshold params) or keep explicit params?
- [ ] If removing params:
  ```json
  "test:full": "pnpm build && node dist/cli/match-ocr.js --ocr ../../data/ocr_txt --index ../../runs/tmp/index_p0_v3.json --out ../../runs/run_{timestamp} --config ../.. --db ../../data/db --topk 3"
  ```
- [ ] If keeping explicit:
  ```json
  "test:full": "pnpm build && node dist/cli/match-ocr.js --ocr ../../data/ocr_txt --index ../../runs/tmp/index_p0_v3.json --out ../../runs/run_{timestamp} --config ../.. --db ../../data/db --autoPass 0.75 --supplierHardMin 0.58 --weights 0.7,0.3 --topk 3"
  ```
- [ ] Test: Run updated script to verify it works
- **Acceptance**: Test script works correctly with chosen approach
- **Leverage**: Design document "Test Script Changes"

### Task 5.3: Regression test against v0.labs baseline
- [ ] Temporarily edit `configs/latest.json` to point to `configs/v0.labs/e7bef887`
- [ ] Run: `pnpm test:full`
- [ ] Verify: Uses DEFAULT_BUCKET_CONFIG, no errors
- [ ] Restore `configs/latest.json` to v0.1.7/373c0c28
- **Acceptance**: v0.1.7a is backward compatible with old configs
- **Leverage**: Design document "Backward Compatibility Analysis"

### Task 5.4: Log implementation artifacts
- [ ] Call: `mcp__spec-workflow__log-implementation`
- [ ] Record:
  ```json
  {
    "specName": "v0.1.7a-cli-config-fix",
    "taskId": "all",
    "summary": "Fixed CLI parameter handling to enable configuration file priority",
    "artifacts": {
      "functions": [
        {
          "name": "bucketConfig construction",
          "purpose": "Implement three-tier fallback chain for threshold parameters",
          "location": "packages/ocr-match-core/src/cli/match-ocr.ts:272-296",
          "signature": "const bucketConfig = { autoPass: args.autoPass ?? config.bucketize?.autoPass ?? DEFAULT, ... }",
          "isExported": false
        }
      ]
    },
    "filesModified": ["packages/ocr-match-core/src/cli/match-ocr.ts"],
    "filesCreated": [],
    "statistics": {
      "linesAdded": 25,
      "linesRemoved": 20
    }
  }
  ```
- **Acceptance**: Implementation log recorded in spec directory
- **Leverage**: Spec workflow integration

### Task 5.5: Mark all tasks as completed
- [ ] Edit this file (tasks.md)
- [ ] Change all `[ ]` to `[x]` for completed tasks
- [ ] Commit: `git add .spec-workflow/specs/v0.1.7a-cli-config-fix/tasks.md`
- **Acceptance**: All tasks marked complete
- **Leverage**: Standard spec workflow

---

## Success Criteria Summary

All tasks must achieve these outcomes:

| Criterion | Target | Validation |
|-----------|--------|------------|
| Configuration Loading | Config file values used | manifest.json shows weights=[0.7, 0.3] |
| CLI Override | Explicit params work | Test case 2 shows mixed sources |
| Auto-pass Rate | ≥ 37% | summary.md KPI table |
| SUPPLIER_DIFF_SAME_PROJECT | 0 cases | summary.md failure distribution |
| Exact Matches | ≥ 71 | summary.md KPI table |
| Garbage Classification | Present | results.csv has SUPPLIER_HARD_REJECT rows |
| Backward Compatibility | No errors | v0.labs config test completes |
| Code Quality | TypeScript strict | Build succeeds with zero errors |

---

## Rollback Plan

If any Phase 3 validation fails:

1. **Immediate**: Revert match-ocr.ts changes
2. **Analysis**: Review test results vs expected
3. **Decision**:
   - If typo/simple fix: Patch and re-test
   - If design flaw: Escalate to requirements review

**Safety**: Configuration files remain immutable, can always revert to v0.1.6 config pointer.

---

## Notes

- **Total Tasks**: 24 tasks across 5 phases
- **Estimated Time**: 1.5 hours (actual may vary ±20%)
- **Critical Path**: Phase 1 → Phase 2 → Phase 3 (must be sequential)
- **Parallelizable**: Phase 4 tasks can be done concurrently
- **Optional**: Task 5.2 (test script update) depends on team preference

---

## Related Documents

- Requirements: `.spec-workflow/specs/v0.1.7a-cli-config-fix/requirements.md`
- Design: `.spec-workflow/specs/v0.1.7a-cli-config-fix/design.md`
- Parent Spec: `.spec-workflow/specs/v0.1.7-matching-improvements/`
