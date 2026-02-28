# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**strelka** — WebGL 3D point cloud visualization app for exploring large embedding datasets (100K-500K points, up to 30M) with cluster highlighting and freeflight camera controls. Built with Vue 3, TypeScript, and **pure WebGL** (no Three.js/Babylon.js).

## Commands

```bash
yarn dev          # Dev server on http://localhost:3000 (auto-opens browser)
yarn build        # Production build to dist/
yarn type-check   # vue-tsc type validation
```

Package manager is Yarn 3 (Berry) with PnP. No test framework is configured.

## Architecture

**Three-layer design:**

1. **View Layer** (`src/views/`, `src/components/`) — Vue 3 Composition API with `<script setup>`. `WebGLPlayground.vue` is the main orchestrator (~770 lines): owns the render loop, creates Camera/ShaderManager/DataProvider instances, coordinates everything.

2. **Core Layer** (`src/core/`) — Pure TypeScript, no Vue dependencies. Direct WebGL API calls.
   - `Camera.ts` — Quaternion-based 6DOF camera (WASD + mouse look). Uses gl-matrix `quat`/`vec3`/`mat4`.
   - `ShaderManager.ts` — Shader compilation, GPU setup. Shaders are embedded as strings (not separate .glsl files).
   - `DataProvider.ts` — Static methods for point data generation and loading (JSON, SQLite via sql.js WASM).
   - `validators.ts` — JSON/SQLite data validation (30M point limit enforced).

3. **Composables** (`src/composables/settings.ts`) — Shared reactive state via Vue `ref()`: `highlightedCluster`, `ppc` (points per cluster), `imagePathBase`.

**Data flow:** User Input → WebGLCanvas (events) → WebGLPlayground (coordination) → Camera/ShaderManager/DataProvider → WebGL GPU → Canvas

**GPU-first philosophy:** Matrix calculations happen in vertex shaders, not CPU. Point data uploaded once (`gl.STATIC_DRAW`), single draw call per frame, additive blending with depth test on / depth writes off.

## Key Conventions

- **Coordinate system:** Right-handed Y-up. Camera looks toward -Z at default rotation. See `docs/coordinate-system.md`.
- **Path alias:** `@/*` maps to `src/*` (configured in both vite.config.ts and tsconfig.json).
- **Point data structure:** `positions: Float32Array` (interleaved xyz), `clusterIds: Float32Array`, optional `tagIndices`/`imageIndices` with lookup Maps.
- **Cluster highlighting:** -2 = none, -1 = noise, >= 0 = specific cluster ID.
- **Error handling:** Console logs for technical details, brief UI messages in error panel.

## Planning

The `.planning/` directory contains project history, architecture docs, and phase records. Check `.planning/PROJECT.md` for current state and milestone goals.
