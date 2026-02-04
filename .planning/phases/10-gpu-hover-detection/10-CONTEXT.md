# Phase 10: GPU Hover Detection - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

GPU-based hover detection that identifies the nearest point to the cursor when the user moves their mouse over the 3D point cloud. The detection uses distance thresholds with a two-distance approach: camera distance (camera "close enough" to point) + cursor distance (cursor close to point). Thresholds are calculated dynamically from point density.

**What's in scope:**
- Detecting nearest point to cursor via GPU-based distance threshold
- Two-distance threshold: camera distance check + cursor distance check
- Dynamic threshold calculation from point density (not fixed constants)
- Visual feedback through brightness boost on hovered point

**What's NOT in scope:**
- Displaying point metadata (tag/image) — that's Phase 11: Screen Overlay
- Click selection — separate capability
- Zoom level adaptation (broken functionality, fix is out of scope)

</domain>

<decisions>
## Implementation Decisions

### Visual feedback style
- Brightness boost only (2x brightness) — use additive blend multiplier of 2.0
- No cursor change — cursor stays default
- Instant transition — immediate brightness change when entering/exiting hover state, no fade effect
- Intensity: 2x brightness (additive blend multiplier of 2.0)

### Selection persistence
- Instant detection — nearest point detected continuously as cursor moves, no pause required
- Immediate change between points — selection changes to new nearest point instantly (no hysteresis threshold)
- Immediate clear on empty space — selection disappears as soon as cursor leaves point's threshold
- No indicator in empty space — nothing happens in empty space, only highlight when a point is hovered

### Performance degradation
- No special handling when FPS drops — continue hover detection without skipping frames, reducing accuracy, or showing warnings
- No monitoring/logging — no console logs or instrumentation for hover metrics (FPS, detection time, point count)
- **Important:** No zoom level adaptation — do NOT adapt threshold based on zoom (zoom is broken, fix is out of scope)

### Threshold calculation
- Two-distance threshold approach: camera distance (camera "close enough" to point) + cursor distance (cursor close to point)
- Dynamic thresholds — calculate from point density, not fixed constants
- Use average point spacing in dataset to determine thresholds

### Empty space behavior
- No selection when cursor over empty space — clear selection immediately
- Always run GPU detection shader — run every frame even when cursor is in empty space (simpler implementation)
- No special transition effect when entering a point from empty space — point highlights normally
- Select off-screen points if close to edge — no special handling for viewport boundary

### Claude's Discretion
- Whether to always run GPU detection or skip when cursor is in empty space — user said "decide basing on what's simpler" and believes "always" is simpler
- Select off-screen points behavior at viewport edge — user said "whichever is simpler to implement" and guessed "select if close" (no special handling)

</decisions>

<specifics>
## Specific Ideas

- "Brightness boost only" leverages existing additive blend with smooth falloff — doubling brightness should work easily
- Two separate thresholds needed: camera distance threshold AND cursor distance threshold
- Thresholds should be based on distance between points (point density), not zoom level
- Zoom functionality currently doesn't work — fixing is out of scope

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-gpu-hover-detection*
*Context gathered: 2026-02-05*
