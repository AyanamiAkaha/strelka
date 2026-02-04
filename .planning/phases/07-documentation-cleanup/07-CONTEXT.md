# Phase 7: Documentation Cleanup - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

## Phase Boundary

Resolve technical debt and complete documentation requirements:
- Camera.ts: Add JSDoc referencing coordinate system documentation
- DataProvider.ts: Resolve or update TODO comments

This phase improves code maintainability and developer documentation without adding new features or functionality.

## Implementation Decisions

### JSDoc scope and depth
- Moderate level: class-level JSDoc plus documentation for public methods and key properties
- Include @param and @returns tags with explicit descriptions (not just rely on TypeScript types)
- No usage examples in JSDoc
- Include @see references to coordinate system documentation

### TODO handling strategy
- Remove TODOs that are either (a) already implemented in code, or (b) no longer applicable to current architecture
- For remaining TODOs: present list at end of phase for user review
- Create Gitea issues for TODOs user deems important
- Keep TODO comments in code, add explicit reference at the end (issue link or number)
- Reference format: append to existing TODO content without changing original text

### Documentation format and location
- Coordinate system documentation lives inline in Camera.ts class JSDoc (single source of truth)
- Plain text in JSDoc (no markdown formatting)
- High-level details only: Y-up convention, rotation direction, axis orientation
- Add cross-references in other files: ShaderManager.ts and other camera consumers should include @see tags to Camera.ts JSDoc

### Audience and assumptions
- Primary audience: Codebase maintainers (assume WebGL familiarity and codebase context)
- Expert WebGL knowledge assumed - document only project-specific conventions
- Claude's discretion: Document project-specific patterns (gl-matrix usage, quaternion convention) only if non-standard or prone to confusion
- Claude's discretion: Add warnings for known issues from Phase 1/1.1 (rotation bugs, drift, etc.)

### Claude's Discretion
- Which project-specific patterns warrant documentation (document only if non-standard or confusing)
- Which edge cases/gotchas need @warning tags in JSDoc (focus on known Phase 1/1.1 issues)
- Which methods in Camera.ts are considered "key properties" for JSDoc coverage
- Exact issue reference format for TODO comments (link vs number, where to append)

## Specific Ideas

- Coordinate system: Y-up convention, correct rotation direction
- Cross-references should link camera consumers back to Camera.ts as source of truth
- TODO references should preserve original comment text, appending issue info at the end

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 07-documentation-cleanup*
*Context gathered: 2026-02-04*
