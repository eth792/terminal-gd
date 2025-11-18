# Requirements Document: Recall Prefilter Optimization

## Introduction

The OCR matching system currently takes **17 seconds per file** to process 222 files (total ~62 minutes). Profiling reveals that the recall+rank stage accounts for ~80% of execution time because it performs **full similarity scoring on 177,888 candidates** (nearly the entire 178k-row database). This feature will activate the existing-but-unused `recallWithPrefilter` function to reduce scoring overhead by ~95%, targeting **sub-2 second per-file performance** while maintaining matching accuracy.

**Core Value**: Internal optimization that reduces test feedback cycles from 1 hour to <5 minutes, enabling rapid iteration on extraction logic improvements.

## Alignment with Product Vision

This optimization directly supports the technical foundation described in `TECHNICAL_DECISIONS.md`:

- **Processing Pipeline Efficiency**: Accelerates the Match phase (Step 3 of 4 in the pipeline) without changing extraction or bucketing logic
- **Data-Driven Iteration**: Faster test cycles enable more frequent validation of extraction improvements (e.g., fixing v0.1.9's 18 EXTRACT_EMPTY_PROJECT failures)
- **Monorepo Scalability**: Keeps core package performance acceptable as the system evolves toward NLP-based extraction (v0.2.x roadmap)

## Requirements

### REQ-1: Enable Token Overlap Prefiltering

**User Story**: As a **developer running tests**, I want the recall stage to **filter candidates by token overlap before scoring**, so that **I get test results 10x faster without losing matching accuracy**.

#### Acceptance Criteria

1. **WHEN** the recall+rank strategy is invoked **THEN** the system **SHALL** use `recallWithPrefilter` instead of `recallAndRank`
2. **WHEN** candidates are prefiltered **THEN** the system **SHALL** retain only rows with `tokenOverlap >= 2` (configurable)
3. **WHEN** prefiltering reduces candidates from N to M **THEN** the system **SHALL** log the reduction ratio if > 50%
4. **IF** recalled candidates ≤ `maxCand` threshold (5000) **THEN** the system **SHALL** skip prefiltering (optimization not needed)
5. **WHEN** final TopK results are returned **THEN** they **SHALL** be functionally equivalent to the unoptimized version (same ranking order within floating-point tolerance)

**Success Metrics**:
- Per-file matching time: **17s → <2s** (8.5x improvement)
- Total test time: **62min → <5min** (12x improvement)
- Exact match rate: **maintained within ±2%** (e.g., 71 → 69-73)

### REQ-2: Preserve Backward Compatibility

**User Story**: As a **system maintaining historical run bundles**, I want the optimization to **not change the output schema or matching semantics**, so that **results remain comparable across versions**.

#### Acceptance Criteria

1. **WHEN** matches are produced **THEN** the `results.csv` schema **SHALL** remain unchanged (no new columns)
2. **WHEN** `mode=recall` **THEN** the `recalledCount` field **SHALL** record the **original** recall size (before prefilter), not the filtered size
3. **WHEN** candidates are scored **THEN** the similarity algorithm **SHALL** remain identical (no formula changes)
4. **IF** a previously matched row **THEN** it **SHALL** still be matched if its token overlap ≥ 2 (no false negatives for reasonable queries)

### REQ-3: Maintain Configurability

**User Story**: As a **system operator**, I want prefilter parameters to **be runtime-configurable**, so that **I can tune performance vs. recall trade-offs without code changes**.

#### Acceptance Criteria

1. **WHEN** `maxCand` parameter is provided **THEN** the system **SHALL** use it as the prefilter threshold (default 5000)
2. **WHEN** `minOverlap` parameter is provided **THEN** the system **SHALL** use it as the token overlap filter (default 2)
3. **IF** no parameters are provided **THEN** the system **SHALL** use hardcoded defaults
4. **WHEN** prefilter thresholds are changed **THEN** no code rebuild **SHALL** be required (CLI/config-driven)

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility**: `recallWithPrefilter` already exists in `recall.ts` with clear input/output contract
- **Minimal Change**: Only modify `strategies.ts` to swap function calls (estimated <10 lines changed)
- **Backward Compatibility**: Existing `recallAndRank` remains available for A/B testing if needed
- **Interface Preservation**: `MatchResult` type and `recalledCount` semantics unchanged

### Performance

- **Latency**: Per-file matching time SHALL be <2s (vs. current 17s)
- **Throughput**: Full test suite (222 files) SHALL complete in <5min (vs. current 62min)
- **Memory**: Prefilter overhead SHALL be <50MB additional memory (token overlap calculation)
- **Scalability**: Performance gain SHALL increase linearly with database size (current 178k → future 500k+)

### Reliability

- **Deterministic**: Results SHALL be deterministic for identical input (no randomness)
- **Graceful Degradation**: IF prefilter fails (e.g., invalid parameters), THEN fallback to unfiltered recall
- **Logging**: Performance stats (before/after/ratio/ms) SHALL be logged at DEBUG level for monitoring

### Validation

- **Regression Testing**: Run full test suite before and after optimization
  - Compare `results.csv` bucket distributions (exact/review/fail counts)
  - Compare TopK candidate IDs for 10 random samples (order may vary within floating-point tolerance)
  - Validate `recalledCount` field matches original recall size
- **Performance Benchmarking**: Measure per-file timing with `time` command or internal profiling
  - Record P50, P95, P99 latencies for 222-file test suite
  - Confirm <2s median latency

### Rollback Strategy

- **Risk**: Prefilter may inadvertently filter out correct matches if `minOverlap` too high
- **Mitigation**:
  - Keep `recallAndRank` as fallback (add feature flag in CLI if needed)
  - Log prefilter stats (reduction ratio) to detect excessive filtering
  - If exact match rate drops >5%, revert to unfiltered recall and adjust `minOverlap`
