# match-table 快速参考

## 一行命令

```bash
pnpm ocr-match-table \
  --input <表格路径> \
  --supplier-col <供应商列名> \
  --project-col <工程列名> \
  --index <索引路径> \
  --out <输出路径>
```

## 最常用参数

| 参数 | 说明 | 示例 |
|-----|------|------|
| `--input` | 输入表格 | `orders.xlsx` |
| `--supplier-col` | 供应商列名 | `"供应商名称"` |
| `--project-col` | 工程列名 | `"工程项目"` |
| `--index` | 索引文件 | `./data/index.json` |
| `--out` | 输出文件 | `results.csv` |
| `--sheet` | Excel sheet | `"订单数据"` |
| `--include-top3` | 输出 Top3 | |
| `--autoPass` | 调整阈值 | `0.85` |

## 输出关键列

- `match_bucket` - `exact` (自动通过) / `review` (需审核) / `fail` (失败)
- `match_score` - 匹配得分（0-1）
- `match_order_no` - **DB 订单号**（关键）
- `match_supplier` - 匹配到的供应商
- `match_project` - 匹配到的工程

## 常见问题

**列名错误**：检查表格实际列名，修改 `--supplier-col` / `--project-col`

**订单号为空**：检查 `configs/*/label_alias.json` 的 `_dbColumnNames.order` 配置

**索引过期**：重新构建索引 `pnpm ocr-build-index --db ./data/db --out ./data/index.json`

## 完整文档

详见 [MATCH_TABLE_GUIDE.md](./MATCH_TABLE_GUIDE.md)
