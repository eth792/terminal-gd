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
- ✅ **索引自动构建** (如果索引不存在,自动从 `data/db/` 构建)
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
# 方式 1: 使用当前 baseline (推荐)
pnpm test:sample

# 方式 2: 指定 baseline 并自动更新软链接
pnpm test:sample run_20251117_1044
```

**使用场景**:
- ✅ 算法逻辑修改后快速验证
- ✅ 参数调优实验
- ✅ 防止灾难性回归 (如 v0.1.7 的 100% 失败率)
- ❌ 版本发布前的最终测试 (必须使用 `test:full`)

**工作流程**:
1. **选择 Baseline**:
   - 不带参数: 使用当前 `runs/run_latest` 指向的 baseline
   - 带参数: 自动更新 `runs/run_latest` 软链接到指定目录
2. **采样**: 从 baseline 提取 35-40 个代表性样本
3. **构建**: `pnpm build` 最新代码
4. **测试**: 使用采样文件列表运行测试
5. **输出**: 生成 `run_sample_{timestamp}/` 运行包

**首次使用**:
首次运行 `test:sample` 需要手动创建 `runs/run_latest` 软链接:
```bash
# 指向最新的完整测试运行包
ln -s run_20251117_1044 runs/run_latest
```

之后可以通过 `pnpm test:sample <run_dir>` 自动切换 baseline

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
# 场景 1: 首次使用 (建立 baseline)
pnpm test:full  # 生成 run_20251117_1044
pnpm test:sample run_20251117_1044  # 自动创建软链接并运行采样测试

# 场景 2: 日常开发迭代
vim packages/ocr-match-core/src/bucket/bucketize.ts  # 修改代码
pnpm test:sample  # 使用当前 baseline 快速验证 (2-3 分钟)

# 场景 3: 切换到不同 baseline 进行对比
pnpm test:sample run_v0.1.6_full  # 切换到 v0.1.6 baseline
pnpm test:sample run_20251117_1044  # 切回最新 baseline

# 场景 4: 采样测试通过后,完整测试验证
pnpm test:sample  # 快速验证
pnpm test:full    # 完整验证 (版本发布前必须)
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

## 索引自动构建机制

**版本**: v0.1.9e 开始支持，v0.1.9f 改为 digest-based 命名

### 工作原理

当运行测试时，如果 `--index` 指定的索引文件不存在，CLI 会自动构建索引：

1. **计算 DB digest**: 扫描 `--db` 目录，计算所有文件的 SHA-256 联合 digest
2. **解析 --index 参数**:
   - 如果是目录 → 拼接 `index_{digest}.json`
   - 如果包含 `{digest}` 占位符 → 替换为实际 digest
   - 如果是完整路径 → 直接使用
3. **检测索引缺失**: 检查解析后的索引文件是否存在
4. **读取配置**: 从 `label_alias._dbColumnNames` 读取列名
   ```json
   {
     "_dbColumnNames": {
       "supplier": ["供应单位名称"],
       "project": ["单体工程名称"]
     }
   }
   ```
5. **扫描 DB 文件**: 自动扫描 `--db` 目录下的所有 `*.xlsx` 和 `*.csv` 文件
6. **构建合并索引**: 多文件自动合并为单一索引
7. **保存索引**: 保存到 `index_{digest}.json`（自动创建目录）

### 使用场景

**✅ 适用于**:
- 新用户首次运行测试（无需手动构建索引）
- 索引文件被误删除
- 更换数据目录后重新构建

**⚠️ 注意事项**:
- 构建索引需要 1-2 分钟（取决于 DB 大小）
- 构建后的索引会永久保存，下次运行直接复用
- **DB 变更后自动失效**：digest 改变 → 新文件名 → 旧索引不再使用

### Digest-based 命名的优势

**幂等性与可复用性**:
```bash
# 场景 1: 团队成员 A 构建索引
pnpm test:full
# → 生成 index_2f000cba.json (两文件合并，103k 行)

# 场景 2: 团队成员 B 克隆仓库，复用 A 的索引
pnpm test:full
# → 计算 digest = 2f000cba → 文件已存在 → 跳过构建，直接使用

# 场景 3: DB 变更后自动重建
echo "new data" >> data/db/ledger-1.xlsx
pnpm test:full
# → 计算 digest = 8a3f7e91 (digest 改变) → index_8a3f7e91.json (新文件)
# → 旧索引 index_2f000cba.json 不再使用，可手动删除
```

### 手动触发重建

**推荐方式**（digest-based 自动命名）:
```bash
# 只需运行 test:full，CLI 自动检测并重建
pnpm test:full
```

**手动清理旧索引**:
```bash
# 删除特定 digest 的索引
rm data/index/index_2f000cba.json

# 清理所有索引（保留最新构建）
rm data/index/index_*.json
pnpm test:full  # 重新构建
```

### 配置要求

自动构建依赖以下配置：

1. **必须提供 `--db` 参数**: 指定 DB 文件或目录
2. **配置文件必须包含 `_dbColumnNames`**: 定义列名映射

如果缺少上述配置，会报错：
```
[ERROR] Cannot auto-build index: --db parameter is required
[ERROR] Cannot auto-build index: label_alias._dbColumnNames is missing or incomplete
```

---

## CLI 参数详解

### 必填参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `--ocr` | OCR 文本目录 | `./data/ocr_txt` |
| `--index` | 索引文件路径或目录 | `./data/index/` 或 `./data/index/index_{digest}.json` |
| `--out` | 输出运行包目录 | `./runs/run_{timestamp}` |

**--index 参数详解**（v0.1.9f+）:
- **目录模式**（推荐）: `--index ./data/index/` → 自动命名为 `index_{digest}.json`
- **占位符模式**: `--index ./data/index/index_{digest}.json` → 替换为实际 digest
- **完整路径**: `--index ./data/index/index_2f000cba.json` → 直接使用

**占位符支持**:
- `--out`: 支持 `{timestamp}` 或 `{ts}` → `YYYYMMDD_HHmm` 格式
- `--index`: 支持 `{digest}` → DB SHA-256 前 8 位（如 `2f000cba`）

### 配置参数

| 参数 | 说明 | 默认值 | 建议 |
|------|------|--------|------|
| `--config` | 配置根目录 | `process.cwd()` | 根目录: `.` |
| `--db` | DB 文件/目录路径 | - | `./data/db`（**必须**，用于构建/命名/校验） |
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
