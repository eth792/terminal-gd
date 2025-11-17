# OCR Match Core - 测试运行指南

**最后更新**: 2025-11-17
**目的**: 标准化测试运行流程,确保每次测试都可追溯、可复现

---

## 快速开始

### 从根目录运行

```bash
# 完整测试 (带 DB digest 校验)
pnpm test:full

# 快速测试 (跳过 digest 校验)
pnpm test:quick

# 自定义测试 (手动传参)
pnpm test:custom -- --ocr ./data/ocr_txt --index ./runs/tmp/index_p0_v3.json --out ./runs/run_test
```

### 从 packages/ocr-match-core 运行

```bash
cd packages/ocr-match-core

# 完整测试
pnpm test:full

# 快速测试
pnpm test:quick

# 自定义测试
pnpm test:custom -- <参数>
```

---

## 测试脚本说明

### test:full (推荐用于版本发布)

**用途**: 完整的生产级测试,包含所有校验

**特点**:
- ✅ 构建最新代码 (`pnpm build`)
- ✅ DB digest 校验 (确保索引与 DB 同步)
- ✅ 自动生成时间戳运行包 (`run_{timestamp}`)
- ✅ 使用当前配置版本 (`configs/latest.json`)

**命令**:
```bash
pnpm test:full
```

**等价于**:
```bash
pnpm -F ./packages/ocr-match-core build && \
node --enable-source-maps packages/ocr-match-core/dist/cli/match-ocr.js \
  --ocr ./data/ocr_txt \
  --index ./runs/tmp/index_p0_v3.json \
  --out ./runs/run_{timestamp} \
  --config . \
  --db ./data/db \
  --autoPass 0.7 \
  --minFieldSim 0.6 \
  --minDeltaTop 0.03 \
  --topk 3
```

**输出示例**:
```
runs/run_20251117_1430/
├── manifest.json
├── summary.md
├── results.csv
└── log.jsonl
```

### test:quick (用于快速验证)

**用途**: 快速验证代码变更,跳过耗时的校验

**特点**:
- ✅ 构建最新代码
- ⚠️ 跳过 DB digest 校验 (`--allow-stale-index`)
- ✅ 自动生成时间戳运行包
- ⚠️ **风险**: 索引可能过期,结果可能不准确

**命令**:
```bash
pnpm test:quick
```

**使用场景**:
- 快速验证算法逻辑修改
- 调试特定功能
- **不应用于**: 版本发布前的最终测试

### test:custom (用于调优参数)

**用途**: 手动指定所有参数,用于实验性测试

**特点**:
- ✅ 构建最新代码
- ✅ 完全自定义所有参数
- ✅ 需要手动指定输出路径

**命令示例**:
```bash
# 测试不同的 autoPass 阈值
pnpm test:custom -- \
  --ocr ./data/ocr_txt \
  --index ./runs/tmp/index_p0_v3.json \
  --out ./runs/run_test_autopass_0.8 \
  --config . \
  --db ./data/db \
  --autoPass 0.8 \
  --minFieldSim 0.6 \
  --minDeltaTop 0.03

# 使用 {timestamp} 占位符
pnpm test:custom -- \
  --ocr ./data/ocr_txt \
  --index ./runs/tmp/index_p0_v3.json \
  --out ./runs/run_experiment_{timestamp} \
  --config . \
  --allow-stale-index \
  --autoPass 0.75
```

### test:sample (快速采样测试) ⚡

**用途**: 从 baseline 运行包中采样代表性测试用例,快速验证代码改动

**特点**:
- ✅ **12 倍加速**: 38 分钟 → 2-3 分钟
- ✅ 分层采样: 按 bucket (exact/review/fail) 和 reason 采样
- ✅ 代表性覆盖: 所有失败类别至少 3-5 个样本
- ⚠️ **限制**: 不适用于版本发布前的最终测试

**命令**:
```bash
pnpm test:sample
```

**使用场景**:
- ✅ 算法逻辑修改后快速验证
- ✅ 参数调优实验
- ✅ 防止灾难性回归 (如 v0.1.7 的 100% 失败率)
- ❌ 版本发布前的最终测试 (必须使用 `test:full`)

**工作流程**:
1. **采样**: 从 `runs/run_latest` 提取 35-40 个代表性样本
2. **构建**: `pnpm build` 最新代码
3. **测试**: 使用采样文件列表运行测试
4. **输出**: 生成 `run_sample_{timestamp}/` 运行包

**前提条件**:
需要创建 `runs/run_latest` 符号链接指向最新 baseline:
```bash
# 指向最新的完整测试运行包
ln -s run_20251117_1044 runs/run_latest
```

**采样配置** (在 `scripts/sample-test-cases.js` 中调整):
```javascript
const SAMPLE_CONFIG = {
  exact: 5,        // Exact 类别采样 5 个
  review: 5,       // Review 类别采样 5 个
  fail: {
    EXTRACT_EMPTY_SUPPLIER: 5,
    FIELD_SIM_LOW_SUPPLIER: 5,
    NO_CANDIDATE: 3,
    DELTA_TOO_SMALL: 3,
    default: 3     // 其他失败原因各 3 个
  }
};
```

**性能对比**:
| 测试模式 | 样本数 | 耗时 | 适用场景 |
|---------|--------|------|---------|
| `test:full` | 222 | 38 分钟 | 版本发布前最终测试 |
| `test:sample` | 35-40 | 2-3 分钟 | 快速验证代码改动 |
| `test:quick` | 222 | 37 分钟 | ⚠️ 几乎无加速,已废弃 |

**示例使用**:
```bash
# 1. 建立 baseline (完整测试)
pnpm test:full
ln -s run_20251117_1044 runs/run_latest

# 2. 修改代码 (如 bucketize.ts)
vim packages/ocr-match-core/src/bucket/bucketize.ts

# 3. 快速验证 (2-3 分钟)
pnpm test:sample

# 4. 如果采样测试通过,运行完整测试
pnpm test:full
```

**故障排查**:

**Q: `Error: Baseline run directory does not exist: runs/run_latest`**

A: 创建符号链接:
```bash
ln -s run_20251117_1044 runs/run_latest
```

**Q: `Error: X files not found`**

A: 确保 `data/ocr_txt/` 目录与 baseline 运行包使用的 OCR 源一致。

**Q: 采样数量不足怎么办?**

A: 如果某个类别样本数 < 配置要求,脚本会自动使用全部可用样本并显示警告。

**Q: 如何调整采样数量?**

A: 编辑 `scripts/sample-test-cases.js` 中的 `SAMPLE_CONFIG` 对象:
```javascript
// 增加 exact 采样数
exact: 10,  // 原来是 5

// 减少 fail 采样数
fail: {
  EXTRACT_EMPTY_SUPPLIER: 3,  // 原来是 5
  default: 2  // 原来是 3
}
```

**注意事项**:
- ⚠️ 采样测试**通过**不保证完整测试通过
- ⚠️ 采样测试**失败**则完整测试必然失败 (早期预警)
- ⚠️ 每次算法改动后,建议至少运行一次 `test:full` 更新 baseline
- ✅ 采样结果具有代表性,可快速发现明显回归

---

## CLI 参数详解

### 必填参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `--ocr` | OCR 文本目录 | `./data/ocr_txt` |
| `--index` | 索引 JSON 文件 | `./runs/tmp/index_p0_v3.json` |
| `--out` | 输出运行包目录 | `./runs/run_{timestamp}` |

**注意**: `--out` 支持 `{timestamp}` 或 `{ts}` 占位符,自动替换为 `YYYYMMDD_HHmm` 格式

### 配置参数

| 参数 | 说明 | 默认值 | 建议 |
|------|------|--------|------|
| `--config` | 配置根目录 | `process.cwd()` | 根目录: `.` |
| `--db` | DB 文件路径 (用于 digest 校验) | - | `./data/db` |
| `--allow-stale-index` | 跳过 digest 校验 | `false` | ⚠️ 仅用于调试 |

### 分桶决策参数 (影响 exact/review/fail 分类)

| 参数 | 说明 | 默认值 | v0.1.6 使用值 |
|------|------|--------|--------------|
| `--autoPass` | 自动通过阈值 | `0.7` | `0.7` |
| `--minFieldSim` | 最低字段相似度 | `0.6` | `0.6` |
| `--minDeltaTop` | Top1-Top2 最小差值 | `0.03` | `0.03` |

**调优建议**:
- `autoPass` 越高 → `exact` 越少,`review` 越多 (更保守)
- `minFieldSim` 越高 → `fail` 越多 (更严格)
- `minDeltaTop` 越高 → `review` 越多 (需要更明确的 Top1)

### 召回参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--topk` | 返回 TopK 候选 | `3` |
| `--max-cand` | 最大召回候选数 | `5000` |
| `--weights` | 字段权重 (如 "0.5,0.5") | `"0.5,0.5"` |

### 输出控制

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--include-top3` | 输出 results_top3.csv | `false` |
| `--log-level` | 日志级别 (debug/info/warn/error/silent) | `info` |

---

## 版本发布测试流程

**参考**: [RELEASE_WORKFLOW.md](../analysis/docs-flow-automation/RELEASE_WORKFLOW.md)

### Stage 2: 完整测试

```bash
# 1. 确保代码已构建
pnpm -F ./packages/ocr-match-core build

# 2. 运行完整测试 (带 digest 校验)
pnpm test:full

# 3. 检查运行包
ls -lt runs/ | head -5

# 4. 验证结果
cat runs/run_<timestamp>/summary.md
cat runs/run_<timestamp>/manifest.json
```

**成功标准**:
- ✅ 运行包正常生成
- ✅ `manifest.json` 包含正确的版本信息
- ✅ KPI 符合预期 (exact/review/fail 分布)

### Stage 3: 文档更新

```bash
# 使用生成的运行包路径
npm run update-docs -- <version> "<description>" <run_dir> <next_version> [specName]

# 示例
npm run update-docs -- v0.1.8 "提取逻辑修复" run_20251117_1430 v0.1.9
```

---

## 常见问题

### Q1: 如何更新索引?

**A**: 如果 DB 文件已更新,需要重新构建索引:

```bash
cd packages/ocr-match-core
pnpm build-index -- \
  --db ../../data/db \
  --out ../../runs/tmp/index_p0_v3.json \
  --config ../..
```

### Q2: digest mismatch 错误怎么办?

**错误信息**:
```
Index digest mismatch!
  Expected (index): 2f000cbaea7e08cd...
  Actual (DB):      a1b2c3d4e5f6g7h8...
```

**原因**: DB 文件在索引构建后被修改

**解决方案**:
1. **推荐**: 重新构建索引 (见 Q1)
2. **临时**: 使用 `--allow-stale-index` (⚠️ 结果可能不准确)

### Q3: 如何调优分桶参数?

**步骤**:
1. 使用 `test:custom` 测试不同参数组合
2. 观察 `exact/review/fail` 分布变化
3. 分析 `results.csv` 中的边界案例
4. 记录最佳参数到 `configs/` 版本控制

**示例实验**:
```bash
# 测试 autoPass=0.75
pnpm test:custom -- --ocr ./data/ocr_txt --index ./runs/tmp/index_p0_v3.json \
  --out ./runs/experiment_autopass_0.75_{timestamp} --config . --allow-stale-index \
  --autoPass 0.75 --minFieldSim 0.6 --minDeltaTop 0.03

# 测试 autoPass=0.8
pnpm test:custom -- --ocr ./data/ocr_txt --index ./runs/tmp/index_p0_v3.json \
  --out ./runs/experiment_autopass_0.8_{timestamp} --config . --allow-stale-index \
  --autoPass 0.8 --minFieldSim 0.6 --minDeltaTop 0.03

# 对比结果
diff runs/experiment_autopass_0.75_*/summary.md runs/experiment_autopass_0.8_*/summary.md
```

### Q4: {timestamp} 占位符格式是什么?

**A**: 自动替换为 `YYYYMMDD_HHmm` 格式 (分钟级精度)

**示例**:
- 输入: `run_{timestamp}`
- 输出: `run_20251117_1430` (2025年11月17日 14:30)

---

## 相关文档

- [PROJECT_STATUS.md](PROJECT_STATUS.md) - 项目状态和 KPI
- [RELEASE_WORKFLOW.md](../analysis/docs-flow-automation/RELEASE_WORKFLOW.md) - 版本发布流程
- [TECHNICAL_DECISIONS.md](TECHNICAL_DECISIONS.md) - 技术决策记录

---

**最佳实践**:
1. ✅ 版本发布前**必须**使用 `test:full` (带 digest 校验)
2. ✅ 日常开发可用 `test:quick` 加速迭代
3. ✅ 参数调优使用 `test:custom` 并记录实验结果
4. ✅ 运行包命名包含版本号和描述 (如 `run_v0.1.8_fix_{timestamp}`)
5. ✅ 保留关键版本的运行包用于回归对比
