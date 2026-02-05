<template>
  <div class="webgl-container">
    <WebGLCanvas
      ref="canvasRef"
      @webgl-ready="onWebGLReady"
      @webgl-error="onWebGLError"
      @mouse-move="onMouseMove"
      @mouse-wheel="onMouseWheel"
      @key-event="onKeyEvent"
    />
    
    <ControlsOverlay
      @file-selected="handleLoadFile"
      @table-selected="handleTableSelected"
      @switch-to-generated="switchToGenerated"
      @switch-to-loaded="switchToLoaded"
      :is-loading="isLoading"
      :current-file="currentFile"
      :current-data-source="currentDataSource"
      :point-data="pointData"
    />
    <DebugInfo v-if="camera"
      :camera="camera!.toDebugInfo()"
      :point-count="pointCount"
      :fps="fps"
    />

    <PointOverlay
      ref="overlayRef"
      v-if="overlayVisible"
      :tag="hoveredPointTag"
      :image="hoveredPointImage"
      :screen-x="overlayScreenPos.x"
      :screen-y="overlayScreenPos.y"
      :visible="overlayVisible"
    />

    <div v-if="error" class="error-overlay">
      <h3>WebGL Error</h3>
      <p>{{ error }}</p>
    </div>

    <!-- Error panel - collapsible with red accent -->
    <div v-if="errors.length > 0" class="error-panel">
      <div class="error-header" @click="toggleErrorPanel">
        <h3>Errors: {{ errors.length }}</h3>
        <button class="toggle-btn">{{ errorPanelExpanded ? '▼' : '▶' }}</button>
      </div>
      <div v-if="errorPanelExpanded" class="error-list">
        <div v-for="error in errors" :key="error.id" class="error-item">
          <span class="error-message">{{ error.message }}</span>
          <button @click.stop="dismissError(error.id)" class="dismiss-btn">×</button>
        </div>
      </div>
    </div>

    <!-- Loading overlay blocks UI during data loading -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-message">
        {{ currentDataSource === 'generated' ? 'Generating data...' : 'Loading data...' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import WebGLCanvas from '@/components/WebGLCanvas.vue'
import ControlsOverlay from '@/components/ControlsOverlay.vue'
import DebugInfo from '@/components/DebugInfo.vue'
import PointOverlay from '@/components/PointOverlay.vue'
import { Camera } from '@/core/Camera'
import { DataProvider, PointData } from '@/core/DataProvider'
import { ShaderManager } from '@/core/ShaderManager'

import { highlightedCluster, ppc } from '@/composables/settings'

console.log('WebGLPlayground script setup running...')

interface ErrorInfo {
  id: string
  message: string
  timestamp: number
}

/**
 * Main WebGL rendering component with camera controls for 3D point visualization.
 * @see Camera - Quaternion-based camera with Y-up coordinate system documentation
 */
const canvasRef = ref<InstanceType<typeof WebGLCanvas>>()
const error = ref<string>('')
const camera = ref<Camera>()
const pointCount = ref(0)
const fps = ref(0)

// Error array for multiple error management
const errors = ref<ErrorInfo[]>([])
const errorPanelExpanded = ref(false)

const isLoading = ref(false)
const currentFile = ref<File | null>(null)

enum DataSource { GENERATED = 'generated', LOADED = 'loaded' }

const currentDataSource = ref<DataSource>(DataSource.GENERATED)

// Error management functions
const addError = (message: string) => {
  errors.value.push({
    id: Date.now().toString(),
    message,
    timestamp: Date.now()
  })
  // Auto-expand panel when error added
  errorPanelExpanded.value = true
}

const clearErrors = () => {
  errors.value = []
}

const dismissError = (id: string) => {
  const index = errors.value.findIndex(e => e.id === id)
  if (index !== -1) {
    errors.value.splice(index, 1)
  }
  // Collapse panel if no errors remain
  if (errors.value.length === 0) {
    errorPanelExpanded.value = false
  }
}

const toggleErrorPanel = () => {
  errorPanelExpanded.value = !errorPanelExpanded.value
}

let animationId: number | null = null
let fpsCounter = 0
let lastFpsTime = 0
let shaderProgram: WebGLProgram | null = null
let positionBuffer: WebGLBuffer | null = null
let clusterIdBuffer: WebGLBuffer | null = null
let pointData: PointData | null = null
let shaderManager: ShaderManager | null = null
let glCache: WebGL2RenderingContext | WebGLRenderingContext

// Hover detection state
const mouseX = ref(0)
const mouseY = ref(0)
const lastMouseX = ref(0)
const lastMouseY = ref(0)
const hoverThresholds = ref<{cameraDistThreshold: number, cursorDistThreshold: number} | null>(null)

// Hovered point state for metadata retrieval
const hoveredPointIndex = ref(-1)
const hoveredPointTag = ref<string | null>(null)
const hoveredPointImage = ref<string | null>(null)

// Screen position for overlay with edge clamping
const overlayScreenPos = ref({x: 0, y: 0})

// Computed: overlay visible only when has metadata
const overlayVisible = computed(() => hoveredPointTag.value !== null || hoveredPointImage.value !== null)

// Template ref for PointOverlay component to measure dimensions
const overlayRef = ref<InstanceType<typeof PointOverlay> | null>(null)

watch(ppc, () => regenPoints())

/**
 * Initialize WebGL context, camera, and rendering loop.
 * @see Camera - Quaternion-based camera with Y-up coordinate system documentation
 */
const onWebGLReady = (gl: WebGL2RenderingContext | WebGLRenderingContext) => {
  camera.value = new Camera()
  glCache = gl
  regenPoints()
  setupShaders(gl)
  startRenderLoop()
}

const regenPoints = () => {
  try {
    pointData = DataProvider.getPointData(ppc.value)
    pointCount.value = pointData.positions.length / 3
    setupBuffers(glCache)

    // Calculate hover thresholds from point density
    const thresholds = calculatePointDensityThresholds(pointData.positions, pointCount.value)
    hoverThresholds.value = thresholds

    // Clear errors on successful data generation
    clearErrors()
  } catch (error) {
    console.error('Error regenerating points:', error)
    addError('Failed to regenerate data')
  }
}

const onWebGLError = (errorMessage: string) => {
  error.value = errorMessage
}

const handleLoadFile = async (file: File, tableName?: string) => {
  isLoading.value = true
  currentFile.value = file
  try {
    if (file.name.endsWith('.json')) {
      const loadedData = await DataProvider.loadFromFile(file)
      pointData = loadedData
      pointCount.value = loadedData.positions.length / 3
      setupBuffers(glCache)

      // Calculate hover thresholds from point density
      const thresholds = calculatePointDensityThresholds(loadedData.positions, pointCount.value)
      hoverThresholds.value = thresholds
    } else if (file.name.endsWith('.db') || file.name.endsWith('.sqlite')) {
      // GUARD: Don't load without tableName
      if (!tableName) {
        console.log('SQLite file selected, waiting for table choice')
        isLoading.value = false
        return  // EXIT: No buffers created
      }

      const result = await DataProvider.loadSqliteFile(file, tableName)
      pointData = result.pointData
      pointCount.value = result.pointData.positions.length / 3
      setupBuffers(glCache)

      // Calculate hover thresholds from point density
      const thresholds = calculatePointDensityThresholds(result.pointData.positions, pointCount.value)
      hoverThresholds.value = thresholds
    }

    // Clear errors on successful load (auto-dismiss behavior)
    clearErrors()
    currentDataSource.value = DataSource.LOADED  // Set data source on successful load
  } catch (error) {
    console.error('Error loading file:', error)
    // Brief message in UI, full details in console (CONTEXT.md decision)
    const briefMessage = error instanceof Error ? error.message : 'Error loading file'
    addError(briefMessage)

    // Preserve existing pointData on load failure (existing behavior)
  } finally {
    isLoading.value = false
  }
}

const handleTableSelected = (tableName: string) => {
  if (currentFile.value) {
    handleLoadFile(currentFile.value, tableName)
  }
}

/**
 * Calculate hover detection thresholds based on point density
 *
 * Samples subset of points to estimate average spacing, then derives thresholds.
 * Camera threshold: point must be within 5x avg spacing of camera.
 * Cursor threshold: point must be within 1.5x avg spacing of cursor.
 *
 * @param positions - Float32Array of point positions (x,y,z interleaved)
 * @param count - Number of points
 * @returns Thresholds for camera and cursor distance
 */
function calculatePointDensityThresholds(positions: Float32Array, count: number): {
  cameraDistThreshold: number,
  cursorDistThreshold: number
} {
  // Sample subset of points (avoid O(n^2) with large datasets)
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

    // Find nearest neighbor (simplified O(n) scan within sample)
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
  const avgSpacing = sampleCount > 0 ? totalNeighborDist / sampleCount : 1.0;

  // Thresholds: use point spacing as baseline
  const cameraDistThreshold = avgSpacing * 5.0;  // Camera must be within 5x avg spacing
  const cursorDistThreshold = avgSpacing * 1.5;  // Cursor must be within 1.5x avg spacing

  return { cameraDistThreshold, cursorDistThreshold };
}

/**
 * Find which point is hovered using same distance thresholds as shader
 *
 * CPU-side point selection that mirrors GPU hover detection logic.
 * Uses two-distance threshold: point must be within cameraDistThreshold AND cursorDistThreshold.
 *
 * @param pointData - Point data with positions array
 * @param cameraPos - Camera position in world space [x, y, z]
 * @param cursorWorldPos - Cursor position in world space {x, y, z}
 * @param cameraDistThreshold - Maximum distance from camera
 * @param cursorDistThreshold - Maximum distance from cursor
 * @returns Index of hovered point, or -1 if no point meets both criteria
 */
function findHoveredPointIndex(
  pointData: PointData,
  cameraPos: [number, number, number],
  cursorWorldPos: {x: number, y: number, z: number},
  cameraDistThreshold: number,
  cursorDistThreshold: number
): number {
  let bestIndex = -1;
  let bestDist = Infinity;

  for (let i = 0; i < pointData.count; i++) {
    const idx = i * 3;
    const px = pointData.positions[idx];
    const py = pointData.positions[idx + 1];
    const pz = pointData.positions[idx + 2];

    const distToCamera = Math.sqrt(
      Math.pow(cameraPos[0] - px, 2) +
      Math.pow(cameraPos[1] - py, 2) +
      Math.pow(cameraPos[2] - pz, 2)
    );
    const cameraNear = distToCamera < cameraDistThreshold;

    const distToCursor = Math.sqrt(
      Math.pow(cursorWorldPos.x - px, 2) +
      Math.pow(cursorWorldPos.y - py, 2) +
      Math.pow(cursorWorldPos.z - pz, 2)
    );
    const cursorNear = distToCursor < cursorDistThreshold;

    if (cameraNear && cursorNear) {
      if (distToCursor < bestDist) {
        bestDist = distToCursor;
        bestIndex = i;
      }
    }
  }

  return bestIndex;
}

const switchToGenerated = async () => {
  if (isLoading.value) return  // Prevent race condition (Pitfall 2)
  isLoading.value = true

  try {
    // Clear errors before switching (auto-dismiss behavior)
    clearErrors()

    // Clear old buffers to prevent memory leaks (Pitfall 1)
    if (positionBuffer) {
      glCache.deleteBuffer(positionBuffer)
      positionBuffer = null
    }
    if (clusterIdBuffer) {
      glCache.deleteBuffer(clusterIdBuffer)
      clusterIdBuffer = null
    }

    // Reset camera to default (CONTEXT.md decision)
    camera.value?.reset()

    // Reset cluster highlighting to show all (Pitfall 8)
    highlightedCluster.value = -1

    // Regenerate data
    regenPoints()
    setupBuffers(glCache)

    currentDataSource.value = DataSource.GENERATED
  } catch (error) {
    console.error('Error switching to generated data:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    addError(message)
  } finally {
    isLoading.value = false
  }
}

const switchToLoaded = async () => {
  if (isLoading.value) return  // Prevent race condition (Pitfall 2)
  if (!currentFile.value) {
    console.warn('No loaded file to switch to')
    return
  }

  isLoading.value = true

  try {
    // Clear errors before switching (auto-dismiss behavior)
    clearErrors()

    // Clear old buffers to prevent memory leaks (Pitfall 1)
    if (positionBuffer) {
      glCache.deleteBuffer(positionBuffer)
      positionBuffer = null
    }
    if (clusterIdBuffer) {
      glCache.deleteBuffer(clusterIdBuffer)
      clusterIdBuffer = null
    }

    // Reset camera to default (CONTEXT.md decision)
    camera.value?.reset()

    // Reset cluster highlighting to show all (Pitfall 8)
    highlightedCluster.value = -1

    // Reload current file
    await handleLoadFile(currentFile.value)

    currentDataSource.value = DataSource.LOADED
  } catch (error) {
    console.error('Error switching to loaded data:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    addError(message)
  } finally {
    isLoading.value = false
  }
}

// Old clearLoadError function replaced by clearErrors() from error array system
const onMouseMove = (event: { deltaX: number, deltaY: number, buttons: number, clientX: number, clientY: number }) => {
  // Track mouse position for hover detection (always update, even without button press)
  lastMouseX.value = event.clientX
  lastMouseY.value = event.clientY

  // Handle camera rotation when button is pressed
  if (camera.value && event.buttons > 0) {
    camera.value.handleMouseMove(event.deltaX, event.deltaY)
  }
}

const onMouseWheel = (delta: number) => {
  if (camera.value) {
    camera.value.handleMouseWheel(delta)
  }
}

const onKeyEvent = (event: { key: string, pressed: boolean }) => {
  if (camera.value) {
    camera.value.handleKeyEvent(event.key, event.pressed)
  }
}

const startRenderLoop = () => {
  const render = (timestamp: number) => {
    if (canvasRef.value && camera.value) {
      // Update camera
      camera.value.update()

      // Update hovered point state (CPU-side identification)
      if (hoverThresholds.value && pointData) {
        const canvas = canvasRef.value.canvasElement
        if (canvas && camera.value) {
          const aspect = canvas.width / canvas.height
          const uniforms = camera.value.getShaderUniforms(aspect)
          const cameraPos = uniforms.u_cameraPosition

          // Convert mouse to world space
          const worldPos = camera.value.convertMouseToWorld(
            lastMouseX.value,
            lastMouseY.value,
            canvas.width,
            canvas.height
          )

          // Find hovered point index
          const idx = findHoveredPointIndex(
            pointData,
            cameraPos,
            worldPos,
            hoverThresholds.value.cameraDistThreshold,
            hoverThresholds.value.cursorDistThreshold
          )

          // Update hovered point index
          hoveredPointIndex.value = idx

          // Reverse lookup for tag metadata (Map<string, number> -> find string by index)
          hoveredPointTag.value = null
          if (idx >= 0 && pointData.tagLookup && pointData.tagIndices) {
            const tagIndex = pointData.tagIndices[idx]
            if (tagIndex >= 0) {
              for (const [tag, index] of pointData.tagLookup.entries()) {
                if (index === tagIndex) {
                  hoveredPointTag.value = tag
                  break
                }
              }
            }
          }

          // Reverse lookup for image metadata (Map<string, number> -> find string by index)
          hoveredPointImage.value = null
          if (idx >= 0 && pointData.imageLookup && pointData.imageIndices) {
            const imageIndex = pointData.imageIndices[idx]
            if (imageIndex >= 0) {
              for (const [image, index] of pointData.imageLookup.entries()) {
                if (index === imageIndex) {
                  hoveredPointImage.value = image
                  break
                }
              }
            }
          }

          // Log hover state for debugging (verifies CPU-side tracking works)
          if (idx >= 0) {
            console.log('Hovered point:', idx, 'tag:', hoveredPointTag.value, 'image:', hoveredPointImage.value)
          }
        }

        // Calculate overlay screen position with edge clamping
        if (hoveredPointIndex.value >= 0 && pointData && camera.value && canvasRef.value) {
          const canvas = canvasRef.value.canvasElement;
          if (canvas) {
            // Get world position of hovered point
            const pointIdx = hoveredPointIndex.value * 3;
            const worldPos = {
              x: pointData.positions[pointIdx],
              y: pointData.positions[pointIdx + 1],
              z: pointData.positions[pointIdx + 2]
            };

            // Convert world to screen coordinates
            const screenPos = camera.value.worldToScreen(
              worldPos,
              canvas.width,
              canvas.height
            );

            if (screenPos) {
              // Measure actual overlay dimensions from DOM
              const dims = getOverlayDimensions(overlayRef);
              // Use fallback dimensions if overlay not available yet
              const overlayWidth = dims?.width || 140;
              const overlayHeight = dims?.height || 160;

              // Calculate position 15px above point
              const desiredX = screenPos.x;
              const desiredY = screenPos.y - 15;

              // Clamp X to ensure overlay stays within horizontal viewport bounds
              // Because overlay uses transform: translate(-50%, -100%),
              // x=0 positions center at left edge, so we need margin of overlayWidth/2
              const clampedX = Math.max(overlayWidth / 2, Math.min(desiredX, canvas.width - overlayWidth / 2));

              // Clamp Y to ensure overlay stays within vertical viewport bounds
              // Transform is translate(-50%, calc(-100% - 15px)):
              // -50% X: center point at screenX
              // calc(-100% - 15px) Y: position top edge at desiredY - 15px
              // So visible area is: [desiredY - height - 15px, desiredY - 15px]
              // Bottom of overlay is at: desiredY - height - 15px
              // Minimum Y must be overlayHeight + 15 (top at 0 with 15px CSS offset)
              // Maximum Y must be canvas.height (bottom at canvas.height)
              const clampedY = Math.max(overlayHeight + 15, Math.min(desiredY, canvas.height));

              overlayScreenPos.value = { x: clampedX, y: clampedY };
            } else {
              overlayScreenPos.value = { x: 0, y: 0 };
            }
          }
        } else {
          overlayScreenPos.value = { x: 0, y: 0 };
        }
      }

      // Update FPS counter

/**
 * Measure overlay dimensions from template ref
 *
 * Returns actual rendered dimensions of the PointOverlay component.
 * Returns null if overlay is not mounted yet.
 *
 * @param overlayRef - Ref to PointOverlay component instance
 * @returns Object with width/height, or null if not available
 */
function getOverlayDimensions(overlayRef: Ref<InstanceType<typeof PointOverlay> | null>): {width: number, height: number} | null {
  if (!overlayRef.value) return null;

  // Access the exposed overlayRef from component instance
  const element = overlayRef.value.overlayRef?.value;
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}


      fpsCounter++
      if (timestamp - lastFpsTime >= 1000) {
        fps.value = Math.round((fpsCounter * 1000) / (timestamp - lastFpsTime))
        fpsCounter = 0
        lastFpsTime = timestamp
      }
      
      // Clear and render
      if (canvasRef.value && shaderProgram && positionBuffer) {
        const gl = canvasRef.value.getGL()
        if (gl && camera.value) {
          gl.clearColor(0, 0, 0, 1);
          gl.clear(gl.COLOR_BUFFER_BIT /*| gl.DEPTH_BUFFER_BIT */)
          
          gl.useProgram(shaderProgram)
          
          // Set camera uniforms for GPU matrix calculation
          const canvas = canvasRef.value.canvasElement
          const aspect = canvas ? canvas.width / canvas.height : 1.0
          const uniforms = camera.value.getShaderUniforms(aspect)

          // Pass pre-computed view and MVP matrices (quaternion-based, no gimbal lock)
          gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, 'u_viewMatrix'), false, uniforms.u_viewMatrix)
          gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, 'u_mvpMatrix'), false, uniforms.u_mvpMatrix)
          gl.uniform3fv(gl.getUniformLocation(shaderProgram, 'u_cameraPosition'), uniforms.u_cameraPosition)
          gl.uniform2fv(gl.getUniformLocation(shaderProgram, 'u_cameraRotation'), uniforms.u_cameraRotation)
          gl.uniform1f(gl.getUniformLocation(shaderProgram, 'u_fov'), uniforms.u_fov)
          gl.uniform1f(gl.getUniformLocation(shaderProgram, 'u_aspect'), uniforms.u_aspect)
          gl.uniform1f(gl.getUniformLocation(shaderProgram, 'u_near'), uniforms.u_near)
          gl.uniform1f(gl.getUniformLocation(shaderProgram, 'u_far'), uniforms.u_far)
          gl.uniform1f(gl.getUniformLocation(shaderProgram, 'u_pointSize'), 10.0)
          gl.uniform1f(gl.getUniformLocation(shaderProgram, 'u_hilighted_cluster'), highlightedCluster.value)

          // Update hover detection uniforms
          if (hoverThresholds.value && camera.value) {
            const canvas = canvasRef.value.canvasElement
            if (canvas) {
              // Convert mouse position to world space
              const worldPos = camera.value.convertMouseToWorld(
                lastMouseX.value,
                lastMouseY.value,
                canvas.width,
                canvas.height
              )

              // Pass cursor world position to shader
              // Note: Shader uses vec2 uniform (x,y) with z implicitly 0
              // This is sufficient for hover detection on the z=0 plane
              gl.uniform2f(
                gl.getUniformLocation(shaderProgram, 'u_cursorWorldPos'),
                worldPos.x,
                worldPos.y
              )

              // Pass distance thresholds to shader
              gl.uniform1f(
                gl.getUniformLocation(shaderProgram, 'u_cameraDistThreshold'),
                hoverThresholds.value.cameraDistThreshold
              )
              gl.uniform1f(
                gl.getUniformLocation(shaderProgram, 'u_cursorDistThreshold'),
                hoverThresholds.value.cursorDistThreshold
              )
            }
          }

          // Bind position buffer
          gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
          const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position')
          gl.enableVertexAttribArray(positionLocation)
          gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0)
          
          // Bind cluster ID buffer
          gl.bindBuffer(gl.ARRAY_BUFFER, clusterIdBuffer)
          const clusterIdLocation = gl.getAttribLocation(shaderProgram, 'a_clusterId')
          
          if (clusterIdLocation === -1) {
            // ignore to not spam logs. It will work once we use the attribute
          } else {
            gl.enableVertexAttribArray(clusterIdLocation)
            gl.vertexAttribPointer(clusterIdLocation, 1, gl.FLOAT, false, 0, 0)
          }
          
          // Check for WebGL errors
          let error = gl.getError()
          if (error !== gl.NO_ERROR) {
            console.error('WebGL error before draw:', error)
          }
          
          // Draw points
          if (pointCount.value > 0) {
            gl.drawArrays(gl.POINTS, 0, pointCount.value)
          }

          error = gl.getError()
          if (error !== gl.NO_ERROR) {
            console.error('WebGL error after draw:', error)
          }
        }
      }
    }
    
    animationId = requestAnimationFrame(render)
  }
  
  animationId = requestAnimationFrame(render)
}

const setupShaders = (gl: WebGL2RenderingContext | WebGLRenderingContext) => {
  shaderManager = new ShaderManager(gl)
  
  // Use debug shaders for testing - switch back to getGPUMatrixShaders() once working
  const shaderSource = shaderManager.getGPUMatrixShaders()
  
  const compiledShader = shaderManager.createShaderProgram(shaderSource, 'gpuMatrix')
  shaderProgram = compiledShader.program
  
  // Setup rendering state
  shaderManager.setupAdditivePointRendering()
}

const setupBuffers = (gl: WebGL2RenderingContext | WebGLRenderingContext) => {
  // Delete old buffers first (prevents GPU memory leak)
  if (positionBuffer) {
    gl.deleteBuffer(positionBuffer)
    positionBuffer = null
  }
  if (clusterIdBuffer) {
    gl.deleteBuffer(clusterIdBuffer)
    clusterIdBuffer = null
  }

  // Create new buffers
  positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, pointData!.positions, gl.STATIC_DRAW)
  
  clusterIdBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, clusterIdBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, pointData!.clusterIds, gl.STATIC_DRAW)
}

onMounted(() => {
  console.log('WebGLPlayground mounted!')
})

onUnmounted(() => {
  // WebGL resource cleanup (prevents GPU memory leaks)
  const gl = glCache
  if (!gl) return

  // Delete resources in reverse order of creation
  // 1. Delete shader program first (depends on shaders)
  if (shaderProgram) {
    gl.deleteProgram(shaderProgram)
    shaderProgram = null
  }

  // 2. Delete shaders (held by ShaderManager)
  if (shaderManager) {
    shaderManager.cleanup()
    shaderManager = null
  }

  // 3. Delete buffers
  if (positionBuffer) {
    gl.deleteBuffer(positionBuffer)
    positionBuffer = null
  }
  if (clusterIdBuffer) {
    gl.deleteBuffer(clusterIdBuffer)
    clusterIdBuffer = null
  }

  // Clear context reference
  glCache = null as any

  // Cancel animation frame
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.webgl-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.error-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 0, 0, 0.9);
  color: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  z-index: 1000;
}

.error-overlay h3 {
  margin: 0 0 10px 0;
  color: #ff6b6b;
}

.load-error-panel {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 0, 0, 0.9);
  color: white;
  padding: 15px;
  border-radius: 8px;
  max-width: 400px;
  text-align: center;
  z-index: 100;
}

.load-error-panel h3 {
  margin: 0 0 10px 0;
}

.load-error-panel button {
  margin-top: 10px;
  padding:5px 10px;
  background: white;
  color: red;
  border: none;
  border-radius:4px;
  cursor: pointer;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  pointer-events: none;
}

.loading-message {
  background: rgba(0, 0, 0, 0.9);
  color: #4CAF50;
  padding: 20px 40px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 14px;
}

.error-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid #f44336;
  border-radius: 8px;
  color: white;
  font-size: 11px;
  font-family: monospace;
  max-width: 300px;
  max-height: 400px;
  z-index: 150;
  backdrop-filter: blur(5px);
  overflow: hidden;
}

.error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(244, 67, 54, 0.2);
  cursor: pointer;
  border-bottom: 1px solid rgba(244, 67, 54, 0.3);
}

.error-header h3 {
  margin: 0;
  color: #ffcdd2;
  font-size: 12px;
}

.toggle-btn {
  background: transparent;
  border: none;
  color: #f44336;
  cursor: pointer;
  font-size: 10px;
  padding: 0;
}

.error-list {
  max-height: 350px;
  overflow-y: auto;
  padding: 0;
  margin: 0;
}

.error-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: rgba(244, 67, 54, 0.1);
  border-left: 3px solid #f44336;
  margin-bottom: 4px;
}

.error-item:last-child {
  margin-bottom: 0;
}

.error-message {
  flex: 1;
  word-wrap: break-word;
  padding-right: 8px;
  color: #ffcdd2;
}

.dismiss-btn {
  background: transparent;
  border: none;
  color: #f44336;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0;
  margin-left: 4px;
  flex-shrink: 0;
}

.dismiss-btn:hover {
  color: #ff8a80;
}

.error-list::-webkit-scrollbar {
  width: 6px;
}

.error-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
}

.error-list::-webkit-scrollbar-thumb {
  background: rgba(244, 67, 54, 0.5);
  border-radius: 3px;
}
</style>
