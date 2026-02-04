# WebGL Clusters Playground

## What This Is

A WebGL clusters playground that loads and visualizes large 3D point datasets (100K-500K points) with cluster highlighting and freeflight camera controls. Built with Vue 3, TypeScript, and pure WebGL.

## Core Value

Users can load and explore real point cluster data in 3D with interactive camera controls and cluster highlighting.

## Current State

**Shipped:** v1 — Data Loading Capabilities (2026-02-04)

The WebGL Clusters Playground successfully delivers data loading capabilities for JSON and SQLite formats, quaternion-based camera controls, cluster highlighting, and comprehensive error handling.

**Delivered features:**
- Quaternion-based camera rotation (eliminated gimbal lock at extreme angles)
- JSON data loading with validation and error handling
- SQLite data loading with sql.js WebAssembly integration
- Data source toggle between generated and loaded data
- GPU memory management (buffer cleanup, resource disposal)
- Interactive cluster highlighting with dynamic slider
- Comprehensive error display system

**Codebase:** 2,454 lines (TypeScript + Vue)
**Tech stack:** Vue 3.3.8, TypeScript 5.3.0, Vite 5.0.0, pure WebGL, gl-matrix 3.4.4, sql.js 1.13.0
**User feedback:** Confirmed camera rotation works correctly at all angles, data loading functions as expected

## Current Milestone: v1.2 Point Hover with Tag/Image Display

**Goal:** Enable users to hover over points to see associated tags and images.

**Target features:**
- Detect hovered point using distance threshold heuristic
- Buffer-based communication (point index + depth, LWW or depth-based preferred)
- Return screen position (canvas space) of hovered point for UI positioning
- Vue/TS side displays tag/image when point is hovered
- Support optional `tag` and `image` columns in JSON/SQLite data
- Silently skip display if tag/image columns are missing from data
- Performance: maintain 45 FPS @ 30M points (buffer read/write overhead acceptable)

Technical approach:
- 2D buffer for hover detection (depth-based: point index + depth, update if new depth > current)
- Mouse position passed as buffer uniform/input
- Vue/TS side decides display behavior (outside WebGL)

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

**Pre-existing (before v1):**
- ✓ WebGL point rendering with additive blending
- ✓ 6DOF camera controls (WASD + mouse look + zoom)
- ✓ Spiral cluster data generation
- ✓ Interactive controls (cluster highlighting, points per cluster)
- ✓ Real-time FPS counter and debug info

**Shipped in v1:**
- ✓ Camera rotation with quaternion-based system — v1.1 (eliminated gimbal lock)
- ✓ Coordinate system documentation (Y-up, right-handed) — v1.1
- ✓ JSON loader with file picker and validation — v1
- ✓ SQLite loader with sql.js WebAssembly — v1
- ✓ Data source toggle (Generate/Load) — v1
- ✓ Error display system — v1
- ✓ GPU memory management — v1
- ✓ Interactive cluster highlighting with slider — v1

### Active

<!-- Current scope. Building toward these. -->

**v1.2 Milestone Goals (Point Hover with Tag/Image Display):**
- [ ] Point hover detection using distance threshold heuristic
- [ ] Buffer-based communication (point index + depth, depth-based preferred)
- [ ] Return screen position of hovered point for UI positioning
- [ ] Display tag/image when point is hovered (Vue/TS side)
- [ ] Support optional `tag` and `image` columns in data (JSON/SQLite)
- [ ] Silently skip display if tag/image missing
- [ ] Maintain 45 FPS @ 30M points performance

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Arbitrary file path selection — hardcoded relative paths in v1 (simplifies UI, limits scope)
- Streaming data loading — single load pattern only (tested 10M points, 100K-500K expected)
- Database schema migrations — read-only SQLite access (no write operations needed)
- Data transformation/validation tools — assume valid data format (focus on visualization, not ETL)
- Multiple simultaneous loaders — one loader at a time in v1 (coexist with generator, not parallel)

## Context

Post-v1 state: WebGL playground with data loading capabilities (JSON and SQLite), quaternion-based camera controls, cluster highlighting with slider, and comprehensive error handling. All v1 requirements shipped successfully. Accumulated 4 items of technical debt (UX refinements) for v1.1 milestone.

Tech stack: Vue 3.3.8, TypeScript 5.3.0, Vite 5.0.0, pure WebGL, gl-matrix 3.4.4, sql.js 1.13.0.

Known issues: None critical. Minor UX debt tracked for v1.1 (highlightedCluster reset consistency, SQLite table selection UX, slider disable state, error recovery guidance).

## Constraints

- **Tech Stack**: Vue 3 + TypeScript + pure WebGL — Already implemented, must maintain compatibility
- **Performance**: 100K-500K points with single load — Current generator handles 10M, maintain efficiency
- **Browser**: WebGL 1.0+ required — Already enforced, no changes needed
- **File Paths**: Hardcoded relative paths for v1 — /data/points.json, /data/points.db
- **Data Format**: JSON with cluster IDs, SQLite flat table — Denormalized structure (x, y, z, cluster columns)

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fix Euler first, then quaternion migration | Two-step approach: debug current implementation before major refactor | ✓ Good — Phase 1 identified gimbal lock, Phase 1.1 implemented quaternions |
| Keep generator alongside loaders | Preserve existing functionality, add loader as option | ✓ Good — Both data sources available with toggle UI (Phase 4) |
| Flat SQLite table structure | Simplest schema for read-only visualization, no joins needed | ✓ Good — Validated with PRAGMA table_info(), works as expected (Phase 3) |
| Two-step error handling (console + UI) | Technical details in console for debugging, brief messages for users | ✓ Good — Implemented in Phase 2/3 with error panel (Phase 4) |

---
 *Last updated: 2026-02-04 after v1.2 milestone started*
