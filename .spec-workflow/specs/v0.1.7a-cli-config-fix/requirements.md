# Requirements Document

## Introduction

**Feature Name**: v0.1.7a CLI Configuration Priority Fix

**Parent Spec**: v0.1.7-matching-improvements

**Purpose**: 修复 CLI 参数处理逻辑导致 `bucketize.json` 配置被完全忽略的架构缺陷，使 v0.1.7 设计的供应商加权评分（weights=[0.7, 0.3]）和优化阈值（autoPass=0.75）能够正确生效。

**Problem Statement**:

v0.1.7 spec 的 25 个任务全部完成，配置文件（`bucketize.json`）正确创建且内容符合设计，但测试结果显示：

```
Expected (bucketize.json):
  weights: [0.7, 0.3]
  autoPass: 0.75
  minReview: 0.65
  supplierHardMin: 0.58

Actual (run_20251117_23_38):
  weights: [0.5, 0.5]  ❌ 使用默认值而非配置
  autoPass: 0.7        ❌ 使用测试脚本参数而非配置
  minReview: 0.65      ✅ (但无意义，因为未使用)

Result:
  Auto-pass rate: 14.0% (Expected: ≥37%) ❌
  SUPPLIER_DIFF_SAME_PROJECT: Still exists ❌
```

**Root Cause Analysis** (Ultra-Think):

1. **Architecture Flaw: CLI 参数完全覆盖配置**
   - 所有 CLI 参数都有 `default` 值（如 `default: 0.7`）
   - `args.autoPass!` 永远不是 `undefined`，无法区分"用户指定"和"默认值"
   - `bucketConfig` 构建直接使用 `args.*`，从不检查 `config.bucketize`

2. **Code Defect: weights 参数重复定义**
   - Line 111-115: `.option('weights', { default: '0.7,0.3' })`  ✅ 正确
   - Line 126-130: `.option('weights', { default: '0.5,0.5' })`  ❌ 覆盖前者
   - yargs 行为：后定义的 option 覆盖先定义的

3. **Test Script Issue: 缺失关键参数**
   - `pnpm test:full` 未传递 `--weights`
   - 导致使用 Line 126 的错误默认值 `'0.5,0.5'`

**Value of This Patch**:

- ✅ **Zero changes to v0.1.7 core logic** - 提取和匹配算法完全正确
- ✅ **Unlocks completed work** - 解锁已完成的 25 个任务成果
- ✅ **Minimal implementation** - 仅修改 1 个文件（match-ocr.ts）
- ✅ **Achieves v0.1.7 KPIs** - 预期自动通过率从 14% → 37%+

---

## Alignment with Product Vision

### Data-Driven Configuration Principle

**Core Philosophy**:
> "配置文件是真理来源（Single Source of Truth）。CLI 参数是覆盖选项（Override），而非默认值源（Default Source）。"

### Current Violation

```typescript
// ❌ Wrong: CLI default 成为真理来源
const bucketConfig = {
  autoPass: args.autoPass!,  // 总是使用 CLI default (0.7)
  weights: parseWeights(args.weights!),  // 总是使用 CLI default (0.5,0.5)
};

// config.bucketize 完全被忽略！
```

### Correct Architecture

```typescript
// ✅ Right: 配置文件 → CLI 参数 → 硬编码默认值
const bucketConfig = {
  autoPass: args.autoPass ?? config.bucketize?.autoPass ?? DEFAULT.autoPass,
  weights: args.weights ? parse(args.weights) : (config.bucketize?.weights ?? DEFAULT.weights),
};
```

**Fallback Chain**:
1. CLI 参数（用户显式指定）→ 最高优先级
2. 配置文件（团队约定的真理）→ 中优先级
3. 代码默认值（最后的安全网）→ 最低优先级

---

## Requirements

---

## Part A: CLI 架构修复（核心）

### Requirement A1: Remove Duplicate `weights` Option

**User Story**: 作为 CLI 开发者，我要删除重复定义的 `weights` 参数，确保只有一个定义生效（该定义的 default 值将在 A2 中移除）。

#### Acceptance Criteria (EARS Format)

1. **WHEN** 在 `match-ocr.ts` 中搜索 `.option('weights'` **THEN** 系统 **SHALL** 仅返回一个匹配结果
2. **WHEN** 该唯一的 `weights` option 定义存在 **THEN** 系统 **SHALL** 保留该定义(default 值将在 A2 中移除)
3. **WHEN** 代码编译 **THEN** 系统 **SHALL NOT** 报告 TypeScript 错误

**Expected Behavior**:

修改 `packages/ocr-match-core/src/cli/match-ocr.ts`:

```typescript
// ❌ 删除 Line 126-130 的重复定义
.option('weights', {
  type: 'string',
  description: 'Field weights (e.g., "0.5,0.5")',
  default: '0.5,0.5',  // ❌ 删除整个 option 定义
})

// ✅ 保留 Line 111-115 的定义(default 将在 A2 中移除)
.option('weights', {
  type: 'string',
  description: 'Field weights (e.g., "0.7,0.3") (overrides config bucketize.json)',
  // default 值将在 Requirement A2 中移除
})
```

**Verification**:
```bash
# 编译后测试
pnpm -F ./packages/ocr-match-core build
node dist/cli/match-ocr.js --help | grep -A 2 "weights"
# 应该只显示一个 weights 选项
```

---

### Requirement A2: Remove Default Values from Override Parameters

**User Story**: 作为配置架构师，我要移除所有 CLI override 参数的 `default` 值，使系统能够区分"用户显式指定"和"使用默认值"两种情况，从而正确应用配置文件的值。

#### Acceptance Criteria (EARS Format)

1. **WHEN** 以下参数的定义中 **THEN** 系统 **SHALL NOT** 包含 `default` 字段：
   - `autoPass`
   - `minFieldSim`
   - `minDeltaTop`
   - `supplierHardMin`
   - `minReview`
   - `weights`

2. **WHEN** 用户未传递某参数（如 `--autoPass`）**THEN** `args.autoPass` **SHALL** 为 `undefined`

3. **WHEN** 用户显式传递参数（如 `--autoPass 0.8`）**THEN** `args.autoPass` **SHALL** 为 `0.8`

4. **WHEN** TypeScript 编译时 **THEN** 系统 **SHALL** 正确推断类型为 `number | undefined`

**Expected Behavior**:

修改 `packages/ocr-match-core/src/cli/match-ocr.ts`:

```typescript
// Before (Line 86-115):
.option('autoPass', {
  type: 'number',
  description: 'Auto-pass threshold (overrides config bucketize.json)',
  default: DEFAULT_BUCKET_CONFIG.autoPass,  // ❌ 移除
})
.option('minFieldSim', {
  type: 'number',
  description: 'Minimum field similarity (overrides config bucketize.json)',
  default: DEFAULT_BUCKET_CONFIG.minFieldSim,  // ❌ 移除
})
// ... 其他参数类似

// After:
.option('autoPass', {
  type: 'number',
  description: 'Auto-pass threshold (overrides config bucketize.json)',
  // ✅ 无 default
})
.option('minFieldSim', {
  type: 'number',
  description: 'Minimum field similarity (overrides config bucketize.json)',
  // ✅ 无 default
})
// ... 其他参数类似

.option('weights', {
  type: 'string',
  description: 'Field weights (e.g., "0.7,0.3") (overrides config bucketize.json)',
  // ✅ 无 default
})
```

**Rationale**:
- yargs 的 `default` 会导致参数永远有值
- 无 `default` 时，未指定的参数为 `undefined`
- 通过 `undefined` 可以区分"用户未指定"（应使用配置文件）和"用户指定"（应覆盖配置文件）

---

### Requirement A3: Implement Configuration Fallback Chain

**User Story**: 作为运行时系统，我要按照"CLI 参数 → 配置文件 → 代码默认值"的优先级顺序构建 `bucketConfig`，确保配置文件的值能够被正确使用。

#### Acceptance Criteria (EARS Format)

1. **WHEN** CLI 参数被用户显式指定（非 `undefined`）**THEN** 系统 **SHALL** 使用 CLI 参数值
2. **WHEN** CLI 参数为 `undefined` **AND** `config.bucketize` 存在 **THEN** 系统 **SHALL** 使用 `config.bucketize` 的对应字段
3. **WHEN** CLI 参数为 `undefined` **AND** `config.bucketize` 不存在或字段缺失 **THEN** 系统 **SHALL** 使用 `DEFAULT_BUCKET_CONFIG` 的值
4. **WHEN** 日志记录时 **THEN** 系统 **SHALL** 清晰标记值的来源（"CLI override" / "config file" / "default"）

**Expected Behavior**:

修改 `packages/ocr-match-core/src/cli/match-ocr.ts` (Line 265-296):

```typescript
// Before (Line 265-279):
const weights = args.weights!.split(',').map(Number) as [number, number];
const bucketConfig = {
  autoPass: args.autoPass!,  // ❌ 总是使用 CLI 参数
  minFieldSim: args.minFieldSim!,
  minDeltaTop: args.minDeltaTop!,
  supplierHardMin: args.supplierHardMin!,
  minReview: args.minReview!,
  weights: weights,
};

// After (使用 nullish coalescing 运算符 ??):
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

// 增强日志：标记值来源
logger.info(
  'cli.match-ocr',
  `Bucket config resolved:\n` +
  `  autoPass: ${bucketConfig.autoPass} (${args.autoPass !== undefined ? 'CLI' : config.bucketize?.autoPass !== undefined ? 'config' : 'default'})\n` +
  `  supplierHardMin: ${bucketConfig.supplierHardMin} (${args.supplierHardMin !== undefined ? 'CLI' : config.bucketize?.supplierHardMin !== undefined ? 'config' : 'default'})\n` +
  `  weights: [${bucketConfig.weights}] (${args.weights ? 'CLI' : config.bucketize?.weights ? 'config' : 'default'})`
);
```

**Verification Examples**:

```bash
# Case 1: 无 CLI 参数 → 使用 bucketize.json
pnpm match-ocr --ocr ./data --index ./index.json --out ./runs/test --config ../..
# Expected: weights=[0.7, 0.3], autoPass=0.75, supplierHardMin=0.58

# Case 2: 部分 CLI 参数 → 混合使用
pnpm match-ocr ... --autoPass 0.8
# Expected: autoPass=0.8 (CLI), weights=[0.7, 0.3] (config)

# Case 3: 完整 CLI 参数 → 全部覆盖
pnpm match-ocr ... --autoPass 0.8 --weights 0.6,0.4
# Expected: autoPass=0.8, weights=[0.6, 0.4] (全部 CLI)

# Case 4: 旧配置无 bucketize.json → 使用默认值
# (将 latest.json 指向 v0.labs/e7bef887)
pnpm match-ocr ... --config ../..
# Expected: weights=[0.7, 0.3] (default), autoPass=0.7 (default)
```

---

### Requirement A4: Update MatchOcrArgs Interface

**User Story**: 作为 TypeScript 开发者，我要更新 `MatchOcrArgs` 接口，使所有 override 参数标记为可选（`?:`），反映移除 `default` 后的实际类型。

#### Acceptance Criteria (EARS Format)

1. **WHEN** 定义 `MatchOcrArgs` 接口时 **THEN** 以下字段 **SHALL** 标记为可选：
   - `autoPass?: number;`
   - `minFieldSim?: number;`
   - `minDeltaTop?: number;`
   - `supplierHardMin?: number;`
   - `minReview?: number;`
   - `weights?: string;`

2. **WHEN** TypeScript 编译时 **THEN** 系统 **SHALL** 通过严格模式检查
3. **WHEN** 访问 `args.autoPass` **THEN** TypeScript **SHALL** 推断类型为 `number | undefined`

**Expected Behavior**:

修改 `packages/ocr-match-core/src/cli/match-ocr.ts` (Line 20-38):

```typescript
// Before:
interface MatchOcrArgs {
  ocr: string;
  index: string;
  config?: string;
  out: string;
  db?: string;
  allowStaleIndex?: boolean;
  files?: string;
  autoPass?: number;        // 已经是可选，但逻辑中当作必选
  minFieldSim?: number;     // 同上
  minDeltaTop?: number;     // 同上
  supplierHardMin?: number; // v0.1.7: 供应商硬阈值
  minReview?: number;       // v0.1.7: review 最低分
  topk?: number;
  maxCand?: number;
  weights?: string;         // 字段权重
  includeTop3?: boolean;
  logLevel?: string;
}

// After (无需改动，但确认理解):
// ✅ 接口定义已经正确（所有 override 参数都是可选的）
// ✅ 问题在于 yargs 的 default 导致运行时总有值
// ✅ 移除 default 后，运行时行为将与类型定义一致
```

**Note**: 接口定义本身已经正确，Requirement A4 主要是文档化类型正确性的验证。

---

## Part B: 测试脚本修复（可选）

### Requirement B1: Document Test Script Parameter Override

**User Story**: 作为测试工程师，我要在测试脚本中明确注释哪些参数是覆盖配置文件的，避免未来维护者困惑。

#### Acceptance Criteria (EARS Format)

1. **WHEN** 查看 `package.json` 的 `test:full` 脚本 **THEN** 应包含注释说明参数覆盖行为
2. **WHEN** 需要使用配置文件的默认值 **THEN** 应移除对应的 CLI 参数

**Expected Behavior** (Optional - 取决于用户偏好):

**Option 1: 保持现状（显式覆盖）**
```json
{
  "test:full": "pnpm build && node dist/cli/match-ocr.js --ocr ../../data/ocr_txt --index ../../runs/tmp/index_p0_v3.json --out ../../runs/run_{timestamp} --config ../.. --db ../../data/db --autoPass 0.7 --minFieldSim 0.6 --minDeltaTop 0.03 --topk 3"
}
```
- 保留显式参数，但注释说明这是覆盖行为
- 适合需要固定参数的回归测试

**Option 2: 使用配置文件（推荐）**
```json
{
  "test:full": "pnpm build && node dist/cli/match-ocr.js --ocr ../../data/ocr_txt --index ../../runs/tmp/index_p0_v3.json --out ../../runs/run_{timestamp} --config ../.. --db ../../data/db --topk 3",
  "test:full:v0.1.7": "# Uses bucketize.json: weights=[0.7,0.3], autoPass=0.75, supplierHardMin=0.58"
}
```
- 移除所有阈值参数，使用配置文件的值
- 适合验证配置文件的正确性

**Decision**: 交由用户在 Design 阶段选择。

---

## Non-Functional Requirements

### Code Quality

#### TypeScript Strict Mode
- **Zero `any` types** - 所有类型明确声明
- **Strict null checks** - 正确处理 `undefined` 情况
- **No non-null assertions (`!`)** after fix - 移除所有 `args.autoPass!` 的非空断言

#### Code Simplicity
- **Requirement A3 实施后代码行数**: ~40 lines（Fallback chain）
- **Maximum nesting**: ≤2 levels（仅 logger.info 内的条件表达式）
- **Cyclomatic complexity**: ≤3（仅三元运算符）

### Backward Compatibility

#### Configuration File
- **向后兼容**: 旧配置（无 `bucketize.json`）仍可使用
  - Fallback chain 的第三层（DEFAULT_BUCKET_CONFIG）保证兼容性
  - 日志清晰标记使用了默认值

#### CLI Interface
- **破坏性变更**: ❌ None
  - 移除 `default` 不影响用户传递参数的行为
  - 用户显式传递的参数优先级不变

#### Test Scripts
- **兼容性**: ⚠️ Depends on Option (B1)
  - Option 1: 无影响（显式传递所有参数）
  - Option 2: 行为变化（使用配置文件），但结果应一致

### Performance

- **Zero performance impact** - 逻辑简化（移除重复定义）
- **Configuration loading**: 已在 v0.1.7 实施，无额外开销
- **Fallback evaluation**: ~0.001ms (6 个 nullish coalescing 运算)

### Logging and Debugging

#### Enhanced Logging
- **Value source tracking**: 标记每个参数来自 CLI / config / default
- **Configuration summary**: 启动时打印完整的 bucketConfig 和来源

Example log output:
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

---

## Implementation Phases

### Phase 1: Code Fix (30 minutes)
- **Task 1.1**: Delete duplicate `weights` option (Line 126-130)
- **Task 1.2**: Remove `default` from all override parameters (Line 86-115)
- **Task 1.3**: Implement fallback chain in bucketConfig construction (Line 265-296)
- **Task 1.4**: Add enhanced logging with value source tracking

### Phase 2: Verification (20 minutes)
- **Task 2.1**: TypeScript compilation verification
- **Task 2.2**: CLI help text verification (no duplicate weights)
- **Task 2.3**: Test Case 1: No CLI params → uses config
- **Task 2.4**: Test Case 2: Partial CLI params → mixed sources
- **Task 2.5**: Test Case 3: Full CLI params → all overrides

### Phase 3: Full Test (45 minutes)
- **Task 3.1**: Run `pnpm test:full` with fixed code
- **Task 3.2**: Verify KPI: auto_pass_rate ≥ 37%
- **Task 3.3**: Verify: SUPPLIER_DIFF_SAME_PROJECT count = 0
- **Task 3.4**: Verify: weights in manifest.json = [0.7, 0.3]
- **Task 3.5**: Compare with baseline: exact count ≥ 71

**Total Duration**: ~1.5 hours

---

## Validation Standards

v0.1.7a 必须满足以下标准才能视为成功：

### Configuration Loading
1. **Config file priority**: bucketize.json 的值被正确使用（无 CLI 覆盖时）
2. **CLI override works**: 用户显式传递参数时能正确覆盖配置
3. **Backward compatibility**: 旧配置（无 bucketize.json）仍可运行

### KPI Achievement (解锁 v0.1.7 设计)
4. **Auto-pass rate**: ≥ 37% (vs 14% broken, 32% baseline)
5. **Weights verification**: manifest.json 显示 `[0.7, 0.3]`
6. **Threshold verification**: manifest.json 显示 `autoPass: 0.75`
7. **SUPPLIER_DIFF_SAME_PROJECT**: 0 cases (vs 11 baseline)

### Code Quality
8. **TypeScript strict mode**: Zero errors
9. **No non-null assertions**: 移除所有 `!` 在 args 访问中
10. **Logging clarity**: 所有参数标记来源（CLI/config/default）

---

## Related Documents

### Parent Spec
- **v0.1.7 Requirements**: `.spec-workflow/specs/v0.1.7-matching-improvements/requirements.md`
- **v0.1.7 Design**: `.spec-workflow/specs/v0.1.7-matching-improvements/design.md`
- **v0.1.7 Tasks**: `.spec-workflow/specs/v0.1.7-matching-improvements/tasks.md` (25 tasks completed)

### Analysis
- **Ultra-Think Root Cause**: (此 conversation 上下文)
- **Test Results**: `runs/run_20251117_23_38/summary.md` (14.0% auto-pass, weights=[0.5, 0.5])

### Code References
- **CLI Entry**: `packages/ocr-match-core/src/cli/match-ocr.ts:48-390`
- **Config Loading**: `packages/ocr-match-core/src/config/load.ts:84-155`
- **Bucketize Schema**: `packages/ocr-match-core/src/config/schema.ts` (BucketizeConfigSchema)
- **Bucketize Logic**: `packages/ocr-match-core/src/bucket/bucketize.ts` (v0.1.7 已正确实施)

---

## Risk Analysis

### Risk 1: 测试脚本行为变化 (Low)
- **Scenario**: 移除 `--autoPass 0.7` 后，使用 `bucketize.json` 的 `0.75`
- **Impact**: 阈值从 0.7 → 0.75，可能影响边界案例
- **Mitigation**:
  - Option 1: 保留测试脚本的显式参数（继续覆盖）
  - Option 2: 接受变化（这是 v0.1.7 的设计意图）
- **Probability**: 10% (取决于用户选择)

### Risk 2: 旧配置兼容性 (Low)
- **Scenario**: `config.bucketize` 为 `undefined`（旧配置）
- **Impact**: Fallback 到 DEFAULT_BUCKET_CONFIG
- **Mitigation**: 已通过 `??` 运算符和三层 fallback 保证
- **Probability**: 5% (已在设计中处理)

### Risk 3: TypeScript 类型错误 (Very Low)
- **Scenario**: 移除 `default` 后类型推断问题
- **Impact**: 编译失败
- **Mitigation**: 接口定义已正确（所有参数已标记 `?:`）
- **Probability**: 2% (接口已正确)

### Risk 4: 日志过于冗长 (Low)
- **Scenario**: 增强日志可能过多
- **Impact**: 用户困惑
- **Mitigation**: 使用 INFO 级别，用户可通过 `--log-level` 控制
- **Probability**: 5%

---

## Summary

v0.1.7a 是 **CLI 架构修复补丁**，解决 v0.1.7 实施阶段的单一缺陷：

### Problem (Root Cause)
❌ CLI 参数的 `default` 值完全覆盖配置文件
❌ `weights` 参数重复定义导致错误默认值生效
❌ Fallback chain 缺失（未实施配置优先级）

### Solution (Minimal Patch)
✅ 删除重复的 `weights` option 定义
✅ 移除所有 override 参数的 `default` 值
✅ 实施三层 Fallback chain: CLI → config → default
✅ 增强日志：标记参数值来源

### Impact
🎯 **Unlocks v0.1.7 design**: weights=[0.7, 0.3], autoPass=0.75, supplierHardMin=0.58
🎯 **Achieves KPIs**: 预期 14% → 37%+ 自动通过率
🎯 **Zero core logic changes**: 提取和匹配算法完全不变
🎯 **Minimal implementation**: 仅 1 个文件，~40 行代码修改

### Key Principle
> **"配置文件是真理来源。CLI 参数是覆盖选项，而非默认值源。"**

这个补丁将 v0.1.7 从"实施完成但无法生效"状态转变为"完整功能运行"状态。
