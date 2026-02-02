# Phase 3: SQLite Data Loader - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

## Phase Boundary

Users can load point data from SQLite database files (.db, .sqlite, or any SQLite-compatible format) using the sql.js WebAssembly library. The system queries tables with x, y, z coordinates and optional cluster IDs, converting results to Float32Array for WebGL rendering. Error messages display for corrupt files, missing tables, or invalid schemas.

## Implementation Decisions

### Database file selection
- Accept any SQLite file (not limited to .db/.sqlite extensions)
- Support drag-drop matching JSON UX (same green tint visual feedback: rgba(76, 175, 80, 0.2))
- Single "Load Data" button for both JSON and SQLite file types

### Table structure handling
- Prompt user to select which table to use from the database
- Require strict column naming: 'x', 'y', 'z' columns are required
- Cluster column is optional; treat missing cluster as -1 (same as JSON validation)
- Show specific missing columns in error message: "Table must have x, y, z columns. Table X missing: z"

### Loading UX
- Block UI while SQLite data is loading (no other interactions allowed)
- Enforce 30M point limit (same as JSON Phase 2) with error message
- Use generic loading message: "Loading data..." (not database-specific)
- Show progress bar as nice-to-have ("Could" in MoSCoW - not essential)

### Error messaging
- Use granular error messages: "Database corrupt", "Table not found", "Missing columns: x, y"
- Display errors in the same panel as JSON errors for consistency
- Preserve existing point data on load failure (same as JSON Phase 2 behavior)
- No retry button - user must reselect file after error

### Claude's Discretion
- Progress bar implementation details (nice-to-have, not required)
- Loading spinner/styling when no progress bar is shown
- Exact timing of when to show "Loading data..." message
- Error message phrasing variations (as long as they remain granular)

## Specific Ideas

- "Match JSON UX" - SQLite loading should feel identical to JSON loading in terms of drag-drop, error panel, and file selection
- Same 30M point limit ensures WebGL memory safety across both data sources
- Strict column naming keeps implementation simple (no column mapping UI)
- Cluster is optional like in Phase 2 - treat missing values as noise (-1)

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 03-sqlite-data-loader*
*Context gathered: 2026-02-03*
