# Design Document

## Introduction

**Feature Name**: v0.1.7a CLI Configuration Priority Fix

**Parent Spec**: v0.1.7-matching-improvements

**Purpose**: Fix CLI parameter architecture to enable configuration file priority, unlocking v0.1.7's supplier-weighted scoring design.

**Design Philosophy**: Minimal surgical changes to CLI glue code. Zero changes to core matching logic (which is correct). Pure architecture fix.

---

## Problem Recap

v0.1.7 implementation is **100% correct** in core logic:
- ✅ Extraction algorithms work
- ✅ Bucketization logic works
- ✅ Configuration files are correct (`bucketize.json` has weights=[0.7, 0.3])
- ✅ Config loading logic works

**Only issue**: CLI parameter handling prevents config from being used.

### Current Broken Flow

```
User runs: pnpm test:full (no --weights parameter)
↓
yargs parses args
├─ Line 111: .option('weights', { default: '0.7,0.3' })  ✅ First definition
└─ Line 126: .option('weights', { default: '0.5,0.5' })  ❌ Second definition WINS
↓
args.weights = '0.5,0.5'  (always defined, never undefined)
↓
Line 272: const bucketConfig = { weights: parseWeights(args.weights!) }
          // config.bucketize.weights is completely ignored
↓
Result: weights=[0.5, 0.5] used in matching, not [0.7, 0.3]
```

---

## Design Goals

### Primary Goals

1. **Zero Core Logic Changes** - Don't touch extractor.ts, bucketize.ts core algorithms
2. **Configuration File Priority** - `bucketize.json` values used when CLI args absent
3. **CLI Override Capability** - User can still override with explicit `--weights 0.6,0.4`
4. **Backward Compatible** - Old configs without bucketize.json still work
5. **Clear Value Source Logging** - Print where each threshold came from (CLI/config/default)

### Non-Goals

- ❌ Change v0.1.7 core matching logic
- ❌ Modify configuration file formats
- ❌ Add new CLI parameters (only fix existing ones)
- ❌ Change default threshold values (keep v0.1.7 design)

---

## Architecture Design

### Fallback Chain Design

**Core Principle**: "Configuration file is the source of truth. CLI arguments are overrides, not defaults."

```typescript
// ❌ WRONG (Current):
const threshold = args.threshold!;  // Always has value from default

// ✅ RIGHT (v0.1.7a):
const threshold = args.threshold ?? config.bucketize?.threshold ?? DEFAULT.threshold;
//                ^^^^^^^^^^^^^^    ^^^^^^^^^^^^^^^^^^^^^^^       ^^^^^^^^^^^^^^^^^
//                CLI (highest)     Config file (medium)           Code fallback (lowest)
```

**Priority Levels**:

| Priority | Source | When Used | Example |
|----------|--------|-----------|---------|
| 1 (High) | CLI args | User explicitly passes `--autoPass 0.8` | `args.autoPass = 0.8` |
| 2 (Med) | Config file | `bucketize.json` exists and has value | `config.bucketize.autoPass = 0.75` |
| 3 (Low) | Code default | Fallback when neither above exists | `DEFAULT_BUCKET_CONFIG.autoPass = 0.7` |

### yargs Option Definition Pattern

**Before (Broken)**:
```typescript
.option('autoPass', {
  type: 'number',
  description: 'Auto-pass threshold (overrides config)',
  default: 0.7,  // ❌ This makes args.autoPass ALWAYS defined
})
```

**After (Fixed)**:
```typescript
.option('autoPass', {
  type: 'number',
  description: 'Auto-pass threshold (overrides config bucketize.json)',
  // ✅ NO default - allows undefined detection
})
```

**Why This Works**:
- Without `default`, yargs sets `args.autoPass = undefined` when user doesn't pass it
- With `undefined`, we can distinguish "user didn't specify" from "user specified"
- `??` operator: `undefined ?? configValue` → uses configValue
- `??` operator: `0.8 ?? configValue` → uses 0.8 (user's explicit value)

---

## Implementation Approach

### Approach 1: Nullish Coalescing (✅ RECOMMENDED)

**Why Recommended**: Simplest, most readable, standard TypeScript pattern.

**Code Changes**:

```typescript
// File: packages/ocr-match-core/src/cli/match-ocr.ts

// Change 1: Remove duplicate weights definition (delete lines 126-130)
// Keep only the first definition at lines 111-115

// Change 2: Remove all default values from override parameters
.option('autoPass', {
  type: 'number',
  description: 'Auto-pass threshold (overrides config bucketize.json)',
  // NO default field
})
.option('minFieldSim', {
  type: 'number',
  description: 'Minimum field similarity (overrides config bucketize.json)',
  // NO default field
})
// ... similar for all override parameters

// Change 3: Implement fallback chain in bucketConfig construction
const bucketConfig = {
  autoPass: args.autoPass
    ?? config.bucketize?.autoPass
    ?? DEFAULT_BUCKET_CONFIG.autoPass,

  minFieldSim: args.minFieldSim
    ?? config.bucketize?.minFieldSim
    ?? DEFAULT_BUCKET_CONFIG.minFieldSim,

  minDeltaTop: args.minDeltaTop
    ?? config.bucketize?.minDeltaTop
    ?? DEFAULT_BUCKET_CONFIG.minDeltaTop,

  supplierHardMin: args.supplierHardMin
    ?? config.bucketize?.supplierHardMin
    ?? DEFAULT_BUCKET_CONFIG.supplierHardMin,

  minReview: args.minReview
    ?? config.bucketize?.minReview
    ?? DEFAULT_BUCKET_CONFIG.minReview,

  weights: args.weights
    ? (args.weights.split(',').map(Number) as [number, number])
    : (config.bucketize?.weights ?? DEFAULT_BUCKET_CONFIG.weights),
};
```

**Line Count Impact**:
- Before: ~15 lines (simple assignment + weights parsing)
- After: ~30 lines (explicit fallback chain)
- Tradeoff: +15 lines, but 100% clarity on priority

**Type Safety**:
```typescript
// TypeScript correctly infers:
args.autoPass: number | undefined
config.bucketize?.autoPass: number | undefined
DEFAULT_BUCKET_CONFIG.autoPass: number

// Result type: number (guaranteed non-undefined)
```

### Approach 2: Helper Function (❌ NOT RECOMMENDED)

**Why Not Recommended**: Adds abstraction for a simple pattern, harder to debug.

```typescript
function getConfigValue<T>(
  cliValue: T | undefined,
  configValue: T | undefined,
  defaultValue: T
): T {
  return cliValue ?? configValue ?? defaultValue;
}

const bucketConfig = {
  autoPass: getConfigValue(args.autoPass, config.bucketize?.autoPass, DEFAULT_BUCKET_CONFIG.autoPass),
  // ... repeat for all fields
};
```

**Problems**:
- Generic function harder to understand for newcomers
- Same line count as Approach 1
- Loses inline clarity of priority chain
- Debugging requires stepping into function

### Approach 3: Object.assign Merging (❌ NOT RECOMMENDED)

**Why Not Recommended**: Hidden priority order, hard to trace value source.

```typescript
const bucketConfig = {
  ...DEFAULT_BUCKET_CONFIG,
  ...(config.bucketize ?? {}),
  ...(Object.fromEntries(
    Object.entries(args).filter(([_, v]) => v !== undefined)
  )),
};
```

**Problems**:
- Spread operator priority is right-to-left, unintuitive
- Object.fromEntries dance is unreadable
- Can't log value source easily
- TypeScript loses type safety

---

## Enhanced Logging Design

### Current Logging (Insufficient)

```typescript
logger.info('cli.match-ocr', `Config loaded: version=${config.version}, sha=${config.sha}`);
```

**Problem**: Doesn't show threshold sources, can't debug why values are wrong.

### New Logging (Value Source Tracking)

```typescript
// After bucketConfig construction:
logger.info(
  'cli.match-ocr',
  `Bucket config resolved:\n` +
  `  autoPass: ${bucketConfig.autoPass} (${args.autoPass !== undefined ? 'CLI' : config.bucketize?.autoPass !== undefined ? 'config' : 'default'})\n` +
  `  supplierHardMin: ${bucketConfig.supplierHardMin} (${args.supplierHardMin !== undefined ? 'CLI' : config.bucketize?.supplierHardMin !== undefined ? 'config' : 'default'})\n` +
  `  weights: [${bucketConfig.weights}] (${args.weights ? 'CLI' : config.bucketize?.weights ? 'config' : 'default'})`
);
```

**Example Output**:

```
[2025-11-17T23:40:00.000Z][info][cli.match-ocr] Config loaded: version=v0.1.7, sha=373c0c28
[2025-11-17T23:40:00.001Z][info][cli.match-ocr] Bucket config resolved:
  autoPass: 0.75 (config)
  minFieldSim: 0.6 (config)
  minDeltaTop: 0.03 (config)
  supplierHardMin: 0.58 (config)
  minReview: 0.65 (config)
  weights: [0.7, 0.3] (config)
```

**Value**: Immediately visible that config is being used correctly.

---

## Test Script Changes (Optional)

### Current Test Script

```json
{
  "test:full": "pnpm build && node dist/cli/match-ocr.js --ocr ../../data/ocr_txt --index ../../runs/tmp/index_p0_v3.json --out ../../runs/run_{timestamp} --config ../.. --db ../../data/db --autoPass 0.7 --minFieldSim 0.6 --minDeltaTop 0.03 --topk 3"
}
```

**Issues**:
- Passes `--autoPass 0.7` (overrides config's 0.75)
- Missing `--weights`, `--supplierHardMin`, `--minReview`
- Causes defaults to be used (but defaults are wrong due to duplicate definition)

### Recommended Change (Use Config File)

```json
{
  "test:full": "pnpm build && node dist/cli/match-ocr.js --ocr ../../data/ocr_txt --index ../../runs/tmp/index_p0_v3.json --out ../../runs/run_{timestamp} --config ../.. --db ../../data/db --topk 3"
}
```

**Changes**:
- ❌ Removed `--autoPass 0.7` (use config's 0.75)
- ❌ Removed `--minFieldSim 0.6` (use config's 0.6)
- ❌ Removed `--minDeltaTop 0.03` (use config's 0.03)
- ✅ Config file now controls all thresholds

**Alternative (Keep Explicit Overrides)** - If team prefers explicit parameters:

```json
{
  "test:full": "pnpm build && node dist/cli/match-ocr.js --ocr ../../data/ocr_txt --index ../../runs/tmp/index_p0_v3.json --out ../../runs/run_{timestamp} --config ../.. --db ../../data/db --autoPass 0.75 --supplierHardMin 0.58 --weights 0.7,0.3 --topk 3"
}
```

**Tradeoff**: Explicit is safer for regression tests, but duplicates config values.

---

## Interface Changes

### MatchOcrArgs Interface

**Before**:
```typescript
interface MatchOcrArgs {
  ocr: string;
  index: string;
  config?: string;
  out: string;
  db?: string;
  allowStaleIndex?: boolean;
  files?: string;
  autoPass?: number;        // Already optional, but logic treats as required
  minFieldSim?: number;
  minDeltaTop?: number;
  supplierHardMin?: number;
  minReview?: number;
  topk?: number;
  maxCand?: number;
  weights?: string;
  includeTop3?: boolean;
  logLevel?: string;
}
```

**After**: No changes needed. Interface is already correct (all override parameters are optional `?:`).

**Why No Changes**: The interface definition is fine. The bug is in:
1. yargs option definitions (have `default`, shouldn't)
2. Usage of `args.autoPass!` (assumes always defined, shouldn't)

---

## Backward Compatibility Analysis

### Scenario 1: Old Config (No bucketize.json)

**Example**: `configs/v0.labs/e7bef887/` (doesn't have bucketize.json)

**Behavior**:
```typescript
const bucketConfig = {
  autoPass: args.autoPass ?? config.bucketize?.autoPass ?? DEFAULT_BUCKET_CONFIG.autoPass,
  //        undefined       undefined (no file)          0.7 ✅ Falls back to default
};
```

**Result**: Uses DEFAULT_BUCKET_CONFIG (v0.1.7 values). ✅ Works correctly.

### Scenario 2: New Config (Has bucketize.json)

**Example**: `configs/v0.1.7/373c0c28/` (has bucketize.json with weights=[0.7, 0.3])

**Behavior**:
```typescript
const bucketConfig = {
  weights: args.weights ?? config.bucketize?.weights ?? DEFAULT_BUCKET_CONFIG.weights,
  //       undefined       [0.7, 0.3] ✅ Uses config
};
```

**Result**: Uses config file values. ✅ Exactly what we want.

### Scenario 3: CLI Override

**Command**: `pnpm match-ocr ... --autoPass 0.8 --weights 0.6,0.4`

**Behavior**:
```typescript
const bucketConfig = {
  autoPass: args.autoPass ?? config.bucketize?.autoPass ?? DEFAULT_BUCKET_CONFIG.autoPass,
  //        0.8 ✅ User's explicit override
  weights: args.weights ? parse(args.weights) : (config.bucketize?.weights ?? DEFAULT_BUCKET_CONFIG.weights),
  //       '0.6,0.4' ✅ User's explicit override
};
```

**Result**: User's CLI values win. ✅ Override works.

### Summary: Zero Breaking Changes

| Scenario | Before (v0.1.7 broken) | After (v0.1.7a fixed) | Breaks? |
|----------|------------------------|----------------------|---------|
| Old config (no bucketize.json) | Uses wrong defaults [0.5,0.5] | Uses correct defaults [0.7,0.3] | ❌ No (improvement) |
| New config (has bucketize.json) | Ignores config, uses defaults | Uses config correctly | ❌ No (fix) |
| CLI override | Uses CLI value | Uses CLI value | ❌ No (same) |
| No config, no CLI | Uses wrong defaults | Uses correct defaults | ❌ No (improvement) |

---

## Validation Strategy

### Phase 1: Unit-Level Validation (Minimal)

**Test**: Verify fallback chain logic

```typescript
// Test case 1: CLI priority
const args1 = { autoPass: 0.8, weights: undefined };
const config1 = { bucketize: { autoPass: 0.75, weights: [0.7, 0.3] } };
// Expected: autoPass=0.8 (CLI), weights=[0.7, 0.3] (config)

// Test case 2: Config priority
const args2 = { autoPass: undefined, weights: undefined };
const config2 = { bucketize: { autoPass: 0.75, weights: [0.7, 0.3] } };
// Expected: autoPass=0.75 (config), weights=[0.7, 0.3] (config)

// Test case 3: Default fallback
const args3 = { autoPass: undefined, weights: undefined };
const config3 = { bucketize: undefined };
// Expected: autoPass=0.7 (default), weights=[0.7, 0.3] (default)
```

**How to Test**: Add to existing test suite or manual CLI tests.

### Phase 2: Integration Validation (Critical)

**Test 1: Verify Config File Used**

```bash
# Run without any threshold parameters
pnpm match-ocr --ocr ./data/ocr_txt --index ./runs/tmp/index_p0_v3.json --out ./runs/test1 --config ../.. --db ./data/db --topk 3

# Check log output:
# Expected: "Bucket config resolved: weights: [0.7, 0.3] (config)"
# Expected in manifest.json: "weights": [0.7, 0.3]
```

**Test 2: Verify CLI Override**

```bash
# Run with explicit weights
pnpm match-ocr ... --weights 0.6,0.4

# Check log output:
# Expected: "Bucket config resolved: weights: [0.6, 0.4] (CLI)"
```

**Test 3: Verify Backward Compatibility**

```bash
# Point to old config (no bucketize.json)
# Temporarily edit latest.json to point to v0.labs/e7bef887
pnpm match-ocr ... --config ../..

# Expected: Uses DEFAULT_BUCKET_CONFIG without errors
# Expected log: "Bucket config resolved: ... (default)"
```

### Phase 3: Full System Validation (KPI Achievement)

**Test**: Run full 222-file test with v0.1.7a

```bash
pnpm test:full
```

**Success Criteria** (from requirements.md):
1. ✅ `manifest.json` shows `weights: [0.7, 0.3]`
2. ✅ `manifest.json` shows `autoPass: 0.75`
3. ✅ `manifest.json` shows `supplierHardMin: 0.58`
4. ✅ Auto-pass rate ≥ 37% (vs 14% broken, 32% baseline)
5. ✅ SUPPLIER_DIFF_SAME_PROJECT count = 0
6. ✅ Exact count ≥ 71 (baseline)
7. ✅ Garbage matches (f1 < 0.58) classified as SUPPLIER_HARD_REJECT

**Comparison with Baseline**:

| Metric | v0.1.6 Baseline | v0.1.7 Broken | v0.1.7a Expected |
|--------|-----------------|---------------|------------------|
| Auto-pass rate | 32.0% | 14.0% ❌ | ≥37.0% ✅ |
| Exact matches | 71 | 31 | ≥71 ✅ |
| Weights used | [0.5, 0.5] | [0.5, 0.5] ❌ | [0.7, 0.3] ✅ |
| SUPPLIER_DIFF_SAME_PROJECT | 11 | 0 ✅ | 0 ✅ |
| supplierHardMin enforcement | No | No ❌ | Yes ✅ |

---

## Migration Path

### Step 1: Code Changes (30 minutes)

1. Delete duplicate `weights` option (Line 126-130)
2. Remove `default` from all override parameters (Line 86-115)
3. Implement fallback chain in bucketConfig (Line 272-279)
4. Add enhanced logging

### Step 2: Local Verification (20 minutes)

1. Build: `pnpm -F ./packages/ocr-match-core build`
2. Test 1: Run with no params → verify config used
3. Test 2: Run with `--weights 0.6,0.4` → verify CLI override
4. Test 3: Check logs for value source markers

### Step 3: Full Test (45 minutes)

1. Run: `pnpm test:full`
2. Verify KPI targets achieved
3. Compare with run_20251117_18_28 baseline
4. Document results

### Step 4: Optional Test Script Update

**Decision Point**: Keep explicit parameters or use config file?

**Option A (Recommended)**: Remove threshold params from test:full
- Simpler command
- Config file is single source of truth
- Easier to adjust thresholds (just edit config)

**Option B**: Keep explicit params for safety
- More verbose command
- Explicit is better for regression tests
- Duplicates config values

**Recommendation**: Start with Option A. If team prefers explicit, switch to Option B later.

---

## Risk Analysis

### Risk 1: Type Errors from Removing Defaults (Low)

**Scenario**: TypeScript complains about `args.autoPass` being `undefined`

**Mitigation**:
- Interface already defines parameters as optional (`autoPass?: number`)
- Fallback chain guarantees non-undefined result
- Compile before committing

**Probability**: 5% (TypeScript should handle this)

### Risk 2: Test Script Behavior Change (Medium)

**Scenario**: `test:full` produces different results after removing `--autoPass 0.7`

**Mitigation**:
- Expected behavior: Should use config's 0.75 instead of 0.7
- This is DESIRED behavior (config should win)
- Document threshold change: 0.7 → 0.75

**Probability**: 50% (depends on test script decision)

### Risk 3: Logging Overhead (Very Low)

**Scenario**: New logging slows down execution

**Mitigation**:
- Logging is one-time at startup
- No per-file logging added
- Negligible performance impact

**Probability**: 1%

### Risk 4: Float Comparison in Weights Parsing (Low)

**Scenario**: `args.weights ? parse() : fallback` doesn't work if weights is empty string

**Mitigation**:
```typescript
weights: (args.weights && args.weights.trim())
  ? (args.weights.split(',').map(Number) as [number, number])
  : (config.bucketize?.weights ?? DEFAULT_BUCKET_CONFIG.weights)
```

**Probability**: 10% (depends on yargs behavior with empty string)

---

## Alternatives Considered

### Alternative 1: Use yargs coerce() to Merge Config

**Idea**: Use yargs' `coerce` option to automatically merge config values during parsing.

```typescript
.option('autoPass', {
  type: 'number',
  description: 'Auto-pass threshold',
  coerce: (val) => val ?? loadedConfig.bucketize?.autoPass ?? 0.7,
})
```

**Why Rejected**:
- Config not loaded yet when yargs parses (chicken-egg problem)
- Mixing config loading into CLI parsing violates separation of concerns
- Makes testing harder (need to mock config during CLI tests)

### Alternative 2: Add --use-config-defaults Flag

**Idea**: Add explicit flag to tell CLI to use config file.

```bash
pnpm match-ocr ... --use-config-defaults
```

**Why Rejected**:
- Backwards: config should be default, CLI should be override
- Adds complexity (new flag to document)
- Violates principle "configuration file is source of truth"

### Alternative 3: Deprecate CLI Threshold Parameters

**Idea**: Remove all threshold params from CLI, force config file usage.

**Why Rejected**:
- Breaks backward compatibility
- Removes flexibility for one-off experiments
- CLI overrides are useful for testing

### Selected Approach: Keep Current CLI API, Fix Priority

**Why Best**:
- ✅ Zero breaking changes
- ✅ Minimal code modification (surgical fix)
- ✅ Clear fallback chain (CLI → config → default)
- ✅ Maintains flexibility (CLI overrides still work)
- ✅ Easy to understand and debug

---

## Success Metrics

### Code Metrics

- ✅ `match-ocr.ts` line count: +15 lines (fallback chain + logging)
- ✅ Zero changes to core algorithm files (extractor.ts, bucketize.ts)
- ✅ TypeScript strict mode passes
- ✅ No `any` types introduced

### Functional Metrics

- ✅ Config file values used when CLI params absent
- ✅ CLI override capability preserved
- ✅ Backward compatibility with old configs
- ✅ Clear logging of value sources

### KPI Metrics (Primary Goal)

- ✅ Auto-pass rate: ≥37% (vs 14% broken, 32% baseline)
- ✅ SUPPLIER_DIFF_SAME_PROJECT: 0 cases
- ✅ Exact matches: ≥71 (baseline)
- ✅ Garbage matches (f1 < 0.58): Classified as SUPPLIER_HARD_REJECT

---

## Documentation Updates

### Files to Update

1. **`docs/PROJECT_STATUS.md`**
   - Add v0.1.7a entry to version history
   - Update KPI table with new results
   - Note: "v0.1.7a: CLI architecture fix (unlocks v0.1.7 design)"

2. **`docs/implementation_record.md`**
   - Add v0.1.7a entry
   - Document: "Patch for v0.1.7 CLI parameter handling bug"
   - Lessons learned: "Always validate config loading in integration tests"

3. **`analysis/v0.1.7a/migration_guide.md`** (New file)
   - Document threshold changes (if test script modified)
   - Provide rollback instructions
   - Include before/after comparison

4. **`.spec-workflow/specs/v0.1.7a-cli-config-fix/`**
   - This design.md document
   - tasks.md (to be created)
   - implementation-log.jsonl (after completion)

---

## Timeline

### Estimated Duration: 1.5 hours

| Phase | Duration | Tasks |
|-------|----------|-------|
| Phase 1: Code Fix | 30 min | Delete duplicate, remove defaults, implement fallback, add logging |
| Phase 2: Local Verification | 20 min | Build, run 3 test cases, check logs |
| Phase 3: Full Test | 45 min | Run pnpm test:full, verify KPIs, compare baseline |
| Phase 4: Documentation | 15 min | Update PROJECT_STATUS.md, implementation_record.md |

### Rollback Plan (If Needed)

If v0.1.7a fails validation:

1. **Immediate**: Point `latest.json` back to v0.1.6 or v0.labs
2. **Analysis**: Review test results to identify unexpected behavior
3. **Fix**: If simple typo, patch in place. If design flaw, revert code changes.

**Safety Net**: Configuration immutability means v0.1.7 config is preserved. Can always revert to working config.

---

## Appendix: Code Diff Preview

### File: packages/ocr-match-core/src/cli/match-ocr.ts

**Section 1: Remove Duplicate Weights (Lines 126-130)**

```diff
  .option('weights', {
    type: 'string',
    description: 'Field weights (e.g., "0.7,0.3") (overrides config bucketize.json)',
-   default: '0.7,0.3',
  })
- .option('weights', {
-   type: 'string',
-   description: 'Field weights (e.g., "0.5,0.5")',
-   default: '0.5,0.5',
- })
```

**Section 2: Remove Defaults from Override Parameters (Lines 86-115)**

```diff
  .option('autoPass', {
    type: 'number',
    description: 'Auto-pass threshold (overrides config bucketize.json)',
-   default: DEFAULT_BUCKET_CONFIG.autoPass,
  })
  .option('minFieldSim', {
    type: 'number',
    description: 'Minimum field similarity (overrides config bucketize.json)',
-   default: DEFAULT_BUCKET_CONFIG.minFieldSim,
  })
  // ... similar for all parameters
```

**Section 3: Implement Fallback Chain (Lines 272-296)**

```diff
- const weights = args.weights!.split(',').map(Number) as [number, number];
  const bucketConfig = {
-   autoPass: args.autoPass!,
-   minFieldSim: args.minFieldSim!,
-   minDeltaTop: args.minDeltaTop!,
-   supplierHardMin: args.supplierHardMin!,
-   minReview: args.minReview!,
-   weights: weights,
+   autoPass: args.autoPass ?? config.bucketize?.autoPass ?? DEFAULT_BUCKET_CONFIG.autoPass,
+   minFieldSim: args.minFieldSim ?? config.bucketize?.minFieldSim ?? DEFAULT_BUCKET_CONFIG.minFieldSim,
+   minDeltaTop: args.minDeltaTop ?? config.bucketize?.minDeltaTop ?? DEFAULT_BUCKET_CONFIG.minDeltaTop,
+   supplierHardMin: args.supplierHardMin ?? config.bucketize?.supplierHardMin ?? DEFAULT_BUCKET_CONFIG.supplierHardMin,
+   minReview: args.minReview ?? config.bucketize?.minReview ?? DEFAULT_BUCKET_CONFIG.minReview,
+   weights: args.weights
+     ? (args.weights.split(',').map(Number) as [number, number])
+     : (config.bucketize?.weights ?? DEFAULT_BUCKET_CONFIG.weights),
  };

+ // Enhanced logging
+ logger.info(
+   'cli.match-ocr',
+   `Bucket config resolved:\n` +
+   `  autoPass: ${bucketConfig.autoPass} (${args.autoPass !== undefined ? 'CLI' : config.bucketize?.autoPass !== undefined ? 'config' : 'default'})\n` +
+   `  supplierHardMin: ${bucketConfig.supplierHardMin} (${args.supplierHardMin !== undefined ? 'CLI' : config.bucketize?.supplierHardMin !== undefined ? 'config' : 'default'})\n` +
+   `  weights: [${bucketConfig.weights}] (${args.weights ? 'CLI' : config.bucketize?.weights ? 'config' : 'default'})`
+ );
```

**Line Count**:
- Deleted: ~20 lines (duplicate + defaults)
- Added: ~25 lines (fallback chain + logging)
- Net: +5 lines

---

## Summary

**Design Decision**: Nullish coalescing approach (Approach 1)

**Key Changes**:
1. Remove duplicate weights definition
2. Remove all `default` from override parameters
3. Implement three-tier fallback chain: CLI → config → default
4. Add value source logging

**Expected Outcome**:
- Config file values correctly used
- v0.1.7 design finally works (weights=[0.7, 0.3], autoPass=0.75)
- KPI target achieved: ≥37% auto-pass rate

**Implementation Risk**: Low (surgical fix, backward compatible)

**Timeline**: 1.5 hours (code + test + docs)
