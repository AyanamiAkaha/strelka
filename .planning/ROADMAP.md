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
  - [ ] **Phase 3: SQLite Data Loader** - Add sql.js integration for loading .db files
- [ ] **Phase 4: Data Source Toggle & Error Display** - Enable switching between data sources with error UI

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

- [ ] 03-01-PLAN.md — Install sql.js and create initialization utility with schema validation
- [ ] 03-02-PLAN.md — Implement SQLite file loading with table selection and data extraction
- [ ] 03-03-PLAN.md — Integrate SQLite UI, add granular error handling, and loading state

### Phase 4: Data Source Toggle & Error Display

**Goal**: Users can switch between generated and loaded data with error visibility

**Depends on**: Phase 3

**Requirements**: UI-01, UI-02

**Success Criteria** (what must be TRUE):
1. User can toggle between generated data and loaded data source
2. System displays errors for loading failures in the UI
3. System shows appropriate error messages for both JSON and SQLite load failures

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 1.1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
|  1. Camera Rotation Fix | 3/3 | Complete | 2026-02-02 |
|  1.1. Implement Quaternion-Based Camera | 5/5 | Complete | 2026-02-02 |
 |  2. JSON Data Loader | 3/3 | Complete | 2026-02-02 |
|  3. SQLite Data Loader | 0/3 | Not started | - |
|  4. Data Source Toggle & Error Display | 0/TBD | Not started | - |
