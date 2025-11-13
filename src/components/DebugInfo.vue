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
  </div>
</template>

<script setup lang="ts">
import { Vec3 } from '@/core/Math'

interface Props {
  camera?: {
    position: Vec3
    rotation: { x: number, y: number }
    distance: number
  }
  pointCount: number
  fps: number
}

defineProps<Props>()

const formatVector = (vec: Vec3) => {
  return `(${vec.x.toFixed(2)}, ${vec.y.toFixed(2)}, ${vec.z.toFixed(2)})`
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
</style>
