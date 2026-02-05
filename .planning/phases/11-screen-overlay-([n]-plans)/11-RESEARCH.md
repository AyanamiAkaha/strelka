# Phase 11: Screen Overlay - Research

**Researched:** 2026-02-05
**Domain:** Vue 3 + WebGL + CSS overlay positioning
**Confidence:** HIGH

## Summary

Phase 11 requires implementing a Vue 3 overlay component that displays point metadata (tag, image) at screen position when hovering over points detected by Phase 10. The overlay must position near the hovered point without covering it, update in real-time during camera movement, and handle cases where points have no metadata.

Research identified that Vue 3's reactive system is ideal for this overlay use case, with `v-if` for conditional rendering and reactive refs for positioning. CSS `position: absolute` combined with `pointer-events: none` provides proper overlay behavior. World-to-screen coordinate conversion requires WebGL MVP matrix transformation, which can be computed using the existing gl-matrix library already in the project.

Key architectural pattern: The overlay should be a sibling component to WebGLCanvas, positioned relative to the canvas container, with screen coordinates computed from 3D world positions using the camera's transformation matrices.

**Primary recommendation:** Use Vue 3 reactive refs with computed properties for positioning, `v-if` for conditional rendering, and CSS absolute positioning with pointer-events-none for non-interfering overlay behavior.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| Vue 3 | 3.3.8 | UI framework, reactive components | Declarative rendering, Composition API, built-in reactivity |
| gl-matrix | 3.4.4 | Matrix math for coordinate transformation | Already in project, handles world-to-screen projection |
| TypeScript | 5.3.0 | Type safety | Provides type safety for overlay props and state |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | - | All functionality available via Vue 3 + browser APIs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| v-show | v-if | v-show keeps element in DOM (better for frequent toggles), but v-if removes entirely (better for overlay that should disappear completely) |

**Installation:**
No new packages required - all dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── PointOverlay.vue       # NEW: Screen-space overlay for point metadata
│   ├── WebGLCanvas.vue        # Existing: WebGL rendering canvas
│   ├── ControlsOverlay.vue     # Existing: UI controls
│   └── DebugInfo.vue          # Existing: Debug display
├── composables/
│   ├── useOverlayPosition.ts  # NEW: Composable for overlay positioning logic
│   └── settings.ts            # Existing: Shared reactive state
├── core/
│   ├── Camera.ts              # Existing: Camera with MVP matrix computation
│   ├── DataProvider.ts         # Existing: Point data with tag/image metadata
│   └── Math.ts                # Existing: gl-matrix utilities
└── views/
    └── WebGLPlayground.vue   # Existing: Main orchestration view
```

### Pattern 1: Vue 3 Reactive Overlay Positioning
**What:** Use reactive refs for overlay position and visibility, computed properties for coordinate transformation
**When to use:** Dynamic UI elements that need to update in response to WebGL state changes
**Example:**
```typescript
// In useOverlayPosition.ts composable
import { ref, computed } from 'vue'
import { vec3, mat4 } from '@/core/Math'

export function useOverlayPosition(camera: Camera, hoveredPointIndex: Ref<number>) {
  const overlayVisible = ref(false)
  const overlayPosition = ref({ x: 0, y: 0 })
  const overlayData = ref<{ tag?: string, image?: string } | null>(null)
  
  // Convert world to screen coordinates using MVP matrix
  const screenPosition = computed(() => {
    if (hoveredPointIndex.value < 0 || !pointData) return { x: 0, y: 0 }
    
    // Get world position of hovered point
    const worldPos = getPointWorldPosition(hoveredPointIndex.value)
    
    // Transform using MVP matrix
    const mvp = camera.getShaderUniforms(canvasWidth / canvasHeight).u_mvpMatrix
    const clipPos = vec4.create()
    vec4.transformMat4(clipPos, vec4.fromValues(worldPos.x, worldPos.y, worldPos.z, 1), mvp)
    
    // Convert clip space to screen space
    const screenX = (clipPos[0] / clipPos[3] + 1) * (canvasWidth / 2)
    const screenY = (-clipPos[1] / clipPos[3] + 1) * (canvasHeight / 2)
    
    return { x: screenX, y: screenY }
  })
  
  return { overlayVisible, overlayPosition, overlayData, screenPosition }
}

// Source: https://vuejs.org/guide/essentials/reactivity-fundamentals.html
```

### Pattern 2: CSS Absolute Positioning with Non-Interference
**What:** Use `position: absolute` with `pointer-events: none` for overlay that doesn't block WebGL events
**When to use:** Overlays on top of interactive canvases that need mouse event passthrough
**Example:**
```vue
<style scoped>
.overlay-container {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;  /* Let events pass through to WebGL canvas */
  z-index: 50;  /* Above canvas but below other UI */
}

.overlay-content {
  position: absolute;
  top: 0;
  left: 0;
  transform: translate(-50%, -100%);  /* Center horizontally, position above */
  pointer-events: auto;  /* Enable interactions on overlay content itself */
  white-space: nowrap;
}
</style>

<!-- Source: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position -->
<!-- Source: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/pointer-events -->
```

### Anti-Patterns to Avoid
- **Using v-show for overlay**: Keeps element in DOM constantly, might interfere with raycasting. Use v-if for complete removal.
- **Manual DOM manipulation**: Don't use `element.style.left = ...`. Use Vue reactive refs and computed properties instead.
- **Calculating position in render loop**: Don't recompute screen coordinates every frame if camera hasn't moved. Use Vue's reactivity to track changes.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| World-to-screen coordinate transformation | Manual projection math with NDC conversion | gl-matrix mat4.transformMat4() | Edge cases (near/far clipping, viewport edges), matrix multiplication order complexity |
| Overlay state management | Custom event bus between WebGL and Vue | Vue 3 reactive refs with composables | Vue's reactivity system already handles dependencies and updates efficiently |
| Conditional rendering | Manual DOM creation/removal | v-if directive | Vue handles proper lifecycle hooks and cleanup automatically |
| Layout for tag/image | Manual flexbox calculations | CSS flexbox with object-fit | Browser handles aspect ratios, spacing, and alignment automatically |

**Key insight:** Vue 3's reactivity system combined with CSS positioning provides a complete solution without needing custom state management or coordinate transformation libraries beyond gl-matrix (already in project).

## Common Pitfalls

### Pitfall 1: Overlay Blocks WebGL Canvas Events
**What goes wrong:** User hovers over overlay and mouse events don't reach WebGL canvas, breaking hover detection
**Why it happens:** Overlay element with `position: absolute` covers canvas and receives pointer events by default
**How to avoid:** Set `pointer-events: none` on overlay container, `pointer-events: auto` only on overlay content
**Warning signs:** Hover detection stops working when overlay appears, canvas rotation stops

### Pitfall 2: Screen Coordinates Out of Viewport
**What goes wrong:** Overlay renders outside visible area when point is near edge of screen
**Why it happens:** World-to-screen projection produces coordinates outside [0, canvasWidth] range
**How to avoid:** Clamp coordinates to viewport bounds (optional per CONTEXT.md), or flip position to bottom when too close to top
**Warning signs:** Overlay partially or completely invisible, scrollbar appears unexpectedly

### Pitfall 3: Overlay Position Lags Behind Camera
**What goes wrong:** Overlay moves to old position when camera moves rapidly
**Why it happens:** Position updated on mouse event but not on camera movement in render loop
**How to avoid:** Use computed property that depends on camera state (position, rotation), or update position in watchEffect that tracks camera changes
**Warning signs:** Overlay "floats" away from point when rotating/panning camera

### Pitfall 4: Overlay Shows for Points Without Data
**What goes wrong:** Empty overlay appears when hovering over point with no tag/image
**Why it happens:** Hover detection returns point index, but no check for metadata presence
**How to avoid:** Check if tag/image data exists before showing overlay: `if (tag || image) overlayVisible.value = true`
**Warning signs:** Empty box appears on hover, unnecessary DOM operations

### Pitfall 5: Image Aspect Ratio Distortion
**What goes wrong:** Image appears stretched or squashed in overlay
**Why it happens:** Fixed width/height without considering image aspect ratio
**How to avoid:** Use `object-fit: contain` to preserve aspect ratio while fitting within defined bounds
**Warning signs:** Images look distorted, UI looks unprofessional

## Code Examples

Verified patterns from official sources:

### Conditional Rendering with v-if
```vue
<script setup>
import { ref } from 'vue'

const overlayVisible = ref(false)
const overlayData = ref<{ tag?: string, image?: string } | null>(null)

// Only render when we have data
</script>

<template>
  <div v-if="overlayVisible && overlayData" class="overlay">
    <img v-if="overlayData.image" :src="overlayData.image" />
    <span v-if="overlayData.tag">{{ overlayData.tag }}</span>
  </div>
</template>

<!-- Source: https://vuejs.org/guide/essentials/conditional.html -->
```

### Object-Fit for Aspect Ratio Preservation
```vue
<style scoped>
.image-container {
  width: 100px;
  height: 100px;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: contain;  /* Preserve aspect ratio, fit within box */
}
</style>

<template>
  <div class="image-container">
    <img src="/path/to/image.jpg" alt="Point image" />
  </div>
</template>

<!-- Source: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/object-fit -->
```

### Non-Interfering Overlay
```vue
<style scoped>
.overlay-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;  /* Let all events pass through */
}

.overlay-content {
  pointer-events: auto;  /* Re-enable events for the content itself */
}
</style>

<template>
  <div class="overlay-container">
    <div class="overlay-content">
      <!-- Overlay content here -->
    </div>
  </div>
</template>

<!-- Source: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/pointer-events -->
```

### Tag Badge Styling (Chip Pattern)
```vue
<style scoped>
.tag-badge {
  display: inline-block;
  padding: 4px 12px;
  background: #4CAF50;
  color: white;
  border-radius: 9999px;  /* Pill shape */
  font-size: 12px;
  font-family: monospace;
  white-space: nowrap;
}
</style>

<template>
  <span class="tag-badge">{{ tag }}</span>
</template>
```

### World-to-Screen Projection (Conceptual)
```typescript
// This is the algorithm to implement using gl-matrix
function worldToScreen(worldPos: vec3, camera: Camera, canvasWidth: number, canvasHeight: number): {x: number, y: number} {
  // Get MVP matrix from camera (already implemented in Camera.getShaderUniforms)
  const uniforms = camera.getShaderUniforms(canvasWidth / canvasHeight)
  const mvp = uniforms.u_mvpMatrix
  
  // Transform world position to clip space
  const clipPos = vec4.create()
  vec4.set(clipPos, worldPos[0], worldPos[1], worldPos[2], 1)
  vec4.transformMat4(clipPos, clipPos, mvp)
  
  // Perspective divide
  const ndcX = clipPos[0] / clipPos[3]
  const ndcY = clipPos[1] / clipPos[3]
  
  // Convert NDC (-1 to 1) to screen coordinates (0 to canvasWidth/Height)
  // Also flip Y because WebGL Y is up, screen Y is down
  const screenX = (ndcX + 1) * 0.5 * canvasWidth
  const screenY = (1 - ndcY) * 0.5 * canvasHeight
  
  return { x: screenX, y: screenY }
}

// Source: https://glmatrix.net/docs/mat4.html (gl-matrix documentation)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| v-show (DOM always present) | v-if (DOM removal) | Vue 3 | Cleaner DOM, no interference with raycasting |
| Manual event coordination | Vue reactive refs | Vue 3 | Simpler code, automatic updates |
| Custom CSS-in-JS | Scoped SFC styles | Vue 3 + Vite | Better maintainability, hot module replacement |

**Deprecated/outdated:**
- Vue 2 Options API (replaced by Composition API)
- Manual DOM manipulation (replaced by Vue reactivity)

## Open Questions

1. **World-to-screen coordinate conversion implementation**
   - What we know: gl-matrix provides mat4.transformMat4(), and Camera.getShaderUniforms() returns MVP matrix
   - What's unclear: Need to verify exact transformation order and perspective divide implementation
   - Recommendation: Implement using gl-matrix functions, test with known points at different depths

2. **Edge handling strategy for OVERLAY-02 (optional)**
   - What we know: Can flip position (top→bottom) or clamp coordinates to viewport bounds
   - What's unclear: Which approach provides better UX? CONTEXT.md marks this as optional
   - Recommendation: Start with simple clamping, consider flip approach only if clamping feels awkward

3. **Performance impact of reactive overlay updates**
   - What we know: Vue's reactivity system is efficient, computed properties cache results
   - What's unclear: Impact of computing screen position every frame during camera movement
   - Recommendation: Implement and measure, optimize with watchEffect if needed

4. **Data lookup efficiency**
   - What we know: PointData uses Map-based storage (tagLookup, imageLookup) with index-based retrieval
   - What's unclear: Performance of Map.get() in render loop for every hover change
   - Recommendation: Map lookups are O(1), should be fine. Profile if performance issues emerge.

## Sources

### Primary (HIGH confidence)
- Vue 3 Documentation - https://vuejs.org/guide/essentials/conditional.html - Conditional rendering patterns
- Vue 3 Documentation - https://vuejs.org/guide/essentials/reactivity-fundamentals.html - Reactivity system
- MDN CSS - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position - CSS positioning
- MDN CSS - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/pointer-events - Pointer events for non-interference
- MDN CSS - https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/object-fit - Image aspect ratio handling
- gl-matrix - https://glmatrix.net/docs/mat4.html - Matrix transformation functions
- Phase 11 CONTEXT.md - .planning/phases/11-screen-overlay-([n]-plans)/11-CONTEXT.md - User decisions and constraints

### Secondary (MEDIUM confidence)
- None required - all information from primary sources

### Tertiary (LOW confidence)
- None required - all findings from official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages already in use, official documentation available
- Architecture: HIGH - Vue 3 patterns well-documented, verified against official docs
- Pitfalls: HIGH - CSS and Vue quirks documented in official sources
- Coordinate transformation: MEDIUM - Algorithm clear from gl-matrix docs, but implementation details need verification

**Research date:** 2026-02-05
**Valid until:** 2026-03-07 (30 days - stable tech stack)
