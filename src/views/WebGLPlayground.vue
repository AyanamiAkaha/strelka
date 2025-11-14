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
    
    <ControlsOverlay />
    <DebugInfo v-if="camera"
      :camera="camera!.toDebugInfo()"
      :point-count="pointCount"
      :fps="fps"
    />
    
    <div v-if="error" class="error-overlay">
      <h3>WebGL Error</h3>
      <p>{{ error }}</p>
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

const canvasRef = ref<InstanceType<typeof WebGLCanvas>>()
const error = ref<string>('')
const camera = ref<Camera>()
const pointCount = ref(0)
const fps = ref(0)

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
  pointData = DataProvider.getPointData(ppc.value)
  pointCount.value = pointData.positions.length / 3
  setupBuffers(glCache)
}

const onWebGLError = (errorMessage: string) => {
  error.value = errorMessage
}

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
          
          gl.uniform3fv(gl.getUniformLocation(shaderProgram, 'u_cameraPosition'), [camera.value.position.x, camera.value.position.y, camera.value.position.z])
          gl.uniform2fv(gl.getUniformLocation(shaderProgram, 'u_cameraRotation'), [camera.value.rotation.x, camera.value.rotation.y])
          gl.uniform1f(gl.getUniformLocation(shaderProgram, 'u_fov'), camera.value.fov * Math.PI / 180)
          gl.uniform1f(gl.getUniformLocation(shaderProgram, 'u_aspect'), aspect)
          gl.uniform1f(gl.getUniformLocation(shaderProgram, 'u_near'), camera.value.near)
          gl.uniform1f(gl.getUniformLocation(shaderProgram, 'u_far'), camera.value.far)
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
