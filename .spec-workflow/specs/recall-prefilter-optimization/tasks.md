# Tasks Document: Recall Prefilter Optimization

## Overview

**Goal**: Enable `recallWithPrefilter` in recall+rank pipeline for 8.5x speedup (17s → <2s per file)

**Implementation Complexity**: LOW (8 lines changed, 1 file modified, 0 new files)

**Risk Level**: LOW (function already exists and tested, zero API changes)

---

## Implementation Tasks

### Phase 1: Code Modification (Estimated: 10 minutes)

- [x] 1. Modify `recallAndRank` to use `recallWithPrefilter`
  - **File**: `packages/ocr-match-core/src/match/strategies.ts` (lines 100-120)
  - **Action**: Replace `recallByBothFields + lookupRows` with `recallWithPrefilter` call
  - **Details**:
    - Import `recallWithPrefilter` from `./recall.js`
    - Call `recallWithPrefilter(q1, q2, index, 5000, 2)` instead of raw recall
    - Update `recalledCount` to use `stats.before` (preserve semantics)
  - **Why**: This activates the existing prefilter optimization
  - **Leverage**: `recallWithPrefilter` (recall.ts:107-174) - already implemented and tested
  - **Requirements**: REQ-1 (Enable Token Overlap Prefiltering)
  - **Diff Preview**:
    ```diff
    + import { recallByBothFields, lookupRows, recallWithPrefilter } from './recall.js';

    export function recallAndRank(...): { candidates: ScoredCandidate[]; recalledCount: number } {
    -  const rowIds = recallByBothFields(q1, q2, index.inverted, index.meta.ngram_size);
    -  const candidates = lookupRows(rowIds, index.rows);
    +  const { candidates, stats } = recallWithPrefilter(q1, q2, index, 5000, 2);

      const topCandidates = scoreAndRank(q1, q2, candidates, topK, normalizer);

      return {
        candidates: topCandidates,
    -    recalledCount: candidates.length,
    +    recalledCount: stats.before,  // Preserve backward compatibility
      };
    }
    ```
  - **Success Criteria**:
    - Code compiles without errors
    - TypeScript types match (no type errors)
    - `recalledCount` uses `stats.before` (not `stats.after`)
  - _Prompt: Role: Backend Developer with expertise in TypeScript and performance optimization | Task: Modify recallAndRank function in strategies.ts to use recallWithPrefilter following requirement REQ-1, replacing raw recall with prefilter call and preserving recalledCount semantics (use stats.before) | Restrictions: Do not modify recallWithPrefilter function, do not change MatchResult interface, do not modify other strategies (fast-exact, anchor) | Success: Code compiles cleanly, recalledCount preserves backward compatibility (uses original recall size), prefilter is correctly integrated with maxCand=5000 and minOverlap=2_

### Phase 2: Build and Validation (Estimated: 5 minutes)

- [x] 2. Build the package
  - **Command**: `pnpm -F ./packages/ocr-match-core build`
  - **File**: N/A (build step)
  - **Action**: Verify TypeScript compilation succeeds
  - **Why**: Catch any type errors or import issues
  - **Leverage**: Existing tsup build configuration
  - **Requirements**: N/A (build step)
  - **Success Criteria**:
    - Build completes without errors
    - No TypeScript type errors
    - Dist files generated correctly
  - _Prompt: Role: DevOps Engineer with expertise in build systems and TypeScript compilation | Task: Execute build command and verify compilation succeeds without errors, checking that all TypeScript types resolve correctly and dist files are generated | Restrictions: Do not modify build configuration, do not ignore type errors, ensure source maps are generated | Success: Build completes cleanly with no errors or warnings, dist files are generated with correct structure, source maps are available for debugging_

### Phase 3: Sample Testing (Estimated: 3 minutes)

- [x] 3. Run sample test (10 files baseline validation)
  - **Command**: `pnpm test:sample`
  - **File**: N/A (test command)
  - **Action**: Quick validation on 10 files to catch obvious regressions
  - **Why**: Fast feedback before full test run (2-3 min vs 62 min)
  - **Leverage**: Existing sample test infrastructure (TEST_GUIDE.md)
  - **Requirements**: REQ-2 (Preserve Backward Compatibility)
  - **Validation Checks**:
    - No new failure reasons (e.g., prefilter bugs)
    - `recalledCount` column unchanged in results.csv
    - TopK candidate IDs match baseline (order may vary)
  - **Success Criteria**:
    - Sample test completes successfully
    - No crashes or errors
    - Visual inspection: candidate IDs look correct
  - _Prompt: Role: QA Engineer with expertise in regression testing and data validation | Task: Execute sample test command and validate results against baseline following requirement REQ-2, checking that recalledCount semantics are preserved and no new failure modes appear | Restrictions: Do not modify test data, do not skip validation checks, ensure proper comparison with baseline | Success: Sample test passes without errors, recalledCount values match baseline expectations, TopK results are consistent with previous version (floating-point tolerance acceptable)_

### Phase 4: Performance Validation (Estimated: 5 minutes)

- [x] 4. Run full test suite with performance tracking
  - **Command**: `pnpm test:full 2>&1 | tee /tmp/test_v018_prefilter.log`
  - **File**: N/A (test command, output to /tmp)
  - **Action**: Full 222-file test with timing logs
  - **Why**: Validate performance improvement and accuracy preservation
  - **Leverage**: Existing test infrastructure and log analysis
  - **Requirements**: REQ-1 (Performance), REQ-2 (Backward Compatibility)
  - **Validation Checks**:
    - **Performance**:
      - Per-file time < 2s (target: 8.5x speedup)
      - Total time < 5min (baseline: 62min)
      - Grep `recalled=` from log to verify reduction ratios
    - **Accuracy**:
      - Exact match count: 71 ±2 (69-73)
      - Auto-pass rate: 32% ±2% (30-34%)
      - No new failure reasons
    - **Backward Compatibility**:
      - results.csv schema unchanged
      - `recalledCount` column values reasonable (not 5000 for all)
  - **Success Criteria**:
    - Total time < 5min (12x speedup achieved)
    - Exact matches within ±2% of baseline
    - No new failure modes introduced
  - _Prompt: Role: Performance Engineer with expertise in benchmarking and statistical analysis | Task: Execute full test suite following requirements REQ-1 and REQ-2, tracking performance metrics and validating accuracy preservation, analyzing log output for timing and reduction ratios | Restrictions: Do not cherry-pick test cases, ensure proper baseline comparison, verify statistical significance of results | Success: Performance target achieved (sub-2s per file, <5min total), accuracy maintained within ±2%, backward compatibility verified through schema and recalledCount validation_

### Phase 5: Results Analysis (Estimated: 5 minutes)

- [x] 5. Compare results with baseline
  - **Files**:
    - New: `runs/run_v018_prefilter_*/results.csv`
    - Baseline: `runs/run_20251118_13_46/results.csv` (v0.1.8, 32% auto-pass)
  - **Action**: Generate comparison report
  - **Why**: Document performance gains and accuracy preservation
  - **Leverage**: Existing summary.md format
  - **Requirements**: All requirements validation
  - **Comparison Metrics**:
    - **KPI Table** (from summary.md):
      - Exact: 71 → ? (target: ±2)
      - Review: 17 → ?
      - Fail: 134 → ?
      - Auto-pass rate: 32.0% → ? (target: ±2%)
    - **Failure Reasons** (Top 5):
      - FIELD_SIM_LOW_PROJECT: 67 → ? (should be unchanged)
      - No new reasons should appear
    - **Performance**:
      - Total time: 62.8min → ? (target: <5min)
      - Avg time: 17.0s/file → ? (target: <2s)
  - **Success Criteria**:
    - Performance improvement documented (8.5x or better)
    - Accuracy preservation documented (±2%)
    - Comparison table generated
  - _Prompt: Role: Data Analyst with expertise in A/B testing and performance metrics | Task: Generate comprehensive comparison report between baseline and optimized version covering all requirements, analyzing KPI changes, failure reason distribution, and performance improvements | Restrictions: Must compare exact same test set, ensure statistical validity of comparisons, do not ignore outliers without explanation | Success: Comparison report is complete and accurate, performance improvements are quantified and significant, accuracy changes are within acceptable bounds, any anomalies are explained_

### Phase 6: Documentation (Estimated: 5 minutes)

- [x] 6. Update implementation logs
  - **Tool**: `mcp__spec-workflow__log-implementation`
  - **Action**: Record implementation details for future reference
  - **Why**: Enable future AI agents to discover this optimization
  - **Leverage**: Spec workflow implementation logging
  - **Requirements**: All requirements
  - **Artifacts to Log**:
    - **Functions Modified**:
      - `recallAndRank` (strategies.ts:100-120)
      - Purpose: Enable prefilter optimization
      - Signature: `(q1: string, q2: string, index: InvertedIndex, topK?: number, normalizer?: Normalizer) => { candidates: ScoredCandidate[]; recalledCount: number }`
      - Changes: Replaced raw recall with `recallWithPrefilter` call
    - **Functions Leveraged** (no changes):
      - `recallWithPrefilter` (recall.ts:107-174)
      - Purpose: Filter candidates by token overlap before scoring
      - Status: Already existed, now activated
    - **Performance Impact**:
      - Before: 17s/file (62min total)
      - After: <2s/file (<5min total)
      - Improvement: 8.5x speedup
    - **Accuracy Impact**:
      - Exact matches: 71 → ? (within ±2%)
      - Auto-pass rate: 32% → ? (within ±2%)
  - **Files Modified**: `src/match/strategies.ts`
  - **Files Created**: None
  - **Statistics**: ~8 lines added/removed
  - **Success Criteria**:
    - Implementation log created
    - All artifacts documented
    - Performance metrics recorded
  - _Prompt: Role: Technical Documentation Specialist with expertise in implementation logging and knowledge management | Task: Create comprehensive implementation log covering all requirements using spec-workflow tool, documenting artifacts, performance metrics, and changes for future reference | Restrictions: Must include all required artifact types (functions, performance data), ensure searchability through keywords, do not omit important details | Success: Implementation log is complete and searchable, all artifacts are documented with locations and signatures, performance improvements are quantified, future developers can easily discover this optimization_

---

## Rollback Plan

**Trigger Conditions** (any of):
- Auto-pass rate drops >5% (< 27%)
- New failure modes appear (e.g., excessive filtering)
- results.csv schema incompatibility

**Rollback Steps**:
1. Revert strategies.ts to previous version:
   ```bash
   git checkout HEAD~1 packages/ocr-match-core/src/match/strategies.ts
   ```
2. Rebuild package:
   ```bash
   pnpm -F ./packages/ocr-match-core build
   ```
3. Re-run sample test to verify:
   ```bash
   pnpm test:sample
   ```
4. Document rollback reason in spec failure_analysis.md

---

## Task Dependencies

```
1 (Code Mod) → 2 (Build) → 3 (Sample Test) → 4 (Full Test) → 5 (Analysis) → 6 (Logging)
                                ↓
                          If fails: Rollback
```

**Sequential Execution Required**: Each task must complete successfully before proceeding to next.

**Estimated Total Time**: 33 minutes (code: 10min, build: 5min, sample: 3min, full test: 5min, analysis: 5min, logging: 5min)

---

## Notes

**Why This Is Simple**:
- Function already exists and works (`recallWithPrefilter`)
- Zero new code, just wiring
- Zero API changes
- Zero schema changes

**Why This Is Safe**:
- Fast path handles small recall sets (no overhead)
- Backward compatibility preserved (`recalledCount` semantics)
- Sample test catches regressions early
- Full test validates accuracy

**Key Success Metric**: 17s → <2s per file (8.5x speedup) with ±2% accuracy
