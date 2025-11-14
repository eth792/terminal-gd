# Tasks Document

## Phase 1: .gitignore Rules (Low Risk)

- [x] 1. Update .gitignore with selective tracking rules
  - File: `.gitignore`
  - Add selective tracking rules for .spec-workflow/
  - Track: specs/, templates/, steering/ (knowledge assets)
  - Exclude: approvals/, .cache/, logs/, tmp/, *.backup (runtime files)
  - Purpose: Enable git tracking of spec knowledge base while excluding runtime files
  - _Leverage: Existing .gitignore structure (lines 27-35)_
  - _Requirements: 1, 4_
  - _Prompt: Implement the task for spec spec-docs-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer specializing in Git workflows and repository hygiene | Task: Update .gitignore to implement selective tracking for .spec-workflow/ directory following requirements 1 and 4 from requirements.md. Add rules to track specs/, templates/, steering/ while excluding approvals/, .cache/, logs/, tmp/, and temporary files (*.backup, *.log, .snapshots/, .DS_Store, *.swp, etc.). Preserve existing .gitignore structure and comments. | Restrictions: Do not modify existing rules (lines 1-26), only add new rules in .spec-workflow section (lines 27-35). Do not accidentally exclude specs/ or templates/. Test with 'git status .spec-workflow/' to verify only knowledge assets appear. | _Leverage: Existing .gitignore patterns and comment style_ | Success: (1) specs/ and templates/ are tracked when files created, (2) approvals/ and .cache/ are excluded, (3) *.backup and *.log files excluded, (4) 'git status .spec-workflow/' shows only specs/ and templates/, (5) no regression in existing rules | Instructions: After implementation, mark this task as in-progress [-] in tasks.md, test thoroughly with git status, log implementation with log-implementation tool including all changes made, then mark as complete [x] in tasks.md_

## Phase 2: update-docs.js Enhancement (Medium Risk)

- [x] 2. Add specName parameter to UpdateConfig and CLI
  - Files: `scripts/update-docs.js` (lines 515-635)
  - Add optional `specName` parameter to UpdateConfig interface
  - Update CLI argument parsing in main() function
  - Add input validation: specName must match /^[a-z0-9-]+$/ (kebab-case) or be null
  - Purpose: Enable optional spec reference links in documentation
  - _Leverage: Existing config structure (lines 621-627), CLI parsing (lines 599-616)_
  - _Requirements: 2, 5_
  - _Prompt: Implement the task for spec spec-docs-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Node.js Developer with expertise in CLI argument parsing and TypeScript interfaces | Task: Add optional specName parameter to UpdateConfig interface and CLI argument parsing in scripts/update-docs.js following requirements 2 and 5. Update main() function (lines 597-635) to accept 5th optional parameter [specName], add validation to ensure it matches kebab-case pattern /^[a-z0-9-]+$/ or is null/undefined. Update help text (lines 602-613) to document new parameter. Preserve backward compatibility - existing 4-argument calls must work exactly as before. | Restrictions: Do not change existing function signatures (updateImplementationRecord, updateProjectStatus, updateClaudeMd) yet - only add parameter to config object and CLI. Do not break existing 4-argument usage. Must validate specName format before passing to update functions. | _Leverage: Existing CLI parsing pattern (lines 616-627), existing error handling style_ | Success: (1) CLI accepts 5th optional [specName] parameter, (2) Help text updated with example, (3) Validation rejects invalid formats (spaces, uppercase, special chars except hyphen), (4) Backward compatible - works without specName, (5) config.specName is null/undefined when not provided | Instructions: Before starting, mark task as in-progress [-] in tasks.md. After implementation, test with both 4 and 5 arguments, log implementation with log-implementation tool (include function signatures, validation logic), then mark complete [x] in tasks.md_

- [x] 3. Modify updateImplementationRecord() to support spec references
  - File: `scripts/update-docs.js` (lines 148-236)
  - Modify updateImplementationRecord() to generate spec reference link when config.specName provided
  - Replace code changes placeholder with reference link format: `[{specName} Implementation Logs](./.spec-workflow/specs/{specName}/)`
  - Keep placeholder when specName is null/undefined (backward compatible)
  - Purpose: Eliminate code file list duplication by referencing spec logs
  - _Leverage: Existing entry generation (lines 171-203), string interpolation patterns_
  - _Requirements: 2_
  - _Prompt: Implement the task for spec spec-docs-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in JavaScript string templating and documentation generation | Task: Modify updateImplementationRecord() function (lines 148-236) in scripts/update-docs.js to support spec reference links following requirement 2. When config.specName is provided (truthy), generate reference link in "代码变更" section: "详细信息请查看：[{specName} Implementation Logs](./.spec-workflow/specs/{specName}/)\n\n**核心变更摘要**（手动补充）:\n[📝 待补充 - 简要描述关键变更，无需列出文件清单]". When specName is null/undefined, keep existing placeholder behavior (lines 179-180). Preserve all other sections unchanged (实施内容, 测试结果, 相关文档, 技术洞察). | Restrictions: Only modify "代码变更" section generation (around line 178-180). Do not change KPI extraction logic (safeExtractKPI), file reading logic, or other sections. Must maintain exact markdown formatting. Do not change function signature - only use config.specName internally. | _Leverage: Existing template string patterns (lines 171-203), config parameter access_ | Success: (1) With specName: generates reference link to .spec-workflow/specs/{specName}/, (2) Without specName: generates original placeholder, (3) All other sections unchanged, (4) Markdown formatting correct (clickable in VS Code/GitHub), (5) No breaking changes to existing behavior | Instructions: Mark as in-progress [-] in tasks.md before coding. Test with both specName provided and not provided. Log implementation with log-implementation tool (show before/after code snippets, test results). Mark complete [x] in tasks.md_

- [x] 4. Modify updateClaudeMd() to support spec references
  - File: `scripts/update-docs.js` (lines 391-512)
  - Modify updateClaudeMd() to add spec reference in "最近完成的工作" section when config.specName provided
  - Add new subsection "**代码变更**: 详见 [spec logs](./.spec-workflow/specs/{specName}/)" when specName exists
  - Keep manual placeholder when specName is null (backward compatible)
  - Purpose: Reduce manual work and duplication in CLAUDE.md updates
  - _Leverage: Existing section update patterns (lines 486-507), regex replacement style_
  - _Requirements: 2_
  - _Prompt: Implement the task for spec spec-docs-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Full-stack Developer with expertise in regex-based text manipulation and markdown formatting | Task: Modify updateClaudeMd() function (lines 391-512) in scripts/update-docs.js to add spec reference link in "最近完成的工作" section following requirement 2. After updating "测试运行包" (lines 501-505), add new replacement: when config.specName is truthy, insert "**代码变更**: 详见 [spec logs](./.spec-workflow/specs/{specName}/)\n**关键发现**: [📝 待手动补充]". When specName is null/undefined, do not add this section (backward compatible). Preserve all existing updates: metadata (lines 425-447), KPI table (lines 452-483), recent work title/date (lines 488-505). | Restrictions: Only add code changes subsection insertion. Do not modify existing regex patterns or replacement logic. Must use content.replace() pattern like existing code. Do not change function signature. Ensure markdown link is properly formatted. | _Leverage: Existing regex replacement patterns (lines 430-505), config parameter access, markdown link syntax_ | Success: (1) With specName: "代码变更" subsection added with clickable link, (2) Without specName: no "代码变更" subsection (original behavior), (3) All other CLAUDE.md updates work correctly, (4) Link format correct (./.spec-workflow/specs/{specName}/), (5) No breaking changes | Instructions: Mark in-progress [-] in tasks.md. Test both code paths (with/without specName). Use Read tool to verify CLAUDE.md structure before coding. Log implementation with log-implementation tool (include regex pattern, test output). Mark complete [x]_

- [x] 5. Add specName format validation function
  - File: `scripts/update-docs.js` (after imports, before safeExtractKPI)
  - Create validateSpecName(specName) function
  - Validate kebab-case format: /^[a-z0-9-]+$/ (lowercase letters, numbers, hyphens only)
  - Throw descriptive error if invalid format detected
  - Purpose: Prevent broken links from malformed spec names
  - _Leverage: Existing error handling style (throw new Error with descriptive messages)_
  - _Requirements: 2, 5_
  - _Prompt: Implement the task for spec spec-docs-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: JavaScript Developer with expertise in input validation and regex patterns | Task: Create validateSpecName(specName) function in scripts/update-docs.js (insert after imports around line 15, before safeExtractKPI at line 24) following requirements 2 and 5. Function should: (1) Return immediately if specName is null/undefined/empty (valid - optional parameter), (2) Test specName against regex /^[a-z0-9-]+$/, (3) Throw descriptive Error if invalid with message: "Invalid specName: '{specName}'. Must use kebab-case format (lowercase letters, numbers, and hyphens only). Examples: 'spec-docs-integration', 'my-feature-v2'". Add JSDoc comment explaining purpose and examples. | Restrictions: Place function before safeExtractKPI (line 24) to maintain code organization. Do not modify any existing functions. Use existing error throwing style (throw new Error()). Must allow null/undefined (optional parameter). Do not use external validation libraries. | _Leverage: Existing error message style (see lines 73-81), JSDoc comment patterns (see lines 17-23)_ | Success: (1) Function defined with clear JSDoc, (2) Returns void for valid kebab-case and null/undefined, (3) Throws Error for invalid formats (uppercase, spaces, special chars except hyphen), (4) Error message is helpful with examples, (5) Test cases: null (pass), 'my-spec' (pass), 'My-Spec' (fail), 'my spec' (fail) | Instructions: Mark in-progress [-] in tasks.md. Add function, then call it in updateDocs() function (line 525) right after config validation. Test with invalid inputs. Log implementation with log-implementation tool (show function code, test cases). Mark complete [x]_

- [x] 6. Update CLI help text and documentation
  - File: `scripts/update-docs.js` (lines 602-613)
  - Update help text to document [specName] optional parameter
  - Add example with specName: `npm run update-docs -- v0.1.7 "提取逻辑修复" run_v0.1.7_fix_20251114_123456 v0.1.8 extraction-logic-fix`
  - Purpose: Guide users on how to use new spec integration feature
  - _Leverage: Existing help text format (lines 602-613)_
  - _Requirements: 2, 5_
  - _Prompt: Implement the task for spec spec-docs-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer with expertise in CLI documentation and user guides | Task: Update CLI help text in scripts/update-docs.js (lines 602-613) to document the new optional [specName] parameter following requirements 2 and 5. Add specName to Arguments list: "specName  Spec name for reference links (optional, kebab-case, e.g., 'spec-docs-integration')". Update Example section (line 611) to show 5-argument usage: "npm run update-docs -- v0.1.7 \"提取逻辑修复\" run_v0.1.7_fix_20251114_123456 v0.1.8 extraction-logic-fix". Keep existing 4-argument example or replace with note about backward compatibility. | Restrictions: Only modify help text section (lines 602-613). Do not change actual CLI parsing logic (that's in task 2). Keep formatting consistent with existing style. Ensure examples are realistic and helpful. | _Leverage: Existing help text structure and formatting_ | Success: (1) Help text includes specName in Arguments, (2) Example shows 5-argument usage with realistic spec name, (3) Format consistent with existing help, (4) Users understand parameter is optional and format requirements, (5) Help displays correctly when run with no arguments | Instructions: Mark in-progress [-] in tasks.md. Test by running 'npm run update-docs' with no args to see help. Log implementation with log-implementation tool (show updated help text). Mark complete [x]_

## Phase 3: CLAUDE.md Step 0 (Low Risk)

- [x] 7. Add Step 0 environment validation to CLAUDE.md
  - File: `CLAUDE.md` (insert before "快速恢复步骤" section, around line 40)
  - Add "#### Step 0: 验证环境 🔍" section with bash checklist
  - Include checks for: .spec-workflow/specs/ exists, MCP tools available, git branch, key documents
  - Add troubleshooting guidance for each failure scenario
  - Purpose: Enable fail-fast session recovery with clear error messages
  - _Leverage: Existing "快速恢复步骤" structure and bash command examples_
  - _Requirements: 3_
  - _Prompt: Implement the task for spec spec-docs-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Documentation Specialist with expertise in troubleshooting guides and DevOps workflows | Task: Add Step 0 environment validation section to CLAUDE.md (insert before existing "快速恢复步骤" around line 40) following requirement 3 from requirements.md. Create subsection "#### Step 0: 验证环境 🔍" with: (1) Purpose statement explaining fail-fast validation, (2) Bash command block checking .spec-workflow/specs/ exists (ls command with error handling), (3) MCP tools note (auto-detected by Claude Code), (4) Git branch check (git branch --show-current), (5) Key documents check (ls docs/PROJECT_STATUS.md docs/implementation_record.md CLAUDE.md), (6) Success criteria checklist, (7) Failure handling section with clear troubleshooting for each scenario. Preserve existing Step 1-4 structure, just renumber if needed or keep as-is. | Restrictions: Insert before existing recovery steps (do not modify Steps 1-4). Use existing markdown formatting style (####, code blocks, bullet points). Keep bash commands simple and safe (no rm, no write operations). Ensure troubleshooting is actionable (not just "check logs"). | _Leverage: Existing bash command examples in CLAUDE.md, existing troubleshooting style from PROJECT_STATUS.md_ | Success: (1) Step 0 section added before existing steps, (2) 4 bash checks included (specs/, MCP, git, docs), (3) Success criteria clearly defined, (4) Failure scenarios have specific troubleshooting, (5) Formatting matches existing CLAUDE.md style, (6) No changes to existing Steps 1-4 | Instructions: Mark in-progress [-] in tasks.md. Use Read tool to examine CLAUDE.md structure first. Test bash commands manually. Log implementation with log-implementation tool (show new section content, validation test results). Mark complete [x]_

## Phase 4: Testing (High Risk)

- [x] 8. Create .gitignore rules validation test script
  - File: `tests/test-gitignore-rules.sh` (new file)
  - Create bash script to test selective tracking rules
  - Test scenarios: specs/ tracked, approvals/ excluded, *.backup excluded
  - Cleanup test artifacts after validation
  - Purpose: Ensure .gitignore rules work correctly and prevent regression
  - _Leverage: Git status commands, existing test script patterns if any_
  - _Requirements: 4_
  - _Prompt: Implement the task for spec spec-docs-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Automation Engineer with expertise in bash scripting and git workflows | Task: Create comprehensive test script tests/test-gitignore-rules.sh to validate .gitignore selective tracking following requirement 4. Script must: (1) Use #!/bin/bash and set -e, (2) Print test banner with emoji, (3) Test 1: Create .spec-workflow/specs/test-spec/test.md, run 'git add', verify file stages (not ignored), (4) Test 2: Create .spec-workflow/approvals/test/approval.json, run 'git add', verify file is ignored, (5) Test 3: Create .spec-workflow/specs/test-spec/test.md.backup, verify file is ignored, (6) Print success/failure for each test with ✅/❌, (7) Clean up all test artifacts (rm -rf test directories), (8) Exit 1 on any failure, exit 0 on all pass. | Restrictions: Use safe commands only (no destructive git operations). Must clean up artifacts even if tests fail (use trap or manual cleanup). Do not commit test files. Test must be idempotent (can run multiple times). Must check git status output, not just exit codes. | _Leverage: Bash test patterns, git status parsing, cleanup patterns_ | Success: (1) Script runs successfully on clean repo, (2) All 3 tests execute and report results, (3) Detects .gitignore rule violations correctly, (4) Cleanup removes all test artifacts, (5) Script is executable (chmod +x), (6) Clear output shows which tests passed/failed | Instructions: Mark in-progress [-] in tasks.md. Create script, make executable (chmod +x), run locally to verify. Log implementation with log-implementation tool (include script content, test output). Mark complete [x]_

- [ ] 9. Create update-docs.js unit tests
  - File: `tests/update-docs.test.js` (new file, if testing framework exists)
  - Write unit tests for specName validation and reference link generation
  - Test both code paths: with specName (reference links) and without (placeholders)
  - Mock file system operations to avoid real file modifications
  - Purpose: Ensure update-docs.js enhancements work correctly and maintain backward compatibility
  - _Leverage: Existing test utilities or create minimal test setup_
  - _Requirements: 2, 5_
  - _Prompt: Implement the task for spec spec-docs-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Test Engineer with expertise in JavaScript unit testing and Node.js module testing | Task: Create unit tests for update-docs.js enhancements in tests/update-docs.test.js following requirements 2 and 5. If no test framework exists, create minimal test file using native Node.js assert. Test: (1) validateSpecName() - accepts valid kebab-case and null, rejects invalid formats, (2) updateImplementationRecord() - generates spec reference link when specName provided, generates placeholder when not provided, (3) updateClaudeMd() - adds "代码变更" section with link when specName provided, omits when not provided. Mock fs.readFile to return sample summary.md and document content. Do not write actual files. | Restrictions: If no test framework, use Node.js built-in assert/test modules only. Must mock file system (no real file writes). Tests must be independent (no shared state). Do not test safeExtractKPI or atomicUpdate (unchanged functions). Keep tests simple and focused. | _Leverage: Node.js assert module, existing test patterns if available, mock patterns from scripts/update-docs.js::runEndToEndTest (lines 647-686)_ | Success: (1) Test file created and runnable (node tests/update-docs.test.js), (2) At least 6 test cases (validateSpecName x2, updateImplementationRecord x2, updateClaudeMd x2), (3) All tests pass, (4) Clear test output shows pass/fail, (5) Tests detect regressions (fail if functions break), (6) No real files modified during test | Instructions: Mark in-progress [-] in tasks.md. Check if test framework exists (package.json dependencies). Create tests, run locally. Log implementation with log-implementation tool (test file content, test run output). Mark complete [x]_

- [ ] 10. Create end-to-end integration test script
  - File: `tests/test-spec-integration-e2e.sh` (new file)
  - Create bash script to test complete release workflow with spec integration
  - Test scenario: Create test spec, run update-docs with specName, verify reference links in docs
  - Rollback all changes after test (restore original docs)
  - Purpose: Validate full integration works as designed
  - _Leverage: Git commands for backup/restore, grep for verification_
  - _Requirements: All (integration test)_
  - _Prompt: Implement the task for spec spec-docs-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with expertise in integration testing and bash scripting | Task: Create comprehensive E2E test script tests/test-spec-integration-e2e.sh to validate complete spec-docs integration workflow covering all requirements. Script must: (1) Print test banner, (2) Backup docs: 'git stash' or copy files, (3) Create test spec directory: .spec-workflow/specs/test-integration/Implementation\ Logs/task-1_test.md with sample content, (4) Run update-docs with specName: 'npm run update-docs -- v0.1.7 "集成测试" run_v0.1.6_full_20251113_214123 v0.1.8 test-integration', (5) Verify docs contain reference links: grep 'test-integration Implementation Logs' docs/implementation_record.md, (6) Verify no old placeholders: ! grep '请补充代码变更详情' docs/implementation_record.md, (7) Cleanup: restore docs (git checkout or restore from backup), remove test spec, (8) Report success/failure with ✅/❌. | Restrictions: Must restore original docs state (use git checkout or backup/restore). Do not commit test changes. Must verify actual link generation (not just script success). Handle failures gracefully (cleanup even on error). Script must be safe to run multiple times. | _Leverage: Git backup/restore patterns, npm run commands, grep verification, cleanup patterns_ | Success: (1) Script runs full workflow successfully, (2) Detects reference link generation correctly, (3) Detects missing placeholders correctly, (4) Docs restored to original state after test, (5) Test artifacts cleaned up, (6) Clear pass/fail output, (7) Script is executable and safe | Instructions: Mark in-progress [-] in tasks.md. Create script, test locally (verify docs restored). Log implementation with log-implementation tool (script content, test output showing verification steps). Mark complete [x]_

## Phase 5: Documentation (Low Risk)

- [x] 11. Update CLAUDE.md release workflow documentation
  - File: `CLAUDE.md` (section "📋 版本发布工作流", around lines 80-250)
  - Update "阶段 4: Git 提交" to include specName in commit message example
  - Update "必须包含的文件" checklist to mention spec logs (if applicable)
  - Add note about optional specName parameter in release process
  - Purpose: Guide developers on using new spec integration in release workflow
  - _Leverage: Existing workflow documentation structure and examples_
  - _Requirements: 2, 5_
  - _Prompt: Implement the task for spec spec-docs-integration, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Documentation Specialist with expertise in workflow documentation and process guides | Task: Update CLAUDE.md "版本发布工作流" section (around lines 80-250) to document spec integration following requirements 2 and 5. Changes: (1) In "阶段 4: Git 提交" Commit Message Template, add note: "如果本次版本有对应的 spec，可在 Run ID 下方添加: Spec: spec-name", (2) In "必须包含的文件" checklist (around line 234), add conditional item: "如果有 spec 实施，包含 .spec-workflow/specs/{spec-name}/", (3) In "阶段 1: 代码实施" or summary section, add brief note about optional spec workflow integration. Keep all existing workflow steps unchanged. | Restrictions: Only add clarifying notes about optional spec integration. Do not change existing 5-phase structure or required steps. Keep notes brief (1-2 lines each). Ensure backward compatibility noted (spec is optional). Do not mandate spec usage for all releases. | _Leverage: Existing workflow format, commit message template structure, checklist style_ | Success: (1) Commit message template shows optional Spec field, (2) File checklist mentions optional spec logs, (3) Notes clearly indicate spec is optional (not required), (4) No breaking changes to existing workflow, (5) Developers understand when to use specName parameter, (6) Formatting matches existing CLAUDE.md style | Instructions: Mark in-progress [-] in tasks.md. Use Read tool to examine current workflow documentation. Add minimal notes (don't bloat the doc). Log implementation with log-implementation tool (show updated sections). Mark complete [x]_

## Implementation Sequence

**Recommended order** (minimize risk, enable incremental testing):

1. **Start with low-risk, foundational tasks**: 1 (gitignore), 5 (validation function)
2. **Core functionality**: 2 (CLI), 3 (implementation_record), 4 (CLAUDE.md updates)
3. **Documentation support**: 6 (help text), 7 (Step 0), 11 (workflow docs)
4. **Validation**: 8 (gitignore tests), 9 (unit tests), 10 (E2E tests)

**Testing after each phase**:
- After Phase 1: Run `git status .spec-workflow/` to verify rules
- After Phase 2: Run `npm run update-docs` (with/without specName) and inspect output
- After Phase 3: Execute Step 0 commands manually in new session
- After Phase 4: Run all test scripts and verify pass
- After Phase 5: Review all documentation for consistency

## Notes

- All tasks are designed to be **atomic** (1-3 files each, single responsibility)
- Each task has **clear success criteria** and **explicit test instructions**
- Tasks maintain **backward compatibility** (existing workflows unchanged)
- **_Prompt fields** contain complete context for autonomous implementation
- **_Leverage fields** point to existing code patterns to reuse
- **_Requirements fields** trace back to requirements.md for validation
