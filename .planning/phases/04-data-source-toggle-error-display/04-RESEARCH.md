# Phase 4 Research: Data Source Toggle & Error Display

**Researched:** 2026-02-03
**Phase:** 04-data-source-toggle-error-display

## Standard Stack

**Tech Stack (Already Chosen):**
- **Framework:** Vue 3 (Composition API with `<script setup>`)
- **State Management:** Vue `ref` and `reactive` for local component state
- **Communication:** Event-driven (emit/defineEmits) between child → parent
- **Styling:** Scoped CSS with existing green accent (#4CAF50) and dark background patterns
- **Buffer Management:** WebGL2RenderingContext with explicit buffer creation/binding
- **Math Library:** gl-matrix (vec3, quat, mat4) for camera operations

**No new dependencies needed** - all required tech is already in place.

## Architecture Patterns

### Event-Driven Component Communication
**Pattern:** Child components emit events, parent handles business logic
- `DataLoadControl.vue` → emits `file-selected`, `table-selected`
- `ControlsOverlay.vue` → emits `file-selected`, `table-selected` (pass-through)
- `WebGLPlayground.vue` (parent) → handles all data loading, state updates, buffer setup

**Why this pattern exists:** Separates UI concerns (DataLoadControl) from business logic (WebGLPlayground), keeps child components reusable.

### State Management Pattern
**Current approach:**
- Parent (WebGLPlayground) holds all data state: `pointData`, `isLoading`, `loadError`, `currentFile`
- Child components receive state via props: `isLoading`, `currentFile`, `file`
- State changes trigger reactions: `watch()` for reactive updates

**No global store** — all state is component-scoped. For Phase 4, we'll add:
- `currentDataSource` enum/string ('generated' | 'json' | 'sqlite')
- Error array (for multiple errors in panel)

### Buffer Management Pattern
**Current approach:**
```typescript
let positionBuffer: WebGLBuffer | null = null
let clusterIdBuffer: WebGLBuffer | null = null

const setupBuffers = (gl) => {
  positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, pointData!.positions, gl.STATIC_DRAW)

  clusterIdBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, clusterIdBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, pointData!.clusterIds, gl.STATIC_DRAW)
}
```

**For data source switch:** Need to clear buffers before re-uploading new data:
```glsl
gl.deleteBuffer(positionBuffer)
gl.deleteBuffer(clusterIdBuffer)
setupBuffers(gl)  // Re-create with new pointData
```

### Loading State Pattern
**Current approach:**
- `isLoading` ref controls loading overlay visibility
- `isLoading.value = true` before async operation
- `isLoading.value = false` in finally block
- Overlay: `<div v-if="isLoading" class="loading-overlay">`

**For Phase 4:** Reuse this pattern for data source switching.

### Error Handling Pattern
**Current approach (WebGLPlayground.vue):**
```vue
<div v-if="loadError" class="load-error-panel">
  <h3>Loading Error</h3>
  <p>{{ loadError }}</p>
  <button @click="clearLoadError">Dismiss</button>
</div>

const handleLoadFile = async (file) => {
  try {
    // ... load data
    loadError.value = ''  // Clear on success
  } catch (error) {
    loadError.value = error.message
    // Preserve existing pointData on load failure (CONTEXT.md)
  }
}
```

**Limitation:** Only supports single error at a time. Phase 4 needs error array for panel.

## Implementation Approach

### Data Source Toggle UI

**Component structure:**
```
ControlsOverlay.vue (existing)
└─ Data source buttons (new)
   ├─ Button: Generate (always available)
   ├─ Button: Load (triggers file picker, existing "Load JSON" behavior)
   └─ Active state highlighting (green accent)
```

**Placement:** Below existing "Load JSON" button in DataLoadControl panel area (per CONTEXT.md decision).

**State tracking:**
```typescript
enum DataSource { GENERATED = 'generated', LOADED = 'loaded' }

const currentDataSource = ref<DataSource>(DataSource.GENERATED)

const switchToGenerated = () => {
  currentDataSource.value = DataSource.GENERATED
  regenerateData()
}

const switchToLoaded = () => {
  currentDataSource.value = DataSource.LOADED
  if (currentFile.value) {
    reloadFile(currentFile.value)
  }
}
```

**Button styling (match existing patterns):**
```css
.data-source-btn {
  background: rgba(0, 0, 0, 0.8);
  color: #4CAF50;
  border: 1px solid #4CAF50;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-family: monospace;
  cursor: pointer;
}

.data-source-btn.active {
  background: rgba(76, 175, 80, 0.3);
  color: #69F0AE;
}
```

### Error Display System

**Error array in WebGLPlayground:**
```typescript
interface ErrorInfo {
  id: string
  message: string
  timestamp: number
}

const errors = ref<ErrorInfo[]>([])

const addError = (message: string) => {
  errors.value.push({
    id: Date.now().toString(),
    message,
    timestamp: Date.now()
  })
}

const clearErrors = () => {
  errors.value = []
}
```

**Error panel UI (WebGLPlayground.vue):**
```vue
<div v-if="errors.length > 0" class="error-panel">
  <div class="error-header">
    <h3>Errors</h3>
    <button @click="toggleErrorPanel">▼</button>
  </div>
  <div v-if="errorPanelExpanded" class="error-list">
    <div v-for="error in errors" :key="error.id" class="error-item">
      <span class="error-message">{{ error.message }}</span>
      <button @click="dismissError(error.id)" class="dismiss-btn">×</button>
    </div>
  </div>
</div>
```

**Placement:** Top-right of canvas (like DebugInfo), or center-overlay for visibility. Match existing `.load-error-panel` style.

**Auto-dismiss behavior:** Call `clearErrors()` when data loads successfully (handleLoadFile, regenPoints).

### State Management on Source Switch

**Camera reset:** Use existing `camera.reset()` method
```typescript
const switchDataAndResetCamera = () => {
  // Switch data source
  // Reset camera
  camera.value?.reset()
}
```

**Clear WebGL buffers:**
```typescript
const clearBuffers = (gl: WebGL2RenderingContext | WebGLRenderingContext) => {
  if (positionBuffer) {
    gl.deleteBuffer(positionBuffer)
    positionBuffer = null
  }
  if (clusterIdBuffer) {
    gl.deleteBuffer(clusterIdBuffer)
    clusterIdBuffer = null
  }
}
```

**Reset cluster highlighting:**
```typescript
import { highlightedCluster } from '@/composables/settings'

const resetHighlighting = () => {
  highlightedCluster.value = -1  // Show all clusters
}
```

**Full switch flow:**
```typescript
const switchToGenerated = async () => {
  isLoading.value = true
  clearErrors()  // Auto-dismiss errors

  // Clear old data
  clearBuffers(glCache)
  pointData = null

  // Reset camera and highlighting
  camera.value?.reset()
  resetHighlighting()

  // Generate new data
  regenPoints()
  setupBuffers(glCache)

  currentDataSource.value = DataSource.GENERATED
  isLoading.value = false
}
```

### Error Recovery Flow

**No explicit recovery buttons** (per CONTEXT.md decision). Users rely on:
- Manually clicking "Load" button to retry file
- Manually clicking "Generate" button to switch back to generated data

**Error content:**
- UI: Brief, user-friendly message (e.g., "Invalid JSON format", "Corrupt database")
- Console: Full error stack trace for debugging
```typescript
try {
  // ... operation
} catch (error) {
  console.error('Detailed error:', error)
  addError(error instanceof Error ? error.message : 'Unknown error')
  // Preserve existing pointData (no data loss)
}
```

## Don't Hand Roll

**Use existing patterns instead of creating new abstractions:**

| Feature | Don't Create | Use Instead |
|----------|--------------|-------------|
| Error management system | New `ErrorHandler` class | Error array with Vue `ref[]` |
| Data source state machine | Custom state machine | Simple enum with `ref<DataSource>` |
| Buffer manager class | New `BufferManager` | Inline buffer operations (create/delete) |
| Toast notification library | New dependency | Reuse existing error panel UI |
| Loading spinner component | New `LoadingSpinner.vue` | Reuse existing loading overlay |
| Global store (Pinia/Vuex) | Complex state management | Local refs (already sufficient) |
| Event bus | Custom event emitter | Vue `emit()` (already pattern) |

## Common Pitfalls

### 1. Memory Leaks from WebGL Buffers
**Problem:** Not deleting old buffers before creating new ones causes GPU memory leaks.
**Avoid:** Always `gl.deleteBuffer()` before `gl.createBuffer()` for data switches.
```typescript
// Wrong
setupBuffers(gl)  // Creates new buffers, old ones leak

// Right
clearBuffers(gl)  // Delete old buffers first
setupBuffers(gl)  // Then create new ones
```

### 2. Race Conditions in Async Loading
**Problem:** User clicks multiple buttons rapidly, causing concurrent loading operations.
**Avoid:** Disable buttons during `isLoading`, check state before starting new load.
```typescript
const isLoading = ref(false)

const handleLoad = async () => {
  if (isLoading.value) return  // Prevent race

  isLoading.value = true
  try {
    await loadData()
  } finally {
    isLoading.value = false
  }
}
```

### 3. Breaking Existing Event Flow
**Problem:** New data source buttons bypass existing event emissions, breaking parent logic.
**Avoid:** New buttons should emit same events (`file-selected`, `table-selected`) or trigger existing methods.

### 4. Camera Reset Unexpected Behavior
**Problem:** Resetting camera mid-flight breaks user navigation context.
**Mitigation:** Reset only on explicit data source switch, not on every data reload.

### 5. Error Panel Blocking UI
**Problem:** Error panel covers canvas when expanded, preventing interaction.
**Avoid:** Make error panel collapsible, small footprint when collapsed (just "Errors: 3" badge).

### 6. Inconsistent Active State Styling
**Problem:** New buttons don't match existing green accent patterns.
**Avoid:** Copy exact colors from existing buttons: `#4CAF50` (border/text), `rgba(76, 175, 80, 0.3)` (active background).

### 7. Missing Error Context
**Problem:** Errors shown without context (which operation failed).
**Avoid:** Include source in error message: "Failed to load JSON", "Database corrupt", etc.

### 8. Not Clearing Highlighted Cluster
**Problem:** Switching data source leaves old cluster highlighted (now invalid for new data).
**Avoid:** Always `resetHighlighting()` on data source switch.

## UI Considerations

### Existing Design Patterns

**Green Accent Theme:**
- Primary color: `#4CAF50`
- Active background: `rgba(76, 175, 80, 0.3)`
- Hover background: `rgba(76, 175, 80, 0.2)`
- Text: White or green depending on context

**Dark Background Pattern:**
- Background: `rgba(0, 0, 0, 0.8)`
- Border: `1px solid #4CAF50`
- Border radius: `4px` for buttons, `8px` for panels
- Font: `monospace`, size 11-12px for UI elements

**Loading Overlay (existing):**
```vue
<div v-if="isLoading" class="loading-overlay">
  <div class="loading-message">Loading data...</div>
</div>
```
Reuse this pattern for data source switching (same overlay, different message).

### Error Panel Design

**Collapsible panel:**
- Collapsed: Small badge "Errors: N" with expand button
- Expanded: List of errors with individual dismiss buttons
- Auto-dismiss: Clear all errors on successful data load

**Positioning:** Top-right (matching DebugInfo.vue) or overlay center. Prefer top-right for non-blocking.

**Error item styling:**
```css
.error-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 8px;
  background: rgba(244, 67, 54, 0.2);
  border-left: 3px solid #f44336;
  margin-bottom: 4px;
  font-size: 11px;
  color: #ffcdd2;
}

.dismiss-btn {
  background: transparent;
  border: none;
  color: #f44336;
  cursor: pointer;
  font-size: 14px;
}
```

**Color scheme:** Red accent for errors (`#f44336`) to contrast with green success theme.

### Data Source Button Layout

**Two-column layout in ControlsOverlay:**
```vue
<div class="data-source-controls">
  <div class="data-source-label">Data Source:</div>
  <div class="data-source-buttons">
    <button
      class="data-source-btn"
      :class="{ active: currentDataSource === 'generated' }"
      @click="switchToGenerated"
    >
      Generate
    </button>
    <button
      class="data-source-btn"
      :class="{ active: currentDataSource === 'loaded' }"
      @click="switchToLoaded"
    >
      Load
    </button>
  </div>
</div>
```

**Placement:** Below existing "Data Loading" section, above "Controls" section.

---

## Summary

**What I need to PLAN this phase well:**

1. **Add data source toggle UI** to ControlsOverlay (2 buttons: Generate, Load)
2. **Add error panel UI** to WebGLPlayground (collapsible, red-accented)
3. **Implement state management** for data source enum and error array
4. **Wire camera reset** on data source switch using existing `camera.reset()`
5. **Clear WebGL buffers** before uploading new data (prevent memory leaks)
6. **Reset cluster highlighting** when switching data sources
7. **Show loading overlay** during data source switch
8. **Auto-dismiss errors** on successful data load
9. **Log full errors to console** while showing brief messages in UI
10. **Match existing styling patterns** (green accent, dark background, monospace font)

**No external dependencies needed.** All tech is already in place.

**Integration points:**
- `ControlsOverlay.vue`: Add data source buttons (emits to parent)
- `WebGLPlayground.vue`: Handle state, errors, buffer clearing, camera reset
- Existing methods: `camera.reset()`, `regenPoints()`, `setupBuffers()`, `clearLoadError()`
