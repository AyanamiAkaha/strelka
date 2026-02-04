# Requirements Archive: v1 Data Loading Capabilities

**Archived:** 2026-02-04
**Status:** ✅ SHIPPED

This is archived requirements specification for v1 — Data Loading Capabilities for WebGL Point Cloud Visualization.

For current requirements, see `.planning/REQUIREMENTS.md` (created for next milestone).

---

## Core Value

Users can load and explore real point cluster data in 3D with interactive camera controls and cluster highlighting.

---

## v1 Requirements

Requirements for initial data loading milestone. Each maps to roadmap phases.

### Camera Controls

- [x] **CAM-01**: User can rotate camera in correct direction on all axes (fix Euler rotation axis signs) — **OUTCOME**: Fixed by Phase 1.1 quaternion migration (Euler fix insufficient)
- [x] **CAM-02**: Coordinate system documented in code (Y-up, right-handed WebGL conventions) — **OUTCOME**: JSDoc added to Camera.ts (Phase 7)

### Data Loading - JSON

- [x] **JSON-01**: User can select .json file via file picker dialog — **OUTCOME**: DataLoadControl.vue implemented with drag-and-drop
- [x] **JSON-02**: System parses JSON with simple validation and surfaces errors to UI — **OUTCOME**: validators.ts with error panel integration

### Data Loading - SQLite

- [x] **SQL-01**: System loads .db files using sql.js WebAssembly library — **OUTCOME**: WebAssembly integration with lazy initialization
- [x] **SQL-02**: System queries flat table with x, y, z, cluster columns — **OUTCOME**: Schema validation with PRAGMA table_info()
- [x] **SQL-03**: System displays simple error messages for corrupt databases — **OUTCOME**: Granular error messages (Database corrupt, Table not found, Missing columns)

### UI

- [x] **UI-01**: User can toggle between generated data and loaded data source — **OUTCOME**: Data source toggle with Generate/Load buttons (Phase 4)
- [x] **UI-02**: System displays errors for loading failures in UI — **OUTCOME**: Unified error panel with collapsible display (Phase 4)

## v2 Requirements (Deferred)

Deferred to future release. Tracked but not in current roadmap.

### Camera Controls

- [x] **CAM-03**: User camera uses quaternion-based rotations (if Euler proves insufficient) — **OUTCOME**: Promoted to v1.1 urgency, implemented in Phase 1.1

### Data Loading - JSON

- [ ] **JSON-03**: System displays multi-stage loading progress (download/parse/upload)
- [ ] **JSON-04**: System validates file size before loading to prevent memory issues
- [ ] **JSON-05**: User can drag-and-drop JSON files
- [ ] **JSON-06**: System previews dataset metadata before full load

### Data Loading - SQLite

- [ ] **SQL-04**: System validates SQLite file size (<25MB) before loading
- [ ] **SQL-05**: System displays loading progress indicator for large databases
- [ ] **SQL-06**: System implements lazy loading for databases >100MB

### UI

- [ ] **UI-03**: System auto-detects data format from file extension
- [ ] **UI-04**: System caches loaded datasets to avoid re-parsing

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Quaternion migration | Euler fix first; quaternions only if needed (two-phase approach from PROJECT.md) — **REVISED**: Quaternions implemented in v1 (Phase 1.1) |
| Progress indicators | Simplified scope; errors surface to UI if loading fails |
| Memory-aware loading | 100K-500K scale tested; handle errors at load time |
| Drag-and-drop | Simplified scope; file picker sufficient for v1 — **REVISED**: Drag-and-drop implemented in v1 (Phase 2) |
| Data preview | Simplified scope; load directly with error handling |
| Memory checks for SQLite | Simplified scope; sql.js optional per user preference |
| Web Workers for JSON parsing | 100K-500K JSON parses in <100ms; worker overhead not worth complexity |
| Binary file formats | JSON/SQLite sufficient; add complexity |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status | Outcome |
|-------------|-------|--------|----------|
| CAM-01 | Phase 1, 1.1 | Complete | Fixed by quaternion migration (Phase 1.1) |
| CAM-02 | Phase 1, 1.1 | Complete | JSDoc added to Camera.ts (Phase 7) |
| CAM-03 | Phase 1.1 | Complete | Promoted from v2 to v1.1 urgency, implemented successfully |
| JSON-01 | Phase 2 | Complete | DataLoadControl.vue with file picker and drag-and-drop |
| JSON-02 | Phase 2 | Complete | validators.ts with validation logic and error panel integration |
| SQL-01 | Phase 3 | Complete | sql.js WebAssembly integration with lazy initialization |
| SQL-02 | Phase 3 | Complete | Schema validation using PRAGMA table_info() |
| SQL-03 | Phase 3 | Complete | Granular error messages for database issues |
| UI-01 | Phase 4 | Complete | Data source toggle with Generate/Load buttons |
| UI-02 | Phase 4 | Complete | Unified error panel with collapsible display |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10 ✓
- Unmapped: 0
- Completed: 10/10 (CAM-01, CAM-02, CAM-03, JSON-01, JSON-02, SQL-01, SQL-02, SQL-03, UI-01, UI-02)

---

## Milestone Summary

**Shipped:** 10 of 10 v1 requirements (100%)

**Adjusted:**
- CAM-03: Promoted from v2 to v1.1 urgency — Successfully implemented in Phase 1.1
- Drag-and-drop: Removed from "Out of Scope" — Implemented in Phase 2 (JSON-03)
- Quaternion migration: Re-marked as "completed" — Previously in v2, shipped in v1.1

**Dropped:** None (all original v1 requirements shipped)

**Technical Debt:** 4 items deferred to v1.1
- highlightedCluster reset consistency (-2 instead of -1)
- SQLite table selection UX (auto-select for single-table databases)
- Cluster slider disable state when no data loaded
- Error recovery guidance for common issues

---

*Archived: 2026-02-04 as part of v1 milestone completion*
