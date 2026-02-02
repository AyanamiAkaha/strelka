# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** Users can load and explore real point cluster data in 3D with interactive camera controls and cluster highlighting
**Current focus:** Phase 4 - Data Source Toggle & Error Display (in progress)

## Current Position

Phase: 4 of 4 (Data Source Toggle & Error Display)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-02-03 - Completed 04-02 error display system

Progress: [█████████░░░░] 79%

## Performance Metrics

**Velocity:**
- Total plans completed: 16 (Phase 1: 3, Phase 1.1: 5, Phase 2: 3, Phase 3: 3, Phase 4: 2)
- Average duration: 2.1 min
- Total execution time: 0.50 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| | 1 | 3 | 3 | 1.3 min |
| | 1.1 | 5 | 5 | 2.0 min |
| | 2 | 3 | 3 | 2.0 min |
| | 3 | 3 | 3 | 2.0 min |
| | 4 | 2 | 3 | 2.5 min |

**Recent Trend:**
- Phase 4 plans: 04-01 (2 min), 04-02 (12 min)
- Phase 3 plans: 03-01 (2 min), 03-02 (2 min), 03-03 (36 min with multiple fixes), 03-04 (1 min bug fix)
- Phase 2 plans: 02-01 (2 min), 02-02 (4 min), 02-03 (2 min)
- Phase 1.1 plans: 01.1-01 (2 min), 01.1-02 (3 min), 01.1-03 (7 min), 01.1-04 (1 min), 01.1-05 (15 min with testing)
- Trend: Phase 4 in progress, error display system complete

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 1.1 Context: Clean replacement of Camera.ts internals with quaternion logic
- Phase 1.1-01: gl-matrix@3.4.4 installed as single source of truth for vector/quaternion math
- Phase 1.1-01: Math.ts re-exports gl-matrix vec3 and quat modules
- Phase 1.1-01: No Camera.ts update in this plan (will be updated in plan 01.1-02)
- Phase 1.1-02: Kept toDebugInfo() returning plain object {x, y, z} for DebugInfo.vue compatibility
- Phase 1.1-03: Use vec3.transformQuat() to derive local camera axes from quaternion orientation instead of Euler trig formulas
- Phase 1.1-03: Normalize quaternion after each rotation to prevent numerical drift (research pitfall 1)
- Phase 1.1-03: Use temporary quaternion for multi-step rotation (pitch then yaw) to avoid intermediate corruption (research pitfall 3)
 - Phase 1.1-04: Extract Euler angles inline in getShaderUniforms() to preserve shader uniform format
  - Phase 1.1-04: No shader modifications needed - quaternion-to-Euler conversion happens in Camera.ts
  - Phase 1.1-05: Switched to full view matrix approach to eliminate gimbal lock in shader
  - Phase 1.1-05: View matrix computed with mat4.lookAt() using quaternion-derived up vector
  - Phase 1.1-05: Negated pitchChange and yawChange to fix inverted rotation axes
  - Phase 1.1-05: Reduced mouseSensitivity from 0.002 to 0.0014 (~30% slower)
  - Phase 2-01: Make cluster optional since field may be missing from points
  - Phase 2-01: Use strict typeof checks for coordinate validation (no type coercion)
  - Phase 2-01: Treat -1 and null as valid noise cluster values
  - Phase 2-01: Enforce 30M point limit to prevent WebGL memory issues
  - Phase 2-01: Convert JSON arrays to Float32Array for WebGL upload
  - Phase 2-02: Import parseJsonData from validators.ts for validation delegation
  - Phase 2-02: Use FileReader.readAsText() for async file reading
  - Phase 2-02: Create new FileReader instance per call (avoiding memory leaks)
  - Phase 2-03: Button placement: top-left positioning (20px) matching WebGL canvas layout
  - Phase 2-03: Drag-over visual feedback: rgba(76, 175, 80, 0.2) green tint per RESEARCH.md
  - Phase 2-03: Error recovery: preserve pointData on load failure (don't clear existing data) per RESEARCH.md Pitfall 5
  - Phase 2-03: Styling: Match ControlsOverlay dark background with green accent
  - Phase 3-01: Use initSqlJs() with locateFile for Vite to serve sql-wasm.wasm file
  - Phase 3-01: Module-level SQL variable allows reuse without reinitializing WebAssembly
  - Phase 3-01: Use PRAGMA table_info query for SQLite schema validation
  - Phase 3-01: Case-sensitive column name comparison for required x, y, z columns
  - Phase 3-02: Use lazy SQL initialization pattern to avoid top-level await build errors
  - Phase 3-02: Pass SQL string directly to db.each() instead of prepared statement to avoid TypeScript errors
  - Phase 3-02: Emit 'file-loaded' event with PointData result on successful SQLite table load
  - Phase 3-02: Auto-select single table when database contains only one table
  - Phase 3-02: Detect file type by extension (.json vs .db/.sqlite) for conditional processing
  - Phase 3-03: DataLoadControl handles UI only, parent (WebGLPlayground) handles all data loading
  - Phase 3-03: Table selection emits table name, parent calls loadSqliteFile() to avoid redundant loading
   - Phase 03-03: Add Load button for explicit table selection trigger (user-requested UX improvement)
   - Phase 03-03: Remove @change event from select element, use Load button click to trigger loading
   - Phase 03-03: Disable Load button during loading and when no table selected
   - Phase 03-03: Style Load button to match existing button style for consistency
   - Phase 03-03: Emit 'file-selected' event for SQLite files to sync parent currentFile state
   - Phase 03-04: sql.js db.each() callback receives rows as objects with column names as keys, NOT as arrays
    - Phase 03-04: Access db.each() row values via row.x, row.y, row.z, row.cluster instead of row[0], row[1], row[2], row[3]
    - Phase 03-04: Add explicit as number casts for Float32Array type compatibility when accessing row properties
    - Phase 04-01: Data source state (Generate vs Load) tracked in ref, switches camera reset when toggling
    - Phase 04-01: emit-switch-data-source event from DataLoadControl to parent for state updates
    - Phase 04-02: Use ErrorInfo array with unique IDs for multiple error management
    - Phase 04-02: Auto-expand error panel when errors occur, auto-collapse when cleared
    - Phase 04-02: clearErrors() called on successful data load (handleLoadFile and regenPoints)
     
### Pending Todos

From .planning/todos/pending/ — ideas captured during sessions

None yet.

### Blockers/Concerns

Issues that affect future work

None. Error display system complete with collapsible panel, auto-expand/dismiss behavior, and individual error management. Ready for 04-03: Integrate switching with error handling and verify workflow.

### Roadmap Evolution

  - Phase 1.1 completed after Phase 1: quaternion-based camera successfully implemented and verified
  - Phase 2 complete: JSON data loader with file picker, drag-drop, and error handling (Plans 02-01, 02-02, 02-03)
   - Phase 3 complete: SQLite data loader with efficient single-pass loading (Plans 03-01, 03-02, 03-03, 03-04)
    - Phase 3-01: sql.js installed with WebAssembly initialization and schema validation
    - Phase 3-02: SQLite file loading with table selection and incremental data processing
    - Phase 3-03: Integrated SQLite loading with WebGLPlayground, added loading overlay, granular error handling, table selection with Load button
    - Phase 3-03: Fixed UI positioning, variable shadowing, redundant loading, and event emission issues
    - Phase 3-04: Fixed critical db.each() callback bug - row access via column names instead of array indices
   - Phase 4 in progress: Data Source Toggle & Error Display
    - Phase 04-01: Added data source toggle UI and state management with camera reset
    - Phase 04-02: Error display system with collapsible panel, auto-expand/dismiss behavior
    - READY FOR 04-03: Integrate switching with error handling and verify workflow

## Session Continuity

Last session: 2026-02-03
Stopped at: Completed 04-02 SUMMARY creation
Resume file: None
