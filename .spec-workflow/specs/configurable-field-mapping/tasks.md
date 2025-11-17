# Tasks Document

## Task Breakdown

- [x] 1. Extend LabelAliasConfig schema with _dbColumnNames
  - File: `packages/ocr-match-core/src/config/schema.ts`
  - Add `_dbColumnNames` optional field to `LabelAliasConfigSchema`
  - Define default values for supplier/project/order columns
  - Export updated TypeScript type
  - _Leverage: Existing `LabelAliasConfigSchema` structure (lines 22-28)_
  - _Requirements: R1 (Field Mapping Configuration Schema)_
  - _Prompt:
    ```
    Implement the task for spec configurable-field-mapping. First run spec-workflow-guide to get the workflow guide then implement the task:

    Role: TypeScript Developer specializing in Zod schemas and type systems

    Task: Extend the existing `LabelAliasConfigSchema` in packages/ocr-match-core/src/config/schema.ts to include an optional `_dbColumnNames` field. This field should contain three sub-fields (supplier, project, order) each being an array of strings, with sensible defaults matching the current known column names:
    - supplier: default to ["供应单位名称"]
    - project: default to ["单体工程名称"]
    - order: optional, default to ["订单号", "订号"]

    Restrictions:
    - Do NOT modify existing fields (supplier, project, order arrays)
    - Maintain backward compatibility - _dbColumnNames must be optional
    - Follow existing Zod schema patterns in the file
    - Do not add runtime validation logic, only schema definition

    Leverage:
    - Existing LabelAliasConfigSchema (schema.ts:22-28)
    - Zod patterns used in NormalizeConfigSchema and DomainConfigSchema

    Requirements:
    - R1: Field Mapping Configuration Schema

    Success:
    - Schema compiles without TypeScript errors
    - `_dbColumnNames` field is optional and has correct default values
    - TypeScript type `LabelAliasConfig` correctly infers the new field
    - Existing configs without `_dbColumnNames` still validate successfully

    Instructions:
    1. Before starting, update tasks.md: change this task from `[ ]` to `[-]`
    2. Implement the schema extension
    3. After completion, use log-implementation tool to record:
       - taskId: "1"
       - summary: "Extended LabelAliasConfig schema with _dbColumnNames field"
       - filesModified: ["packages/ocr-match-core/src/config/schema.ts"]
       - statistics: { linesAdded: X, linesRemoved: 0 }
       - artifacts: Include relevant artifact details
    4. Then update tasks.md: change this task from `[-]` to `[x]`
    ```

- [x] 2. Create column resolver utility module
  - File: `packages/ocr-match-core/src/indexer/columnResolver.ts` (new)
  - Implement `resolveColumn()` function for single field resolution
  - Implement `resolveIndexedColumns()` for batch resolution
  - Add descriptive error messages with alias hints
  - _Leverage: None (pure utility logic)_
  - _Requirements: R1, R3, R4_
  - _Prompt:
    ```
    Implement the task for spec configurable-field-mapping. First run spec-workflow-guide to get the workflow guide then implement the task:

    Role: TypeScript Developer specializing in pure functional utilities

    Task: Create a new file packages/ocr-match-core/src/indexer/columnResolver.ts implementing two column resolution functions:

    1. `resolveColumn(headers: string[], aliases: string[], fieldName: string, required: boolean): ColumnResolutionResult | null`
       - Search headers array for any of the aliases (exact match, case-sensitive)
       - Return { index: number, matchedAlias: string } if found
       - If required=true and not found, throw error with:
         - Field name
         - Attempted aliases
         - Available columns (first 10 + total count)
       - If required=false and not found, return null

    2. `resolveIndexedColumns(headers: string[], dbColumnNames: { supplier: string[], project: string[], order?: string[] }): { supplierIdx: number, projectIdx: number, orderIdx: number | null }`
       - Use resolveColumn() for each field
       - supplier and project are required
       - order is optional

    Restrictions:
    - No external dependencies (pure TypeScript)
    - No file I/O or side effects
    - Case-sensitive exact matching only
    - Do not use regex or fuzzy matching

    Leverage:
    - None (standalone utility)

    Requirements:
    - R1: Field Mapping Configuration Schema
    - R3: Flexible Column Position Handling
    - R4: Clear Error Reporting

    Success:
    - Both functions are pure and stateless
    - Error messages are descriptive and actionable
    - TypeScript types are properly exported
    - No runtime dependencies

    Instructions:
    1. Before starting, update tasks.md: change this task from `[ ]` to `[-]`
    2. Create the new columnResolver.ts file
    3. After completion, use log-implementation tool to record:
       - taskId: "2"
       - summary: "Created column resolver utility with resolveColumn and resolveIndexedColumns functions"
       - filesCreated: ["packages/ocr-match-core/src/indexer/columnResolver.ts"]
       - statistics: { linesAdded: X, linesRemoved: 0 }
       - artifacts: {
           functions: [
             {
               name: "resolveColumn",
               purpose: "Resolve single column by aliases with error handling",
               location: "packages/ocr-match-core/src/indexer/columnResolver.ts:X",
               signature: "resolveColumn(headers: string[], aliases: string[], fieldName: string, required: boolean): ColumnResolutionResult | null",
               isExported: true
             },
             {
               name: "resolveIndexedColumns",
               purpose: "Batch resolve supplier/project/order columns",
               location: "packages/ocr-match-core/src/indexer/columnResolver.ts:Y",
               signature: "resolveIndexedColumns(headers, dbColumnNames): { supplierIdx, projectIdx, orderIdx }",
               isExported: true
             }
           ]
         }
    4. Then update tasks.md: change this task from `[-]` to `[x]`
    ```

- [x] 3. Integrate column resolver into buildIndex()
  - File: `packages/ocr-match-core/src/indexer/builder.ts`
  - Add `labelAliasConfig` parameter to `buildIndex()` options
  - Implement priority chain: labelAliasConfig > field1Column/field2Column > defaults
  - Replace hardcoded column lookup (lines 173-185) with `resolveIndexedColumns()`
  - Update DbRow construction to use resolved indices
  - _Leverage: `resolveIndexedColumns()` from columnResolver.ts, existing `parseDbFile()` logic_
  - _Requirements: R1, R2 (Backward Compatibility), R3_
  - _Prompt:
    ```
    Implement the task for spec configurable-field-mapping. First run spec-workflow-guide to get the workflow guide then implement the task:

    Role: Backend Developer with expertise in TypeScript refactoring and API design

    Task: Integrate the column resolver into buildIndex() function in packages/ocr-match-core/src/indexer/builder.ts:

    Changes needed:
    1. Import `resolveIndexedColumns` from './columnResolver.js'
    2. Add `labelAliasConfig?: LabelAliasConfig` to options parameter (line 120)
    3. After parsing columns (line 173), implement priority chain:
       ```typescript
       const dbColumnNames = options.labelAliasConfig?._dbColumnNames ?? {
         supplier: [options.field1Column ?? 's_field1'],
         project: [options.field2Column ?? 's_field2'],
       };
       const { supplierIdx, projectIdx, orderIdx } = resolveIndexedColumns(columns, dbColumnNames);
       ```
    4. Replace existing field1Idx/field2Idx logic (lines 173-185) with resolved indices
    5. Update DbRow construction (lines 198-204) to use supplierIdx/projectIdx

    Restrictions:
    - Maintain backward compatibility - existing calls with field1Column/field2Column must work
    - Do NOT change DbRow structure (f1/f2 fields remain)
    - Do NOT modify parseDbFile() or buildInvertedIndex()
    - Preserve all existing error handling for column mismatch between files

    Leverage:
    - resolveIndexedColumns() from columnResolver.ts (task 2)
    - Existing parseDbFile() logic (builder.ts:397-412)
    - Existing column validation (builder.ts:158-170)

    Requirements:
    - R1: Field Mapping Configuration Schema
    - R2: Backward Compatibility with Hardcoded Fields
    - R3: Flexible Column Position Handling

    Success:
    - buildIndex() accepts labelAliasConfig parameter
    - Priority chain works: config > legacy params > defaults
    - All existing tests pass without modification
    - Column resolution errors are descriptive

    Instructions:
    1. Before starting, update tasks.md: change this task from `[ ]` to `[-]`
    2. Modify builder.ts to integrate column resolver
    3. After completion, use log-implementation tool to record:
       - taskId: "3"
       - summary: "Integrated column resolver into buildIndex with backward-compatible parameter handling"
       - filesModified: ["packages/ocr-match-core/src/indexer/builder.ts"]
       - statistics: { linesAdded: X, linesRemoved: Y }
       - artifacts: {
           integrations: [
             {
               description: "buildIndex now uses resolveIndexedColumns for flexible column lookup with backward compatibility",
               frontendComponent: "N/A",
               backendEndpoint: "buildIndex function",
               dataFlow: "Config priority chain → resolveIndexedColumns → Column indices → DbRow construction"
             }
           ]
         }
    4. Then update tasks.md: change this task from `[-]` to `[x]`
    ```

- [x] 4. Create unit tests for column resolver
  - (Skipped per user approval - use existing end-to-end tests instead)

- [x] 5. Add integration tests for buildIndex() with new config
  - (Skipped per user approval - use existing end-to-end tests instead)
  - _Prompt:
    ```
    Implement the task for spec configurable-field-mapping. First run spec-workflow-guide to get the workflow guide then implement the task:

    Role: QA Engineer with expertise in integration testing and test-driven development

    Task: Extend existing integration tests in packages/ocr-match-core/src/indexer/builder.test.ts to cover the new labelAliasConfig parameter:

    New test cases to add:
    1. Build index with labelAliasConfig._dbColumnNames (new config path)
    2. Build index with legacy field1Column/field2Column (backward compat)
    3. Build index with no config (defaults to s_field1/s_field2)
    4. Priority chain: labelAliasConfig overrides legacy parameters
    5. Error thrown when required column missing (verify error message format)
    6. Warning logged when optional order column missing
    7. Multi-file DB with consistent columns using new config

    Restrictions:
    - Do not modify existing passing tests
    - Use existing test fixtures and utilities
    - Test with real CSV/Excel parsing (not mocked)
    - Verify index structure remains unchanged (no breaking changes)

    Leverage:
    - Existing test setup and fixtures from builder.test.ts
    - Test CSV/Excel files in test fixtures directory
    - Existing assertions for index validation

    Requirements:
    - R1: Field Mapping Configuration Schema
    - R2: Backward Compatibility with Hardcoded Fields
    - R3: Flexible Column Position Handling
    - R4: Clear Error Reporting

    Success:
    - All new tests pass
    - All existing tests still pass (no regressions)
    - Backward compatibility verified
    - Error message format matches R4 specification

    Instructions:
    1. Before starting, update tasks.md: change this task from `[ ]` to `[-]`
    2. Add new test cases to builder.test.ts
    3. After completion, use log-implementation tool to record:
       - taskId: "5"
       - summary: "Extended builder integration tests with 7 new test cases for configurable field mapping"
       - filesModified: ["packages/ocr-match-core/src/indexer/builder.test.ts"]
       - statistics: { linesAdded: X, linesRemoved: 0 }
       - artifacts: {} (tests don't need artifact logging)
    4. Then update tasks.md: change this task from `[-]` to `[x]`
    ```

- [x] 6. Update example configuration files
  - Files: `configs/v0.labs/<sha>/label_alias.json` (example only, not modify existing)
  - Create example `label_alias.json` with `_dbColumnNames` section
  - Document configuration format in comments or README
  - _Leverage: Existing label_alias.json structure_
  - _Requirements: R1_
  - _Prompt:
    ```
    Implement the task for spec configurable-field-mapping. First run spec-workflow-guide to get the workflow guide then implement the task:

    Role: Technical Writer with expertise in configuration documentation

    Task: Create an example configuration file demonstrating the new `_dbColumnNames` field:

    1. Create `configs/example_field_mapping.json` with:
       - All existing fields (supplier, project, order arrays for OCR)
       - New _dbColumnNames section with supplier/project/order
       - Inline comments (if JSON) or companion .md file explaining each field

    2. Document the configuration format explaining:
       - Difference between OCR aliases (supplier, project) and DB column names (_dbColumnNames)
       - When to use each field
       - How defaults work
       - Migration guide from hardcoded parameters

    Restrictions:
    - Do NOT modify existing config files in configs/v0.labs/
    - Create example/reference file only
    - Keep format consistent with existing JSON configs
    - Use actual known column names from requirements

    Leverage:
    - Existing configs/v0.labs/10dae06c/label_alias.json structure
    - Design document configuration examples

    Requirements:
    - R1: Field Mapping Configuration Schema

    Success:
    - Example config file is valid JSON
    - Documentation clearly explains each field
    - Migration guide helps users convert from legacy approach
    - Format matches existing config conventions

    Instructions:
    1. Before starting, update tasks.md: change this task from `[ ]` to `[-]`
    2. Create example config file and documentation
    3. After completion, use log-implementation tool to record:
       - taskId: "6"
       - summary: "Created example configuration file with _dbColumnNames documentation"
       - filesCreated: ["configs/example_field_mapping.json", "configs/FIELD_MAPPING_GUIDE.md"]
       - statistics: { linesAdded: X, linesRemoved: 0 }
       - artifacts: {} (documentation doesn't need artifacts)
    4. Then update tasks.md: change this task from `[-]` to `[x]`
    ```

- [x] 7. Update package exports and type definitions
  - File: `packages/ocr-match-core/src/indexer/index.ts` (if exists)
  - Export `resolveColumn` and `resolveIndexedColumns` utilities
  - Ensure TypeScript type exports are correct
  - _Leverage: Existing export patterns in package_
  - _Requirements: Non-functional (Code Architecture)_
  - _Prompt:
    ```
    Implement the task for spec configurable-field-mapping. First run spec-workflow-guide to get the workflow guide then implement the task:

    Role: TypeScript Developer specializing in module exports and package structure

    Task: Ensure proper exports of new column resolver utilities:

    1. Check if packages/ocr-match-core/src/indexer/index.ts exists
       - If yes: add exports for resolveColumn and resolveIndexedColumns
       - If no: check package.json "exports" field and ensure columnResolver.ts is accessible

    2. Verify TypeScript type definitions:
       - ColumnResolutionResult type is exported
       - Updated LabelAliasConfig type is exported from schema.ts
       - buildIndex() parameter types are correct

    3. Update package README or API docs if needed

    Restrictions:
    - Follow existing export patterns in the package
    - Do not change existing exports (backward compatibility)
    - Ensure tree-shaking compatibility

    Leverage:
    - Existing export structure in packages/ocr-match-core/src/
    - TypeScript module resolution patterns

    Requirements:
    - Non-functional: Code Architecture and Modularity

    Success:
    - Column resolver utilities are importable by package consumers
    - TypeScript types resolve correctly
    - No breaking changes to existing exports
    - Package builds without errors

    Instructions:
    1. Before starting, update tasks.md: change this task from `[ ]` to `[-]`
    2. Update exports and verify package structure
    3. After completion, use log-implementation tool to record:
       - taskId: "7"
       - summary: "Updated package exports to expose column resolver utilities"
       - filesModified: ["packages/ocr-match-core/src/indexer/index.ts"] (or similar)
       - statistics: { linesAdded: X, linesRemoved: 0 }
       - artifacts: {} (exports don't need artifacts)
    4. Then update tasks.md: change this task from `[-]` to `[x]`
    ```

## Task Dependencies

```
1 (Schema) → 2 (Resolver) → 3 (Integration) → 5 (Integration Tests)
                              ↓
                            4 (Unit Tests)

6 (Example Config) - Independent

7 (Exports) - After 2, 3 complete
```

## Completion Criteria

All tasks marked `[x]` and:
- ✅ Schema extended with backward compatibility
- ✅ Column resolver utility created and tested
- ✅ buildIndex() integrated with new config
- ✅ All unit tests pass (>90% coverage for new code)
- ✅ All integration tests pass (no regressions)
- ✅ Example configuration documented
- ✅ Package exports updated
- ✅ Build succeeds: `pnpm -F ./packages/ocr-match-core build`
