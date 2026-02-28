# Integration Stack: SQLite & JSON Parsing for WebGL Clusters

**Domain:** Browser-based data loading for WebGL point clusters
**Researched:** February 1, 2026
**Confidence:** HIGH

## Recommended Stack

### Core Libraries

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **sql.js** | ^1.13.0 | SQLite database engine (browser) | Mature, battle-tested, 13.5k+ stars, active maintenance (Mar 2025). Loads entire SQLite database into WebAssembly memory. Perfect fit for read-only access to point cluster data. MIT licensed. |
| **Zod** | ^4.3.x | Runtime type validation for JSON | TypeScript-first with automatic type inference. Zero dependencies, tiny 2kb bundle. 41.7k stars, latest release Jan 2026. Excellent DX with built-in error messages. Perfect for validating point cluster data structure. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **sql.js-httpvfs** | Latest (no published npm version) | Lazy-loading large SQLite files from HTTP | Use only if your SQLite databases are >100MB and you need to load only subsets via HTTP range requests. More complex setup (requires worker, config generation). |
| **Built-in JSON.parse** | Native | Basic JSON parsing | For simple cases without validation. Use when data is trusted or schema validation is unnecessary. |
| **Ajv** | ^8.17.x | JSON Schema validation | Use only if you need JSON Schema Draft-04/06/07/2019-09/2020-12 compliance or JTD (RFC8927). Faster than Zod for large-scale validation but requires more boilerplate. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Vite 5.0** | Build tool with WASM support | Native support for WebAssembly modules and worker files. Use `new URL('file.wasm', import.meta.url)` pattern to reference WASM files. Handles asset bundling automatically. |
| **TypeScript 5.3** | Type safety | Already in project. Leverage Zod's `z.infer<Schema>` for compile-time and runtime type safety. |

## Installation

```bash
# Core SQLite support
npm install sql.js@^1.13.0

# JSON validation
npm install zod@^4.3

# Optional: For large SQLite files (advanced use case)
# Note: sql.js-httpvfs requires manual setup, see notes below
npm install sql.js-httpvfs
```

## Vite Integration

### Loading sql.js WASM in Vite

```typescript
// src/utils/sqlite.ts
import initSqlJs from 'sql.js';

// Vite handles the WASM file automatically
const SQL = await initSqlJs({
  locateFile: (file) => {
    // Vite bundles WASM to dist/ with hashed name
    return new URL(`node_modules/sql.js/dist/${file}`, import.meta.url).href;
  }
});

export { SQL };
```

### Loading SQLite database from file input

```typescript
// src/loaders/sqliteLoader.ts
import { SQL } from '@/utils/sqlite';

export async function loadSQLite(file: File): Promise<SQL.Database> {
  const buffer = await file.arrayBuffer();
  const u8Array = new Uint8Array(buffer);
  return new SQL.Database(u8Array);
}
```

### Loading and validating JSON with Zod

```typescript
// src/loaders/jsonLoader.ts
import * as z from 'zod';

// Define schema for point clusters
const PointClusterSchema = z.object({
  points: z.array(z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
    clusterId: z.number().int(),
  })),
  metadata: z.object({
    source: z.string().optional(),
    timestamp: z.number().optional(),
  }).optional(),
});

// Infer TypeScript type from schema
type PointCluster = z.infer<typeof PointClusterSchema>;

export async function loadJSON(file: File): Promise<PointCluster> {
  const text = await file.text();
  const data = JSON.parse(text);

  // Validate with Zod - throws ZodError if invalid
  return PointClusterSchema.parse(data);
}

export async function loadJSONSafe(file: File): Promise<z.SafeParseReturnType<PointCluster>> {
  const text = await file.text();
  const data = JSON.parse(text);
  return PointClusterSchema.safeParse(data);
}
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| sql.js | wa-sqlite | Use wa-sqlite if you need IndexedDB/OPFS persistence, write operations, or async query support. wa-sqlite has better browser storage integration but smaller community (1.3k stars). |
| sql.js | absurd-sql | Use absurd-sql only if you need persistent SQLite storage with IndexedDB backing. Requires SharedArrayBuffer (needs special headers: COOP/COEP), adds complexity. |
| Zod | Ajv | Use Ajv only if you need JSON Schema compliance (not TypeScript-first schema) or maximum validation performance on large datasets. Ajv requires more boilerplate but supports JTD. |
| sql.js | sql.js-httpvfs | Use sql.js-httpvfs only for very large SQLite files (>100MB) where full database loading would consume too much memory. Requires HTTP range request support and worker setup. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **better-sqlite3** | Node.js native binding, NOT browser-compatible | sql.js (WebAssembly port) |
| **sqlite3** | Node.js native binding, NOT browser-compatible | sql.js (WebAssembly port) |
| **JSONStream / oboe.js** | Unmaintained, low activity | Native `JSON.parse` with Zod validation |
| **io-ts** | No longer actively maintained | Zod (similar API, actively maintained) |
| **PropTypes** | React-specific, runtime-only, no TypeScript integration | Zod (compile-time + runtime types) |
| **Manual validation** | Error-prone, duplicate code | Zod (declarative schema) |

## Stack Patterns by Variant

**If SQLite file < 50MB:**
- Use sql.js directly (load entire database into memory)
- Because: Simpler setup, no worker needed, faster initial load

**If SQLite file 50-100MB:**
- Use sql.js directly with streaming
- Because: Modern browsers handle 100MB+ memory fine, complexity of lazy loading not worth it

**If SQLite file > 100MB:**
- Use sql.js-httpvfs for lazy loading
- Because: Reduces initial memory footprint, only loads needed pages, works with HTTP range requests
- Note: More complex setup (requires worker, config generation script)

**If JSON data is trusted (internal generation):**
- Use `JSON.parse` with basic type assertions
- Because: Validation overhead unnecessary, faster parsing

**If JSON data is untrusted (user uploads):**
- Use `JSON.parse` with Zod validation
- Because: Runtime type safety prevents crashes, good error messages for debugging

## Version Compatibility

| Package | Compatible With | Notes |
|-----------|-----------------|-------|
| sql.js@^1.13.0 | Vite 5.0, Vue 3.3, TypeScript 5.3 | Requires WebAssembly support. Vite bundles WASM files correctly. |
| Zod@^4.3.x | Vite 5.0, Vue 3.3, TypeScript 5.3 | Pure TypeScript, no build system requirements. Tree-shakeable. |
| sql.js-httpvfs | Vite 5.0 (requires worker) | Must configure Vite to bundle worker and WASM as separate assets. Use `?worker` import syntax for worker files. |

## Vite Configuration for Web Workers

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  worker: {
    // Required for sql.js-httpvfs workers
    format: 'es',
  },
  assetsInclude: ['**/*.wasm'],
});
```

## sql.js-httpvfs Setup (Advanced)

**Note:** Only use if SQLite databases are very large (>100MB).

1. Prepare database:
```bash
# Optimize SQLite for HTTP streaming
sqlite3 data.sqlite3 << 'EOF'
PRAGMA journal_mode = DELETE;
PRAGMA page_size = 4096;
VACUUM;
EOF
```

2. Create config (use provided script):
```bash
node node_modules/sql.js-httpvfs/dist/create_config.js data.sqlite3 > config.json
```

3. Use in worker:
```typescript
import { createDbWorker } from 'sql.js-httpvfs';

const workerUrl = new URL(
  'sql.js-httpvfs/dist/sqlite.worker.js',
  import.meta.url,
);

const worker = await createDbWorker(
  [{ from: 'jsonconfig', configUrl: '/config.json' }],
  workerUrl.toString(),
  wasmUrl.toString()
);

const result = await worker.db.exec('SELECT x, y, z, cluster FROM points LIMIT 1000');
```

## Performance Considerations

### JSON Parsing
- **Native JSON.parse**: Fastest (V8 optimized), no validation
- **JSON.parse + Zod**: ~2-5x slower than native, but provides type safety and validation
- **Ajv**: ~10-50% faster than Zod for large datasets, but requires JSON Schema
- **Streaming**: For very large JSON files (>50MB), consider streaming parsers like `JSONStream` (if maintained) or chunked processing

### SQLite Loading
- **sql.js (full load)**: Fast for databases <50MB. Entire database in WebAssembly memory.
- **sql.js-httpvfs**: Slower initial load, faster queries on large databases. Only reads needed pages via HTTP range requests.
- **Worker overhead**: Always use workers for SQLite operations to avoid blocking WebGL render thread.

## Security Considerations

- **JSON validation**: Always validate user-provided JSON files with Zod before processing
- **SQLite**: Read-only mode prevents malicious writes. sql.js runs in WebAssembly sandbox
- **File size**: Implement size limits for both JSON and SQLite uploads to prevent OOM attacks
- **Worker isolation**: Run SQLite queries in Web Workers to prevent main thread blocking and isolate from WebGL context

## Sources

- [sql.js GitHub](https://github.com/sql-js/sql.js) — Verified latest release v1.13.0 (Mar 2025), WASM support, MIT license, API documentation
- [sql.js-httpvfs GitHub](https://github.com/phiresky/sql.js-httpvfs) — Verified HTTP range request lazy loading, Apache-2.0 license, worker-based architecture
- [wa-sqlite GitHub](https://github.com/rhashimoto/wa-sqlite) — Verified VFS support for IndexedDB/OPFS, MIT license, async/JSPI builds
- [absurd-sql GitHub](https://github.com/jlongster/absurd-sql) — Verified IndexedDB persistence, SharedArrayBuffer requirements, MIT license
- [Zod GitHub](https://github.com/colinhacks/zod) — Verified v4.3.6 (Jan 2026), TypeScript-first, 2kb bundle, MIT license, 41.7k stars
- [Ajv GitHub](https://github.com/ajv-validator/ajv) — Verified v8.17.1 (Jul 2024), JSON Schema support, performance benchmarks, MIT license
- [Vite Assets Documentation](https://vitejs.dev/guide/assets.html) — Verified WASM handling, worker imports, static asset bundling with Vite 5.0

---
*Stack research for strelka data loading integration*
*Researched: February 1, 2026*
