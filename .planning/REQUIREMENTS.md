# Requirements: WebGL Clusters Playground

**Defined:** 2026-02-01
**Core Value:** Users can load and explore real point cluster data in 3D with interactive camera controls and cluster highlighting

## v1 Requirements

Requirements for initial data loading milestone. Each maps to roadmap phases.

### Camera Controls

- [ ] **CAM-01**: User can rotate camera in correct direction on all axes (fix Euler rotation axis signs)
- [ ] **CAM-02**: Coordinate system documented in code (Y-up, right-handed WebGL conventions)

### Data Loading - JSON

- [ ] **JSON-01**: User can select .json file via file picker dialog
- [ ] **JSON-02**: System parses JSON with simple validation and surfaces errors to UI

### Data Loading - SQLite

- [ ] **SQL-01**: System loads .db files using sql.js WebAssembly library
- [ ] **SQL-02**: System queries flat table with x, y, z, cluster columns
- [ ] **SQL-03**: System displays simple error messages for corrupt databases

### UI

- [ ] **UI-01**: User can toggle between generated data and loaded data source
- [ ] **UI-02**: System displays errors for loading failures in UI

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Camera Controls

- **CAM-03**: User camera uses quaternion-based rotations (if Euler proves insufficient)

### Data Loading - JSON

- **JSON-03**: System displays multi-stage loading progress (download/parse/upload)
- **JSON-04**: System validates file size before loading to prevent memory issues
- **JSON-05**: User can drag-and-drop JSON files
- **JSON-06**: System previews dataset metadata before full load

### Data Loading - SQLite

- **SQL-04**: System validates SQLite file size (<25MB) before loading
- **SQL-05**: System displays loading progress indicator for large databases
- **SQL-06**: System implements lazy loading for databases >100MB

### UI

- **UI-03**: System auto-detects data format from file extension
- **UI-04**: System caches loaded datasets to avoid re-parsing

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Quaternion migration | Euler fix first; quaternions only if needed (two-phase approach from PROJECT.md) |
| Progress indicators | Simplified scope; errors surface to UI if loading fails |
| Memory-aware loading | 100K-500K scale tested; handle errors at load time |
| Drag-and-drop | Simplified scope; file picker sufficient for v1 |
| Data preview | Simplified scope; load directly with error handling |
| Memory checks for SQLite | Simplified scope; sql.js optional per user preference |
| Web Workers for JSON parsing | 100K-500K JSON parses in <100ms; worker overhead not worth complexity |
| Binary file formats | JSON/SQLite sufficient; add complexity |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAM-01 | Phase 1 | Pending |
| CAM-02 | Phase 1 | Pending |
| JSON-01 | Phase 2 | Pending |
| JSON-02 | Phase 2 | Pending |
| SQL-01 | Phase 3 | Pending |
| SQL-02 | Phase 3 | Pending |
| SQL-03 | Phase 3 | Pending |
| UI-01 | Phase 4 | Pending |
| UI-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 9 total
- Mapped to phases: 0 (will be set during roadmap creation)
- Unmapped: 9 ⚠️

---
*Requirements defined: 2026-02-01*
*Last updated: 2026-02-01 after initial definition*
