---
phase: 09-data-foundation
plan: 01
subsystem: data-loader
tags: typescript, json, sqlite, optional-fields, index-based-storage, graceful-degradation

# Dependency graph
requires:
  - phase: 08-cleanup
    provides: Basic data loading infrastructure with positions, clusterIds
provides:
  - Extended JsonPoint with optional tag/image fields
  - Extended TableInfo with hasTag/hasImage detection
  - Extended PointData with tagIndices/imageIndices/tagLookup/imageLookup
  - JSON loader with optional column detection and index-based storage
  - SQLite loader with dynamic SELECT and optional column support
  - Normalization helper for null/undefined/empty string handling
affects: 10-gpu-hover, 11-screen-overlay

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional fields with ?: and | null union types"
    - "Index-based storage (Float32Array + Map lookup) for metadata"
    - "Silent degradation (return null, no errors/warnings)"
    - "Dynamic SQL query construction based on schema detection"
    - "Two-pass loading: populate maps, then fill arrays"

key-files:
  created: []
  modified:
    - src/core/types.ts - Extended JsonPoint, TableInfo
    - src/core/validators.ts - Extended validateJsonPoint, parseJsonData
    - src/core/DataProvider.ts - Extended loadSqliteFile, added normalizeOptionalValue

key-decisions:
  - "Use single type with optional fields instead of separate WithTags/WithoutTags types"
  - "Index-based storage (Float32Array + Map) not string[] for performance"
  - "Normalize null/undefined/empty strings to null uniformly"
  - "Silent degradation: no errors/warnings when columns missing"

patterns-established:
  - "Pattern 1: Optional field detection - use 'in' operator for JSON, columnNames.includes() for SQLite"
  - "Pattern 2: Graceful degradation - return null for missing data, don't throw"
  - "Pattern 3: Two-pass loading - first pass populates maps, second pass fills arrays"

# Metrics
duration: 3 min
completed: 2026-02-05
---

# Phase 9 Plan 1: Data Foundation Summary

**Extended data loading infrastructure with optional tag/image columns using TypeScript optional fields, index-based storage (Float32Array + Map), and silent degradation for missing data**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-04T16:24:20Z
- **Completed:** 2026-02-04T16:28:01Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Extended JsonPoint interface with optional tag and image fields (tag?: string | null, image?: string | null)
- Extended TableInfo with hasTag and hasImage boolean detection fields
- Extended validateJsonPoint() to validate tag/image types if present (no required check)
- Extended parseJsonData() with two-pass loading: populate maps with unique values, then fill index arrays
- Extended validateTableSchema() to detect tag/image columns via PRAGMA table_info
- Extended loadSqliteFile() with dynamic SELECT query and tag/image loading
- Added normalizeOptionalValue() helper to normalize null/undefined/empty strings to null
- Extended PointData interface with tagIndices, imageIndices, tagLookup, imageLookup fields
- Backward compatible: existing JSON/SQLite files without tag/image load without errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend type definitions and JSON validation/parsing** - `1f687d1` (feat)
2. **Task 2: Extend SQLite schema validation** - `e87dca4` (feat)
3. **Task 3: Extend SQLite loading** - `72ed0e1` (feat)

**Plan metadata:** `lmn012o` (docs: complete plan)

_Note: Task 2 was completed as part of Task 1, committed separately for clarity._

## Files Created/Modified

- `src/core/types.ts` - Extended JsonPoint with tag?: string | null and image?: string | null; Extended TableInfo with hasTag and hasImage boolean fields
- `src/core/validators.ts` - Extended validateJsonPoint() to validate tag/image types if present; Extended parseJsonData() with optional column detection and two-pass index-based loading; Added normalizeOptionalValue() helper for null/undefined/empty string normalization
- `src/core/DataProvider.ts` - Extended PointData interface with tagIndices, imageIndices, tagLookup, imageLookup fields; Added normalizeOptionalValue() helper; Extended loadSqliteFile() with dynamic SELECT query and tag/image loading

## Decisions Made

None - followed plan as specified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

All done criteria met:
- Type definitions extended with optional tag/image fields ✓
- JSON loader detects and loads optional tag/image columns with index-based storage ✓
- SQLite schema validation detects optional tag/image columns ✓
- SQLite loader uses dynamic SELECT to safely load optional columns with index-based storage ✓
- All loaders normalize null/undefined/empty to null and use silent degradation ✓
- Existing JSON/SQLite files without tag/image load without errors or warnings ✓
- Data with tag/image columns: tagIndices/imageIndices populated, tagLookup/imageLookup contain values ✓
- Data without tag/image columns: tagIndices/imageIndices are null, tagLookup/imageLookup are null ✓

Ready for Phase 10: GPU Hover Detection (HOVER-01, HOVER-02).

---
*Phase: 09-data-foundation*
*Completed: 2026-02-05*
