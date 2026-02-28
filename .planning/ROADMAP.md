# Roadmap: strelka

## Overview

strelka — 3D point cloud visualization with data loading, camera controls, cluster highlighting, and point hover with metadata display.

## Milestones

- ✅ **v1 Data Loading Capabilities** — Phases 1, 1.1, 2-8 (shipped 2026-02-04) — [See full details](./milestones/v1-ROADMAP.md)
- ✅ **v1.2 Point Hover with Tag/Image Display** — Phases 9-11 (shipped 2026-02-05)

## Phases

<details>
<summary>✅ v1 Data Loading Capabilities (Phases 1, 1.1, 2-8) — SHIPPED 2026-02-04</summary>

- [x] **Phase 1: Camera Rotation Fix** (3/3 plans) — completed 2026-02-02
- [x] **Phase 1.1: Quaternion-Based Camera** (5/5 plans, INSERTED) — completed 2026-02-02
- [x] **Phase 2: JSON Data Loader** (3/3 plans) — completed 2026-02-02
- [x] **Phase 3: SQLite Data Loader** (3/3 plans) — completed 2026-02-03
- [x] **Phase 4: Data Source Toggle & Error Display** (3/3 plans) — completed 2026-02-03
- [x] **Phase 5: Fix GPU Memory & Loading Issues** (4/4 plans) — completed 2026-02-03
- [x] **Phase 6: Performance & UX Improvements** (3/3 plans) — completed 2026-02-04
- [x] **Phase 7: Documentation Cleanup** (2/2 plans) — completed 2026-02-04
- [x] **Phase 8: Highlighted Cluster Selector** (1/1 plan) — completed 2026-02-04

**Total:** 9 phases, 27 plans, all complete

</details>

### ✅ v1.2 Point Hover with Tag/Image Display (SHIPPED 2026-02-06)

**Milestone Goal:** Enable users to hover over points to see associated tags and images via GPU-based detection and screen-space overlay.

- [x] Phase 9: Data Foundation (1 plan) — completed 2026-02-05
- [x] Phase 10: GPU Hover Detection (3 plans) — completed 2026-02-05
- [x] Phase 11: Screen Overlay (4 plans) — completed 2026-02-05
- [x] Phase 12: Fix v1.2 Integration Bugs (1 plan) — completed 2026-02-06

## Phase Details

<details>
<summary>✅ v1 Phase Details (Complete)</summary>

See `.planning/milestones/v1-ROADMAP.md` for complete v1 phase details.

</details>

### Phase 9: Data Foundation

**Goal**: System loads and uses optional `tag` and `image` columns from JSON and SQLite data, gracefully handling missing data

**Depends on**: v1.0 (Phase 8)

**Requirements**: DATA-01, DATA-02, DATA-03

**Success Criteria** (what must be TRUE):
1. User can load JSON data with `tag` column and tags are accessible in the loaded data
2. User can load JSON data with `image` column and image URLs are accessible in the loaded data
3. User can load data without tag/image columns and system works without errors or warnings
4. User can load SQLite data with tag/image columns and columns are accessible in loaded data

**Plans**: 1 plan
- [x] 09-01-PLAN.md — Extend types, validation, and loaders for optional tag/image columns — completed 2026-02-05

### Phase 10: GPU Hover Detection

**Goal**: GPU-based distance threshold detection identifies the nearest point to the cursor with density-based thresholds calculated in JavaScript

**Depends on**: Phase 9

**Requirements**: HOVER-01, HOVER-02, HOVER-03

**Success Criteria** (what must be TRUE):
1. User can move cursor over point cloud and the nearest point is detected and identified
2. System maintains 30+ FPS when hovering over 5M points
3. Hover detection uses two-distance threshold (camera distance + cursor distance) derived from point density
4. Threshold is calculated in JavaScript/TypeScript and passed to shader (not recalculated in shader)

**Plans**: 3 plans
- [x] 10-01-PLAN.md — Extend shaders for hover detection (uniforms, vertex/fragment logic) — completed 2026-02-05
- [x] 10-02-PLAN.md — Add mouse tracking and screen-to-world coordinate conversion — completed 2026-02-05
- [x] 10-03-PLAN.md — Implement density-based thresholds and render loop integration — completed 2026-02-05

### Phase 11: Screen Overlay

**Goal**: Vue overlay displays point metadata (tag, image) at screen position when hovering, with optional edge clamping

**Depends on**: Phase 10

**Requirements**: OVERLAY-01, OVERLAY-02 (Could have)

**Success Criteria** (what must be TRUE):
1. User can see tag displayed in screen-space overlay when hovering over a point with tag data
2. User can see image displayed in screen-space overlay when hovering over a point with image URL
3. Overlay positions near the hovered point without covering the point itself
4. User can hover over points without tag/image data and system works normally (no overlay)
5. (Optional) Overlay clamps to viewport edges to avoid clipping when point is near screen edge

**Plans**: 4 plans
- [x] 11-01-PLAN.md — Add CPU-side hovered point identification and metadata retrieval — completed 2026-02-05
- [x] 11-02-PLAN.md — Add world-to-screen projection to Camera class — completed 2026-02-05
- [x] 11-03-PLAN.md — Create Vue overlay component with tag/image display and edge clamping — completed 2026-02-05
- [x] 11-04-PLAN.md — Dynamic overlay dimension calculation with transform-aware clamping — completed 2026-02-05

### Phase 12: Fix v1.2 Integration Bugs

**Goal**: Fix critical bugs identified in milestone audit that prevent end-to-end flows from working correctly

**Depends on**: Phase 11

**Gap Closure**: Closes integration and flow gaps from v1.2-MILESTONE-AUDIT.md

**Success Criteria** (what must be TRUE):
1. JSON data loading calculates hover thresholds without ReferenceError
2. Shader receives correct cursor world position with all 3 components (x, y, z)
3. Edge clamping preserves 15px gap between overlay and point for all screen positions
4. All 3 E2E flows work correctly: JSON with tag, SQLite with image, no metadata

**Plans**: 1 plan
- [x] 12-01-PLAN.md — Fix 3 integration bugs + verify E2E flows — completed 2026-02-06

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 1.1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Camera Rotation Fix | v1 | 3/3 | Complete | 2026-02-02 |
| 1.1. Quaternion-Based Camera | v1 | 5/5 | Complete | 2026-02-02 |
| 2. JSON Data Loader | v1 | 3/3 | Complete | 2026-02-02 |
| 3. SQLite Data Loader | v1 | 3/3 | Complete | 2026-02-03 |
| 4. Data Source Toggle & Error Display | v1 | 3/3 | Complete | 2026-02-03 |
| 5. Fix GPU Memory & Loading Issues | v1 | 4/4 | Complete | 2026-02-03 |
| 6. Performance & UX Improvements | v1 | 3/3 | Complete | 2026-02-04 |
| 7. Documentation Cleanup | v1 | 2/2 | Complete | 2026-02-04 |
| 8. Highlighted Cluster Selector | v1 | 1/1 | Complete | 2026-02-04 |
| 9. Data Foundation | v1.2 | 1/1 | Complete | 2026-02-05 |
| 10. GPU Hover Detection | v1.2 | 3/3 | Complete | 2026-02-05 |
| 11. Screen Overlay | v1.2 | 4/4 | Complete | 2026-02-05 |
| | 12. Fix v1.2 Integration Bugs | v1.2 | 0/1 | Pending | — |

**Milestone Progress:** v1 ✅ Complete | v1.2 In Progress - gap closure phase added