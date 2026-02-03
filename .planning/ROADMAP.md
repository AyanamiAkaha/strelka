# Roadmap: WebGL Clusters Playground

## Overview

This roadmap delivers data loading capabilities for WebGL point cloud visualization, fixing camera rotation bugs and enabling users to load real datasets from JSON and SQLite formats. The journey starts with foundational camera fixes, progresses through data loading pipelines, and culminates with UI integration for switching between generated and loaded data.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

  - [x] **Phase 1: Camera Rotation Fix** - Fix Euler rotation axis signs and document coordinate system
  - [x] **Phase 2: JSON Data Loader** - Implement file picker, JSON parsing, and error handling
  - [x] **Phase 3: SQLite Data Loader** - Add sql.js integration for loading .db files
   - [x] **Phase 4: Data Source Toggle & Error Display** - Enable switching between data sources with error UI
   - [x] **Phase 5: Fix GPU Memory & Loading Issues** - Close critical blockers from milestone audit
   - [ ] **Phase 6: Performance & UX Improvements** - Add rendering guards and cleanup
   - [ ] **Phase 7: Documentation Cleanup** - Resolve technical debt
   - [ ] **Phase 8: Highlighted Cluster Selector** - Add interactive cluster highlighting with slider control

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

  - [ ] 06-01-PLAN.md — Add pointCount guard to render loop
  - [ ] 06-02-PLAN.md — Add WebGL cleanup to onUnmounted()
  - [ ] 06-03-PLAN.md — Unify loading state across components

### Phase 7: Documentation Cleanup

**Goal**: Resolve technical debt and complete documentation requirements

**Depends on**: Phase 6

**Requirements**: Gap closure from milestone audit

**Success Criteria** (what must be TRUE):
1. Camera.ts has JSDoc referencing coordinate system documentation
2. TODO comments in DataProvider.ts are resolved or updated

**Plans**: 2 plans (in 2 waves)

   - [ ] 07-01-PLAN.md — Add coordinate system JSDoc to Camera.ts
   - [ ] 07-02-PLAN.md — Resolve or update TODO comments in DataProvider.ts

### Phase 8: Highlighted Cluster Selector

**Goal**: Add interactive cluster highlighting with slider control

**Depends on**: Phase 7

**Plans**: 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 8 to break down)

**Details**:
- Use slider with min=-2 (none, trick to account for -1 being potentially valid cluster - noise cluster)
- max=max cluster number from loaded data

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 1.1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

  | Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| |  1. Camera Rotation Fix | 3/3 | Complete | 2026-02-02 |
| |  1.1. Implement Quaternion-Based Camera | 5/5 | Complete | 2026-02-02 |
| |  2. JSON Data Loader | 3/3 | Complete | 2026-02-02 |
| |  3. SQLite Data Loader | 3/3 | Complete | 2026-02-03 |
  | 4. Data Source Toggle & Error Display | 3/3 | Complete | 2026-02-03 |
  | 5. Fix GPU Memory & Loading Issues | 4/4 | Complete | 2026-02-03 |
   | 6. Performance & UX Improvements | 0/3 | Pending | — |
   | 7. Documentation Cleanup | 0/2 | Pending | — |
   | 8. Highlighted Cluster Selector | 0/0 | Pending | — |
