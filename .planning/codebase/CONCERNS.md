# Codebase Concerns

**Analysis Date:** 2026-02-01

## Tech Debt

**Test Coverage Missing:**
- Issue: No test files exist in the codebase (no *.test.* or *.spec.* files found)
- Files: `src/**/*.ts`, `src/**/*.vue`
- Impact: No automated testing makes refactoring risky and increases chance of regressions
- Fix approach: Set up test framework (Vitest or Jest), add unit tests for core classes (Camera, ShaderManager, DataProvider, Vec3), add component tests for Vue components

**Incomplete Data Provider:**
- Issue: Data generation logic is marked as a stub with TODO comment
- Files: `src/core/DataProvider.ts` (line 26)
- Impact: DataProvider is not production-ready for real-world data loading
- Fix approach: Implement proper data loading strategy (file-based, API-based, or procedural generation) based on use case

**Commented Out Code:**
- Issue: Multiple instances of commented code indicate incomplete features or dead code
- Files:
  - `src/views/WebGLPlayground.vue` (line 112): DEPTH_BUFFER_BIT in gl.clear()
  - `src/components/WebGLCanvas.vue` (line 62): DEPTH_TEST enable commented out
  - `src/components/WebGLCanvas.vue` (line 156): DEPTH_BUFFER_BIT commented in clear()
  - `src/components/ControlsOverlay.vue` (lines 38-41): nclusters slider commented out
- Impact: Unclear which features are intended vs abandoned, increases codebase confusion
- Fix approach: Remove dead code or complete and uncomment intended features; add feature flags for optional functionality

**Corrupted Documentation:**
- Issue: README.md contains duplicated and mashed content with formatting errors
- Files: `README.md` (lines 1-89 show repeated sections)
- Impact: Documentation is unusable for onboarding and understanding the project
- Fix approach: Clean up and restructure README.md with clear sections

## Known Bugs

**ResizeObserver Memory Leak:**
- Symptoms: ResizeObserver is created but never disconnected during component unmount
- Files: `src/components/WebGLCanvas.vue` (line 173, created; no disconnect in onUnmounted)
- Trigger: Navigate away from component or remount component multiple times
- Workaround: None known
- Fix approach: Store ResizeObserver instance reference and call disconnect() in onUnmounted hook

**Silent Shader Attribute Errors:**
- Symptoms: Cluster ID attribute location check silently ignored when returning -1
- Files: `src/views/WebGLPlayground.vue` (lines 139-144)
- Trigger: When shader doesn't define a_clusterId attribute
- Workaround: None; attribute may not be properly bound
- Fix approach: Add proper error handling or validation when attribute location is -1

## Security Considerations

**No Content Security Policy:**
- Risk: No CSP headers or meta tags defined
- Files: `index.html`
- Current mitigation: None
- Recommendations: Add CSP meta tag to restrict inline scripts and external resource loading

**No Input Validation:**
- Risk: User inputs from sliders and controls are not validated
- Files: `src/components/ControlsOverlay.vue` (ppcMagnitude, ppcSlider ranges)
- Current mitigation: Limited to min/max HTML attributes
- Recommendations: Add validation logic to prevent extreme values (e.g., points per cluster could cause performance issues)

**WebGL Error Information Exposure:**
- Risk: Detailed WebGL errors logged to console could expose implementation details
- Files: `src/core/ShaderManager.ts` (lines 75, 109), `src/views/WebGLPlayground.vue` (lines 149, 157)
- Current mitigation: Errors only logged to console
- Recommendations: Consider sanitizing error messages in production builds

## Performance Bottlenecks

**Per-Frame WebGL Error Checking:**
- Problem: WebGL error checking occurs in every frame (before and after draw)
- Files: `src/views/WebGLPlayground.vue` (lines 147-158)
- Cause: getError() calls in render loop
- Improvement path: Remove error checking from render loop, only check in development mode or use debugging flag

**Console Logging in Production:**
- Problem: Multiple console.log statements execute in production code
- Files:
  - `src/main.ts` (lines 5, 8, 11): Vue app initialization logs
  - `src/App.vue` (line 11): Mounted log
  - `src/views/WebGLPlayground.vue` (line 37): Setup log
  - `src/components/WebGLCanvas.vue` (lines 75-79, 169): WebGL initialization and mount logs
  - `src/core/ShaderManager.ts` (line 88-91): Shader compilation success logs
- Cause: Debug statements not removed/minimized for production
- Improvement path: Use build-time removal or conditional logging based on environment

**Unoptimized Buffer Recreation:**
- Problem: Buffers are recreated when ppc changes without checking if WebGL context needs reinitialization
- Files: `src/views/WebGLPlayground.vue` (lines 65-69, regenPoints and setupBuffers)
- Cause: setupBuffers called on every regenPoints without proper cleanup
- Improvement path: Implement proper buffer disposal before recreation, or reuse existing buffers when size increases

## Fragile Areas

**Data Provider Implementation:**
- Files: `src/core/DataProvider.ts`
- Why fragile: Marked as stub with TODO, only contains simple procedural generation
- Safe modification: Keep interface stable, add new static methods for different data patterns
- Test coverage: No tests - adding data loading strategies could break existing code

**Shader Program Management:**
- Files: `src/views/WebGLPlayground.vue` (shaderProgram, shaderManager references)
- Why fragile: Global variables used for WebGL resources, manual cleanup required
- Safe modification: Ensure shaderManager.dispose() is called on unmount, validate program before use
- Test coverage: No tests for shader compilation errors or program linking failures

**Type Safety with `any`:**
- Files: `src/env.d.ts` (line 3)
- Why fragile: Vue component types use `any`, reducing type safety benefits of TypeScript
- Safe modification: Define proper component props interface or use generic type
- Test coverage: No tests to catch type mismatches

**Camera Movement Synchronization:**
- Files: `src/views/WebGLPlayground.vue` (lines 75-91, event handlers), `src/core/Camera.ts` (update method)
- Why fragile: Camera update called every frame but event handlers rely on pressed state tracking
- Safe modification: Use Vue's event system or composable to decouple camera logic
- Test coverage: No tests for camera state or movement logic

## Scaling Limits

**Point Generation Capacity:**
- Current capacity: Default 10,000 points per cluster (ppc.value = 10000)
- Limit: Unknown; performance degrades with higher values due to CPU-side data generation
- Scaling path: Offload data generation to Web Workers, implement progressive loading, or use GPU-based generation

**Shader Compilation Caching:**
- Current capacity: Map-based cache in ShaderManager
- Limit: Memory grows with number of unique shaders
- Scaling path: Implement LRU cache or add dispose method for unused shader programs

## Dependencies at Risk

**Vite Plugin Vue:**
- Risk: Using specific version `@vitejs/plugin-vue@^4.5.0` which may not be compatible with future Vite versions
- Impact: Build process may break when upgrading Vite
- Migration plan: Pin to specific version or test upgrades thoroughly; monitor for breaking changes

**Vue TypeScript Integration:**
- Risk: `vue-tsc@^1.8.22` for type checking
- Impact: Type errors may not be caught during development if version mismatches with Vue 3
- Migration plan: Ensure compatibility between vue-tsc, Vue, and TypeScript versions

## Missing Critical Features

**Environment Configuration:**
- Problem: No .env files or environment-specific configuration
- Blocks: Cannot differentiate between development and production settings (e.g., debug logging, error reporting)
- Fix approach: Add .env files, use Vite's import.meta.env, implement environment-aware logging

**Error Boundary:**
- Problem: No Vue error boundary component to catch and handle rendering errors
- Blocks: WebGL errors can crash the entire app without graceful degradation
- Fix approach: Create ErrorBoundary.vue component, wrap risky sections, show user-friendly error messages

**Performance Monitoring:**
- Problem: FPS counter only shows frame rate, no metrics on draw calls, buffer sizes, or memory usage
- Blocks: Cannot identify performance bottlenecks beyond basic frame rate
- Fix approach: Add WebGL-specific metrics (active textures, buffer sizes, shader switches), integrate with browser performance APIs

## Test Coverage Gaps

**Core Logic Untested:**
- What's not tested: All TypeScript core classes (Camera, ShaderManager, DataProvider, Vec3)
- Files: `src/core/Camera.ts`, `src/core/ShaderManager.ts`, `src/core/DataProvider.ts`, `src/core/Math.ts`
- Risk: Mathematical errors in camera movement, shader compilation failures, data generation bugs could go undetected
- Priority: High

**Vue Components Untested:**
- What's not tested: All Vue components and their interaction logic
- Files: `src/components/*.vue`, `src/views/*.vue`
- Risk: Component state management, event handling, and rendering could break without detection
- Priority: High

**WebGL Integration Untested:**
- What's not tested: WebGL context initialization, shader program creation, buffer binding, render loop
- Files: `src/components/WebGLCanvas.vue`, `src/views/WebGLPlayground.vue`
- Risk: Browser compatibility issues, WebGL context loss, or resource leaks could go unnoticed
- Priority: High

**Error Handling Untested:**
- What's not tested: Error paths in shader loading, data loading, WebGL context creation
- Files: `src/core/ShaderManager.ts` (catch blocks), `src/core/DataProvider.ts` (commented loadPointDataFromFile)
- Risk: Users may see cryptic errors or silent failures when something goes wrong
- Priority: Medium

---

*Concerns audit: 2026-02-01*
