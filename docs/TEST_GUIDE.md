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
