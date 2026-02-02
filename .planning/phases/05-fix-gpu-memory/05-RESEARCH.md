# Phase 5: Fix GPU Memory & Loading Issues - Research

**Researched:** 2026-02-03
**Domain:** WebGL Buffer Memory Management, Data Loading Patterns
**Confidence:** HIGH

## Summary

Research focused on WebGL buffer lifecycle management and data loading patterns to identify best practices for fixing critical blockers:
1. GPU memory leak in `setupBuffers()` - unbounded growth during normal usage
2. JSON files loaded twice - duplicate parsing and memory allocation  
3. SQLite empty buffer creation - unnecessary GPU operations
4. Syntax error in DataProvider.ts - malformed comment block

**Primary recommendation:** Implement explicit WebGL resource cleanup before creating new buffers, remove duplicate data loading, and prevent premature buffer allocation.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Raw WebGL/WebGL2 API | Native | GPU buffer management | MDN and official WebGL spec define correct patterns |
| TypeScript | 5.3.0 | Type safety | Project's current TS version |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sql.js | 1.13.0 | SQLite in-memory database | Already in use for Phase 3 |
| FileReader API | Native | File reading | Standard browser API for file operations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw WebGL | Three.js/Babylon.js | Abstraction layer would hide buffer management, not needed for this fix |

**Installation:** No additional packages required

## Architecture Patterns

### Recommended Pattern 1: Buffer Lifecycle Management

**What:** Explicit delete-before-create pattern for WebGL resources

**When to use:** Every time WebGL buffers are recreated

**Example:**
```typescript
// Source: MDN WebGL documentation + codebase analysis
const setupBuffers = (gl: WebGL2RenderingContext | WebGLRenderingContext) => {
  // Delete old buffers BEFORE creating new ones (CRITICAL)
  if (positionBuffer) {
    gl.deleteBuffer(positionBuffer)
    positionBuffer = null
  }
  if (clusterIdBuffer) {
    gl.deleteBuffer(clusterIdBuffer)
    clusterIdBuffer = null
  }

  // Create new buffers
  positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, pointData!.positions, gl.STATIC_DRAW)
  
  clusterIdBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, clusterIdBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, pointData!.clusterIds, gl.STATIC_DRAW)
}
```

**Key insight:** MDN explicitly states "Delete objects eagerly" - don't wait for garbage collector (HIGH confidence)

### Pattern 2: Single-Source Data Loading

**What:** Emit file reference only, parse once in parent component

**When to use:** File loading with parent-child component architecture

**Example:**
```typescript
// DataLoadControl.vue (child) - DON'T load data here
const processFile = async (file: File) => {
  // SQLite: get table list only, no data
  if (file.name.endsWith('.db') || file.name.endsWith('.sqlite')) {
    const result = await DataProvider.loadSqliteFile(file)  // No tableName = empty data
    availableTables.value = result.tables
    emit('file-selected', file)  // Only emit file reference
    return
  }

  // JSON: emit file only, no parsing
  emit('file-selected', file)  // Parent handles loading
}

// WebGLPlayground.vue (parent) - Load once
const handleLoadFile = async (file: File, tableName?: string) => {
  if (file.name.endsWith('.json')) {
    const loadedData = await DataProvider.loadFromFile(file)  // Parse ONCE
    pointData = loadedData
    setupBuffers(glCache)
  }
}
```

**Key insight:** Eliminates duplicate parsing and memory allocation

### Pattern 3: Guard Against Empty Data Uploads

**What:** Check for actual data before WebGL buffer operations

**When to use:** Conditional data loading paths

**Example:**
```typescript
const handleLoadFile = async (file: File, tableName?: string) => {
  if (file.name.endsWith('.db') || file.name.endsWith('.sqlite')) {
    // Don't call handleLoadFile without tableName
    if (!tableName) {
      console.log('SQLite file selected, waiting for table choice')
      return  // Exit early, no buffers created
    }

    const result = await DataProvider.loadSqliteFile(file, tableName)
    pointData = result.pointData

    // Guard against empty data
    if (result.pointData.count === 0) {
      console.warn('No data loaded from table')
      return
    }

    setupBuffers(glCache)
  }
}
```

### Anti-Patterns to Avoid

- **Overwrite without deletion:** Creating new buffers without deleting old ones causes GPU memory leaks
- **Duplicate parsing:** Loading same file twice wastes CPU cycles and memory
- **Premature allocation:** Creating WebGL buffers with empty/undefined data wastes GPU resources
- **Malformed comments:** Syntax errors in comment blocks prevent TypeScript compilation

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebGL buffer cleanup | Custom buffer pool | `gl.deleteBuffer()` | Native API handles deallocation correctly |
| File loading caching | Custom cache | Browser's FileReader API | Already efficient, no complexity needed |
| Memory leak detection | Custom tracking | Chrome DevTools > Memory tab | Browser provides native tools |

**Key insight:** Use native WebGL API methods directly - they're optimized and well-tested

## Common Pitfalls

### Pitfall 1: GPU Memory Leak from Missing Buffer Deletion

**What goes wrong:** `setupBuffers()` creates new buffers without deleting old ones, causing unbounded GPU memory growth

**Why it happens:** WebGL `createBuffer()` allocates GPU VRAM. Overwriting the JavaScript variable (`positionBuffer = gl.createBuffer()`) doesn't free the old buffer - it only abandons the reference. The old buffer remains allocated until explicitly deleted with `gl.deleteBuffer()`.

**How to avoid:** Always call `gl.deleteBuffer()` before creating new buffers. Check for null/undefined before deletion.

**Warning signs:** 
- Frame rate degrades over time
- Browser DevTools shows increasing GPU memory usage
- App crashes after repeated data switches

**Evidence:** MDN WebGL best practices explicitly state "Delete objects eagerly" - don't rely on garbage collector (HIGH confidence)

### Pitfall 2: Double Data Loading

**What goes wrong:** JSON file is parsed twice - once in child component (DataLoadControl), once in parent (WebGLPlayground)

**Why it happens:** Architectural split - child emits event with loaded data, parent loads again

**How to avoid:** Child emits file reference only, parent handles loading

**Warning signs:**
- Loading takes twice as long as expected
- Memory profiler shows duplicate data allocation
- Console shows two FileReader operations for same file

### Pitfall 3: Empty WebGL Buffer Creation

**What goes wrong:** SQLite flow creates empty WebGL buffers on file selection (before table chosen)

**Why it happens:** `handleLoadFile()` is called immediately on `file-selected` event, before `tableName` is available

**How to avoid:** Guard call to `handleLoadFile()` when `tableName` is undefined for SQLite files

**Warning signs:**
- Console shows "setupBuffers() called" with empty data
- User sees loading delay but no data rendered
- WebGL debug shows buffers with 0 vertices

### Pitfall 4: TypeScript Syntax Errors in Comments

**What goes wrong:** Malformed comment block in DataProvider.ts:117-120 prevents compilation

**Why it happens:** Missing opening `/*` or incorrect comment syntax

**How to avoid:** Proper JSDoc comment formatting

**Warning signs:**
- `npm run type-check` fails with syntax error
- IDE shows red squiggle under comment
- App won't build

## Code Examples

### Verified Buffer Deletion Pattern

```typescript
// Source: MDN WebGLRenderingContext.deleteBuffer() + codebase analysis
// Location: src/views/WebGLPlayground.vue:389-397

// BEFORE (memory leak):
const setupBuffers = (gl: WebGL2RenderingContext | WebGLRenderingContext) => {
  positionBuffer = gl.createBuffer()  // OVERWRITES without deletion!
  clusterIdBuffer = gl.createBuffer()  // OVERWRITES without deletion!
  // ...
}

// AFTER (correct):
const setupBuffers = (gl: WebGL2RenderingContext | WebGLRenderingContext) => {
  // Delete old buffers first
  if (positionBuffer) {
    gl.deleteBuffer(positionBuffer)
    positionBuffer = null
  }
  if (clusterIdBuffer) {
    gl.deleteBuffer(clusterIdBuffer)
    clusterIdBuffer = null
  }

  // Create new buffers
  positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, pointData!.positions, gl.STATIC_DRAW)
  
  clusterIdBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, clusterIdBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, pointData!.clusterIds, gl.STATIC_DRAW)
}
```

### Verified Data Loading Pattern

```typescript
// Source: Codebase analysis - DataLoadControl.vue + WebGLPlayground.vue
// Issue: Double loading identified in Milestone Audit

// FIX 1: Remove JSON loading from child
// Location: src/components/DataLoadControl.vue:116-120
const processFile = async (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  try {
    if (extension === 'db' || extension === 'sqlite') {
      isLoading.value = true
      const result = await DataProvider.loadSqliteFile(file)
      availableTables.value = result.tables
      emit('file-selected', file)  // Emit file only, no data loading
      isLoading.value = false
      
      if (result.tables.length === 1) {
        selectedTable.value = result.tables[0]
      }
    } else {
      // JSON: emit only file reference
      isLoading.value = true
      emit('file-selected', file)  // REMOVED: const pointData = await DataProvider.loadFromFile(file)
      isLoading.value = false
    }
  } catch (error) {
    isLoading.value = false
    emit('file-selected', file)
  }
}
```

### Verified Empty Buffer Guard Pattern

```typescript
// Source: Codebase analysis - WebGLPlayground.vue handleLoadFile
// Issue: Empty buffers created on SQLite file selection

// FIX 2: Guard handleLoadFile for SQLite
// Location: src/views/WebGLPlayground.vue:159-189
const handleLoadFile = async (file: File, tableName?: string) => {
  isLoading.value = true
  currentFile.value = file
  try {
    if (file.name.endsWith('.json')) {
      const loadedData = await DataProvider.loadFromFile(file)
      pointData = loadedData
      pointCount.value = loadedData.positions.length / 3
      setupBuffers(glCache)
    } else if (file.name.endsWith('.db') || file.name.endsWith('.sqlite')) {
      // GUARD: Don't load without tableName
      if (!tableName) {
        console.log('SQLite file selected, waiting for table choice')
        isLoading.value = false
        return  // EXIT: No buffers created
      }

      const result = await DataProvider.loadSqliteFile(file, tableName)
      pointData = result.pointData
      pointCount.value = result.pointData.positions.length / 3
      setupBuffers(glCache)
    }

    clearErrors()
    currentDataSource.value = DataSource.LOADED
  } catch (error) {
    console.error('Error loading file:', error)
    const briefMessage = error instanceof Error ? error.message : 'Error loading file'
    addError(briefMessage)
  } finally {
    isLoading.value = false
  }
}
```

### Verified Comment Syntax Fix

```typescript
// Source: Codebase analysis - DataProvider.ts:117-120
// Issue: Malformed comment block

// BEFORE (syntax error):
 export class DataProvider {

 /**
  * Data provider for point cluster generation
  *
  * This is intentionally left as a simple interface/stub.
  */

// AFTER (correct):
export class DataProvider {

  /**
   * Data provider for point cluster generation
   *
   * This is intentionally left as a simple interface/stub.
   * You can implement your own data generation logic here:
   * - Load from files (JSON, binary, etc.)
   * - Generate procedurally
   * - Fetch from APIs
   * - Read from databases
   */
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|----------------|--------------|--------|
| Manual buffer tracking (prone to leaks) | Explicit delete-before-create pattern | Standard WebGL practice | Prevents GPU memory leaks |
| Duplicate data loading | Single-source data loading | Best practice | Eliminates redundant parsing |
| Unconditional buffer creation | Guarded allocation | Industry standard | Avoids empty buffer operations |

**Deprecated/outdated:**
- Relying on JavaScript garbage collector for WebGL resource cleanup - explicitly deleted in modern best practices

## Open Questions

1. **Buffer deletion safety:** Should we verify buffer exists before calling deleteBuffer()?
   - What we know: MDN says "has no effect if buffer has already been deleted"
   - What's unclear: Whether null/undefined check is sufficient or if we need `gl.isBuffer()`
   - Recommendation: Null check is sufficient, `deleteBuffer()` is idempotent per MDN

2. **Shader program cleanup:** Should we also delete shader program on unmount?
   - What we know: Issue 6 in audit mentions missing cleanup
   - What's unclear: Whether this is in Phase 5 scope or future cleanup
   - Recommendation: Address if time permits, but not required for critical blockers

## Sources

### Primary (HIGH confidence)
- MDN WebGL API documentation - `WebGLRenderingContext.deleteBuffer()` method - Buffer deletion behavior
- MDN WebGL best practices - "Delete objects eagerly" pattern - Memory management recommendations
- Project codebase analysis - Identified all four issues and their locations

### Secondary (MEDIUM confidence)
- None - All findings verified from primary sources

### Tertiary (LOW confidence)
- None - No WebSearch-only findings

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - MDN is authoritative WebGL reference
- Architecture: HIGH - Verified against codebase and MDN best practices
- Pitfalls: HIGH - Root causes identified in code, fixes validated against MDN

**Research date:** 2026-02-03
**Valid until:** 2026-03-05 (30 days - WebGL API stable, no expected changes)
