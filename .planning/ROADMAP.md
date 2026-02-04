# Roadmap: WebGL Clusters Playground

## Overview

WebGL Clusters Playground — 3D point cloud visualization with data loading, camera controls, and cluster highlighting.

## Milestones

- ✅ **v1 Data Loading Capabilities** — Phases 1, 1.1, 2-8 (shipped 2026-02-04) — [See full details](./milestones/v1-ROADMAP.md)
- 📋 **v1.1 UX Refinements** — Phases 9-11 (planned)

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

### 📋 v1.1 UX Refinements (Planned)

- [ ] Phase 9: highlightedCluster Reset Consistency ([N] plans)
- [ ] Phase 10: SQLite Table Selection UX ([N] plans)
- [ ] Phase 11: Cluster Slider Disable State ([N] plans)

## Phase Details

### Phase 1: Camera Rotation Fix

**Goal**: Camera rotates correctly on all axes with documented coordinate system conventions

**Depends on**: Nothing (first phase)

**Requirements**: CAM-01, CAM-02

**Success Criteria** (what must be TRUE):
1. User can rotate camera up/down and left/right in correct direction
2. Coordinate system is documented in Camera.ts with Y-up convention
3. Axis sign corrections are implemented in forward vector formula

**Plans**: 3 plans (in 3 waves)

 - [x] 01-camera-rotation-fix-01-PLAN.md — Fix forward vector calculation in Camera.ts and ShaderManager.ts
 - [x] 01-camera-rotation-fix-02-PLAN.md — Create coordinate system documentation
  - [x] 01-camera-rotation-fix-03-PLAN.md — Verify camera rotation behavior and document symptoms
### Phase 1.1: Implement Quaternion-Based Camera (INSERTED)

**Goal:** Implement quaternion-based camera rotation to eliminate gimbal lock

**Depends on:** Phase 1

**Requirements**: CAM-03 (from v2 - promoted to v1.1 urgency)

**Success Criteria** (what must be TRUE):
1. User can rotate camera at extreme angles (±90°) without gimbal lock
2. Camera movement uses local coordinate space (not fixed world up)
3. Quaternion-based rotation accumulates correctly without drift
4. Camera reset ('R' key) returns to default position and orientation

**Plans**: 5 plans (in 4 waves)

- [x] 01.1-01-PLAN.md — Add gl-matrix dependency and export vec3/quat from Math.ts
- [x] 01.1-02-PLAN.md — Replace Camera.ts Vec3 with gl-matrix vec3
- [x] 01.1-03-PLAN.md — Implement quaternion-based rotation in Camera.ts
- [x] 01.1-04-PLAN.md — Update shader integration for quaternion camera
- [x] 01.1-05-PLAN.md — Verify quaternion camera eliminates gimbal lock

### Phase 2: JSON Data Loader

**Goal**: Users can load point data from JSON files with cluster IDs

**Depends on**: Phase 1

**Requirements**: JSON-01, JSON-02

**Success Criteria** (what must be TRUE):
1. User can select .json file via file picker dialog
2. System parses JSON and converts to Float32Array for WebGL upload
3. System displays error message when JSON is invalid or malformed

**Plans**: 3 plans (in 3 waves)

- [x] 02-01-PLAN.md — Create JSON types and validation logic
- [x] 02-02-PLAN.md — Add loadFromFile() method to DataProvider
 - [x] 02-03-PLAN.md — Create DataLoadControl and integrate error panel
 
### Phase 3: SQLite Data Loader

**Goal**: Users can load point data from SQLite databases

**Depends on**: Phase 2

**Requirements**: SQL-01, SQL-02, SQL-03

**Success Criteria** (what must be TRUE):
1. System loads .db/.sqlite files using sql.js WebAssembly library
2. System queries flat table with x, y, z, cluster columns
3. System displays error message when database is corrupt or unreadable

**Plans**: 3 plans (in 3 waves)

  - [x] 03-01-PLAN.md — Install sql.js and create initialization utility with schema validation
  - [x] 03-02-PLAN.md — Implement SQLite file loading with table selection and data extraction
   - [x] 03-03-PLAN.md — Integrate SQLite UI, add granular error handling, and loading state

### Phase 4: Data Source Toggle & Error Display

**Goal**: Users can toggle between generated data and loaded data sources, with unified error display for loading failures

**Depends on**: Phase 3

**Requirements**: UI-01, UI-02

**Success Criteria** (what must be TRUE):
1. User can toggle between Generate and Load data sources via buttons
2. Camera resets to default position when switching data sources
3. Errors from loading operations appear in collapsible error panel
4. Errors auto-dismiss when new data loads successfully

**Plans**: 3 plans (in 2 waves)

  - [x] 04-01-PLAN.md — Add data source toggle UI and state management
  - [x] 04-02-PLAN.md — Implement error display system with collapsible panel
  - [x] 04-03-PLAN.md — Integrate switching with error handling and verify workflow

### Phase 5: Fix GPU Memory & Loading Issues

**Goal**: Fix critical integration issues blocking milestone completion

**Depends on**: Phase 4

**Requirements**: Gap closure from milestone audit

**Success Criteria** (what must be TRUE):
1. setupBuffers() deletes old buffers before creating new ones
2. JSON files are loaded only once (no duplicate parsing)
3. SQLite files do not create empty buffers before table selection
4. Syntax error in DataProvider.ts is fixed

**Plans**: 4 plans (in 1 wave)

  - [x] 05-01-PLAN.md — Add buffer cleanup to setupBuffers()
  - [x] 05-02-PLAN.md — Remove duplicate JSON loading in DataLoadControl
  - [x] 05-03-PLAN.md — Prevent empty SQLite buffer creation
  - [x] 05-04-PLAN.md — Fix syntax error in DataProvider.ts

### Phase 6: Performance & UX Improvements

**Goal**: Add performance optimizations and UX consistency fixes

**Depends on**: Phase 5

**Requirements**: Gap closure from milestone audit

**Success Criteria** (what must be TRUE):
1. Render loop checks pointCount > 0 before drawArrays()
2. WebGL resources cleaned up on component unmount
3. Loading state is unified between DataLoadControl and WebGLPlayground

**Plans**: 3 plans (in 2 waves)

  - [x] 06-01-PLAN.md — Add pointCount guard to render loop
  - [x] 06-02-PLAN.md — Add WebGL cleanup to onUnmounted()
  - [x] 06-03-PLAN.md — Unify loading state across components

### Phase 7: Documentation Cleanup

**Goal**: Resolve technical debt and complete documentation requirements

**Depends on**: Phase 6

**Requirements**: Gap closure from milestone audit

**Success Criteria** (what must be TRUE):
1. Camera.ts has JSDoc referencing coordinate system documentation
2. TODO comments in DataProvider.ts are resolved or updated

**Plans**: 2 plans (in 2 waves)

   - [x] 07-01-PLAN.md — Add comprehensive JSDoc to Camera.ts and resolve DataProvider TODO
   - [x] 07-02-PLAN.md — Add @see cross-references from camera consumers to Camera.ts

### Phase 8: Highlighted Cluster Selector

**Goal**: Add interactive cluster highlighting with slider control

**Depends on**: Phase 7

**Success Criteria** (what must be TRUE):
1. User can select clusters to highlight using a slider control (not radio buttons)
2. Slider range dynamically adapts to loaded data (max = highest cluster ID)
3. Selected cluster is highlighted in orange when rendered
4. Special values display correctly: -2 → "None", -1 → "Noise", 0+ → "Cluster X"
5. Slider works seamlessly with both generated and loaded data
6. WebGL uniform updates automatically via existing render loop (no shader changes)

**Plans**: 1 plan (in 1 wave)

 Plans:
 - [x] 08-01-PLAN.md — Replace radio buttons with dynamic slider and pass pointData to ControlsOverlay

**Details**:
- Use slider with min=-2 (none, trick to account for -1 being potentially valid cluster - noise cluster)
- max=max cluster number from loaded data
- Display labels: -2 → "None", -1 → "Noise", 0+ → "Cluster X"

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 1.1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9-11

  | Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|---------------|--------|-----------|
| | 1. Camera Rotation Fix | v1 | 3/3 | Complete | 2026-02-02 |
| | 1.1. Implement Quaternion-Based Camera | v1 | 5/5 | Complete | 2026-02-02 |
| | 2. JSON Data Loader | v1 | 3/3 | Complete | 2026-02-02 |
| | 3. SQLite Data Loader | v1 | 3/3 | Complete | 2026-02-03 |
  | 4. Data Source Toggle & Error Display | v1 | 3/3 | Complete | 2026-02-03 |
    | 5. Fix GPU Memory & Loading Issues | v1 | 4/4 | Complete | 2026-02-03 |
     | 6. Performance & UX Improvements | v1 | 3/3 | Complete | 2026-02-04 |
 |   7. Documentation Cleanup | v1 | 2/2 | Complete | 2026-02-04 |
    | 8. Highlighted Cluster Selector | v1 | 1/1 | Complete | 2026-02-04 |
| | 9. highlightedCluster Reset Consistency | v1.1 | 0/3 | Not started | - |
| | 10. SQLite Table Selection UX | v1.1 | 0/2 | Not started | - |
| | 11. Cluster Slider Disable State | v1.1 | 0/1 | Not started | - |
