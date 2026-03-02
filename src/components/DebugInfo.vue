<template>
  <div class="debug-info">
    <h4>Debug Info</h4>
    <div>FPS: {{ fps }}</div>
    <div>Points: {{ pointCount }}</div>
    <div v-if="camera">
      <div>Pos: {{ formatVector(camera.position) }}</div>
      <div>Rot: {{ formatRotation(camera.rotation) }}</div>
      <div>Zoom: {{ camera.distance.toFixed(1) }}</div>
    </div>
    <div v-if="gamepadLookSpeed != null">GP look: {{ gamepadLookSpeed.toFixed(1) }}</div>
    <div v-if="hoverDebug" class="hover-debug">
      <h5>Cursor / Hover</h5>
      <div>Screen: ({{ hoverDebug.cursorScreen.x }}, {{ hoverDebug.cursorScreen.y }})</div>
      <div v-if="hoverDebug.cursorGLScreen">
        Cursor GL screen: {{ formatVector(hoverDebug.cursorGLScreen) }}
      </div>
      <div v-if="hoverDebug.cursorDistThreshold != null">
        Thresholds: cam {{ hoverDebug.cameraDistThreshold?.toFixed(3) }}, cursor {{ hoverDebug.cursorDistThreshold?.toFixed(3) }}
      </div>
      <div>Hovered index: {{ hoverDebug.hoveredIndex }}</div>
      <div>Tag: <template v-if="hoverDebug.hoveredTag != null">{{ hoverDebug.hoveredTag }}</template><i v-else>null</i></div>
      <div>Image: <template v-if="hoverDebug.hoveredImage != null">{{ hoverDebug.hoveredImage }}</template><i v-else>null</i></div>
      <img class="debug-image" v-if="hoverDebug.hoveredImage != null" :src="localImageSrc(hoverDebug.hoveredImage)" alt="Hovered image" />
      <div v-if="hoverDebug.hoveredPointWorld">
        Point world: {{ formatVector(hoverDebug.hoveredPointWorld) }}
      </div>
      <div v-if="hoverDebug.distToCursor != null">
        distToCursor: {{ hoverDebug.distToCursor.toFixed(4) }}
      </div>
      <div v-if="hoverDebug.distToCamera != null">
        distToCamera: {{ hoverDebug.distToCamera.toFixed(4) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { localImageSrc } from '@/utils/localImageUrl'
/**
 * Debug display component for camera state and rendering metrics.
 * @see Camera.toDebugInfo() - Method providing debug position, rotation, and distance data
 * @see Camera - Camera class with Y-up coordinate system documentation
 */
interface HoverDebugInfo {
  cursorScreen: { x: number, y: number }
  cursorGLScreen: { x: number, y: number } | null
  cameraDistThreshold: number | null
  cursorDistThreshold: number | null
  hoveredIndex: number
  hoveredPointWorld: { x: number, y: number, z: number } | null
  hoveredTag: string | null
  hoveredImage: string | null
  distToCursor: number | null
  distToCamera: number | null
}

interface Props {
  camera?: {
    position: { x: number, y: number, z: number }
    rotation: { x: number, y: number }
    distance: number
  }
  pointCount: number
  fps: number
  hoverDebug?: HoverDebugInfo | null
  gamepadLookSpeed?: number | null
}

defineProps<Props>()

const formatVector = (vec: { x: number, y: number, z?: number }) => {
  if (vec.z) {
    return `(${vec.x.toFixed(2)}, ${vec.y.toFixed(2)}, ${vec.z.toFixed(2)})`
  }
  return `(${vec.x.toFixed(2)}, ${vec.y.toFixed(2)})`
}

const formatRotation = (rot: { x: number, y: number }) => {
  return `(${(rot.x * 180 / Math.PI).toFixed(1)}°, ${(rot.y * 180 / Math.PI).toFixed(1)}°)`
}
</script>

<style scoped>
.debug-info {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 15px;
  border-radius: 8px;
  color: white;
  font-size: 12px;
  font-family: monospace;
  z-index: 100;
  backdrop-filter: blur(5px);
  min-width: 160px;
}

.debug-info h4 {
  margin: 0 0 10px 0;
  color: #4CAF50;
}

.debug-info > div {
  margin-bottom: 4px;
}

.hover-debug {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.hover-debug h5 {
  margin: 0 0 6px 0;
  color: #81C784;
  font-size: 11px;
}

.debug-image {
  width: 100px;
  height: 100px;
  object-fit: contain;
  border-radius: 4px;
}
</style>
