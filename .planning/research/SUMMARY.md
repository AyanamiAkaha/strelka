# Project Research Summary

**Project:** WebGL Clusters Playground
**Domain:** WebGL-based point cloud visualization with camera controls and data loading
**Researched:** February 1, 2026
**Confidence:** HIGH

## Executive Summary

WebGL Clusters Playground is a point cloud visualization tool for 100K-500K point datasets with 6DOF camera controls and data loading capabilities. Expert implementation uses pure WebGL with TypeScript for direct GPU control, a two-phase approach to camera rotation (fix Euler angles first, migrate to quaternions only if needed), and efficient data loading pipelines that convert JSON/SQLite to TypedArrays for GPU upload.

The research recommends: (1) Fix camera rotation by correcting axis signs in the forward vector formula and documenting coordinate system conventions, (2) Implement data loading with JSON parsing + sql.js for SQLite, using Zod for validation and File API for browser-native file selection, and (3) Optimize WebGL buffers with STATIC_DRAW usage pattern and single interleaved buffers. Critical risks include memory pressure from SQLite's in-memory loading (mitigate with size validation <25MB), synchronous JSON parsing blocking UI (use Web Workers for >1M rows or binary formats), and double memory footprint from CPU+GPU data duplication (nullify TypedArrays after upload).

## Key Findings

### Recommended Stack

**Camera & Rotation:** Pure WebGL + TypeScript with no external rotation libraries for initial implementation. Phase 1 fixes Euler angle implementation by correcting negative Y/Z axis calculations in forward vector formula and documenting coordinate system. Phase 2 migrates to quaternions (gl-matrix library or custom minimal Quaternion class) only if Phase 1 proves insufficient. Two-phase approach isolates the bug and teaches fundamentals before complex refactoring.

**Data Loading:** JSON.parse() + sql.js (WASM) + Zod (validation) + Float32Array buffers + File API. sql.js loads entire SQLite database into WebAssembly memory, mature with 13.5k stars and MIT license. Zod provides TypeScript-first runtime validation with zero dependencies and 2kb bundle. Vite 5.0 handles WASM bundling automatically.

**Core technologies:**
- **sql.js ^1.13.0** — SQLite in browser via WebAssembly — Mature, battle-tested, perfect for read-only point cluster data access
- **Zod ^4.3.x** — Runtime type validation for JSON — TypeScript-first with automatic type inference, zero dependencies, excellent error messages
- **Pure WebGL** — Direct GPU control — Educational value, no heavy abstractions, matches project learning goals
- **gl-matrix (conditional)** — Quaternion library if Euler proves insufficient — 15KB minified, MIT licensed, widely used (5.6k stars)

### Expected Features

**Must have (table stakes):**
- **File picker dialog** — Standard web pattern, users expect to select files
- **Loading progress indicator** — Large datasets (500K points) take 0.5-2 seconds to load, users need feedback
- **File type validation** — Prevent user frustration from wrong file formats, check MIME type and extension
- **Error handling on corrupt data** — Users will try broken files, catch JSON.parse errors and display clearly
- **Memory-aware loading** — 500K points can crash low-end devices, check available memory before loading
- **Camera rotation fix** — Current Euler implementation has inverted axes causing wrong rotation direction

**Should have (competitive):**
- **Drag-and-drop file loading** — Modern UX pattern, faster than clicking through file picker
- **Data preview before loading** — Shows dataset metadata (row count, columns) before full parse
- **Multiple data source support** — JSON OR SQLite OR future formats via abstract loader interface
- **Caching loaded datasets** — Avoid re-parsing same file, useful for toggling between datasets
- **Auto-detect data format** — Try JSON first, then SQLite based on file extension

**Defer (v2+):**
- **Chunked/paginated loading** — Adds complexity, WebGL buffers work best with single upload for <1M points
- **Web Worker for JSON parsing** — 100K-500K JSON parses in <100ms, worker overhead not worth it
- **Binary file format support** — Adds format complexity, JSON is human-readable and good enough
- **Indexed buffer for points** — Points are not indexed geometry, adds complexity without benefit

### Architecture Approach

**Current Architecture:** GPU-accelerated matrices in shaders, CPU-side orientation tracking. Camera stores position + rotation (pitch, yaw) in JavaScript. Shader calculates view/projection matrices from camera parameters. Movement uses CPU-side forward/right vectors from rotation. GPU handles all vertex transformations in parallel. This pattern is optimal for single camera with 100K-500K points (CPU overhead negligible, GPU bottleneck).

**Data Loading Architecture:** Async file read → Parse → TypedArray → WebGL buffer upload → Single draw call. DataProvider pattern returns PointData with Float32Array buffers, ideal for WebGL uploads. Single interleaved buffer for positions + clusterIds (stride=16 bytes) is optimal over multiple buffers. Use STATIC_DRAW usage hint for data loaded once and rendered many times.

**Camera Rotation Architecture:** Phase 1 fixes Euler by correcting axis signs (change `-Math.sin(this.rotation.x)` to `Math.sin(this.rotation.x)` if Y-down) and documenting coordinate system at top of Camera.ts. Phase 2 migrates to quaternions: store orientation as Quaternion, multiply small rotation quaternions from mouse deltas, renormalize every frame to prevent drift.

**Major components:**
1. **Camera** — Manages 6DOF camera with Euler angles (Phase 1) or quaternions (Phase 2), calculates forward/right/up vectors for movement
2. **DataProvider** — Static methods for generating test data + loading JSON/SQLite files, returns PointData with Float32Array buffers
3. **ShaderManager** — GPU-side matrix calculation, view/projection transforms, matches CPU-side rotation formulas
4. **FileLoaders** — JSON loader (FileReader + JSON.parse + Zod validation) and SQLite loader (sql.js WASM initialization + query execution)
5. **UI Layer (Vue)** — File input, loading state management, progress display, error handling

### Critical Pitfalls

**1. Coordinate System Mismatch in Camera Rotation**
Camera expects Y-up, but WebGL uses different conventions. Forward vector formula uses `-Math.sin(this.rotation.x)` for Y and `-Math.cos(this.rotation.x) * Math.cos(this.rotation.y)` for Z, which inverts axes relative to standard WebGL right-handed coordinate system. This causes mouse up to move camera down, mouse right to move camera left.
**Avoid by:** Document coordinate system explicitly at top of Camera.ts, fix axis signs based on debug logging (test: move mouse up, expect camera to look up). Use single interleaved buffer, bind once during setup, avoid re-binding in render loop.

**2. Synchronous JSON Parsing Blocking UI**
Loading 500K points via JSON.parse() blocks main thread for 1-5 seconds, causing browser UI to freeze. Users see unresponsive page, think app crashed.
**Avoid by:** Use Web Workers for JSON parsing for >1M rows, or switch to binary formats (ArrayBuffer + TypedArrays) that can be loaded directly with `response.arrayBuffer()`. For 100K-500K scale, show loading progress indicator and consider main thread acceptable if profiling shows no UI jank.

**3. Loading Entire SQLite Database on Low-End Devices**
sql.js loads entire database into WebAssembly heap. On devices with <2GB RAM, this can fail with "out of memory" even for modest databases (~50MB binary). Error manifests as WASM trap that crashes tab.
**Avoid by:** Validate file size before loading (reject >25MB), query count first (warn if >300K rows), and provide clear error messages. Use sql.js directly for <50MB files, sql.js-httpvfs for >100MB files (lazy loading with HTTP range requests).

**4. Double Memory Footprint (CPU + GPU)**
After loading 500K points (~8MB total), browser memory doubles because JSON-parsed TypedArray stays in CPU memory after GPU buffer upload. For larger datasets, this causes browser tab crashes on memory-constrained devices.
**Avoid by:** After calling `gl.bufferData()`, nullify JavaScript reference (`positions = null; clusterIds = null`) or use block-scoping to let TypedArray go out of range immediately after upload.

**5. No Loading Progress Feedback**
Users open 500K point dataset file, nothing happens for 3-5 seconds with no loading indicator, progress bar, or status text. Users repeatedly click "Load" button thinking it's broken.
**Avoid by:** Implement multi-stage loading indicator: "Downloading..." with progress from fetch, "Parsing data...", "Uploading to GPU...". Use Vue reactive state to update UI, ensure browser paints between stages.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Camera Rotation Fix (Euler)
**Rationale:** Camera rotation bug is blocking UX (wrong rotation direction), fixing first validates coordinate system understanding before adding complexity. Phase 1 uses minimal code changes to isolate axis sign bug and teaches fundamentals. Directly addresses immediate user frustration.
**Delivers:** Fixed camera rotation with correct axis directions, documented coordinate system conventions, debug logging removed
**Addresses:** Table stakes feature from research (camera must work correctly), critical pitfall (coordinate system mismatch)
**Avoids:** Rushing to quaternions without understanding root cause, silent failures where users can't identify bug

### Phase 2: JSON Data Loader
**Rationale:** JSON loader is lowest complexity, validates data pipeline with standard APIs, and provides foundation for SQLite loader. File picker + FileReader + JSON.parse are browser-native patterns. Users will have JSON files as primary format.
**Delivers:** File input component with .json filtering, JSON.parse with Zod validation, Float32Array conversion, progress indicator, error handling
**Uses:** Stack: Native JSON.parse, Zod v4.3.x, File API, Float32Array buffers
**Implements:** Architecture component: DataProvider.loadFromJSON() method, buffer upload with STATIC_DRAW
**Addresses:** Table stakes features (file picker, progress indicator, error handling), critical pitfalls (no progress feedback, invalid data without validation)

### Phase 3: SQLite Data Loader
**Rationale:** SQLite loader adds dependency and WASM handling complexity. Builds on Phase 2's buffer upload pattern. Enables real data exploration for users with SQLite databases.
**Delivers:** SQLite file input with .sqlite/.db filtering, sql.js WASM initialization, database loading with query execution, Float32Array conversion from query results, file size validation (<25MB), row count warning (>300K)
**Uses:** Stack: sql.js ^1.13.0, WASM file handling via Vite, query optimization patterns
**Implements:** Architecture component: DataProvider.loadFromSQLite() method
**Addresses:** Critical pitfall (OOM on low-end devices via size validation), moderate pitfall (type conversion overhead)
**Avoids:** Blocking main thread by validating size before database load

### Phase 4: Camera Rotation Migration to Quaternions (Conditional)
**Rationale:** Only needed if Phase 1 Euler fixes create jitter or unexpected behavior at certain angles. Quaternion migration provides gimbal lock immunity and better rotation accumulation. Optional based on user testing.
**Delivers:** Quaternion class (or gl-matrix integration), orientation storage as quaternion, rotation handling via quaternion multiplication, renormalization per frame
**Uses:** Stack: gl-matrix library OR custom minimal Quaternion class (~50-100 lines)
**Implements:** Architecture component: Camera with quaternion-based rotation
**Addresses:** Critical pitfall (gimbal lock), moderate pitfall (floating point drift)
**Avoids:** Premature optimization - only migrate if Euler proves insufficient

### Phase 5: UI Polish & Performance
**Rationale:** After core functionality works, add differentiators and polish UX. Drag-and-drop, data preview, caching are nice-to-have that enhance user experience but not essential for MVP.
**Delivers:** Drag-and-drop file support (DataTransfer API), data format auto-detection, loading state management (disable controls during load), memory usage monitoring, retry mechanism for failed loads
**Uses:** Stack: DataTransfer API, File API enhancements, Vue reactive state for loading UI
**Implements:** Architecture component: Enhanced UI layer with modern UX patterns
**Addresses:** UX pitfalls (no loading indicator, no error messages), moderate pitfalls (not revoking Object URLs)
**Avoids:** Over-engineering MVP - polish only after core works

### Phase Ordering Rationale

- **Camera rotation first:** Blocks all data visualization if broken, isolates bug before adding complexity, teaches coordinate system fundamentals
- **JSON loader second:** Lowest complexity data source, validates pipeline, users will have JSON files, provides buffer upload pattern reused by SQLite
- **SQLite loader third:** Builds on buffer upload pattern, adds WASM dependency complexity, enables real data exploration
- **Quaternion migration fourth:** Conditional - only if Euler fails, optional optimization, requires testing with actual data
- **UI polish fifth:** Enhancements after core works, differentiators not essential for launch, avoids premature feature creep

**Grouping by architecture:**
- **Phase 1:** Camera component (rotation fix)
- **Phase 2-3:** Data loading pipeline (DataProviders, loaders, buffer upload)
- **Phase 4:** Camera component (advanced rotation)
- **Phase 5:** UI layer (polish, differentiators)

**Pitfall avoidance by phase ordering:**
- **Phase 1:** Avoids coordinate system mismatch by documenting and testing axis directions
- **Phase 2:** Avoids no progress feedback and invalid data by adding progress indicator and Zod validation
- **Phase 3:** Avoids OOM by adding file size validation before SQLite load
- **Phase 4:** Avoids gimbal lock by migrating to quaternions only if needed
- **Phase 5:** Avoids UX pitfalls by adding drag-and-drop, retry mechanisms, error recovery

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (SQLite Loader):** sql.js performance with 500K rows needs real-world testing. WASM file loading in Vite production build requires verification. Query optimization patterns may need research for complex WHERE clauses.
- **Phase 4 (Quaternion Migration):** If Phase 1 Euler fixes insufficient, need research on quaternion integration with existing shader matrix calculation. gl-matrix vs custom implementation trade-offs need validation.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Camera Rotation Fix):** Well-documented WebGL coordinate system patterns, Euler angle fixes are straightforward. Debug logging approach is standard.
- **Phase 2 (JSON Loader):** Standard browser APIs (FileReader, JSON.parse), Zod validation pattern is established. Buffer upload with STATIC_DRAW is OpenGL best practice.
- **Phase 5 (UI Polish):** Drag-and-drop with DataTransfer API is standard web pattern. Vue reactive state for loading UI is framework convention.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | sql.js and Zod are mature, actively maintained libraries with high star counts. Vite WASM handling verified. |
| Camera Rotation | HIGH | Codebase analysis identified exact bug (axis signs in forward vector formula). Two-phase approach matches PROJECT.md decision. |
| Data Loading | HIGH | Standard browser APIs (File, FileReader, JSON.parse) are baseline web technology. sql.js documentation is clear. |
| Buffer Optimization | HIGH | OpenGL best practices + WebGL MDN guidance confirm STATIC_DRAW and single interleaved buffer patterns. |
| Pitfalls | HIGH | All 7 critical pitfalls verified against codebase and common WebGL problems. Prevention strategies are standard. |
| Performance at 500K points | MEDIUM | Need real-world testing of sql.js query performance. JSON parse and buffer upload times are estimates. |
| Cross-browser compatibility | MEDIUM | Vite WASM bundling works on Chrome/Firefox, need testing on Safari/Edge. |

**Overall confidence:** HIGH

### Gaps to Address

- **sql.js memory footprint with 500K rows:** Unknown actual memory usage. Research says ~25-95MB peak, needs real-world validation on devices with 4GB RAM.
- **Performance profiling at scale:** JSON parse and buffer upload times are estimates (100K: ~50-175ms, 500K: ~250-750ms). Need actual measurements with DevTools.
- **Cross-browser WASM loading:** Vite handles WASM in dev, need verification in production build across Chrome, Firefox, Safari, Edge.
- **Quaternion migration decision:** Unclear if Phase 1 Euler fixes will be sufficient. User testing after fix will determine if Phase 4 is needed.
- **Roll rotation requirement:** Need to confirm if 6DOF (roll axis) is needed for data visualization use case. Current clamp to ±89° pitch suggests roll not needed.

**Handling during planning/execution:**
- Add performance profiling task to Phase 2/3 acceptance criteria (measure load times with DevTools)
- Include cross-browser testing in Phase 3 acceptance criteria (Chrome, Firefox, Safari, Edge)
- Make Phase 4 optional based on user testing results after Phase 1
- Document assumption that roll rotation is not needed (6DOF with clamped pitch is 5DOF)

## Sources

### Primary (HIGH confidence)
- **CAMERA.md** — Codebase analysis of Camera.ts and ShaderManager.ts, identified exact bug in forward vector formula
- **DATA_LOADERS.md** — Comprehensive JSON and SQLite loading patterns with performance benchmarks for 100K-500K points
- **INTEGRATION_STACK.md** — Verified sql.js v1.13.0 (Mar 2025), Zod v4.3.6 (Jan 2026), library documentation and alternatives
- **PITFALLS.md** — 7 critical pitfalls verified against codebase and WebGL best practices
- [sql.js GitHub](https://github.com/sql-js/sql.js) — 13.5k stars, MIT license, verified API documentation
- [Zod GitHub](https://github.com/colinhacks/zod) — 41.7k stars, verified v4.3.6 release (Jan 2026), TypeScript-first validation
- [gl-matrix GitHub](https://github.com/toji/gl-matrix) — 5.6k stars, verified 192k+ projects using it, MIT license

### Secondary (MEDIUM confidence)
- [WebGL Fundamentals](https://webglfundamentals.org/) — Authoritative explanation of view matrix construction, coordinate system conventions
- [MDN WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) — WebGL-specific performance and correctness guidelines
- [MDN WebGL bufferData](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferData) — Verified STATIC_DRAW vs DYNAMIC_DRAW vs STREAM_DRAW usage patterns
- [MDN JSON.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) — Verified synchronous blocking behavior
- [MDN File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API) — Baseline web technology, file selection patterns
- [Vite Assets Documentation](https://vitejs.dev/guide/assets.html) — Verified WASM handling, worker imports, static asset bundling

### Tertiary (LOW confidence)
- **Personal experience** — Main thread blocking during JSON parse (HIGH confidence for this specific issue), browser memory pressure observations (MEDIUM confidence, needs validation)
- **Performance benchmarks from DATA_LOADERS.md** — JSON parse times (10-200ms) and buffer upload times (5-50ms) are estimates, need real-world verification

---

*Research completed: February 1, 2026*
*Ready for roadmap: yes*
