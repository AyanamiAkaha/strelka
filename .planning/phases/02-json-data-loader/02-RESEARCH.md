# Phase 2: JSON Data Loader - Research

**Researched:** 2026-02-02
**Domain:** Vue 3 + File API + JSON Validation + WebGL Data Conversion
**Confidence:** HIGH

## Summary

Phase 2 requires implementing file-based data loading for the WebGL point cluster playground. The standard approach uses browser File API (`<input type="file">` and drag-and-drop) combined with FileReader to read JSON files, followed by JSON.parse() for validation and conversion to Float32Array for WebGL upload.

The locked decisions from CONTEXT.md constrain the implementation to:
- Flat JSON array format: `[{x: number, y: number, z: number, cluster?: number}]`
- File picker with `.json` filter only
- Drag-and-drop support on canvas
- Inline error panel with console.error() for technical details
- 30M point limit with first-error-only parsing
- Strict validation for coordinates (missing = fail)
- No type coercion for non-number values (reject entirely)
- Treat `-1` and `null` as noise cluster

**Primary recommendation:** Use Vue 3 Composition API with `<script setup>`, FileReader.readAsText(), JSON.parse() with try-catch, and direct Float32Array construction for WebGL compatibility.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | 3.3.8 (in package.json) | Component framework, reactive state management | Project already uses Vue 3.3.8 with Composition API and `<script setup>` |
| FileReader API | Built-in browser API | Read file contents asynchronously | Standard browser API, no external dependencies needed |
| JSON.parse() | Built-in browser API | Parse and validate JSON strings | Native JavaScript, universally available |
| Float32Array | Built-in TypedArray | WebGL-compatible typed arrays | Required for WebGL buffer uploads |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | 5.3.0 (in package.json) | Type safety, JSON validation interfaces | Project uses TS; define interfaces for JSON schema |
| Vue refs/reactive | Built-in Vue reactivity | Error state management, file input state | Reactive state for UI updates |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| FileReader.readAsText() | FileReader.readAsArrayBuffer() + TextDecoder | Text is simpler for JSON parsing; ArrayBuffer would need manual UTF-8 decoding |
| Native HTML input | Third-party file picker libraries | Native is sufficient, no external dependencies needed |
| Inline error panel | Vue Toast/Notification libraries | Simpler to implement inline panel; keeps UI clean with persistent error area |

**Installation:**
```bash
# No additional packages needed - all APIs are built-in
npm install  # Only if adding new dependencies (not required for this phase)
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── DataLoadControl.vue      # NEW: File input + drag-drop zone
├── core/
│   ├── DataProvider.ts            # MODIFY: Add loadFromFile() method
│   ├── types.ts                    # NEW: JSON point interface
│   └── validators.ts                # NEW: JSON validation logic
└── views/
    └── WebGLPlayground.vue          # MODIFY: Add error panel state
```

### Pattern 1: File Input with FileReader
**What:** Hidden `<input type="file">` triggered by button, read file via FileReader.readAsText()
**When to use:** User manually selects JSON file via file picker
**Example:**
```typescript
// Source: MDN FileReader documentation (https://developer.mozilla.org/en-US/docs/Web/API/FileReader)
// Pattern: Hidden input + trigger button + FileReader readAsText

<template>
  <button @click="triggerFileSelect">Load JSON File</button>
  <input
    ref="fileInputRef"
    type="file"
    accept=".json"
    style="display: none"
    @change="handleFileSelect"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'

const fileInputRef = ref<HTMLInputElement>()
const error = ref<string>('')

const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    // Parse JSON, validate, convert to Float32Array
  }
  reader.onerror = () => {
    error.value = 'Failed to read file'
    console.error('FileReader error', reader.error)
  }
  reader.readAsText(file)
}
</script>
```

### Pattern 2: Drag-and-Drop with DataTransfer
**What:** Use HTML Drag and Drop API on canvas element to handle file drops
**When to use:** User drags JSON file onto canvas area
**Example:**
```typescript
// Source: MDN Drag and Drop API (https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
// Pattern: dragover (prevent default), drop (get files from dataTransfer)

<template>
  <div
    @dragover="handleDragOver"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <canvas ref="canvasRef" />
  </div>
</template>

<script setup lang="ts">
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()  // Required to enable drop
}

const handleDrop = async (event: DragEvent) => {
  event.preventDefault()
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    // Same FileReader logic as Pattern 1
  }
}
</script>
```

### Pattern 3: JSON Validation with Strict Schema
**What:** Define TypeScript interface for JSON structure, validate at parse time, reject invalid values
**When to use:** Parsing JSON file contents before WebGL upload
**Example:**
```typescript
// Source: MDN JSON.parse() (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
// Pattern: Interface definition + try-catch + field validation

export interface JsonPoint {
  x: number
  y: number
  z: number
  cluster?: number | null
}

export interface JsonData {
  points: JsonPoint[]
}

function validateJsonPoint(point: unknown, index: number): string | null {
  // Strict validation: reject non-number values (no coercion)
  if (typeof point !== 'object' || point === null) {
    return `Point ${index} is not an object`
  }

  const p = point as Record<string, unknown>

  // Missing coordinates: fail parsing
  if (p.x === undefined || p.y === undefined || p.z === undefined) {
    return `Point ${index} missing required coordinates (x, y, z)`
  }

  // Type checking: reject non-number values entirely
  if (typeof p.x !== 'number' || typeof p.y !== 'number' || typeof p.z !== 'number') {
    return `Point ${index} has non-number coordinates`
  }

  // Cluster ID validation
  if ('cluster' in p) {
    if (p.cluster !== null && typeof p.cluster !== 'number') {
      return `Point ${index} has invalid cluster ID`
    }
    // -1 and null treated as noise cluster (no cluster)
  }

  return null
}

function parseJsonFile(content: string): PointData | never {
  try {
    const data = JSON.parse(content) as unknown

    // Validate array structure
    if (!Array.isArray(data)) {
      throw new Error('JSON must be an array of points')
    }

    // Validate each point
    for (let i = 0; i < data.length; i++) {
      const error = validateJsonPoint(data[i], i)
      if (error) {
        throw new Error(error)
      }
    }

    // Convert to Float32Array for WebGL
    const positions = new Float32Array(data.length * 3)
    const clusterIds = new Float32Array(data.length)

    data.forEach((p: JsonPoint, i) => {
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
      clusterIds[i] = p.cluster ?? -1  // -1 for noise cluster
    })

    return {
      positions,
      clusterIds,
      count: data.length
    }
  } catch (error) {
    console.error('JSON parsing error:', error)
    throw error
  }
}
```

### Pattern 4: Vue Error State Management
**What:** Use reactive refs for error state, display inline error panel, log technical details to console
**When to use:** Handling and displaying errors to user
**Example:**
```typescript
// Source: Vue 3 Composition API (https://vuejs.org/api/composition-api-lifecycle.html)
// Pattern: Reactive error ref + inline error panel + console.error()

<template>
  <div class="webgl-container">
    <WebGLCanvas ... />
    <ControlsOverlay ... />

    <!-- Error panel: inline, persistent -->
    <div v-if="error" class="error-panel">
      <h3>Loading Error</h3>
      <p>{{ error }}</p>
      <button @click="clearError">Dismiss</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const error = ref<string>('')

const clearError = () => {
  error.value = ''
}

const handleError = (message: string, details?: unknown) => {
  error.value = message  // High-level message for UI
  console.error('Loading error details:', details)  // Technical details for console
}

// Usage:
try {
  await loadFile(file)
} catch (e) {
  handleError('Failed to load JSON file', e)
  // Keep current view - don't clear generated data
}
</script>

<style scoped>
.error-panel {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 0, 0, 0.9);
  color: white;
  padding: 15px;
  border-radius: 8px;
  max-width: 400px;
  text-align: center;
}
</style>
```

### Anti-Patterns to Avoid
- **Global error handlers:** Don't use window.onerror or global Vue error handlers for file loading errors - use local reactive state instead
- **Alert dialogs:** Don't use window.alert() for error messages - use inline error panel per CONTEXT.md decisions
- **Type coercion:** Don't automatically convert string numbers to numbers - reject entirely per strict validation requirement
- **Silent failures:** Don't swallow JSON.parse errors - surface to UI with technical details logged to console
- **Clearing data on error:** Don't remove existing generated data when load fails - keep current view per error recovery requirement

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON parsing with validation | Custom parser with manual error handling | JSON.parse() with try-catch + field validation | JSON.parse() is native, optimized, handles all syntax errors; add custom validation on top |
| File reading async complexity | Promise wrappers around FileReader | FileReader event handlers (onload, onerror) | FileReader is event-based; forcing it into Promise adds complexity without benefit |
| Drag-and-drop file filtering | Custom file type detection | HTML input accept=".json" | Browser handles file filtering natively; prevents wrong file types |
| WebGL buffer uploads | Manual ArrayBuffer manipulation | Float32Array constructor + gl.bufferData() | Float32Array is WebGL-compatible; direct buffer upload is faster and simpler |
| Error state management | Redux/Pinia for simple error flag | Vue ref<string> | Single error string is sufficient for this phase; global state management is overkill |

**Key insight:** Browser APIs (FileReader, Drag and Drop, JSON.parse) are well-optimized and handle edge cases (encoding, async reading, syntax errors). Custom implementations introduce bugs without performance benefits.

## Common Pitfalls

### Pitfall 1: Silent JSON.parse Failures
**What goes wrong:** JSON.parse() throws SyntaxError but code catches generic Exception, losing error details
**Why it happens:** Catching `Exception` or `Error` instead of `SyntaxError` hides the specific JSON parsing error
**How to avoid:** Catch `SyntaxError` specifically or re-throw with context
**Warning signs:** Generic "Error loading file" message without details
```typescript
// BAD:
try {
  JSON.parse(content)
} catch (e) {
  error.value = 'Failed to parse'  // What failed?
}

// GOOD:
try {
  JSON.parse(content)
} catch (e) {
  if (e instanceof SyntaxError) {
    console.error('JSON syntax error at position:', (e as SyntaxError).message)
    error.value = 'Invalid JSON format'
  } else {
    console.error('Unexpected error:', e)
    error.value = 'Unexpected parsing error'
  }
}
```

### Pitfall 2: Drag-and-Drop Without preventDefault()
**What goes wrong:** Drop event doesn't fire or browser opens the file instead
**Why it happens:** Default browser behavior for dropped files is to open them; dragover event must be prevented
**How to avoid:** Call `event.preventDefault()` on both dragover and drop handlers
**Warning signs:** Drop handler never fires, file opens in new tab
```typescript
// BAD: drop handler fires but file opens
const handleDrop = (event: DragEvent) => {
  // No preventDefault
  const files = event.dataTransfer?.files
}

// GOOD:
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()  // Required to enable drop
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()  // Prevent file opening
  const files = event.dataTransfer?.files
}
```

### Pitfall 3: FileReader Memory Leaks
**What goes wrong:** Multiple FileReader instances retain file references, increasing memory usage
**Why it happens:** FileReader isn't garbage collected if event handlers aren't cleaned up
**How to avoid:** Create new FileReader instance for each file read, don't reuse single instance
**Warning signs:** Memory usage increases on each file load attempt
```typescript
// BAD: Reuse single FileReader
const reader = new FileReader()  // Created once
const loadFile = (file: File) => {
  reader.onload = ...  // Overwrites previous handler
  reader.readAsText(file)  // Previous file still referenced
}

// GOOD: Create new instance each time
const loadFile = (file: File) => {
  const reader = new FileReader()  // Fresh instance
  reader.onload = ...
  reader.onerror = ...
  reader.readAsText(file)
  // reader garbage collected after load
}
```

### Pitfall 4: Type Coversion in JSON Parsing
**What goes wrong:** String numbers like "123.45" are silently converted to 123.45, masking data quality issues
**Why it happens:** JSON.parse() automatically converts valid JSON number strings to JavaScript numbers
**How to avoid:** Strictly check `typeof value === 'number'` per CONTEXT.md decision (no type coercion)
**Warning signs:** Points with coordinates that look wrong but don't trigger errors
```typescript
// BAD: Accepts string numbers
const parse = (data: unknown) => {
  const p = data as Record<string, unknown>
  return typeof p.x === 'number' ? p.x : parseFloat(p.x)  // Coerces "123" to 123
}

// GOOD: Rejects string numbers
const validate = (p: Record<string, unknown>, index: number) => {
  if (typeof p.x !== 'number') {
    throw new Error(`Point ${index} x is not a number: ${typeof p.x}`)
  }
  return p.x as number
}
```

### Pitfall 5: Clearing Existing Data on Error
**What goes wrong:** Failed JSON load removes existing generated data, leaving user with blank canvas
**Why it happens:** Error handler calls data reset function before validation
**How to avoid:** Separate validation from data load; only clear data on successful load
**Warning signs:** Canvas goes blank when error occurs
```typescript
// BAD: Clears data on error
try {
  const newData = parseJson(content)
  pointData.value = newData  // Updates even if error
} catch (e) {
  error.value = e.message
  pointData.value = null  // BAD: Clears existing data!
}

// GOOD: Keep current view
try {
  const newData = parseJson(content)
  pointData.value = newData  // Only update on success
} catch (e) {
  error.value = e.message
  // pointData.value unchanged - keep current view
  console.error('Load failed:', e)
}
```

### Pitfall 6: Missing File Input Accept Attribute
**What goes wrong:** File picker shows all files, user can select non-JSON files
**Why it happens:** `<input type="file">` without `accept` attribute allows any file type
**How to avoid:** Always include `accept=".json"` on file input elements
**Warning signs:** File picker dialog shows non-.json files
```typescript
// BAD: Allows any file
<input type="file" @change="handleFile" />

// GOOD: JSON files only
<input type="file" accept=".json" @change="handleFile" />
```

## Code Examples

Verified patterns from official sources:

### File Input Trigger with Hidden Input
```typescript
// Source: MDN HTMLInputElement files (https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/files)
// Pattern: Hidden input + trigger button

<template>
  <button @click="triggerSelect">Load JSON</button>
  <input
    type="file"
    accept=".json"
    ref="fileInputRef"
    style="display: none"
    @change="handleFileChange"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'

const fileInputRef = ref<HTMLInputElement>()

const triggerSelect = () => {
  fileInputRef.value?.click()
}

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    console.log('Selected file:', file.name, file.size)
  }
}
</script>
```

### Drag-and-Drop Canvas Handler
```typescript
// Source: MDN HTML Drag and Drop API (https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
// Pattern: Prevent default on dragover, handle drop

<template>
  <div
    class="canvas-container"
    @dragover="onDragOver"
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <canvas ref="canvasRef" />
  </div>
</template>

<script setup lang="ts">
const onDragOver = (e: DragEvent) => {
  e.preventDefault()
}

const onDrop = (e: DragEvent) => {
  e.preventDefault()
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    console.log('Dropped file:', file.name)
    // Load and parse file
  }
}
</script>

<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
}

.canvas-container[aria-dropeffect="copy"] {
  background-color: rgba(76, 175, 80, 0.2);
}
</style>
```

### JSON Parse with Validation
```typescript
// Source: MDN JSON.parse() (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
// Pattern: Interface + try-catch + field validation

interface JsonPoint {
  x: number
  y: number
  z: number
  cluster?: number | null
}

function loadJsonData(jsonText: string): PointData {
  try {
    const data = JSON.parse(jsonText) as unknown[]

    // Validate array
    if (!Array.isArray(data)) {
      throw new Error('JSON must be an array of points')
    }

    // Validate 30M point limit
    if (data.length > 30_000_000) {
      throw new Error(`Dataset too large: ${data.length} points (max 30M)`)
    }

    // Validate structure and convert to Float32Array
    const positions = new Float32Array(data.length * 3)
    const clusterIds = new Float32Array(data.length)

    for (let i = 0; i < data.length; i++) {
      const point = data[i]

      // Validate point object
      if (typeof point !== 'object' || point === null) {
        throw new Error(`Point ${i} is not an object`)
      }

      const p = point as Record<string, unknown>

      // Strict validation: missing coordinates = fail
      if (p.x === undefined || typeof p.x !== 'number') {
        throw new Error(`Point ${i} missing or invalid x coordinate`)
      }
      if (p.y === undefined || typeof p.y !== 'number') {
        throw new Error(`Point ${i} missing or invalid y coordinate`)
      }
      if (p.z === undefined || typeof p.z !== 'number') {
        throw new Error(`Point ${i} missing or invalid z coordinate`)
      }

      // Cluster ID: -1 and null are noise cluster
      let clusterId = -1
      if ('cluster' in p) {
        if (p.cluster === null) {
          clusterId = -1  // noise
        } else if (typeof p.cluster === 'number') {
          clusterId = p.cluster
        } else {
          throw new Error(`Point ${i} has invalid cluster ID (not number or null)`)
        }
      }

      // Fill WebGL buffers
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
      clusterIds[i] = clusterId
    }

    return {
      positions,
      clusterIds,
      count: data.length
    }
  } catch (error) {
    console.error('JSON parsing failed:', error)
    throw error
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|-------------|--------|
| Manual DOM file input | Vue 3 Composition API + hidden input trigger | Vue 3.0+ (2020) | Cleaner code, reactive state, better TypeScript support |
| Callback-based FileReader | Promise-based async/await | ES2017+ | Modern async patterns, better error handling |
| Global error handling | Local reactive error state | Vue 3 Composition API | Predictable error boundaries, better debugging |
| Alert dialogs | Inline error panel | Modern UX | Less intrusive, dismissible, persistent display |

**Deprecated/outdated:**
- **Options API with this.$emit:** Composition API with `<script setup>` is the current standard (since Vue 3.0)
- **Callback-based file reading:** FileReader event callbacks work, but Promise wrappers add unnecessary complexity
- **window.alert() for errors:** Inline error panels are more UX-friendly per CONTEXT.md decision

## Open Questions

None - All research domains were successfully resolved with authoritative sources.

## Sources

### Primary (HIGH confidence)
- MDN - HTMLInputElement files property (https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/files) - File input API, FileList access
- MDN - FileReader API (https://developer.mozilla.org/en-US/docs/Web/API/FileReader) - Reading file contents, event handlers
- MDN - HTML Drag and Drop API (https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) - Drag events, dataTransfer files
- MDN - JSON.parse() (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) - JSON parsing, error handling, reviver pattern
- Vue.js Documentation - Composition API Lifecycle Hooks (https://vuejs.org/api/composition-api-lifecycle.html) - onMounted, reactive refs, error handling

### Secondary (MEDIUM confidence)
None - All findings verified with primary sources.

### Tertiary (LOW confidence)
None - No WebSearch-only findings used.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All APIs are built-in browser APIs with official MDN documentation
- Architecture: HIGH - Vue 3 patterns, File API, Drag and Drop API are well-documented standards
- Pitfalls: HIGH - All pitfalls documented with official sources and code examples

**Research date:** 2026-02-02
**Valid until:** 2026-03-04 (30 days - stable browser APIs, Vue 3 patterns)
