<template>
  <div ref="overlayRef" v-if="visible" class="point-overlay">
    <div class="overlay-content" :style="{ left: screenX + 'px', top: screenY + 'px' }">
      <img v-if="hasImage" :src="imageSrc" alt="Point image" class="point-image" />
      <span v-if="hasTag" class="tag-badge">{{ tag }}</span>
      <span v-if="!hasTag && !hasImage" class="point-fallback">Point{{ pointIndex >= 0 ? ` #${pointIndex}` : '' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { localImageSrc } from '@/utils/localImageUrl'

interface Props {
  tag: string | null
  image: string | null
  pointIndex?: number
  screenX: number
  screenY: number
  visible: boolean
}

const props = withDefaults(defineProps<Props>(), { pointIndex: -1 })

// Template ref for dynamic dimension measurement
const overlayRef = ref<HTMLElement | null>(null)

// Expose ref for parent to measure dimensions
defineExpose<{
  overlayRef: typeof overlayRef
}>()

const hasTag = computed(() => props.tag !== null && props.tag !== '')
const hasImage = computed(() => props.image !== null && props.image !== '')
const tag = computed(() => props.tag || '')

// file:// URLs are proxied via Vite dev server at /local-image so they load
const imageSrc = computed(() => localImageSrc(props.image))
</script>

<style scoped>
.point-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 150;
}

.overlay-content {
  position: absolute;
  transform: translate(-50%, -100%);
  width: 100px;
  height: 100px;
  background: transparent;
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
  background: transparent;
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

.point-fallback {
  font-size: 12px;
  color: #666;
  font-style: italic;
}
</style>
