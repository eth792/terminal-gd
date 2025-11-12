# OCR Match Core - 测试指南

本文档提供 `packages/ocr-match-core` 的完整测试流程，包含命令示例、预期输出和故障排查。

---

## 快速开始

### 前置条件

1. **Node.js** ≥ 18
2. **pnpm** ≥ 9.12.2（通过 `corepack enable` 启用）
3. **测试数据**：
   - DB 文件：`data/db/ledger-1.xlsx` 或 `test_db.csv`
   - OCR 文本：`data/ocr_txt/*.txt`
   - 标注数据（可选）：`configs/sidecar_json/*.json`

### 环境检查

```bash
# 检查 Node.js 版本
node --version  # 应 ≥ v18.0.0

# 检查 pnpm 版本
pnpm --version  # 应 ≥ 9.12.2

# 检查测试数据
ls data/db/*.xlsx data/db/*.csv  # 应显示 DB 文件
ls data/ocr_txt/*.txt | wc -l   # 应显示 OCR 文件数量
```

---

## 测试流程

### 步骤 1: 构建核心包

```bash
cd packages/ocr-match-core
pnpm build
```

**预期输出**：

```
CLI Building entry: src/index.ts, src/cli/build-index.ts, src/cli/eval-sidecar.ts, src/cli/match-ocr.ts
ESM Build start
ESM dist/cli/build-index.js     3.35 KB
ESM dist/cli/match-ocr.js       17.75 KB
ESM dist/cli/eval-sidecar.js    7.00 KB
ESM dist/index.js               1.35 KB
DTS Build start
DTS ⚡️ Build success in 5660ms
```

**验证**：检查 `dist/cli/` 目录是否包含三个可执行脚本：

```bash
ls -lh dist/cli/*.js
# 应显示：build-index.js, match-ocr.js, eval-sidecar.js
```

---

### 步骤 2: 构建 DB 索引

**使用小文件测试**（推荐首次测试）：

```bash
cd /Users/caron/Developer/milk/terminal-gd

node --enable-source-maps packages/ocr-match-core/dist/cli/build-index.js \
  --db ./data/db/test_db.csv \
  --out ./runs/tmp/index_test.json \
  --field1 "s_field1" \
  --field2 "s_field2" \
  --log-level info
```

**预期输出**：

```
[INFO][cli.build-index] Starting index build...
[INFO][cli.build-index] Loading config from /Users/caron/Developer/milk/terminal-gd
[INFO][config.load] Loading config version=v0.labs, sha=f6b7160f
[INFO][indexer.build] Building index from ./data/db/test_db.csv...
[INFO][indexer.digest] DB digest: f8899bc2880d4e9c...
[INFO][indexer.parse] Parsed 5 rows from 5 lines
[INFO][indexer.build] Index built: 5 rows, 69 tokens in 2ms

✅ Index built successfully!
   Output: ./runs/tmp/index_test.json
   Rows: 5
   Tokens: 69
   Digest: f8899bc2880d4e9c...
```

**验证**：检查索引文件是否生成：

```bash
ls -lh runs/tmp/index_test.json
# 应显示：~2KB JSON 文件

# 检查索引结构
jq '.meta' runs/tmp/index_test.json
# 应显示：unique_tokens, columns, ngram_size
```

**使用生产文件测试**（可选 - 单文件）：

```bash
node --enable-source-maps packages/ocr-match-core/dist/cli/build-index.js \
  --db ./data/db/ledger-1.xlsx \
  --out ./runs/tmp/index_ledger1.json \
  --field1 "s_field1" \
  --field2 "s_field2"
```

**预期输出**（大文件，需要更长时间）：

```
✅ Index built successfully!
   Output: ./runs/tmp/index_ledger1.json
   Rows: 89087
   Tokens: 18447
   Digest: 5631a954c769f9d8...
```

**使用多文件目录测试**（推荐 - v0.1.2+ 新特性）：

```bash
node --enable-source-maps packages/ocr-match-core/dist/cli/build-index.js \
  --db ./data/db \
  --out ./runs/tmp/index_all_ledgers.json \
  --field1 "s_field1" \
  --field2 "s_field2"
```

**预期输出**（自动扫描并合并目录中所有 .xlsx/.xls/.csv 文件）：

```
[INFO][indexer.build] Building index from ./data/db...
[INFO][indexer.build] Found 2 DB file(s):
[INFO][indexer.build]   [1] ledger-1.xlsx
[INFO][indexer.build]   [2] ledger-2.xlsx
[INFO][indexer.digest] DB digest: 2f000cbaea7e08cd...
[INFO][indexer.parse] Parsing ledger-1.xlsx...
[INFO][indexer.parse] Parsed 89087 rows from ledger-1.xlsx
[INFO][indexer.parse] Parsing ledger-2.xlsx...
[INFO][indexer.parse] Parsed 88956 rows from ledger-2.xlsx
[INFO][indexer.parse] Total rows merged: 178043
[INFO][indexer.build] Index built: 178043 rows, 28556 tokens in 94032ms

✅ Index built successfully!
   Output: ./runs/tmp/index_all_ledgers.json
   Rows: 178043
   Tokens: 28556
   DB Files: 2
   Digest: 2f000cbaea7e08cd...
```

**关键特性**：
- ✅ 自动扫描目录中所有 Excel/CSV 文件（按文件名排序）
- ✅ 验证所有文件的列名一致性
- ✅ 分配全局唯一 row ID（跨文件）
- ✅ 计算多文件联合 digest（用于后续一致性校验）
- ✅ 向后兼容：单文件命令仍然有效

---

### 步骤 3: 批量匹配 OCR 文本

**创建小测试集**（推荐首次测试）：

```bash
mkdir -p data/ocr_test
cp data/ocr_txt/andelijituanyouxiangongsi4100968520.txt data/ocr_test/
```

**执行匹配**（单文件索引）：

```bash
node --enable-source-maps packages/ocr-match-core/dist/cli/match-ocr.js \
  --ocr ./data/ocr_test \
  --index ./runs/tmp/index_test.json \
  --db ./data/db/test_db.csv \
  --out ./runs/run_test_$(date +%Y%m%d_%H%M%S) \
  --log-level info
```

**执行匹配**（多文件索引 - v0.1.2+）：

```bash
node --enable-source-maps packages/ocr-match-core/dist/cli/match-ocr.js \
  --ocr ./data/ocr_txt \
  --index ./runs/tmp/index_all_ledgers.json \
  --db ./data/db \
  --out ./runs/run_full_$(date +%Y%m%d_%H%M%S) \
  --include-top3 \
  --log-level info
```

**注意**：`--db` 参数必须与构建索引时使用的路径一致（用于 digest 校验）

**预期输出**：

```
[INFO][cli.match-ocr] Starting OCR matching...
[INFO][cli.match-ocr] Loading config from /Users/caron/Developer/milk/terminal-gd
[INFO][config.load] Loading config version=v0.labs, sha=f6b7160f
[INFO][cli.match-ocr] Loading index from ./runs/tmp/index_test.json
[INFO][cli.match-ocr] Index loaded: 5 rows, 69 tokens, digest=f8899bc2880d4e9c...
[INFO][cli.match-ocr] Verifying index digest against DB: ./data/db/test_db.csv
[INFO][cli.match-ocr] ✓ Digest verification passed
[INFO][cli.match-ocr] Found 1 OCR files
[INFO][match.extract] Extracted from andelijituanyouxiangongsi4100968520.txt: q1="安德利集团有限公司...", q2="钟家村片老旧小区..."
[INFO][match.match] Matched: mode=recall, candidates=3, recalled=5

✅ OCR matching completed!
   Run ID: run_test_20251112_003426
   Output: ./runs/run_test_20251112_003426
   Total files: 1
   ✅ Exact (auto-pass): 0 (0.0%)
   ⚠️  Review (needs check): 0 (0.0%)
   ❌ Fail: 1 (100.0%)
   Elapsed: 12ms (12.0ms/file)
```

**验证运行包**：

```bash
RUN_DIR=$(ls -td runs/run_test_* | head -1)
ls -lh $RUN_DIR/

# 应显示 4 个文件：
# manifest.json  - 元数据
# summary.md     - 人类可读报告
# results.csv    - 匹配结果（20 列）
# log.jsonl      - 结构化日志
```

---

### 步骤 4: 检查输出文件

#### 4.1 manifest.json

```bash
RUN_DIR=$(ls -td runs/run_test_* | head -1)
jq '.' $RUN_DIR/manifest.json
```

**关键字段**：
- `inputs.db_digest` - DB 文件的 SHA-256
- `params` - 阈值参数（autoPass/minFieldSim/minDeltaTop）
- `stats` - 统计数据（exact/review/fail/elapsed_ms）
- `versions` - 版本信息（core/node/config）
- `fingerprints` - 配置和 DB 的指纹

#### 4.2 summary.md

```bash
cat $RUN_DIR/summary.md
```

**包含内容**：
- KPI 指标表格（总文件数/Exact/Review/Fail）
- 失败原因分布（Top 5）
- 性能指标（总耗时/平均耗时）
- 配置信息（版本/SHA/Digest）

#### 4.3 results.csv

```bash
head -3 $RUN_DIR/results.csv
```

**20 列契约**：
```
file_name, q_supplier, q_project,
cand_f1, cand_f2, source_file, row_index,
s_field1, s_field2, score, bucket, reason, mode,
source_txt, source_image, viewer_link,
run_id, config_version, config_sha, db_digest
```

**bucket 枚举**：
- `exact` - 自动通过（高置信度）
- `review` - 需人工审核
- `fail` - 匹配失败

**reason 枚举**（仅 fail/review）：
- `EXTRACT_EMPTY_SUPPLIER` - 提取阶段未找到供应商字段
- `EXTRACT_EMPTY_PROJECT` - 提取阶段未找到项目字段
- `NO_CANDIDATES` - 召回阶段无候选
- `FIELD_SIM_LOW_SUPPLIER` - 供应商字段相似度低于阈值
- `FIELD_SIM_LOW_PROJECT` - 项目字段相似度低于阈值
- `DELTA_TOO_SMALL` - Top1-Top2 差值过小

#### 4.4 log.jsonl

```bash
cat $RUN_DIR/log.jsonl
```

**JSONL 格式**（每行一个 JSON 对象）：
```json
{"ts":"2025-11-11T16:34:26.366Z","lvl":"INFO","mod":"cli.match-ocr","msg":"Run completed","total":1,"exact":0,"review":0,"fail":1,"elapsed_ms":12}
```

---

### 步骤 5: 测试 Top3 输出（可选）

```bash
node --enable-source-maps packages/ocr-match-core/dist/cli/match-ocr.js \
  --ocr ./data/ocr_test \
  --index ./runs/tmp/index_test.json \
  --db ./data/db/test_db.csv \
  --out ./runs/run_top3_$(date +%Y%m%d_%H%M%S) \
  --include-top3
```

**验证**：

```bash
RUN_DIR=$(ls -td runs/run_top3_* | head -1)
ls -lh $RUN_DIR/results_top3.csv

# 检查 Top3 格式（应包含 rank 列）
head -3 $RUN_DIR/results_top3.csv
```

**results_top3.csv 格式**：
- 第一列：`rank`（1/2/3）
- 其余 20 列：与 results.csv 相同

---

### 步骤 6: 测试 Digest 验证

#### 6.1 测试严格模式（应该失败）

```bash
# 修改 DB 文件
echo "新供应商,新项目,extra" >> data/db/test_db.csv

# 重新匹配（应该报错）
node --enable-source-maps packages/ocr-match-core/dist/cli/match-ocr.js \
  --ocr ./data/ocr_test \
  --index ./runs/tmp/index_test.json \
  --db ./data/db/test_db.csv \
  --out ./runs/run_digest_fail
```

**预期输出**（应该失败）：

```
[ERROR][cli.match-ocr] Index digest mismatch!
  Expected (index): f8899bc2880d4e9c...
  Actual (DB):      e1adba241615f220...
  Reason: DB files have changed since index was built.
  Fix: Re-run 'ocr-core build-index' or use --allow-stale-index

❌ Failed to match OCR texts:
   Index digest mismatch - DB has changed since index was built
```

#### 6.2 测试宽松模式（应该继续）

```bash
node --enable-source-maps packages/ocr-match-core/dist/cli/match-ocr.js \
  --ocr ./data/ocr_test \
  --index ./runs/tmp/index_test.json \
  --db ./data/db/test_db.csv \
  --out ./runs/run_stale \
  --allow-stale-index
```

**预期输出**（应该成功，带警告）：

```
[WARN][cli.match-ocr] --allow-stale-index is set, skipping digest check

✅ OCR matching completed!
```

**恢复 DB 文件**：

```bash
# 删除测试添加的行，恢复为 5 行
head -6 data/db/test_db.csv > data/db/test_db.csv.tmp
mv data/db/test_db.csv.tmp data/db/test_db.csv
```

---

### 步骤 7: 测试评估工具（可选）

⚠️ **注意**：当前 `configs/sidecar_json/` 中的标注格式与 `eval-sidecar` 期望的格式不匹配，需要转换脚本或更新工具。

**期望的 sidecar 格式**：

```json
{
  "file_name": "andelijituanyouxiangongsi4100968520.txt",
  "ground_truth": {
    "supplier": "安德利集团有限公司",
    "project": "钟家村片老旧小区改造归元寺路、北城巷及南城巷道路和地下空间10KV电力迁改工程"
  }
}
```

**评估命令**（假设有标准格式的 sidecar）：

```bash
node --enable-source-maps packages/ocr-match-core/dist/cli/eval-sidecar.js \
  --results ./runs/run_test_XXX/results.csv \
  --sidecar ./path/to/sidecar_standard.json \
  --out ./runs/run_test_XXX/eval.md
```

**预期输出**：

```
✅ Evaluation completed!
   Output: ./runs/run_test_XXX/eval.md
   Total samples: 222
   Top1 accuracy: 73.7%
   AutoPass accuracy: 95.2%
```

---

## 故障排查

### 问题 1: `No projects matched the filters`

**症状**：
```
pnpm -F @ocr/core build
No projects matched the filters in "/Users/caron/Developer/milk/terminal-gd"
```

**原因**：pnpm filter 使用包名，但 `package.json` 中的 `name` 字段可能不匹配。

**解决**：使用 **path filter** 替代包名：
```bash
pnpm -F ./packages/ocr-match-core build  # ✅ 正确
pnpm -F @ocr/core build                  # ❌ 可能失败
```

或直接进入目录构建：
```bash
cd packages/ocr-match-core && pnpm build
```

---

### 问题 2: `Required columns not found`

**症状**：
```
[ERROR] Required columns not found: s_field1=-1, s_field2=-1
```

**原因**：DB 文件的列名与 `--field1/--field2` 参数不匹配。

**解决**：

1. 检查 DB 文件的列名：
   ```bash
   head -1 data/db/test_db.csv
   # 输出：s_field1,s_field2,extra_data
   ```

2. 确保参数匹配：
   ```bash
   --field1 "s_field1" --field2 "s_field2"
   ```

3. 对于 Excel 文件，使用 `xlsx` 工具检查列名（需要安装 `npm install -g xlsx`）。

---

### 问题 3: `Index digest mismatch`

**症状**：
```
[ERROR] Index digest mismatch!
  Expected (index): f8899bc2880d4e9c...
  Actual (DB):      e1adba241615f220...
```

**原因**：DB 文件在索引构建后发生了修改。

**解决**：

**方案 1**（推荐）：重新构建索引
```bash
node --enable-source-maps packages/ocr-match-core/dist/cli/build-index.js \
  --db ./data/db/test_db.csv \
  --out ./runs/tmp/index_test.json \
  --field1 "s_field1" \
  --field2 "s_field2"
```

**方案 2**（临时）：使用 `--allow-stale-index`
```bash
node --enable-source-maps packages/ocr-match-core/dist/cli/match-ocr.js \
  ... \
  --allow-stale-index
```

---

### 问题 4: 提取质量低

**症状**：
```
[INFO][match.extract] Extracted: q1="安德利集团有限公司钟家村片老旧小区...", q2="..."
```

**原因**：提取阶段混入了无关字段（如工程名混入供应商字段）。

**优化方向**：

1. **增加 noise_words**（在 `configs/vX.Y.Z/<sha>/domain.json` 中）：
   ```json
   {
     "noise_words": ["钟家村", "片", "老旧小区", "改造", ...]
   }
   ```

2. **改进 anchors 修剪**（在 `domain.json` 中）：
   ```json
   {
     "anchors": {
       "project": ["工程", "项目", "建设"]
     }
   }
   ```

3. **更新配置后**，生成新版本并更新 `configs/latest.json`：
   ```bash
   # 创建新版本
   mkdir -p configs/v0.1.2/$(git rev-parse --short HEAD)
   cp configs/v0.labs/f6b7160f/* configs/v0.1.2/$(git rev-parse --short HEAD)/

   # 更新 latest.json
   echo '{
     "path": "configs/v0.1.2/abc123",
     "version": "v0.1.2",
     "sha": "abc123"
   }' > configs/latest.json
   ```

---

### 问题 5: 匹配速度慢

**症状**：
```
Elapsed: 5000ms (22.5ms/file)
```

**优化方向**：

1. **调整 `--max-cand` 参数**（减少召回候选数）：
   ```bash
   --max-cand 1000  # 默认 5000
   ```

2. **启用两阶段过滤**（已默认启用）：
   - Phase 1: Token overlap 预过滤（minOverlap=2）
   - Phase 2: 编辑距离精确排序

3. **检查日志中的召回统计**：
   ```bash
   grep "recalled=" $RUN_DIR/log.jsonl
   # 应显示：recalled=5 (95% reduction)
   ```

---

## 性能基线

**小测试集**（1 个文件，5 行 DB）：
- 索引构建：~2ms
- 匹配：~12ms/文件
- 总耗时：~12ms

**生产规模**（222 个文件，50000 行 DB）：
- 索引构建：~2000ms
- 匹配：~5000ms（~22.5ms/文件）
- 自动通过率：≥70%（目标）

---

## 清理测试输出

```bash
# 清除所有运行包
rm -rf runs/run_*

# 清除索引缓存
rm -rf runs/tmp

# 清除测试数据
rm -rf data/ocr_test

# 验证清理
ls -la runs/  # 应只显示 .keep
```

---

## 下一步

1. **集成到 Electron**：在 `apps/electron-app` 中调用 ocr-match-core 的 API
2. **生成 review.html**：实现单页审查器（表格 + 图像并排显示）
3. **配置训练工具**：添加 `apps/trainer-cli` 生成优化配置
4. **Sidecar 格式转换**：编写脚本转换现有标注到标准格式
5. **性能优化**：进一步优化提取和匹配算法

---

## 参考资料

- [项目结构](./PROJECT_STRUCTURE.md) - Monorepo 架构与目录说明
- [OCR 匹配核心实现](./OCR_MATCH_CORE_IMPLEMENTATION.md) - 算法详细设计
- [CLAUDE.md](../CLAUDE.md) - 项目开发指南
