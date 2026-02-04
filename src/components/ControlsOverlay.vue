<template>
  <div class="controls-overlay">
    <div class="data-loading">
      <h4>Data Loading</h4>
      <DataLoadControl
        @file-selected="handleFileSelected"
        @table-selected="handleTableSelected"
        :is-loading="isLoading"
        :file="currentFile"
      />
    </div>
    <div class="data-source-controls">
      <div class="data-source-label">Data Source:</div>
      <div class="data-source-buttons">
        <button
          class="data-source-btn"
          :class="{ active: currentDataSource === 'generated' }"
          @click="emit('switch-to-generated')"
        >
          Generate
        </button>
        <button
          class="data-source-btn"
          :class="{ active: currentDataSource === 'loaded' }"
          @click="emit('switch-to-loaded')"
        >
          Load
        </button>
      </div>
    </div>
    <div>
      <h4>Controls</h4>
      <ul>
        <li><strong>Mouse:</strong> Look around</li>
        <li><strong>WASD:</strong> Move camera</li>
        <li><strong>QE:</strong> Up/Down</li>
        <li><strong>Scroll:</strong> Zoom</li>
        <li><strong>R:</strong> Reset camera</li>
        <li><strong>Shift:</strong> Move faster</li>
      </ul>
    </div>
    <div class="settings">
      <h4>Generation Settings</h4>
      <div class="hl-cluster">
        <h5>Highlighted cluster</h5>
        <input id="hlc-none" type="radio" :value="-1" v-model="highlightedCluster" />
        <label for="hlc-none">None</label>
        <input id="hlc-0" type="radio" :value="0" v-model="highlightedCluster" />
        <label for="hlc-0">0</label>
        <input id="hlc-1" type="radio" :value="1" v-model="highlightedCluster" />
        <label for="hlc-1">1</label>
        <input id="hlc-2" type="radio" :value="2" v-model="highlightedCluster" />
        <label for="hlc-2">2</label>
        <input id="hlc-3" type="radio" :value="3" v-model="highlightedCluster" />
        <label for="hlc-3">3</label>
        <input id="hlc-4" type="radio" :value="4" v-model="highlightedCluster" />
        <label for="hlc-4">4</label>
      </div>
      <div>
        <h5>Points per cluster</h5>
        <input type="range" id="order-magnitude-ppc" min="1" max="7" v-model="ppcMagnitude" />
        <label for="order-magnitude-ppc">Order of magnitude</label>
        <input type="range" id="slider-ppc" name="ppc" min="1" max="10" v-model="ppcSlider" />
        <label for="slider-ppc">Multiplier</label>
      </div>
      <!-- for future wiring
      <input type="range" id="slider-nclusters" name="nclusters" min="1" max="5" v-model="nclusters" />
      <label for="slider-nclusters">number of clusters</label>
      -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { highlightedCluster, ppc } from '@/composables/settings'
import { type PointData } from '@/core/DataProvider'
import DataLoadControl from './DataLoadControl.vue'

const emit = defineEmits<{
  'file-selected': [file: File],
  'table-selected': [tableName: string],
  'switch-to-generated': [],
  'switch-to-loaded': []
}>()

const props = defineProps<{
  isLoading: boolean
  currentFile: File | null
  currentDataSource: 'generated' | 'loaded'
  pointData: PointData | null
}>()

const ppcMagnitude = ref(4)
const ppcSlider = ref(1)

const handleFileSelected = (file: File) => {
  emit('file-selected', file)
}

const handleTableSelected = (tableName: string) => {
  emit('table-selected', tableName)
}

watch([ppcSlider, ppcMagnitude], () => {
  ppc.value = 10**ppcMagnitude.value * ppcSlider.value;
})

const maxClusterId = computed(() => {
  if (!props.pointData || props.pointData.clusterIds.length === 0) {
    return -1  // Return -1 when no data (slider disabled state)
  }
  // Find maximum value in clusterIds Float32Array
  const clusterArray = Array.from(props.pointData.clusterIds)
  return Math.max(...clusterArray)
})

const clusterDisplayValue = computed(() => {
  const val = highlightedCluster.value
  if (val === -2) return 'None'
  if (val === -1) return 'Noise'
  return `Cluster ${val}`
})
</script>

<style scoped>
.controls-overlay {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 15px;
  border-radius: 8px;
  color: white;
  font-size: 12px;
  font-family: monospace;
  max-width: 200px;
  z-index: 100;
  backdrop-filter: blur(5px);
}

.controls-overlay .data-loading {
  margin-bottom: 15px;
}

.controls-overlay h4 {
  margin: 0 0 10px 0;
  color: #4CAF50;
}

.controls-overlay ul {
  margin: 0;
  padding-left: 15px;
}

.controls-overlay li {
  margin-bottom: 4px;
}

.data-source-controls {
  margin-top: 12px;
  margin-bottom: 15px;
  padding-top: 12px;
  border-top: 1px solid rgba(76, 175, 80, 0.3);
}

.data-source-label {
  color: #4CAF50;
  font-size: 11px;
  font-family: monospace;
  margin-bottom: 6px;
}

.data-source-buttons {
  display: flex;
  gap: 8px;
}

.data-source-btn {
  background: rgba(0, 0, 0, 0.8);
  color: #4CAF50;
  border: 1px solid #4CAF50;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-family: monospace;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  flex: 1;
}

.data-source-btn:hover {
  background: rgba(76, 175, 80, 0.2);
  color: #69F0AE;
}

.data-source-btn.active {
  background: rgba(76, 175, 80, 0.3);
  color: #69F0AE;
}
</style>
