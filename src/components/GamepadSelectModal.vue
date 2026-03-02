<template>
  <div class="gamepad-backdrop" @click.self="emit('close')">
    <div class="gamepad-modal">
      <button class="close-btn" @click="emit('close')">&times;</button>

      <h2 class="title">Select Gamepad</h2>

      <div class="gamepad-list">
        <button
          class="gamepad-option no-gamepad"
          @click="emit('select', null); emit('close')"
        >
          No Gamepad
        </button>

        <button
          v-for="gp in gamepads"
          :key="gp.index"
          class="gamepad-option"
          @click="emit('select', gp.index); emit('close')"
        >
          <span class="gp-name">{{ gp.id }}</span>
          <span v-if="gp.mapping !== 'standard'" class="gp-warning">
            Non-standard mapping
          </span>
        </button>
      </div>

      <div v-if="gamepads.length === 0" class="no-gamepads">
        <p>No gamepads detected.</p>
        <p class="hint">Press any button on your gamepad to make it visible to the browser.</p>
      </div>

      <div class="mapping-info">
        <h3>Button Mapping</h3>
<pre class="controller-diagram">
        LT: Move backward     RT: Move forward
        LB: Speed boost       RB: Center select

  ┌──────────────────────────────┐
  │                                                            │
  │   ╭───╮                       Y: Sm-    ╭───╮    │
  │   │ L    │ Move                            │ R    │ Look
  │   │      │ L/R + U/D      X: Sm+ ( )       │      │ Yaw/Pitch
  │   ╰───╯                    ( )  ( )     ╰───╯    │
  │                                   ( )                      │
  │                          A: Look-  B: Look+                │
  │                                                            │
  │            ┌───┐                                      │
  │     ◄  ─┤       ├── ►   Cluster                    │
  │            └─┬─┘                                      │
  │                │                                          │
  │          ▲ Threshold ▼                                   │
  │                                                            │
  └──────────────────────────────┘

  L3: Reset position
</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { GamepadManager, type GamepadInfo } from '@/core/GamepadManager'

const emit = defineEmits<{
  'select': [index: number | null]
  'close': []
}>()

const gamepads = ref<GamepadInfo[]>([])
let refreshInterval: ReturnType<typeof setInterval> | null = null

function refresh() {
  gamepads.value = GamepadManager.listGamepads()
}

// Browsers only populate navigator.getGamepads() after a button press.
// Listen for the gamepadconnected event to catch that moment.
function onGamepadConnected() {
  refresh()
}

onMounted(() => {
  refresh()
  window.addEventListener('gamepadconnected', onGamepadConnected)
  // Also poll periodically as a fallback (catches disconnects too)
  refreshInterval = setInterval(refresh, 1000)
})

onUnmounted(() => {
  window.removeEventListener('gamepadconnected', onGamepadConnected)
  if (refreshInterval !== null) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.gamepad-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  backdrop-filter: blur(8px);
}

.gamepad-modal {
  position: relative;
  background: rgba(20, 20, 20, 0.98);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 8px;
  padding: 32px;
  max-width: 520px;
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
  margin: 0 0 16px 0;
  color: #4CAF50;
  font-size: 16px;
}

.gamepad-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gamepad-option {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: white;
  padding: 12px 16px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s, border-color 0.2s;
}

.gamepad-option:hover {
  background: rgba(76, 175, 80, 0.15);
  border-color: #4CAF50;
}

.gamepad-option.no-gamepad {
  color: #9e9e9e;
  border-color: rgba(158, 158, 158, 0.3);
}

.gamepad-option.no-gamepad:hover {
  background: rgba(158, 158, 158, 0.1);
  border-color: #9e9e9e;
}

.gp-name {
  display: block;
  word-break: break-word;
}

.gp-warning {
  display: block;
  margin-top: 4px;
  color: #ff9800;
  font-size: 10px;
}

.no-gamepads {
  color: rgba(255, 255, 255, 0.5);
  margin-top: 12px;
}

.no-gamepads p {
  margin: 0 0 6px 0;
}

.no-gamepads .hint {
  color: #69F0AE;
  font-style: italic;
  font-size: 11px;
}

.mapping-info {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(76, 175, 80, 0.3);
}

.mapping-info h3 {
  margin: 0 0 8px 0;
  color: #4CAF50;
  font-size: 13px;
}

.controller-diagram {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 10px;
  line-height: 1.4;
  overflow-x: auto;
}
</style>
