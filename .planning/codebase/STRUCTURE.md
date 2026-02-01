# Codebase Structure

**Analysis Date:** 2026-02-01

## Directory Layout

```
webgl-clusters-playground/
├── index.html                    # HTML entry point with #app mount point
├── package.json                  # Dependencies and npm scripts
├── vite.config.ts                # Vite build configuration
├── tsconfig.json                 # TypeScript compiler configuration
├── tsconfig.node.json            # TypeScript config for Node scripts
├── .gitignore                    # Git ignore patterns
├── .yarnrc.yml                   # Yarn package manager configuration
├── yarn.lock                     # Yarn dependency lockfile
├── README.md                     # Project documentation
├── .planning/                    # Planning directory (generated docs)
│   └── codebase/                 # Codebase analysis documents
├── node_modules/                 # npm/yarn dependencies (not committed)
├── src/                          # Application source code
│   ├── main.ts                   # Vue app initialization
│   ├── App.vue                   # Root Vue component
│   ├── env.d.ts                  # TypeScript declarations for imports
│   ├── views/                    # Page-level components
│   │   └── WebGLPlayground.vue   # Main 3D playground view
│   ├── components/               # Reusable Vue components
│   │   ├── WebGLCanvas.vue       # WebGL canvas with context management
│   │   ├── ControlsOverlay.vue   # UI controls help overlay
│   │   └── DebugInfo.vue         # Debug information display
│   ├── core/                     # Core WebGL and math utilities
│   │   ├── Camera.ts             # 3D camera with WASD/mouse controls
│   │   ├── ShaderManager.ts      # Shader compilation and management
│   │   ├── DataProvider.ts       # Point cluster data generation
│   │   └── Math.ts               # Vec3 vector math utilities
│   ├── composables/              # Vue composition API state
│   │   └── settings.ts           # Shared settings (highlightedCluster, ppc)
│   └── public/                   # Static assets
│       └── style.css             # Global application styles
```

## Directory Purposes

**project-root:**
- Purpose: Configuration files and package management
- Contains: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `README.md`
- Key files: `package.json` (dependencies), `index.html` (HTML entry point), `vite.config.ts` (build config)

**src/:**
- Purpose: Application source code
- Contains: TypeScript/Vue source files
- Key files: `main.ts` (Vue app bootstrap), `App.vue` (root component)

**src/views/:**
- Purpose: Page-level Vue components (route-level views)
- Contains: `WebGLPlayground.vue`
- Key files: `WebGLPlayground.vue` (main application view orchestrating WebGL rendering)

**src/components/:**
- Purpose: Reusable Vue components
- Contains: `WebGLCanvas.vue`, `ControlsOverlay.vue`, `DebugInfo.vue`
- Key files: `WebGLCanvas.vue` (WebGL context initialization, event handling)

**src/core/:**
- Purpose: Core WebGL and 3D math utilities (framework-independent)
- Contains: `Camera.ts`, `ShaderManager.ts`, `DataProvider.ts`, `Math.ts`
- Key files: `Camera.ts` (camera control), `ShaderManager.ts` (shader management)

**src/composables/:**
- Purpose: Vue Composition API shared state
- Contains: `settings.ts`
- Key files: `settings.ts` (highlightedCluster, ppc reactive refs)

**src/public/:**
- Purpose: Static assets served directly
- Contains: `style.css`
- Key files: `style.css` (global styles)

**.planning/codebase/:**
- Purpose: Generated codebase analysis documents
- Contains: ARCHITECTURE.md, STRUCTURE.md, etc.
- Key files: Generated analysis documents for GSD planning

**node_modules/:**
- Purpose: Installed npm/yarn dependencies
- Contains: Third-party packages
- Committed: No (gitignored)

## Key File Locations

**Entry Points:**
- `index.html`: HTML structure with `<div id="app">` and script tag loading `main.ts`
- `src/main.ts`: Vue app creation with `createApp(App)` and `app.mount('#app')`
- `src/App.vue`: Root component that renders `WebGLPlayground` view

**Configuration:**
- `package.json`: Dependencies (vue, vite, typescript) and scripts (dev, build, preview)
- `vite.config.ts`: Vite config with Vue plugin, path alias `@` → `src`, dev server on port 3000
- `tsconfig.json`: TypeScript config with strict mode, `@/*` path alias, ES2020 target
- `src/env.d.ts`: Type declarations for `.vue`, `.glsl`, `.vert`, `.frag` imports

**Core Logic:**
- `src/core/Camera.ts`: 3D camera class with position, rotation, movement controls, shader uniforms
- `src/core/ShaderManager.ts`: Shader compilation, caching, WebGL state configuration methods
- `src/core/DataProvider.ts`: Point cluster data generation with `getPointData()` static method
- `src/core/Math.ts`: `Vec3` class for 3D vector math (add, subtract, cross, dot, normalize)

**UI Components:**
- `src/views/WebGLPlayground.vue`: Main orchestration view, manages render loop, camera, shaders, buffers
- `src/components/WebGLCanvas.vue`: Canvas element with WebGL context, mouse/keyboard event handling
- `src/components/ControlsOverlay.vue`: UI controls for camera help and settings (cluster highlight, points per cluster)
- `src/components/DebugInfo.vue`: Debug display for FPS, point count, camera position/rotation

**State Management:**
- `src/composables/settings.ts`: Exports `highlightedCluster` ref (-1 for none) and `ppc` ref (default 10000)

**Testing:**
- Not present (no test files or test configuration)

## Naming Conventions

**Files:**
- PascalCase for Vue components: `WebGLCanvas.vue`, `ControlsOverlay.vue`, `DebugInfo.vue`
- PascalCase for TypeScript classes: `Camera.ts`, `ShaderManager.ts`, `DataProvider.ts`
- PascalCase for utility files: `Math.ts`
- kebab-case for config: `vite.config.ts`, `tsconfig.json`
- lowercase for global CSS: `style.css`
- lowercase for composables directory (but PascalCase for exports where class-like): `settings.ts`

**Directories:**
- lowercase: `components/`, `views/`, `core/`, `composables/`, `public/`
- Mixed case: `.planning/`, `node_modules/`

**Classes:**
- PascalCase: `Camera`, `ShaderManager`, `DataProvider`, `Vec3`

**Functions/Methods:**
- camelCase: `getPointData()`, `createShaderProgram()`, `handleKeyEvent()`, `update()`

**Variables:**
- camelCase for local variables: `const positionBuffer = ...`, `let fpsCounter = 0`
- camelCase for class properties: `public position: Vec3`, `public rotation: { x, y }`
- camelCase for reactive refs: `const highlightedCluster = ref(-1)`

**Constants:**
- camelCase (or UPPER_SNAKE_CASE for WebGL constants): `gl.DEPTH_TEST`, `gl.BLEND`, `gl.SRC_ALPHA`

**Interfaces/Types:**
- PascalCase: `PointData`, `ShaderSource`, `CompiledShader`, `CameraControls`, `Vec3` (class)
- camelCase for interface properties: `positions: Float32Array`, `count: number`

## Where to Add New Code

**New Feature:**
- Primary code: `src/views/WebGLPlayground.vue` (if view-level feature) or create new view in `src/views/`
- Tests: `tests/` directory (not currently present, would need to create)

**New Component/Module:**
- Implementation: `src/components/[ComponentName].vue` (for reusable UI components)
- Core logic: `src/core/[ClassName].ts` (for WebGL/math utilities)
- Shared state: `src/composables/[name].ts` (for reactive state used across components)

**Utilities:**
- Shared helpers: `src/core/[UtilityName].ts` (for framework-independent utilities)
- Vue-specific helpers: New composables in `src/composables/[name].ts`

**New Shaders:**
- Implementation: Add methods to `src/core/ShaderManager.ts` (e.g., `getNewShaderPattern()`)
- External files: Place in `src/public/shaders/` (would need to create, then use `loadShaderFromFile()`)

**New Data Sources:**
- Implementation: Add static methods to `src/core/DataProvider.ts` (e.g., `loadFromAPI()`, `generatePattern()`)
- External files: Place in `src/public/data/` (would need to create)

## Special Directories

**.planning/:**
- Purpose: Planning and analysis documents for GSD workflow
- Generated: Yes (by GSD commands)
- Committed: Yes

**node_modules/:**
- Purpose: Installed npm/yarn dependencies
- Generated: Yes (by `yarn install` or `npm install`)
- Committed: No (in .gitignore)

**src/public/:**
- Purpose: Static assets served directly by Vite dev server
- Generated: No (manual editing)
- Committed: Yes
- Contains: CSS, images, fonts, shader files (if external)

**src/env.d.ts:**
- Purpose: TypeScript declarations for module imports (.vue, .glsl, .vert, .frag)
- Generated: No (manual editing)
- Committed: Yes

---

*Structure analysis: 2026-02-01*
