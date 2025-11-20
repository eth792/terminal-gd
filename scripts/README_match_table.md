# 傻瓜式表格匹配脚本使用指南

## 快速开始

### 最简单的用法（默认列名）

如果你的表格列名是 **`供应商`** 和 **`工程名称`**：

```bash
bash scripts/match-table.sh orders.xlsx
```

**就这么简单！** 脚本会自动：
1. 使用默认列名（供应商、工程名称）
2. 检测列名并提示确认
3. 自动构建索引（如果不存在）
4. 输出结果到 `runs/matched_<时间戳>.csv`

---

## 自定义列名

### 场景 1：列名不是默认的

你的表格列名是 **`供应商名称`** 和 **`工程项目`**：

```bash
bash scripts/match-table.sh orders.xlsx \
  --supplier-col "供应商名称" \
  --project-col "工程项目"
```

---

### 场景 2：Excel 多 sheet

你的 Excel 有多个 sheet，需要匹配 **"订单数据"** 这个 sheet：

```bash
bash scripts/match-table.sh orders.xlsx \
  --sheet "订单数据"
```

---

### 场景 3：自定义输出路径

```bash
bash scripts/match-table.sh orders.xlsx \
  --out results/my_results.csv
```

---

### 场景 4：完整参数

```bash
bash scripts/match-table.sh orders.xlsx \
  --supplier-col "供应商名称" \
  --project-col "工程项目" \
  --sheet "订单数据" \
  --out results/matched.xlsx \
  --include-top3
```

---

## 参数说明

| 参数 | 说明 | 默认值 | 示例 |
|-----|------|-------|------|
| `<输入文件>` | 输入表格路径（必选） | - | `orders.xlsx` |
| `--supplier-col` | 供应商列名 | `供应商` | `"供应商名称"` |
| `--project-col` | 工程名称列名 | `工程名称` | `"工程项目"` |
| `--sheet` | Excel sheet 名称 | 第一个 sheet | `"订单数据"` |
| `--out` | 输出文件路径 | `data/matched_<时间戳>.csv` | `results/output.csv` |
| `--index` | 索引文件路径 | `data/index.json` | `data/my_index.json` |
| `--db` | DB 文件路径 | `data/db` | `data/db.xlsx` |
| `--include-top3` | 输出 Top3 候选 | 不输出 | `--include-top3` |
| `--autoPass` | 自动通过阈值 | `0.75` | `--autoPass 0.85` |

---

## 智能列名检测

脚本会自动检测输入文件的列名：

### CSV 文件

```bash
bash scripts/match-table.sh orders.csv
```

**输出**：
```
正在检查输入文件的列名...
检测到的列名：
  1  供应商名称
  2  工程项目
  3  金额
  4  备注

如果列名不匹配，按 Ctrl+C 取消，然后重新运行：
  bash scripts/match-table.sh orders.csv --supplier-col "供应商名称" --project-col "工程项目"

按回车继续...
```

### Excel 文件

Excel 文件无法自动读取列名（需要依赖库），脚本会提示你确认：

```
Excel 文件，无法自动检测列名
如果列名不匹配，请使用 --supplier-col 和 --project-col 参数

如果列名不匹配，按 Ctrl+C 取消，然后重新运行：
  bash scripts/match-table.sh orders.xlsx --supplier-col "实际列名" --project-col "实际列名"

按回车继续...
```

---

## 常见问题

### 问题 1：列名不匹配

**错误信息**：
```
Supplier column "供应商" not found in input table.
Available columns: 供应商名称, 工程项目, 金额
```

**解决方法**：
使用 `--supplier-col` 和 `--project-col` 参数：
```bash
bash scripts/match-table.sh orders.xlsx \
  --supplier-col "供应商名称" \
  --project-col "工程项目"
```

---

### 问题 2：索引不存在

脚本会自动构建索引（需要 `data/db` 目录存在）：

```
Index not found: data/index.json
Auto-building index from DB: data/db
Using columns: field1="供应单位名称", field2="单体工程名称"
Building index...
✓ Index built and saved to: data/index.json
```

如果 `data/db` 不存在，会报错：
```
❌ 错误：DB 路径不存在: data/db
```

**解决方法**：
检查 DB 文件路径，或使用 `--db` 参数指定：
```bash
bash scripts/match-table.sh orders.xlsx --db path/to/db.xlsx
```

---

### 问题 3：输出文件已存在

脚本会自动生成带时间戳的文件名（不会覆盖）：
```
data/matched_20251121_143052.csv
data/matched_20251121_143125.csv
data/matched_20251121_143201.csv
```

如果想指定固定文件名：
```bash
bash scripts/match-table.sh orders.xlsx --out results/fixed_name.csv
```

---

## 高级用法

### 调整匹配阈值

```bash
bash scripts/match-table.sh orders.xlsx \
  --autoPass 0.85 \
  --minFieldSim 0.65
```

### 输出 Top3 候选

```bash
bash scripts/match-table.sh orders.xlsx \
  --include-top3
```

### 使用自定义索引

```bash
bash scripts/match-table.sh orders.xlsx \
  --index my_custom_index.json \
  --db data/db
```

---

## 与底层 CLI 的对应关系

脚本会自动调用底层 CLI 命令：

```bash
# 脚本命令
bash scripts/match-table.sh orders.xlsx --supplier-col "供应商名称"

# 等价于
pnpm ocr-match-table \
  --input orders.xlsx \
  --supplier-col "供应商名称" \
  --project-col "工程名称" \
  --index data/index.json \
  --db data/db \
  --out data/matched_<时间戳>.csv \
  --config .
```

**脚本的价值**：
1. ✅ 默认参数（无需每次输入）
2. ✅ 智能列名检测
3. ✅ 自动生成输出文件名
4. ✅ 友好的错误提示
5. ✅ 彩色输出和进度提示

---

## 完整示例

### 示例 1：最简单（默认列名）

```bash
bash scripts/match-table.sh orders.xlsx
```

### 示例 2：自定义列名

```bash
bash scripts/match-table.sh orders.xlsx \
  --supplier-col "供应商名称" \
  --project-col "工程项目"
```

### 示例 3：Excel 多 sheet

```bash
bash scripts/match-table.sh report.xlsx \
  --sheet "2024年订单" \
  --supplier-col "供应商" \
  --project-col "工程"
```

### 示例 4：自定义输出 + Top3

```bash
bash scripts/match-table.sh orders.xlsx \
  --out results/matched.xlsx \
  --include-top3
```

### 示例 5：完整参数

```bash
bash scripts/match-table.sh orders.xlsx \
  --supplier-col "供应商名称" \
  --project-col "工程项目" \
  --sheet "订单数据" \
  --out results/matched.csv \
  --index data/index.json \
  --db data/db \
  --include-top3 \
  --autoPass 0.85
```

---

## 查看帮助

```bash
bash scripts/match-table.sh --help
```

---

**最后更新**: 2025-11-21 | **脚本路径**: `scripts/match-table.sh`
