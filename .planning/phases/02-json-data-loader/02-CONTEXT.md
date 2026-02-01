# Phase 2: JSON Data Loader - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable users to load real point cloud data from JSON files with cluster IDs. System provides file picker, parses JSON, converts to Float32Array for WebGL, and displays errors when files are invalid or malformed. This phase does NOT include data source toggling or SQLite loading.

</domain>

<decisions>
## Implementation Decisions

### JSON format specification
- Flat array of point objects: `[{x: number, y: number, z: number, cluster?: number}]`
- Coordinate system: Doesn't matter — world orientation is not important
- Cluster IDs: Optional — field may be missing from points
- Field naming: Exact case-sensitive names required: `x`, `y`, `z`, `cluster`

### UI trigger and accessibility
- Button placement: Claude's discretion — place where UX makes sense
- Keyboard shortcut: None — mouse-only interaction
- Drag-and-drop: Yes — support dropping JSON files anywhere on canvas
- File picker filter: Yes — only show `.json` files in the file picker dialog

### Error UX and messaging
- Error display: Inline panel — persistent error area in the interface
- Error detail: High-level messages in UI, technical details logged to `console.error`
- Error recovery: Keep current view — don't clear existing generated data
- Multiple errors: First error only — stop parsing at first issue

### Data validation and cleanup
- Missing coordinates: Fail parsing with error — strict validation required
- Type coercion: No strict validation — reject non-number values entirely (no string number parsing)
- Invalid cluster IDs: `-1` and `null` treated as noise cluster (no cluster). Any other non-numeric, non-null values are errors
- Array size limit: Cap at 30M points — WebGL memory limit consideration (nearly 40 FPS even at 30M points when all in frustum)

### Claude's Discretion
- Exact button placement in UI
- Inline panel positioning and styling
- Specific high-level error message wording

</decisions>

<specifics>
## Specific Ideas

- "Drag-and-drop anywhere on canvas" — should feel natural for data tools
- 30M point limit based on real performance testing (nearly 40 FPS even at full frustum)
- Console logs for technical details to keep UI clean for users

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-json-data-loader*
*Context gathered: 2026-02-02*
