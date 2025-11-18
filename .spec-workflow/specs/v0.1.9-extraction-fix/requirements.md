# Requirements Document

## Introduction

**Feature Name**: v0.1.9 Extraction Logic Fix - Field Truncation Resolution

**Purpose**: Fix the P0-level extraction algorithm bug that causes field values to be truncated (e.g., "居住" → "住"), affecting 145/222 files (65%) with FIELD_SIM_LOW_PROJECT errors.

**Value**:
- Resolve 145 FIELD_SIM_LOW_PROJECT failures caused by incomplete project name extraction
- Improve auto-pass rate from ~14% (broken extraction) back to 32%+ baseline
- Enable proper supplier-project matching by ensuring accurate field extraction

**Context**: This addresses the root cause discovered during v0.1.7 investigation - extraction截断导致字段不完整,而非配置或阈值问题。

## Problem Statement

### Current Failure Pattern

**典型案例**: `baodingshiwuxingdianqi4100967040.txt`

**OCR 原文**:
```
工程名称：居住、社会福利项目（光谷P（2023）028地块）项目
```

**当前提取结果** (WRONG):
```
q_project: "住、社会福利项目"  ❌ 缺少 "居" 字
```

**DB 真值**:
```
武汉市润达房地产开发有限公司"居住、社会福利项目（光谷P（2023）028地块）项目
```

**失败原因**:
- 字段相似度: 0.0977 < 0.6 (minFieldSim)
- 分桶结果: FIELD_SIM_LOW_PROJECT

### Impact Analysis

- **影响范围**: 145/222 files (65.3%)
- **表现**: FIELD_SIM_LOW_PROJECT 从 v0.1.6 的 67 次增加到 v0.1.7b 的 145 次
- **根本原因**: 行级扫描截取位置不准确,漏掉字段开头字符

## Requirements

### Requirement 1: Diagnostic Analysis

**User Story:** As a data engineer, I want to understand why extraction truncates field values, so that I can design the correct fix.

#### Acceptance Criteria

1. **WHEN** analyzing failed cases **THEN** system **SHALL** identify common truncation patterns
2. **WHEN** reviewing extraction code **THEN** system **SHALL** pinpoint exact line/column calculation logic
3. **WHEN** comparing OCR text **THEN** system **SHALL** show expected vs actual extracted values

**Analysis Tasks**:
- Examine `extractField()` function in extractor.ts (lines 60-140)
- Identify how `valueStartIdx` is calculated after finding label
- Test with known failing cases (baodingshiwuxingdianqi4100967040.txt)
- Document truncation pattern (character count, position offset)

### Requirement 2: Fix Extraction Position Calculation

**User Story:** As an algorithm developer, I want to correctly calculate field value start position after label, so that no characters are truncated.

#### Acceptance Criteria

1. **WHEN** label is found **THEN** system **SHALL** calculate correct character offset for value start
2. **WHEN** label has separator (冒号/空格) **THEN** system **SHALL** skip separator correctly
3. **WHEN** label has NO separator **THEN** system **SHALL** detect and handle correctly

**Expected Behavior**:
```typescript
// Input: "工程名称：居住、社会福利项目"
// Label found at: index of "工程名称"
// Expected valueStartIdx: after "：" (full-width colon)
// Expected result: "居住、社会福利项目" ✅ (complete, no truncation)
```

### Requirement 3: Multi-line Assembly Logic Review

**User Story:** As an algorithm developer, I want to correctly assemble multi-line field values, so that continuation lines are properly joined without data loss.

#### Acceptance Criteria

1. **WHEN** assembling lines **THEN** system **SHALL** preserve all characters from each line
2. **WHEN** trimming whitespace **THEN** system **SHALL NOT** trim significant content
3. **WHEN** checking line boundaries **THEN** system **SHALL** use correct stop conditions

**Known Issue**:
```typescript
// Current code might be doing:
value = value.trim()  // ❌ Might remove important characters

// Should be:
value = value.trimStart().trimEnd()  // ✅ More explicit control
```

### Requirement 4: Regression Prevention

**User Story:** As a QA engineer, I want to ensure extraction fixes don't break existing working cases, so that we avoid another v0.1.7 disaster.

#### Acceptance Criteria

1. **WHEN** running on v0.1.6 working cases **THEN** results **SHALL** remain identical
2. **WHEN** running on v0.1.7b failing cases **THEN** truncation **SHALL** be resolved
3. **WHEN** comparing metrics **THEN** EXTRACT_EMPTY count **SHALL NOT** increase

**Test Protocol**:
1. Baseline: v0.1.6 extraction results (71 exact, 0 EXTRACT_EMPTY_SUPPLIER)
2. Fix implementation
3. Regression test: ALL 222 files
4. Comparison: exact count >= 71, EXTRACT_EMPTY_SUPPLIER = 0

### Requirement 5: Documentation and Lessons Learned

**User Story:** As a technical writer, I want to document the extraction bug and fix, so that future developers understand the pitfall.

#### Acceptance Criteria

1. **WHEN** documenting **THEN** spec **SHALL** include before/after code comparison
2. **WHEN** documenting **THEN** spec **SHALL** include visual examples of truncation
3. **WHEN** documenting **THEN** spec **SHALL** explain why v0.1.7 refactor failed

**Documentation Deliverables**:
- Code comment explaining the position calculation fix
- Test case with annotated OCR text showing truncation point
- Implementation record entry with lessons learned

## Non-Functional Requirements

### Code Quality

- **Simplicity**: Fix must be minimal, surgical change (< 10 lines modified)
- **Clarity**: Add comments explaining position calculation
- **Testing**: Unit test for position calculation with edge cases

### Performance

- **No Regression**: Extraction speed must remain same or faster
- **Memory**: No additional memory allocation

### Safety

- **Incremental**: Implement fix in separate branch
- **Validation**: test:sample BEFORE test:full
- **Rollback**: Ready to revert if any regression detected

## Out of Scope

**NOT included in v0.1.9**:
- ❌ Extraction logic refactor (shouldStopLookup, isTableHeader) - deferred to v0.2.0
- ❌ Configuration cleanup - already handled in v0.1.7b
- ❌ New extraction features - focus on bug fix only

## Success Criteria

1. ✅ FIELD_SIM_LOW_PROJECT reduces from 145 to <= 67 (v0.1.6 baseline)
2. ✅ Auto-pass rate improves to >= 32%
3. ✅ EXTRACT_EMPTY count remains at 0 (no regressions)
4. ✅ Test case baodingshiwuxingdianqi4100967040.txt extracts "居住、社会福利项目" (complete)
5. ✅ Code review confirms fix addresses root cause

## Investigation Tasks (Before Implementation)

1. **Read extractor.ts** - Understand current extraction logic
2. **Analyze failing case** - baodingshiwuxingdianqi4100967040.txt OCR text
3. **Trace execution** - Add debug logs to see exact truncation point
4. **Identify pattern** - Check if all truncations have same offset
5. **Design fix** - Minimal code change to correct position calculation

## References

- Failing test: run_20251118_09_24 (145 FIELD_SIM_LOW_PROJECT)
- OCR file: data/ocr_txt/baodingshiwuxingdianqi4100967040.txt
- Current extractor: packages/ocr-match-core/src/extract/extractor.ts (v0.1.6, 201 lines)
- Baseline: v0.1.6 (32% auto-pass, 67 project failures)
