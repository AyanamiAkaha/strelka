# Phase 8: Highlighted Cluster Selector - Research

**Researched:** 2026-02-04
**Domain:** WebGL shader highlighting + Vue 3 UI controls
**Confidence:** HIGH

## Summary

Phase 8 requires implementing a slider-based cluster selector to replace the current hard-coded radio button UI. The core WebGL shader highlighting functionality is **already implemented and working** - the shader already compares cluster IDs and renders highlighted points in orange. The phase primarily involves UI changes and data flow improvements rather than shader modifications.

**Primary recommendation:** Replace radio buttons with `<input type="range">`, compute dynamic `max` from loaded data, handle special values (-2 for "none", -1 for noise cluster) with display labels.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | 3.3.8 | Reactivity and UI | Already in use, v-model for range inputs |
| TypeScript | ~5.3.0 | Type safety | Already in use, ensures correct types |
| WebGL 1/2 | Native | Rendering context | Already in use, uniform passing works |

### Supporting
No additional libraries needed. The solution uses native HTML5 range inputs and Vue's reactivity system.

**Installation:**
No new packages required - all dependencies already exist.

## Architecture Patterns

### Current State Analysis

**Already Implemented:**
1. **Shader highlighting** (`src/core/ShaderManager.ts`, lines 174, 191):
   ```glsl
   uniform float u_hilighted_cluster;
   attribute float a_clusterId;
   varying float v_isHilighted;

   void main() {
     v_isHilighted = abs(a_clusterId - u_hilighted_cluster) < 0.4 ? 1.0 : 0.0;
   // ...
   }
   ```
   Fragment shader uses `v_isHilighted` to color points orange (highlighted) vs white/gray (normal).

2. **Data structure** (`src/core/DataProvider.ts`):
   - `PointData` interface has `clusterIds: Float32Array`
   - One float per point representing cluster ID
   - `-1` and `null` treated as noise
   - Valid cluster IDs are non-negative integers

3. **Reactive state** (`src/composables/settings.ts`):
   - `highlightedCluster` ref initialized to `-1`
   - Exported and used throughout app

4. **Current UI** (`src/components/ControlsOverlay.vue`):
   - Hard-coded radio buttons for clusters 0-4 plus "None"
   - Not dynamic - doesn't adapt to loaded data

5. **Uniform updates** (`src/views/WebGLPlayground.vue`, line 349):
   ```typescript
   gl.uniform1f(gl.getUniformLocation(shaderProgram, 'u_hilighted_cluster'), highlightedCluster.value)
   ```
   Updated every frame in render loop - no re-compilation needed

### Implementation Pattern: Dynamic Cluster Selector

#### Step 1: Compute Max Cluster ID
```typescript
// In WebGLPlayground.vue or DataProvider
const maxClusterId = computed(() => {
  if (!pointData.value) return -1

  // Find maximum value in clusterIds Float32Array
  let max = -Infinity
  for (let i = 0; i < pointData.value.clusterIds.length; i++) {
    max = Math.max(max, pointData.value.clusterIds[i])
  }
  return max
})
```

#### Step 2: Slider Component
```vue
<template>
  <div class="cluster-selector">
    <label for="cluster-slider">Highlighted cluster</label>
    <input
      id="cluster-slider"
      type="range"
      v-model.number="highlightedCluster"
      :min="sliderMin"
      :max="maxClusterId"
      step="1"
    />
    <div class="cluster-value">
      {{ clusterDisplayValue }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { highlightedCluster } from '@/composables/settings'
import { computed } from 'vue'

const maxClusterId = computed(() => {
  // Compute from pointData as shown in Step 1
})

const clusterDisplayValue = computed(() => {
  const val = highlightedCluster.value
  if (val === -2) return 'None'
  if (val === -1) return 'Noise'
  return `Cluster ${val}`
})
</script>
```

#### Step 3: Special Value Handling
- **-2**: "None" selection - no highlighting, all points rendered normally
- **-1**: Noise cluster - points marked with `clusterId = -1`
- **0+**: Specific clusters - rendered with highlight color

The shader comparison uses `< 0.4` tolerance:
```glsl
v_isHilighted = abs(a_clusterId - u_hilighted_cluster) < 0.4 ? 1.0 : 0.0;
```
This ensures integer comparison works correctly despite float storage.

### UI/UX Considerations

**Placement:**
- Add slider below "Data Source" buttons in ControlsOverlay
- Maintain existing dark theme styling
- Keep monospace font for consistency

**Display:**
- Show current selection clearly
- Map -2 → "None", -1 → "Noise"
- For large datasets, slider provides better UX than radio buttons
- Consider adding tick marks for key clusters (optional enhancement)

**Accessibility:**
- Use `<label>` element properly associated with input
- Consider ARIA attributes if needed (standard range input has implicit slider role)

### Anti-Patterns to Avoid

- **Hard-coding cluster numbers**: Radio buttons assume max 4 clusters - fails with loaded data
- **Re-compiling shaders on value change**: Uniforms don't need shader recompilation
- **Storing computed max value in ref**: Use computed property for reactive max
- **Separate "none" state from range**: The -2 value is part of the range, not a special mode

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Computing max cluster ID | Manual loop each render | `Math.max(...Array.from(clusterIds))` | Built-in handles TypedArrays efficiently |
| Slider component | Custom Vue component with props | `<input type="range">` | Native element has accessibility, keyboard support, touch gestures |
| Uniform update handling | Manual event listeners + `gl.useProgram()` | `v-model` + existing render loop | Vue reactivity works with WebGL frame loop |

**Key insight:** WebGL uniforms are lightweight values passed to GPU. Updating a `float` uniform via `gl.uniform1f()` is extremely fast - no need to batch updates or recompile shaders. Vue's reactivity naturally integrates with the per-frame render loop.

## Common Pitfalls

### Pitfall 1: Negative Slider Values
**What goes wrong:** Using `min="0"` assumes all cluster IDs are non-negative, but noise cluster is `-1` and "none" needs to be `-2`.
**Why it happens:** Default HTML5 range inputs have `min="0"`.
**How to avoid:** Explicitly set `:min="-2"` in Vue binding.
**Warning signs:** Slider thumb stuck at minimum, can't select noise cluster.

### Pitfall 2: Static Max Value
**What goes wrong:** Slider max is hard-coded to current generated data's max (4), breaks when loading data with more clusters.
**Why it happens:** Direct binding without computed property.
**How to avoid:** Use computed property to derive max from `pointData.value.clusterIds`.
**Warning signs:** Slider can't select highest cluster in loaded data, UI shows wrong max label.

### Pitfall 3: Uniform Update Timing
**What goes wrong:** Uniform only updated on value change event, not every frame - causes stale highlight during render.
**Why it happens:** Event-driven updates outside render loop.
**How to avoid:** Uniform is already updated in the `requestAnimationFrame` render loop (line 349) - relies on `highlightedCluster.value` ref which is reactive.
**Warning signs:** Highlighted cluster lags behind slider value, or highlighting doesn't update at all.

### Pitfall 4: Float vs Integer Comparison
**What goes wrong:** `a_clusterId === u_hilighted_cluster` comparison fails because cluster IDs stored as `float` in shader.
**Why it happens:** GLSL `attribute float` and uniform storage, precision issues.
**How to avoid:** Shader already uses tolerance comparison: `abs(a_clusterId - u_hilighted_cluster) < 0.4`.
**Warning signs:** Points don't highlight despite correct slider value.

### Pitfall 5: Range Input Casting
**What goes wrong:** `v-model` returns string, slider value becomes "3" not `3`.
**Why it happens:** HTML form values are strings by default.
**How to avoid:** Use `v-model.number` modifier or manually cast with `parseFloat()`.
**Warning signs:** Shader receives uniform as string, causes compilation error or unexpected behavior.

## Code Examples

### Computing Max Cluster ID
```typescript
// Source: Analysis of PointData interface
// Location: WebGLPlayground.vue or new composable

const maxClusterId = computed(() => {
  if (!pointData.value) return -1

  // Convert Float32Array to regular array for Math.max
  // This is O(n) but only runs when pointData changes
  const clusterArray = Array.from(pointData.value.clusterIds)
  return Math.max(...clusterArray)
})
```

### Vue 3 Range Input with Dynamic Attributes
```vue
<!-- Source: Vue.js official docs + MDN -->
<!-- https://vuejs.org/guide/essentials/forms -->
<!-- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/range -->

<template>
  <div class="cluster-selector">
    <label for="cluster-slider">Highlight cluster</label>
    <input
      id="cluster-slider"
      type="range"
      v-model.number="highlightedCluster"
      :min="-2"
      :max="maxClusterId"
      step="1"
      aria-label="Select cluster to highlight"
    />
    <div class="cluster-display">
      <span v-if="highlightedCluster === -2">None</span>
      <span v-else-if="highlightedCluster === -1">Noise</span>
      <span v-else>Cluster {{ highlightedCluster }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const highlightedCluster = ref(-2)
const pointData = ref<PointData | null>(null) // From WebGLPlayground

const maxClusterId = computed(() => {
  if (!pointData.value) return -1
  return Math.max(...Array.from(pointData.value.clusterIds))
})
</script>

<style scoped>
.cluster-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(76, 175, 80, 0.3);
}

.cluster-selector label {
  color: #4CAF50;
  font-size: 11px;
  font-family: monospace;
  margin-bottom: 4px;
}

.cluster-selector input[type="range"] {
  width: 100%;
  cursor: pointer;
}

.cluster-display {
  color: white;
  font-size: 11px;
  font-family: monospace;
  text-align: center;
  margin-top: 4px;
}
</style>
```

### WebGL Uniform Update in Render Loop
```typescript
// Source: Existing code in WebGLPlayground.vue (lines 340-349)
// No changes needed - this is the correct pattern

const render = (timestamp: number) => {
  if (canvasRef.value && camera.value) {
    camera.value.update()

    // ... setup viewport, clear buffer ...

    gl.useProgram(shaderProgram)

    // Update uniforms every frame
    gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, 'u_viewMatrix'), false, uniforms.u_viewMatrix)
    gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, 'u_mvpMatrix'), false, uniforms.u_mvpMatrix)
    // ... other uniforms ...

    // THIS IS THE KEY LINE - already uses highlightedCluster.value directly
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'u_hilighted_cluster'), highlightedCluster.value)

    // Draw points
    gl.drawArrays(gl.POINTS, 0, pointCount.value)
  }

  animationId = requestAnimationFrame(render)
}
```

### Conditional Display Based on Value
```vue
<!-- Clean display logic for special cluster values -->

<template>
  <div class="cluster-info">
    <span v-if="highlightedCluster === -2" class="label-none">None</span>
    <span v-else-if="highlightedCluster === -1" class="label-noise">Noise</span>
    <span v-else class="label-cluster">Cluster {{ highlightedCluster }}</span>
  </div>
</template>

<style scoped>
.label-none { color: #9e9e9e; }  /* Gray for none */
.label-noise { color: #f44336; }  /* Red for noise */
.label-cluster { color: #4CAF50; }  /* Green for clusters */
</style>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|----------------|--------------|--------|
| Hard-coded radio buttons (0-4 + None) | Slider with dynamic range | Phase 8 | Can handle any number of clusters from loaded data |
| Manual event listeners for slider | v-model.number binding | Vue 3.3 | Automatic type casting and reactivity |
| Static max value | Computed max from data | Phase 8 | Adapts to different datasets |

**No deprecated features:** The core WebGL uniform approach is already modern and efficient.

## Open Questions

1. **Should "None" value be -1 or -2?**
   - What we know: Phase spec says min=-2 (for "none"), shader uses -1 as noise
   - What's unclear: Whether -2 needs special shader handling or if it works with current tolerance-based comparison
   - Recommendation: Test with current shader - `< 0.4` tolerance means `-2` won't match any cluster ID, should work as "none" naturally

2. **Should slider allow selecting noise cluster (-1)?**
   - What we know: Noise points exist with `clusterId = -1`
   - What's unclear: User intent - should they be able to highlight noise specifically?
   - Recommendation: Allow -1 selection for completeness, display as "Noise" to distinguish from None (-2)

3. **Performance considerations for large datasets:**
   - What we know: Computing `Math.max(...Array.from(clusterIds))` is O(n)
   - What's unclear: Whether this needs memoization or optimization for datasets with 30M points
   - Recommendation: Compute once when data loads, store in ref, use ref in slider max binding

## Sources

### Primary (HIGH confidence)
- **Vue.js v3.5 Form Input Bindings** - https://vuejs.org/guide/essentials/forms
  - Verified v-model usage with type="range"
  - Verified .number modifier for automatic type casting
  - Verified dynamic attribute binding with :min and :max

- **MDN: <input type="range">** - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/range
  - Verified min, max, step attributes
  - Verified default behavior when min/max values are specified
  - Verified value constraint and validation

- **Existing codebase analysis** - Local inspection
  - `src/core/ShaderManager.ts` - Shader highlighting implementation (lines 174, 191)
  - `src/views/WebGLPlayground.vue` - Uniform update pattern (line 349)
  - `src/components/ControlsOverlay.vue` - Current radio button UI (lines 44-58)
  - `src/composables/settings.ts` - Reactive state (line 3)

### Secondary (MEDIUM confidence)
- **MDN: min attribute** - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/min
  - Verified behavior with negative values
  - Verified validation constraints

### Tertiary (LOW confidence)
- No external sources needed - all research from official docs and codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vue 3, TypeScript, WebGL patterns verified in official docs and codebase
- Architecture: HIGH - Existing shader and uniform patterns analyzed, implementation path clear
- Pitfalls: HIGH - Identified from common WebGL and form input mistakes, verified against codebase

**Research date:** 2026-02-04
**Valid until:** 2026-03-06 (30 days - WebGL and Vue 3 are stable, but specific implementation details may need validation)
