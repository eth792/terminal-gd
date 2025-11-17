# Field Mapping Configuration Guide

## Overview

The `label_alias.json` configuration file now supports flexible field mapping for both **OCR text extraction** and **DB column resolution**.

## Configuration Structure

```json
{
  "supplier": ["供应商", "供应单位名称", ...],  // OCR text aliases
  "project": ["工程名称", "单体工程名称", ...],  // OCR text aliases
  "order": ["订单号", "订号", ...],           // OCR text aliases (optional)

  "_dbColumnNames": {                         // DB column name mapping
    "supplier": ["供应单位名称"],
    "project": ["单体工程名称"],
    "order": ["订单号", "订号"]
  }
}
```

## Field Definitions

### OCR Aliases (supplier, project, order)
- **Purpose**: Used during OCR text extraction to identify fields in scanned documents
- **Matching**: Partial string matching in OCR text
- **Example**: `"供应商联系人"` can match text containing "供应商"

### DB Column Names (_dbColumnNames)
- **Purpose**: Used during DB index building to locate columns in Excel/CSV files
- **Matching**: Exact column header matching (case-sensitive)
- **Example**: `"供应单位名称"` must exactly match an Excel column header

## When to Use Each Field

| Scenario | Field Type | Example |
|----------|------------|---------|
| OCR text contains "供应商: XXX公司" | OCR alias | `"supplier": ["供应商", ...]` |
| Excel column header is "供应单位名称" | DB column name | `"_dbColumnNames.supplier": ["供应单位名称"]` |
| Excel might use "订单号" or "订号" | DB column name | `"_dbColumnNames.order": ["订单号", "订号"]` |

## Default Values

If `_dbColumnNames` is not specified, the system falls back to:
- `supplier`: `["供应单位名称"]`
- `project`: `["单体工程名称"]`
- `order`: `["订单号", "订号"]`

## Migration from Hardcoded Parameters

### Before (hardcoded)
```typescript
buildIndex(dbPath, normalizeConfig, {
  field1Column: 's_field1',  // Hardcoded supplier column
  field2Column: 's_field2',  // Hardcoded project column
});
```

### After (configurable)
```typescript
// 1. Update label_alias.json with _dbColumnNames
// 2. Pass labelAliasConfig to buildIndex
buildIndex(dbPath, normalizeConfig, {
  labelAliasConfig: config.label_alias,
});
```

## Priority Chain

The system uses the following priority when resolving DB columns:
1. **labelAliasConfig._dbColumnNames** (preferred)
2. **field1Column / field2Column** (legacy parameters, still supported)
3. **Default values** (`s_field1`, `s_field2`)

## Column Position Flexibility

**Important**: Column positions are **not fixed** across different Excel files. The system resolves columns by name, not by position.

**Example**:
- File A: `[订单号, 供应单位名称, 单体工程名称]` → supplier at index 1
- File B: `[单体工程名称, 供应单位名称, 订单号]` → supplier at index 1 (same field, different position)

The system handles this automatically using column name matching.

## Error Handling

### Missing Required Column
If a required column (supplier or project) is not found:
```
Required field "supplier" not found in Excel columns.
  Attempted aliases: ["供应单位名称"]
  Available columns: 订单号, 物料名称, 计划编号, ... (15 total)

Hint: Update configs/vX.Y.Z/<sha>/label_alias.json with the correct column name.
```

### Missing Optional Column
If an optional column (order) is not found:
- System continues processing
- `orderIdx` will be `null`
- No error thrown

## Example Configuration File

See `example_field_mapping.json` for a complete example with both OCR aliases and DB column mappings.
