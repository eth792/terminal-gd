# 表格匹配 - 3 秒上手

## 最简单的用法

```bash
bash scripts/match-table.sh orders.xlsx
```

**默认列名**：`供应商`、`工程名称`

---

## 自定义列名

```bash
bash scripts/match-table.sh orders.xlsx \
  --supplier-col "供应商名称" \
  --project-col "工程项目"
```

---

## 常用参数

```bash
bash scripts/match-table.sh orders.xlsx \
  --supplier-col "供应商名称" \    # 供应商列名
  --project-col "工程项目" \      # 工程列名
  --sheet "订单数据" \           # Excel sheet 名称
  --out results.csv \           # 输出文件
  --include-top3                # 输出 Top3 候选
```

---

## 查看帮助

```bash
bash scripts/match-table.sh --help
```

---

**详细文档**: [scripts/README_match_table.md](./README_match_table.md)
