<template>
  <div class="controls-overlay">
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
</template>

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
