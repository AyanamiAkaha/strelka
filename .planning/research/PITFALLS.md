# Pitfalls Research

**Domain:** WebGL Data Loading (100K-500K point datasets)
**Researched:** February 1, 2026
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: Synchronous JSON Parsing on Main Thread

**What goes wrong:**
Loading a 500K point dataset via JSON causes the browser UI to freeze for 1-5 seconds during parsing. Users see the browser become unresponsive, and the page appears to crash. The freeze duration scales linearly with dataset size.

**Why it happens:**
Developers use `await response.json()` which parses the entire JSON synchronously on the main thread. For 500K points with positions (3 floats) and cluster IDs (1 float), that's 2 million values parsed at once. JavaScript's JSON parser is single-threaded and blocks all UI updates during parsing.

**How to avoid:**
Use Web Workers for JSON parsing, or switch to binary formats (ArrayBuffer + TypedArrays) that can be loaded directly. For binary formats, use `response.arrayBuffer()` then `new Float32Array(arrayBuffer)` which is much faster and doesn't require parsing.

**Warning signs:**
- Browser UI freezes when loading files >100K points
- DevTools Performance panel shows long (500ms+) "Parse" task on main thread
- Click events or keyboard input unresponsive during load

**Phase to address:**
Phase 1 (Data Loading) - Must implement before supporting real data files

---

### Pitfall 2: Double Memory Footprint (CPU + GPU)

**What goes wrong:**
After loading 500K points (~6MB of position data + 2MB of cluster IDs), browser memory usage doubles from ~8MB to ~16MB. The JSON-parsed TypedArray stays in CPU memory even after uploading to GPU buffers, consuming memory that could be freed. For larger datasets, this can cause browser tab crashes on memory-constrained devices.

**Why it happens:**
Developers follow pattern: `fetch(url) → parse data → gl.bufferData(data)`. The parsed JavaScript TypedArray remains referenced in scope after the GPU upload completes, preventing garbage collection. The data exists in two places simultaneously: CPU memory (JavaScript heap) and GPU memory (WebGL buffer).

**How to avoid:**
After calling `gl.bufferData()`, nullify the JavaScript reference: `positions = null; clusterIds = null;` or use block-scoping to let the TypedArray go out of range immediately after upload. Alternatively, stream data directly from fetch response to GPU without creating intermediate TypedArrays (advanced: use ArrayBufferView directly with gl.bufferSubData).

**Warning signs:**
- Browser Task Manager shows tab memory usage 2-3x expected size
- Memory usage stays high after data load completes
- Tab crashes on devices with <2GB RAM

**Phase to address:**
Phase 1 (Data Loading) - Implement memory cleanup patterns immediately

---

### Pitfall 3: Blocking gl.bufferData Calls

**What goes wrong:**
Large `gl.bufferData()` calls for datasets >300K points block the main thread for 100-500ms. During this time, the UI freezes, scroll janks occur, and users can't interact with the application. For 500K points (positions + cluster IDs = ~8MB total), the upload takes significant time on older GPUs.

**Why it happens:**
`gl.bufferData()` is a synchronous operation that uploads the entire TypedArray to GPU memory in one call. While modern GPUs handle this quickly, the CPU→GPU transfer can block the main thread. The problem compounds when developers upload multiple buffers sequentially (positions, then colors, then cluster IDs).

**How to avoid:**
- Use `gl.bufferData()` with `gl.STATIC_DRAW` hint (allows GPU to optimize for immutable data)
- Upload all buffers in the same frame to minimize blocking windows
- For very large datasets (>1M points), consider streaming via `gl.bufferSubData()` in chunks
- Show a loading overlay during the upload to manage user expectations

**Warning signs:**
- DevTools shows "Function Call" taking >100ms for `gl.bufferData`
- Frame rate drops to 0 FPS during data load
- User clicks unresponsive during "uploading..." phase

**Phase to address:**
Phase 1 (Data Loading) - Add loading state and optimize upload pattern

---

### Pitfall 4: No Loading Progress Feedback

**What goes wrong:**
Users open a 500K point dataset file, and nothing happens for 3-5 seconds. No loading indicator, no progress bar, no status text. Users repeatedly click the "Load" button, thinking it's broken, or close the tab thinking it hung. This creates a terrible user experience and makes the app feel broken.

**Why it happens:**
Developers implement file loading as: `const data = await loadFile(url); uploadData(data);` with no intermediate states. The entire fetch → parse → upload pipeline completes before any UI update. For large files, this takes several seconds with zero user feedback.

**How to avoid:**
Implement a multi-stage loading indicator with progress:
1. "Downloading..." with progress from `response.body.getReader()`
2. "Parsing data..." (show immediately before JSON.parse)
3. "Uploading to GPU..." (show before gl.bufferData)
Use Vue reactive state to update UI, and ensure the browser has a chance to paint between stages (use `await new Promise(r => setTimeout(r, 0))` if needed).

**Warning signs:**
- Users report "app doesn't do anything when I click load"
- Users click multiple times in frustration
- No visual feedback during 2+ second operations

**Phase to address:**
Phase 1 (Data Loading) - Loading UI is minimum viable feature

---

### Pitfall 5: Invalid Data Without Validation

**What goes wrong:**
User loads a malformed dataset (e.g., corrupted CSV, manually edited JSON) and the app silently renders nothing, shows a black screen, or crashes with cryptic WebGL errors. No error message explains what's wrong, so users can't debug their data files.

**Why it happens:**
Developers assume all input data is valid and perfect. No checks for:
- NaN or Infinity in coordinates
- Missing array elements (e.g., ` [x, y]` instead of `[x, y, z]`)
- Array length mismatch between positions and cluster IDs
- Coordinate values that cause rendering issues (e.g., extremely large values)

**How to avoid:**
Add validation before GPU upload:
```typescript
// Validate positions
for (let i = 0; i < positions.length; i++) {
  if (!isFinite(positions[i])) {
    throw new Error(`Invalid value at position[${i}]: ${positions[i]}`);
  }
}
// Validate array lengths match
if (positions.length / 3 !== clusterIds.length) {
  throw new Error(`Array length mismatch: positions has ${positions.length/3} points, clusterIds has ${clusterIds.length} points`);
}
```

**Warning signs:**
- Silent failures (nothing renders)
- Black screen after loading
- Console shows WebGL errors without user-friendly explanation

**Phase to address:**
Phase 1 (Data Loading) - Basic validation is essential

---

### Pitfall 6: CORS Restrictions on File Loading

**What goes wrong:**
Users try to load data files from a different domain (e.g., data stored on S3, or local file opened via file:// protocol), and fetch fails with CORS error. The app shows "Failed to load data" without explaining it's a CORS issue, leading users to blame the app or their data files.

**Why it happens:**
Browsers block cross-origin requests by default unless the server sends proper CORS headers. For local development (`file://`), fetch is completely blocked. Developers test only with same-origin data and don't encounter CORS issues during development.

**How to avoid:**
- Provide a file input `<input type="file">` for loading local files (bypasses CORS)
- Document CORS requirements for serving data files
- Add clear error message: "CORS error: The data file must be served from the same domain, or use the file upload button"
- For development, use a local server with proper CORS headers (Vite dev server handles this)

**Warning signs:**
- Fetch fails with "NetworkError" or CORS error in console
- Works in dev server but fails in production deployment
- Users report "can't load my files" when hosting on different domain

**Phase to address:**
Phase 1 (Data Loading) - File upload support solves CORS for local files

---

### Pitfall 7: Type Conversion Overhead

**What goes wrong:**
Loading a 500K point JSON file that represents coordinates as nested arrays (`[[x,y,z], [x,y,z], ...]`) requires converting to flat Float32Array before GPU upload. This conversion loop runs for 500K iterations, adding 100-200ms of processing time. The extra time compounds with JSON parsing, making the load even slower.

**Why it happens:**
JSON naturally represents structured data as arrays. Developers parse JSON, get nested arrays, then need to flatten them for WebGL's `gl.bufferData()`. The conversion happens on the main thread, blocking UI.

**How to avoid:**
- Design file format to use flat arrays from the start: `{"positions": [x,y,z,x,y,z,...], "clusterIds": [id,id,...]}`
- For binary formats, use TypedArrays directly (Float32Array for positions, Uint8Array for cluster IDs)
- Avoid nested arrays in JSON; if unavoidable, use typed array views: `new Float32Array(json.positions)`

**Warning signs:**
- DevTools shows flattening loop taking >50ms
- JSON structure uses nested arrays like `[[x,y,z], ...]`
- Extra conversion step between parse and upload

**Phase to address:**
Phase 1 (Data Loading) - Design efficient file format first

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using JSON instead of binary format | Easy to read and debug files | 2-3x slower load times, larger file sizes | MVP only, for datasets <50K points |
| Loading everything into TypedArray before checking size | Simple code | Memory wasted if file is too large for GPU | Never - always check file size first |
| No loading progress indicator | Faster to implement | Terrible UX for files >100K points | Never - loading feedback is essential |
| Synchronous parsing on main thread | No worker complexity | UI freezes for 1-5 seconds on large files | Never - use workers or binary formats |
| No data validation | Faster initial implementation | Silent failures, hard to debug | Never - validation catches errors early |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| File Input (drag & drop) | Reading entire file into memory as string/JSON before checking size | Check `file.size` first, reject files >10MB before reading |
| Fetch API | Assuming `response.json()` won't block | Use streaming response for large files, or switch to binary format |
| WebGL Buffers | Creating new buffer for every data load (memory leak) | Reuse existing buffers with `gl.bufferSubData()` for same-size datasets |
| Vue Reactivity | Making huge TypedArrays reactive (performance killer) | Keep large data outside Vue reactivity, only track metadata (count, filename) |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Nested arrays in JSON | Slow load, extra conversion loop | Use flat arrays in file format | >50K points |
| Main thread parsing | UI freezes during load | Use Web Workers or binary format | >100K points |
| Multiple sequential buffer uploads | Long blocking window | Batch uploads in same frame | >300K points |
| No memory cleanup | Browser tab crashes on repeated loads | Nullify TypedArrays after upload | >500K points on low-memory devices |
| String concatenation in parser | O(n²) scaling, extremely slow | Use TypedArrays or pre-sized arrays | Any file size |
| Using regular expressions for parsing | 10-100x slower than manual parsing | Use manual parsing for known formats | >10K points |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Loading untrusted JSON from URL | JSON injection, potential XSS | Validate all data before use, sanitize if using eval() |
| File upload without size check | DoS via huge file uploads | Reject files >10MB before reading |
| Loading data from user-provided URL | SSRF attacks | Allow only allowlisted domains or use file upload |
| Parsing XML/user-defined formats | XXE attacks | Stick to JSON or binary formats |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading indicator | User thinks app is broken | Show overlay with progress bar and status text |
| No error messages | User can't debug their data files | Clear, specific error messages ("Invalid value at position 1234: NaN") |
| No file size limit | User uploads 100MB file that crashes browser | Reject files >10MB with clear message |
| No format documentation | User can't prepare data files correctly | Provide example files and format specification |
| Instant load with no preview | User doesn't know what they loaded | Show point count and cluster count after load |

## "Looks Done But Isn't" Checklist

- [ ] **Loading Progress:** Often missing file download progress — verify progress bar updates during fetch
- [ ] **Memory Cleanup:** Often missing TypedArray cleanup — verify memory doesn't double after load
- [ ] **Error Recovery:** Often missing state reset on failed load — verify app can recover from load errors
- [ ] **Format Validation:** Often missing coordinate range checks — verify data is reasonable (not Infinity/NaN)
- [ ] **CORS Handling:** Often missing file upload alternative — verify local files can be loaded without server
- [ ] **Loading Cancel:** Often missing cancel button — verify user can abort long-running loads

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Synchronous JSON parsing blocking UI | HIGH | Rewrite to use Web Workers or switch to binary format (requires architecture change) |
| Memory leak from unclosed buffers | MEDIUM | Call `gl.deleteBuffer()` and set references to null; requires tracking buffer lifecycle |
| No error recovery | LOW | Add try/catch around load functions, reset state on error, show error message to user |
| CORS blocking file loads | LOW | Add `<input type="file">` upload button for local files, document CORS setup for remote files |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Synchronous JSON parsing on main thread | Phase 1 (Data Loading) | Test with 500K point file, verify UI stays responsive |
| Double memory footprint | Phase 1 (Data Loading) | Monitor browser memory before/after load, verify memory drops after upload |
| Blocking gl.bufferData calls | Phase 1 (Data Loading) | Profile with DevTools, verify no >100ms blocking tasks |
| No loading progress feedback | Phase 1 (Data Loading) | Load 300K point file, verify progress updates at least 3 times |
| Invalid data without validation | Phase 1 (Data Loading) | Test with malformed JSON, verify error message shown before GPU upload |
| CORS restrictions | Phase 1 (Data Loading) | Try loading from different domain, verify helpful error or file upload alternative |
| Type conversion overhead | Phase 1 (Data Loading) | Profile nested array vs flat array formats, verify <50ms conversion time |

## Sources

- WebGL Fundamentals: https://webglfundamentals.org/ (MEDIUM confidence - general WebGL patterns)
- MDN WebGL Best Practices: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices (MEDIUM confidence - verified limits exist)
- Browser Performance Patterns (personal experience - HIGH confidence for main thread blocking)
- JSON.parse performance characteristics: https://v8.dev/blog/fast-json (MEDIUM confidence - parsing is synchronous)
- TypedArrays and ArrayBuffers specification: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays (HIGH confidence - official docs)
- WebGL buffer data transfer: https://registry.khronos.org/webgl/specs/latest/2.0/ (MEDIUM confidence - synchronous operation)

---

*Pitfalls research for: WebGL Data Loading (100K-500K point datasets)*
*Researched: February 1, 2026*
