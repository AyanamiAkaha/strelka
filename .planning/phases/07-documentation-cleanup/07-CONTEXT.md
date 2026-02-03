# Phase 7: Documentation Cleanup - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

## Phase Boundary

Resolve technical debt in two specific locations:
- Camera.ts: Add JSDoc that references existing coordinate system documentation
- DataProvider.ts: Resolve or update TODO comments

This phase does NOT create new documentation systems or expand documentation scope beyond these two files.

## Implementation Decisions

### JSDoc depth for Camera.ts
- Lightweight reference only - no inline explanations of coordinate system
- Reference includes location only (file/section where coordinate system docs exist)
- JSDoc appears at class level + critical methods that depend on coordinate system
- No code examples included in JSDoc

### TODO resolution strategy for DataProvider.ts
- First step: Researcher identifies and summarizes all TODOs in DataProvider.ts
- User reviews summary and selects which TODOs to implement now (selected TODOs may become separate phases if complex)
- Non-selected TODOs: Move to issue tracker for future phases
- Keep TODO comment in code, add issue number reference after moving to issue tracker
- Process all TODOs - researcher should flag potentially outdated ones for user review

### Claude's Discretion
- Which methods in Camera.ts are considered "critical" for coordinate system JSDoc
- Exact format and content of TODO summary presentation to user
- Issue tracker format/template for moved TODOs

## Specific Ideas

No specific requirements — follow standard JSDoc practices and issue tracker conventions.

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 07-documentation-cleanup*
*Context gathered: 2026-02-04*
