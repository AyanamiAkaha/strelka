# Roadmap: WebGL Clusters Playground

## Overview

WebGL Clusters Playground — 3D point cloud visualization with data loading, camera controls, cluster highlighting, and point hover with metadata display.

## Milestones

- ✅ **v1 Data Loading Capabilities** — Phases 1, 1.1, 2-8 (shipped 2026-02-04) — [See full details](./milestones/v1-ROADMAP.md)
- 🚧 **v1.2 Point Hover with Tag/Image Display** — Phases 9-11 (in progress)

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

### 🚧 v1.2 Point Hover with Tag/Image Display (In Progress)

**Milestone Goal:** Enable users to hover over points to see associated tags and images via GPU-based detection and screen-space overlay.

- [ ] Phase 9: Data Foundation ([N] plans)
- [ ] Phase 10: GPU Hover Detection ([N] plans)
- [ ] Phase 11: Screen Overlay ([N] plans)

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

**Plans**: TBD

### Phase 10: GPU Hover Detection

**Goal**: GPU-based distance threshold detection identifies the nearest point to the cursor with adaptive threshold calculated in JavaScript

**Depends on**: Phase 9

**Requirements**: HOVER-01, HOVER-02

**Success Criteria** (what must be TRUE):
1. User can move cursor over point cloud and the nearest point is detected and identified
2. System maintains 30+ FPS when hovering over 5M points (acceptable per user clarification)
3. Hover detection threshold adapts to zoom level (larger when zoomed out, smaller when zoomed in)
4. Threshold is calculated in JavaScript/TypeScript and passed to shader (not recalculated in shader)

**Plans**: TBD

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

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 1.1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11

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
| 9. Data Foundation | v1.2 | 0/0 | Not started | - |
| 10. GPU Hover Detection | v1.2 | 0/0 | Not started | - |
| 11. Screen Overlay | v1.2 | 0/0 | Not started | - |

**Milestone Progress:** v1 ✅ Complete | v1.2 🚧 Phase 9 ready to plan
