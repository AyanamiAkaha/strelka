<template>
  <div v-if="visible && (hasTag || hasImage)" class="point-overlay">
    <div class="overlay-content" :style="{ left: screenX + 'px', top: screenY + 'px' }">

      <img v-if="hasImage" :src="imageUrl" alt="Point image" class="point-image" />

      <span v-if="hasTag" class="tag-badge">{{ tag }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  tag: string | null
  image: string | null
  screenX: number
  screenY: number
  visible: boolean
}

const props = defineProps<Props>()

const hasTag = computed(() => props.tag !== null && props.tag !== '')
const hasImage = computed(() => props.image !== null && props.image !== '')
const imageUrl = computed(() => props.image || '')
const tag = computed(() => props.tag || '')
</script>

<style scoped>
.point-overlay {
  position: absolute;
  pointer-events: none;
  z-index: 50;
}

.overlay-content {
  position: absolute;
  transform: translate(-50%, -100%);
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.point-image {
  width: 100px;
  height: 100px;
  object-fit: contain;
  border-radius: 4px;
  background: #f0f0f0;
}

.tag-badge {
  display: inline-block;
  padding: 6px 14px;
  background: #4CAF50;
  color: white;
  border-radius: 9999px;
  font-size: 12px;
  font-family: monospace;
  white-space: nowrap;
  font-weight: 600;
}
</style>
