# Tasks Document

## Phase 1: Create New Files

- [x] 1.1 Create TECHNICAL_DECISIONS.md with design decisions log
  - File: `docs/TECHNICAL_DECISIONS.md`
  - Extract key technical decisions from CLAUDE.md lines 595-641
  - Document: Monorepo structure, Versioned configurations, Immutable run bundles
  - Use decision record template with Date/Context/Decision/Consequences
  - Purpose: Centralize historical technical decisions separate from AI instructions
  - _Leverage: design.md Component 4 structure_
  - _Requirements: 2.1, 2.3, 4.1_
  - _Prompt: Role: Technical Documentation Specialist with expertise in architecture decision records | Task: Create comprehensive technical decisions log extracting content from CLAUDE.md lines 595-641, following the decision record template in design.md Component 4 | Restrictions: Must preserve all decision context and rationale, maintain chronological order, use consistent decision record format | Success: All key decisions documented with full context, decision record format followed consistently, file is well-organized and searchable_

- [x] 1.2 Create RELEASE_WORKFLOW.md with complete version workflow
  - File: `analysis/docs-flow-automation/RELEASE_WORKFLOW.md`
  - Extract complete workflow from CLAUDE.md lines 198-621
  - Include: 阶段 0-5 (Planning → Code → Test → Docs → Git → Status Update)
  - Include: Full checklist and common mistakes section
  - Purpose: Separate detailed process guide from AI meta-instructions
  - _Leverage: design.md Component 3 structure_
  - _Requirements: 2.2, 2.3, 4.1_
  - _Prompt: Role: Process Documentation Engineer with expertise in technical workflows | Task: Create comprehensive release workflow document extracting content from CLAUDE.md lines 198-621, following the structure in design.md Component 3 with all 6 phases, checklist, and common mistakes | Restrictions: Must preserve all workflow steps and details, maintain phase numbering, include all validation checkpoints | Success: Complete workflow extracted with all 6 phases detailed, checklist and common mistakes included, workflow is actionable and clear_

- [x] 1.3 Enhance PROJECT_STATUS.md with Quick Start navigation section
  - File: `docs/PROJECT_STATUS.md` (modify existing)
  - Add "Quick Start for New Sessions" section at top
  - Include: 3-step recovery process (Read this file → Check related docs → Verify environment)
  - Add navigation pointers to implementation_record.md, RELEASE_WORKFLOW.md, TECHNICAL_DECISIONS.md
  - Purpose: Make PROJECT_STATUS.md the canonical entry point for session recovery
  - _Leverage: design.md Component 2 structure, existing PROJECT_STATUS.md_
  - _Requirements: 3.1, 3.2, 4.1_
  - _Prompt: Role: Technical Writer specializing in user onboarding and navigation design | Task: Enhance PROJECT_STATUS.md with Quick Start section following design.md Component 2, adding 3-step recovery process and navigation pointers to related documents | Restrictions: Must preserve existing content structure, maintain navigation pointer format from design.md, ensure links are valid relative paths | Success: Quick Start section added at top, 3-step process is clear and actionable, all navigation pointers work correctly_

## Phase 2: Refactor CLAUDE.md

- [x] 2.1 Create backup of original CLAUDE.md
  - File: `CLAUDE.md.backup`
  - Copy current CLAUDE.md to CLAUDE.md.backup
  - Purpose: Safety rollback mechanism
  - _Leverage: Git also provides version control_
  - _Requirements: 4.2 (Rollback plan)_
  - _Prompt: Role: DevOps Engineer with expertise in backup strategies | Task: Create backup copy of CLAUDE.md before refactoring | Restrictions: Must be exact copy, preserve all formatting | Success: CLAUDE.md.backup created with identical content_

- [x] 2.2 Write simplified CLAUDE.md - Role Definition section (~80 lines)
  - File: `CLAUDE.md` (rewrite)
  - Include: Linus Torvalds persona, 4 core philosophies, communication principles, 5-layer thinking framework
  - Source: Extract from existing CLAUDE.md lines 7-27 (role section)
  - Purpose: Preserve AI behavioral instructions for Linus persona
  - _Leverage: Existing role definition from original CLAUDE.md_
  - _Requirements: 1.1 (Preserve AI Behavioral Instructions)_
  - _Prompt: Role: AI Instruction Designer with expertise in persona-based prompting | Task: Rewrite Role Definition section (~80 lines) preserving Linus Torvalds persona, 4 core philosophies, communication principles, and 5-layer thinking framework from original CLAUDE.md | Restrictions: Must maintain exact persona characteristics, preserve all philosophical principles, ensure thinking framework is complete | Success: Role definition is complete and concise (~80 lines), persona characteristics preserved, all principles and frameworks included_

- [x] 2.3 Write simplified CLAUDE.md - Mandatory Rules section (~30 lines)
  - File: `CLAUDE.md` (continue)
  - Include: Rule 1 (Single-change), Rule 2 (Fail-stop), Rule 3 (Context budget)
  - Source: Extract from existing CLAUDE.md lines 7-25 (强制规则)
  - Purpose: Preserve critical development constraints
  - _Leverage: Existing mandatory rules from original CLAUDE.md_
  - _Requirements: 1.1 (3 mandatory rules)_
  - _Prompt: Role: Technical Policy Writer with expertise in development constraints | Task: Write concise Mandatory Rules section (~30 lines) preserving the 3 critical rules (single-change, fail-stop, context budget) from original CLAUDE.md lines 7-25 | Restrictions: Must preserve exact rule semantics, maintain enforcement language, keep examples concise | Success: All 3 mandatory rules documented clearly, examples are concise, enforcement language is preserved_

- [x] 2.4 Write simplified CLAUDE.md - Quick Navigation section (~40 lines)
  - File: `CLAUDE.md` (continue)
  - Add navigation pointers to: PROJECT_STATUS.md, RELEASE_WORKFLOW.md, TECHNICAL_DECISIONS.md
  - Use navigation pointer format from design.md Data Models
  - Include brief 3-step recovery process summary
  - Purpose: Provide clear entry points to detailed documentation
  - _Leverage: design.md Navigation Pointer Model_
  - _Requirements: 3.1, 3.2 (Maintain Navigation Clarity)_
  - _Prompt: Role: Information Architect with expertise in navigation design and documentation structure | Task: Write Quick Navigation section (~40 lines) with navigation pointers following the format from design.md Data Models, including 3-step recovery summary | Restrictions: Must use exact navigation pointer format, ensure all paths are correct, keep summaries to 1-2 sentences | Success: Navigation pointers formatted correctly, all links work, 3-step recovery is clear and concise_

- [x] 2.5 Write simplified CLAUDE.md - Tool Usage section (~50 lines)
  - File: `CLAUDE.md` (continue)
  - Include: spec-workflow guide, docs-flow automation overview, MCP tools reference
  - Source: Extract from existing CLAUDE.md tool usage sections
  - Add brief workflow reference pointing to RELEASE_WORKFLOW.md for details
  - Purpose: Preserve tool usage guidance without detailed workflow steps
  - _Leverage: Existing tool usage sections, design.md Workflow Reference Model_
  - _Requirements: 1.1 (Tool usage guidelines)_
  - _Prompt: Role: Developer Tools Documentation Specialist | Task: Write concise Tool Usage section (~50 lines) preserving spec-workflow, docs-flow, and MCP tools guidance from original CLAUDE.md, adding workflow reference to RELEASE_WORKFLOW.md | Restrictions: Must preserve all tool references, keep detailed workflows in external files, maintain consistent reference format | Success: All tools documented briefly, workflow reference points to RELEASE_WORKFLOW.md, section is ~50 lines_

- [x] 2.6 Write simplified CLAUDE.md - Architecture Principles section (~60 lines)
  - File: `CLAUDE.md` (continue)
  - Include: Monorepo philosophy, data flow overview, high-level design constraints
  - Source: Extract from existing CLAUDE.md lines 595-605 (核心架构理念)
  - Remove detailed constraints (move to TECHNICAL_DECISIONS.md)
  - Purpose: Preserve high-level architectural concepts for AI understanding
  - _Leverage: Existing architecture section_
  - _Requirements: 1.1 (Core architectural concepts)_
  - _Prompt: Role: Software Architect specializing in system design documentation | Task: Write concise Architecture Principles section (~60 lines) preserving monorepo philosophy and data flow from CLAUDE.md lines 595-605, keeping only high-level concepts | Restrictions: Must preserve core philosophy, avoid implementation details, reference TECHNICAL_DECISIONS.md for detailed constraints | Success: Architecture principles are clear and concise, high-level only, detailed constraints moved to TECHNICAL_DECISIONS.md_

- [x] 2.7 Write simplified CLAUDE.md - Development Quick Ref section (~40 lines)
  - File: `CLAUDE.md` (continue)
  - Include: Key commands, code style basics, critical conventions
  - Source: Condense from existing CLAUDE.md development sections
  - Purpose: Provide quick reference for common development tasks
  - _Leverage: Existing development command sections_
  - _Requirements: 1.1 (Git workflow conventions)_
  - _Prompt: Role: Developer Experience Engineer with expertise in quick reference documentation | Task: Write concise Development Quick Ref section (~40 lines) condensing key commands, code style, and conventions from existing CLAUDE.md development sections | Restrictions: Must include only most frequently used commands, keep style notes brief, focus on critical conventions only | Success: Quick reference is comprehensive yet concise, most common tasks covered, section is ~40 lines_

- [x] 2.8 Add redirect comments for major removed sections
  - File: `CLAUDE.md` (continue)
  - Add HTML comments pointing to new locations for removed major sections
  - Format: `<!-- Section "X" moved to docs/Y.md - see Quick Navigation -->`
  - Purpose: Assist external tools or users expecting old structure
  - _Leverage: design.md Error Handling scenario 3_
  - _Requirements: 5.1 (Backward Compatible References)_
  - _Prompt: Role: Migration Specialist with expertise in backward compatibility | Task: Add redirect comments in CLAUDE.md for major removed sections, following design.md Error Handling scenario 3 guidance | Restrictions: Must use HTML comments (won't render in markdown), provide exact new file paths, keep comments concise | Success: Redirect comments added for all major removed sections, paths are accurate, comments are unobtrusive_

## Phase 3: Update Automation

- [x] 3.1 Modify scripts/update-docs.js to use new structure
  - File: `scripts/update-docs.js` (modify existing)
  - Remove CLAUDE.md KPI update logic (lines that write to "快速状态恢复" section)
  - Update logic to only modify navigation pointer dates/versions in CLAUDE.md
  - Keep PROJECT_STATUS.md updates as primary target
  - Test with dry-run mode
  - Purpose: Align automation with new documentation structure
  - _Leverage: Existing update-docs.js logic_
  - _Requirements: 2.1 (Maintainer SHALL find KPI data in PROJECT_STATUS.md only), 5.2 (Continue to work without modification)_
  - _Prompt: Role: Automation Engineer with expertise in Node.js and documentation tooling | Task: Modify scripts/update-docs.js to remove CLAUDE.md KPI updates and only update navigation pointer metadata, keeping PROJECT_STATUS.md as primary update target | Restrictions: Must preserve existing PROJECT_STATUS.md update logic, do not break automation, test thoroughly before committing | Success: Automation updates PROJECT_STATUS.md correctly, CLAUDE.md navigation pointers updated with dates/versions only, dry-run mode works_

## Phase 4: Validate

- [x] 4.1 Validate all markdown links in new structure
  - Run grep/search to find all markdown links in CLAUDE.md, PROJECT_STATUS.md, new files
  - Verify each link points to existing file/section
  - Check for broken relative paths
  - Purpose: Ensure navigation system works correctly
  - _Leverage: design.md Testing Strategy - Manual Verification Checklist item 2_
  - _Requirements: 3.2 (Each pointer with 1-2 sentence description), 4.2 (All internal links updated correctly)_
  - _Prompt: Role: QA Engineer with expertise in documentation testing and link validation | Task: Systematically validate all markdown links in new documentation structure following design.md Testing Strategy, using grep/search to find and verify links | Restrictions: Must check all relative paths, verify section anchors exist, ensure no broken links | Success: All links validated and working, no broken references found, validation report documented_

- [x] 4.2 Test docs-flow automation end-to-end
  - Run `npm run update-docs` with test data
  - Verify PROJECT_STATUS.md updates correctly
  - Verify CLAUDE.md navigation pointers update (dates/versions only)
  - Check no errors or warnings in output
  - Purpose: Ensure automation works with new structure
  - _Leverage: design.md Testing Strategy - Manual Verification Checklist item 4_
  - _Requirements: 5.2 (docs-flow automation SHALL continue to work)_
  - _Prompt: Role: Integration Test Engineer with expertise in automation testing | Task: Perform comprehensive end-to-end test of docs-flow automation following design.md Testing Strategy item 4, validating both PROJECT_STATUS.md and CLAUDE.md updates | Restrictions: Must test with real-world data, verify no regressions, check all output for correctness | Success: Automation runs without errors, PROJECT_STATUS.md updated correctly, CLAUDE.md pointers updated with metadata only_

- [x] 4.3 Verify zero information loss
  - Compare original CLAUDE.md.backup with all new files
  - Create checklist of all sections in original CLAUDE.md
  - Verify each section exists in new location (CLAUDE.md or docs/ or analysis/)
  - Document any content reorganization or reformatting
  - Purpose: Ensure all valuable content preserved
  - _Leverage: design.md Testing Strategy - Manual Verification Checklist item 1, 5_
  - _Requirements: 4.1, 4.2, 4.3 (Zero Information Loss)_
  - _Prompt: Role: Documentation Auditor with expertise in content verification and migration validation | Task: Perform comprehensive audit comparing CLAUDE.md.backup with all new files, verifying 100% content preservation following design.md Testing Strategy items 1 and 5 | Restrictions: Must account for every section and piece of information, document any changes in organization, ensure nothing is missing | Success: All original content accounted for in new locations, no information lost, content reorganization documented_

- [x] 4.4 Simulate new session recovery with minimal CLAUDE.md
  - Read new CLAUDE.md from start to finish (should be ~300 lines)
  - Follow navigation pointers to PROJECT_STATUS.md
  - Verify "Quick Start for New Sessions" is clear
  - Time the recovery process (should be <30 seconds)
  - Purpose: Validate user experience improvement
  - _Leverage: design.md Testing Strategy - User Scenario 1_
  - _Requirements: 3.1, 3.2 (New session SHALL find clear navigation)_
  - _Prompt: Role: UX Researcher with expertise in user flow validation and session recovery | Task: Simulate new Claude Code session recovery following design.md Testing Strategy User Scenario 1, timing the process and validating clarity | Restrictions: Must follow exact user flow, measure time objectively, verify all expected information is findable | Success: Recovery process takes <30 seconds, navigation is clear, context consumption reduced by ~65%, no information missing_

## Phase 5: Cleanup

- [x] 5.1 Remove CLAUDE.md.backup after validation passes
  - Delete `CLAUDE.md.backup` file
  - Verify Git history preserves original CLAUDE.md
  - Purpose: Clean up temporary files after successful migration
  - _Leverage: Git version control for rollback_
  - _Requirements: 4.2 (Rollback plan: Git revert)_
  - _Prompt: Role: DevOps Engineer with expertise in cleanup and version control | Task: Remove CLAUDE.md.backup after validation passes, verifying Git history provides rollback capability | Restrictions: Must confirm validation passed, verify Git has original version, do not delete if validation failed | Success: Backup file removed, Git history confirmed to have original CLAUDE.md for rollback_

- [x] 5.2 Document new navigation model in PROJECT_STATUS.md
  - Add section in PROJECT_STATUS.md explaining new documentation structure
  - Describe navigation pointer system and file locations
  - Include quick reference table of key documents
  - Purpose: Help future maintainers understand documentation organization
  - _Leverage: design.md Overview and Architecture sections_
  - _Requirements: 3.1 (Clear navigation), 4.1 (Accessible after refactoring)_
  - _Prompt: Role: Technical Writer specializing in meta-documentation and user guides | Task: Document new navigation model in PROJECT_STATUS.md explaining the structure, navigation pointer system, and key document locations from design.md | Restrictions: Must be concise and clear, provide quick reference table, explain rationale for structure | Success: New section added to PROJECT_STATUS.md, navigation model explained clearly, quick reference table included_

- [x] 5.3 Update external references to CLAUDE.md structure (if any)
  - Search for external scripts or tools referencing CLAUDE.md sections
  - Update paths to new file locations
  - Test external integrations still work
  - Purpose: Ensure external dependencies don't break
  - _Leverage: design.md Error Handling scenario 3_
  - _Requirements: 5.1 (Stable key sections), 5.2 (No breaking changes to automation)_
  - _Prompt: Role: Integration Engineer with expertise in dependency management and external tool integration | Task: Identify and update all external references to CLAUDE.md structure following design.md Error Handling scenario 3 | Restrictions: Must search thoroughly for external dependencies, test all integrations after updates, document any breaking changes | Success: All external references updated, integrations tested and working, no breaking changes introduced_
