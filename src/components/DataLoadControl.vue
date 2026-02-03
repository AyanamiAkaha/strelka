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
      accept=".json,.db,.sqlite"
      style="display: none"
      @change="handleFileSelect"
    />

    <!-- Table selection UI for SQLite files -->
    <div v-if="availableTables.length > 0" class="table-selection">
      <label for="table-select">Select table:</label>
      <select
        id="table-select"
        v-model="selectedTable"
        :disabled="props.isLoading"
      >
        <option v-for="name in availableTables" :key="name" :value="name">
          {{ name }}
        </option>
      </select>
      <button
        class="load-table-btn"
        @click="handleTableChange"
        :disabled="props.isLoading || !selectedTable"
      >
        Load
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { DataProvider } from '@/core/DataProvider'

const emit = defineEmits<{
  'file-selected': [file: File],
  'table-selected': [tableName: string]
}>()

const props = defineProps<{
  isLoading: boolean
  file: File | null
}>()

const fileInputRef = ref<HTMLInputElement>()
const isDragging = ref(false)
const availableTables = ref<string[]>([])
const selectedTable = ref<string>('')
const currentFile = ref<File | null>(null)

const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    currentFile.value = file
    await processFile(file)
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

const handleDrop = async (event: DragEvent) => {
  event.preventDefault() // Required per RESEARCH.md Pitfall 2

  const file = event.dataTransfer?.files?.[0]
  if (file) {
    currentFile.value = file
    await processFile(file)
  }
  isDragging.value = false
}

const processFile = async (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  try {
    if (extension === 'db' || extension === 'sqlite') {
      // SQLite file - load and show table selection
      const result = await DataProvider.loadSqliteFile(file)
      availableTables.value = result.tables
      emit('file-selected', file)

      // If there's only one table, auto-select it
      if (result.tables.length === 1) {
        selectedTable.value = result.tables[0]
      }
    } else {
      // JSON: emit only file reference, no data loading
      emit('file-selected', file)
    }
  } catch (error) {
    // Emit file-selected event even on error to let parent handle error display
    emit('file-selected', file)
  }
}

const handleTableChange = () => {
  if (selectedTable.value) {
    emit('table-selected', selectedTable.value)
  }
}

// Watch for prop file changes (for table selection reload)
watch(() => props.file, (newFile) => {
  currentFile.value = newFile
})
</script>

<style scoped>
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

.table-selection {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-selection label {
  color: #4CAF50;
  font-size: 11px;
  font-family: monospace;
}

.table-selection select {
  background: rgba(0, 0, 0, 0.8);
  color: #4CAF50;
  border: 1px solid #4CAF50;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-family: monospace;
  cursor: pointer;
}

.table-selection select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.table-selection select:hover:not(:disabled) {
  background: rgba(76, 175, 80, 0.3);
}

.load-table-btn {
  background: rgba(0, 0, 0, 0.8);
  color: #4CAF50;
  border: 1px solid #4CAF50;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-family: monospace;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.load-table-btn:hover:not(:disabled) {
  background: rgba(76, 175, 80, 0.3);
  color: #69F0AE;
}

.load-table-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
