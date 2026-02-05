# Phase 12: Fix v1.2 Integration Bugs - Research

**Researched:** 2026-02-05
**Domain:** WebGL / Vue.js Bug Fixes
**Confidence:** HIGH

## Summary

This phase fixes three critical integration bugs identified in the v1.2 milestone audit that prevent all end-to-end flows from working correctly. All three bugs are straightforward fixes with exact file locations and line numbers identified:

1. **JSON Loading ReferenceError** (line 215): Code uses `result.pointData.positions` but `result` variable doesn't exist in JSON branch
2. **Shader Uniform Type Mismatch** (lines 668-672): Shader expects `vec3` but code passes only 2 values using `uniform2f()`
3. **Edge Clamping Mathematical Error** (line 587): Minimum Y clamping uses `overlayHeight` instead of `overlayHeight + 15`

The bugs are caused by simple typos, type mismatches, and mathematical errors. No new patterns or external dependencies are required.

**Primary recommendation:** Apply the three straightforward fixes as specified in the v1.2 milestone audit.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue | 3.5.24 | Progressive framework for building user interfaces | Reactive components, template syntax, Composition API |
| TypeScript | 5.3.3 | Type-safe JavaScript superset | Compile-time type checking, IDE support |
| WebGL | Native API | 2D/3D graphics rendering | Hardware-accelerated graphics, GPU computation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| gl-matrix | 3.4.4 | Matrix math operations | 3D transformations, projection calculations |

**Installation:** None required (all packages already installed)

## Architecture Patterns

### Pattern 1: WebGL Uniform Passing
**What:** Matching shader uniform types with JavaScript uniform function calls
**When to use:** When setting shader uniforms from JavaScript
**Example:**
```javascript
// Source: MDN Web Docs - WebGLRenderingContext.uniform methods
// https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/uniform

// For vec2 uniforms: use uniform2f with 2 values
gl.uniform2f(location, x, y);

// For vec3 uniforms: use uniform3f with 3 values
gl.uniform3f(location, x, y, z);

// For mat4 uniforms: use uniformMatrix4fv with array
gl.uniformMatrix4fv(location, false, matrixArray);
```

### Pattern 2: CSS Transform Edge Clamping
**What:** Calculating viewport boundaries with CSS transform offsets
**When to use:** When positioning overlays with transforms like translate(-50%, -100%)
**Example:**
```typescript
// Overlay positioned 15px above point with transform: translate(-50%, -100%)
const desiredY = screenPos.y - 15;
const overlayHeight = 100;

// Transform: translate(-50%, -100%)
// -50% X: center horizontal at desiredX
// -100% Y: top edge at desiredY, bottom at desiredY - overlayHeight

// Visible area: [desiredY - overlayHeight, desiredY]
// Minimum Y must account for both height AND offset
const clampedY = Math.max(overlayHeight + 15, Math.min(desiredY, canvas.height));
```

### Anti-Patterns to Avoid
- **Variable name inconsistency:** Using different variable names across branches (e.g., `result` vs `loadedData`)
- **Type mismatch:** Using `uniform2f()` for `vec3` uniforms or vice versa
- **Incomplete edge clamping:** Not accounting for all CSS transform offsets in boundary calculations

## Don't Hand-Roll

No custom solutions needed. All three bugs are simple fixes to existing code:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shader uniform type matching | Custom type checking system | Use correct WebGL uniform function | Built-in WebGL API, standard practice |
| Edge clamping math | Custom boundary calculation library | Use simple Math.max/min with correct offsets | No dependencies needed, math is straightforward |
| JSON loading | Custom validation wrapper | Fix variable name to match data flow | Simple typo fix, no new code |

**Key insight:** These are not complex integration problems requiring new patterns. They are simple mistakes that break existing functionality.

## Common Pitfalls

### Pitfall 1: Shader Uniform Type Mismatch
**What goes wrong:** Shader declares `vec3` but JavaScript passes only 2 values
**Why it happens:** Copy-paste error, incomplete refactoring, or forgetting to update both shader and code
**How to avoid:**
- Always verify uniform function signature matches shader declaration
- Check git history for partial fixes (e.g., shader fixed but JavaScript not)
- Add type checking if using TypeScript
**Warning signs:** Shader compilation warnings, unexpected uniform values in debugging, visual glitches

### Pitfall 2: Variable Name Inconsistency
**What goes wrong:** Using `result` variable that doesn't exist in current scope
**Why it happens:** Copying code from one branch to another without updating variable names
**How to avoid:**
- Always check variable scope before referencing
- Use consistent naming conventions across branches
- Review code after refactoring to ensure all references updated
**Warning signs:** ReferenceError at runtime, code works in one branch but fails in another

### Pitfall 3: Incomplete Edge Clamping Calculation
**What goes wrong:** Overlay gets cut off at viewport edges
**Why it happens:** Not accounting for all CSS transform offsets in boundary calculations
**How to avoid:**
- Document transform offsets in comments
- Calculate visible area explicitly: `transform: translate(x, y)` means visible area starts at `origin + offset`
- Test edge cases (top-left, bottom-right corners)
**Warning signs:** Partially visible overlays, tooltips cut off at edges

## Code Examples

### Fix 1: JSON Loading ReferenceError (Line 215)
**Current (broken):**
```javascript
if (file.name.endsWith('.json')) {
  const loadedData = await DataProvider.loadFromFile(file)
  pointData = loadedData
  pointCount.value = loadedData.positions.length / 3
  setupBuffers(glCache)

  // Calculate hover thresholds from point density
  const thresholds = calculatePointDensityThresholds(result.pointData.positions, pointCount.value)
  // ERROR: 'result' is not defined - should be 'loadedData'
  hoverThresholds.value = thresholds
}
```

**Fixed:**
```javascript
if (file.name.endsWith('.json')) {
  const loadedData = await DataProvider.loadFromFile(file)
  pointData = loadedData
  pointCount.value = loadedData.positions.length / 3
  setupBuffers(glCache)

  // Calculate hover thresholds from point density
  const thresholds = calculatePointDensityThresholds(loadedData.positions, pointCount.value)
  hoverThresholds.value = thresholds
}
```

### Fix 2: Shader Uniform Type Mismatch (Lines 668-672)
**Current (broken):**
```javascript
// Shader declares: uniform vec3 u_cursorWorldPos;
// Source: ShaderManager.ts line 177

gl.uniform2f(
  gl.getUniformLocation(shaderProgram, 'u_cursorWorldPos'),
  worldPos.x,
  worldPos.y
)
// ERROR: uniform2f only passes 2 values, but shader expects vec3 (3 values)
```

**Fixed:**
```javascript
// Shader declares: uniform vec3 u_cursorWorldPos;

gl.uniform3f(
  gl.getUniformLocation(shaderProgram, 'u_cursorWorldPos'),
  worldPos.x,
  worldPos.y,
  worldPos.z
)
// FIX: Use uniform3f to pass all 3 components (x, y, z)
```

### Fix 3: Edge Clamping Mathematical Error (Line 587)
**Current (broken):**
```javascript
// Overlay positioned 15px above point
const desiredY = screenPos.y - 15;

// Transform: translate(-50%, -100%)
// Visible area: [desiredY - overlayHeight, desiredY]
// Bottom of overlay: desiredY - overlayHeight

// Current clamping (allows partial cutoff)
const clampedY = Math.max(overlayHeight, Math.min(desiredY, canvas.height));
// ERROR: When desiredY = overlayHeight, bottom is at 0 (cut off)
// Should account for 15px offset: overlayHeight + 15
```

**Fixed:**
```javascript
// Overlay positioned 15px above point
const desiredY = screenPos.y - 15;

// Transform: translate(-50%, -100%)
// Visible area: [desiredY - overlayHeight, desiredY]
// Bottom of overlay: desiredY - overlayHeight

// Fixed clamping (accounts for 15px offset)
const clampedY = Math.max(overlayHeight + 15, Math.min(desiredY, canvas.height));
// FIX: When desiredY = overlayHeight + 15, bottom is at 15 (fully visible)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual shader uniform tracking | Built-in WebGL uniform API | Since WebGL 1.0 | Type-safe uniform passing |
| Fixed overlay dimensions | Dynamic overlay measurement | Phase 11 | Responsive overlays |
| Edge detection in shader only | CPU-side + GPU-side detection | Phase 11 | Better hover accuracy |

**Deprecated/outdated:**
- Manual type checking for uniforms: WebGL API provides typed functions
- Fixed pixel offsets: Use dynamic measurement with getBoundingClientRect()

## Open Questions

None. All three bugs are clearly identified with exact fixes.

## Sources

### Primary (HIGH confidence)
- MDN Web Docs - WebGLRenderingContext.uniform methods
  URL: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/uniform
  What was checked: uniform2f, uniform3f signatures and parameter counts
  Publication date: Last modified Jun 23, 2025
- WebGLPlayground.vue source code (lines 208-234, 668-672, 574-588)
  What was checked: Exact bug locations and current code
- ShaderManager.ts source code (line 177)
  What was checked: Uniform declaration for u_cursorWorldPos
- Git commit history (commit 2326149)
  What was checked: Previous incomplete fix for shader type mismatch

### Secondary (MEDIUM confidence)
- Project package.json
  What was checked: Current versions of dependencies

### Tertiary (LOW confidence)
- None (all findings verified with source code or official documentation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified in package.json, no new dependencies needed
- Architecture: HIGH - Patterns verified with official MDN documentation and source code
- Pitfalls: HIGH - Root causes identified in source code, fixes verified

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days - stable API)
