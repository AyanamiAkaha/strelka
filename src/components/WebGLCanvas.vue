<template>
  <canvas
    ref="canvasElement"
    :width="canvasSize.width"
    :height="canvasSize.height"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @wheel="onWheel"
    tabindex="0"
    @keydown="onKeyDown"
    @keyup="onKeyUp"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive } from 'vue'

interface Emits {
  (e: 'webgl-ready', gl: WebGL2RenderingContext | WebGLRenderingContext): void
  (e: 'webgl-error', error: string): void
  (e: 'mouse-move', event: { deltaX: number, deltaY: number, buttons: number, clientX: number, clientY: number }): void
  (e: 'mouse-wheel', delta: number): void
  (e: 'key-event', event: { key: string, pressed: boolean }): void
}

const emit = defineEmits<Emits>()

const canvasElement = ref<HTMLCanvasElement>()
const gl = ref<WebGL2RenderingContext | WebGLRenderingContext>()

const canvasSize = reactive({
  width: 800,
  height: 600
})

const mouseState = reactive({
  isDown: false,
  lastX: 0,
  lastY: 0,
  buttons: 0
})

const keyState = reactive<Record<string, boolean>>({})

const initWebGL = () => {
  if (!canvasElement.value) return

  // Try WebGL2 first, fallback to WebGL1
  const context = canvasElement.value.getContext('webgl2') || 
                 canvasElement.value.getContext('webgl') ||
                 canvasElement.value.getContext('experimental-webgl')

  if (!context || !('drawArrays' in context)) {
    emit('webgl-error', 'WebGL is not supported in this browser')
    return
  }

  gl.value = context as WebGL2RenderingContext | WebGLRenderingContext

  // Configure WebGL settings for optimal point rendering
  // gl.value.enable(gl.value.DEPTH_TEST)
  gl.value.enable(gl.value.BLEND)
  
  // Use additive blending for better performance (can be changed later)
  gl.value.blendFunc(gl.value.SRC_ALPHA, gl.value.ONE)
  gl.value.depthMask(false) // Disable depth writes for additive blending
  
  // Black background works better with additive blending
  gl.value.clearColor(0.0, 0.0, 0.0, 1.0)

  // Set viewport
  updateViewport()

  console.log('WebGL initialized:', {
    version: gl.value.getParameter(gl.value.VERSION),
    vendor: gl.value.getParameter(gl.value.VENDOR),
    renderer: gl.value.getParameter(gl.value.RENDERER)
  })

  emit('webgl-ready', gl.value)
}

const updateViewport = () => {
  if (gl.value && canvasElement.value) {
    gl.value.viewport(0, 0, canvasElement.value.width, canvasElement.value.height)
  }
}

const resizeCanvas = () => {
  if (!canvasElement.value) return

  const rect = canvasElement.value.getBoundingClientRect()
  const pixelRatio = window.devicePixelRatio || 1

  canvasSize.width = rect.width * pixelRatio
  canvasSize.height = rect.height * pixelRatio

  updateViewport()
}

// Mouse event handlers
const onMouseDown = (event: MouseEvent) => {
  // Only respond to left mouse button (button 0)
  if (event.button !== 0) return
  
  mouseState.isDown = true
  mouseState.lastX = event.clientX
  mouseState.lastY = event.clientY
  mouseState.buttons = event.buttons

  // Focus canvas for keyboard events
  canvasElement.value?.focus()
}

const onMouseMove = (event: MouseEvent) => {
  const deltaX = event.clientX - mouseState.lastX
  const deltaY = event.clientY - mouseState.lastY

  // Always emit mouse-move for hover detection (even when button not pressed)
  emit('mouse-move', {
    deltaX,
    deltaY,
    buttons: mouseState.buttons,
    clientX: event.clientX,
    clientY: event.clientY
  })

  mouseState.lastX = event.clientX
  mouseState.lastY = event.clientY
}

const onMouseUp = () => {
  mouseState.isDown = false
  mouseState.buttons = 0
}

const onWheel = (event: WheelEvent) => {
  event.preventDefault()
  emit('mouse-wheel', event.deltaY)
}

// Keyboard event handlers
const onKeyDown = (event: KeyboardEvent) => {
  const key = event.key.toLowerCase()
  if (!keyState[key]) {
    keyState[key] = true
    emit('key-event', { key, pressed: true })
  }
}

const onKeyUp = (event: KeyboardEvent) => {
  const key = event.key.toLowerCase()
  keyState[key] = false
  emit('key-event', { key, pressed: false })
}

// Expose methods for parent component
const clear = () => {
  if (gl.value) {
    gl.value.clear(gl.value.COLOR_BUFFER_BIT /*| gl.value.DEPTH_BUFFER_BIT */)
  }
}

const getGL = () => gl.value

defineExpose({
  clear,
  getGL,
  canvasElement: canvasElement
})

onMounted(() => {
  console.log('WebGLCanvas mounted')
  initWebGL()
  
  // Handle window resize
  const resizeObserver = new ResizeObserver(resizeCanvas)
  if (canvasElement.value) {
    resizeObserver.observe(canvasElement.value)
  }
  
  // Initial resize
  setTimeout(resizeCanvas, 0)
  
  // Global mouse up handler (in case mouse leaves canvas)
  window.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mouseup', onMouseUp)
})
</script>

<style scoped>
canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: grab;
}

canvas:active {
  cursor: grabbing;
}

canvas:focus {
  outline: 2px solid #4CAF50;
  outline-offset: -2px;
}
</style>
