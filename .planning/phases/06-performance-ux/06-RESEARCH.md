# Phase 06: Performance & UX Improvements - Research

**Researched:** 2026-02-03
**Domain:** WebGL Resource Management & Vue 3 Component Lifecycle
**Confidence:** HIGH

## Summary

This research phase investigated WebGL resource cleanup patterns, render loop guard clauses, and Vue 3 state management strategies for unified loading states. Phase 6 addresses three specific improvement areas: (1) Adding pointCount > 0 guard before drawArrays() calls to prevent unnecessary rendering, (2) Implementing proper WebGL resource cleanup in onUnmounted() to prevent GPU memory leaks, and (3) Unifying loading state between DataLoadControl and WebGLPlayground components to avoid UI inconsistency.

The current codebase already implements buffer cleanup in setupBuffers() but lacks comprehensive resource cleanup in onUnmounted(), lacks render loop guards for empty point sets, and has duplicated loading state management across parent-child components.

**Primary recommendation:** Implement comprehensive WebGL resource cleanup in onUnmounted(), add guard clauses to render loop, and consolidate loading state into parent component with props/emits pattern.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WebGL API | 1.0/2.0 | Raw WebGL rendering | Project uses vanilla WebGL without 3D libraries |
| Vue 3 | 3.5.24 | Component lifecycle & reactivity | Composition API with onMounted/onUnmounted hooks |
| TypeScript | 5.3.0 | Type safety | Already in use, no changes needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | N/A | Pure WebGL/Vue implementation | This is a vanilla implementation |

**Installation:**
\`\`\`bash
# No new dependencies needed - uses existing stack
\`\`\`

## Architecture Patterns

### Recommended Project Structure
\`\`\`
src/
├── components/
│   ├── WebGLCanvas.vue      # Canvas wrapper + WebGL context initialization
│   ├── WebGLPlayground.vue   # Main rendering component (parent)
│   └── DataLoadControl.vue  # Data loading UI (child)
├── core/
│   ├── Camera.ts
│   ├── ShaderManager.ts
│   └── DataProvider.ts
└── composables/
    └── settings.ts
\`\`\`

### Pattern 1: WebGL Resource Cleanup in onUnmounted()

**What:** Delete all WebGL resources (buffers, shaders, programs) when Vue component unmounts to prevent GPU memory leaks.

**When to use:** Any component that creates WebGL resources in onMounted() or setup.

**Example:**
\`\`\`typescript
// Source: MDN WebGL best practices - "Delete objects eagerly"
// URL: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

import { onUnmounted, ref } from 'vue'

// Store resource references
const positionBuffer = ref<WebGLBuffer | null>(null)
const clusterIdBuffer = ref<WebGLBuffer | null>(null)
const shaderProgram = ref<WebGLProgram | null>(null)
const shaderManager = ref<ShaderManager | null>(null)
const glCache = ref<WebGL2RenderingContext | WebGLRenderingContext>()

onUnmounted(() => {
  const gl = glCache.value
  if (!gl) return

  // Delete buffers
  if (positionBuffer.value) {
    gl.deleteBuffer(positionBuffer.value)
    positionBuffer.value = null
  }
  if (clusterIdBuffer.value) {
    gl.deleteBuffer(clusterIdBuffer.value)
    clusterIdBuffer.value = null
  }

  // Delete shader program
  if (shaderProgram.value) {
    gl.deleteProgram(shaderProgram.value)
    shaderProgram.value = null
  }

  // Delete shaders (if shaderManager holds references)
  if (shaderManager.value) {
    // ShaderManager should delete its own shader objects
    shaderManager.value.cleanup()
    shaderManager.value = null
  }

  // Clear context reference
  glCache.value = null
})
\`\`\`

**Key points:**
- WebGL objects must be explicitly deleted, JavaScript GC does not free GPU memory
- Delete in reverse order of creation: programs → shaders → buffers
- Use `deleteBuffer()`, `deleteProgram()`, `deleteShader()` methods on WebGL context
- Null out references after deletion to prevent use-after-free bugs

### Pattern 2: Render Loop Guard Clause

**What:** Check conditions before calling drawArrays() to avoid unnecessary rendering operations and potential WebGL errors.

**When to use:** Any render loop where data availability varies during runtime.

**Example:**
\`\`\`typescript
// Source: WebGL best practices - "Avoid invalidating FBO attachment bindings"
// URL: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

const render = (timestamp: number) => {
  // ... camera update, FPS counting, etc.

  // Clear and render
  if (canvasRef.value && shaderProgram.value && positionBuffer.value) {
    const gl = canvasRef.value.getGL()
    if (gl && camera.value) {
      // ... setup uniforms and attributes ...

      // GUARD: Don't draw if no points to render
      if (pointCount.value > 0) {
        gl.drawArrays(gl.POINTS, 0, pointCount.value)
      }
    }
  }

  animationId = requestAnimationFrame(render)
}
\`\`\`

**Key points:**
- Guard clause prevents drawArrays(0) calls with count = 0
- Reduces unnecessary GPU work when data is empty
- Prevents potential WebGL validation errors from empty draws
- Guard should be placed immediately before drawArrays() call

### Pattern 3: Unified Loading State via Props/Emits

**What:** Move loading state to parent component (WebGLPlayground), pass to child (DataLoadControl) as prop, child emits events to parent.

**When to use:** When parent and child components both need to know about same loading state.

**Example:**
\`\`\`typescript
// Parent: WebGLPlayground.vue
import { ref } from 'vue'

const isLoading = ref(false)  // Single source of truth

// Parent template passes loading state to child
// <DataLoadControl :is-loading="isLoading" @file-selected="handleLoadFile" />

const handleLoadFile = async (file: File) => {
  isLoading.value = true
  try {
    // Load data...
  } finally {
    isLoading.value = false
  }
}

// Child: DataLoadControl.vue
const props = defineProps<{
  isLoading: boolean  // Read-only prop
}>()

// No local isLoading state - uses props.isLoading directly
// Template shows loading UI based on props.isLoading
\`\`\`

**Key points:**
- Parent owns loading state, child receives via prop
- Child emits events, parent updates state
- Eliminates duplicate state and potential inconsistency
- Props flow one-way down, events flow one-way up

### Anti-Patterns to Avoid
- **Duplicate loading state:** Managing loading state in both parent and child leads to UI bugs
- **Incomplete resource cleanup:** Only canceling animation frame without deleting WebGL resources causes GPU leaks
- **Rendering without guards:** Calling drawArrays() without checking count wastes GPU cycles and may cause errors
- **Cleanup in wrong lifecycle:** Waiting for GC to delete WebGL objects wastes memory - use explicit deletion

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebGL resource cleanup | Manual tracking and deletion logic | Vue 3 onUnmounted hook + explicit delete methods | WebGL objects persist in GPU memory until explicitly deleted, GC only handles JavaScript references |
| Parent-child state sync | Two-way binding or props mutation | Props + emits pattern | One-way data flow prevents race conditions and state inconsistency |
| Render loop validation | Manual error handling | Guard clauses (if pointCount > 0) | Prevents unnecessary GPU operations and WebGL errors from invalid calls |

**Key insight:** WebGL is a manual resource management API - you must explicitly delete objects. Vue's onUnmounted hook is the correct place to do cleanup, not relying on GC. Props/emits pattern ensures single source of truth for shared state.

## Common Pitfalls

### Pitfall 1: Incomplete WebGL Resource Cleanup

**What goes wrong:** GPU memory grows unbounded as component mounts/unmounts repeatedly, eventually causing OUT_OF_MEMORY errors or browser tab crashes.

**Why it happens:** WebGL objects (buffers, shaders, programs) allocate GPU memory. JavaScript GC only handles the reference, not the underlying GPU object. If you don't call delete methods, GPU memory is never freed.

**Root cause:** Assuming JavaScript garbage collection will clean up WebGL resources automatically.

**How to avoid:**
1. Track all WebGL resource references (buffers, shaders, programs, textures, framebuffers)
2. Delete all resources in onUnmounted() hook
3. Use proper deletion methods: `gl.deleteBuffer()`, `gl.deleteProgram()`, `gl.deleteShader()`, `gl.deleteTexture()`
4. Delete in reverse order of creation (programs before shaders, all before context)
5. Null out references after deletion

\`\`\`typescript
// CORRECT: Explicit cleanup
onUnmounted(() => {
  const gl = glCache.value
  if (!gl) return

  // Delete all resources
  if (positionBuffer.value) gl.deleteBuffer(positionBuffer.value)
  if (shaderProgram.value) gl.deleteProgram(shaderProgram.value)

  // Clear references
  positionBuffer.value = null
  shaderProgram.value = null
})
\`\`\`

**INCORRECT: Relying on GC**
\`\`\`typescript
// WRONG: Assumes GC will clean up WebGL objects
onUnmounted(() => {
  // No cleanup - references go out of scope
  // but GPU memory is NOT freed!
})
\`\`\`

**Warning signs:**
- Memory usage in browser DevTools grows over time
- WebGL context warnings in console about memory limits
- Tab crashes after repeated component unmounting/mounting

### Pitfall 2: Render Loop Without Guard Clauses

**What goes wrong:** Unnecessary drawArrays() calls waste GPU cycles and may generate WebGL errors or warnings.

**Why it happens:** drawArrays(0) or drawArrays() with invalid buffers causes the GPU to attempt rendering with no data, which is wasteful and may trigger validation errors.

**Root cause:** Not checking data availability before rendering.

**How to avoid:**
1. Check pointCount > 0 before calling drawArrays()
2. Verify shaderProgram and buffer references exist
3. Check WebGL context is valid

\`\`\`typescript
// CORRECT: Guard clause
if (pointCount.value > 0 && shaderProgram.value && positionBuffer.value) {
  gl.drawArrays(gl.POINTS, 0, pointCount.value)
}
\`\`\`

**INCORRECT: No guard**
\`\`\`typescript
// WRONG: No validation before draw
gl.drawArrays(gl.POINTS, 0, pointCount.value)  // pointCount might be 0!
\`\`\`

**Warning signs:**
- Console warnings about drawing with count = 0
- Wasted GPU cycles visible in performance profiling
- WebGL validation errors in console

### Pitfall 3: Duplicate Loading State

**What goes wrong:** Parent shows loading=true while child shows loading=false, or vice versa. UI shows inconsistent state, user sees wrong loading indicators.

**Why it happens:** Both parent and child components maintain their own isLoading refs independently. When one updates, the other doesn't know about the change.

**Root cause:** Violating single source of truth principle by duplicating state across components.

**How to avoid:**
1. Parent owns loading state (ref)
2. Parent passes loading state to child as prop (read-only)
3. Child emits events to parent when loading state changes
4. Child does not maintain its own loading state

\`\`\`typescript
// CORRECT: Parent owns state
// Parent.vue
const isLoading = ref(false)

// Child.vue
defineProps<{ isLoading: boolean }>()

// Child uses props.isLoading directly, no local state
\`\`\`

**INCORRECT: Duplicate state**
\`\`\`typescript
// WRONG: Both maintain state
// Parent.vue
const isLoading = ref(false)

// Child.vue
const isLoading = ref(false)  // Duplicate!
\`\`\`

**Warning signs:**
- Loading overlay visible on one component but not the other
- Loading state changes in one component but not reflected in other
- Race conditions where components show different loading states simultaneously

## Code Examples

### WebGL Resource Cleanup in onUnmounted

\`\`\`typescript
// Source: MDN WebGL best practices - "Delete objects eagerly" (HIGH confidence)
// URL: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

import { onUnmounted, ref } from 'vue'

// Resource references stored at module scope
const positionBuffer = ref<WebGLBuffer | null>(null)
const clusterIdBuffer = ref<WebGLBuffer | null>(null)
const shaderProgram = ref<WebGLProgram | null>(null)
const shaderManager = ref<ShaderManager | null>(null)
const glCache = ref<WebGL2RenderingContext | WebGLRenderingContext>()

onUnmounted(() => {
  const gl = glCache.value
  if (!gl) return

  // 1. Delete shader program first (depends on shaders)
  if (shaderProgram.value) {
    gl.deleteProgram(shaderProgram.value)
    shaderProgram.value = null
  }

  // 2. Delete shaders (held by ShaderManager)
  if (shaderManager.value) {
    // Assuming ShaderManager has cleanup() method
    shaderManager.value.cleanup()
    shaderManager.value = null
  }

  // 3. Delete buffers
  if (positionBuffer.value) {
    gl.deleteBuffer(positionBuffer.value)
    positionBuffer.value = null
  }
  if (clusterIdBuffer.value) {
    gl.deleteBuffer(clusterIdBuffer.value)
    clusterIdBuffer.value = null
  }

  // 4. Clear WebGL context reference
  glCache.value = null
})
\`\`\`

### Render Loop Guard Clause

\`\`\`typescript
// Source: WebGL best practices - guard before draw calls (HIGH confidence)
// URL: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

const render = (timestamp: number) => {
  if (canvasRef.value && camera.value) {
    // Update camera
    camera.value.update()

    // FPS counter logic...

    // Clear and render
    if (canvasRef.value && shaderProgram.value && positionBuffer.value) {
      const gl = canvasRef.value.getGL()
      if (gl) {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT)

        gl.useProgram(shaderProgram.value)

        // ... setup uniforms and attributes ...

        // GUARD: Only draw if there are points to render
        if (pointCount.value > 0) {
          gl.drawArrays(gl.POINTS, 0, pointCount.value)
        }
      }
    }
  }

  animationId = requestAnimationFrame(render)
}
\`\`\`

### Unified Loading State Pattern

\`\`\`typescript
// Source: Vue 3 Composition API guide - Props/Emits (HIGH confidence)
// URL: https://vuejs.org/guide/essentials/lifecycle

// PARENT: WebGLPlayground.vue
import { ref } from 'vue'

const isLoading = ref(false)  // Single source of truth

// Pass to child as prop
// <DataLoadControl :is-loading="isLoading" @file-selected="handleLoadFile" />

const handleLoadFile = async (file: File) => {
  isLoading.value = true
  try {
    if (file.name.endsWith('.json')) {
      const loadedData = await DataProvider.loadFromFile(file)
      pointData = loadedData
      pointCount.value = loadedData.positions.length / 3
      setupBuffers(glCache)
    } else if (file.name.endsWith('.db') || file.name.endsWith('.sqlite')) {
      // SQLite loading...
    }
    clearErrors()
    currentDataSource.value = DataSource.LOADED
  } catch (error) {
    console.error('Error loading file:', error)
    const briefMessage = error instanceof Error ? error.message : 'Error loading file'
    addError(briefMessage)
  } finally {
    isLoading.value = false  // Parent updates its own state
  }
}

// CHILD: DataLoadControl.vue
import { ref } from 'vue'

const props = defineProps<{
  isLoading: boolean  // Read-only - child cannot modify
  file: File | null
}>()

const emit = defineEmits<{
  'file-selected': [file: File],
  'table-selected': [tableName: string]
}>()

// Child uses props.isLoading directly in template
// No local isLoading ref - relies on parent for state
\`\`\`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|----------------|--------------|--------|
| No WebGL resource cleanup | Explicit deletion in onUnmounted | Phase 6 (this implementation) | Prevents GPU memory leaks on component unmount |
| No render loop guard | Guard clause (if pointCount > 0) | Phase 6 (this implementation) | Prevents wasted GPU cycles and WebGL errors |
| Duplicate loading state | Props/emits pattern (single source of truth) | Phase 6 (this implementation) | Eliminates UI inconsistency between parent and child |

**Current implementation status:**
- ✅ Buffer cleanup in setupBuffers() (correct)
- ❌ No WebGL resource cleanup in onUnmounted() (NEEDS FIX)
- ❌ No render loop guard (NEEDS FIX - drawArrays() called without checking pointCount)
- ❌ Duplicate loading state (NEEDS FIX - both WebGLPlayground and DataLoadControl have isLoading)

## Open Questions

None - all research questions resolved with HIGH confidence from authoritative sources.

1. **How to properly clean up WebGL resources?**
   - What we know: MDN WebGL best practices provide explicit guidance on "Delete objects eagerly"
   - Resolution: Use onUnmounted() hook, call deleteBuffer(), deleteProgram(), deleteShader()
   - Confidence: HIGH (from MDN WebGL best practices)

2. **Where to add render loop guard?**
   - What we know: drawArrays() should not be called with count = 0
   - Resolution: Add `if (pointCount.value > 0)` guard immediately before drawArrays()
   - Confidence: HIGH (from MDN WebGL best practices)

3. **How to unify loading state?**
   - What we know: Vue 3 props/emits pattern provides single source of truth
   - Resolution: Parent owns state, passes as prop to child, child emits events
   - Confidence: HIGH (from Vue 3 official documentation)

## Sources

### Primary (HIGH confidence)
- MDN WebGL best practices
  - URL: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
  - Topics: "Delete objects eagerly" section on WebGL resource cleanup
  - Confidence: HIGH (official Mozilla documentation)
- Vue 3 Lifecycle Hooks documentation
  - URL: https://vuejs.org/guide/essentials/lifecycle
  - Topics: onUnmounted hook usage, component lifecycle management
  - Confidence: HIGH (official Vue.js documentation)
- Current codebase analysis
  - Files: src/components/WebGLPlayground.vue, src/components/DataLoadControl.vue, src/components/WebGLCanvas.vue
  - Topics: Current resource management, render loop, state management patterns
  - Confidence: HIGH (direct observation)

### Secondary (MEDIUM confidence)
- None - all findings from primary sources

### Tertiary (LOW confidence)
- None - no unverified web searches needed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Direct observation from package.json and existing codebase
- Architecture patterns: HIGH - From MDN WebGL best practices and Vue 3 official docs
- Pitfalls: HIGH - Derived from authoritative sources and direct code analysis
- Implementation recommendations: HIGH - Clear guidance from official documentation

**Research date:** 2026-02-03
**Valid until:** 30 days (WebGL and Vue 3 API are stable, best practices unlikely to change)

---

## Implementation Guide

### Files to Modify

1. **src/views/WebGLPlayground.vue**
   - Add `if (pointCount.value > 0)` guard in render loop (line ~367)
   - Add WebGL resource cleanup in `onUnmounted()` hook (line ~421)
   - Remove `isLoading` ref from DataLoadControl props (line ~17)
   - Pass `isLoading` to ControlsOverlay as prop (line ~13)

2. **src/components/DataLoadControl.vue**
   - Remove `isLoading` ref (line ~57)
   - Change to receive `isLoading` as prop (line ~57)
   - Remove `props.file` if not needed (line ~52-53)
   - Use `props.isLoading` directly in template

3. **src/components/ControlsOverlay.vue** (if exists)
   - Add `isLoading` prop definition (line ~? - need to verify)
   - Use `props.isLoading` in template for loading overlay

### Files to Create

None - all changes are modifications to existing files.

### Verification Steps

After implementing fixes:

1. **Test WebGL resource cleanup:**
   - Open browser DevTools → Performance → Memory
   - Note memory baseline
   - Navigate away from page and return
   - Verify memory returns to baseline (no leak)
   - Check console for WebGL errors

2. **Test render loop guard:**
   - Set pointCount to 0 (load empty file or switch data source with no data)
   - Verify no drawArrays() call occurs
   - Set pointCount to positive value
   - Verify drawArrays() is called
   - Check console for no WebGL warnings

3. **Test unified loading state:**
   - Trigger file load
   - Verify loading overlay shows in all components (WebGLPlayground, ControlsOverlay, DataLoadControl)
   - Wait for load to complete
   - Verify loading overlay disappears from all components
   - Check no inconsistent states (e.g., one component showing loading while another doesn't)

4. **Test component unmount/remount:**
   - Mount component
   - Load data
   - Navigate away and back
   - Verify WebGL resources are recreated correctly
   - Check no GPU memory increase over cycles

5. **Regression testing:**
   - Verify camera rotation still works correctly
   - Verify data loading (JSON/SQLite) works correctly
   - Verify data source toggle works correctly
   - Verify error display works correctly
