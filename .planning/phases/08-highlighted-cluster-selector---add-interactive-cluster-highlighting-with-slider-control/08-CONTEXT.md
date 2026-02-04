# Phase 8: Highlighted Cluster Selector - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Modify existing slider control's min/max values dynamically based on loaded data. Slider uses -2 for "no highlight" and max cluster ID as upper bound. Highlighting logic (colored tint overlay) is already implemented - this phase only updates slider range and behavior.

</domain>

<decisions>
## Implementation Decisions

### Slider behavior and interaction
- Discrete integer steps only — snap to integer cluster IDs
- Update on drag (real-time) — highlighting changes immediately as slider moves
- -2 value means "don't highlight any cluster" — all clusters visible at normal brightness, no tint applied
- Always show current cluster ID value next to slider

### Slider placement and UI
- Modify existing slider component (already in codebase)
- Keep current styling and labels unchanged
- No UI changes needed — only min/max value updates

### Edge cases and initial state
- No data loaded: Slider disabled with min=max=0
- Max cluster is 0: Set max to 0, min to -2 (range: [-2, 0])
- Default value when new data loads: Start at -2 (none highlighted)
- Data source switch: Reset to -2, update range to new data's cluster bounds
- Switch behavior is same regardless of source type (Generate vs Load)

### Claude's Discretion
- How to detect max cluster number from loaded data
- How to update slider min/max dynamically when data changes
- Slider component integration with existing state management

</decisions>

<specifics>
## Specific Ideas

No specific requirements — follow existing slider implementation patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-highlighted-cluster-selector*
*Context gathered: 2026-02-04*