# Requirements Document

## Introduction

This feature addresses the critical limitation in DB processing where Excel column names vary across different data sources. Currently, the system hardcodes field lookups (`field1Column: "s_field1"`, `field2Column: "s_field2"`), which fails when Excel files use different column names like "订单号" vs "订号", or when column positions vary between files.

**Purpose**: Enable flexible field mapping through configuration, allowing:
- Multiple column name aliases for the same logical field
- Unified mapping between OCR fields and DB fields
- Support for varying column positions across different Excel files
- Clear error messages when expected columns are not found

**Value**: Eliminates hardcoded field dependencies, making the system adaptable to different data sources without code changes.

## Alignment with Product Vision

This aligns with the project's core principle of **configuration immutability** and **data-driven architecture**:
- Extends the existing versioned configuration system (`configs/vX.Y.Z/<sha>/`)
- Maintains the monorepo philosophy of "one source of truth"
- Supports the processing pipeline's flexibility without breaking the immutable run bundle contract

## Requirements

### Requirement 1: Field Mapping Configuration Schema

**User Story:** As a system administrator, I want to define field mappings in a configuration file, so that different Excel column names can be recognized without code changes.

#### Acceptance Criteria

1. WHEN the system loads configuration THEN it SHALL read field mappings from `configs/vX.Y.Z/<sha>/field_mappings.json`
2. IF a field mapping defines multiple `dbAliases` THEN the system SHALL attempt to match any of them
3. WHEN an Excel file is parsed THEN the system SHALL use the first matching alias found in the column headers
4. IF no aliases match THEN the system SHALL throw a clear error listing all attempted aliases

**Configuration Schema Example**:
```json
{
  "version": "1.0",
  "fieldMappings": {
    "project_name": {
      "dbAliases": ["单体工程名称"],
      "ocrField": "工程名称",
      "required": true
    },
    "supplier_name": {
      "dbAliases": ["供应单位名称"],
      "ocrField": "供应商",
      "required": true
    },
    "order_number": {
      "dbAliases": ["订单号", "订号"],
      "ocrField": null,
      "required": false
    }
  },
  "indexedFields": ["project_name", "supplier_name"]
}
```

### Requirement 2: Backward Compatibility with Hardcoded Fields

**User Story:** As a developer, I want existing code using `field1Column` and `field2Column` to continue working, so that the migration to configurable mappings is non-breaking.

#### Acceptance Criteria

1. IF `fieldMappings` configuration is provided THEN it SHALL take precedence over hardcoded parameters
2. IF `fieldMappings` is NOT provided THEN the system SHALL fall back to `field1Column` and `field2Column` parameters
3. WHEN both are missing THEN the system SHALL use default values (`s_field1`, `s_field2`)
4. WHEN migration occurs THEN all existing tests SHALL pass without modification

### Requirement 3: Flexible Column Position Handling

**User Story:** As a data processor, I want the system to locate columns by name regardless of their position, so that Excel files with different column orders can be processed.

#### Acceptance Criteria

1. WHEN parsing Excel headers THEN the system SHALL search for matching aliases across all columns
2. IF multiple files have different column orders THEN each file's columns SHALL be independently matched
3. WHEN a column is found THEN the system SHALL record its index for subsequent row processing
4. IF column positions differ between files in a multi-file DB directory THEN the system SHALL throw an error (column consistency requirement)

### Requirement 4: Clear Error Reporting

**User Story:** As a system operator, I want informative error messages when columns are not found, so that I can quickly identify configuration issues.

#### Acceptance Criteria

1. WHEN a required field's aliases are not found THEN the system SHALL throw an error listing:
   - The standard field name (e.g., `project_name`)
   - All attempted aliases (e.g., `["单体工程名称"]` or `["订单号", "订号"]`)
   - Available columns in the file (first 10 columns + count)
2. WHEN column names mismatch between multi-file DB THEN the error SHALL indicate which file caused the mismatch
3. IF an optional field is not found THEN the system SHALL log a warning but continue processing

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility Principle**:
  - Separate configuration loading from column matching logic
  - Column resolution should be an independent utility function

- **Modular Design**:
  - Field mapping logic should be reusable across different parsers (CSV/Excel)
  - Configuration validation should be a standalone function

- **Dependency Management**:
  - Field mapping configuration should extend existing `NormalizeConfig` structure
  - No changes to run bundle contract (`results.csv` columns remain unchanged)

- **Clear Interfaces**:
  - Define TypeScript types for `FieldMappingConfig` and `FieldMapping`
  - Export column resolution utilities for potential future use

### Performance

- Column alias matching SHALL complete in O(n*m) time where n = number of columns, m = number of aliases (negligible for typical Excel files with <100 columns)
- Configuration loading SHALL happen once per `buildIndex` call

### Security

- Configuration file SHALL be validated against JSON schema to prevent malformed input
- No user-provided regex or eval() in alias matching

### Reliability

- Field mapping configuration SHALL be immutable once written to `configs/vX.Y.Z/<sha>/`
- All column matching SHALL be case-sensitive to avoid ambiguity
- Missing configuration file SHALL NOT crash the system (fallback to hardcoded parameters)

### Usability

- Error messages SHALL be actionable (e.g., "Available columns: ..." helps users identify correct names)
- Configuration example SHALL be included in documentation
- Migration guide SHALL be provided for converting hardcoded parameters to config file
