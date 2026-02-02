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
import { ref, watch } from 'vue'
import { highlightedCluster, ppc } from '@/composables/settings';
import DataLoadControl from './DataLoadControl.vue';

const emit = defineEmits<{
  'file-selected': [file: File],
  'table-selected': [tableName: string]
}>()

const props = defineProps<{
  isLoading: boolean
  currentFile: File | null
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
</style>
