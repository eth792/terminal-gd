# Requirements Document

## Introduction

The terminal-gd project has accumulated documentation sprawl that violates "Good Taste" design principles. The root directory contains temporary design documents, analysis folders contain redundant files (68KB discussing the same topic), and a "current/" directory contains historical version plans. This cleanup establishes a clear documentation hierarchy following the Single Source of Truth principle and eliminates special-case directories.

**Value**: Reduces documentation maintenance cost by 60%, eliminates 75% of information redundancy, and makes the project structure immediately comprehensible to new contributors.

## Alignment with Product Vision

This aligns with the DOCS_FLOW_REDESIGN goals documented in `.spec-workflow/specs/docs-flow-automation/`:
- **Context reduction**: Cleaner structure reduces context needed for new sessions
- **Documentation automation**: Proper hierarchy enables better automation
- **Linus principles**: "Good taste means eliminating special cases"

## Requirements

### Requirement 1: Root Directory Purity

**User Story:** As a developer opening this project, I want the root directory to contain only essential entry documents (README.md, CLAUDE.md), so that I immediately understand the project structure without being distracted by implementation details.

#### Acceptance Criteria

1. WHEN a developer lists root directory THEN system SHALL contain exactly 2 markdown files: README.md and CLAUDE.md
2. WHEN DOCS_FLOW_REDESIGN.md exists in root THEN system SHALL move it to `analysis/archived/DOCS_FLOW_REDESIGN.md`
3. WHEN any other temporary design documents exist in root THEN system SHALL move them to appropriate analysis/ subdirectories

### Requirement 2: Analysis Document Consolidation

**User Story:** As a developer researching the docs-flow-automation implementation, I want a single authoritative document for each topic, so that I don't waste time reading three analyses of the same problem.

#### Acceptance Criteria

1. WHEN docs-flow-automation contains multiple gitignore analysis documents THEN system SHALL merge them into one `GIT_INTEGRATION_GUIDE.md` (≤15KB)
2. WHEN GITIGNORE_STRATEGY.md, COMPLETE_GITIGNORE_GUIDE.md, and GIT_STRATEGY_ANALYSIS.md exist THEN system SHALL delete them after merge completion
3. WHEN ARCHITECTURE_REVIEW.md and ULTRATHINK_ANALYSIS.md are no longer referenced THEN system SHALL move them to `analysis/docs-flow-automation/archived/`
4. WHEN consolidation is complete THEN system SHALL maintain exactly 1 active document and 1 archived/ directory in docs-flow-automation/

### Requirement 3: Version Plan Organization

**User Story:** As a developer investigating version history, I want each version's plan document to reside in its version directory, so that I can find all related documents in one place.

#### Acceptance Criteria

1. WHEN v0.1.5_plan.md exists in current/ THEN system SHALL move it to `analysis/v0.1.5/plan.md`
2. WHEN v0.1.6_plan.md exists in current/ THEN system SHALL move it to `analysis/v0.1.6/plan.md`
3. WHEN v0.1.7_extraction_fix_plan.md exists in current/ THEN system SHALL move it to `analysis/v0.1.7/plan.md`
4. WHEN 提取逻辑根本缺陷诊断报告.md exists in current/ THEN system SHALL move it to `analysis/v0.1.6/extraction_issues.md` (discovered during v0.1.6)
5. WHEN all files are moved from current/ THEN system SHALL delete the current/ directory

### Requirement 4: Completed Analysis Archival

**User Story:** As a developer browsing the analysis/ directory, I want active work clearly separated from completed historical analysis, so that I focus on relevant documents.

#### Acceptance Criteria

1. WHEN P0_optimization_report_20251113.md is no longer referenced in active work THEN system SHALL move it to `analysis/archived/`
2. WHEN a document in analysis/ describes completed work (older than 7 days, no pending tasks) THEN system SHALL move it to archived/
3. WHEN archived/ directory exists THEN system SHALL contain a README.md explaining archival criteria

### Requirement 5: Link Reference Integrity

**User Story:** As a developer following documentation links, I want all internal references to resolve correctly after reorganization, so that I never encounter broken links.

#### Acceptance Criteria

1. WHEN any markdown file contains a relative link THEN system SHALL update it to reflect new file locations
2. WHEN PROJECT_STATUS.md references analysis documents THEN system SHALL verify all links resolve
3. WHEN implementation_record.md references version directories THEN system SHALL verify all links resolve
4. WHEN CLAUDE.md references analysis documents THEN system SHALL verify all links resolve
5. WHEN reorganization is complete THEN system SHALL validate 100% of internal markdown links

## Non-Functional Requirements

### Code Architecture and Modularity

- **Directory Structure Principles**:
  - Root directory: Only entry documents (README, CLAUDE)
  - docs/: Current project status and records (generated content)
  - analysis/: Deep analysis organized by version or topic
  - analysis/archived/: Completed work older than current development cycle
  - .spec-workflow/: Specification-driven development records

- **Single Source of Truth**: Each piece of information exists in exactly one file; other locations only reference it via links

- **No Special Cases**: No "current/" directory, no "temp/" directory - use version directories or archived/ consistently

### Maintainability

- **Link Verification**: Automated script to validate internal markdown links after any reorganization
- **Clear Naming**: File names must indicate purpose (e.g., `plan.md`, `extraction_issues.md`, not generic names)
- **Archival Policy**: Documents older than 7 days describing completed work move to archived/

### Performance

- **Context Reduction**: Documentation structure must enable loading ≤10K tokens to understand current project state
- **Search Efficiency**: Developers must find any historical decision within 3 file reads

### Usability

- **README in archived/**: archived/ must contain README.md explaining what's archived and why
- **Consistent Structure**: All version directories follow same pattern (plan.md + implementation reports)
