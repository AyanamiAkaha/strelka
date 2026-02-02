# Phase 3: SQLite Data Loader - Research

**Researched:** 2026-02-03
**Domain:** sql.js WebAssembly + SQLite queries + Float32Array conversion
**Confidence:** HIGH

## Summary

Phase 3 requires implementing SQLite database file loading using sql.js WebAssembly library. Users can load .db/.sqlite files (or any SQLite-compatible format), select tables, and query point data with x, y, z coordinates and optional cluster IDs. The implementation follows Phase 2 patterns: Vue 3 Composition API, FileReader API for file reading, drag-and-drop support, error panel UI, and 30M point limit enforcement.

The locked decisions from CONTEXT.md constrain implementation to:
- Single "Load Data" button for both JSON and SQLite files
- Prompt user to select which table to use from database
- Require strict column naming: 'x', 'y', 'z' columns are required
- Cluster column is optional; treat missing cluster as -1
- Show specific missing columns in error messages
- Block UI while loading, use generic "Loading data..." message
- Granular error messages: "Database corrupt", "Table not found", "Missing columns: x, y"
- Display errors in same panel as JSON Phase 2
- Preserve existing point data on load failure
- No retry button - user must reselect file after error

**Primary recommendation:** Use sql.js v1.13.0 with initSqlJs() for WebAssembly initialization, FileReader.readAsArrayBuffer() for binary SQLite files, db.exec() for table listing, and db.prepare()/db.each() for efficient data extraction with Float32Array conversion.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sql.js | 1.13.0 (latest) | SQLite WebAssembly library for browser | Active development (last release Mar 2025), Emscripten 4.x + SQLite 3.49, well-documented API |
| FileReader API | Built-in browser API | Read SQLite binary files as ArrayBuffer | Standard browser API, no external dependencies needed |
| Vue 3 | 3.3.8 (in package.json) | Component framework, reactive state management | Project already uses Vue 3 with Composition API |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | 5.3.0 (in package.json) | Type safety, SQLite result interfaces | Project uses TS; define types for query results |
| Vue refs/reactive | Built-in Vue reactivity | Loading state, error state, table selection | Reactive state for UI updates |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sql.js WebAssembly | sql.js asm.js | WebAssembly is faster and smaller; asm.js only for very old browsers |
| db.exec() for data extraction | db.prepare() + db.each() | exec() loads all data into memory at once; each() processes rows incrementally, better for large datasets |
| Inline table listing UI | Native select element | Native select is accessible and works with Vue v-model; inline is harder to implement |

**Installation:**
```bash
npm install sql.js@^1.13.0
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── DataLoadControl.vue      # MODIFY: Add SQLite table selection UI
├── core/
│   ├── DataProvider.ts            # MODIFY: Add loadSqliteFile() method
│   ├── types.ts                    # MODIFY: Add SQLite query result interfaces
│   └── validators.ts                # MODIFY: Add SQLite schema validation
└── views/
    └── WebGLPlayground.vue          # MODIFY: Update file input accept attribute
```

### Pattern 1: sql.js WebAssembly Initialization
**What:** Asynchronously load sql.js WebAssembly module with locateFile configuration
**When to use:** Application startup or before first SQLite file load
**Example:**
```typescript
// Source: sql.js GitHub README (https://github.com/sql-js/sql.js)
// Pattern: initSqlJs() + locateFile + await

import initSqlJs from 'sql.js'

const SQL = await initSqlJs({
  // Required: path to sql-wasm.wasm file
  locateFile: (file: string) => {
    // Vite copies sql-wasm.wasm to dist/ during build
    return `/node_modules/sql.js/dist/${file}`
  }
})

// SQL is now ready to use
const db = new SQL.Database()
```

### Pattern 2: Loading SQLite File from ArrayBuffer
**What:** Read SQLite binary file with FileReader.readAsArrayBuffer(), pass to Database constructor
**When to use:** User selects or drops SQLite database file
**Example:**
```typescript
// Source: sql.js GitHub README (https://github.com/sql-js/sql.js)
// Pattern: FileReader.readAsArrayBuffer() + new SQL.Database(Uint8Array)

const loadSqliteDatabase = async (file: File): Promise<PointData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const uint8Array = new Uint8Array(e.target?.result as ArrayBuffer)
        const db = new SQL.Database(uint8Array)

        // Validate database is not corrupt
        const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'")
        if (!tables || tables.length === 0) {
          throw new Error('Database corrupt or empty')
        }

        // Query point data
        resolve(extractPointData(db))
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => {
      reject(new Error('Failed to read database file'))
    }
    reader.readAsArrayBuffer(file)
  })
}
```

### Pattern 3: Listing Tables with sqlite_master Query
**What:** Query SQLite system table to discover available tables
**When to use:** Prompt user to select table after database loads
**Example:**
```typescript
// Source: sql.js examples/GUI/gui.js (https://github.com/sql-js/sql.js/blob/master/examples/GUI/gui.js)
// Pattern: db.exec("SELECT name FROM sqlite_master WHERE type='table'")

const db = new SQL.Database()

// Query for all tables
const tableResults = db.exec("SELECT name FROM sqlite_master WHERE type='table'")
if (tableResults.length > 0) {
  const columns = tableResults[0].columns  // ['name']
  const values = tableResults[0].values    // [['table1'], ['table2'], ...]

  const tableNames = values.map(row => row[0] as string)
  console.log('Available tables:', tableNames)
}
```

### Pattern 4: Validating Table Schema
**What:** Query table schema with PRAGMA table_info, check for required columns
**When to use:** Before extracting point data, ensure table has x, y, z columns
**Example:**
```typescript
// Source: SQLite documentation (https://www.sqlite.org/pragma.html#pragma_table_info)
// Pattern: PRAGMA table_info + column name checking

const validateTableSchema = (db: SQL.Database, tableName: string): void => {
  // Get table schema
  const schemaResults = db.exec(`PRAGMA table_info(${tableName})`)

  if (schemaResults.length === 0) {
    throw new Error(`Table not found: ${tableName}`)
  }

  const columns = schemaResults[0].columns  // ['cid', 'name', 'type', 'notnull', 'dflt_value', 'pk']
  const columnNames = schemaResults[0].values.map(row => row[1] as string)

  // Check required columns
  const requiredColumns = ['x', 'y', 'z']
  const missingColumns = requiredColumns.filter(col => !columnNames.includes(col))

  if (missingColumns.length > 0) {
    throw new Error(`Table must have x, y, z columns. Table ${tableName} missing: ${missingColumns.join(', ')}`)
  }
}

// Check if cluster column exists
const hasCluster = columnNames.includes('cluster')
```

### Pattern 5: Efficient Data Extraction with prepare() and each()
**What:** Prepare statement once, iterate rows with each() for memory efficiency
**When to use:** Extracting point data from large tables (30M limit)
**Example:**
```typescript
// Source: sql.js Database API (https://sql.js.org/documentation/Database.html)
// Pattern: db.prepare() + db.each() + Float32Array construction

const extractPointData = (db: SQL.Database, tableName: string): PointData => {
  // Prepare statement once for efficiency
  const stmt = db.prepare(`SELECT x, y, z${hasCluster ? ', cluster' : ''} FROM ${tableName}`)

  // Count rows first (30M limit check)
  const countResults = db.exec(`SELECT COUNT(*) as count FROM ${tableName}`)
  const rowCount = countResults[0].values[0][0] as number

  if (rowCount > 30_000_000) {
    stmt.free()
    throw new Error(`Dataset too large: ${rowCount} points (max 30,000,000)`)
  }

  // Pre-allocate Float32Arrays for WebGL
  const positions = new Float32Array(rowCount * 3)
  const clusterIds = new Float32Array(rowCount)
  let rowIndex = 0

  // Process rows incrementally with each()
  db.each(
    `SELECT x, y, z${hasCluster ? ', cluster' : ''} FROM ${tableName}`,
    {},
    (row) => {
      // Row is array of values in order of SELECT
      positions[rowIndex * 3] = row[0] as number     // x
      positions[rowIndex * 3 + 1] = row[1] as number   // y
      positions[rowIndex * 3 + 2] = row[2] as number   // z
      clusterIds[rowIndex] = hasCluster ? (row[3] ?? -1) as number : -1
      rowIndex++
    },
    () => {
      // Done callback - release statement
      stmt.free()

      return {
        positions,
        clusterIds,
        count: rowCount
      }
    }
  )
}
```

### Pattern 6: Vue 3 Table Selection UI
**What:** Use reactive ref with native select element, disable during loading
**When to use:** User needs to choose which table to query after database loads
**Example:**
```typescript
// Source: Vue 3 Documentation (https://vuejs.org/guide/essentials/forms.html)
// Pattern: reactive ref + v-model + disabled state

<template>
  <div v-if="tableNames.length > 0">
    <label for="table-select">Select table:</label>
    <select
      id="table-select"
      v-model="selectedTable"
      :disabled="isLoading"
      @change="handleTableChange"
    >
      <option v-for="name in tableNames" :key="name" :value="name">
        {{ name }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const tableNames = ref<string[]>([])
const selectedTable = ref<string>('')
const isLoading = ref(false)

const handleTableChange = () => {
  if (selectedTable.value) {
    extractDataFromTable(selectedTable.value)
  }
}
</script>
```

### Anti-Patterns to Avoid
- **Reusing FileReader instances:** Don't use a single FileReader for multiple files - create new instance per load (see Phase 2 Pitfall 3)
- **Using db.exec() for large data extraction:** Don't load all rows into memory with exec() - use prepare() + each() for incremental processing
- **Not freeing prepared statements:** Don't forget to call stmt.free() after each() loop - causes memory leaks in sql.js
- **Blocking UI with only loading message:** Don't rely only on text - disable interactions visually (buttons, selects) during loading state
- **Generic error messages:** Don't use "Error loading file" - be specific: "Database corrupt", "Table not found", "Missing columns: x, y"

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Manual ArrayBuffer to Uint8Array conversion | Custom byte-by-byte copying | new Uint8Array(arrayBuffer) constructor | Native constructor is optimized, handles byte order correctly |
| Custom table name parsing | String manipulation of sqlite_master | db.exec("SELECT name FROM sqlite_master WHERE type='table'") | SQLite provides system table for metadata; manual parsing is error-prone |
| Column validation by querying sample rows | SELECT * FROM table LIMIT 1 + column check | PRAGMA table_info(table_name) | PRAGMA is official SQLite schema interface, handles all edge cases |
| Row-by-row Float32Array filling | Loop over exec() results | db.prepare() + db.each() callback | exec() loads all rows into memory; each() processes incrementally, better for 30M rows |
| WebAssembly path management | Custom file loading logic | sql.js locateFile configuration | sql.js handles wasm loading, browser compatibility, and async initialization |
| Database corruption detection | Try-catch on every query | Attempt table listing on db creation | If database is corrupt, even simple metadata queries will fail; early detection saves processing time |

**Key insight:** SQLite and sql.js provide well-tested APIs for metadata queries (sqlite_master, PRAGMA table_info) and efficient data extraction (prepare + each). Custom implementations of these features are unnecessary and error-prone.

## Common Pitfalls

### Pitfall 1: Corrupt Database Detection Too Late
**What goes wrong:** Application attempts to query user-selected table before validating database integrity, throwing generic errors
**Why it happens:** Database constructor accepts invalid bytes without error; first query reveals corruption
**How to avoid:** Query sqlite_master immediately after Database creation to verify integrity
**Warning signs:** "Table not found" errors for tables that exist in valid databases
```typescript
// BAD: Assumes database is valid, queries user table
const db = new SQL.Database(uint8Array)
try {
  const results = db.exec(`SELECT * FROM ${userSelectedTable}`)  // May fail silently
} catch (e) {
  error.value = 'Failed to load table'  // Too generic
}

// GOOD: Validate database integrity first
const db = new SQL.Database(uint8Array)
try {
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'")
  if (tables.length === 0) {
    throw new Error('Database corrupt or unreadable')
  }
  // Database is valid, proceed with table queries
} catch (e) {
  throw new Error('Database corrupt or unreadable')
}
```

### Pitfall 2: Memory Leaks from Unfreed Statements
**What goes wrong:** Prepared statements from db.prepare() are never freed, increasing memory usage
**Why it happens:** sql.js requires manual statement cleanup; garbage collector doesn't free native memory
**How to avoid:** Always call stmt.free() in done callback of db.each() or after exec()
**Warning signs:** Memory usage increases on each SQLite load, browser becomes sluggish
```typescript
// BAD: Statement never freed
const stmt = db.prepare("SELECT * FROM table")
db.each(stmt, {}, (row) => {
  // Process row
}, () => {
  // Done callback - but stmt.free() is missing!
})

// GOOD: Free statement in done callback
const stmt = db.prepare("SELECT * FROM table")
db.each(stmt, {}, (row) => {
  // Process row
}, () => {
  stmt.free()  // Critical: release native memory
})
```

### Pitfall 3: Loading All Data with exec() on Large Tables
**What goes wrong:** db.exec() loads entire table into JavaScript array, causing memory issues with 30M rows
**Why it happens:** exec() returns all results at once; 30M points × 3 coordinates × 4 floats = 1.44GB memory
**How to avoid:** Use db.prepare() + db.each() to process rows incrementally, fill pre-allocated Float32Arrays
**Warning signs:** Browser crashes or becomes unresponsive during large table loads, out of memory errors
```typescript
// BAD: Loads all data into memory
const results = db.exec(`SELECT * FROM ${tableName}`)  // All rows in memory
const values = results[0].values  // May be millions of arrays

// GOOD: Processes rows incrementally
const positions = new Float32Array(rowCount * 3)  // Pre-allocate
const clusterIds = new Float32Array(rowCount)
const stmt = db.prepare(`SELECT x, y, z FROM ${tableName}`)

let rowIndex = 0
db.each(stmt, {}, (row) => {
  positions[rowIndex * 3] = row[0]  // Process and fill
  positions[rowIndex * 3 + 1] = row[1]
  positions[rowIndex * 3 + 2] = row[2]
  rowIndex++
}, () => {
  stmt.free()  // Cleanup
})
```

### Pitfall 4: Missing WASM File Location
**What goes wrong:** initSqlJs() fails with "sql-wasm.wasm not found" error
**Why it happens:** sql.js requires WebAssembly binary file; default locateFile expects relative path
**How to avoid:** Configure locateFile to point to node_modules/sql.js/dist/ directory
**Warning signs:** Error message includes "sql-wasm.wasm" or "locateFile" on initialization
```typescript
// BAD: No locateFile configuration
const SQL = await initSqlJs()  // May fail to find .wasm file

// GOOD: Explicit locateFile configuration
const SQL = await initSqlJs({
  locateFile: (file: string) => {
    return `/node_modules/sql.js/dist/${file}`
  }
})
```

### Pitfall 5: Not Checking Column Names Case-Sensitively
**What goes wrong:** Fails to find 'x' column when column is named 'X' or 'X_COORD'
**Why it happens:** SQLite column names are case-sensitive by default; PRAGMA table_info returns exact names
**How to avoid:** Compare column names exactly as returned by PRAGMA table_info
**Warning signs:** Error "Table missing: x" when column 'X' clearly exists
```typescript
// BAD: Case-insensitive comparison
const columnNames = ['x', 'y', 'z'].map(c => c.toLowerCase())
const schemaColumns = results.columns.map(c => (c as string).toLowerCase())

// GOOD: Exact case-sensitive comparison
const requiredColumns = ['x', 'y', 'z']
const schemaColumns = schemaResults[0].values.map(row => row[1] as string)
const missingColumns = requiredColumns.filter(col => !schemaColumns.includes(col))
```

### Pitfall 6: Incorrect PRAGMA table_info Usage
**What goes wrong:** Attempting to query PRAGMA without proper table name escaping
**Why it happens:** PRAGMA expects identifier; if table name has special characters or SQL keywords, query fails
**How to avoid:** Always validate table name or use parameterized queries (though PRAGMA doesn't support params)
**Warning signs:** "near" syntax error when querying PRAGMA table_info
```typescript
// BAD: Direct interpolation without validation
const schema = db.exec(`PRAGMA table_info(${tableName})`)  // Fails if tableName has spaces or special chars

// GOOD: Validate or quote table name
const safeTableName = tableName.replace(/"/g, '""')
const schema = db.exec(`PRAGMA table_info("${safeTableName}")`)
```

## Code Examples

Verified patterns from official sources:

### sql.js Initialization
```typescript
// Source: sql.js GitHub README (https://github.com/sql-js/sql.js)
// Pattern: Async initSqlJs + locateFile config

import initSqlJs from 'sql.js'

const SQL = await initSqlJs({
  locateFile: (file: string) => {
    // Vite serves node_modules; point sql.js to dist folder
    return `/node_modules/sql.js/dist/${file}`
  }
})

// SQL is now a module with Database and Statement classes
```

### SQLite File Loading
```typescript
// Source: sql.js GitHub README (https://github.com/sql-js/sql.js)
// Pattern: FileReader.readAsArrayBuffer() + new SQL.Database(Uint8Array)

const loadSqliteFile = async (file: File): Promise<PointData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const uint8Array = new Uint8Array(e.target?.result as ArrayBuffer)
        const db = new SQL.Database(uint8Array)

        // Database is now loaded and ready to query
        resolve(db)
      } catch (error) {
        reject(new Error('Database corrupt or unreadable'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read database file'))
    }

    reader.readAsArrayBuffer(file)
  })
}
```

### Listing Tables
```typescript
// Source: sql.js examples/GUI/gui.js (https://github.com/sql-js/sql.js/blob/master/examples/GUI/gui.js)
// Pattern: Query sqlite_master system table

const db = new SQL.Database()

// Get all user tables (exclude system tables like sqlite_sequence)
const tableResults = db.exec(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
)

if (tableResults.length > 0) {
  const tableNames = tableResults[0].values.map(row => row[0] as string)
  console.log('Available tables:', tableNames)
}
```

### Schema Validation
```typescript
// Source: SQLite documentation (https://www.sqlite.org/pragma.html#pragma_table_info)
// Pattern: PRAGMA table_info + column name checking

const validateTableSchema = (db: SQL.Database, tableName: string): void => {
  // Get table structure
  const schemaResults = db.exec(`PRAGMA table_info(${tableName})`)

  if (schemaResults.length === 0) {
    throw new Error(`Table not found: ${tableName}`)
  }

  const columnNames = schemaResults[0].values.map(row => row[1] as string)
  const requiredColumns = ['x', 'y', 'z']
  const missingColumns = requiredColumns.filter(col => !columnNames.includes(col))

  if (missingColumns.length > 0) {
    throw new Error(
      `Table must have x, y, z columns. Table ${tableName} missing: ${missingColumns.join(', ')}`
    )
  }

  const hasCluster = columnNames.includes('cluster')
  console.log(`Table ${tableName} has cluster column: ${hasCluster}`)
}
```

### Efficient Data Extraction
```typescript
// Source: sql.js Database API (https://sql.js.org/documentation/Database.html)
// Pattern: prepare + each + pre-allocated Float32Arrays

const extractPointData = (db: SQL.Database, tableName: string): PointData => {
  // Check row count first (enforce 30M limit)
  const countResults = db.exec(`SELECT COUNT(*) FROM ${tableName}`)
  const rowCount = countResults[0].values[0][0] as number

  if (rowCount > 30_000_000) {
    throw new Error(`Dataset too large: ${rowCount} points (max 30,000,000)`)
  }

  // Pre-allocate WebGL-compatible buffers
  const positions = new Float32Array(rowCount * 3)
  const clusterIds = new Float32Array(rowCount)

  const hasCluster = checkClusterColumnExists(db, tableName)
  const stmt = db.prepare(`SELECT x, y, z${hasCluster ? ', cluster' : ''} FROM ${tableName}`)

  let rowIndex = 0

  // Process rows incrementally
  db.each(
    stmt,
    {},
    (row) => {
      // Row is [x, y, z] or [x, y, z, cluster]
      positions[rowIndex * 3] = row[0] as number
      positions[rowIndex * 3 + 1] = row[1] as number
      positions[rowIndex * 3 + 2] = row[2] as number
      clusterIds[rowIndex] = hasCluster ? (row[3] ?? -1) as number : -1
      rowIndex++
    },
    () => {
      // All rows processed, cleanup
      stmt.free()

      return {
        positions,
        clusterIds,
        count: rowCount
      }
    }
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|-------------|--------|
| Node.js sqlite3 native bindings | sql.js WebAssembly | sql.js 1.0 (2020) | Browser-compatible SQLite, pure JavaScript, no native dependencies |
| asm.js fallback required | WebAssembly default | sql.js 1.0+ | WebAssembly is faster and smaller; asm.js only for very old browsers |
| Synchronous sql.js loading | Async initSqlJs() | sql.js 1.0+ | Async loading is required for WebAssembly initialization |
| Manual SQLite parsing | db.exec() / db.prepare() | sql.js 1.0+ | sql.js provides full SQLite query engine; manual parsing is error-prone |

**Deprecated/outdated:**
- **asm.js as primary:** WebAssembly (sql-wasm.js) is preferred; asm.js (sql-asm.js) only for browser compatibility fallback
- **sql.js < 1.0 synchronous loading:** Version 1.0 requires initSqlJs() async initialization; synchronous loading is no longer supported

## Open Questions

None - All research domains were successfully resolved with authoritative sources.

## Sources

### Primary (HIGH confidence)
- sql.js GitHub README (https://github.com/sql-js/sql.js) - Installation, usage examples, file loading patterns
- sql.js Database API Documentation (https://sql.js.org/documentation/Database.html) - db.exec(), db.prepare(), db.each(), stmt.free()
- sql.js GUI Example (https://github.com/sql-js/sql.js/blob/master/examples/GUI/gui.js) - Table listing, file loading, error handling
- SQLite PRAGMA Documentation (https://www.sqlite.org/pragma.html) - PRAGMA table_info for schema validation

### Secondary (MEDIUM confidence)
None - All findings verified with primary sources.

### Tertiary (LOW confidence)
None - No WebSearch-only findings used.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - sql.js v1.13.0 is latest release (Mar 2025) with documented API; FileReader and Vue 3 are well-established browser standards
- Architecture: HIGH - sql.js patterns (initSqlJs, prepare + each, PRAGMA) are from official documentation and examples
- Pitfalls: HIGH - All pitfalls documented with official sources (sql.js README, Database API, SQLite PRAGMA docs) and code examples

**Research date:** 2026-02-03
**Valid until:** 2026-03-05 (30 days - sql.js is stable, browser APIs are stable, Vue 3 patterns are established)
