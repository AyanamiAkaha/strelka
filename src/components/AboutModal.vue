<template>
  <div class="about-backdrop" @click.self="emit('close')">
    <div class="about-modal">
      <button class="close-btn" @click="emit('close')">×</button>

      <h2 class="title">strelka</h2>
      <div class="version">v1.2.0</div>

      <p class="description">
        High-performance 3D point cloud visualization with cluster highlighting
        and freeflight camera controls. Renders up to 30M points without
        Level-of-Detail — the GPU handles it.
      </p>

      <div class="section">
        <h3>Technology</h3>
        <ul>
          <li><strong>Vue 3</strong> — Composition API with TypeScript</li>
          <li><strong>gl-matrix</strong> — Quaternion and matrix math</li>
          <li><strong>sql.js</strong> — SQLite via WebAssembly</li>
          <li><strong>Vite</strong> — Build tooling and dev server</li>
          <li><strong>WebGL / WebGL2</strong> — Direct GPU rendering</li>
        </ul>
      </div>

      <div class="section">
        <h3>Author</h3>
        <div class="author">綾波赤羽 &lt;ayanami@akaha.today&gt;</div>
      </div>

      <div class="section">
        <h3>License</h3>
        <div class="license">BSD 3-Clause License</div>
      </div>

      <div class="section">
        <h3>Source</h3>
        <a
          class="repo-link"
          href="https://github.com/AyanamiAkaha/strelka"
          target="_blank"
          rel="noopener"
        >
          github.com/AyanamiAkaha/strelka
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  'close': []
}>()
</script>

<style scoped>
.about-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  backdrop-filter: blur(8px);
}

.about-modal {
  position: relative;
  background: rgba(20, 20, 20, 0.98);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 8px;
  padding: 32px;
  max-width: 420px;
  width: 90%;
  color: white;
  font-family: monospace;
  font-size: 12px;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  color: #4CAF50;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #69F0AE;
}

.title {
  margin: 0 0 4px 0;
  color: #4CAF50;
  font-size: 16px;
}

.version {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  margin-bottom: 16px;
}

.description {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
  margin: 0 0 20px 0;
}

.section {
  margin-bottom: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(76, 175, 80, 0.2);
}

.section:last-child {
  margin-bottom: 0;
}

.section h3 {
  margin: 0 0 8px 0;
  color: #4CAF50;
  font-size: 12px;
}

.section ul {
  margin: 0;
  padding-left: 16px;
}

.section li {
  margin-bottom: 4px;
  color: rgba(255, 255, 255, 0.8);
}

.author,
.license {
  color: rgba(255, 255, 255, 0.8);
}

.repo-link {
  color: #69F0AE;
  text-decoration: none;
}

.repo-link:hover {
  text-decoration: underline;
}
</style>
