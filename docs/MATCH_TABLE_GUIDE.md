# match-table CLI 使用指南

## 概述

`match-table` 命令用于对外部业务表格（Excel/CSV）进行批量模糊匹配，将表格中的供应商和工程名称字段与 DB 索引进行匹配，并输出匹配结果。

**典型使用场景**：
- ERP 导出的订单数据需要关联到标准供应商/工程记录
- 人工整理的 Excel 表格，供应商名称有缩写/错别字，需要模糊匹配
- 财务对账表格，需要找到对应的项目记录
- A/B 测试不同配置参数（直接改 CLI 参数，无需重新构建索引）

---

## 快速开始

### 1. 准备索引文件（可选）

**方式 A：自动构建索引**（推荐）

索引不存在时，`match-table` 会自动构建（需要提供 `--db` 参数）：

```bash
# 直接运行，索引不存在会自动构建
pnpm ocr-match-table \
  --input orders.xlsx \
  --supplier-col "供应商名称" \
  --project-col "工程项目" \
  --index ./data/index.json \
  --db ./data/db \
  --out results.csv
```

**方式 B：手动构建索引**

如果你想提前构建索引（例如索引很大，想复用）：

```bash
pnpm ocr-build-index \
  --db ./data/db \
  --config . \
  --out ./data/index.json
```

### 2. 准备输入表格

创建或导出一个包含供应商和工程名称列的表格：

**示例（orders.csv）**：
```csv
供应商名称,工程项目,金额,备注
北京四方继保工程技术有限公司,武汉长江中心B2地块配电工程,500万,紧急
安德利集团有限公司,钟家村片老旧小区改造工程,300万,正常
```

**或 Excel 文件（orders.xlsx）**：
| 供应商名称 | 工程项目 | 金额 | 备注 |
|-----------|---------|------|------|
| 北京四方继保工程技术有限公司 | 武汉长江中心B2地块配电工程 | 500万 | 紧急 |
| 安德利集团有限公司 | 钟家村片老旧小区改造工程 | 300万 | 正常 |

### 3. 运行匹配

**首次运行（自动构建索引）**：

```bash
pnpm ocr-match-table \
  --input orders.xlsx \
  --supplier-col "供应商名称" \
  --project-col "工程项目" \
  --index ./data/index.json \
  --db ./data/db \
  --out results.csv
```

**后续运行（复用已有索引）**：

```bash
pnpm ocr-match-table \
  --input orders.xlsx \
  --supplier-col "供应商名称" \
  --project-col "工程项目" \
  --index ./data/index.json \
  --out results.csv
```

### 4. 查看结果

```bash
cat results.csv
# 或
open results.csv  # macOS
```

**输出示例**：
```csv
供应商名称,工程项目,金额,备注,match_bucket,match_score,match_order_no,match_supplier,match_project,match_mode,match_reason
北京四方继保工程技术有限公司,武汉长江中心B2地块配电工程,500万,紧急,exact,0.95,PO-2024-001,北京四方继保工程技术有限公司,武汉长江中心B2地块配电工程,fast-exact,null
安德利集团有限公司,钟家村片老旧小区改造工程,300万,正常,review,0.78,PO-2024-002,安德利集团有限公司,钟家村片老旧小区改造工程,anchor,DELTA_TOO_SMALL
```

---

## 完整参数说明

### 必选参数

| 参数 | 说明 | 示例 |
|-----|------|------|
| `--input` | 输入表格路径（.csv/.xlsx/.xls） | `orders.xlsx` |
| `--supplier-col` | 供应商列名 | `"供应商名称"` |
| `--project-col` | 工程名称列名 | `"工程项目"` |
| `--index` | 索引文件路径 | `./data/index.json` |
| `--out` | 输出文件路径（.csv/.xlsx） | `results.csv` |

### 可选参数：Excel 多 sheet

| 参数 | 说明 | 默认值 |
|-----|------|-------|
| `--sheet` | Excel sheet 名称 | 第一个 sheet |

**示例**：
```bash
--sheet "订单数据"
```

### 可选参数：配置

| 参数 | 说明 | 默认值 |
|-----|------|-------|
| `--config` | 配置根目录 | 当前目录 |
| `--db` | DB 文件路径（用于 digest 校验） | 无 |
| `--allow-stale-index` | 允许使用过期索引（跳过 digest 校验） | `false` |

**Digest 校验说明**：
- 不提供 `--db` → 跳过校验（假设索引有效）
- 提供 `--db` 且不提供 `--allow-stale-index` → 严格校验（DB 变化则报错）
- 提供 `--db` 和 `--allow-stale-index` → 跳过校验（明确允许过期索引）

### 可选参数：分桶阈值（覆盖配置文件）

| 参数 | 说明 | 配置默认值 |
|-----|------|-----------|
| `--autoPass` | 自动通过阈值 | 0.75 |
| `--minFieldSim` | 最低字段相似度 | 0.60 |
| `--minDeltaTop` | Top1-Top2 最小差值 | 0.03 |
| `--supplierHardMin` | 供应商硬阈值 | 0.58 |
| `--minReview` | Review 最低分 | 0.65 |
| `--weights` | 字段权重（如 "0.7,0.3"） | "0.7,0.3" |

**示例**（调整阈值）：
```bash
--autoPass 0.85 \
--minFieldSim 0.65 \
--weights "0.6,0.4"
```

### 可选参数：输出控制

| 参数 | 说明 | 默认值 |
|-----|------|-------|
| `--include-top3` | 输出 Top3 候选（包含 Top3 订单号） | `false` |
| `--out-format` | 输出格式（csv/xlsx） | 自动推断（根据 `--out` 扩展名） |
| `--log-level` | 日志级别（debug/info/warn/error/silent） | `info` |

---

## 输出字段说明

### 原始列

所有输入表格的列都会完整保留。

### 新增匹配结果列

| 列名 | 说明 | 示例值 |
|-----|------|-------|
| `match_bucket` | 匹配结果分类 | `exact` / `review` / `fail` |
| `match_score` | 匹配得分（0-1） | `0.95` |
| `match_order_no` | DB 订单号（关键！） | `PO-2024-001` |
| `match_supplier` | 匹配到的供应商名称 | `北京四方继保工程技术有限公司` |
| `match_project` | 匹配到的工程名称 | `武汉长江中心B2地块配电工程` |
| `match_mode` | 匹配模式 | `fast-exact` / `anchor` / `recall` |
| `match_reason` | 失败/审核原因 | `DELTA_TOO_SMALL` / `null` |

### 可选 Top3 候选列（`--include-top3`）

| 列名 | 说明 |
|-----|------|
| `match_top2_score` | Top2 得分 |
| `match_top2_order_no` | Top2 订单号 |
| `match_top2_supplier` | Top2 供应商 |
| `match_top2_project` | Top2 工程 |
| `match_top3_score` | Top3 得分 |
| `match_top3_order_no` | Top3 订单号 |
| `match_top3_supplier` | Top3 供应商 |
| `match_top3_project` | Top3 工程 |

---

## 常见使用场景

### 场景 1：基础匹配（CSV 输入/输出）

```bash
pnpm ocr-match-table \
  --input orders.csv \
  --supplier-col "供应商" \
  --project-col "工程" \
  --index ./data/index.json \
  --out results.csv
```

### 场景 2：Excel 多 sheet 处理

```bash
pnpm ocr-match-table \
  --input report.xlsx \
  --sheet "2024年订单" \
  --supplier-col "供应商名称" \
  --project-col "工程项目" \
  --index ./data/index.json \
  --out matched.xlsx
```

### 场景 3：调整阈值进行 A/B 测试

```bash
# 测试更严格的阈值
pnpm ocr-match-table \
  --input orders.csv \
  --supplier-col "供应商" \
  --project-col "工程" \
  --index ./data/index.json \
  --out results_strict.csv \
  --autoPass 0.90 \
  --minFieldSim 0.70

# 测试更宽松的阈值
pnpm ocr-match-table \
  --input orders.csv \
  --supplier-col "供应商" \
  --project-col "工程" \
  --index ./data/index.json \
  --out results_loose.csv \
  --autoPass 0.70 \
  --minFieldSim 0.50
```

### 场景 4：包含 Top3 候选

```bash
pnpm ocr-match-table \
  --input orders.csv \
  --supplier-col "供应商" \
  --project-col "工程" \
  --index ./data/index.json \
  --out results_top3.csv \
  --include-top3
```

### 场景 5：严格 Digest 校验（生产环境）

```bash
pnpm ocr-match-table \
  --input orders.csv \
  --supplier-col "供应商" \
  --project-col "工程" \
  --index ./data/index.json \
  --db ./data/db \
  --out results.csv
```

---

## 故障排查

### 问题 1：列名未找到

**错误信息**：
```
Supplier column "供应商名称" not found in input table.
Available columns: 供应商, 工程项目, 金额
```

**解决方法**：
检查输入表格的实际列名，修改 `--supplier-col` 参数：
```bash
--supplier-col "供应商"  # 而不是 "供应商名称"
```

### 问题 2：订单号列未找到

**警告信息**：
```
[1/100] Order column not found in DB. Tried: 订单号, 订号
```

**解决方法**：
检查 DB 文件的列名，更新 `configs/vX.Y.Z/<sha>/label_alias.json`：
```json
{
  "_dbColumnNames": {
    "order": ["订单号", "订货通知单号", "PO Number"]  // 添加实际列名
  }
}
```

### 问题 3：索引不存在

**错误信息**：
```
Index file not found: ./data/index.json
  To auto-build index, provide --db parameter
  Or manually build index: pnpm ocr-build-index --db <db-path> --out ./data/index.json
```

**解决方法**：
- 方案 1：自动构建索引（推荐）
  ```bash
  # 添加 --db 参数
  pnpm ocr-match-table \
    --input orders.xlsx \
    --supplier-col "供应商名称" \
    --project-col "工程项目" \
    --index ./data/index.json \
    --db ./data/db \
    --out results.csv
  ```
- 方案 2：手动构建索引
  ```bash
  pnpm ocr-build-index --db ./data/db --config . --out ./data/index.json
  ```

### 问题 4：索引 digest 不匹配

**错误信息**：
```
Index digest mismatch!
  Expected (index): abc123...
  Actual (DB):      def456...
```

**解决方法**：
- 方案 1：删除索引，自动重建
  ```bash
  rm ./data/index.json
  pnpm ocr-match-table ... --db ./data/db ...
  ```
- 方案 2：允许使用过期索引（临时方案）
  ```bash
  --allow-stale-index
  ```

### 问题 5：性能慢

**原因**：
- 每次匹配需要回读 DB 文件获取订单号
- 大表格（>1000 行）可能需要 1-2 分钟

**优化建议**：
- 使用 SSD 硬盘（减少 I/O 延迟）
- 分批处理（将大表格拆分为多个小表格）
- 如果不需要订单号，可以考虑不回读（未来可以添加 `--skip-order-no` 参数）

---

## 技术细节

### 数据流

```
输入表格（用户 Excel/CSV）
  供应商        工程名称
  ├─────────┼──────────
  │某某公司 │某某工程  │  ← 只有 2 列（或更多业务列，但没有订单号）
  └─────────┴──────────

         ↓ 匹配

DB 索引（index.json）
  id  f1(供应商)  f2(工程)  source_file    row_index
  ├──┼─────────┼────────┼──────────────┼─────────
  │1 │某某公司  │某某工程 │db.xlsx       │5        │
  └──┴─────────┴────────┴──────────────┴─────────
                                         ↓
                          回到原始 DB 文件读取订单号
                          db.xlsx 第 5 行 → 订单号 = "PO-2024-001"

输出表格（匹配结果）
  用户供应商  用户工程  匹配得分  DB订单号     DB供应商  DB工程
  ├────────┼────────┼────────┼──────────┼────────┼────────
  │某某公司 │某某工程 │0.95    │PO-2024-001│某某公司 │某某工程│
  └────────┴────────┴────────┴──────────┴────────┴────────
```

### 关键特性

1. **自动检测文件格式**：根据 `--input` 扩展名自动选择 CSV 或 Excel 解析器
2. **订单号回读**：根据 `label_alias._dbColumnNames.order` 配置识别 DB 中的订单号列
3. **完整列保留**：输出保留输入表格的所有列（金额、备注等业务字段）
4. **DB 文件缓存**：避免重复读取同一个 DB 文件（性能优化）
5. **可选 digest 校验**：确保索引和 DB 文件同步（生产环境推荐）

---

## 与 match-ocr 的区别

| 特性 | match-ocr | match-table |
|-----|-----------|-------------|
| 输入 | OCR 文本文件（.txt） | 业务表格（.csv/.xlsx） |
| 提取阶段 | ✅ 需要（从文本提取字段） | ❌ 跳过（字段已存在） |
| 匹配阶段 | ✅ 执行 | ✅ 执行 |
| 订单号来源 | 无（OCR 文本中没有） | ✅ 从 DB 回读 |
| 输出格式 | 标准运行包（CSV + manifest + summary） | 简化表格（CSV/Excel） |
| 使用场景 | OCR 图像批量处理 | 业务表格批量匹配 |

---

**最后更新**: 2025-11-21 | **版本**: v0.1.0
