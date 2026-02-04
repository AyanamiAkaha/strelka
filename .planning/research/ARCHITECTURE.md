# Architecture Research: v1.1 UX Refinements

**Domain:** WebGL Clusters Playground - Vue 3 + WebGL
**Researched:** February 4, 2026
**Confidence:** HIGH

## Current Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                    WebGLPlayground.vue (Parent)               │
├────────────────────────────────────────────────────────────────┤
│  WebGL Context • Camera • PointData • Shader Program         │
│  Error Management (errors array) • Loading State             │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │        ControlsOverlay.vue (Child)                  │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  DataLoadControl.vue (Grandchild)           │  │   │
│  │  │  • File selection (JSON/SQLite)              │  │   │
│  │  │  • SQLite table selection UI                 │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │  • Cluster slider (highlightedCluster)              │   │
│  │  • PPC controls                                    │   │
│  │  • Data source buttons (Generate/Load)             │   │
│  └──────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │        WebGLCanvas.vue (Sibling)                    │   │
│  │  • WebGL rendering                                  │   │
│  │  • Mouse/keyboard events                            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        DebugInfo.vue (Sibling)                       │   │
│  │  • Camera state • FPS • Point count                 │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
├────────────────────────────────────────────────────────────────┤
│                    Data Layer                                │
├────────────────────────────────────────────────────────────────┤
│  • settings.ts: highlightedCluster (ref), ppc (ref)          │
│  • DataProvider: getPointData(), loadFromFile(),            │
│                 loadSqliteFile()                             │
│  • validators.ts: parseJsonData(), validateTableSchema()      │
│  • Camera.ts: Quaternion-based camera controls                 │
│  • ShaderManager.ts: Shader compilation and management       │
└────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | State Owned | Emits |
|-----------|----------------|-------------|-------|
| **WebGLPlayground.vue** | WebGL context, camera, rendering, error management | `errors[]`, `isLoading`, `currentFile`, `currentDataSource`, `pointData` | N/A (parent) |
| **ControlsOverlay.vue** | Settings UI, cluster slider, data source switching | `ppcMagnitude`, `ppcSlider` (local) | `@file-selected`, `@table-selected`, `@switch-to-generated`, `@switch-to-loaded` |
| **DataLoadControl.vue** | File selection, SQLite table selection | `availableTables[]`, `selectedTable` (local) | `@file-selected`, `@table-selected` |
| **WebGLCanvas.vue** | WebGL rendering, event handling | N/A (unmanaged) | `@webgl-ready`, `@webgl-error`, `@mouse-move`, `@mouse-wheel`, `@key-event` |
| **DebugInfo.vue** | Debug information display | N/A (display-only) | N/A |
| **settings.ts** | Global settings (shared across components) | `highlightedCluster` (ref), `ppc` (ref) | N/A |
| **DataProvider** | Data loading, validation, generation | Static methods only | N/A |

## State Management Patterns

### Global Shared State (Composables)

```typescript
// src/composables/settings.ts
import { ref } from 'vue'

// Exported refs - imported directly by components
export const highlightedCluster = ref(-2)  // -2=None, -1=Noise, 0+=Cluster ID
export const ppc = ref(10000)             // Points per cluster
```

**Pattern:** Direct reactive ref imports
- Components import and bind directly to refs
- No state management library (Pinia/Vuex) needed
- Reactive: Changes propagate to all consumers

**Consumers:**
- `WebGLPlayground.vue`: Passes `highlightedCluster.value` to shader uniform
- `ControlsOverlay.vue`: Two-way binds slider to `highlightedCluster`

### Parent-Child State (Props Down, Events Up)

```typescript
// WebGLPlayground.vue (parent)
<ControlsOverlay
  @file-selected="handleLoadFile"
  @table-selected="handleTableSelected"
  @switch-to-generated="switchToGenerated"
  @switch-to-loaded="switchToLoaded"
  :is-loading="isLoading"
  :current-file="currentFile"
  :current-data-source="currentDataSource"
  :point-data="pointData"
/>

// ControlsOverlay.vue (child)
const props = defineProps<{
  isLoading: boolean
  currentFile: File | null
  currentDataSource: 'generated' | 'loaded'
  pointData: PointData | null
}>()
```

**Pattern:** Props down, events up
- Parent owns state (`isLoading`, `currentFile`, `pointData`)
- Children emit events to request state changes
- Parent handles mutations and re-renders

### Error State Management

```typescript
// WebGLPlayground.vue
interface ErrorInfo {
  id: string
  message: string
  timestamp: number
}

const errors = ref<ErrorInfo[]>([])
const errorPanelExpanded = ref(false)

const addError = (message: string) => {
  errors.value.push({
    id: Date.now().toString(),
    message,
    timestamp: Date.now()
  })
  errorPanelExpanded.value = true  // Auto-expand
}

const clearErrors = () => {
  errors.value = []
}

const dismissError = (id: string) => {
  const index = errors.value.findIndex(e => e.id === id)
  if (index !== -1) {
    errors.value.splice(index, 1)
  }
  if (errors.value.length === 0) {
    errorPanelExpanded.value = false  // Auto-collapse
  }
}
```

**Pattern:** Array with unique IDs, collapsible UI
- Multiple errors tracked simultaneously
- Dismissible per-error (individual dismiss buttons)
- Auto-expand on add, auto-collapse on clear
- Timestamped for debugging

## Data Flow

### File Load Flow (JSON)

```
User drrops JSON file
    ↓
DataLoadControl.handleDrop()
    ↓
DataLoadControl.processFile()
    ↓ (emit)
DataLoadControl emits @file-selected(file)
    ↓
WebGLPlayground.handleLoadFile(file)
    ↓
DataProvider.loadFromFile(file)
    ↓
parseJsonData() → validates, creates Float32Arrays
    ↓ (return)
WebGLPlayground.pointData = loadedData
    ↓
setupBuffers(gl) → WebGL buffers
    ↓
clearErrors() → dismiss previous errors
```

### File Load Flow (SQLite with table selection)

```
User drops SQLite file
    ↓
DataLoadControl.handleDrop()
    ↓
DataLoadControl.processFile()
    ↓
DataProvider.loadSqliteFile(file) → returns { pointData, tables[] }
    ↓
DataLoadControl.availableTables = tables[]
    ↓ (emit)
DataLoadControl emits @file-selected(file)
    ↓
User clicks "Load" button (or auto-select if single table)
    ↓ (emit)
DataLoadControl emits @table-selected(tableName)
    ↓
WebGLPlayground.handleTableSelected(tableName)
    ↓
WebGLPlayground.handleLoadFile(file, tableName)
    ↓
DataProvider.loadSqliteFile(file, tableName)
    ↓
validateTableSchema() → check x,y,z columns
    ↓
Load rows into Float32Arrays
    ↓ (return)
WebGLPlayground.pointData = loadedData
    ↓
setupBuffers(gl) → WebGL buffers
```

### Highlighted Cluster State Flow

```
User moves cluster slider in ControlsOverlay
    ↓
v-model.number="highlightedCluster" (binds to settings.ts ref)
    ↓
highlightedCluster.value changes (reactive)
    ↓ (watched by WebGLPlayground - no watch, direct binding)
WebGLPlayground passes highlightedCluster.value to shader
    ↓
gl.uniform1f(..., highlightedCluster.value) every frame
    ↓
GPU uses value to highlight/mute points
```

### Error Recovery Flow

```
Error occurs (e.g., invalid JSON)
    ↓
DataProvider.loadFromFile() throws Error
    ↓
WebGLPlayground.handleLoadFile() catch block
    ↓
addError(error.message)
    ↓
Error panel auto-expands
    ↓
User sees error message with dismiss button
    ↓
User clicks dismiss button
    ↓
dismissError(id) removes error from array
    ↓
Error panel auto-collapses if empty
```

## UX Refinement Integration Points

### 1. Highlighted Cluster Reset Consistency

**Current Behavior:**
- `highlightedCluster` initialized to `-2` (None state)
- Reset in `switchToGenerated()`: sets `highlightedCluster.value = -1` (Noise)
- Reset in `switchToLoaded()`: sets `highlightedCluster.value = -1` (Noise)
- Display: `-2` → "None", `-1` → "Noise"

**Issue:** Inconsistent reset value

**Required Changes:**

| Component | Change | Reason |
|-----------|--------|--------|
| **settings.ts** | Change `highlightedCluster` initial value from `-2` to `-1` | Align with existing reset behavior |
| **WebGLPlayground.vue** | Remove reset lines in `switchToGenerated()` and `switchToLoaded()` | No longer needed (already initialized to -1) |
| **ControlsOverlay.vue** | Update `clusterDisplayValue` computed: `-1` → "All clusters", remove `-2` case | Reflect semantic meaning of -1 |

**Code Changes:**

```typescript
// src/composables/settings.ts
export const highlightedCluster = ref(-1)  // Changed from -2 to -1

// src/views/WebGLPlayground.vue (remove these lines)
// In switchToGenerated():
//   highlightedCluster.value = -1  // DELETE
// In switchToLoaded():
//   highlightedCluster.value = -1  // DELETE

// src/components/ControlsOverlay.vue
const clusterDisplayValue = computed(() => {
  const val = highlightedCluster.value
  if (val === -1) return 'All clusters'  // Changed from 'Noise'
  return `Cluster ${val}`
})

// Update slider min from -2 to -1
<input
  type="range"
  v-model.number="highlightedCluster"
  :min="-1"  // Changed from -2
  :max="maxClusterId"
  step="1"
/>
```

**Build Order Dependency:** None (independent change)

---

### 2. SQLite Table Auto-Select

**Current Behavior:**
- SQLite file selected → `availableTables` populated
- User must manually select table and click "Load"
- Single-table databases still require manual selection

**Issue:** Poor UX for single-table databases

**Required Changes:**

| Component | Change | Reason |
|-----------|--------|--------|
| **DataLoadControl.vue** | Auto-load single-table databases | Eliminate unnecessary user action |
| **DataLoadControl.vue** | Hide table selection UI when single table | Reduce UI clutter |
| **DataLoadControl.vue** | Show auto-select feedback | Inform user of automatic action |

**Code Changes:**

```typescript
// src/components/DataLoadControl.vue
const processFile = async (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  try {
    if (extension === 'db' || extension === 'sqlite') {
      const result = await DataProvider.loadSqliteFile(file)
      availableTables.value = result.tables
      emit('file-selected', file)

      // If there's only one table, auto-select and load it
      if (result.tables.length === 1) {
        selectedTable.value = result.tables[0]
        // Auto-emit table-selected event to trigger load
        emit('table-selected', result.tables[0])
      }
      // If multiple tables, show selection UI (existing behavior)
    } else {
      emit('file-selected', file)
    }
  } catch (error) {
    emit('file-selected', file)
  }
}

// Template - only show table selection if multiple tables
<div v-if="availableTables.length > 1" class="table-selection">
  <!-- existing table selection UI -->
</div>
```

**Edge Cases:**
- **Empty tables list:** Show error (handled by existing error system)
- **Zero tables:** Should not happen (SQLite database has at least one table)
- **Multiple tables:** Show selection UI (existing behavior)

**Build Order Dependency:** None (independent change)

---

### 3. Cluster Slider Disable When No Data

**Current Behavior:**
- Slider always enabled, even when `pointData` is `null` or empty
- Slider `maxClusterId` computed returns `-1` when no data
- User can move slider but has no visual feedback

**Issue:** Confusing UX - user can interact but nothing changes

**Required Changes:**

| Component | Change | Reason |
|-----------|--------|--------|
| **ControlsOverlay.vue** | Disable slider when no data | Prevent confusing interaction |
| **ControlsOverlay.vue** | Visual feedback for disabled state | Make disable state obvious |
| **ControlsOverlay.vue** | Compute `hasData` prop | Single source of truth |

**Code Changes:**

```typescript
// src/components/ControlsOverlay.vue
const hasData = computed(() => {
  return props.pointData !== null && props.pointData.count > 0
})

// Template - add disabled attribute and visual feedback
<div class="cluster-selector">
  <h5>Highlighted cluster</h5>
  <div class="slider-wrapper">
    <input
      id="cluster-slider"
      type="range"
      v-model.number="highlightedCluster"
      :min="-1"
      :max="maxClusterId"
      step="1"
      :disabled="!hasData.value"
      aria-label="Select cluster to highlight"
    />
  </div>
  <div class="cluster-display" :data-value="clusterDisplayValue" :class="{ disabled: !hasData.value }">
    {{ hasData.value ? clusterDisplayValue : 'No data loaded' }}
  </div>
</div>

// Add CSS for disabled state
.cluster-display.disabled {
  opacity: 0.5;
  color: #9e9e9e;
}

.cluster-selector input[type="range"]:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

**Alternative Approach (if global disable needed):**

Pass `hasData` as a computed prop from `WebGLPlayground` to `ControlsOverlay`:

```typescript
// src/views/WebGLPlayground.vue
const hasData = computed(() => {
  return pointData !== null && pointData.count > 0
})

// Pass to ControlsOverlay
<ControlsOverlay
  :has-data="hasData"
  ...
/>

// src/components/ControlsOverlay.vue
const props = defineProps<{
  hasData: boolean
  ...
}>()
```

**Build Order Dependency:** None (independent change)

---

### 4. Error Recovery Guidance

**Current Behavior:**
- Error panel shows error message only
- No recovery guidance or context
- User sees "Error loading file" but doesn't know why

**Issue:** Poor UX - errors not actionable

**Required Changes:**

| Component | Change | Reason |
|-----------|--------|--------|
| **WebGLPlayground.vue** | Add recovery guidance to ErrorInfo | Make errors actionable |
| **WebGLPlayground.vue** | Display guidance in error panel | Show recovery steps |
| **DataProvider.ts / validators.ts** | Add guidance strings to errors | Provide context at error source |

**Code Changes:**

```typescript
// src/core/types.ts (add if not exists)
export interface ErrorInfo {
  id: string
  message: string
  guidance?: string  // NEW: Recovery guidance
  timestamp: number
}

// src/core/validators.ts (update error messages with guidance)
export function parseJsonData(jsonText: string): PointData {
  try {
    const data = JSON.parse(jsonText) as unknown[]

    if (!Array.isArray(data)) {
      const error = new Error('JSON must be an array of points')
      error.guidance = 'Expected format: [{"x": 1, "y": 2, "z": 3, "cluster": 0}, ...]'
      throw error
    }

    // ... existing validation ...

  } catch (error) {
    // Wrap existing errors with guidance
    if (error instanceof Error) {
      if (error.message.includes('JSON')) {
        error.guidance = 'Check your JSON file format. Should be an array of point objects.'
      } else if (error.message.includes('coordinates')) {
        error.guidance = 'Each point must have x, y, z coordinates as numbers.'
      } else if (error.message.includes('too large')) {
        error.guidance = 'Reduce dataset size to under 30 million points.'
      }
      console.error('JSON parsing failed:', error)
      throw error
    }
    throw error
  }
}

export function validateTableSchema(db: any, tableName: string): TableInfo {
  const pragmaResults = db.exec(`PRAGMA table_info(${tableName})`)

  if (!pragmaResults || pragmaResults.length === 0) {
    const error = new Error(`Table not found: ${tableName}`)
    error.guidance = 'Available tables: ' + JSON.stringify(DataProvider.getTableList(db))
    throw error
  }

  const schemaResult = pragmaResults[0]
  const columnNames = schemaResult.values.map((row: unknown[]) => row[1] as string)

  const requiredColumns = ['x', 'y', 'z']
  const missingColumns = requiredColumns.filter(col => !columnNames.includes(col))

  if (missingColumns.length > 0) {
    const error = new Error(
      `Table must have x, y, z columns. Table ${tableName} missing: ${missingColumns.join(', ')}`
    )
    error.guidance = 'Add the missing columns to your SQLite table before loading.'
    throw error
  }

  return { name: tableName, hasCluster: columnNames.includes('cluster') }
}

// src/views/WebGLPlayground.vue (update addError)
const addError = (error: Error | string) => {
  const message = error instanceof Error ? error.message : error
  const guidance = error instanceof Error ? (error as any).guidance : undefined

  errors.value.push({
    id: Date.now().toString(),
    message,
    guidance,
    timestamp: Date.now()
  })
  errorPanelExpanded.value = true
}

// Template - display guidance
<div v-if="errorPanelExpanded" class="error-list">
  <div v-for="error in errors" :key="error.id" class="error-item">
    <div class="error-content">
      <span class="error-message">{{ error.message }}</span>
      <span v-if="error.guidance" class="error-guidance">{{ error.guidance }}</span>
    </div>
    <button @click.stop="dismissError(error.id)" class="dismiss-btn">×</button>
  </div>
</div>

// Add CSS for guidance
.error-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.error-guidance {
  color: #ffcc80;
  font-size: 10px;
  font-style: italic;
  padding-left: 8px;
  border-left: 2px solid rgba(255, 204, 128, 0.5);
  margin-left: 8px;
}
```

**Common Error Guidance Mapping:**

| Error Type | Message | Guidance |
|------------|---------|----------|
| **JSON not array** | "JSON must be an array of points" | Expected format: [{"x": 1, "y": 2, "z": 3, "cluster": 0}, ...] |
| **Missing coordinates** | "Point X missing required coordinates (x, y, z)" | Each point must have x, y, z as numbers |
| **Invalid coordinate type** | "Point X has non-number x coordinate" | Coordinates must be numbers, not strings |
| **Dataset too large** | "Dataset too large: X points (max 30,000,000)" | Reduce dataset size or use a smaller sample |
| **Table not found** | "Table not found: tableName" | Available tables: [list] |
| **Missing columns** | "Table must have x, y, z columns. Missing: ..." | Add the missing columns to your SQLite table |
| **Database corrupt** | "Database corrupt or unreadable" | Try opening the file in SQLite Browser to verify integrity |
| **File read error** | "Failed to read file" | Check file permissions and try again |

**Build Order Dependency:** None (independent change, but requires ErrorInfo interface update first)

---

## Component Communication Patterns

### Pattern 1: Props Down, Events Up (Standard Vue)

```typescript
// Parent component
<ControlsOverlay
  :is-loading="isLoading"           // Prop down
  :current-file="currentFile"       // Prop down
  @file-selected="handleLoadFile"   // Event up
/>

// Child component
const props = defineProps<{
  isLoading: boolean
}>()
const emit = defineEmits<{
  'file-selected': [file: File]
}>()
```

**Use when:**
- Parent owns state
- Child needs to trigger parent action
- One-way data flow sufficient

### Pattern 2: Global Reactive Refs (Composables)

```typescript
// settings.ts
export const highlightedCluster = ref(-1)

// Any component
import { highlightedCluster } from '@/composables/settings'
highlightedCluster.value = 5  // Update
```

**Use when:**
- Multiple components need same state
- State is simple (primitive refs)
- No complex mutations needed

**Trade-offs:**
- ✅ Simple, no boilerplate
- ✅ Automatic reactivity
- ❌ Harder to track mutations (no single mutation point)
- ❌ Cannot use devtools to inspect state easily

### Pattern 3: Local State in Parent, Passed as Prop

```typescript
// WebGLPlayground.vue
const pointData = ref<PointData | null>(null)

// ControlsOverlay.vue
const props = defineProps<{
  pointData: PointData | null
}>()
```

**Use when:**
- Parent owns state for rendering (e.g., WebGL needs pointData)
- Child needs read-only access
- State mutation only happens in parent

## Anti-Patterns to Avoid

### Anti-Pattern 1: Mutation Props in Child

```typescript
// ❌ BAD: Child mutates prop
const props = defineProps<{ currentFile: File | null }>()
props.currentFile = newFile  // DON'T DO THIS

// ✅ GOOD: Child emits event to request change
const emit = defineEmits<{ 'file-selected': [file: File] }>()
emit('file-selected', newFile)
```

**Why bad:** Breaks one-way data flow, hard to debug, Vue warnings

### Anti-Pattern 2: Overusing Global State

```typescript
// ❌ BAD: Everything global
export const isLoading = ref(false)
export const currentFile = ref(null)
export const pointData = ref(null)

// ✅ GOOD: Use global state sparingly, parent-child otherwise
export const highlightedCluster = ref(-1)  // Only for settings
```

**Why bad:** Harder to track data flow, no ownership clear, difficult to refactor

### Anti-Pattern 3: Inconsistent Reset Values

```typescript
// ❌ BAD: Different reset values in different places
// initialization: highlightedCluster = -2
// switchToGenerated(): highlightedCluster = -1
// switchToLoaded(): highlightedCluster = -1

// ✅ GOOD: Consistent value everywhere
// initialization: highlightedCluster = -1
// switchToGenerated(): // no reset (already -1)
// switchToLoaded(): // no reset (already -1)
```

**Why bad:** Confusing UX, hard to maintain, bugs when new reset paths added

### Anti-Pattern 4: Silent Errors

```typescript
// ❌ BAD: Error caught but not communicated
try {
  await DataProvider.loadFromFile(file)
} catch (error) {
  console.error(error)  // Only logged, user sees nothing
}

// ✅ GOOD: Error communicated to user via error system
try {
  await DataProvider.loadFromFile(file)
} catch (error) {
  addError(error.message)  // User sees error panel
}
```

**Why bad:** Poor UX, user doesn't know what went wrong, can't recover

## Suggested Build Order

### Phase 1: Foundation Changes (Independent, low risk)

1. **Highlighted cluster reset consistency** (10 min)
   - Change initial value in `settings.ts`
   - Remove reset lines in `WebGLPlayground.vue`
   - Update display logic in `ControlsOverlay.vue`
   - **Why first:** Simple change, no dependencies, clarifies semantics

### Phase 2: UI Polish (Independent, low risk)

2. **Cluster slider disable** (15 min)
   - Add `hasData` computed in `ControlsOverlay.vue`
   - Disable slider when no data
   - Add visual feedback
   - **Why second:** Prevents confusing interaction, independent of other changes

### Phase 3: Enhanced UX (Independent, medium complexity)

3. **SQLite table auto-select** (20 min)
   - Add auto-emit logic in `DataLoadControl.vue`
   - Hide table selection when single table
   - Test edge cases (empty, zero tables)
   - **Why third:** Improves UX, no dependencies on previous phases

4. **Error recovery guidance** (30 min)
   - Update `ErrorInfo` interface
   - Add guidance strings to error sources
   - Update error panel UI
   - **Why last:** Most complex, requires changes across multiple files

### Parallel Development Option

Phases 1, 2, and 3 can be developed in parallel by different developers because they touch different files:
- Phase 1: `settings.ts`, `WebGLPlayground.vue`, `ControlsOverlay.vue`
- Phase 2: `ControlsOverlay.vue` (only)
- Phase 3: `DataLoadControl.vue` (only)

**Phase 4 (always last):** Error recovery guidance - touches error system, requires testing with all error types.

## Testing Considerations

### 1. Highlighted Cluster Reset

- Initial value is `-1` (All clusters)
- Switching between generated/loaded data maintains `-1` or current value
- Slider min is `-1`, max is `maxClusterId`

### 2. SQLite Auto-Select

- Single-table database auto-selects and loads
- Table selection UI hidden when single table
- Multiple-table database shows selection UI
- Empty database shows error

### 3. Slider Disable

- Slider disabled when `pointData` is `null`
- Slider disabled when `pointData.count` is `0`
- Slider enabled when data loaded
- Visual feedback (opacity, cursor) indicates disabled state

### 4. Error Recovery

- Error panel shows message + guidance
- Guidance varies by error type
- Dismissible errors remove from panel
- Multiple errors shown simultaneously
- Panel auto-expands on add, auto-collapses on clear

## Architecture Health Metrics

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| Component ownership clarity | ✅ Good | Maintain | Parent owns state, children emit events |
| State mutation points | ✅ Clear | Maintain | Props down, events up, minimal global state |
| Error visibility | ⚠️ Partial | Improve | Errors shown but no recovery guidance |
| Consistency of resets | ❌ Bad | Fix | Highlighted cluster has inconsistent reset values |
| Auto-loading convenience | ❌ Missing | Add | SQLite single-table requires manual load |
| Prevent confusing interaction | ❌ Missing | Add | Slider enabled even with no data |

## Sources

- **Codebase analysis** - All Vue components, composables, and core modules (HIGH confidence)
- **Vue 3 Composition API documentation** - Reactive refs, computed, watch patterns (HIGH confidence)
- **Project context** - Previous research files: SUMMARY.md, PITFALLS.md (HIGH confidence)

---

*Architecture research for: WebGL Clusters Playground v1.1 UX Refinements*
*Researched: February 4, 2026*
