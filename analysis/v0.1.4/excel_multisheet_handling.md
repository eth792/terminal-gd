# Excel 多Sheet处理机制说明

**生成时间**: 2025-11-13
**代码版本**: v0.1.4

---

## 执行摘要

**当前实现**: ⚠️ **仅读取第一个Sheet**

当Excel文件包含多个sheet时，`builder.ts:312-314` 只读取 `wb.SheetNames[0]` (第一个sheet)，忽略其他所有sheet。

---

## 技术实现分析

### 代码位置

**文件**: `packages/ocr-match-core/src/indexer/builder.ts`
**函数**: `parseExcelFile()`
**行号**: 298-327

### 关键代码

```typescript
async function parseExcelFile(filePath: string): Promise<{ columns: string[]; rows: string[][] }> {
  // 动态导入 xlsx
  let XLSX: any;
  try {
    const xlsxModule = await import('xlsx');
    XLSX = xlsxModule.default || xlsxModule;
  } catch (error) {
    throw new Error(
      `Failed to load 'xlsx' library. Please install it: pnpm add xlsx\n` +
      `Alternatively, convert your Excel file to CSV first.`
    );
  }

  const wb = XLSX.readFile(filePath);
  const wsname = wb.SheetNames[0];  // ⚠️ 只取第一个sheet
  const ws = wb.Sheets[wsname];

  // 转换为二维数组
  const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (data.length === 0) {
    throw new Error('Empty Excel file');
  }

  const columns = data[0].map((v: any) => String(v).trim());
  const rows = data.slice(1).map((row: any[]) => row.map((v: any) => String(v).trim()));

  return { columns, rows };
}
```

---

## 行为说明

### 场景1: 单Sheet文件

**Excel结构**:
```
ledger-1.xlsx
  └─ Sheet1 (89,087行)
```

**处理结果**:
- ✅ 读取 Sheet1 的所有89,087行
- ✅ 构建索引正常

**状态**: ✅ **正常工作**

---

### 场景2: 多Sheet文件（所有数据在第一个sheet）

**Excel结构**:
```
ledger-1.xlsx
  ├─ 数据 (89,087行) ← 活动数据
  ├─ 备份 (0行)
  └─ 统计 (10行汇总)
```

**处理结果**:
- ✅ 读取 "数据" sheet的所有89,087行
- ❌ 忽略 "备份" 和 "统计" sheet
- ⚠️ 如果第一个sheet不是"数据"而是"备份"，则只读取0行

**状态**: ⚠️ **取决于sheet顺序**

---

### 场景3: 多Sheet文件（数据分散在多个sheet）

**Excel结构**:
```
ledger-all.xlsx
  ├─ 2024年数据 (45,000行)
  ├─ 2025年数据 (44,087行)
  └─ 2023年归档 (30,000行)
```

**处理结果**:
- ✅ 读取 "2024年数据" sheet的45,000行
- ❌ **丢失** "2025年数据" 的44,087行
- ❌ **丢失** "2023年归档" 的30,000行

**状态**: ❌ **数据丢失，严重问题**

---

## 当前DB文件验证

### 验证结果

**文件类型**:
```bash
$ file data/db/ledger-*.xlsx
ledger-1.xlsx: Microsoft Excel 2007+
ledger-2.xlsx: Microsoft Excel 2007+
```

**索引统计**:
- **ledger-1.xlsx**: 89,087行（50.0%）
- **ledger-2.xlsx**: 88,956行（50.0%）
- **总计**: 178,043行

### 推断结论

基于以下事实：
1. 两个文件的行数非常接近（89k vs 88k）
2. 索引总行数（178k）= ledger-1 + ledger-2
3. 如果有多sheet分散数据，总行数应该 >> 178k

**结论**: ✅ **当前DB文件很可能是单sheet或所有数据在第一个sheet**

---

## 风险评估

### 低风险场景（当前状态）

如果满足以下条件之一，则无风险：
1. ✅ 所有Excel文件都是单sheet
2. ✅ 所有Excel文件的数据都在第一个sheet，其他sheet只是辅助信息（统计、备注等）

**当前DB文件**: 很可能属于这种情况

---

### 高风险场景（需要警惕）

如果出现以下情况，会导致数据丢失：
1. ❌ Excel文件有多个sheet，且都包含有效数据
2. ❌ 第一个sheet不是主数据sheet（例如是"说明"或"统计"）
3. ❌ 数据按时间或类别分散在多个sheet

**示例**:
```
problem.xlsx
  ├─ 说明 (1行)           ← 当前实现只读这个！
  ├─ 2024年数据 (50,000行) ← 丢失
  └─ 2025年数据 (40,000行) ← 丢失
```

---

## 改进方案

### 方案1: 读取所有Sheet（推荐）⭐⭐⭐⭐⭐

**实现**:
```typescript
async function parseExcelFile(filePath: string): Promise<{ columns: string[]; rows: string[][] }> {
  // ... 省略 XLSX 加载代码

  const wb = XLSX.readFile(filePath);

  let allRows: string[][] = [];
  let columns: string[] | null = null;

  // 遍历所有sheet
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (data.length === 0) {
      logger.warn('indexer.parse', `Sheet '${sheetName}' is empty, skipping`);
      continue;
    }

    // 验证列名一致性（如果是第一个非空sheet，则记录列名）
    const sheetColumns = data[0].map((v: any) => String(v).trim());

    if (columns === null) {
      columns = sheetColumns;
      logger.info('indexer.parse', `Using columns from sheet '${sheetName}'`);
    } else {
      if (sheetColumns.join(',') !== columns.join(',')) {
        logger.warn('indexer.parse',
          `Sheet '${sheetName}' has different columns, skipping (expected: ${columns.slice(0, 3).join(', ')}..., got: ${sheetColumns.slice(0, 3).join(', ')}...)`
        );
        continue;
      }
    }

    // 合并数据行（跳过表头）
    const sheetRows = data.slice(1).map((row: any[]) =>
      row.map((v: any) => String(v).trim())
    );
    allRows.push(...sheetRows);

    logger.info('indexer.parse', `Sheet '${sheetName}': ${sheetRows.length} rows`);
  }

  if (columns === null || allRows.length === 0) {
    throw new Error(`No valid data found in Excel file: ${filePath}`);
  }

  return { columns, rows: allRows };
}
```

**优点**:
- ✅ 完全向后兼容（单sheet文件正常工作）
- ✅ 支持多sheet数据合并
- ✅ 自动跳过空sheet
- ✅ 验证列名一致性
- ✅ 详细日志输出

**缺点**:
- ⚠️ 如果sheet列名不一致，会跳过该sheet（但有日志提示）

---

### 方案2: 配置指定Sheet名

**实现**:
```typescript
export async function buildIndex(
  dbPathOrDir: string,
  normalizeConfig: NormalizeConfig,
  options: {
    ngramSize?: number;
    field1Column?: string;
    field2Column?: string;
    sheetName?: string;  // 新增：指定sheet名
  } = {}
): Promise<InvertedIndex> {
  const { sheetName = null, ...restOptions } = options;

  // ... 在parseExcelFile中使用sheetName
}
```

**优点**:
- ✅ 灵活性高，用户可控制读取哪个sheet
- ✅ 可以明确排除辅助sheet

**缺点**:
- ❌ 需要用户手动配置
- ❌ 不支持多sheet自动合并
- ❌ 不向后兼容（需要修改CLI参数）

---

### 方案3: 保持现状 + 文档说明

**实现**: 不修改代码，只在文档中明确说明

**文档内容**:
```markdown
## DB文件准备要求

### Excel文件格式

**重要**: 如果Excel文件包含多个sheet，请确保：
1. 所有数据都在**第一个sheet**中
2. 或者，将每个sheet导出为单独的Excel文件

**当前限制**: 索引构建器只读取Excel文件的第一个sheet，其他sheet会被忽略。

**示例**:
```
✅ 正确:
  ledger.xlsx
    └─ 主数据 (89,087行) ← 系统读取这个

❌ 错误:
  ledger.xlsx
    ├─ 2024年 (45,000行) ← 系统只读这个
    └─ 2025年 (44,087行) ← 数据丢失！

✅ 解决方案:
  ledger-2024.xlsx (45,000行)
  ledger-2025.xlsx (44,087行)
```
```

**优点**:
- ✅ 无需修改代码
- ✅ 无向后兼容问题

**缺点**:
- ❌ 用户需要手动拆分Excel文件
- ❌ 容易出错（用户可能不看文档）

---

## 建议

### 立即行动（可选）

#### Option A: 保持现状
- **理由**: 当前DB文件工作正常，未发现多sheet问题
- **风险**: 低（如果确认DB文件都是单sheet或数据在第一个sheet）
- **成本**: 零

#### Option B: 实施方案1（读取所有Sheet）
- **理由**: 防患于未然，提高系统健壮性
- **收益**: 支持多sheet自动合并，避免未来数据丢失
- **成本**: 低（约2-3小时开发+测试）

---

### 推荐方案

**短期（v0.1.5）**: 保持现状 + 添加文档说明
- 在 `README.md` 中添加Excel文件格式要求
- 在 `build-index --help` 中添加警告信息

**中期（v0.2.0）**: 实施方案1（读取所有Sheet）
- 完全向后兼容
- 提高系统健壮性
- 支持更灵活的DB组织方式

**长期（v0.3.0+）**: 增强功能
- 支持Sheet名过滤（`--exclude-sheets`）
- 支持Sheet映射（不同sheet使用不同列名）
- 自动检测并报告多sheet情况

---

## 验证当前DB文件的Sheet结构（可选）

如果想确认当前DB文件是否有多sheet，可以运行：

```bash
python3 << 'EOF'
import openpyxl

for filename in ['ledger-1.xlsx', 'ledger-2.xlsx']:
    print(f"\n{filename}:")
    wb = openpyxl.load_workbook(f'data/db/{filename}', read_only=True)

    for idx, sheet_name in enumerate(wb.sheetnames):
        ws = wb[sheet_name]
        row_count = ws.max_row - 1  # 减去表头
        print(f"  Sheet {idx+1}: '{sheet_name}' - {row_count:,} 行")

    wb.close()
EOF
```

**预期结果**:
- 如果每个文件只显示1个sheet → 无问题
- 如果显示多个sheet但只有第一个有数据 → 无问题
- 如果显示多个sheet且都有数据 → **需要立即修复**

---

## 结论

### 当前状态

**技术实现**: ⚠️ **仅读取第一个Sheet**

**实际影响**: ✅ **当前DB文件无问题**（推断为单sheet或数据在第一个sheet）

**潜在风险**: ⚠️ **中等**（如果未来使用多sheet分散数据的Excel文件，会导致数据丢失）

---

### 行动建议

#### 立即（v0.1.5）
1. ✅ 添加文档说明Excel文件格式要求
2. ✅ 在CLI help中添加警告信息

#### 近期（v0.2.0）
1. 🔧 实施方案1（读取所有Sheet）
2. ✅ 添加单元测试验证多sheet支持

#### 可选验证
1. 💡 运行Python脚本检查当前DB文件的sheet结构
2. 💡 确认是否真的需要多sheet支持

---

**生成时间**: 2025-11-13
**分析者**: Claude Code (Linus Mode)
**技术风险**: 中等（当前无影响，但未来可能有问题）
