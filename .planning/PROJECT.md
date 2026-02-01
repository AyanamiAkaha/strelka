# WebGL Clusters Playground

## What This Is

A WebGL clusters playground that loads and visualizes large 3D point datasets (100K-500K points) with cluster highlighting and freeflight camera controls. Built with Vue 3, TypeScript, and pure WebGL.

## Core Value

Users can load and explore real point cluster data in 3D with interactive camera controls and cluster highlighting.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ WebGL point rendering with additive blending — existing
- ✓ 6DOF camera controls (WASD + mouse look + zoom) — existing
- ✓ Spiral cluster data generation — existing
- ✓ Interactive controls (cluster highlighting, points per cluster) — existing
- ✓ Real-time FPS counter and debug info — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Fix camera rotation direction in freeflight mode (wrong direction on some axes)
- [ ] Add JSON loader for point data with cluster IDs
- [ ] Add SQLite loader for flat x, y, z, cluster table
- [ ] Add UI to toggle between generated and loaded data
- [ ] Support 100K-500K point datasets with single load pattern

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Arbitrary file path selection — hardcoded relative paths in v1 (simplifies UI, limits scope)
- Streaming data loading — single load pattern only (tested 10M points, 100K-500K expected)
- Database schema migrations — read-only SQLite access (no write operations needed)
- Data transformation/validation tools — assume valid data format (focus on visualization, not ETL)
- Multiple simultaneous loaders — one loader at a time in v1 (coexist with generator, not parallel)

## Context

Existing WebGL playground with working basic rendering and camera controls. Camera rotation has bug where rotation direction is incorrect (possibly negative axis calculations or gimbal lock). Current spiral generator tested with up to 10M points. Real data needed instead of just generated test data.

Tech stack: Vue 3.3.8, TypeScript 5.3.0, Vite 5.0.0, pure WebGL (no 3D libraries).

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
| Fix Euler first, then quaternion migration | Two-step approach: debug current implementation before major refactor | — Pending |
| Keep generator alongside loaders | Preserve existing functionality, add loader as option | — Pending |
| Flat SQLite table structure | Simplest schema for read-only visualization, no joins needed | — Pending |

---
*Last updated: 2026-02-01 after initialization*
