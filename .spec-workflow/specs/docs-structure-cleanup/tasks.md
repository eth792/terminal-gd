# Tasks Document

## Phase 1: Root Directory Cleanup (Low Risk)

- [x] 1. Move DOCS_FLOW_REDESIGN.md to archived
  - File: `DOCS_FLOW_REDESIGN.md` (move to `analysis/archived/`)
  - Use `git mv` to preserve file history
  - Verify root directory only contains README.md and CLAUDE.md after move
  - Purpose: Eliminate temporary design documents from root directory
  - _Leverage: Git history preservation with `git mv` command_
  - _Requirements: 1_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with expertise in Git operations and file organization | Task: Move DOCS_FLOW_REDESIGN.md from root directory to analysis/archived/ following requirement 1, using `git mv` to preserve file history | Restrictions: Must use `git mv` not regular `mv`, verify root contains exactly 2 .md files after move, do not modify file contents | _Leverage: Git mv command for history preservation_ | Success: (1) File moved to analysis/archived/DOCS_FLOW_REDESIGN.md, (2) Git history preserved (verify with `git log --follow`), (3) Root directory contains only README.md and CLAUDE.md, (4) File is tracked in git (not untracked) | Instructions: Before starting, mark task as in-progress [-] in tasks.md. After completion, verify with `ls -la *.md` and `git status`, log implementation with log-implementation tool (include git log --follow output), then mark complete [x] in tasks.md_

## Phase 2: Analysis Document Consolidation (Medium Risk)

- [x] 2. Create docs-flow-automation/archived/ directory
  - Directory: `analysis/docs-flow-automation/archived/`
  - Create directory structure for archiving original analysis documents
  - Purpose: Prepare for document consolidation and archival
  - _Leverage: Standard directory creation, existing archived/ pattern in analysis/_
  - _Requirements: 2_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with expertise in directory structure management | Task: Create archived/ subdirectory in analysis/docs-flow-automation/ following requirement 2 and existing archived/ directory patterns | Restrictions: Use `mkdir -p` to create directory, ensure it's tracked in git (add .gitkeep if needed), do not move files yet | _Leverage: Existing analysis/archived/ pattern_ | Success: (1) Directory analysis/docs-flow-automation/archived/ exists, (2) Directory is tracked in git, (3) No files moved yet | Instructions: Mark task as in-progress [-], create directory, verify with `ls -la analysis/docs-flow-automation/`, log implementation, mark complete [x]_

- [x] 3. Merge gitignore analysis documents into GIT_INTEGRATION_GUIDE.md
  - Files:
    - Read: `analysis/docs-flow-automation/GITIGNORE_STRATEGY.md`
    - Read: `analysis/docs-flow-automation/COMPLETE_GITIGNORE_GUIDE.md`
    - Read: `analysis/docs-flow-automation/GIT_STRATEGY_ANALYSIS.md`
    - Create: `analysis/docs-flow-automation/GIT_INTEGRATION_GUIDE.md`
  - Extract unique sections from all 3 documents
  - Combine best practices, solutions, and examples
  - Target size: ≤15KB (current 3 files = 40KB total)
  - Purpose: Create single authoritative gitignore guide, eliminate redundancy
  - _Leverage: Existing markdown structure, section organization patterns_
  - _Requirements: 2_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer with expertise in documentation consolidation and markdown | Task: Merge 3 gitignore analysis documents into one comprehensive GIT_INTEGRATION_GUIDE.md (≤15KB) following requirement 2, extracting unique sections and best practices | Restrictions: Must read all 3 source files, combine unique content (no duplication), maintain clarity and structure, target file size ≤15KB, do not delete originals yet | _Leverage: Markdown structure patterns, section organization from existing docs_ | Success: (1) GIT_INTEGRATION_GUIDE.md created with consolidated content, (2) File size ≤15KB, (3) Contains: Problem statement, Solutions, Implementation, Examples sections, (4) No duplicate information, (5) Includes "History" section linking to original 3 docs in archived/ | Instructions: Mark in-progress [-], read all 3 files, create merged document, verify size with `wc -c`, log implementation (show merge strategy used), mark complete [x]_

- [x] 4. Archive original gitignore documents
  - Files:
    - Move: `analysis/docs-flow-automation/GITIGNORE_STRATEGY.md` → `archived/`
    - Move: `analysis/docs-flow-automation/COMPLETE_GITIGNORE_GUIDE.md` → `archived/`
    - Move: `analysis/docs-flow-automation/GIT_STRATEGY_ANALYSIS.md` → `archived/`
  - Use `git mv` to preserve history
  - Verify only GIT_INTEGRATION_GUIDE.md remains in active directory
  - Purpose: Complete consolidation by archiving originals
  - _Leverage: Git mv command_
  - _Requirements: 2_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with Git expertise | Task: Move 3 original gitignore documents to archived/ subdirectory following requirement 2 after consolidation (task 3) is complete | Restrictions: Must use `git mv` for each file, verify task 3 completed first (GIT_INTEGRATION_GUIDE.md exists), do not delete files, verify files are still tracked in git after move | _Leverage: Git mv for history preservation_ | Success: (1) All 3 files moved to analysis/docs-flow-automation/archived/, (2) Git history preserved for all files, (3) Only GIT_INTEGRATION_GUIDE.md + archived/ remain in docs-flow-automation/, (4) All files tracked in git | Instructions: Mark in-progress [-], move files with git mv, verify with `ls analysis/docs-flow-automation/` and `git log --follow`, log implementation, mark complete [x]_

- [x] 5. Archive ARCHITECTURE_REVIEW.md and ULTRATHINK_ANALYSIS.md
  - Files:
    - Move: `analysis/docs-flow-automation/ARCHITECTURE_REVIEW.md` → `archived/`
    - Move: `analysis/docs-flow-automation/ULTRATHINK_ANALYSIS.md` → `archived/`
  - Use `git mv` to preserve history
  - Purpose: Archive completed analysis documents
  - _Leverage: Git mv command_
  - _Requirements: 2_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with Git expertise | Task: Move ARCHITECTURE_REVIEW.md and ULTRATHINK_ANALYSIS.md to archived/ subdirectory following requirement 2 (implementation complete, archiving for history) | Restrictions: Must use `git mv`, verify files exist before moving, do not delete, ensure git tracking preserved | _Leverage: Git mv_ | Success: (1) Both files moved to analysis/docs-flow-automation/archived/, (2) Git history preserved, (3) Files tracked in git, (4) Only GIT_INTEGRATION_GUIDE.md + archived/ remain active | Instructions: Mark in-progress [-], move files, verify structure, log implementation, mark complete [x]_

## Phase 3: Version Plan Migration (Low Risk)

- [x] 6. Move v0.1.5_plan.md to version directory
  - File: `analysis/current/v0.1.5_plan.md` → `analysis/v0.1.5/plan.md`
  - Use `git mv` to preserve history
  - Purpose: Organize historical version plans in their respective version directories
  - _Leverage: Git mv, existing version directory structure_
  - _Requirements: 3_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with Git and file organization expertise | Task: Move v0.1.5_plan.md from current/ to analysis/v0.1.5/plan.md following requirement 3 | Restrictions: Must use `git mv`, verify analysis/v0.1.5/ directory exists before moving, rename file to `plan.md` (standardized name), do not modify contents | _Leverage: Git mv, existing v0.1.5/ directory_ | Success: (1) File moved to analysis/v0.1.5/plan.md, (2) Git history preserved, (3) File tracked in git, (4) Naming consistent with other version directories | Instructions: Mark in-progress [-], verify target directory exists, git mv file, verify with `ls analysis/v0.1.5/`, log implementation, mark complete [x]_

- [x] 7. Move v0.1.6_plan.md to version directory
  - File: `analysis/current/v0.1.6_plan.md` → `analysis/v0.1.6/plan.md`
  - Use `git mv` to preserve history
  - Purpose: Organize historical version plans in their respective version directories
  - _Leverage: Git mv, existing version directory structure_
  - _Requirements: 3_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with Git and file organization expertise | Task: Move v0.1.6_plan.md from current/ to analysis/v0.1.6/plan.md following requirement 3 | Restrictions: Must use `git mv`, verify analysis/v0.1.6/ exists, rename to `plan.md`, do not modify contents | _Leverage: Git mv, existing v0.1.6/ directory_ | Success: (1) File moved to analysis/v0.1.6/plan.md, (2) Git history preserved, (3) File tracked, (4) Consistent naming | Instructions: Mark in-progress [-], git mv file, verify, log implementation, mark complete [x]_

- [x] 8. Move v0.1.7_extraction_fix_plan.md to version directory
  - File: `analysis/current/v0.1.7_extraction_fix_plan.md` → `analysis/v0.1.7/plan.md`
  - Use `git mv` to preserve history
  - Purpose: Organize historical version plans in their respective version directories
  - _Leverage: Git mv, existing version directory structure_
  - _Requirements: 3_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with Git and file organization expertise | Task: Move v0.1.7_extraction_fix_plan.md from current/ to analysis/v0.1.7/plan.md following requirement 3 | Restrictions: Must use `git mv`, verify analysis/v0.1.7/ exists, rename to `plan.md`, do not modify contents | _Leverage: Git mv, existing v0.1.7/ directory_ | Success: (1) File moved to analysis/v0.1.7/plan.md, (2) Git history preserved, (3) File tracked, (4) Consistent naming | Instructions: Mark in-progress [-], git mv file, verify, log implementation, mark complete [x]_

- [x] 9. Move 提取逻辑根本缺陷诊断报告.md to v0.1.6 directory
  - File: `analysis/current/提取逻辑根本缺陷诊断报告.md` → `analysis/v0.1.6/extraction_issues.md`
  - Use `git mv` to preserve history
  - Rename to English filename for consistency
  - Purpose: Associate diagnostic report with version where issue was discovered (v0.1.6)
  - _Leverage: Git mv_
  - _Requirements: 3_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with Git and file organization expertise | Task: Move 提取逻辑根本缺陷诊断报告.md from current/ to analysis/v0.1.6/extraction_issues.md following requirement 3 (discovered during v0.1.6) | Restrictions: Must use `git mv`, rename to English `extraction_issues.md` for consistency, verify v0.1.6/ exists, do not modify contents | _Leverage: Git mv_ | Success: (1) File moved to analysis/v0.1.6/extraction_issues.md, (2) Git history preserved, (3) English filename for consistency, (4) File tracked | Instructions: Mark in-progress [-], git mv with rename, verify, log implementation, mark complete [x]_

- [x] 10. Delete empty current/ directory
  - Directory: `analysis/current/`
  - Verify directory is empty before deletion
  - Purpose: Eliminate "special case" directory, complete version plan migration
  - _Leverage: Standard directory operations_
  - _Requirements: 3_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with file system expertise | Task: Delete empty current/ directory following requirement 3 after all files migrated (tasks 6-9 complete) | Restrictions: MUST verify directory is empty first (`ls -la analysis/current/`), do not delete if any files remain, use `rmdir` not `rm -rf` (safety check), verify deletion with git status | _Leverage: rmdir command (fails if not empty)_ | Success: (1) Verified directory empty first, (2) Directory deleted, (3) Git status shows deletion, (4) analysis/ structure cleaner (no current/ special case) | Instructions: Mark in-progress [-], verify empty, rmdir, git status, log implementation, mark complete [x]_

## Phase 4: Archival of Completed Work (Low Risk)

- [x] 11. Move P0_optimization_report_20251113.md to archived
  - File: `analysis/P0_optimization_report_20251113.md` → `analysis/archived/`
  - Use `git mv` to preserve history
  - Purpose: Archive completed P0 optimization work (>7 days old, work complete)
  - _Leverage: Git mv, existing archived/ directory_
  - _Requirements: 4_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with archival management expertise | Task: Move P0_optimization_report_20251113.md to archived/ following requirement 4 (completed work from 2025-11-13, archival criteria met) | Restrictions: Must use `git mv`, verify file is >7 days old or work is complete, do not modify contents, ensure archived/ directory exists | _Leverage: Git mv, existing analysis/archived/_ | Success: (1) File moved to analysis/archived/P0_optimization_report_20251113.md, (2) Git history preserved, (3) File tracked, (4) Analysis/ root cleaner | Instructions: Mark in-progress [-], git mv file, verify, log implementation, mark complete [x]_

- [x] 12. Create archived/ README.md
  - File: `analysis/archived/README.md` (new)
  - Document archival criteria and policy
  - List archived documents with brief descriptions
  - Purpose: Explain archived/ purpose and help developers find historical documents
  - _Leverage: Markdown documentation patterns_
  - _Requirements: 4_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer with documentation expertise | Task: Create README.md in archived/ directory following requirement 4, explaining archival policy and documenting archived files | Restrictions: Must explain archival criteria (>7 days old, work complete, not in active development), list current archived files with brief descriptions, maintain consistent markdown style, keep concise (≤2KB) | _Leverage: Existing README patterns in project_ | Success: (1) README.md created in analysis/archived/, (2) Archival criteria clearly explained, (3) All archived files listed with descriptions, (4) Markdown formatting consistent with project style, (5) File tracked in git | Instructions: Mark in-progress [-], create README, list current archived files, verify format, log implementation, mark complete [x]_

## Phase 5: Link Integrity Updates (High Risk - Affects Multiple Files)

- [x] 13. Find all markdown links in documentation
  - Files: Scan all .md files in docs/, analysis/, and root
  - Use ripgrep to find relative markdown links: `\[.*\]\(\.\.?/.*\.md\)`
  - Generate link inventory before updates
  - Purpose: Prepare comprehensive link update plan
  - _Leverage: Ripgrep for fast searching_
  - _Requirements: 5_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with regex and search expertise | Task: Scan all markdown files and inventory relative markdown links following requirement 5, preparing for link updates | Restrictions: Use ripgrep with pattern `\[.*\]\(\.\.?/.*\.md\)`, scan docs/, analysis/, root .md files, generate inventory file (link_inventory.txt) with format "file:line:link", do not modify any files yet, include links to moved files only | _Leverage: Ripgrep for fast pattern search_ | Success: (1) All relative markdown links found, (2) Inventory saved to temp file, (3) Links to moved files identified (DOCS_FLOW_REDESIGN.md, current/*, docs-flow-automation originals), (4) No files modified yet | Instructions: Mark in-progress [-], run ripgrep, save output, analyze moved files, log implementation (show sample links found), mark complete [x]_

- [x] 14. Update links in docs/PROJECT_STATUS.md
  - File: `docs/PROJECT_STATUS.md`
  - Update links to moved files based on task 13 inventory
  - Verify all updated links resolve correctly
  - Purpose: Maintain link integrity in project status dashboard
  - _Leverage: Link inventory from task 13, sed/awk for updates_
  - _Requirements: 5_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with text processing and link management expertise | Task: Update all broken markdown links in PROJECT_STATUS.md following requirement 5 after files moved in previous tasks | Restrictions: Use link inventory from task 13, update only links to moved files, verify each updated link resolves (file exists at new path), test from PROJECT_STATUS.md location (docs/), maintain link text unchanged, only update paths | _Leverage: Link inventory, sed/grep for text replacement_ | Success: (1) All links to moved files updated, (2) All updated links verified to resolve, (3) Link text unchanged, (4) No broken links remain, (5) File syntax valid markdown | Instructions: Mark in-progress [-], read inventory, update links, verify each with file existence check, log implementation (show before/after links), mark complete [x]_

- [x] 15. Update links in docs/implementation_record.md
  - File: `docs/implementation_record.md`
  - Update links to moved files based on task 13 inventory
  - Verify all updated links resolve correctly
  - Purpose: Maintain link integrity in implementation record
  - _Leverage: Link inventory from task 13_
  - _Requirements: 5_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with text processing expertise | Task: Update all broken markdown links in implementation_record.md following requirement 5 | Restrictions: Same as task 14, use link inventory, verify all links, test from implementation_record.md location (docs/), maintain link text | _Leverage: Link inventory, text processing tools_ | Success: (1) All links updated, (2) All verified, (3) No broken links, (4) Valid markdown | Instructions: Mark in-progress [-], update links, verify, log implementation, mark complete [x]_

- [x] 16. Update links in CLAUDE.md
  - File: `CLAUDE.md`
  - Update links to moved files based on task 13 inventory
  - Verify all updated links resolve correctly
  - Purpose: Maintain link integrity in quick recovery guide
  - _Leverage: Link inventory from task 13_
  - _Requirements: 5_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with text processing expertise | Task: Update all broken markdown links in CLAUDE.md following requirement 5 | Restrictions: Same as task 14, use link inventory, verify all links, test from CLAUDE.md location (root), maintain link text | _Leverage: Link inventory_ | Success: (1) All links updated, (2) All verified, (3) No broken links, (4) Valid markdown | Instructions: Mark in-progress [-], update links, verify, log implementation, mark complete [x]_

- [x] 17. Update links in version directories (analysis/v0.1.X/)
  - Files: All .md files in `analysis/v0.1.4/`, `v0.1.5/`, `v0.1.6/`, `v0.1.7/`
  - Update links to moved files based on task 13 inventory
  - Verify all updated links resolve correctly
  - Purpose: Maintain link integrity in version-specific documentation
  - _Leverage: Link inventory from task 13, batch processing_
  - _Requirements: 5_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with batch processing and link management expertise | Task: Update all broken markdown links in version directories following requirement 5 | Restrictions: Process all .md files in v0.1.4/, v0.1.5/, v0.1.6/, v0.1.7/ directories, use link inventory, verify links from each file's location, maintain link text, batch process efficiently | _Leverage: Link inventory, for loop for batch processing_ | Success: (1) All version directory links updated, (2) All verified, (3) No broken links in any version directory, (4) All markdown valid | Instructions: Mark in-progress [-], batch update all version dirs, verify, log implementation (show files processed), mark complete [x]_

- [x] 18. Final link validation across entire project
  - Files: All .md files in project
  - Run comprehensive link validation script
  - Generate validation report
  - Purpose: Ensure 100% link integrity after reorganization
  - _Leverage: Markdown link checker or custom validation script_
  - _Requirements: 5_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with validation and testing expertise | Task: Perform final comprehensive link validation across entire project following requirement 5 | Restrictions: Validate ALL markdown files (docs/, analysis/, root, .spec-workflow/), check both relative and absolute links, generate validation report showing: total links checked, valid links, broken links (with file:line), must achieve 100% valid links before proceeding, use markdown-link-check or custom script | _Leverage: markdown-link-check npm package or ripgrep + bash validation_ | Success: (1) All markdown files validated, (2) Validation report generated, (3) 100% links valid (zero broken links), (4) Report saved for commit message reference | Instructions: Mark in-progress [-], run validator, generate report, verify 100% success, log implementation (include validation report summary), mark complete [x]_

## Phase 6: Final Verification and Git Commit (Critical)

- [x] 19. Verify final directory structure
  - Directories: Root, docs/, analysis/
  - Verify matches design expectations
  - Generate structure comparison report
  - Purpose: Confirm reorganization completed successfully
  - _Leverage: tree command or ls -R, diff with expected structure_
  - _Requirements: All (1-5)_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with file system and validation expertise | Task: Verify final directory structure matches all requirements 1-5 and design.md expectations | Restrictions: Check: (1) Root only has README.md + CLAUDE.md, (2) docs-flow-automation has GIT_INTEGRATION_GUIDE.md + archived/, (3) No current/ directory, (4) All version dirs have plan.md, (5) archived/ has README.md, use `tree -L 3 analysis/` and `ls -la *.md` for verification, generate structure report | _Leverage: tree command, diff against expected structure_ | Success: (1) Root structure verified (2 .md files only), (2) docs-flow-automation structure verified, (3) current/ deleted, (4) Version dirs consistent, (5) archived/ complete, (6) Structure report generated and saved | Instructions: Mark in-progress [-], verify structure, generate report, log implementation (include structure tree), mark complete [x]_

- [x] 20. Create atomic Git commit
  - Action: Git commit with all reorganization changes
  - Write comprehensive commit message following project conventions
  - Verify commit includes all file moves and updates
  - Purpose: Preserve reorganization as atomic change in git history
  - _Leverage: Git commit conventions from CLAUDE.md_
  - _Requirements: All (1-5)_
  - _Prompt: Implement the task for spec docs-structure-cleanup, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Senior Developer with Git expertise and commit message best practices | Task: Create atomic git commit for entire documentation reorganization following all requirements 1-5 | Restrictions: Must include: (1) All file moves (git mv preserved history), (2) New files (GIT_INTEGRATION_GUIDE.md, archived/ README.md), (3) Link updates in all .md files, (4) Deleted current/ directory, write commit message following CLAUDE.md format: "docs: reorganize documentation structure (eliminate special cases)" with body explaining: what was moved, why (Linus principles), verification results (100% link integrity, structure validated), use multi-line commit message with details | _Leverage: CLAUDE.md commit message conventions, git commit -v for verification_ | Success: (1) Single atomic commit created, (2) All changes included (verify with git status - should be clean), (3) Commit message comprehensive and clear, (4) Git history preserved for moved files, (5) Commit ready for push | Instructions: Mark in-progress [-], stage all changes (git add -A), write detailed commit message, commit, verify git status clean, log implementation (include commit SHA and message), mark complete [x]_

## Implementation Notes

**Recommended Execution Order**:
1. Phase 1 (Task 1) - Independent, low risk
2. Phase 2 (Tasks 2-5) - Independent, medium risk (document merging)
3. Phase 3 (Tasks 6-10) - Independent, low risk
4. Phase 4 (Tasks 11-12) - Depends on Phase 1-3 completion (avoid moving files twice)
5. Phase 5 (Tasks 13-18) - Depends on ALL previous phases (knows final file locations)
6. Phase 6 (Tasks 19-20) - Final verification and commit

**Testing After Each Phase**:
- After Phase 1: `ls -la *.md` (should show only README.md + CLAUDE.md)
- After Phase 2: `tree analysis/docs-flow-automation/` (should show GIT_INTEGRATION_GUIDE.md + archived/)
- After Phase 3: `ls analysis/current/` (should fail - directory deleted)
- After Phase 4: `tree analysis/archived/` (should show all archived files + README.md)
- After Phase 5: Run link validation (should show 100% valid)
- After Phase 6: `git status` (should be clean after commit)

**Rollback Strategy**:
If any phase fails, rollback is simple:
```bash
git restore --staged .    # Unstage all changes
git restore .             # Restore all modified files
git clean -fd             # Remove untracked files/directories
```

**Key Success Metrics**:
- Root directory .md files: 3 → 2 ✓
- docs-flow-automation files: 5 → 2 (1 active + 1 archived dir) ✓
- analysis/current/ deleted ✓
- Broken links: 0 (100% integrity) ✓
- Git history preserved for all moves ✓
