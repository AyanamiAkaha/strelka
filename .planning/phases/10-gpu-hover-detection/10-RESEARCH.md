# Phase 10: GPU Hover Detection - Research

**Researched:** 2026-02-05
**Domain:** WebGL / GPU-based point cloud interaction
**Confidence:** MEDIUM

## Summary

GPU hover detection for large point clouds requires careful shader optimization to maintain 30+ FPS with 5M+ points. The approach involves:

1. **Distance calculation in vertex shader**: Compute distance from each point to both camera and cursor
2. **Two-distance threshold**: Filter points by both camera distance (camera "close enough" to point) AND cursor distance (cursor close to point)
3. **Dynamic thresholds**: JavaScript calculates thresholds from point density, passes to shaders as uniforms
4. **Visual feedback**: Use existing additive blend with 2x brightness multiplier for hovered points
5. **Performance**: Single draw call, no readback to CPU, efficient vertex shader work

The codebase already uses raw WebGL (not Three.js) with gl-matrix for transformations and additive blend rendering. The existing cluster highlighting pattern (`a_clusterId` → `v_isHilighted`) provides a template to extend for hover detection.

**Primary recommendation:** Implement GPU distance threshold in vertex shader using transformed mouse position, with density-based thresholds calculated in JavaScript.

## Standard Stack

The existing codebase uses raw WebGL with minimal dependencies. No new libraries needed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gl-matrix | 3.4.4 | Matrix operations (mat4, vec3, quat) | Already in use, well-maintained, efficient |
| (none) | - | Point cloud algorithms | Implement in shaders |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | - | Spatial indexing | For efficient neighbor queries in future phases |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|----------|----------|
| Raw WebGL | Three.js with Raycaster | Three.js simpler API but heavier, adds 500KB+ overhead, existing code is raw WebGL |

**Installation:**
```bash
# No new packages needed - gl-matrix already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── core/
│   ├── ShaderManager.ts      # Extended with hover shader
│   ├── types.ts               # Extended with HoverState interface
│   └── Math.ts                # Existing, for ray/distance math
├── views/
│   └── WebGLPlayground.vue     # Extended with hover state management
└── composables/
    └── settings.ts              # Extended with hoveredPointIndex
```

### Pattern 1: Distance-Based Hover Detection in Vertex Shader
**What:** Calculate Euclidean distance from each point to cursor in world space, apply two-distance threshold
**When to use:** Real-time hover detection on point clouds (5M+ points)
**Why:** Single-pass rendering, no readback to CPU, O(1) per vertex work

**Implementation approach:**
```glsl
// Source: Extended from existing getGPUMatrixShaders() pattern

// Uniforms passed from JavaScript (calculated every frame)
uniform mat4 u_mvpMatrix;          // Existing: transforms point to clip space
uniform vec3 u_cameraPosition;       // Existing: camera world position
uniform vec2 u_cursorWorldPos;      // NEW: cursor position in world space
uniform float u_cameraDistThreshold;    // NEW: camera distance threshold
uniform float u_cursorDistThreshold;     // NEW: cursor distance threshold

attribute vec3 a_position;             // Existing: point position
attribute float a_clusterId;             // Existing: cluster ID (for future extension)

varying float v_isHovered;             // NEW: hover state for fragment shader

void main() {
  // Transform point to clip space (existing pattern)
  vec4 clipPos = u_mvpMatrix * vec4(a_position, 1.0);
  gl_Position = clipPos;

  // Two-distance threshold approach:
  // 1. Camera distance check: Is point close enough to camera?
  float distToCamera = length(u_cameraPosition - a_position);
  bool cameraNear = distToCamera < u_cameraDistThreshold;

  // 2. Cursor distance check: Is point close enough to cursor?
  float distToCursor = length(u_cursorWorldPos - a_position);
  bool cursorNear = distToCursor < u_cursorDistThreshold;

  // Combined: Both conditions must be true
  v_isHovered = float(cameraNear && cursorNear);
}
```

**Fragment shader extension (brightness boost):**
```glsl
// Source: Extended from existing fragment shader

varying float v_isHovered;        // NEW: hover state from vertex shader
varying float v_revCamDist;        // Existing: reverse camera distance

void main() {
  // Existing point sprite rendering
  vec2 coord = gl_PointCoord - vec2(0.5);
  float distance = length(coord);

  if (distance > 0.5) {
    discard;
  }

  float intensity = 1.0 - distance * 2.0;

  // NEW: Apply 2x brightness boost for hovered points
  // Existing base colors (from current shader)
  vec3 c_base = vec3(1.0);
  vec3 c_far = vec3(0.0, 0.0, 0.3);

  // MODIFIED: Boost brightness when hovered
  vec3 c_hovered = c_base * 2.0;  // 2x brightness boost

  // Mix between normal and hovered colors
  vec3 color = v_isHovered > 0.5 ? c_hovered : c_base;

  // Keep existing depth-based color blend
  vec3 c_far_hovered = v_isHovered > 0.5 ? vec3(0.2, 0.1, 0.2) : c_far;
  vec3 finalColor = mix(c_far_hovered, color, v_revCamDist);

  gl_FragColor = vec4(finalColor, intensity);
}
```

### Pattern 2: Mouse Position to World Space Conversion
**What:** Convert mouse screen coordinates to world coordinates using camera matrices
**When to use:** Need  pass cursor position to shader for distance calculation
**Example:**
```typescript
// Source: Camera class (existing)

/**
 * Convert mouse screen position to world space
 * Uses inverse projection matrix to unproject
 */
convertMouseToWorld(mouseX: number, mouseY: number, canvasWidth: number, canvasHeight: number): {x: number, y: number, z: number} {
  // Get existing camera matrices
  const { u_viewMatrix, u_mvpMatrix } = this.getShaderUniforms(canvasWidth / canvasHeight);

  // Normalize mouse to NDC (-1 to 1)
  const ndcX = (mouseX / canvasWidth) * 2.0 - 1.0;
  const ndcY = -((mouseY / canvasHeight) * 2.0 - 1.0); // Flip Y

  // Get camera position (already computed)
  const camPos = this.position;

  // Calculate inverse view matrix
  const viewMatrix = u_viewMatrix as Float32Array;
  const invViewMatrix = mat4.invert(mat4.create(), viewMatrix);

  // Get forward vector from camera
  const forward = this.getForward();

  // Project ray: start at camera, extend through mouse position
  // Simple approximation: ray extends forward from camera to a plane at camera Z offset
  const distanceToPlane = 10.0; // Adjust based on point distribution
  const rayStart = [camPos[0], camPos[1], camPos[2]];
  const rayDir = [forward[0], forward[1], forward[2]];

  // Point on plane at distanceToPlane (approximate world position)
  const worldX = rayStart[0] + rayDir[0] * distanceToPlane * ndcX;
  const worldY = rayStart[1] + rayDir[1] * distanceToPlane;
  const worldZ = rayStart[2] + rayDir[2] * distanceToPlane;

  return { x: worldX, y: worldY, z: worldZ };
}
```

### Pattern 3: Point Density Calculation for Thresholds
**What:** Calculate average spacing between points to derive adaptive thresholds
**When to use:** Need dynamic thresholds based on point distribution
**Example:**
```typescript
/**
 * Calculate point density to derive hover thresholds
 * Uses sampling approach for efficiency with large point sets
 */
export function calculatePointDensityThresholds(positions: Float32Array, count: number): {
  cameraDistThreshold: number,
  cursorDistThreshold: number
} {
  // Sample subset of points (avoid O(n^2) with 5M points)
  const SAMPLE_SIZE = Math.min(10000, count);
  const stride = 3; // x, y, z

  let totalNeighborDist = 0;
  let sampleCount = 0;

  // Sample points uniformly
  for (let i = 0; i < SAMPLE_SIZE; i += 100) {
    const idx = Math.floor(Math.random() * (count / 3)) * 3;
    const p1x = positions[idx];
    const p1y = positions[idx + 1];
    const p1z = positions[idx + 2];

    // Find nearest neighbor (simplified)
    let minDist = Infinity;
    for (let j = 0; j < SAMPLE_SIZE && j < idx; j += 3) {
      const dx = positions[j] - p1x;
      const dy = positions[j + 1] - p1y;
      const dz = positions[j + 2] - p1z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > 0 && dist < minDist) {
        minDist = dist;
      }
    }

    if (minDist !== Infinity) {
      totalNeighborDist += minDist;
      sampleCount++;
    }
  }

  // Average nearest neighbor distance as density measure
  const avgSpacing = totalNeighborDist / sampleCount;

  // Thresholds: use point spacing as baseline
  const cameraDistThreshold = avgSpacing * 5.0;  // Camera must be within 5x avg spacing
  const cursorDistThreshold = avgSpacing * 1.5;  // Cursor must be within 1.5x avg spacing

  return { cameraDistThreshold, cursorDistThreshold };
}
```

### Pattern 4: Shader Uniform Update Pattern
**What:** Pass dynamic thresholds to shader every frame before rendering
**When to use:** All hover detection thresholds need GPU update
**Example:**
```typescript
// Source: WebGLPlayground.vue render loop

function updateHoverUniforms(gl: WebGL2RenderingContext | WebGLRenderingContext) {
  // Get mouse position from canvas events (existing pattern in WebGLCanvas.vue)
  const mouseX = lastMouseX;  // Tracked in component
  const mouseY = lastMouseY;

  // Convert to world space
  const worldPos = camera.value!.convertMouseToWorld(mouseX, mouseY, canvasWidth, canvasHeight);

  // Calculate density thresholds (once after data load, not every frame)
  if (!hoverThresholds) {
    hoverThresholds = calculatePointDensityThresholds(pointData!.positions, pointCount.value);
  }

  // Pass to shader
  gl.uniform3f(
    gl.getUniformLocation(shaderProgram, 'u_cursorWorldPos'),
    worldPos.x, worldPos.y, worldPos.z
  );
  gl.uniform1f(
    gl.getUniformLocation(shaderProgram, 'u_cameraDistThreshold'),
    hoverThresholds.cameraDistThreshold
  );
  gl.uniform1f(
    gl.getUniformLocation(shaderProgram, 'u_cursorDistThreshold'),
    hoverThresholds.cursorDistThreshold
  );
}
```

### Anti-Patterns to Avoid
- **CPU readback of pixel data**: For 5M points, reading pixels every frame would kill performance. Use vertex shader distance checks instead.
- **Ray casting on CPU**: Expensive O(n) per frame. GPU distance check is O(1) per vertex, runs in parallel.
- **Fixed thresholds**: Don't hardcode magic numbers like `0.1` or `10.0`. Calculate from data distribution.
- **Separate render passes**: Don't render points twice (picking pass + display pass). Single pass with distance check is sufficient.
- **Fragment shader distance checks**: Compute distance in vertex shader, interpolate via varying. Fragment shader only handles color output.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Distance calculation | Custom `sqrt(x*x + y*y + z*z)` loops | GLSL `length()` function | Hardware-accelerated, built-in optimization |
| Matrix operations | Manual matrix multiplication | gl-matrix library | Tested, optimized for WebGL |
| Random sampling | `Math.random()` with modulo | Uniform sampling | Better cache locality, GPU handles efficiently |
| Screen to world conversion | Manual inverse matrix | Use camera matrices + simple approximation | Existing pattern, avoids complex math |

**Key insight:** GPU distance checks are massively parallel (5M points = 5M distance checks in parallel). CPU ray casting is serial and slow.

## Common Pitfalls

### Pitfall 1: Reading Pixel Data for Hover Detection
**What goes wrong:** Using `readPixels()` to read color under cursor, decoding point ID from RGBA values. This causes GPU → CPU synchronization stall every frame.

**Why it happens:** Follows color-based picking pattern (like WebGLFundamentals tutorial), but doesn't scale to 5M points at 30 FPS. `readPixels()` is a synchronous CPU operation that blocks until GPU completes.

**How to avoid:** Use vertex shader distance checks. Compute distance to cursor in vertex shader, pass result to fragment shader via `varying`. No readback needed.

**Warning signs:** Frame rate drops below 30 FPS when hovering, profiler shows `readPixels()` taking 5-10ms per call.

### Pitfall 2: Incorrect Screen-to-World Coordinate Conversion
**What goes wrong:** Assuming screen pixels map linearly to world coordinates. Fails when camera rotates/zooms.

**Why it happens:** Mouse coordinates are in screen space (2D), but points are in world space (3D). Need to account for camera transformation (view + projection matrices).

**How to avoid:** Use camera matrices to transform mouse ray. Invert view matrix to find world position on a plane at known Z distance. Or use simplified approximation based on camera direction.

**Warning signs:** Hover detection works from one camera angle, breaks when rotating camera or moving.

### Pitfall 3: Single Distance Threshold
**What goes wrong:** Using only cursor distance, ignoring camera distance. Selects points far from camera that happen to align with cursor.

**Why it happens:** In 3D, cursor line passes through many points at different depths. A point far from camera but directly under cursor should not be selected.

**How to avoid:** Implement two-distance threshold (camera distance check AND cursor distance check). Both conditions must be true for hover.

**Warning signs:** Points behind camera or far away appear to "glow" when mouse passes over them.

### Pitfall 4: Re-calculating Density Every Frame
**What goes wrong:** Computing average point spacing every frame with 5M points. O(n) algorithm runs on CPU.

**Why it happens:** Point positions don't change at runtime. Density is a property of the dataset, not the camera.

**How to avoid:** Calculate thresholds once after data load, cache in variable. Update only if dataset changes.

**Warning signs:** UI freezes or frame drops when hovering, profiler shows `calculatePointDensityThresholds()` taking 50-100ms.

### Pitfall 5: Incorrect Additive Blend Multiplier
**What goes wrong:** Using `mix()` with 0.5 alpha for brightness boost. Additive blend doesn't work with partial coverage.

**Why it happens:** Existing shader uses `gl.blendFunc(gl.SRC_ALPHA, gl.ONE)` (additive). With additive blending, higher RGB values = brighter result. Need full 2x multiplier, not 50% mix.

**How to avoid:** Multiply RGB by 2.0 when hovered, keep additive blend as-is.

**Warning signs:** Hover effect is subtle (1.5x brightness), not noticeable 2x boost as specified in requirements.

### Pitfall 6: Forgetting to Handle WebGLCanvas Mouse Events
**What goes wrong:** Using `window.addEventListener('mousemove')` directly. Coordinates don't account for canvas CSS scaling, device pixel ratio, or offset.

**Why it happens:** Mouse events are emitted at DOM level. Canvas element may have CSS transforms, scaling, or position offset. Also doesn't get mouse position when button not pressed.

**How to avoid:** Use existing `WebGLCanvas.vue` component which properly handles coordinate normalization and emits `mouse-move` events.

**Warning signs:** Hover offset from cursor by 20-50 pixels, or fails at different canvas sizes.

### Pitfall 7: Point Size Interfering with Distance Calculation
**What goes wrong:** Using raw world distance without accounting for point sprite size. Points visually appear larger/smaller than their actual position.

**Why it happens:** `gl_PointSize` makes points appear as circles in screen space. Hover should trigger when cursor is within visible point radius, not center.

**How to avoid:** Add visual padding to threshold. If point size is 10 pixels, add 5-10 pixels to cursor distance threshold.

**Warning signs:** Hover triggers "too early" or "too late" relative to what user sees.

### Pitfall 8: Not Disabling Depth Test for Additive Blending
**What goes wrong:** Leaving `depthMask(true)` (default) with additive blend. Points draw over each other based on draw order, not actual depth.

**Why it happens:** Additive blending accumulates color values. If depth test writes depth buffer, points in front block points behind. But existing code uses `depthMask(false)` explicitly for performance.

**How to avoid:** Keep existing `setupAdditivePointRendering()` which sets `depthMask(false)` correctly.

**Warning signs:** Hover highlights get occluded by other points, flickering as camera moves.

## Code Examples

Verified patterns from existing codebase:

### Extend Existing Shader Pattern
```typescript
// Source: src/core/ShaderManager.ts - getGPUMatrixShaders()

getGPUMatrixShaders(): ShaderSource {
  return {
    vertex: `
      attribute vec3 a_position;
      attribute float a_clusterId;

      // Existing uniforms
      uniform mat4 u_viewMatrix;
      uniform mat4 u_mvpMatrix;
      uniform vec3 u_cameraPosition;
      uniform vec2 u_cameraRotation;
      uniform float u_fov;
      uniform float u_near;
      uniform float u_far;
      uniform float u_aspect;
      uniform float u_pointSize;
      uniform float u_hilighted_cluster;

      // NEW: Add hover detection uniforms
      uniform vec2 u_cursorWorldPos;
      uniform float u_cameraDistThreshold;
      uniform float u_cursorDistThreshold;

      varying float v_isHilighted;
      varying float v_revCamDist;
      varying float v_isHovered;  // NEW

      void main() {
        // Existing camera distance calculation
        vec3 position = a_position;
        float revCamDistance = 1.0 - clamp(length(u_cameraPosition - position)/100.0, 0.0, 1.0);

        // NEW: Two-distance threshold hover detection
        float distToCamera = length(u_cameraPosition - position);
        bool cameraNear = distToCamera < u_cameraDistThreshold;

        float distToCursor = length(u_cursorWorldPos - position);
        bool cursorNear = distToCursor < u_cursorDistThreshold;

        // Combined: Both must be true
        v_isHovered = float(cameraNear && cursorNear);

        // Existing highlight logic
        v_isHilighted = abs(a_clusterId - u_hilighted_cluster) < 0.4 ? 1.0 : 0.0;
        v_revCamDist = revCamDistance;

        gl_Position = u_mvpMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(u_pointSize * revCamDistance, 4.0, 50.0);
      }
    `,
    fragment: `
      precision mediump float;

      varying float v_isHilighted;
      varying float v_revCamDist;
      varying float v_isHovered;  // NEW

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float distance = length(coord);

        if (distance > 0.5) {
          discard;
        }

        float intensity = 1.0 - distance * 2.0;

        // Existing colors
        vec3 c_base = v_isHilighted > 0.5 ? vec3(1.0, 0.5, 0.2) : vec3(1.0);
        vec3 c_far = v_isHilighted > 0.5 ? vec3(0.1, 0.0, 0.1) : vec3(0.0, 0.0, 0.3);

        // NEW: 2x brightness boost when hovered
        vec3 c_hovered = v_isHovered > 0.5 ? c_base * 2.0 : c_base;

        // Mix based on hover state
        vec3 c_far_hovered = v_isHovered > 0.5 ? vec3(0.2, 0.1, 0.2) : c_far;
        vec3 finalColor = mix(c_far_hovered, c_hovered, v_revCamDist);

        gl_FragColor = vec4(finalColor, intensity);
      }
    `
  };
}
```

### Uniform Update Pattern
```typescript
// Source: src/views/WebGLPlayground.vue - render loop

// Track mouse position (reuse existing pattern)
const mouseX = ref(0);
const mouseY = ref(0);
const lastMouseX = ref(0);
const lastMouseY = ref(0);

// Cache density thresholds
const hoverThresholds = ref<{cameraDistThreshold: number, cursorDistThreshold: number} | null>(null);

// Calculate once after data load
watch(pointCount, (newCount) => {
  if (pointData.value && newCount > 0) {
    const thresholds = calculatePointDensityThresholds(
      pointData.value.positions,
      newCount
    );
    hoverThresholds.value = thresholds;
  }
});

// Update shader uniforms every frame
const render = (timestamp: number) => {
  if (canvasRef.value && shaderProgram && camera.value) {
    const gl = canvasRef.value.getGL();
    if (!gl) return;

    // Clear and setup (existing pattern)
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(shaderProgram);

    // Existing camera uniforms (keep this)
    const canvas = canvasRef.value.canvasElement;
    const aspect = canvas ? canvas.width / canvas.height : 1.0;
    const uniforms = camera.value.getShaderUniforms(aspect);

    gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, 'u_viewMatrix'), false, uniforms.u_viewMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, 'u_mvpMatrix'), false, uniforms.u_mvpMatrix);
    gl.uniform3fv(gl.getUniformLocation(shaderProgram, 'u_cameraPosition'), uniforms.u_cameraPosition);
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'u_pointSize'), 10.0);
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'u_hilighted_cluster'), highlightedCluster.value);

    // NEW: Update hover detection uniforms
    if (hoverThresholds.value) {
      gl.uniform2f(
        gl.getUniformLocation(shaderProgram, 'u_cursorWorldPos'),
        lastMouseX.value, lastMouseY.value
      );
      gl.uniform1f(
        gl.getUniformLocation(shaderProgram, 'u_cameraDistThreshold'),
        hoverThresholds.value.cameraDistThreshold
      );
      gl.uniform1f(
        gl.getUniformLocation(shaderProgram, 'u_cursorDistThreshold'),
        hoverThresholds.value.cursorDistThreshold
      );
    }

    // Draw points (existing pattern)
    // ... bind buffers and drawArrays
  }

  requestAnimationFrame(render);
};
```

### Mouse Event Handler (Existing Pattern)
```typescript
// Source: src/components/WebGLCanvas.vue

// Track mouse position even when button not pressed
const onMouseMove = (event: MouseEvent) => {
  const deltaX = event.clientX - mouseState.lastX;
  const deltaY = event.clientY - mouseState.lastY;

  // Always emit mouse-move for hover detection
  emit('mouse-move', { deltaX, deltaY, buttons: mouseState.buttons });

  mouseState.lastX = event.clientX;
  mouseState.lastY = event.clientY;
};

// Don't require button press for hover
// const onMouseMove = (event: MouseEvent) => {
//   if (mouseState.isDown) {  // REMOVED: don't require button press
//     emit('mouse-move', { deltaX, deltaY, buttons: mouseState.buttons });
//   }
//   mouseState.lastX = event.clientX;
//   mouseState.lastY = event.clientY;
// };
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|----------------|--------------|--------|
| CPU ray casting per point | GPU distance check in vertex shader | WebGL 1.0+ | Parallel processing, no readback |
| Fixed hover threshold | Density-based dynamic threshold | 2010s | Adaptive to data distribution |
| Color-based picking | Distance-based threshold | 2010s | No second render pass, O(1) per vertex |
| Linear alpha mix for brightness | Full 2x RGB multiplier | 2020s | Works with additive blend |

**Deprecated/outdated:**
- **Color-based ID picking**: Requires second render pass to offscreen framebuffer, reading pixel data. Too slow for 5M points.
- **CPU hover detection**: Ray casting from mouse through all points on CPU. O(n) per frame, not scalable.

## Open Questions

### Question 1: Accurate Screen-to-World Conversion Complexity
**What we know:** Camera position and matrices are available. Need to convert mouse (2D screen) to world (3D) coordinates for cursor position uniform.

**What's unclear:** Whether to implement full ray-plane intersection (accurate but complex) or simplified plane approximation (simpler but potentially inaccurate edge cases).

**Recommendation:** Start with plane approximation (project ray at fixed Z distance). If edge cases cause issues (hover offset), refine to full ray-plane intersection.

### Question 2: Density Threshold Tuning
**What we know:** Average point spacing provides baseline. Need multiplier values (5x for camera, 1.5x for cursor) that work across different datasets.

**What's unclear:** Optimal multipliers for different point distributions (uniform grid vs. clustered). Whether to add margin for point size.

**Recommendation:** Start with multipliers from context (5x, 1.5x). Consider adding user-tunable sensitivity factor in future if needed.

### Question 3: Performance at 5M Points
**What we know:** Vertex shader distance checks are O(1) and parallel. Should maintain 30+ FPS on modern hardware.

**What's unclear:** Actual performance impact of distance calculations, `length()` function, and two boolean comparisons on 5M vertices per frame.

**Recommendation:** Profile vertex shader with 5M points. If FPS drops below 30, consider:
1. Reduce threshold recalculation frequency
2. Simplify distance calculation (use squared distance to avoid sqrt)
3. LOD (level of detail) for far points

## Sources

### Primary (HIGH confidence)
- **src/core/ShaderManager.ts** - Existing shader patterns, additive blending setup
- **src/core/Camera.ts** - Camera matrix calculations, coordinate system (Y-up, quaternion-based)
- **src/components/WebGLCanvas.vue** - Mouse event handling, coordinate normalization
- **src/views/WebGLPlayground.vue** - Render loop, uniform passing pattern

### Secondary (MEDIUM confidence)
- **WebGL Fundamentals Picking Tutorial** - Color-based picking approach (different from Phase 10 requirements, useful for understanding pitfalls)
- **WebGL Best Practices (MDN)** - Performance guidelines, avoid readPixels, prefer vertex shader work
- **gl-matrix documentation** - Matrix operations API reference

### Tertiary (LOW confidence)
- General knowledge of WebGL distance calculations, screen-to-world conversion patterns
- Point cloud hover detection patterns (no authoritative source, based on shader programming principles)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Direct codebase analysis, no new dependencies needed
- Architecture: MEDIUM - Distance-based pattern is standard, but screen-to-world conversion complexity is unknown
- Pitfalls: HIGH - Well-documented WebGL issues (readPixels, coordinate conversion, fixed thresholds)
- Code examples: HIGH - Derived from existing codebase patterns

**Research date:** 2026-02-05
**Valid until:** 2026-03-07 (30 days - GPU/WebGL is stable, but verify screen-to-world conversion with actual implementation)
