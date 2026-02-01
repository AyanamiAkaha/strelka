# Architecture

**Analysis Date:** 2026-02-01

## Pattern Overview

**Overall:** Vue 3 + TypeScript Single Page Application with WebGL rendering

**Key Characteristics:**
- Component-based UI layer using Vue 3 Composition API
- Pure TypeScript core layer for WebGL and 3D math
- GPU-optimized shader architecture with matrix calculations on GPU
- Event-driven communication between UI and WebGL layers
- Reactive state management through Vue refs and composables

## Layers

**View Layer (Vue Components):**
- Purpose: User interface, interaction handling, and component orchestration
- Location: `src/views/`, `src/components/`
- Contains: WebGLPlayground view, WebGLCanvas component, ControlsOverlay, DebugInfo
- Depends on: Vue 3 framework, core layer classes (`@/core/*`)
- Used by: Browser rendering via Vue app mount

**Core Layer (WebGL & Math):**
- Purpose: 3D graphics rendering, camera control, shader management, data generation
- Location: `src/core/`
- Contains: Camera, ShaderManager, DataProvider, Math utilities
- Depends on: WebGL/WebGL2 APIs, no external dependencies
- Used by: View layer for WebGL rendering and 3D operations

**Composables Layer (State Management):**
- Purpose: Shared reactive state across components
- Location: `src/composables/`
- Contains: settings.ts (highlightedCluster, ppc)
- Depends on: Vue 3 Composition API
- Used by: Components requiring shared reactive state

**Entry Point Layer:**
- Purpose: Application bootstrap
- Location: `src/main.ts`, `index.html`
- Contains: Vue app creation, DOM mounting, CSS imports
- Depends on: Vue 3
- Used by: Browser as initial load point

## Data Flow

**Initialization Flow:**

1. Browser loads `index.html`
2. Script tag loads `/src/main.ts`
3. `createApp(App)` creates Vue application
4. `app.mount('#app')` mounts to DOM
5. `App.vue` renders `WebGLPlayground` view
6. `WebGLCanvas` component initializes WebGL context
7. WebGL context emits `webgl-ready` event
8. `WebGLPlayground` receives context, creates Camera, DataProvider, ShaderManager
9. Buffers created and shaders compiled
10. Render loop starts with `requestAnimationFrame`

**Interaction Flow:**

1. User input (mouse/keyboard) → `WebGLCanvas` component
2. `WebGLCanvas` emits events (`mouse-move`, `mouse-wheel`, `key-event`)
3. `WebGLPlayground` receives events → calls Camera methods
4. Camera updates position/rotation state
5. Render loop gets shader uniforms from Camera
6. WebGL draws points with new camera state
7. FPS counter and debug info update

**Settings Change Flow:**

1. User changes slider/radio in `ControlsOverlay`
2. Composable ref (e.g., `ppc.value`) updates
3. `watch()` callback triggers in `WebGLPlayground`
4. `DataProvider.getPointData()` generates new point data
5. `setupBuffers()` uploads new data to GPU
6. Next render frame displays updated data

**State Management:**
- Camera state: Instance properties of `Camera` class (position, rotation, distance, controls)
- WebGL state: Stored in WebGLCanvas component (gl context, buffers, shaders)
- Shared state: Vue refs in composables (highlightedCluster, ppc)
- Reactivity: Vue's reactivity system for UI updates, imperative calls for WebGL state

## Key Abstractions

**Camera:**
- Purpose: 3D camera with 6DOF movement (WASD + mouse look + zoom)
- Examples: `src/core/Camera.ts`
- Pattern: Stateful class with public properties and update methods
- Key methods: `handleKeyEvent()`, `handleMouseMove()`, `update()`, `getShaderUniforms()`

**ShaderManager:**
- Purpose: Shader compilation, caching, and WebGL state configuration
- Examples: `src/core/ShaderManager.ts`
- Pattern: Service class with instance state for GL context and shader cache
- Key methods: `createShaderProgram()`, `getGPUMatrixShaders()`, `setupAdditivePointRendering()`

**DataProvider:**
- Purpose: Point cluster data generation and loading interface
- Examples: `src/core/DataProvider.ts`
- Pattern: Static utility class for data generation
- Key methods: `getPointData()`, `generateSpiralClusters()` (example)

**Vec3:**
- Purpose: 3D vector mathematics for camera calculations
- Examples: `src/core/Math.ts`
- Pattern: Value object class with static utility methods
- Key methods: `add()`, `subtract()`, `multiply()`, `cross()`, `dot()`, `length()`, `normalize()`

**WebGL Context:**
- Purpose: Low-level WebGL rendering interface
- Examples: Managed by `WebGLCanvas` component
- Pattern: Browser API wrapper via canvas.getContext()

## Entry Points

**index.html:**
- Location: `index.html` (project root)
- Triggers: Browser page load
- Responsibilities: Defines DOM mount point (`#app`), loads `main.ts` module, page title

**main.ts:**
- Location: `src/main.ts`
- Triggers: Loaded by index.html script tag
- Responsibilities: Creates Vue app, mounts to #app, imports global styles

**App.vue:**
- Location: `src/App.vue`
- Triggers: Vue app render
- Responsibilities: Root component, renders WebGLPlayground view

**WebGLCanvas:**
- Location: `src/components/WebGLCanvas.vue`
- Triggers: Mount in WebGLPlayground template
- Responsibilities: Canvas element, WebGL context initialization, mouse/keyboard event handling, emits webgl-ready/webgl-error events

**WebGLPlayground:**
- Location: `src/views/WebGLPlayground.vue`
- Triggers: Rendered by App.vue
- Responsibilities: Main orchestration, creates Camera/ShaderManager/DataProvider, manages render loop, handles camera controls, coordinates settings

## Error Handling

**Strategy:** Event emission for async errors, exception throwing for immediate errors

**Patterns:**
- WebGL context errors: Emitted as `webgl-error` event from `WebGLCanvas`, caught and displayed by `WebGLPlayground` with overlay
- Shader compilation errors: Thrown from `ShaderManager.compileShader()`, caught in `createShaderProgram()`, re-thrown with context
- Shader linking errors: Thrown from `ShaderManager.createShaderProgram()` if program link fails
- Data loading errors: Thrown from `DataProvider.loadPointDataFromFile()` (example method)

**Error Display:**
- WebGL errors shown in `WebGLPlayground` via error overlay div with condition `v-if="error"`
- Console logs throughout for debugging (Camera, ShaderManager, WebGLCanvas, WebGLPlayground)

## Cross-Cutting Concerns

**Logging:** Console.log statements throughout for debugging, no structured logging framework

**Validation:**
- WebGL context validation in `WebGLCanvas.initWebGL()` (checks for drawArrays method)
- Shader compilation status checked via `gl.getShaderParameter()` in `ShaderManager`
- Program linking status checked via `gl.getProgramParameter()` in `ShaderManager`

**Authentication:** None (client-side only application)

**Performance:**
- GPU-based matrix calculations in vertex shader (no CPU matrix math)
- Additive blending for efficient point rendering
- Static buffer data uploaded once to GPU
- Single draw call per frame for all points
- Shader program caching in `ShaderManager`

**Type Safety:**
- Full TypeScript with strict mode enabled
- Interface definitions for major data structures (PointData, ShaderSource, CompiledShader)
- Vue props typed with TypeScript interfaces

---

*Architecture analysis: 2026-02-01*
