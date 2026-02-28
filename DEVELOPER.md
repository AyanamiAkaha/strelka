# Developer Guide

## Philosophy

### Why Pure WebGL

No Three.js. No Babylon.js. Direct WebGL API calls give full control over the rendering pipeline with zero abstraction overhead. When rendering millions of points, every unnecessary layer costs frames.

### Why No Level-of-Detail

Most point cloud viewers decimate or cull points based on camera distance. This project renders every point every frame. Modern GPUs handle millions of points in a single draw call — LoD adds complexity without benefit at this scale.

### Why Freeflight Camera

Orbital cameras (rotate around a center point) are common in 3D viewers but limiting for exploring large point clouds. The freeflight camera provides full 6DOF movement — fly through the data, not around it. Quaternion-based rotation eliminates gimbal lock at all angles.

### GPU-First Rendering

Matrix calculations happen in vertex shaders, not on the CPU. Point data is uploaded once (`gl.STATIC_DRAW`) and reused every frame. One draw call per frame for all points. Additive blending with depth test on and depth writes off.

## Architecture

Three-layer design with strict dependency direction: View -> Core -> GPU.

```
src/
├── views/              # View Layer — Vue orchestration
│   └── WebGLPlayground.vue   # Main orchestrator (~770 lines)
├── components/         # View Layer — Vue components
│   ├── WebGLCanvas.vue        # Canvas + WebGL context init
│   ├── ControlsOverlay.vue    # Settings panel
│   ├── DataLoadControl.vue    # File picker + drag-and-drop
│   ├── DebugInfo.vue          # FPS, camera, hover debug
│   └── PointOverlay.vue       # Hover metadata display
├── core/               # Core Layer — Pure TypeScript, no Vue
│   ├── Camera.ts              # Quaternion 6DOF camera (gl-matrix)
│   ├── ShaderManager.ts       # Shader compilation, GPU setup
│   ├── DataProvider.ts        # Point data generation + loading
│   └── validators.ts          # JSON/SQLite data validation
├── composables/        # State Layer — Shared reactive state
│   └── settings.ts            # highlightedCluster, ppc, imagePathBase
└── main.ts             # Entry point
```

### Data Flow

```
User Input → WebGLCanvas (events) → WebGLPlayground (coordination)
  → Camera / ShaderManager / DataProvider → WebGL GPU → Canvas
```

**Initialization:** Browser → index.html → main.ts → Vue app → WebGLPlayground → WebGLCanvas emits `webgl-ready` → Camera, ShaderManager, DataProvider created → buffers uploaded → render loop starts.

**Per frame:** Camera.update() → getShaderUniforms(aspect) → set uniforms → bind buffers → gl.drawArrays(gl.POINTS) → FPS counter.

**Settings change:** Composable ref updates → watch() triggers → DataProvider regenerates data → setupBuffers() uploads to GPU → next frame renders new data.

## Dev Environment Setup

```bash
git clone https://github.com/AyanamiAkaha/strelka.git
cd strelka
yarn install
yarn dev          # Dev server on localhost:3000
```

**Requirements:**
- Node.js 18+
- Yarn 3 (Berry) with PnP — configured via `packageManager` in package.json

**Commands:**

| Command | Purpose |
|---------|---------|
| `yarn dev` | Dev server with HMR |
| `yarn build` | Production build to `dist/` |
| `yarn type-check` | `vue-tsc` type validation |

## Code Conventions

### Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Files (classes) | PascalCase | `Camera.ts`, `ShaderManager.ts` |
| Files (components) | PascalCase | `WebGLCanvas.vue`, `ControlsOverlay.vue` |
| Files (composables) | camelCase | `settings.ts` |
| Functions / methods | camelCase | `handleKeyEvent`, `getShaderUniforms` |
| Variables | camelCase | `pointCount`, `lastMouseX` |
| Interfaces / classes | PascalCase | `PointData`, `ShaderSource` |
| Constants | camelCase | `cScale`, `ppc` |

### Imports

Order: external framework → core → components → composables.

```typescript
import { ref, onMounted } from 'vue'          // 1. External
import { Camera } from '@/core/Camera'          // 2. Core
import WebGLCanvas from '@/components/WebGLCanvas.vue'  // 3. Components
import { highlightedCluster } from '@/composables/settings'  // 4. Composables
```

Path alias `@/*` maps to `src/*` (configured in both `vite.config.ts` and `tsconfig.json`).

### Components

- Vue 3 Composition API with `<script setup lang="ts">`
- Props via `defineProps<T>()`, emits via `defineEmits<T>()`
- Scoped styles with dark theme tokens

### Error Handling

- Try-catch with descriptive Error objects
- Console logs for technical details, brief UI messages in error panel
- WebGL errors checked via `gl.getError()`

## Key Concepts

### Coordinate System

Right-handed Y-up. Camera looks toward -Z at default rotation.

```
     +Y (UP)
      |
      |
      |
      .---> +X (RIGHT)
     /
    /
  +Z (towards viewer)
```

See `docs/coordinate-system.md` for full details including forward vector formula and pitch clamping.

### Quaternion Camera

The camera uses gl-matrix `quat`/`vec3`/`mat4` for rotation. Quaternion rotation eliminates gimbal lock that occurs with Euler angles at extreme pitch.

Key methods in `Camera.ts`:
- `handleMouseMove(deltaX, deltaY)` — applies yaw/pitch rotation via quaternion multiplication
- `handleKeyEvent(key, pressed)` — tracks WASD/QE key state
- `update()` — applies movement in camera-local coordinates
- `getShaderUniforms(aspect)` — returns pre-computed view and MVP matrices
- `worldToScreen(worldPos, width, height)` — projects 3D point to screen coordinates

### Shader Pipeline

Shaders are embedded as template literal strings in `ShaderManager.ts` (not separate `.glsl` files).

The vertex shader:
- Receives per-vertex position (`a_position`) and cluster ID (`a_clusterId`)
- Receives uniforms: MVP matrix, camera position, highlighted cluster, cursor position, thresholds
- Computes `gl_Position` and `gl_PointSize`
- Passes color and hover state to fragment shader

The fragment shader:
- Creates circular points using `gl_PointCoord`
- Applies cluster-based coloring with highlight dimming
- Adds hover highlight ring for the nearest point

### Point Data Structure

```typescript
interface PointData {
  positions: Float32Array    // Interleaved [x,y,z, x,y,z, ...]
  clusterIds: Float32Array   // One per point [id, id, id, ...]
  tagIndices?: Float32Array  // Index into tagLookup Map
  imageIndices?: Float32Array // Index into imageLookup Map
  tagLookup?: Map<string, number>    // tag string -> index
  imageLookup?: Map<string, number>  // image string -> index
}
```

### Cluster Highlighting

- `-2` = None (all visible)
- `-1` = Noise
- `>= 0` = Specific cluster ID

The `u_hilighted_cluster` uniform is updated every frame. Non-highlighted clusters render with reduced opacity.

## Performance Considerations

- **Single draw call**: All points in one `gl.drawArrays(gl.POINTS)` call
- **Static buffers**: Data uploaded once via `gl.STATIC_DRAW`, reused every frame
- **GPU matrices**: View/MVP computed on GPU, not CPU
- **Additive blending**: `gl.blendFunc(gl.SRC_ALPHA, gl.ONE)` with depth test on, depth writes off
- **No overdraw management**: Points are small enough that additive blending handles overlap

## Debugging Tips

- **FPS counter**: Displayed in the DebugInfo overlay (top-left)
- **Camera debug**: Position, rotation, thresholds shown in DebugInfo
- **Hover debug**: Cursor position, hovered point index, distances shown in DebugInfo
- **Console logs**: Camera state, hovered point details, WebGL errors logged to console
- **WebGL Inspector**: Browser extensions (Spector.js) can capture draw calls and inspect GPU state
- **Shader errors**: Compilation failures are thrown as exceptions with the shader info log

## Planning Docs

The `.planning/` directory contains internal project history:
- `.planning/PROJECT.md` — Current project state and milestone goals
- `.planning/ROADMAP.md` — Phase history and progress
- `.planning/codebase/ARCHITECTURE.md` — Detailed architecture analysis
- `.planning/codebase/CONVENTIONS.md` — Coding conventions analysis
- `docs/coordinate-system.md` — Coordinate system reference
