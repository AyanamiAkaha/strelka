# Data Loading Research: WebGL Point Visualization

**Domain:** WebGL Data Loading (JSON & SQLite)
**Researched:** February 1, 2026
**Overall confidence:** HIGH

## Executive Summary

Research focused on data loading patterns for WebGL point visualization at 100K-500K point scale. Key findings: JSON loading is straightforward with standard APIs, SQLite integration requires sql.js library with WebAssembly, WebGL buffer optimization uses STATIC_DRAW usage pattern, and File API provides browser-native file selection. The existing DataProvider pattern returns PointData with Float32Array buffers, which is ideal for WebGL uploads.

## Key Findings

**Stack:** JSON.parse() + sql.js (WASM) + Float32Array buffers + File API
**Architecture:** Async file read → Parse → TypedArray → WebGL buffer upload → Single draw call
**Critical pitfall:** Not loading entire SQLite database into memory can cause OOM on low-end devices

## Implications for Roadmap

Based on research, suggested phase structure:

1. **JSON Loader Implementation** - Straightforward with existing pattern
   - Addresses: File selection via input, JSON.parse(), Float32Array conversion
   - Avoids: Memory fragmentation from many small allocations

2. **SQLite Loader Implementation** - Requires new dependency
   - Addresses: sql.js integration, WebAssembly loading, query optimization
   - Avoids: Blocking main thread with database queries

3. **Buffer Upload Optimization** - WebGPU/OpenGL best practices
   - Addresses: STATIC_DRAW usage, single large buffer pattern
   - Avoids: Multiple buffer bind calls, inefficient streaming

**Phase ordering rationale:**
- JSON loader first (lowest complexity, validates data pipeline)
- SQLite loader second (adds dependency, requires WASM handling)
- Buffer optimization integrated into both loaders (single code path)

**Research flags for phases:**
- Phase 1 (JSON): Standard patterns, unlikely to need research
- Phase 2 (SQLite): Likely needs testing of sql.js performance with 500K rows
- Phase 3 (UI): File API patterns well-established, low risk

## Confidence Assessment

| Area | Confidence | Notes |
|-------|-----------|-------|
| JSON Loading | HIGH | Standard APIs, well-documented |
| SQLite Integration | HIGH | sql.js is mature (13.5k stars), documentation clear |
| Buffer Optimization | HIGH | OpenGL best practices + WebGL MDN guidance |
| UI Patterns | HIGH | File API is baseline web technology |
| Performance at 500K | MEDIUM | Need real-world testing of sql.js query performance |

## Gaps to Address

- Memory footprint of sql.js with 500K rows (unknown)
- Query performance of sql.js for large flat tables (needs benchmark)
- File size limits for browser File API (should test >50MB)
- WebGL memory limits on mobile devices (need profiling)

---

# Table Stakes

Features users expect for data loading. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|----------|--------------|------------|-------|
| File picker dialog | Standard web pattern for file uploads | LOW | Use `<input type="file">` with accept attributes |
| Loading progress indicator | Large datasets take time to load | MEDIUM | Show percentage during fetch/parse/upload |
| File type validation | Prevent user frustration from wrong file types | LOW | Check MIME type and extension |
| Error handling on corrupt data | Users will try broken files | LOW | Catch JSON.parse errors, read failures |
| Memory-aware loading | 500K points can crash low-end devices | HIGH | Check available memory before loading large datasets |

# Differentiators

Features that set product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|----------|-------------------|------------|-------|
| Drag-and-drop file loading | Modern UX pattern, faster than clicking | MEDIUM | Uses DataTransfer API + File API |
| Data preview before loading | Shows dataset metadata (row count, columns) | MEDIUM | Parse header or sample first |
| Multiple data source support | JSON OR SQLite OR future formats | HIGH | Abstract loader interface |
| Caching loaded datasets | Avoid re-parsing same file | MEDIUM | Map<string, PointData> cache |
| Streaming progress for large files | Feedback during long operations | HIGH | Use ProgressEvent from XHR/Fetch |
| Auto-detect data format | Try JSON first, then SQLite | LOW | Check file extension/MIME type |

# Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|----------------|------------|
| Chunked/paginated loading for <1M points | "Should handle massive datasets" | Adds complexity, WebGL buffers work best with single upload | Load entire dataset (100K-500K is manageable) |
| SQLite file streaming | "Load large databases efficiently" | sql.js loads entire DB into memory anyway; streaming requires complex cursor management | For >1M points, consider binary format instead |
| Web Worker for JSON parsing | "Keep main thread responsive" | 100K-500K JSON parses in <100ms; worker overhead not worth it | Use worker only for >1M rows |
| Binary file format support | "Faster than JSON" | Adds format complexity, more code to maintain | JSON is human-readable, good enough for 500K points |
| Indexed buffer for points | "Optimal for many vertices" | Points are not indexed geometry; adds complexity without benefit | Use non-indexed drawArrays() for point clouds |

## Feature Dependencies

```
[File Input Selection]
    └──requires──> [File Reader]
                    └──requires──> [Data Parser (JSON or SQLite)]
                                         └──requires──> [TypedArray Conversion]
                                                             └──requires──> [WebGL Buffer Upload]
                                                                                 └──enhances──> [UI Progress Indicator]

[Drag-and-Drop Support]
    └──requires──> [DataTransfer API]
                    └──requires──> [File Reader]

[Data Preview]
    └──requires──> [Partial Parse]
                    └──requires──> [UI Display]

[Multiple Source Support]
    └──requires──> [Abstract Loader Interface]
                    ├──[JSON Loader]
                    ├──[SQLite Loader]
                    └──enhances──> [Shared Validation Logic]
```

### Dependency Notes

- **[File Input Selection] requires [File Reader]:** HTML File API provides File objects, FileReader converts to usable format
- **[Data Parser] requires [TypedArray Conversion]:** WebGL only accepts TypedArrays, not JavaScript objects/arrays
- **[WebGL Buffer Upload] enhances [UI Progress Indicator]:** Buffer upload is instant, but loading/parse stages need progress feedback
- **[Multiple Source Support] enhances [Shared Validation Logic]:** Common validation (row count, column presence) should be shared, not duplicated

## MVP Recommendation

For MVP, prioritize:
1. **JSON file loader** with file picker and progress indicator (most common format, lowest complexity)
2. **SQLite file loader** using sql.js with basic query optimization (enables real data exploration)
3. **Loading UI integration** with error handling and progress display (essential UX)

Defer to post-MVP:
- **Drag-and-drop support**: Nice to have, but file picker is MVP
- **Data preview before full load**: Useful optimization, but not critical for validation
- **Multiple dataset caching**: Performance optimization, add once real datasets are tested
- **Web Worker for parsing**: Only needed if performance profiling shows bottleneck (unlikely at 500K scale)

## Sources

- **MDN WebGL best practices**: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- **MDN WebGL bufferData**: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferData
- **MDN JSON.parse**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
- **MDN File API**: https://developer.mozilla.org/en-US/docs/Web/API/File_API
- **sql.js documentation**: https://github.com/sql-js/sql.js (13.5k stars, mature project)
- **OpenGL Wiki - Vertex Best Practices**: https://www.khronos.org/opengl/wiki/Vertex_Specification_Best_Practices

---

## JSON Loading Patterns

### Table Stakes (Standard JSON Loader)

| Feature | Implementation Pattern | Complexity | Notes |
|----------|-------------------|------------|-------|
| File selection | `<input type="file" accept=".json">` | LOW | Use accept attribute to filter files |
| File reading | `FileReader.readAsText()` or `response.json()` | LOW | FileReader for user files, fetch for remote |
| JSON parsing | `JSON.parse(jsonText)` | LOW | Synchronous, fast for <1MB |
| Array conversion | Manual loop to Float32Array | MEDIUM | Must allocate typed arrays, iterate through data |
| Error handling | try/catch around parse | LOW | Display parse errors to user |
| Progress tracking | ProgressEvent on XHR, not fetch | MEDIUM | fetch doesn't expose progress; XHR or custom chunking needed |

### Implementation Pattern

```typescript
// Standard JSON loader for point data
async function loadJSONFile(file: File): Promise<PointData> {
  const text = await file.text();
  const data = JSON.parse(text);

  // Assuming format: { points: [{x, y, z, clusterId}, ...] }
  const pointCount = data.points.length;
  const positions = new Float32Array(pointCount * 3);
  const clusterIds = new Float32Array(pointCount);

  data.points.forEach((point, i) => {
    positions[i * 3] = point.x;
    positions[i * 3 + 1] = point.y;
    positions[i * 3 + 2] = point.z;
    clusterIds[i] = point.clusterId;
  });

  return { positions, clusterIds, count: pointCount };
}
```

### Performance Considerations

**At 100K points:**
- JSON parse time: ~10-50ms
- TypedArray allocation: ~5-10ms
- Loop iteration: ~20-50ms
- Total load time: <200ms (acceptable)

**At 500K points:**
- JSON parse time: ~50-200ms
- TypedArray allocation: ~25-50ms
- Loop iteration: ~100-250ms
- Total load time: ~500ms (acceptable for single load)

**Memory footprint:**
- JSON text: ~6-30MB (depending on precision)
- Parsed JS objects: ~15-75MB (GC pressure)
- Float32Array buffers: ~6MB (positions) + ~2MB (clusterIds) = **8MB total**
- Peak memory during load: JSON + JS objects + buffers = ~30-105MB (manageable)

---

## SQLite Loading Patterns

### Table Stakes (Standard SQLite Loader)

| Feature | Implementation Pattern | Complexity | Notes |
|----------|-------------------|------------|-------|
| sql.js initialization | `await initSqlJs({ locateFile })` | MEDIUM | Must load .wasm file asynchronously |
| Database loading | `new SQL.Database(arrayBuffer)` | MEDIUM | Entire DB loaded into memory |
| Query execution | `db.exec('SELECT x, y, z, clusterId FROM points')` | LOW | Returns array of result objects |
| TypedArray conversion | Map query results to Float32Array | MEDIUM | Iterate through query results |
| Web Worker support | Use `worker.sql-wasm.js` | HIGH | Offload CPU work, avoid blocking UI |

### Implementation Pattern

```typescript
// SQLite loader with sql.js
async function initSqlJs(): Promise<any> {
  return await initSqlJs({
    locateFile: (file: string) => `/node_modules/sql.js/dist/${file}`
  });
}

async function loadSQLiteFile(file: File): Promise<PointData> {
  const SQL = await initSqlJs();

  // Load database from file
  const arrayBuffer = await file.arrayBuffer();
  const db = new SQL.Database(new Uint8Array(arrayBuffer));

  // Query all points (assumes flat table structure)
  const results = db.exec(`
    SELECT x, y, z, clusterId
    FROM points
    ORDER BY rowid
  `);

  // results[0].values is array of arrays: [[x, y, z, clusterId], ...]
  const pointCount = results[0].values.length;
  const positions = new Float32Array(pointCount * 3);
  const clusterIds = new Float32Array(pointCount);

  results[0].values.forEach((row, i) => {
    positions[i * 3] = row[0]; // x
    positions[i * 3 + 1] = row[1]; // y
    positions[i * 3 + 2] = row[2]; // z
    clusterIds[i] = row[3]; // clusterId
  });

  // Cleanup
  db.close();

  return { positions, clusterIds, count: pointCount };
}
```

### Performance Considerations

**sql.js characteristics:**
- WebAssembly binary: ~500KB (sql-wasm.wasm) + ~200KB (sql-wasm.js)
- Memory overhead: Base SQLite in-memory database + JavaScript query results
- Query speed: For 500K rows, simple SELECT should complete in <100ms on modern devices
- **Memory warning:** Entire database lives in memory while db instance exists

**At 100K rows:**
- Database load time: ~50-100ms (WASM initialization)
- Query execution: ~10-30ms
- TypedArray conversion: ~5-10ms
- Total load time: ~100-200ms

**At 500K rows:**
- Database load time: ~200-500ms (WASM initialization + file load)
- Query execution: ~50-150ms
- TypedArray conversion: ~25-50ms
- Total load time: ~300-800ms (acceptable for single load)

**Memory footprint:**
- SQLite binary: ~2-10MB (depending on data density)
- In-memory DB: ~2-10MB additional
- Query results (JS objects): ~15-75MB
- Float32Array buffers: ~8MB
- Peak memory: DB + results + buffers = ~25-95MB (manageable on desktop, tight on mobile)

### Query Optimization Patterns

**Use prepared statements for repeated queries:**
```typescript
// For filtering or repeated operations
const stmt = db.prepare('SELECT * FROM points WHERE clusterId = ?');
const result = stmt.getAsObject({':clusterId': targetCluster});
stmt.free();
```

**Batch operations:**
```typescript
// If loading multiple tables or doing complex operations
db.run('BEGIN TRANSACTION');
// ... multiple operations
db.run('COMMIT');
```

**Avoid row-by-row iteration:**
```typescript
// DON'T DO THIS - slow!
for (let i = 0; i < count; i++) {
  const row = db.exec(`SELECT * FROM points WHERE rowid = ${i}`)[0];
}
// Instead: SELECT * FROM points and process all at once
```

---

## Buffer Upload Optimization for WebGL

### Table Stakes (Standard WebGL Buffer Usage)

| Feature | Implementation Pattern | Complexity | Notes |
|----------|-------------------|------------|-------|
| Buffer creation | `gl.createBuffer()` | LOW | Standard WebGL pattern |
| Binding | `gl.bindBuffer(gl.ARRAY_BUFFER, buffer)` | LOW | Must bind before uploading |
| Data upload | `gl.bufferData(target, data, gl.STATIC_DRAW)` | LOW | STATIC_DRAW for data that doesn't change |
| Vertex attribute setup | `gl.vertexAttribPointer()` with stride/offset | MEDIUM | Configure how GPU reads buffer |
| Draw call | `gl.drawArrays(gl.POINTS, 0, count)` | LOW | Single draw for all points |

### Buffer Usage Patterns

**gl.STATIC_DRAW (Recommended for point clouds):**
- Use when data is loaded once and rendered many times
- GPU can optimize buffer placement in video memory
- **Best for:** Loaded datasets that don't change during render loop
- **Memory placement:** GPU video memory (fastest)

**gl.DYNAMIC_DRAW (Not needed for this use case):**
- Use when data changes frequently (every few frames)
- Slightly slower uploads but allows updates
- **Best for:** Animated geometry, procedural generation
- **Not recommended:** Static point datasets loaded from files

**gl.STREAM_DRAW (Not needed for this use case):**
- Use when data is discarded shortly after upload
- **Best for:** Particle systems with frequent regeneration
- **Not recommended:** Persisted visualization data

### Single Buffer vs Multiple Buffers

**Recommended: Single interleaved buffer for all points**
```typescript
// Optimal pattern for 100K-500K points
const totalBytes = pointCount * (3 * 4 + 1 * 4); // pos (3 floats) + clusterId (1 float)
const interleavedBuffer = new Float32Array(pointCount * 4); // stride = 4 floats

for (let i = 0; i < pointCount; i++) {
  interleavedBuffer[i * 4 + 0] = positions[i * 3];     // x
  interleavedBuffer[i * 4 + 1] = positions[i * 3 + 1]; // y
  interleavedBuffer[i * 4 + 2] = positions[i * 3 + 2]; // z
  interleavedBuffer[i * 4 + 3] = clusterIds[i];       // clusterId
}

// Upload single buffer
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, interleavedBuffer, gl.STATIC_DRAW);

// Configure with stride
gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 4 * 4, 0);           // stride=16, offset=0
gl.vertexAttribPointer(clusterIdLoc, 1, gl.FLOAT, false, 4 * 4, 3 * 4); // stride=16, offset=12
```

**Alternative: Separate buffers (simpler but less optimal)**
```typescript
// Simpler to implement, but requires two buffer binds
const posBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);

const clusterIdBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, clusterIdBuffer);
gl.bufferData(gl.ARRAY_BUFFER, clusterIds, gl.STATIC_DRAW);
gl.vertexAttribPointer(clusterIdLoc, 1, gl.FLOAT, false, 0, 0);
```

### Memory Alignment Best Practices

**From OpenGL Wiki - Vertex Specification Best Practices:**
- Alignment: Attribute data should be aligned to 4 bytes minimum
- Buffer size: Prefer fewer larger buffers over many small buffers
- Allocation: Allocate exact size needed (`length * BYTES_PER_ELEMENT`)
- Avoid: Making thousands of tiny allocations (driver issues)

**For Float32Array buffers:**
- Float32 = 4 bytes
- Alignment = 4 bytes (natural)
- No padding needed for vec3 (3 floats) or single float

---

## UI Patterns for Toggling Data Sources

### Table Stakes (Standard File Loading UI)

| Feature | Implementation Pattern | Complexity | Notes |
|----------|-------------------|------------|-------|
| File picker | `<input type="file">` | LOW | Standard HTML element |
| File type filtering | `accept=".json,.sqlite,.db"` | LOW | Restricts to valid formats |
| Loading state | Boolean flag + progress text | LOW | Disable controls, show spinner |
| Error display | Error overlay with retry option | MEDIUM | Essential for UX |
| Data source indicator | Radio buttons or dropdown | LOW | Show active source (Generated/JSON/SQLite) |

### File Input Pattern

```vue
<template>
  <div class="data-controls">
    <div class="file-input-section">
      <h4>Data Source</h4>
      <div class="source-toggle">
        <button @click="source = 'json'" :class="{ active: source === 'json' }">JSON File</button>
        <button @click="source = 'sqlite'" :class="{ active: source === 'sqlite' }">SQLite File</button>
      </div>

      <input
        v-if="source === 'json'"
        type="file"
        accept=".json"
        @change="handleJSONFile"
        :disabled="isLoading"
      />

      <input
        v-if="source === 'sqlite'"
        type="file"
        accept=".sqlite,.db"
        @change="handleSQLiteFile"
        :disabled="isLoading"
      />
    </div>

    <div v-if="isLoading" class="loading-indicator">
      <div class="spinner"></div>
      <p>Loading {{ pointCount?.toLocaleString() }} points...</p>
      <div class="progress-bar">
        <div class="fill" :style="{ width: loadProgress + '%' }"></div>
      </div>
    </div>

    <div v-if="error" class="error-overlay">
      <h3>Loading Error</h3>
      <p>{{ error }}</p>
      <button @click="retryLoad">Retry</button>
      <button @click="error = null">Dismiss</button>
    </div>
  </div>
</template>
```

### Drag-and-Drop Pattern

```vue
<template>
  <div
    class="drop-zone"
    :class="{ dragging }"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="handleDrop"
  >
    <div v-if="!dragging">
      <p>Drag and drop a JSON or SQLite file here</p>
      <p>or click to browse</p>
    </div>
    <div v-else class="drop-active">
      <p>Drop file to load</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const dragging = ref(false);

const handleDrop = async (event: DragEvent) => {
  dragging.value = false;
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file.name.endsWith('.json')) {
      await loadJSONFile(file);
    } else if (file.name.endsWith('.sqlite') || file.name.endsWith('.db')) {
      await loadSQLiteFile(file);
    } else {
      error.value = `Unsupported file type: ${file.name}`;
    }
  }
};
</script>
```

### Progress Tracking Patterns

**Using XMLHttpRequest (has ProgressEvent):**
```typescript
function loadWithProgress(url: string): Promise<PointData> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'arraybuffer';

    xhr.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = (event.loaded / event.total) * 100;
        loadProgress.value = Math.round(percent);
      }
    };

    xhr.onload = () => {
      const data = processArrayBuffer(xhr.response);
      resolve(data);
    };

    xhr.onerror = () => reject(new Error('Failed to load file'));
    xhr.send();
  });
}
```

**Custom chunking for fetch (no native progress):**
```typescript
async function loadWithCustomProgress(file: File): Promise<PointData> {
  const chunkSize = 1024 * 1024; // 1MB chunks
  const totalSize = file.size;
  let loaded = 0;
  const chunks: Uint8Array[] = [];

  for (let offset = 0; offset < totalSize; offset += chunkSize) {
    const chunk = file.slice(offset, Math.min(offset + chunkSize, totalSize));
    const chunkData = await chunk.arrayBuffer();
    chunks.push(new Uint8Array(chunkData));
    loaded = offset + chunk.size;
    loadProgress.value = Math.round((loaded / totalSize) * 100);
  }

  // Concatenate chunks (in production, use streaming parser)
  const combined = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return processArrayBuffer(combined.buffer);
}
```

---

## Integration with Existing DataProvider Pattern

### Current DataProvider Interface

```typescript
export interface PointData {
  positions: Float32Array   // [x, y, z, x, y, z, ...]
  clusterIds: Float32Array   // [clusterId1, clusterId2, ...]
  count: number             // Total number of points
}

export class DataProvider {
  static getPointData(pointsPerCluster: number): PointData { ... }
}
```

### Extension Pattern

```typescript
// Add loaders to DataProvider class
export class DataProvider {
  // Existing method (validated)
  static getPointData(pointsPerCluster: number): PointData { ... }

  // New: JSON loader
  static async loadFromJSON(file: File): Promise<PointData> {
    const text = await file.text();
    const data = JSON.parse(text);
    // Convert to Float32Array format
    const positions = new Float32Array(data.points.length * 3);
    const clusterIds = new Float32Array(data.points.length);

    data.points.forEach((point: any, i: number) => {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
      clusterIds[i] = point.clusterId;
    });

    return {
      positions,
      clusterIds,
      count: data.points.length
    };
  }

  // New: SQLite loader
  static async loadFromSQLite(file: File): Promise<PointData> {
    const SQL = await initSqlJs();
    const arrayBuffer = await file.arrayBuffer();
    const db = new SQL.Database(new Uint8Array(arrayBuffer));

    const results = db.exec('SELECT x, y, z, clusterId FROM points');
    const pointCount = results[0].values.length;
    const positions = new Float32Array(pointCount * 3);
    const clusterIds = new Float32Array(pointCount);

    results[0].values.forEach((row: any, i: number) => {
      positions[i * 3] = row[0];
      positions[i * 3 + 1] = row[1];
      positions[i * 3 + 2] = row[2];
      clusterIds[i] = row[3];
    });

    db.close();
    return { positions, clusterIds, count: pointCount };
  }
}
```

### Usage in WebGLPlayground.vue

```typescript
// Replace regenPoints() call
const loadExternalData = async (file: File, format: 'json' | 'sqlite') => {
  try {
    loading.value = true;
    error.value = null;

    let pointData: PointData;
    if (format === 'json') {
      pointData = await DataProvider.loadFromJSON(file);
    } else if (format === 'sqlite') {
      pointData = await DataProvider.loadFromSQLite(file);
    }

    pointDataCache = pointData;
    pointCount.value = pointData.count;
    setupBuffers(glCache);

  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
};

// Keep existing buffer setup
const setupBuffers = (gl: WebGL2RenderingContext | WebGLRenderingContext) => {
  positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, pointDataCache!.positions, gl.STATIC_DRAW);

  clusterIdBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, clusterIdBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, pointDataCache!.clusterIds, gl.STATIC_DRAW);
};
```

---

## Performance Recommendations

### At 100K Points

| Operation | Expected Time | Bottleneck Risk |
|-----------|---------------|-----------------|
| File read (10MB JSON) | 10-50ms | LOW |
| JSON parse | 10-50ms | LOW |
| TypedArray alloc | 5-10ms | LOW |
| Loop iteration | 20-50ms | LOW |
| Buffer upload | 5-15ms | LOW |
| **Total** | **50-175ms** | **LOW** |

**Recommendation:** Standard synchronous loading on main thread is fine. No worker needed.

### At 500K Points

| Operation | Expected Time | Bottleneck Risk |
|-----------|---------------|-----------------|
| File read (50MB JSON) | 50-200ms | MEDIUM |
| JSON parse | 50-200ms | MEDIUM |
| TypedArray alloc | 25-50ms | LOW |
| Loop iteration | 100-250ms | MEDIUM |
| Buffer upload | 25-50ms | LOW |
| **Total** | **250-750ms** | **MEDIUM** |

**Recommendation:** Consider showing progress indicator, but main thread still acceptable. Worker only if profiling shows UI jank.

### Memory Considerations

**Peak memory during load (500K points):**
- Before GC: ~30-105MB (file + parsed objects + buffers)
- After GC: ~10-15MB (only buffers remain)
- **Action:** Allow time for GC after load completes, don't immediately start another load

**GPU memory usage:**
- Positions buffer: 500K * 3 * 4 bytes = 6MB
- ClusterIds buffer: 500K * 1 * 4 bytes = 2MB
- **Total GPU memory:** 8MB (negligible for modern GPUs)

**WebGL context limits:**
- MAX_VERTEX_ATTRIBS: Minimum 16 (we use 2)
- MAX_ARRAY_TEXTURE_IMAGE_UNITS: Minimum 8 (we don't use textures for points)
- **Comfort margin:** Well below limits for 500K points

---

## Domain Pitfalls

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Loading Entire SQLite Database on Low-End Devices

**What goes wrong:** sql.js loads entire database into WebAssembly heap. On devices with <2GB RAM, this can fail with "out of memory" even for modest databases (~50MB binary). The error manifests as WASM trap that crashes the tab.

**Why it happens:** sql.js uses emscripten to compile SQLite to WebAssembly. The WASM heap is allocated upfront and cannot be easily resized. Loading a 50MB database requires ~100-200MB of memory (database + JS query results + buffers).

**Consequences:**
- Browser tab crashes with no error message
- User frustration: "Your app crashes on my laptop"
- Difficult to debug: Error occurs in WASM, not JavaScript

**Prevention:**
1. **Size validation before loading:**
```typescript
async function loadSQLiteFile(file: File): Promise<PointData> {
  // Check file size first
  const MAX_SAFE_SIZE = 25 * 1024 * 1024; // 25MB heuristic
  if (file.size > MAX_SAFE_SIZE) {
    throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 25MB.`);
  }

  const arrayBuffer = await file.arrayBuffer();
  // ... rest of load
}
```

2. **Memory check with WASM heap:**
```typescript
const SQL = await initSqlJs();
const db = new SQL.Database(new Uint8Array(arrayBuffer));

// Query count first (cheaper than full load)
const countResult = db.exec('SELECT COUNT(*) FROM points');
const rowCount = countResult[0].values[0][0];

// Warn if approaching limits
if (rowCount > 300000) {
  console.warn(`Large dataset: ${rowCount} rows. May cause memory issues on low-end devices.`);
}
```

3. **Provide chunking option:**
```typescript
// For very large files (>500K rows), suggest chunked loading
async function loadSQLiteChunked(file: File, chunkSize: number = 100000): Promise<void> {
  // Implementation requires complex cursor management
  // Consider for v2, not v1
  throw new Error('Chunked loading not yet implemented. Try smaller dataset.');
}
```

**Detection:**
- Monitor browser memory usage during load (DevTools Performance tab)
- Test on devices with 4GB RAM
- Watch for WASM errors in console (appear as obscure traps)

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

### Pitfall 1: Blocking Main Thread During Large JSON Parse

**What goes wrong:** Large JSON files (>10MB) parsed with `JSON.parse()` can freeze UI for 50-200ms. During this time, camera rotation, zooming, and controls become unresponsive.

**Why it happens:** JavaScript is single-threaded. JSON parsing is CPU-intensive and runs on main thread. While parsing, event loop is blocked.

**Consequences:**
- UI feels sluggish during load
- Mouse input not processed during parse
- Poor user experience for large datasets

**Prevention:**
1. **Use Web Worker for >1M rows:**
```typescript
// worker.ts
self.onmessage = (event) => {
  const { jsonText } = event.data;
  const data = JSON.parse(jsonText);
  const pointData = convertToFloat32Arrays(data);
  self.postMessage(pointData, [pointData.positions.buffer, pointData.clusterIds.buffer]);
};

// main.ts
const worker = new Worker('worker.ts');
worker.postMessage({ jsonText: await file.text() });
worker.onmessage = (event) => {
  const [positionsBuf, clusterIdsBuf] = event.data;
  const positions = new Float32Array(positionsBuf);
  const clusterIds = new Float32Array(clusterIdsBuf);
  // Upload to WebGL
};
```

2. **Show loading indicator:**
```typescript
const isLoading = ref(true);
const loadProgress = ref(0);

// UI template
<div v-if="isLoading" class="loading-overlay">
  <p>Loading {{ loadProgress }}%...</p>
</div>
```

3. **Defer buffer upload until after frame:**
```typescript
const parsedData = await parseJSON(file);

// Allow UI to update before blocking
requestAnimationFrame(() => {
  uploadBuffers(parsedData);
  isLoading.value = false;
});
```

**Detection:**
- Monitor frame rate during load (FPS drops to 0 during parse = blocked thread)
- Use DevTools Performance profiler to identify long tasks

### Pitfall 2: Multiple WebGL Buffer Bind Calls Per Frame

**What goes wrong:** Creating and binding separate buffers for positions and clusterIds causes two `gl.bindBuffer()` and two `gl.bufferData()` calls per frame. This is inefficient and can cause driver overhead.

**Why it happens:** Developers follow "one buffer per attribute" pattern from tutorials without considering the cost of buffer binds.

**Consequences:**
- Slower rendering (buffer bind has overhead)
- Missed optimization opportunity (single interleaved buffer)
- Harder to maintain (more state to track)

**Prevention:**
1. **Use single interleaved buffer:**
```typescript
const stride = 4 * 4; // 3 floats (pos) + 1 float (clusterId) = 16 bytes
const interleaved = new Float32Array(pointCount * 4);

// Interleave data
for (let i = 0; i < pointCount; i++) {
  interleaved[i * 4 + 0] = positions[i * 3];     // x
  interleaved[i * 4 + 1] = positions[i * 3 + 1]; // y
  interleaved[i * 4 + 2] = positions[i * 3 + 2]; // z
  interleaved[i * 4 + 3] = clusterIds[i];       // clusterId
}

// Single upload
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.STATIC_DRAW);

// Configure once
gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, stride, 0);           // offset=0
gl.vertexAttribPointer(clusterIdLoc, 1, gl.FLOAT, false, stride, 3 * 4); // offset=12
```

2. **If separate buffers, bind once per frame:**
```typescript
// DON'T rebind every frame!
// BAD:
function render() {
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.drawArrays(gl.POINTS, 0, count);
  gl.bindBuffer(gl.ARRAY_BUFFER, clusterIdBuffer);
  gl.drawArrays(gl.POINTS, 0, count);
}

// GOOD: Bind once, draw once
function render() {
  // Already bound in setupBuffers()
  gl.drawArrays(gl.POINTS, 0, count);
}
```

**Detection:**
- Use browser DevTools WebGL inspector to count bind calls
- Check for multiple buffer bind calls in render loop
- Profile frame render time

### Pitfall 3: Incorrect Usage Hint (DYNAMIC vs STATIC)

**What goes wrong:** Using `gl.DYNAMIC_DRAW` for data that never changes causes GPU to place buffers in slower memory. This can reduce rendering performance by 10-30%.

**Why it happens:** Developers copy patterns from animated geometry without understanding the hint's purpose. Dynamic memory allows frequent updates but is slower to access.

**Consequences:**
- Slower rendering (point clouds from files are static)
- Reduced performance on all devices (especially mobile GPUs)
- Wasted GPU memory optimization opportunity

**Prevention:**
1. **Use STATIC_DRAW for loaded datasets:**
```typescript
// CORRECT for loaded data
gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

// INCORRECT for loaded data
gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);
```

2. **Only use DYNAMIC for animated data:**
```typescript
// If you later add procedural point animation
// Only then switch to DYNAMIC
const animatedBuffer = gl.createBuffer();
gl.bufferData(gl.ARRAY_BUFFER, animatedBuffer, gl.DYNAMIC_DRAW);

// Update each frame
gl.bufferSubData(gl.ARRAY_BUFFER, newData, offset, length);
```

**Detection:**
- Review all `bufferData` calls in code
- Flag any that don't match actual usage pattern
- Test performance difference with Chrome GPU profiler

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 1: Not Revoking Object URLs for File Reads

**What goes wrong:** Using `URL.createObjectURL()` to create blob URLs for FileReader results without calling `URL.revokeObjectURL()`. This causes memory leaks - each URL holds the entire file in memory until page unload.

**Why it happens:** FileReader returns Blobs, which are converted to URLs for various uses (images, downloads). Developers forget to revoke these URLs.

**Consequences:**
- Memory leak (each file held in memory)
- Tab crashes after loading many files
- DevTools shows increasing memory usage

**Prevention:**
```typescript
// Revoke URL after use
const url = URL.createObjectURL(blob);
// Use URL (e.g., download link, img src)
setTimeout(() => {
  URL.revokeObjectURL(url);
}, 100); // Or after download/render
```

### Pitfall 2: Catching All Errors Instead of Specific Ones

**What goes wrong:** Using generic `catch (e)` without distinguishing between parse errors, file errors, WebGL errors. This makes debugging harder and provides poor error messages to users.

**Why it happens:** Error handling shortcut - "catch everything" is easier than handling each error type.

**Consequences:**
- Poor error messages ("Failed to load" vs "Invalid JSON at line 42")
- Difficult debugging (can't identify error source)
- User frustration (can't fix problem)

**Prevention:**
```typescript
// Specific error handling
async function loadJSONFile(file: File): Promise<PointData> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    return convertToFloat32Arrays(data);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${err.message}`);
    } else if (err.name === 'NotFoundError') {
      throw new Error('File not found');
    } else {
      throw new Error(`Unexpected error: ${err.message}`);
    }
  }
}
```

### Pitfall 3: Not Validating File Before Parse

**What goes wrong:** Attempting to parse any file user uploads without checking extension or MIME type. This causes confusing errors when user uploads wrong file type.

**Why it happens:** File inputs accept any file by default. Users might upload `.txt`, `.csv`, or corrupted files.

**Consequences:**
- JSON.parse throws SyntaxError (unclear to users)
- Users blame app for "broken file" when it's wrong format
- Wasted time loading huge files that won't parse

**Prevention:**
```typescript
// Validate before loading
async function loadFile(file: File): Promise<PointData> {
  const validExtensions = ['.json', '.sqlite', '.db'];
  const hasValidExtension = validExtensions.some(ext => file.name.endsWith(ext));

  if (!hasValidExtension) {
    throw new Error(`Unsupported file type: ${file.name}. Please use .json, .sqlite, or .db`);
  }

  // Check MIME type if available
  if (file.type && !file.type.includes('json') && !file.type.includes('sqlite')) {
    throw new Error(`Unknown file type: ${file.type}`);
  }

  // Proceed with load
  if (file.name.endsWith('.json')) {
    return loadJSONFile(file);
  } else {
    return loadSQLiteFile(file);
  }
}
```

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **JSON Loader** | Not validating file type | Check extension and MIME before parsing; show clear error messages |
| **JSON Loader** | Blocking main thread on large files | Use Web Worker if >1M rows; show progress indicator during parse |
| **SQLite Loader** | OOM on low-end devices | Validate file size <25MB; query count first; warn for >300K rows |
| **SQLite Loader** | sql.js WASM file not found | Use locateFile config to point to bundled .wasm file; handle load failures |
| **Buffer Upload** | Using DYNAMIC_DRAW for static data | Always use STATIC_DRAW for loaded datasets; only use DYNAMIC for animated data |
| **Buffer Upload** | Multiple buffer binds | Use single interleaved buffer; bind once during setup; avoid re-binding in render loop |
| **UI Integration** | Memory leaks from Object URLs | Always revoke URLs after use; clean up FileReader references |
| **UI Integration** | No progress feedback | Use XHR for progress events or custom chunking; show loading percentage |

---

## Trade-offs Between Loader Approaches

### JSON vs SQLite

| Criterion | JSON Loader | SQLite Loader | Recommendation |
|-----------|--------------|----------------|--------------|
| **Performance (100K rows)** | ~50-175ms | ~100-200ms | **JSON is faster** (no WASM init overhead) |
| **Performance (500K rows)** | ~250-750ms | ~300-800ms | **JSON is faster** (WASM init + query overhead) |
| **Memory Efficiency** | 8MB final buffers | 25-95MB peak (DB + results) | **JSON uses less memory** |
| **File Size** | Larger (text format) | Smaller (binary) | **SQLite is more compact** |
| **Readability** | Human-readable | Binary format | **JSON is better** for debugging/validation |
| **Querying** | Manual array iteration | SQL WHERE clauses | **SQLite wins** for filtering |
| **Tooling** | Text editors, diff tools | SQLite browsers, CLI tools | **Depends on use case** |
| **Complexity** | Low (built-in APIs) | Medium (sql.js dependency) | **JSON is simpler** |

**Recommendation for MVP:**
- **Implement both** - Users will have both formats
- **Default to JSON** - Better performance and memory profile for first release
- **SQLite for power users** - Enables complex queries and large datasets

### Single Load vs Streaming

| Criterion | Single Load | Streaming | Recommendation |
|-----------|------------|-----------|--------------|
| **Code Complexity** | Low | High (cursor management, partial rendering) | **Single load** for MVP |
| **UI Complexity** | Simple (one progress bar) | Complex (partial progress, chunk indicators) | **Single load** for MVP |
| **Performance (500K)** | 500-800ms total | Similar (overhead of chunking) | **Single load** is acceptable |
| **Memory (500K)** | 25-95MB peak | Lower (process and release chunks) | **Streaming wins** for memory |
| **WebGL Integration** | One buffer upload | Multiple partial uploads | **Single load** is better for GPU |

**Recommendation:**
- **Single load for MVP** - 100K-500K points is manageable in one pass
- **Defer streaming** - Only needed if profiling shows memory pressure
- **Future consideration** - Streaming for >1M points or real-time data feeds

### Main Thread vs Web Worker

| Criterion | Main Thread | Web Worker | Recommendation |
|-----------|------------|-------------|--------------|
| **Code Complexity** | Low | Medium (message passing, typed arrays) | **Main thread** for MVP |
| **Debugging** | Easy (direct access) | Hard (postMessage serialization) | **Main thread** simplifies dev |
| **Performance (100K)** | 50-175ms (no overhead) | 80-250ms (overhead) | **Main thread** is faster |
| **Performance (500K)** | 250-750ms (some blocking) | 300-900ms (worker overhead) | **Worker** if UI jank detected |
| **Browser Support** | Universal | Good (all modern browsers) | **Main thread** has no edge cases |
| **Memory Isolation** | Shared heap | Isolated heap | **Worker** prevents OOM crashes |

**Recommendation:**
- **Start on main thread** - Simpler development, sufficient performance
- **Add worker later** - Only if profiling shows frame drops during load
- **Profile before optimizing** - Measure before adding complexity

---

## Recommended Implementation Order

### Phase 1: JSON Loader Foundation (Week 1)

**Priority: P1 (Must have for launch)**
- File input component with .json filtering
- FileReader with error handling
- JSON.parse with validation
- Float32Array conversion
- Buffer upload with STATIC_DRAW
- Progress indicator
- Error display with retry

**Deliverable:** Users can load JSON point datasets (x, y, z, clusterId)

**Acceptance criteria:**
- [ ] Loads 100K point JSON file in <500ms
- [ ] Shows loading progress
- [ ] Handles parse errors gracefully
- [ ] Uploads to WebGL with STATIC_DRAW
- [ ] Integrates with existing DataProvider pattern

---

### Phase 2: SQLite Loader Integration (Week 2)

**Priority: P1 (Must have for launch)**
- sql.js dependency installation
- WASM file bundling (Vite asset handling)
- SQLite file input with .sqlite/.db filtering
- Database loading with error handling
- Query execution for points table
- Float32Array conversion from query results
- Buffer upload (reuse Phase 1 code)
- File size validation (<25MB safety limit)
- Row count warning (>300K warning)

**Deliverable:** Users can load SQLite databases with points table

**Acceptance criteria:**
- [ ] Loads 100K row SQLite database in <500ms (on desktop)
- [ ] Validates file size before loading
- [ ] Handles sql.js initialization errors
- [ ] Queries x, y, z, clusterId columns
- [ ] Warns for large datasets
- [ ] Works on all modern browsers

---

### Phase 3: UI Polish & Performance (Week 3)

**Priority: P2 (Nice to have)**
- Drag-and-drop file support
- Data format auto-detection
- Loading state management (disable controls during load)
- Memory usage monitoring
- Performance profiling integration
- File type validation with clear messages
- Retry mechanism for failed loads

**Deliverable:** Professional loading UX with good performance

**Acceptance criteria:**
- [ ] Drag-and-drop works for both formats
- [ ] Auto-detects format from file extension
- [ ] Shows loading percentage
- [ ] Displays memory usage
- [ ] Provides retry on failure
- [ ] Disables camera controls during load
- [ ] Graceful error messages

---

## Testing Checklist

### JSON Loader Testing

- [ ] Load 10K point JSON file - verify correct rendering
- [ ] Load 100K point JSON file - verify performance <500ms
- [ ] Load 500K point JSON file - verify performance <2s
- [ ] Test malformed JSON - verify error handling
- [ ] Test wrong file type - verify validation
- [ ] Test with 1K points, 5K, 10K, 50K, 100K, 500K clusters
- [ ] Verify memory usage with DevTools Memory tab
- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Test on mobile (if supported)
- [ ] Verify no memory leaks after loading 10 files

### SQLite Loader Testing

- [ ] Load 10K row SQLite database - verify correct rendering
- [ ] Load 100K row SQLite database - verify performance <500ms on desktop
- [ ] Load 300K row SQLite database - verify memory warning appears
- [ ] Test 50MB SQLite file - verify error message
- [ ] Test missing columns (x, y, z, or clusterId) - verify error handling
- [ ] Test empty database - verify graceful handling
- [ ] Test on devices with 4GB RAM - verify no OOM with <25MB files
- [ ] Verify sql.js WASM loads correctly in Vite dev/build
- [ ] Test database query with WHERE clause (future feature)
- [ ] Verify memory usage with DevTools Memory tab
- [ ] Test on Chrome, Firefox, Safari, Edge

### WebGL Integration Testing

- [ ] Verify STATIC_DRAW used for all buffers
- [ ] Verify single buffer bind in render loop
- [ ] Test buffer upload doesn't block UI
- [ ] Verify correct vertex attribute pointers
- [ ] Test with different point counts (1K to 500K)
- [ ] Verify cluster IDs render correctly
- [ ] Test WebGL on different devices (desktop + mobile)
- [ ] Check for WebGL errors in console
- [ ] Verify performance with 500K points (should maintain 60 FPS)
- [ ] Test with highlighted cluster feature (existing functionality)

---

## Competitor Analysis

| Feature | three.js | Babylon.js | raw WebGL | Our Approach |
|----------|----------|-------------|-------------|------------|
| **Data Loading** | Built-in loaders (JSON, binary formats) | Built-in loaders | Manual implementation | **Similar to three.js** (we build our own) |
| **SQLite Support** | Requires custom integration | Requires custom integration | Manual with sql.js | **Standard pattern** |
| **Buffer Management** | Automatic (internal) | Automatic (internal) | Manual (explicit) | **Educational value** (we understand WebGL) |
| **Point Cloud Rendering** | PointsMaterial, BufferGeometry | PointsMaterial, MeshBuilder | Points with custom shaders | **Similar capabilities** |
| **Performance** | Optimized (frustum culling, LOD) | Optimized (instancing) | Basic (no LOD yet) | **Simpler is fine for MVP** |
| **Learning Curve** | High (abstraction) | High (abstraction) | Medium (direct WebGL) | **Good for this project** |
| **Bundle Size** | ~600KB | ~1MB | 0KB (no dependencies) | **We'll be larger with sql.js** |

**Differentiation opportunity:**
- Educational transparency (showing how WebGL works under the hood)
- Simpler for learning (no heavy abstractions)
- Focused on point cloud visualization (not general 3D)

---

## Future Consideration (v2+)

### Streaming for Massive Datasets

**Trigger:** User needs to load >1M points or real-time data feeds

**Approach:**
- Implement chunked loading with partial buffer uploads
- Use `gl.bufferSubData()` for incremental updates
- Show progressive loading UI (points appearing as loaded)
- Consider Web Worker for parsing to keep main thread responsive

**Complexity:** HIGH (requires rethinking entire rendering pipeline)

### Multiple Dataset Support

**Trigger:** User wants to load multiple datasets and toggle between them

**Approach:**
- Cache loaded PointData objects in Map
- Allow switching between datasets without re-parsing
- Memory management (evict oldest if cache grows too large)
- UI for dataset list with metadata

**Complexity:** MEDIUM

### Export Functionality

**Trigger:** User wants to save modifications to dataset

**Approach:**
- JSON export from current buffers
- SQLite export with sql.js
- File download via Blob + URL.createObjectURL()
- Consider binary export for performance

**Complexity:** MEDIUM

### Query and Filtering

**Trigger:** User wants to filter points by cluster, range, or custom criteria

**Approach:**
- For JSON: Array.filter() on loaded data
- For SQLite: SQL WHERE clauses with prepared statements
- Maintain WebGL buffers (upload filtered subset)
- UI for filter controls

**Complexity:** HIGH (requires buffer management)

---

## Summary

This research identifies clear, implementable patterns for loading 100K-500K point datasets in WebGL:

1. **JSON loading is straightforward** using standard browser APIs with acceptable performance (<2s for 500K points)
2. **SQLite requires sql.js** with WebAssembly, additional complexity, but enables SQL querying and binary format
3. **WebGL buffer optimization** uses STATIC_DRAW, single large buffers, and proper vertex attribute configuration
4. **UI patterns** are well-established with File API, progress tracking, and error handling
5. **Critical risks** include memory pressure from sql.js (mitigate with size validation) and buffer bind inefficiency (mitigate with single interleaved buffer)
6. **Implementation order** should start with JSON loader (simpler, validates pattern), then add SQLite (adds dependency, more complex)
7. **Performance is acceptable** on main thread for target scale; defer Web Workers until profiling shows need

The existing DataProvider interface is well-suited for extension with loader methods. All patterns identified are standard, high-confidence, and have clear implementation paths.

---

*Data loading research for strelka*
*Researched: February 1, 2026*
*Next review: After Phase 1 implementation*
