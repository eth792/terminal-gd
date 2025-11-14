# Requirements Document

## Introduction

This spec defines the integration of spec-workflow MCP and docs-flow-automation systems to enable reliable AI session recovery and eliminate information duplication. The integration addresses a critical design flaw: the session recovery guide depends on `.spec-workflow/specs/` being in git, but currently it's in `.gitignore`.

**Value Proposition:**
- **Session recovery success rate**: 60% → 95% (+58%)
- **Maintenance cost**: Reduce by 30% through eliminating 20% information duplication
- **AI code discovery**: Enable automatic discovery of existing implementations
- **Multi-person collaboration**: 100% knowledge sharing across team members

## Alignment with Product Vision

This integration supports the project's core goal of **automated documentation and context recovery**:

1. **Reliability First**: Session recovery must work reliably across new sessions, machines, and team members
2. **Single Source of Truth**: Each piece of information should exist in exactly one place
3. **AI-Friendly**: Enable AI agents to discover existing code and avoid duplication
4. **Human-Friendly**: Keep documents concise and navigable for human developers

## Requirements

### Requirement 1: .spec-workflow in Git for Session Recovery

**User Story:** As an AI agent starting a new session, I want to access spec-workflow specs and implementation logs, so that I can recover project context and discover existing implementations without requiring users to re-explain the project.

#### Acceptance Criteria

1. WHEN a new session starts in a fresh clone THEN the AI SHALL be able to read `.spec-workflow/specs/` via MCP
2. WHEN AI searches for existing implementations THEN it SHALL find artifacts in Implementation Logs (API endpoints, components, functions, classes)
3. IF `.spec-workflow/specs/` does not exist THEN session recovery Step 1 SHALL fail with a clear error message
4. WHEN multiple developers collaborate THEN they SHALL all see the same spec history via git

**Technical Requirements:**
- `.spec-workflow/specs/` must be tracked in git
- `.spec-workflow/templates/` must be tracked in git
- Temporary files (approvals/, .cache/, logs/, tmp/, *.backup) must be excluded via .gitignore
- Size impact should be ≤10MB per spec (acceptable for git)

### Requirement 2: Eliminate Information Duplication via References

**User Story:** As a developer maintaining documentation, I want to avoid duplicating code file lists and statistics across spec logs and docs-flow documents, so that I only need to update information in one place and reduce maintenance burden.

#### Acceptance Criteria

1. WHEN `update-docs.js` generates version entries THEN it SHALL NOT include code file lists or line statistics
2. WHEN `update-docs.js` generates version entries THEN it SHALL include a reference link to corresponding spec Implementation Logs
3. WHEN CLAUDE.md is updated THEN it SHALL reference spec logs instead of listing code changes
4. IF spec logs are unavailable THEN documentation SHALL gracefully degrade with a note about missing details
5. WHEN `release.js` completes THEN it SHALL output the spec logs location for developer reference

**Information Flow:**
- spec-workflow Implementation Logs (source) → docs-flow documents (summary + reference)
- Single-direction aggregation (not reversible)
- Link format: `[查看 spec logs](./.spec-workflow/specs/{specName}/)`

### Requirement 3: Explicit Session Recovery Prerequisites

**User Story:** As an AI agent following the session recovery guide, I want explicit Step 0 instructions to verify environment prerequisites, so that I can fail fast with clear error messages if the environment is not ready instead of failing mysteriously at Step 1.

#### Acceptance Criteria

1. WHEN CLAUDE.md section "快速恢复本项目" is read THEN it SHALL start with "Step 0: 验证环境"
2. WHEN Step 0 is executed THEN it SHALL verify `.spec-workflow/specs/` exists
3. WHEN Step 0 is executed THEN it SHALL verify MCP tools are available (spec-workflow MCP, file MCP)
4. IF Step 0 fails THEN the guide SHALL provide clear troubleshooting instructions
5. WHEN Step 0 succeeds THEN Steps 1-4 SHALL execute reliably (95% success rate target)

**Step 0 Checklist:**
- [ ] `.spec-workflow/specs/` directory exists and is not empty
- [ ] spec-workflow MCP is available
- [ ] File MCP is available
- [ ] Project is at correct git branch (usually `main`)

### Requirement 4: Selective .gitignore for .spec-workflow

**User Story:** As a developer committing changes, I want git to track only meaningful spec-workflow files (specs, templates) and exclude temporary runtime files (approvals, cache, logs), so that git history remains clean while preserving knowledge assets.

#### Acceptance Criteria

1. WHEN `.gitignore` is applied THEN `.spec-workflow/specs/` SHALL be tracked
2. WHEN `.gitignore` is applied THEN `.spec-workflow/templates/` SHALL be tracked
3. WHEN `.gitignore` is applied THEN `.spec-workflow/approvals/` SHALL be excluded
4. WHEN `.gitignore` is applied THEN `.spec-workflow/.cache/`, `logs/`, `tmp/` SHALL be excluded
5. WHEN `.gitignore` is applied THEN `*.backup`, `*.log`, `.snapshots/` SHALL be excluded
6. WHEN `git status .spec-workflow/` is run THEN only specs and templates SHALL appear
7. IF archive/ contains valuable specs THEN it SHALL be tracked (default behavior)
8. IF archive/ contains garbage THEN user MAY exclude it by uncommenting gitignore line

**Excluded Patterns:**
```
.spec-workflow/approvals/
.spec-workflow/.cache/
.spec-workflow/logs/
.spec-workflow/tmp/
.spec-workflow/specs/*/*.backup
.spec-workflow/specs/*/*.log
.spec-workflow/specs/*/.snapshots/
.spec-workflow/**/.DS_Store
.spec-workflow/**/*.swp
.spec-workflow/**/*.swo
.spec-workflow/**/*~
```

### Requirement 5: Simplified docs-flow Auto-Generation

**User Story:** As a developer running `npm run release`, I want the auto-generated parts of documentation to be minimal and focused on version-level summaries, so that I spend less time filling in repetitive details and more time on valuable insights.

#### Acceptance Criteria

1. WHEN `updateImplementationRecord()` runs THEN it SHALL generate version entry with KPI, placeholders, and spec reference
2. WHEN `updateImplementationRecord()` runs THEN it SHALL NOT generate code file lists
3. WHEN `updateImplementationRecord()` runs THEN it SHALL NOT generate code statistics (lines added/removed)
4. WHEN `updateClaudeMd()` runs THEN it SHALL update with KPI and spec reference, not code details
5. WHEN developer needs code details THEN they SHALL click the spec logs reference link
6. WHEN placeholders exist THEN they SHALL be clearly marked with [📝 待手动补充]

**Auto-Generated Fields:**
- Version metadata (number, date, title)
- KPI comparison (Exact, Review, Fail percentages)
- Spec logs reference link
- Test run bundle ID
- Placeholders for manual input (key findings, technical insights)

**Manual Fields** (not auto-generated):
- Key findings (core discoveries)
- Technical insights (lessons learned, design decisions)

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility Principle**:
  - `update-docs.js`: Only handle docs-flow automation (KPI extraction, document updates)
  - spec-workflow MCP: Only handle implementation logging (code artifacts, task tracking)
  - Each document has one job: specs (process), docs (results), CLAUDE.md (recovery)

- **Modular Design**:
  - Changes to spec-workflow should not require changes to docs-flow (except reference links)
  - Changes to docs-flow should not require changes to spec-workflow
  - Integration points are explicit (reference links only)

- **Dependency Management**:
  - docs-flow → spec-workflow (read-only dependency via file references)
  - spec-workflow → standalone (no dependency on docs-flow)
  - Clear unidirectional information flow

- **Clear Interfaces**:
  - Reference link format: `./.spec-workflow/specs/{specName}/`
  - Placeholder format: `[📝 待手动补充 - {guidance}]`
  - Spec naming: kebab-case (e.g., `spec-docs-integration`)

### Performance

- **Git repository size impact**: ≤10MB per spec (measured after compression)
- **Session recovery time**: ≤3 minutes (from Step 0 to Step 3 completion)
- **Release process time**: ≤10 minutes (4-step flow including manual input)
- **MCP read latency**: ≤2 seconds per spec document read

### Reliability

- **Session recovery success rate**: ≥95% (when prerequisites are met)
- **Information accuracy**: 100% (KPI extraction must be correct)
- **Atomic updates**: All-or-nothing document updates (rollback on any failure)
- **Graceful degradation**: If spec logs unavailable, show placeholder instead of breaking

### Usability

- **Clear error messages**: If Step 0 fails, explain what's missing and how to fix
- **Minimal manual work**: Auto-generate framework, manual only for insights (≤5 minutes per release)
- **Zero information loss**: All details in spec logs, summaries in docs
- **Discoverable**: Reference links are clickable in VS Code, GitHub, and local file browsers

### Backward Compatibility

- **Existing workflows preserved**: `npm run release` flow unchanged (still 4 steps)
- **Document structure unchanged**: CLAUDE.md, PROJECT_STATUS.md, implementation_record.md keep same section structure
- **Git history clean**: No forced rewrites, only forward additions
- **Existing specs**: Can be added to git incrementally, no migration required

## Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Session recovery success rate | 60% | 95% | Test 20 new sessions, count successes |
| Session recovery time | 10-15 min | 2-3 min | Time from Step 0 to Checklist output |
| Information duplication | 20% | 0% | Count repeated code lists/stats |
| Maintenance cost | Medium | Low | Developer survey (time spent on docs per release) |
| AI code discovery success | 0% | 90% | Test 10 "find existing X" queries |
| Release process time | 40 min | 10 min | Time from test completion to git commit |

## Out of Scope

The following are explicitly **NOT** included in this integration:

- ❌ Migrating existing analysis/ documents to spec-workflow format
- ❌ Changing the structure of PROJECT_STATUS.md or implementation_record.md
- ❌ Automating the manual fields (key findings, technical insights)
- ❌ Creating new specs for historical versions (v0.1.0-v0.1.7)
- ❌ Modifying the spec-workflow MCP server itself
- ❌ Changing the 4-step release flow (only content generation changes)

These may be addressed in future iterations but are not required for this integration to succeed.
