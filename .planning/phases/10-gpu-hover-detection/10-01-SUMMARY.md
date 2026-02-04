---
phase: 10-gpu-hover-detection
plan: 01
subsystem: webgl-shaders
tags: webgl, glsl, vertex-shader, fragment-shader, hover-detection, distance-threshold

# Dependency graph
requires:
  - phase: 09-data-foundation
    provides: Optional tag/image columns with index-based storage
provides:
  - Extended vertex shader with hover detection uniforms (u_cursorWorldPos, u_cameraDistThreshold, u_cursorDistThreshold)
  - Vertex shader computes two-distance threshold (camera distance + cursor distance)
  - Fragment shader applies 2x brightness boost for hovered points (v_isHovered > 0.5)
  - v_isHovered varying passes hover state from vertex to fragment shader
  - Hover detection works alongside existing cluster highlighting (v_isHilighted)
affects: 10-gpu-hover-detection, 11-screen-overlay

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-distance threshold hover detection in vertex shader"
    - "Brightness boost via RGB multiplier (2.0) for additive blending"
    - "Combined hover and highlight state in fragment shader (v_isHovered + v_isHilighted)"

key-files:
  created: []
  modified:
    - src/core/ShaderManager.ts - Extended getGPUMatrixShaders() with hover detection

key-decisions:
  - "Use vertex shader for distance calculation - GPU-parallel O(1) per vertex"
  - "Two-distance threshold (camera + cursor) prevents selecting far-away points"

patterns-established:
  - "Pattern 1: GPU-based hover detection - compute distances in vertex shader, pass state to fragment"
  - "Pattern 2: Additive blend brightness boost - multiply RGB by 2.0, works with gl.SRC_ALPHA, gl.ONE"
  - "Pattern 3: State combination - multiple varyings (v_isHovered, v_isHilighted) can coexist"

# Metrics
duration: 4 min
completed: 2026-02-05
---

# Phase 10 Plan 1: GPU Hover Detection - Shader Extensions Summary

**Extended vertex and fragment shaders with hover detection uniforms, two-distance threshold logic, and 2x brightness boost using GPU-parallel distance calculations**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-04T18:32:51Z
- **Completed:** 2026-02-04T18:36:52Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Vertex shader extended with three hover detection uniforms: u_cursorWorldPos, u_cameraDistThreshold, u_cursorDistThreshold
- Vertex shader computes two-distance threshold (camera distance + cursor distance) in parallel for all points
- Vertex shader passes v_isHovered varying to fragment shader (1.0 if both distances within thresholds, 0.0 otherwise)
- Fragment shader applies 2x brightness boost (RGB × 2.0) when v_isHovered > 0.5
- Hover detection preserves existing cluster highlighting functionality (v_isHilighted still works for slider control)
- Implementation follows additive blend pattern (gl.SRC_ALPHA, gl.ONE) already configured in setupAdditivePointRendering()

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend vertex shader with hover detection uniforms and logic** - `005e951` (feat)
2. **Task 2: Extend fragment shader with 2x brightness boost for hovered points** - `1f90904` (feat)

**Plan metadata:** (to be added in final commit)

## Files Created/Modified

- `src/core/ShaderManager.ts` - Extended getGPUMatrixShaders() vertex shader with hover detection uniforms and two-distance threshold logic; extended fragment shader with 2x brightness boost for hovered points

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
- Vertex shader has three new hover-related uniforms (u_cursorWorldPos, u_cameraDistThreshold, u_cursorDistThreshold) ✓
- Vertex shader computes two-distance threshold (camera distance check AND cursor distance check) ✓
- Fragment shader applies 2x brightness for hovered points (c_base * 2.0 when v_isHovered > 0.5) ✓
- Existing cluster highlighting functionality preserved (v_isHilighted still used in color calculation) ✓

Shaders are ready to receive uniforms from WebGL rendering loop (next plan: 10-02 mouse tracking and screen-to-world conversion).

---
*Phase: 10-gpu-hover-detection*
*Completed: 2026-02-05*
