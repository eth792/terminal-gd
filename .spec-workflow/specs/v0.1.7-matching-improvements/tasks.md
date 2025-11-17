# Tasks Document

## Phase 1: Data Structure Fix (Configuration Files)

- [ ] 1.1 Create v0.1.7 configuration directory structure
  - Files: `configs/v0.1.7/<sha>/` directory
  - Create new config version directory with SHA hash
  - Copy `normalize.user.json` from v0.labs as base
  - Purpose: Establish new immutable configuration version
  - _Leverage: `configs/v0.labs/e7bef887/` as reference_
  - _Requirements: A1 (Configuration Immutability)_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer specializing in configuration management | Task: Create new configuration directory `configs/v0.1.7/<sha>/` following configuration immutability principle from requirement A1, copying normalize.user.json from v0.labs/e7bef887 | Restrictions: NEVER modify configs/v0.labs/e7bef887/, use git hash as SHA identifier, maintain same directory structure | Success: New directory exists with normalize.user.json copied, git hash calculated for SHA, v0.labs remains untouched | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (filesCreated, statistics), then mark task as complete [x] in tasks.md_

- [ ] 1.2 Create cleaned label_alias.json
  - File: `configs/v0.1.7/<sha>/label_alias.json`
  - Remove noise field labels (供应商联系人, 供应单位名称, etc.)
  - Keep only extraction target labels and OCR error variants
  - Purpose: Eliminate configuration pollution causing extraction errors
  - _Leverage: Grep validation results (202/222 for 供应商, 207/222 for 工程名称)_
  - _Requirements: A1 (Label Alias Configuration Cleanup)_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Data Engineer with OCR domain expertise | Task: Create cleaned label_alias.json following requirement A1, removing 供应商联系人 (noise field despite 188/222 frequency), keeping 供应商 (202/222), 工程名称 (207/222), and OCR variants like 供应尚, 侯应商, 工理名称, 工程名杆, T.程名称, 丁程名称 | Restrictions: Only include extraction TARGET fields, not all document fields, verify each label against grep validation results, include _dbColumnNames for DB mapping | Success: JSON validates, contains only supplier/project arrays with valid labels, no noise fields like 供应商联系人 or 采购订单供应商 | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (filesCreated, statistics), then mark task as complete [x] in tasks.md_

- [ ] 1.3 Create extended domain.json with document field labels
  - File: `configs/v0.1.7/<sha>/domain.json`
  - Add `document_field_labels` array (项目管理单位, 报装编号, etc.)
  - Add `table_header_keywords` array (序号, 物资名称, 单位, etc.)
  - Keep existing anchors and noise_words
  - Purpose: Enable extraction boundary detection
  - _Leverage: `configs/v0.labs/e7bef887/domain.json` as base_
  - _Requirements: A2 (Document Field Labels Exclusion), A3 (Table Body Truncation)_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Domain Expert in OCR document structure | Task: Create extended domain.json following requirements A2 and A3, adding document_field_labels (项目管理单位 199/222, 报装编号 206/222, 供应商联系人, etc.) and table_header_keywords (序号 199/222, 物资名称 197/222, 单位, etc.) | Restrictions: Maintain existing anchors.project and noise_words arrays unchanged, document_field_labels are fields to STOP at (not extract), table_header_keywords need 2+ matches to trigger | Success: JSON validates, document_field_labels contains 12+ noise field labels, table_header_keywords contains 6+ table header indicators | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (filesCreated, statistics), then mark task as complete [x] in tasks.md_

- [ ] 1.4 Create new bucketize.json configuration file
  - File: `configs/v0.1.7/<sha>/bucketize.json`
  - Define supplierHardMin=0.58, autoPass=0.75, minReview=0.65
  - Define weights=[0.7, 0.3] (supplier 70%, project 30%)
  - Keep minFieldSim=0.60, minDeltaTop=0.03
  - Purpose: Externalize threshold configuration
  - _Leverage: Design document threshold specifications_
  - _Requirements: B1 (Hard Supplier Threshold), B2 (Supplier-Weighted Scoring), B3 (Raised Score Thresholds)_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Configuration Architect with matching algorithm expertise | Task: Create bucketize.json following requirements B1, B2, B3 with supplierHardMin=0.58, autoPass=0.75, minReview=0.65, weights=[0.7, 0.3], minFieldSim=0.60, minDeltaTop=0.03 | Restrictions: Ensure supplierHardMin <= minReview <= autoPass (validation constraint), weights must sum to 1.0, use exact values from design document | Success: JSON validates, constraints satisfied (0.58 <= 0.65 <= 0.75, 0.7+0.3=1.0), all threshold values present | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (filesCreated, statistics), then mark task as complete [x] in tasks.md_

- [ ] 1.5 Update latest.json pointer to new configuration
  - File: `configs/latest.json`
  - Update path to `configs/v0.1.7/<sha>`
  - Update version to `v0.1.7`
  - Update sha to new config hash
  - Purpose: Switch active configuration to new version
  - _Leverage: Existing latest.json structure_
  - _Requirements: A1 (Configuration Versioning)_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Release Engineer managing configuration pointers | Task: Update configs/latest.json to point to new v0.1.7 configuration following requirement A1, updating path, version, and sha fields | Restrictions: Keep same JSON structure, use ISO 8601 format for created_at timestamp, verify target directory exists before updating | Success: latest.json points to v0.1.7/<sha>, can load new config via latest pointer, old v0.labs config still accessible via explicit path | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (filesModified, statistics), then mark task as complete [x] in tasks.md_

- [ ] 1.6 Phase 1 Validation: Sidecar extraction accuracy test
  - Files: Test execution (no code changes)
  - Run extraction test on 19 sidecar-annotated files
  - Compare extracted fields with ground truth
  - Verify accuracy >= 85% before proceeding
  - Purpose: Validate configuration changes don't break extraction
  - _Leverage: `configs/sidecar_json/*.json` as ground truth_
  - _Requirements: A5 (Extraction Validation with Sidecar Ground Truth)_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with OCR validation expertise | Task: Run extraction test on 19 sidecar files following requirement A5, loading new config, extracting supplier/project from OCR text, comparing with sidecar fields | Restrictions: Use new v0.1.7 config, test extraction ONLY (not matching), report failures with details (expected vs actual), no proceeding if accuracy < 85% | Success: 19 files tested, accuracy >= 85% (17/19 correct), detailed report showing any mismatches with line numbers and extracted values | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (functions for test execution, statistics for test results), then mark task as complete [x] in tasks.md_

## Phase 2: Schema Extension (Type Definitions)

- [ ] 2.1 Extend DomainConfigSchema with new fields
  - File: `packages/ocr-match-core/src/config/schema.ts`
  - Add `document_field_labels: z.array(z.string()).default([])`
  - Add `table_header_keywords: z.array(z.string()).default([])`
  - Maintain backward compatibility with default empty arrays
  - Purpose: Type-safe configuration for extraction boundaries
  - _Leverage: Existing DomainConfigSchema pattern_
  - _Requirements: A2 (Document Field Labels), A3 (Table Body Truncation)_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Developer with Zod schema expertise | Task: Extend DomainConfigSchema following requirements A2 and A3, adding document_field_labels and table_header_keywords arrays with default empty arrays for backward compatibility | Restrictions: Use z.array(z.string()).default([]) pattern, maintain existing fields (anchors, noise_words, stopwords) unchanged, ensure TypeScript strict mode passes | Success: Schema compiles, DomainConfig type includes new fields, old configs without new fields load with defaults | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (filesModified, statistics), then mark task as complete [x] in tasks.md_

- [ ] 2.2 Create BucketizeConfigSchema with validation refinements
  - File: `packages/ocr-match-core/src/config/schema.ts`
  - Define BucketizeConfigSchema with all threshold fields
  - Add refinement: `supplierHardMin <= minReview <= autoPass`
  - Add refinement: `weights[0] + weights[1] = 1.0`
  - Purpose: Type-safe bucketization configuration with business rules
  - _Leverage: Existing schema patterns with z.refine()_
  - _Requirements: B1 (Hard Supplier Threshold), B2 (Weights), B3 (Thresholds)_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Developer with schema validation expertise | Task: Create BucketizeConfigSchema following requirements B1, B2, B3 with supplierHardMin, autoPass, minReview, minFieldSim, minDeltaTop, weights fields and refine() validations for threshold ordering and weight sum | Restrictions: Use z.number().min(0).max(1) for thresholds, z.tuple([z.number(), z.number()]) for weights, Math.abs(sum - 1.0) < 0.001 for float comparison | Success: Schema compiles, invalid configs (wrong order or weight sum) throw ZodError, valid configs parse correctly | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (filesModified, statistics), then mark task as complete [x] in tasks.md_

- [ ] 2.3 Update FullConfig type to include BucketizeConfig
  - File: `packages/ocr-match-core/src/config/schema.ts`
  - Add bucketize: BucketizeConfig to FullConfig interface
  - Export BucketizeConfig type
  - Purpose: Complete type system for all configuration
  - _Leverage: Existing FullConfig interface_
  - _Requirements: Configuration type safety_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Developer with module architecture expertise | Task: Update FullConfig interface to include optional bucketize field for backward compatibility, export BucketizeConfig type | Restrictions: Make bucketize optional with ? to not break existing code, update type inference to handle optional field, maintain all existing fields | Success: FullConfig includes bucketize?: BucketizeConfig, type exports correctly, existing code compiles without changes | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (filesModified, statistics), then mark task as complete [x] in tasks.md_

- [ ] 2.4 Extend config/load.ts to load bucketize.json
  - File: `packages/ocr-match-core/src/config/load.ts`
  - Load `bucketize.json` from config directory
  - Provide DEFAULT_BUCKETIZE_CONFIG if file not found
  - Validate with BucketizeConfigSchema
  - Purpose: Load new configuration at runtime
  - _Leverage: Existing loadConfig pattern_
  - _Requirements: Configuration loading with graceful degradation_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with config management expertise | Task: Extend loadConfig function to optionally load bucketize.json using same pattern as domain.json, returning defaults if not found for backward compatibility | Restrictions: Log warning if file not found (don't throw), use BucketizeConfigSchema.parse() for validation, maintain existing load behavior | Success: New v0.1.7 configs load bucketize.json, old v0.labs configs return defaults, validation errors logged with fallback to defaults | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (filesModified, functions created, statistics), then mark task as complete [x] in tasks.md_

- [ ] 2.5 Phase 2 Validation: TypeScript compilation and schema tests
  - Files: Test execution
  - Run `pnpm -F ./packages/ocr-match-core build`
  - Verify zero TypeScript errors
  - Test schema validation with valid/invalid configs
  - Purpose: Ensure type system changes don't break build
  - _Leverage: Existing build scripts_
  - _Requirements: TypeScript strict mode compliance_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Build Engineer with TypeScript CI/CD expertise | Task: Validate Phase 2 changes by running TypeScript build and testing schema validation, ensuring zero compilation errors and proper schema behavior | Restrictions: Must pass TypeScript strict mode, test both valid and invalid config parsing, no any types introduced | Success: pnpm build completes without errors, valid configs parse correctly, invalid configs (wrong threshold order, weight sum != 1.0) throw ZodError with clear messages | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (statistics for build results), then mark task as complete [x] in tasks.md_

## Phase 3: Extraction Logic Simplification

- [ ] 3.1 Create shouldStopLookup helper function
  - File: `packages/ocr-match-core/src/extract/extractor.ts`
  - Implement triple-check mechanism (other field label + noise label + entity word ending)
  - Return boolean indicating whether to stop lookup
  - Purpose: Replace inline nested conditions with single function
  - _Leverage: Design document shouldStopLookup specification_
  - _Requirements: A4 (Cross-Field Exclusion Enhancement)_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Algorithm Developer with text processing expertise | Task: Create shouldStopLookup(line, currentFieldLabels, allFieldLabels, documentFieldLabels) function following requirement A4, implementing triple-check: 1) has other field label, 2) has document field label, 3) ends with entity word (公司/有限/集团) | Restrictions: Function must be < 20 lines, return boolean only, no side effects, handle empty arrays gracefully | Success: Function returns true for lines with other labels/noise labels/entity endings, returns false for normal continuation lines, single responsibility maintained | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (functions created with signature and location, filesModified, statistics), then mark task as complete [x] in tasks.md_

- [ ] 3.2 Create isTableHeader helper function
  - File: `packages/ocr-match-core/src/extract/extractor.ts`
  - Check if line contains 2+ table header keywords
  - Return boolean for table boundary detection
  - Purpose: Stop extraction at table body
  - _Leverage: domain.table_header_keywords configuration_
  - _Requirements: A3 (Table Body Truncation)_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Algorithm Developer with document structure expertise | Task: Create isTableHeader(line, keywords) function following requirement A3, counting keyword matches and returning true if count >= 2 | Restrictions: Function must be < 15 lines, simple keyword includes check, threshold is 2 (not 1) to avoid false positives | Success: Returns true for "序号 物资名称 单位 规格型号" (3 matches), returns false for "序号：12345" (1 match), handles empty keywords array | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (functions created, filesModified, statistics), then mark task as complete [x] in tasks.md_

- [ ] 3.3 Refactor extractField to use new helper functions
  - File: `packages/ocr-match-core/src/extract/extractor.ts`
  - Replace inline conditionals with shouldStopLookup() calls
  - Add isTableHeader() check in downward lookup
  - Load document_field_labels and table_header_keywords from config
  - Purpose: Reduce nesting and improve readability
  - _Leverage: New helper functions from 3.1 and 3.2_
  - _Requirements: A2, A3, A4 integration_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Refactoring Expert with clean code expertise | Task: Refactor extractField() to use shouldStopLookup() and isTableHeader() helpers, reducing from 86 lines to <= 50 lines, eliminating 6-level nesting | Restrictions: Maintain same extraction logic semantics, load new config fields with defaults for backward compatibility, ensure all existing tests pass | Success: extractField() is <= 50 lines, max 3-level nesting, uses helper functions consistently, existing extraction behavior preserved | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (functions modified, statistics showing line reduction, filesModified), then mark task as complete [x] in tasks.md_

- [ ] 3.4 Update extract function signature to pass all field labels
  - File: `packages/ocr-match-core/src/extract/extractor.ts`
  - Pass all labels (supplier + project) to extractField for cross-field checking
  - Pass document_field_labels for noise field detection
  - Pass table_header_keywords for table boundary detection
  - Purpose: Enable complete boundary checking
  - _Leverage: ExtractConfig interface_
  - _Requirements: A2, A3, A4 integration_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: API Designer with function signature expertise | Task: Update extract() to pass additional parameters to extractField(), including all field labels and new config arrays | Restrictions: Maintain backward compatibility with default empty arrays, update ExtractConfig if needed, ensure TypeScript types match | Success: extractField receives all labels for cross-checking, new config fields passed correctly, existing callers don't break | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (functions modified, filesModified, statistics), then mark task as complete [x] in tasks.md_

- [ ] 3.5 Phase 3 Validation: 20-sample extraction test
  - Files: Test execution
  - Run extraction test on 20 diverse samples
  - Verify EXTRACT_EMPTY cases don't increase
  - Check for mis-extraction cases (extracting wrong field content)
  - Purpose: Validate extraction logic changes
  - _Leverage: Existing test samples_
  - _Requirements: Extraction accuracy maintenance_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with regression testing expertise | Task: Run extraction tests on 20 samples (include known edge cases from EXTRACT_EMPTY analysis), verify no increase in empty extractions and no cross-field contamination | Restrictions: Compare with baseline extraction results, report any new failures immediately, stop if EXTRACT_EMPTY increases > 2 cases | Success: 20 samples tested, EXTRACT_EMPTY count <= baseline, no mis-extractions detected, detailed comparison report generated | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (statistics for test results), then mark task as complete [x] in tasks.md_

## Phase 4: Bucketizer Simplification

- [ ] 4.1 Add new failure reason enums
  - File: `packages/ocr-match-core/src/bucket/reasons.ts`
  - Add `SUPPLIER_HARD_REJECT = 'SUPPLIER_HARD_REJECT'`
  - Add `SCORE_TOO_LOW = 'SCORE_TOO_LOW'`
  - Add `SCORE_BORDERLINE = 'SCORE_BORDERLINE'`
  - Keep existing reasons for backward compatibility
  - Purpose: Clear failure categorization
  - _Leverage: Existing FailReason enum_
  - _Requirements: B4 (Eliminate SUPPLIER_DIFF_SAME_PROJECT Reason)_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Type System Developer with enum expertise | Task: Add new failure reason enums to FailReason following requirement B4, keeping existing values for backward compatibility | Restrictions: Do NOT remove SUPPLIER_DIFF_SAME_PROJECT yet (do that in 4.4), use string literal values, maintain enum ordering | Success: Three new enums added, TypeScript compiles, existing code continues to work, new reasons have clear semantic meaning | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (filesModified, statistics), then mark task as complete [x] in tasks.md_

- [ ] 4.2 Create applySupplierHardThreshold helper function
  - File: `packages/ocr-match-core/src/bucket/bucketize.ts`
  - Simple comparison: `f1_score >= supplierHardMin`
  - Return boolean
  - Purpose: Isolate hard threshold logic
  - _Leverage: Design document specification_
  - _Requirements: B1 (Hard Supplier Threshold)_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Algorithm Developer with threshold logic expertise | Task: Create applySupplierHardThreshold(f1_score, supplierHardMin) returning boolean following requirement B1, simple >= comparison | Restrictions: Function must be <= 5 lines, pure function with no side effects, handle edge case where f1_score equals threshold (should pass) | Success: Returns true for f1_score >= supplierHardMin, false otherwise, handles boundary values correctly | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (functions created, filesModified, statistics), then mark task as complete [x] in tasks.md_

- [ ] 4.3 Create calculateWeightedScore helper function
  - File: `packages/ocr-match-core/src/bucket/bucketize.ts`
  - Calculate: `weights[0] * f1_score + weights[1] * f2_score`
  - Return number
  - Purpose: Isolate score calculation
  - _Leverage: Design document specification_
  - _Requirements: B2 (Supplier-Weighted Scoring)_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Algorithm Developer with scoring logic expertise | Task: Create calculateWeightedScore(f1_score, f2_score, weights) returning weighted sum following requirement B2 | Restrictions: Function must be <= 5 lines, weights is [number, number] tuple, no rounding (return exact float) | Success: Returns correct weighted average (e.g., 0.7*0.62 + 0.3*0.96 = 0.722), handles [0.5, 0.5] correctly for backward compatibility testing | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (functions created, filesModified, statistics), then mark task as complete [x] in tasks.md_

- [ ] 4.4 Refactor bucketize to use new logic and remove SUPPLIER_DIFF_SAME_PROJECT
  - File: `packages/ocr-match-core/src/bucket/bucketize.ts`
  - Remove Rule 3.5 (SUPPLIER_DIFF_SAME_PROJECT hack)
  - Add hard threshold check before scoring
  - Use weighted score calculation
  - Apply new thresholds (autoPass=0.75, minReview=0.65)
  - Purpose: Pure score-based bucketing
  - _Leverage: New helper functions and BucketConfig_
  - _Requirements: B1, B2, B3, B4 integration_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Refactoring Expert with matching algorithm expertise | Task: Refactor bucketize() to remove SUPPLIER_DIFF_SAME_PROJECT logic (lines 54-62), add hard threshold check using applySupplierHardThreshold(), use calculateWeightedScore() for scoring, apply new thresholds from config | Restrictions: Load config.supplierHardMin, config.autoPass, config.minReview, config.weights from BucketConfig, maintain other rules (EXTRACT_EMPTY, NO_CANDIDATES, etc.), reduce from 7 rules to 5 | Success: SUPPLIER_DIFF_SAME_PROJECT logic deleted, hard threshold applied first, weighted scoring used, bucketize() is <= 60 lines with <= 5 rules | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (functions modified, filesModified, statistics showing line count and rule reduction), then mark task as complete [x] in tasks.md_

- [ ] 4.5 Update BucketConfig interface to match new schema
  - File: `packages/ocr-match-core/src/bucket/bucketize.ts`
  - Add supplierHardMin, minReview, weights to BucketConfig interface
  - Update DEFAULT_BUCKET_CONFIG with new defaults
  - Purpose: Type consistency between config and runtime
  - _Leverage: BucketizeConfigSchema from schema.ts_
  - _Requirements: Type safety for bucketization_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Developer with interface design expertise | Task: Update BucketConfig interface to match BucketizeConfigSchema, add supplierHardMin, minReview, weights fields, update DEFAULT_BUCKET_CONFIG with v0.1.7 values | Restrictions: Maintain backward compatibility by keeping existing fields, make new fields have defaults in DEFAULT_BUCKET_CONFIG, ensure type compatibility with schema | Success: Interface matches schema definition, DEFAULT_BUCKET_CONFIG has all new values, TypeScript compiles | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (filesModified, statistics), then mark task as complete [x] in tasks.md_

- [ ] 4.6 Phase 4 Validation: Full test with new thresholds
  - Files: Test execution
  - Run complete test on 222 files with new config
  - Verify auto_pass_rate >= 37% (vs 32% baseline)
  - Verify SUPPLIER_DIFF_SAME_PROJECT = 0 cases
  - Purpose: Validate threshold optimization achieves KPI targets
  - _Leverage: `pnpm test:full`_
  - _Requirements: All Part B requirements validation_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with full system testing expertise | Task: Run pnpm test:full with v0.1.7 configuration, verify KPI targets: auto_pass_rate >= 37%, SUPPLIER_DIFF_SAME_PROJECT count = 0, exact count >= 71 (baseline) | Restrictions: Compare all metrics with run_20251117_18_28 baseline, report detailed breakdown of reason distribution, stop if auto_pass_rate < 35% | Success: Full 222 files tested, auto_pass_rate >= 37%, SUPPLIER_DIFF_SAME_PROJECT eliminated, garbage matches (cand_f1 < 0.58) classified as SUPPLIER_HARD_REJECT | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (statistics for test results, comparison with baseline), then mark task as complete [x] in tasks.md_

## Phase 5: Documentation and Final Validation

- [ ] 5.1 Update PROJECT_STATUS.md with v0.1.7 results
  - File: `docs/PROJECT_STATUS.md`
  - Update KPI table with new metrics
  - Update version information
  - Document improvement over v0.1.6
  - Purpose: Project status transparency
  - _Leverage: `npm run update-docs` automation_
  - _Requirements: Documentation consistency_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Documentation Engineer with project management expertise | Task: Run npm run update-docs with v0.1.7 test results, update KPI metrics, version info, and improvement notes | Restrictions: Use automation script, verify all metrics updated correctly, maintain markdown formatting | Success: PROJECT_STATUS.md reflects v0.1.7 results, KPI improvement documented (32% → 37%+), version history updated | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (filesModified, statistics), then mark task as complete [x] in tasks.md_

- [ ] 5.2 Update implementation_record.md with v0.1.7 entry
  - File: `docs/implementation_record.md`
  - Add detailed v0.1.7 entry with technical changes
  - Document lessons learned from v0.1.7 disaster avoidance
  - Link to spec workflow documentation
  - Purpose: Version history and knowledge preservation
  - _Leverage: Existing implementation record format_
  - _Requirements: Complete version documentation_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer with version history expertise | Task: Add v0.1.7 entry to implementation_record.md following existing format, document configuration cleanup, threshold optimization, and incremental testing protocol | Restrictions: Follow existing entry format, include code line counts (extractField 86→50, bucketize 7→5 rules), reference spec workflow artifacts | Success: Entry added with all technical details, lessons learned documented, spec reference included | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (filesModified, statistics), then mark task as complete [x] in tasks.md_

- [ ] 5.3 Create migration guide for v0.1.6 to v0.1.7
  - File: `analysis/v0.1.7/migration_guide.md`
  - Document threshold changes and their rationale
  - Provide A/B testing instructions
  - Include rollback procedure
  - Purpose: Safe migration path
  - _Leverage: Design document migration section_
  - _Requirements: Usability and migration path_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer with migration expertise | Task: Create migration_guide.md documenting v0.1.6 to v0.1.7 changes, including threshold comparison table, A/B testing commands, and rollback instructions via latest.json pointer | Restrictions: Clear step-by-step instructions, include before/after examples, provide rollback safety net | Success: Guide covers all changes, A/B testing is straightforward, rollback procedure is clear and safe | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (filesCreated, statistics), then mark task as complete [x] in tasks.md_

- [ ] 5.4 Final git commit with spec reference
  - Files: All implementation files
  - Commit all code changes
  - Include spec implementation logs reference in commit message
  - Tag as v0.1.7-rc1
  - Purpose: Version control and traceability
  - _Leverage: Git best practices_
  - _Requirements: Complete version control_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Release Engineer with git workflow expertise | Task: Create final git commit for v0.1.7 implementation, include reference to spec workflow implementation logs, tag as v0.1.7-rc1 for release candidate | Restrictions: Follow project commit message format, include Co-Authored-By, reference spec directory in commit message, create annotated tag | Success: All changes committed, commit message includes spec reference, v0.1.7-rc1 tag created | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (statistics for commit info), then mark task as complete [x] in tasks.md_

- [ ] 5.5 Final validation: Regression test against v0.labs
  - Files: Test execution
  - Run A/B comparison: v0.labs vs v0.1.7
  - Verify no unexpected regressions
  - Document improvement summary
  - Purpose: Ensure no backward compatibility breaks
  - _Leverage: Both configuration versions_
  - _Requirements: Backward compatibility validation_
  - _Prompt: Implement the task for spec v0.1.7-matching-improvements, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Release QA with regression testing expertise | Task: Run side-by-side comparison of v0.labs and v0.1.7 configs on same 222 files, verify improvements and no unexpected regressions | Restrictions: Both configs must be runnable, compare all KPI metrics, document any cases where v0.1.7 performs worse | Success: Comparison report generated, improvements confirmed (auto_pass_rate, garbage match elimination), no unexpected failures, ready for production release | Instructions: Before starting, edit tasks.md to mark this task as in-progress [-]. After completing, use log-implementation tool to record artifacts (statistics for comparison results), then mark task as complete [x] in tasks.md_
