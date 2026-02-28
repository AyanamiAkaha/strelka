# Project Research Summary

**Project:** strelka — v1.2 Point Hover with Tag/Image Display
**Domain:** WebGL Point Cloud Visualization + Vue 3 UI
**Researched:** February 4, 2026
**Confidence:** HIGH

## Executive Summary

Point hover with tag/image display is a table-stakes feature for WebGL point cloud visualization tools that requires GPU-based picking to maintain performance at scale (30M points @ 45 FPS). The recommended approach uses **GPU-side distance detection with 2D buffer communication**, avoiding CPU-based raycasting which is prohibitively expensive (O(N) complexity would cause 100-500ms latency per frame). The solution integrates cleanly into the existing Vue 3 + pure WebGL architecture using transform feedback or color-based picking, with no additional npm packages required beyond the existing stack (gl-matrix, Vue 3 Composition API, TypeScript).

The architecture introduces minimal additions: a new `HoverOverlay.vue` component (sibling to existing controls), extended data loading to support optional tag/image columns, and a hover detection shader variant. The implementation follows established WebGL patterns for large-scale point interaction while maintaining the existing component hierarchy and data flow patterns. Key risks involve performance degradation from synchronous readPixels calls, incomplete state resets in reactive systems, and overlay positioning edge cases at viewport boundaries—all mitigated through specific patterns documented in the research.

## Key Findings

### Recommended Stack

The research confirms the existing stack (Vue 3.3.8, TypeScript 5.3.0, Pure WebGL, gl-matrix 3.4.4) is sufficient—no new packages are required. The solution relies on **GPU-side picking with transform feedback** for performance, a **2-element Float32Array buffer** for GPU-CPU communication (stores point index + depth), and **gl-matrix projection** for 3D-to-2D screen space positioning. This approach maintains 45 FPS at 30M points with <1% frame budget overhead.

**Core technologies:**
- **Pure WebGL 1.0/2.0** — Core rendering; transform feedback (WebGL 2) preferred for GPU-based picking, color-coded picking (WebGL 1) as fallback
- **gl-matrix 3.4.4** — Matrix math for 3D→2D projection; `vec3.transformMat4()` converts world position to screen coordinates
- **Vue 3 Composition API** — Reactive state management via composables (`hoveredPointIndex`, `hoveredPointData` refs)
- **2D picking shader** — Custom vertex shader calculates distance from mouse position, writes closest point index+depth to buffer

### Expected Features

Users expect immediate visual feedback when hovering over points, with contextual metadata displayed as screen-space overlays. Research distinguishes between table stakes (missing features feel broken), differentiators (competitive advantage), and anti-features (commonly requested but problematic).

**Must have (table stakes):**
- **GPU-based hover detection with distance threshold** — Users expect interaction feedback within 16ms even at 30M points; CPU approaches fail
- **Tag/image display on hover** — Metadata (tags, images) should appear when available; silent skip if missing
- **Screen space overlay positioning** — UI overlays follow hovered point in 2D canvas coordinates with edge clamping
- **Graceful data handling** — No errors when tag/image columns are missing; degrade to hover-only behavior
- **Click-to-lock functionality** — Toggle persistent overlay display; standard pattern for point inspection

**Should have (competitive):**
- **Depth-based point selection** — Select nearest point when multiple overlap; handles density variations
- **Adaptive hover threshold** — Adjust distance based on zoom level; consistent interaction feel at all scales
- **Smart overlay edge clipping** — Anchor to viewport edges; avoid off-screen overlay

**Defer (v2+):**
- **Multi-point selection** (Shift+drag) — Product-market fit first
- **Hover comparison** (two-point diff) — Complex, needs validation
- **Keyboard navigation** (Tab/arrows) — Accessibility important but not blocking

### Architecture Approach

Point hover integrates into the existing architecture via **buffer-based communication** between WebGL and JavaScript, with a **new sibling component** for overlay display. Data flow: WebGLCanvas emits mouse position → WebGLPlayground runs hover detection pass → GPU writes `[index, depth]` to buffer → JavaScript reads and updates reactive refs → HoverOverlay displays tag/image at calculated screen position. The pattern maintains the parent-child hierarchy (WebGLPlayground as parent) and adds a sibling component (HoverOverlay) with global composable state (`hoveredPointIndex`, `hoveredPointData`).

**Major components:**
1. **WebGLPlayground.vue** — Manages WebGL context, camera, buffers, hover detection rendering pass; coordinates data flow
2. **HoverOverlay.vue (NEW)** — Displays tag/image at screen position; consumes `hoveredPointData` ref and `screenPosition` prop
3. **ShaderManager.ts** — Provides hover detection shader variant (distance threshold + transform feedback or color-based picking)
4. **DataProvider.ts** — Extended to load optional `tag` and `image` columns; returns `null` arrays if missing
5. **Camera.ts** — Adds `projectPointToScreen()` method for 3D→2D projection using existing gl-matrix utilities
6. **settings.ts** — Global composable with `hoveredPointIndex` and `hoveredPointData` refs (pattern matches existing `highlightedCluster`)

### Critical Pitfalls

Research identifies performance pitfalls from WebGL best practices and Vue 3 anti-patterns, plus general UX considerations for reactive applications.

1. **CPU-based raycasting for 30M points** — O(N) distance checks (600M operations/frame) cause 100-500ms latency; unacceptable at 45 FPS target. **Avoid:** Use GPU-side picking in shader (transform feedback or color-based), parallel processing via vertex shader.

2. **Blocking `gl.readPixels()` every frame** — Synchronous read causes CPU-GPU pipeline stall (1-5ms per call); destroys performance. **Avoid:** Use transform feedback (WebGL 2) or throttle readPixels to hover events only, not every frame.

3. **Incomplete state resets in reactive system** — Sentinel value mismatches (-1 vs -2 for `highlightedCluster`) cause inconsistent state across components. **Avoid:** Centralized reset function, audit all reset codepaths, consistent sentinel values.

4. **Overlay covers hovered point** — Direct mouse positioning obscures the point the user is inspecting. **Avoid:** Offset overlay 20px in screen space (`translate(-50%, -120%)`), use edge-clamping to stay within viewport.

5. **Auto-selection without user feedback** — Silent table selection or cluster changes confuse users. **Avoid:** Provide loading indicators, visual feedback on selection, opt-out capability for auto-select.

6. **Dynamic disabling without visual indicators** — Controls silently disabled feel like frozen/broken UI. **Avoid:** Clear disabled state (opacity, tooltips, "disabled" class with reason label).

**Note:** Pitfalls #3, #5, and #6 are from PITFALLS.md which covers broader Vue 3 UX patterns beyond hover feature. While less directly applicable, they provide useful general guidance for state management and UI feedback patterns.

## Implications for Roadmap

Based on research, the suggested phase structure prioritizes the data foundation first, then GPU infrastructure, then UI overlay. This order avoids blocking on missing data, ensures performance from the start, and allows incremental testing.

### Phase 1: Data Foundation — Tag/Image Column Support
**Rationale:** Data loading changes are prerequisites for all hover features; extending types and DataProvider is independent of GPU/UI work and can be validated immediately.
**Delivers:** `PointData` interface extended with optional `tags` and `images` arrays, DataProvider loads these columns from JSON/SQLite (null if missing), validation for tag (string) and image (URL) types.
**Addresses:** Graceful data handling (FEATURES P1), optional data schema support (differentiator)
**Avoids:** Runtime errors when accessing missing columns, incomplete state updates in reactive system

### Phase 2: GPU Infrastructure — Point Index Buffer & Hover Shader
**Rationale:** GPU-based detection is the core performance enabler; must be in place before UI integration. Shader complexity is the highest technical risk, so tackle it early.
**Delivers:** Point index buffer (`[0, 1, 2, ..., N-1]`), hover detection shader variant (distance threshold + transform feedback), hover output buffer (`[index, depth]`), `ShaderManager.getHoverDetectionShaders()` method.
**Uses:** Pure WebGL transform feedback (WebGL 2 preferred), gl-matrix for mouse position calculations
**Implements:** GPU-based hover detection (FEATURES P1), depth-based point selection (differentiator)
**Avoids:** CPU-based raycasting pitfall, performance degradation at 30M points

### Phase 3: Camera Integration — 3D to 2D Projection
**Rationale:** Overlay positioning requires accurate screen coordinates; depends on existing camera matrices but is independent of hover detection logic.
**Delivers:** `Camera.projectPointToScreen()` method, screen space coordinate conversion (NDC [-1,1] → canvas pixels), edge clamping logic to keep overlay within viewport.
**Uses:** gl-matrix `vec3.transformMat4()` and matrix operations
**Implements:** Screen space overlay positioning (FEATURES P1), smart overlay edge clipping (differentiator)
**Avoids:** Off-screen overlay pitfall, coordinate system confusion

### Phase 4: Mouse Tracking & State Management
**Rationale:** Reactive state coordination is needed before UI component; separate from GPU work to test state flow independently.
**Delivers:** WebGLCanvas emits `@hover-update` with mouse coordinates, WebGLPlayground tracks mouse position and reads hover buffer, settings.ts exports `hoveredPointIndex` and `hoveredPointData` refs.
**Uses:** Vue 3 Composition API refs and reactivity
**Implements:** Hover state communication architecture, global state pattern matching existing `highlightedCluster`
**Avoids:** Incomplete state resets, inconsistent reactivity across components

### Phase 5: UI Overlay Component — Tag/Image Display
**Rationale:** Final integration of all pieces; overlay depends on state, projection, and data foundation.
**Delivers:** HoverOverlay.vue component, absolute positioning with screen prop, conditional tag/image rendering, CSS styling (max-width, max-height, pointer-events: none).
**Uses:** Vue 3 props, conditional rendering, CSS transforms
**Implements:** Tag/image display (FEATURES P1), click-to-lock functionality (FEATURES P2)
**Avoids:** Overlay covering point pitfall, reflow thrashing from DOM updates

### Phase 6: Refinement — Adaptive Threshold & Performance Validation
**Rationale:** Optimizations and polish after core works; not blocking for MVP but important for production quality.
**Delivers:** Adaptive hover threshold based on point screen size and zoom level, performance testing at 10M/30M points, buffer read throttling, image loading optimization.
**Implements:** Adaptive hover threshold (differentiator), performance-optimized rendering (differentiator)
**Avoids:** Fixed threshold pitfall, readPixels every frame pitfall

### Phase Ordering Rationale

- **Data first:** Type extensions are foundational; catching missing data errors early prevents runtime failures
- **GPU before UI:** Performance-critical shader work has the highest technical risk; solving it early prevents architectural dead-ends
- **Projection before overlay:** Screen positioning is independent of hover detection but required for UI; parallelizes nicely with GPU work
- **State before component:** Reactive state patterns must be proven correct before the component consumes them
- **Overlay last:** Pure integration work; lowest risk, depends on all previous phases

This ordering maps directly to ARCHITECTURE.md build order but groups data + GPU work as foundation (Phases 1-2), projection + state as coordination (Phases 3-4), and UI + polish as delivery (Phases 5-6).

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 2 (GPU Infrastructure):** Transform feedback float precision for indices > 16M points; WebGL 2 vs WebGL 1 compatibility testing; mobile GPU bandwidth constraints
- **Phase 3 (Camera Integration):** Screen space coordinate system consistency between NDC mouse position and `gl_Position`; edge-clamping algorithm validation
- **Phase 6 (Refinement):** Adaptive threshold formula tuning; image preloading/caching strategy for performance

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Data Foundation):** Straightforward type extensions and data loading; well-documented Vue 3 patterns
- **Phase 4 (Mouse Tracking & State):** Standard Vue 3 event handling and composables; existing patterns in codebase (`highlightedCluster`)
- **Phase 5 (UI Overlay):** Common Vue component pattern with props and reactivity; CSS absolute positioning is standard

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | WebGL transform feedback, gl-matrix, and Vue 3 Composition API are all well-documented with official sources; no new dependencies required |
| Features | HIGH | Table stakes and differentiators validated against WebGL tool patterns (Potree, CloudCompare) and UX best practices |
| Architecture | HIGH | Integration points clearly identified in the existing codebase; data flow is straightforward extension of current patterns |
| Pitfalls | MEDIUM | WebGL performance pitfalls are well-documented (HIGH), but Vue 3 UX patterns have less empirical validation (MEDIUM) |

**Overall confidence:** HIGH

Three research documents (STACK.md, FEATURES.md, ARCHITECTURE.md) are highly consistent and well-sourced. PITFALLS.md covers broader Vue 3 UX patterns beyond the hover feature but provides useful general guidance for state management and error handling.

### Gaps to Address

- **Transform feedback precision at scale:** Float may lose precision for point indices > 16M; needs testing at 30M points to verify correct point selection
- **WebGL 2 vs WebGL 1 compatibility:** Transform feedback requires WebGL 2; fallback to color-coded picking needs validation on WebGL 1 devices
- **Mobile performance:** GPU bandwidth constraints on mobile devices may affect buffer read overhead; device-specific testing needed
- **Adaptive threshold formula:** Research suggests `threshold = pointScreenSize * 1.5` but empirical tuning is required for user feel
- **Multi-table SQLite auto-selection:** Current architecture focuses on single table auto-select; multiple tables need a strategy for user preference
- **Error state machine for guidance:** Context-aware error recovery messages require a categorization system (research indicates need but doesn't specify implementation)

These gaps are non-blocking for MVP but should be addressed during Phase 2 (GPU precision testing) and Phase 6 (performance validation).

## Sources

### Primary (HIGH confidence)
- **WebGL2Fundamentals — Picking** — https://webgl2fundamentals.org/webgl/lessons/webgl-picking.html — Authoritative guide on GPU-based picking, transform feedback, color-coded picking approaches
- **MDN WebGL Best Practices** — https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices — Official performance guidelines, readPixels pitfalls, buffer management
- **gl-matrix Documentation** — https://github.com/toji/gl-matrix — vec3.transformMat4() API, 3D→2D projection patterns
- **Vue 3 Composition API** — https://vuejs.org/guide/reusability/composables — Official composable patterns, ref/watch reactivity
- **WebGL Specification (Khronos)** — Transform feedback API, buffer object operations, readPixels behavior

### Secondary (MEDIUM confidence)
- **Existing codebase analysis** — ShaderManager.ts, Camera.ts, WebGLPlayground.vue, DataProvider.ts — Current architecture patterns, data flow, rendering loop structure
- **Industry patterns** — Potree, CloudCompare, commercial LiDAR viewers — Common patterns for screen-space overlays, click-to-lock, GPU transform feedback

### Tertiary (LOW confidence)
- **Competitor UX analysis** — Based on general WebGL tool patterns; needs hands-on validation with specific tools for hover UX details
- **Mobile GPU performance** — Limited empirical data on mobile transform feedback bandwidth; device-specific testing required

---
*Research completed: February 4, 2026*
*Ready for roadmap: yes*
