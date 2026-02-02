# Phase 4: Data Source Toggle & Error Display - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable switching between three data sources (generated point cloud, JSON-loaded data, SQLite-loaded data) and display errors from loading operations in a unified UI. Users can toggle data sources and see loading errors through a dedicated error panel. New data source types are out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Data source switching UI
- Simple buttons alongside existing "Load data" button (Generate, Load)
- "Load data" button handles both JSON and SQLite file types; future file-based sources should share this button
- Button placement: Below load controls in the DataLoadControl panel area
- Active state: Highlighted button with green accent (matching existing active state patterns)
- Button behavior: Clicking an already-active button regenerates/reloads the data

### Error display system
- Dedicated error panel (expandable/collapsible) shows current errors
- Error persistence: Auto-dismiss when user successfully loads new data
- Multiple errors: List all errors as separate items in the panel
- Default state: Panel collapsed/hidden when no errors, appears/expands when errors occur

### State management on source switch
- Camera position/orientation: Reset to default when switching data sources
- Data in memory: Discard loaded data on switch, clear WebGL buffers
- Cluster highlighting: Reset to none selected, show all clusters
- Loading feedback: Show overlay on WebGL canvas during switch

### Error recovery flow
- Recovery options: No explicit recovery buttons in error messages — users rely on standard UI (manually click load again, etc.)
- Error content: Brief and clear messages in UI, full details logged to console
- Fallback behavior: No requirement — choose easier implementation approach

### Claude's Discretion
- Fallback behavior after failed load (keep previous data vs clear to empty vs offer generated)
- Error severity handling (all errors same vs severity levels vs contextual treatment)
- Error panel expand/collapse interaction details
- Loading overlay visual design (existing overlay styles are available reference)

</decisions>

<specifics>
## Specific Ideas

- "Current load handles both json and sqlite at once" — single "Load data" button handles all file-based sources
- Active button highlighting should match existing green accent patterns from the codebase

</specifics>

<deferred>
## Deferred Ideas

- Adding new data source types (API, URL, etc.) — future phase
- More sophisticated error recovery (automatic retry, prompt for fallback) — future phase

</deferred>

---

*Phase: 04-data-source-toggle-error-display*
*Context gathered: 2026-02-03*
