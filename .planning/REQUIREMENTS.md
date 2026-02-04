# Requirements: WebGL Clusters Playground

**Defined:** 2026-02-04
**Core Value:** Users can load and explore real point cluster data in 3D with interactive camera controls and point hover metadata display

## v1.2 Requirements

Requirements for point hover with tag/image display. Each maps to roadmap phases.

### Hover Detection

- [ ] **HOVER-01**: User can hover over points using GPU-based distance threshold detection that maintains 45 FPS @ 30M points
- [ ] **HOVER-02**: Hover detection uses adaptive distance threshold (manual threshold first for basic verification, histogram-based calculation second for optimal selection)

### Screen Overlay

- [ ] **OVERLAY-01**: User can see tag and/or image displayed in screen-space Vue overlay when hovering over a point
- [ ] **OVERLAY-02**: Screen-space overlay positions near hovered point and clamps to viewport edges to avoid clipping

### Data Schema

- [ ] **DATA-01**: System loads and uses optional `tag` column from JSON and SQLite data
- [ ] **DATA-02**: System loads and uses optional `image` column from JSON and SQLite data
- [ ] **DATA-03**: System gracefully handles missing tag/image data by skipping overlay display (no errors or warnings)

## v2+ Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Interaction

- [ ] **ADV-01**: User can click hovered point to lock overlay for persistent inspection
- [ ] **ADV-02**: User can unlock locked overlay by clicking elsewhere or pressing Escape

### Adaptive Threshold

- [ ] **ADAPT-01**: Hover threshold automatically adjusts based on point screen size and zoom level

### Accessibility

- [ ] **A11Y-01**: User can navigate to hovered points using keyboard (Tab, arrow keys)
- [ ] **A11Y-02**: Screen reader announces hovered point with tag information

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| CPU-based raycasting for every point | O(N) complexity doesn't scale to 30M points; GPU required for 45 FPS |
| Blocking gl.readPixels() on every mouse move | Synchronous call blocks main thread; causes pipeline flush; destroys performance |
| Always-visible overlay | Distracts from visualization; users can't hide it; unnecessary screen real estate |
| Complex overlay animations | Animation overhead at 45 FPS feels sluggish; simple div is sufficient |
| Fixed hover threshold regardless of zoom | Feels "magnetic" and inaccurate when zoomed in/out; dynamic threshold required |
| Click-to-lock functionality | Out of scope for v1.2; defer to v2.1 |
| Overlay follows mouse cursor exactly | Occludes point user is inspecting; offset from point position is required |
| Smooth hover transitions (CSS fade/slide) | Out of scope for v1.2; instant show/hide with simple div |
| WebGL text rendering for tags | Too complex for simple labels; HTML/CSS overlay is superior for accessibility |
| Multiple overlapping overlays | Too much information; creates clutter; single tooltip is sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HOVER-01 | Phase 1 | Pending |
| HOVER-02 | Phase 1 | Pending |
| OVERLAY-01 | Phase 2 | Pending |
| OVERLAY-02 | Phase 2 | Pending |
| DATA-01 | Phase 3 | Pending |
| DATA-02 | Phase 3 | Pending |
| DATA-03 | Phase 3 | Pending |

**Coverage:**
- v1.2 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-04*
*Last updated: 2026-02-04 after research synthesis*
