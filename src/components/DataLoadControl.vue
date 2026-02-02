<template>
  <div
    class="data-load-control"
    :class="{ 'isDragging': isDragging }"
    @dragover="handleDragOver"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <button @click="triggerFileSelect">Load JSON</button>
    <input
      ref="fileInputRef"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ 'file-selected': [file: File] }>()
const fileInputRef = ref<HTMLInputElement>()
const isDragging = ref(false)

const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    emit('file-selected', file)
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault() // Required per RESEARCH.md Pitfall 2
}

const handleDragEnter = () => {
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault() // Required per RESEARCH.md Pitfall 2

  const file = event.dataTransfer?.files?.[0]
  if (file) {
    emit('file-selected', file)
  }
  isDragging.value = false
}
</script>

<style scoped>
.data-load-control {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
}

.data-load-control button {
  background: rgba(0, 0, 0, 0.8);
  color: #4CAF50;
  border: 1px solid #4CAF50;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.data-load-control button:hover {
  background: rgba(76, 175, 80, 0.3);
  color: #69F0AE;
}

.data-load-control.isDragging {
  background: rgba(76, 175, 80, 0.2);
  border-radius: 4px;
  padding: 8px;
}
</style>
