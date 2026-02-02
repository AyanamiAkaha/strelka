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
    />
    <DebugInfo v-if="camera"
      :camera="camera!.toDebugInfo()"
      :point-count="pointCount"
      :fps="fps"
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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import WebGLCanvas from '@/components/WebGLCanvas.vue'
import ControlsOverlay from '@/components/ControlsOverlay.vue'
import DebugInfo from '@/components/DebugInfo.vue'
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

watch(ppc, () => regenPoints())

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
    } else if (file.name.endsWith('.db') || file.name.endsWith('.sqlite')) {
      const result = await DataProvider.loadSqliteFile(file, tableName)
      pointData = result.pointData
      pointCount.value = result.pointData.positions.length / 3
      console.log('Loaded point data from SQLite file:', pointData.positions.slice(0, 10), '...; total points:', pointCount.value),
      setupBuffers(glCache)
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

  isLoading.value = true

  try {
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

    // Reload the current file
    await handleLoadFile(currentFile.value)

    currentDataSource.value = DataSource.LOADED
  } catch (error) {
    console.error('Error switching to loaded data:', error)
  } finally {
    isLoading.value = false
  }
}

// Old clearLoadError function replaced by clearErrors() from error array system
const onMouseMove = (event: { deltaX: number, deltaY: number, buttons: number }) => {
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
      
      // Update FPS counter
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
          gl.drawArrays(gl.POINTS, 0, pointCount.value)
          
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
