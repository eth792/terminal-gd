# Requirements Document

## Introduction

CLAUDE.md currently contains 843 lines mixing two distinct types of content:
1. **AI behavioral instructions** - How Claude Code should think, communicate, and use tools
2. **Project state data** - Current KPIs, version history, workflows, and technical details

This violates the Single Responsibility Principle and causes:
- High context consumption on session initialization
- Difficulty maintaining AI instructions separately from evolving project data
- Confusion about where to update information (CLAUDE.md vs docs/ vs analysis/)

**Purpose**: Refactor CLAUDE.md to contain only AI meta-instructions (~200-300 lines), moving project-specific data to appropriate locations in docs/ while maintaining zero information loss and clear navigation paths.

**Value**:
- Reduce session initialization context by ~65% (843 → 300 lines)
- Improve maintainability by separating concerns
- Enable faster Claude Code startup and clearer documentation structure

## Alignment with Product Vision

This feature supports the "Good Taste" philosophy from CLAUDE.md itself:
- **Eliminate special cases**: No more "if new session read this, if releasing read that" - just clear separation
- **Single source of truth**: Project data in docs/, AI instructions in CLAUDE.md
- **Reduce complexity**: From 843 lines with 10+ concepts to 300 lines with 3-4 core concepts

## Requirements

### Requirement 1: Preserve AI Behavioral Instructions

**User Story:** As Claude Code, I want CLAUDE.md to contain all essential behavioral meta-instructions, so that I know how to think, communicate, and operate correctly on this project.

#### Acceptance Criteria

1. WHEN Claude Code reads CLAUDE.md THEN it SHALL find:
   - Complete Linus Torvalds role definition with 4 core philosophies
   - Communication principles (language, style, verification workflow)
   - Tool usage guidelines (spec-workflow, docs-flow, MCP tools)
   - Core architectural concepts (monorepo structure, data flow)

2. WHEN implementing a feature THEN Claude Code SHALL know:
   - The 3 mandatory rules (single-change, fail-stop, context budget)
   - How to use TodoWrite for task tracking
   - When to use specialized agents
   - Git workflow conventions

3. WHEN encountering errors THEN Claude Code SHALL find:
   - Basic troubleshooting guidance
   - Reference to detailed troubleshooting in docs/

### Requirement 2: Relocate Project State Data

**User Story:** As a project maintainer, I want project-specific data (KPIs, version history, workflows) in docs/ rather than CLAUDE.md, so that I can update project information without modifying AI instructions.

#### Acceptance Criteria

1. WHEN updating current version KPIs THEN maintainer SHALL:
   - Find KPI data in `docs/PROJECT_STATUS.md` only
   - Not need to edit CLAUDE.md

2. WHEN referencing version release workflow THEN maintainer SHALL:
   - Find workflow in `analysis/docs-flow-automation/RELEASE_WORKFLOW.md`
   - Find CLAUDE.md pointing to this location with brief summary

3. WHEN checking technical decisions THEN maintainer SHALL:
   - Find decision log in `docs/TECHNICAL_DECISIONS.md` or `analysis/v*/`
   - Find CLAUDE.md referencing appropriate locations

### Requirement 3: Maintain Navigation Clarity

**User Story:** As a new Claude Code session, I want CLAUDE.md to provide clear navigation pointers to all essential project information, so that I can quickly orient myself without loading 843 lines of mixed content.

#### Acceptance Criteria

1. WHEN a new session starts THEN Claude Code SHALL find in CLAUDE.md:
   - "Quick Start" section pointing to:
     - `docs/PROJECT_STATUS.md` - Current state dashboard
     - `docs/implementation_record.md` - Version history
     - `analysis/docs-flow-automation/` - Workflow guides
   - Each pointer with 1-2 sentence description of what's there

2. WHEN needing workflow guidance THEN Claude Code SHALL find:
   - Brief workflow summary in CLAUDE.md (3-5 bullet points)
   - "See detailed workflow: [path]" reference
   - No need to read 843 lines to find the right section

3. WHEN recovering from previous session THEN Claude Code SHALL find:
   - Simple 3-step recovery process in CLAUDE.md
   - References to detailed status in PROJECT_STATUS.md
   - No duplicated KPI data in multiple files

### Requirement 4: Zero Information Loss

**User Story:** As a project stakeholder, I want all current information in CLAUDE.md to remain accessible after refactoring, so that no valuable context or decisions are lost.

#### Acceptance Criteria

1. WHEN refactoring THEN system SHALL:
   - Create new files in docs/ or analysis/ for relocated content
   - Update all cross-references to new locations
   - Preserve all technical decisions, workflow details, and project history

2. WHEN validating migration THEN reviewer SHALL:
   - Find 100% of original CLAUDE.md content in new locations
   - Verify all internal links updated correctly
   - Confirm no orphaned information

3. WHEN comparing before/after THEN audit SHALL show:
   - All content preserved (possibly reorganized)
   - New organization improves findability
   - No broken references

### Requirement 5: Backward Compatible References

**User Story:** As an external tool or script, I want CLAUDE.md to maintain stable key sections, so that automated processes continue to work.

#### Acceptance Criteria

1. WHEN external scripts reference CLAUDE.md sections THEN:
   - Core section headers remain stable (e.g., "## 强制规则", "## 核心架构理念")
   - Removed sections have clear redirect comments
   - No breaking changes to automation touchpoints

2. WHEN docs-flow automation runs THEN it SHALL:
   - Continue to work without modification
   - Find any CLAUDE.md updates compatible with existing patterns

## Non-Functional Requirements

### Code Architecture and Modularity
- **Single Responsibility Principle**: CLAUDE.md = AI instructions only, docs/ = project data
- **Clear Interfaces**: Navigation pointers with consistent format
- **Minimal Duplication**: KPI data exists in exactly one canonical location

### Performance
- CLAUDE.md size: 843 lines → target 200-300 lines (-65% reduction)
- Session initialization context: Reduce by ~15-20k tokens
- Load time: Negligible (files are small)

### Reliability
- All cross-references validated with grep/search
- Git history preserved for moved content
- Rollback plan: Git revert if issues found

### Usability
- Clear navigation from CLAUDE.md to detailed docs
- Logical grouping of related content
- Consistent naming conventions (RELEASE_WORKFLOW.md, TECHNICAL_DECISIONS.md, etc.)
