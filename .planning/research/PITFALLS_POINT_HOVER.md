# Domain Pitfalls: Point Hover with Buffer-Based Communication

**Domain:** WebGL Point Cloud Hover with Tag/Image Display
**Project:** WebGL Clusters Playground v1.2
**Researched:** February 4, 2026
**Overall confidence:** HIGH

## Executive Summary

Adding point hover detection to an existing WebGL point cloud system introduces several complex challenges. The research identifies critical pitfalls around WebGL coordinate system transformation (3D to 2D), performance bottlenecks from buffer read operations, GPU-CPU synchronization issues, overlay positioning inaccuracies, and accessibility considerations for hover interactions. Most issues stem from misunderstanding the WebGL rendering pipeline's asynchronous nature, coordinate system transformations between 3D world space and 2D screen space, and the performance impact of synchronous readPixels operations. The recommended approach is to use a minimal 1x1 pixel picking buffer with depth-based selection, implement proper coordinate transformation using viewport-aware calculations, optimize buffer read frequency (throttle to 30fps or use last-hover caching), and ensure accessibility with proper ARIA attributes and keyboard navigation.

## Key Findings

**Stack:** Pure WebGL 2.0, Vue 3, TypeScript (same as existing codebase)
**Architecture:** Buffer-based hover detection (1x1 pixel texture + depth), GPU-side distance calculation, CPU-side tag/image overlay
**Critical pitfall:** Calling readPixels every frame causes pipeline stalls that can drop 30M-point rendering from 45 FPS to single digits
**Most common mistake:** Incorrect 3D to 2D coordinate transformation (Y-axis flip, viewport ignored, devicePixelRatio not accounted for)
**Detection challenge:** Overlay positioning mismatch due to canvas CSS size vs drawing buffer size diverging

---

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: readPixels Performance Stall

**What goes wrong:**
Calling `gl.readPixels()` every frame (60 times per second) causes severe GPU-CPU synchronization issues. Each readPixels call forces the GPU to wait for all pending rendering to complete before returning data, causing pipeline stalls that destroy frame rate. With 30M points already rendering at 45 FPS, adding per-frame readPixels can drop FPS to 5-10 FPS.

**Why it happens:**
WebGL rendering pipeline is asynchronous by design. The GPU queues rendering commands and executes them when ready. `readPixels()` is a synchronous operation that blocks until the GPU finishes all queued commands. Every call creates a synchronization point where CPU waits for GPU, breaking the parallel execution that maintains high performance.

**Consequences:**
- Frame rate drops from 45 FPS to 5-15 FPS
- Browser becomes unresponsive during hover
- Increased power consumption and heat
- Users perceive hover as "laggy" or "sluggish"
- Performance regression may persist even when not hovering (if logic always runs)

**Prevention:**
1. **Throttle read operations**: Only read buffer when mouse actually moves, not every frame
   ```typescript
   let lastMouseX = -1
   let lastMouseY = -1
   
   function onMouseMove(event: MouseEvent) {
     const dx = Math.abs(event.clientX - lastMouseX)
     const dy = Math.abs(event.clientY - lastMouseY)
     
     // Only update if mouse moved more than 5 pixels
     if (dx > 5 || dy > 5) {
       lastMouseX = event.clientX
       lastMouseY = event.clientY
       checkHover()
     }
   }
   ```

2. **Use 1x1 pixel buffer for picking**: Instead of rendering full-screen ID buffer to a texture, render only the single pixel under mouse using a custom frustum
   ```glsl
   // Vertex shader: pass position unchanged
   // Fragment shader: output point ID as color
   // Use custom projection matrix that only covers 1 pixel under mouse
   ```

3. **Cache last hover state**: Only read buffer when hover candidate changes, not every frame
   ```typescript
   let lastHoveredPointIndex = -1
   
   function checkHover() {
     // Check if new point is different from last hover
     if (newPointIndex !== lastHoveredPointIndex) {
       readHoverBuffer()
       lastHoveredPointIndex = newPointIndex
     }
   }
   ```

4. **Consider depth-based selection in shader**: Have GPU compute closest point using depth comparison, return point index and depth to buffer
   ```glsl
   // In fragment shader:
   float dist = length(a_position - u_mouseRayPos);
   if (dist < u_hoverThreshold) {
     // Atomic min operation to find closest point
     // Write point index and depth to buffer
   }
   ```

**Detection:**
- FPS drops from 45 to < 20 when mouse moves over canvas
- Browser DevTools Performance tab shows GPU stall markers
- CPU profile shows time spent in readPixels call
- Smooth camera movement becomes jerky during hover

**Phase to address:** Point Hover Detection phase - Performance optimization focus

---

### Pitfall 2: Incorrect 3D to 2D Coordinate Transformation

**What goes wrong:**
Tag/image overlay appears at wrong screen position (misaligned with hovered point), offset from actual point, or flickering between positions. This happens when coordinate transformation from 3D world space (where points exist) to 2D screen space (where overlay renders) is incorrectly implemented.

**Why it happens:**
WebGL uses multiple coordinate systems that must be correctly transformed:
- **World space**: Point's actual 3D position (x, y, z)
- **View space**: Transformed by camera view matrix
- **Clip space**: Transformed by projection matrix (-1 to +1 range)
- **NDC (Normalized Device Coordinates)**: Final vertex shader output (-1 to +1)
- **Screen space**: Pixels on canvas (0 to canvas.width, 0 to canvas.height)

Common mistakes:
1. **Y-axis flip**: WebGL Y axis points UP, screen Y axis points DOWN
2. **Viewport ignored**: Not accounting for current gl.viewport() settings
3. **devicePixelRatio not considered**: Canvas CSS pixels ≠ actual GPU pixels
4. **Aspect ratio mismatch**: Not using correct projection aspect ratio
5. **Canvas size vs CSS size mismatch**: getBoundingClientRect() not called

**Consequences:**
- Overlay appears above/left of hovered point
- Overlay drifts further off as camera moves
- Hover detection works but UI shows wrong location
- Flickering between positions when points are near screen edges
- User frustration: "I'm hovering point X but it shows point Y"

**Prevention:**

1. **Correct 3D to 2D transformation**:
   ```typescript
   // After getting point position and depth from shader
   // Transform world position to screen coordinates
   
   function worldToScreen(
     worldPos: vec3,
     viewMatrix: mat4,
     projectionMatrix: mat4,
     viewport: { x: number, y: number, width: number, height: number },
     canvasSize: { width: number, height: number }
   ): { x: number, y: number } {
     
     // 1. Transform world position to clip space
     const clipPos = vec4.create()
     vec4.transformMat4(clipPos, vec4.fromVec3(worldPos, 1.0), viewMatrix)
     vec4.transformMat4(clipPos, clipPos, projectionMatrix)
     
     // 2. Convert clip space (-1 to +1) to NDC
     const ndc = vec2.create()
     vec2.set(ndc, 
       clipPos[0] / clipPos[3],  // perspective divide
       clipPos[1] / clipPos[3]
     )
     
     // 3. Convert NDC (-1 to +1) to viewport pixels
     const screenX = viewport.x + (ndc.x + 1.0) * 0.5 * viewport.width
     const screenY = viewport.y + (1.0 - ndc.y) * 0.5 * viewport.height  // Y flip!
     
     // 4. Account for devicePixelRatio if needed
     const dpr = window.devicePixelRatio || 1
     
     return {
       x: screenX * dpr,
       y: screenY * dpr
     }
   }
   ```

2. **Use gl.viewport() for correct mapping**:
   ```typescript
   // After rendering, query current viewport
   const viewport = new Int32Array(4)
   gl.getParameter(gl.VIEWPORT)
   // Returns: [x, y, width, height]
   
   const screenPos = worldToScreen(
     pointPosition,
     camera.viewMatrix,
     camera.projectionMatrix,
     { x: viewport[0], y: viewport[1], width: viewport[2], height: viewport[3] },
     { width: gl.canvas.width, height: gl.canvas.height }
   )
   ```

3. **Match canvas CSS size to drawing buffer size**:
   ```typescript
   // In WebGLCanvas.vue or resize handler
   function updateOverlayPosition(screenX: number, screenY: number) {
     // Get actual canvas display size (CSS pixels)
     const rect = canvas.getBoundingClientRect()
     
     // Convert WebGL screen coords (GPU pixels) to CSS pixels
     const cssX = (screenX / gl.canvas.width) * rect.width
     const cssY = (screenY / gl.canvas.height) * rect.height
     
     // Position overlay using CSS coordinates
     overlayElement.style.left = `${cssX}px`
     overlayElement.style.top = `${cssY}px`
   }
   ```

4. **Handle Y-axis flip consistently**:
   - WebGL: Y points UP, origin at bottom-left
   - Screen/CSS: Y points DOWN, origin at top-left
   - Always invert Y: `screenY = viewport.height - glY`

5. **Use canvas.getBoundingClientRect() for display size**:
   ```typescript
   // Correct way to get display size
   const rect = canvas.getBoundingClientRect()
   const displayWidth = rect.width
   const displayHeight = rect.height
   
   // Match canvas drawing buffer to display size
   canvas.width = displayWidth
   canvas.height = displayHeight
   gl.viewport(0, 0, canvas.width, canvas.height)
   ```

**Detection:**
- Overlay offset from actual point position
- Offset increases as camera moves further away
- Hover detection works but UI shows wrong location
- Overlay disappears when point is near screen edges

**Phase to address:** Point Hover Detection phase - Coordinate transformation focus

---

### Pitfall 3: GPU-CPU Synchronization Bottleneck

**What goes wrong:**
Buffer read/write operations create synchronization points where CPU waits for GPU to complete. With 30M points, rendering takes significant GPU time (22ms at 45 FPS). Adding buffer operations can cause:
- CPU waits for GPU to finish drawing before reading
- GPU stalls waiting for CPU to process read data
- Frame time increases from 22ms to 50+ms
- Performance degrades with higher point counts

**Why it happens:**
Modern GPUs execute commands in parallel with CPU. However, operations that transfer data between GPU and CPU (buffer reads, texture reads, transform feedback) require synchronization. These operations are expensive because they:
1. Force completion of all pending GPU commands
2. Transfer data across PCIe bus (or memory bus)
3. Break parallel execution that maintains high performance

**Common patterns causing stalls:**
1. **readPixels() immediately after drawArrays()**: GPU must finish drawing before CPU can read
2. **Large buffer transfers**: Reading 1920x1080 pixels every frame
3. **Multiple sync points**: Using multiple fences or sync objects
4. **Transform feedback not used**: Forcing CPU to do GPU-heavy calculations

**Consequences:**
- Frame rate degradation proportional to point count
- Increased power consumption and heat
- Browser becomes unresponsive
- Performance impact visible even during simple operations

**Prevention:**

1. **Minimize buffer transfer size**:
   ```typescript
   // WRONG: Read entire screen
   const fullScreenData = new Uint8Array(canvas.width * canvas.height * 4)
   gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, fullScreenData)
   
   // CORRECT: Read only 1x1 pixel under mouse
   const pixelData = new Uint8Array(4)
   gl.readPixels(mouseX, mouseY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelData)
   ```

2. **Use asynchronous read patterns where possible**:
   ```typescript
   // Defer read to avoid blocking render loop
   let readPending = false
   
   function scheduleHoverCheck() {
     if (!readPending) {
       readPending = true
       requestAnimationFrame(() => {
         readHoverBuffer()
         readPending = false
       })
     }
   }
   ```

3. **Batch buffer operations**:
   ```typescript
   // Instead of multiple small reads, batch into one
   function updateHoverSystem() {
     // Update all hover-related state
     // Read buffer once at end
     updateHoverBuffer(mousePosition)
     readHoverBuffer()
     updateOverlayPosition()
   }
   ```

4. **Use GPU-side calculations to reduce CPU work**:
   ```glsl
   // Compute closest point in vertex/fragment shader
   // Output index + depth to small buffer
   // CPU only reads 2 floats, not millions of distances
   ```

5. **Throttle read frequency based on usage**:
   ```typescript
   // 60 FPS unnecessary for hover, 30 FPS sufficient
   let lastReadTime = 0
   const READ_INTERVAL = 33 // 30 FPS target
   
   function throttleRead() {
     const now = performance.now()
     if (now - lastReadTime > READ_INTERVAL) {
       readHoverBuffer()
       lastReadTime = now
     }
   }
   ```

**Detection:**
- Performance degrades as point count increases
- Frame profiler shows time in gl.readPixels() increasing
- CPU usage spikes during hover operations
- Frame timing becomes inconsistent (some frames fast, some slow)

**Phase to address:** Point Hover Detection phase - Performance optimization focus

---

### Pitfall 4: Buffer Format and Type Mismatches

**What goes wrong:**
Using incorrect format/type combinations in `readPixels()` or buffer operations causes:
- Silent data corruption (values read are wrong)
- Browser console warnings or errors
- Cross-browser inconsistencies
- Incorrect point identification

**Why it happens:**
WebGL has strict rules about which format/type pairs are valid for reading framebuffers. The combination depends on the internal format of the texture/renderbuffer attached to the framebuffer.

**Valid combinations (from WebGL spec):**
- `RGBA` + `UNSIGNED_BYTE`: Standard for 8-bit per channel color
- `RGBA_INTEGER` + `INT`: Integer rendering surfaces
- `RGBA_INTEGER` + `UNSIGNED_INT`: Unsigned integer rendering surfaces

**Common mistakes:**

1. **Reading float data as byte**:
   ```typescript
   // WRONG: Buffer stores depth as float
   gl.bindFramebuffer(gl.FRAMEBUFFER, depthFb)
   const depthData = new Uint8Array(4)  // Wrong type!
   gl.readPixels(0, 0, 1, 1, gl.DEPTH_COMPONENT, gl.UNSIGNED_BYTE, depthData)
   
   // CORRECT: Use float for depth
   const depthData = new Float32Array(1)
   gl.readPixels(0, 0, 1, 1, gl.DEPTH_COMPONENT, gl.FLOAT, depthData)
   ```

2. **Mismatched internal format and read format**:
   ```typescript
   // Texture created with RGBA8
   gl.texImage2D(..., gl.RGBA, ... gl.UNSIGNED_BYTE, ...)
   
   // But reading with wrong format
   // WRONG: Reading depth from color buffer
   gl.readPixels(0, 0, 1, 1, gl.DEPTH_COMPONENT, gl.UNSIGNED_BYTE, data)
   
   // CORRECT: Read with matching format
   gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, data)
   ```

3. **Assuming implementation-specific behavior**:
   ```typescript
   // Implementation-defined combinations (not portable)
   const format = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT)
   const type = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE)
   // Only use these for debugging, not production code
   
   // Always use standard RGBA + UNSIGNED_BYTE for portability
   gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, data)
   ```

4. **Not checking framebuffer completeness**:
   ```typescript
   // Before reading, verify framebuffer is complete
   const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
   if (status !== gl.FRAMEBUFFER_COMPLETE) {
     console.error('Framebuffer incomplete:', status)
     // Don't attempt readPixels()
   }
   ```

**Consequences:**
- Point index read as garbage value
- Depth values completely wrong
- Hover detection fails silently
- Different browsers show different behavior
- Hard-to-debug errors (no console output)

**Prevention:**

1. **Use standard, portable format/type combinations**:
   ```typescript
   // For point index (R, G, B channels = ID)
   const pointIndexData = new Uint8Array(4)
   gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pointIndexData)
   
   // Decode ID from RGBA
   const pointId = pointIndexData[0] + (pointIndexData[1] << 8) + 
                  (pointIndexData[2] << 16) + (pointIndexData[3] << 24)
   
   // For depth buffer
   const depthData = new Float32Array(1)
   gl.readPixels(x, y, 1, 1, gl.DEPTH_COMPONENT, gl.FLOAT, depthData)
   ```

2. **Query implementation for validation only**:
   ```typescript
   function validateReadFormat() {
     const implFormat = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT)
     const implType = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE)
     console.log('Implementation supports:', implFormat, implType)
     
     // Only use for debugging/feature detection
     // Never hardcode implementation-specific values in production
   }
   ```

3. **Check framebuffer status before reading**:
   ```typescript
   function safeReadPixels(x: number, y: number) {
     const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
     if (status !== gl.FRAMEBUFFER_COMPLETE) {
       console.error('Cannot read: framebuffer incomplete', status)
       return null
     }
     
     const data = new Uint8Array(4)
     gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, data)
     return data
   }
   ```

4. **Use typed arrays correctly**:
   ```typescript
   // RGBA = 4 bytes per pixel
   const colorData = new Uint8Array(1 * 1 * 4)  // width * height * channels
   
   // Depth = 4 bytes per pixel (float32)
   const depthData = new Float32Array(1 * 1 * 1)  // width * height * channels
   
   // RGB = 3 bytes per pixel
   const rgbData = new Uint8Array(1 * 1 * 3)
   ```

**Detection:**
- Hover detection returns random or incorrect point IDs
- Console warnings about format/type mismatches
- Different browsers show different results
- Silent failures (no error, wrong data)

**Phase to address:** Point Hover Detection phase - Buffer setup focus

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

### Pitfall 5: Hover Detection on 30M Points

**What goes wrong:**
Naive hover detection algorithms (distance check on CPU) fail to scale to 30M points. Checking distance from mouse to 30 million points every frame (or even on mouse move) is computationally infeasible:
- 30M distance calculations × 60 FPS = 1.8B calculations/second
- CPU-bound, not GPU-bound (wastes parallelism)
- Memory bandwidth issues (reading all point positions to CPU)

**Why it happens:**
Devs often start with simple algorithms that work for small datasets (1K-10K points) but don't consider scaling to millions of points. CPU cannot iterate 30M points in real-time.

**Consequences:**
- Hover detection lags 1-5 seconds behind mouse movement
- Browser becomes unresponsive during hover
- CPU usage hits 100%
- Algorithm is fundamentally wrong for large datasets

**Prevention:**

1. **GPU-side distance calculation**:
   ```glsl
   // Vertex shader: pass point position
   // Fragment shader: compute distance to mouse ray
   
   // Compute distance from point to mouse ray in 3D
   vec3 worldPos = a_position;
   vec3 viewPos = u_viewMatrix * vec4(worldPos, 1.0);
   float distToMouse = distance(viewPos, u_mouseRay);
   
   // Only consider points within threshold
   if (distToMouse < u_hoverThreshold) {
     // This point is a candidate
   }
   ```

2. **Use depth buffer for closest point selection**:
   ```glsl
   // Use GPU's depth buffer to find nearest point
   // No need to compute all distances
   float currentDepth = 1.0; // Max depth
   float closestPointIndex = -1.0;
   
   // In fragment shader (executed per pixel):
   if (distToMouse < u_hoverThreshold) {
     // If closer than current best, update
     if (v_depth < currentDepth) {
       currentDepth = v_depth;
       closestPointIndex = a_pointIndex;
     }
   }
   ```

3. **Spatial partitioning (octree/grid) for pre-filtering**:
   ```typescript
   // Build spatial index for CPU-side culling
   class SpatialGrid {
     cells: Map<string, Point[]>
     
     insert(point: Point) {
       const cellKey = `${Math.floor(point.x / cellSize)},${Math.floor(point.y / cellSize)}`
       if (!this.cells.has(cellKey)) {
         this.cells.set(cellKey, [])
       }
       this.cells.get(cellKey)!.push(point)
     }
     
     query(mousePos: vec3, radius: number): Point[] {
       const candidates: Point[] = []
       // Only search nearby cells, not all points
       for (const cell of this.getCellsInRange(mousePos, radius)) {
         candidates.push(...this.cells.get(cell))
       }
       return candidates
     }
   }
   ```

4. **Hierarchical selection**:
   ```typescript
   // Check coarse first, then fine
   function findHoveredPoint(mousePos: vec3): number {
     // Step 1: Coarse - check cluster bounds
     const cluster = findCluster(mousePos)
     if (!cluster) return -1
     
     // Step 2: Medium - check spatial partition
     const candidates = cluster.spatialGrid.query(mousePos, threshold)
     if (candidates.length === 0) return -1
     
     // Step 3: Fine - exact distance check on small subset
     return findClosestPoint(mousePos, candidates)
   }
   ```

5. **Progressive refinement (coarse to fine)**:
   ```typescript
   // First pass: Quick approximation (screen space)
   function quickHoverCheck(mouseX: number, mouseY: number): number {
     // Check 2D distance on screen (much faster)
     // Use for early rejection
     // Only do expensive 3D check if 2D passes
   }
   
   // Second pass: Accurate 3D distance
   function accurateHoverCheck(pointIndex: number): boolean {
     // Compute exact 3D distance
     // Return true if within threshold
   }
   ```

**Detection:**
- Mouse movement lags behind cursor
- CPU usage spikes during hover
- Hover detection takes > 100ms to complete
- Browser becomes unresponsive

**Phase to address:** Point Hover Detection phase - Algorithm design focus

---

### Pitfall 6: Overlay Z-Index and Visibility Issues

**What goes wrong:**
Tag/image overlay appears behind WebGL canvas, is clipped by parent containers, or doesn't respond to pointer events properly. This happens when HTML overlay layering conflicts with WebGL canvas or z-index is incorrect.

**Why it happens:**
WebGL canvas and HTML overlay occupy the same screen space but are rendered by different systems:
- **WebGL**: GPU compositing, z-order determined by depth buffer
- **HTML**: DOM compositing, z-order determined by CSS z-index and document order

**Common mistakes:**

1. **Overlay behind canvas**:
   ```vue
   <!-- WRONG: Overlay comes after canvas in DOM -->
   <template>
     <WebGLCanvas />
     <TagOverlay />  <!-- Behind canvas, invisible -->
   </template>
   
   <!-- CORRECT: Overlay after canvas in DOM -->
   <template>
     <div class="webgl-container">
       <WebGLCanvas />
       <TagOverlay />  <!-- On top of canvas -->
     </div>
   </template>
   ```

2. **Incorrect z-index**:
   ```css
   /* WRONG: Overlay z-index too low */
   .tag-overlay {
     position: absolute;
     z-index: 1;  /* Below canvas or other elements */
   }
   
   /* CORRECT: High z-index for overlay */
   .tag-overlay {
     position: absolute;
     z-index: 1000;  /* Above all canvas elements */
     pointer-events: none;  /* Let mouse events pass through to canvas */
   }
   ```

3. **Overlay clipped by parent container**:
   ```vue
   <!-- WRONG: Parent has overflow: hidden -->
   <template>
     <div class="container" style="overflow: hidden">
       <WebGLCanvas />
       <TagOverlay />  <!-- Clipped at edges -->
     </div>
   </template>
   
   <!-- CORRECT: Parent allows overflow -->
   <template>
     <div class="container">
       <WebGLCanvas />
       <TagOverlay />  <!-- Fully visible -->
     </div>
   </template>
   ```

4. **Overlay doesn't position relative to canvas**:
   ```vue
   <!-- WRONG: Fixed positioning ignores canvas location -->
   <template>
     <WebGLCanvas />
     <TagOverlay 
       :x="100"
       :y="100"
       style="position: fixed;"  <!-- Ignores canvas position -->
     />
   </template>
   
   <!-- CORRECT: Absolute positioning relative to canvas container -->
   <template>
     <div class="webgl-container" style="position: relative;">
       <WebGLCanvas />
       <TagOverlay 
         :x="hoveredPointScreenX"
         :y="hoveredPointScreenY"
         style="position: absolute;"
       />
     </div>
   </template>
   ```

**Consequences:**
- Overlay appears but is invisible (behind canvas)
- Overlay partially visible (clipped at edges)
- Hover detection works but overlay doesn't show
- User confusion: "I can't see the tag"

**Prevention:**

1. **Ensure overlay comes after canvas in DOM**:
   ```vue
   <template>
     <div class="visualization-container">
       <!-- WebGL canvas first -->
       <WebGLCanvas ref="canvas" />
       
       <!-- Hover overlay second -->
       <HoverOverlay 
         v-if="hoveredPoint !== null"
         :point="hoveredPoint"
         :screen-position="hoveredPointScreenPos"
       />
     </div>
   </template>
   ```

2. **Use correct z-index layering**:
   ```css
   /* Canvas at base layer */
   .webgl-canvas {
     position: relative;
     z-index: 1;
   }
   
   /* Overlay above canvas */
   .hover-overlay {
     position: absolute;
     z-index: 10;
     pointer-events: none;  /* Don't block canvas mouse events */
   }
   
   /* UI controls above both */
   .controls-panel {
     position: relative;
     z-index: 100;
   }
   ```

3. **Allow overflow on container**:
   ```css
   /* WRONG: Clips overflow */
   .container {
     overflow: hidden;
     height: 100vh;
   }
   
   /* CORRECT: Allow overlay to extend beyond */
   .container {
     /* No overflow: hidden */
     min-height: 100vh;
   }
   
   /* Or overflow: visible if needed */
   .container {
     overflow: visible;
     min-height: 100vh;
   }
   ```

4. **Position overlay relative to canvas container**:
   ```vue
   <template>
     <div class="webgl-wrapper" ref="wrapper">
       <WebGLCanvas @ready="onCanvasReady" />
       
       <HoverOverlay
         v-if="showOverlay"
         :position="overlayPosition"
         class="hover-tag"
       />
     </div>
   </template>
   
   <script setup lang="ts">
   const wrapper = ref<HTMLDivElement>()
   const overlayPosition = ref({ x: 0, y: 0 })
   
   function onCanvasReady() {
     // Get canvas position in DOM
     const canvasRect = canvas.value!.getBoundingClientRect()
     const wrapperRect = wrapper.value!.getBoundingClientRect()
     
     // Position overlay relative to wrapper, accounting for canvas offset
     overlayPosition.value = {
       x: screenX - (canvasRect.left - wrapperRect.left),
       y: screenY - (canvasRect.top - wrapperRect.top)
     }
   }
   </script>
   
   <style scoped>
   .webgl-wrapper {
     position: relative;  /* Establish positioning context */
     width: 100%;
     height: 100%;
   }
   
   .hover-tag {
     position: absolute;
     z-index: 10;
     pointer-events: none;
   }
   </style>
   ```

**Detection:**
- Overlay doesn't appear when hovering
- Overlay appears but is partially hidden
- Overlay appears at wrong position
- Canvas blocks overlay visibility

**Phase to address:** Tag/Image Display phase - UI overlay focus

---

### Pitfall 7: Optional Data Columns Not Handled

**What goes wrong:**
Assuming `tag` and `image` columns always exist in data causes crashes when loading data without these optional fields. Silent failures or runtime errors occur.

**Why it happens:**
TypeScript type definitions assume fields exist, but runtime data may not have them. Null checks are missing.

**Consequences:**
- Application crashes on load
- "Cannot read property 'tag' of undefined" errors
- Hover detection works but display fails
- Data loading failures

**Prevention:**

1. **Graceful degradation for missing data**:
   ```typescript
   interface PointData {
     x: number
     y: number
     z: number
     cluster: number
     tag?: string      // Optional
     image?: string     // Optional
   }
   
   // Check if data has tag field
   function hasTagField(pointData: PointData[]): boolean {
     return pointData.length > 0 && 'tag' in pointData[0]
   }
   
   function hasImageField(pointData: PointData[]): boolean {
     return pointData.length > 0 && 'image' in pointData[0]
   }
   ```

2. **Silent skip missing fields**:
   ```typescript
   function getHoverDisplay(pointIndex: number): { tag?: string, image?: string } {
     const point = pointData[pointIndex]
     
     return {
       tag: 'tag' in point ? point.tag : undefined,
       image: 'image' in point ? point.image : undefined
     }
   }
   
   // In overlay component
   <HoverOverlay :point="hoverData" />
   ```

3. **Validate data structure on load**:
   ```typescript
   function validatePointData(data: unknown[]): { valid: boolean, hasTag: boolean, hasImage: boolean } {
     if (!Array.isArray(data) || data.length === 0) {
       return { valid: false, hasTag: false, hasImage: false }
     }
     
     const sample = data[0]
     
     return {
       valid: true,
       hasTag: typeof sample === 'object' && 'tag' in sample,
       hasImage: typeof sample === 'object' && 'image' in sample
     }
   }
   ```

4. **Update UI based on availability**:
   ```vue
   <template>
     <!-- Only show tag if data exists -->
     <div v-if="pointData.tag" class="hover-tag">
       {{ pointData.tag }}
     </div>
     
     <!-- Only show image if data exists -->
     <img v-if="pointData.image" :src="pointData.image" class="hover-image" />
     
     <!-- Fallback if neither exist -->
     <div v-if="!pointData.tag && !pointData.image" class="hover-info">
       Point #{{ pointIndex }}
     </div>
   </template>
   ```

**Detection:**
- Application crashes on data load
- Console errors about undefined properties
- Hover works but display fails
- TypeError: "Cannot read property 'tag' of null"

**Phase to address:** Data Loader Enhancement phase - Optional field handling

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 8: Accessibility - Keyboard Navigation Missing

**What goes wrong:**
Hover overlay only works with mouse, keyboard users cannot access point information. WCAG 2.1 requires accessible interaction.

**Why it happens:**
Implementing only mouse events, ignoring keyboard focus and screen reader users.

**Consequences:**
- Keyboard users cannot explore point data
- Screen reader doesn't announce hover info
- WCAG compliance issues
- Poor accessibility rating

**Prevention:**

1. **Add keyboard focus support**:
   ```vue
   <template>
     <!-- Add tabindex to canvas for keyboard focus -->
     <WebGLCanvas 
       tabindex="0"
       @keydown="onKeyDown"
       @mousemove="onMouseMove"
     />
     
     <!-- Show overlay on keyboard focus too -->
     <HoverOverlay 
       v-if="hoveredPoint !== null"
       :point="hoveredPoint"
       :focus-visible="isKeyboardNavigation"
     />
   </template>
   
   <script setup lang="ts">
   function onKeyDown(event: KeyboardEvent) {
     if (event.key === 'Tab') {
       // Allow Tab navigation to points
       // Find nearest point to focus
     }
     if (event.key === 'Enter' || event.key === ' ') {
       // Select current point
       showPointDetails(hoveredPoint.value)
     }
   }
   </script>
   ```

2. **Add ARIA attributes**:
   ```vue
   <template>
     <div
       ref="hoverOverlay"
       class="hover-overlay"
       role="tooltip"
       :aria-describedby="hoveredPoint ? `point-${hoveredPoint.id}` : undefined"
       v-if="hoveredPoint !== null"
     >
       <!-- Content announced by screen reader -->
       <div :id="`point-${hoveredPoint.id}`">
         {{ hoveredPoint.tag || `Point ${hoveredPoint.id}` }}
       </div>
       
       <!-- Image alt text -->
       <img 
         v-if="hoveredPoint.image"
         :src="hoveredPoint.image"
         :alt="hoveredPoint.tag || `Point ${hoveredPoint.id}`"
       />
     </div>
   </template>
   ```

3. **Escape key dismisses overlay**:
   ```vue
   <script setup lang="ts">
   import { onKeydown } from '@vueuse/core'
   
   function dismissOverlay() {
     hoveredPoint.value = null
   }
   
   onKeydown((event) => {
     if (event.key === 'Escape') {
       dismissOverlay()
     }
   })
   </script>
   ```

4. **Focus management**:
   ```vue
   <template>
     <WebGLCanvas
       @focus="onCanvasFocus"
       @blur="onCanvasBlur"
     />
     
     <HoverOverlay
       :visible="hoveredPoint !== null && (isCanvasFocused || isMouseOver)"
     />
   </template>
   
   <script setup lang="ts">
   const isCanvasFocused = ref(false)
   
   function onCanvasFocus() {
     isCanvasFocused.value = true
     // Announce current hover to screen readers
   }
   
   function onCanvasBlur() {
     isCanvasFocused.value = false
   }
   </script>
   ```

**Detection:**
- Keyboard users cannot access hover info
- Screen reader doesn't announce hover content
- Automated accessibility testing fails
- No way to dismiss overlay with keyboard

**Phase to address:** Tag/Image Display phase - Accessibility focus

---

### Pitfall 9: Canvas Resize Handling

**What goes wrong:**
Hover detection breaks or overlay misaligns when canvas is resized. Coordinate systems diverge because viewport, canvas size, and CSS size all change independently.

**Why it happens:**
Canvas resize triggers multiple events and state changes:
1. Browser resizes canvas CSS size
2. Application updates canvas drawing buffer size
3. WebGL viewport changes
4. Coordinate transformation uses stale size values

**Consequences:**
- Hover detection uses incorrect viewport
- Overlay position offset after resize
- Mouse position mapping breaks
- Performance regression if resize handler is inefficient

**Prevention:**

1. **ResizeObserver for canvas size changes**:
   ```typescript
   // In WebGLCanvas.vue
   const canvasElement = ref<HTMLCanvasElement>()
   let resizeObserver: ResizeObserver
   
   onMounted(() => {
     resizeObserver = new ResizeObserver((entries) => {
       for (const entry of entries) {
         const { width, height } = entry.contentRect
         handleCanvasResize(width, height)
       }
     })
     
     if (canvasElement.value) {
       resizeObserver.observe(canvasElement.value)
     }
   })
   
   onUnmounted(() => {
     if (resizeObserver) {
       resizeObserver.disconnect()
     }
   })
   ```

2. **Update viewport on resize**:
   ```typescript
   function handleCanvasResize(width: number, height: number) {
     // Update canvas drawing buffer
     gl.canvas.width = width
     gl.canvas.height = height
     
     // Update WebGL viewport
     gl.viewport(0, 0, width, height)
     
     // Notify other components of resize
     emit('canvas-resized', { width, height })
     
     // Re-render scene
     render()
   }
   ```

3. **Recalculate coordinate transformation on resize**:
   ```typescript
   // Store current viewport size for coordinate transforms
   let currentViewport = { x: 0, y: 0, width: 0, height: 0 }
   
   function updateViewport() {
     const viewport = new Int32Array(4)
     gl.getParameter(gl.VIEWPORT)
     
     currentViewport = {
       x: viewport[0],
       y: viewport[1],
       width: viewport[2],
       height: viewport[3]
     }
   }
   
   function worldToScreen(worldPos: vec3): { x: number, y: number } {
     // Use current viewport (updated on resize)
     const vp = currentViewport
     
     // ... transformation logic using vp
     return { x, y }
   }
   ```

4. **Throttle resize handling**:
   ```typescript
   let resizeTimeout: number | null = null
   
   function scheduleResize() {
     if (resizeTimeout) {
       clearTimeout(resizeTimeout)
     }
     
     // Debounce to avoid excessive recalculations
     resizeTimeout = setTimeout(() => {
       handleCanvasResize()
       resizeTimeout = null
     }, 100) as any
   }
   ```

**Detection:**
- Hover breaks after window resize
- Overlay position offset after resize
- Mouse position mapping incorrect
- Console errors about viewport size

**Phase to address:** Point Hover Detection phase - Resize handling focus

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| **Buffer Setup** | Buffer format/type mismatch causing read errors | Use standard RGBA + UNSIGNED_BYTE, check framebuffer status before reading |
| **Coordinate Transform** | 3D to 2D conversion with Y-axis flip | Correct transformation: clip → NDC → screen with viewport and aspect ratio |
| **Performance** | readPixels called every frame causing pipeline stalls | Throttle to 30fps, use 1x1 pixel buffer, cache hover state |
| **Algorithm Design** | CPU-side distance check on 30M points | GPU-side calculation, depth buffer selection, spatial partitioning |
| **Overlay UI** | Z-index issues, overlay behind canvas | Ensure DOM order (canvas first, overlay second), correct z-index |
| **Accessibility** | Mouse-only interaction, no keyboard support | Add ARIA attributes, keyboard navigation, Escape key dismiss |
| **Data Handling** | Crashes on missing optional tag/image fields | Graceful degradation, optional chaining, validate on load |
| **Resize Handling** | Hover breaks after canvas resize | ResizeObserver, update viewport, recalculate transforms |

---

## Implementation Recommendations

### Recommended Implementation Order

**Phase 1: Buffer Setup** (Foundation)
1. Create 1x1 pixel picking framebuffer with depth attachment
2. Use RGBA + UNSIGNED_BYTE format for portability
3. Check framebuffer completeness before use
4. Set up buffer for point index + depth output

**Phase 2: Coordinate System** (Foundation)
1. Implement correct 3D → 2D transformation
2. Account for Y-axis flip (WebGL UP, screen DOWN)
3. Use gl.viewport() for accurate mapping
4. Handle devicePixelRatio correctly
5. Match canvas CSS size to drawing buffer size

**Phase 3: Performance Optimization** (Critical)
1. Use 1x1 pixel picking buffer (not full screen)
2. Throttle readPixels calls (30fps target, not 60fps)
3. Cache last hover state (only read on change)
4. Implement GPU-side distance calculation
5. Use depth buffer for closest point selection

**Phase 4: Algorithm Design** (Critical for 30M points)
1. Spatial partitioning (octree or grid)
2. Progressive refinement (coarse → medium → fine)
3. GPU-side filtering before CPU read
4. Early rejection based on screen-space distance

**Phase 5: Overlay UI** (User Experience)
1. Ensure correct DOM order (canvas → overlay)
2. Set appropriate z-index (overlay > canvas)
3. Position relative to canvas container
4. Handle resize to maintain positioning

**Phase 6: Accessibility** (Compliance)
1. Add keyboard navigation (Tab, Enter/Space)
2. ARIA attributes for screen readers
3. Escape key to dismiss overlay
4. Focus management

**Phase 7: Data Handling** (Robustness)
1. Optional type safety (tag?, image?)
2. Graceful degradation (silently skip if missing)
3. Validate data structure on load
4. Update UI based on data availability

**Phase 8: Testing** (Quality)
1. Test with 10K, 1M, 10M, 30M point datasets
2. Test on different screen sizes
3. Test on different devicePixelRatio (Retina, 1x)
4. Test accessibility with keyboard-only navigation
5. Test performance profiler (measure GPU stall time)

---

## Sources

- **WebGL2Fundamentals.org - Picking** (HIGH confidence) - https://webgl2fundamentals.org/webgl/lessons/webgl-picking.html
  - Covers GPU-side picking techniques, 1x1 pixel optimization, depth-based selection

- **WebGL2Fundamentals.org - readPixels** (HIGH confidence) - https://webgl2fundamentals.org/webgl/lessons/webgl-readpixels.html
  - Format/type combinations, buffer reading constraints

- **WebGL2Fundamentals.org - Resizing Canvas** (HIGH confidence) - https://webgl2fundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
  - Canvas size vs CSS size, viewport handling, devicePixelRatio

- **Khronos WebGL Wiki - Context Loss** (MEDIUM confidence) - https://www.khronos.org/webgl/wiki/HandlingContextLost
  - GPU-CPU synchronization, context recovery patterns

- **W3C ARIA Tooltip Pattern** (MEDIUM confidence) - https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
  - ARIA attributes, keyboard navigation, accessibility requirements

- **WebGL Coordinate System Documentation** (HIGH confidence) - Codebase coordinate-system.md
  - Y-up right-handed system, quaternion camera conventions

- **Project Codebase Analysis** (HIGH confidence) - ShaderManager.ts, Camera.ts, WebGLCanvas.vue
  - Current implementation patterns, existing MVP matrices, camera orientation

---

*Pitfalls research for: WebGL Clusters Playground v1.2 Point Hover with Tag/Image Display*
*Researched: February 4, 2026*
*Focus: Buffer-based communication, 30M point performance, coordinate transformation, accessibility*
