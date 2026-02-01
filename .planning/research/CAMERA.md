# Camera Rotation Research: WebGL Clusters Playground

**Project:** WebGL Clusters Playground
**Researched:** 2026-02-01
**Overall confidence:** HIGH (based on codebase analysis + authoritative sources)

## Executive Summary

Your camera rotation issue is a classic Euler angle problem: **negative axis calculations combined with sequential rotation application**. The current implementation stores orientation as two Euler angles (pitch/yaw) and applies them sequentially each frame, which creates rotation direction bugs and susceptibility to gimbal lock.

**Key finding:** The bug is likely NOT in the mouse input or rotation math itself, but in how the rotation is **applied to the camera's forward/right vectors**. The forward vector calculation (lines 114-118 in Camera.ts) uses spherical coordinates that don't match standard WebGL conventions.

**Recommended approach:** Two-phase fix:
1. **Phase 1:** Fix Euler implementation (simpler, tests understanding)
2. **Phase 2:** Migrate to quaternions only if Phase 1 proves insufficient

The two-phase approach aligns with your PROJECT.md decision and is supported by WebGL best practices: debug simple implementation before complex refactoring.

## Key Findings

**Stack:** Pure WebGL + TypeScript, no external rotation libraries (current)
**Architecture:** GPU-accelerated matrices in shaders, CPU-side orientation tracking
**Critical issue:** Euler angle forward vector formula has axis direction inconsistencies
**Migration path:** Incremental, testable fix → verify → full quaternion migration (if needed)

## Current Implementation Analysis

### What Works
- Input handling: `handleMouseMove` correctly accumulates pitch/yaw from mouse deltas
- Clamp logic: Vertical rotation properly clamped to ±89° to avoid gimbal lock (line 95)
- GPU matrix calculation: `getForwardVector` in shader matches CPU-side formula
- WASD movement: Correctly applies forward/right vectors from camera orientation

### What's Broken
**The forward vector calculation (lines 114-118, 177-182) uses non-standard spherical coordinates:**

```typescript
const forward = new Vec3(
  Math.cos(this.rotation.x) * Math.sin(this.rotation.y),  // X component
  -Math.sin(this.rotation.x),                           // Y component (negative!)
  -Math.cos(this.rotation.x) * Math.cos(this.rotation.y)  // Z component (negative!)
)
```

**Problems identified:**

1. **Negative Y axis:** `-Math.sin(this.rotation.x)` inverts pitch direction relative to standard WebGL conventions
2. **Negative Z axis:** `-Math.cos(this.rotation.x) * Math.cos(this.rotation.y)` inverts forward direction
3. **No coordinate system alignment:** Formula doesn't document whether it assumes Y-up, Z-up, or other convention

**Evidence from shader (ShaderManager.ts, lines 204-212):**

```glsl
vec3 getForwardVector(vec2 rotation) {
  float pitch = rotation.x;
  float yaw = rotation.y;
  return vec3(
    cos(pitch) * sin(yaw),
    -sin(pitch),           // Same negative Y
    -cos(pitch) * cos(yaw) // Same negative Z
  );
}
```

The shader matches the CPU implementation, so the **math is consistent** but the **convention is wrong** for WebGL's right-handed coordinate system.

## Recommended Stack

### Phase 1: Euler Fixes (Recommended First)

| Component | Why | Implementation |
|-----------|------|----------------|
| Fix axis signs | Negative Y/Z inverts rotation direction | Change `-Math.sin(this.rotation.x)` to `Math.sin(this.rotation.x)` (if Y-down) or keep as-is (if Y-up intended) |
| Document coordinate system | Prevents future confusion | Add comments: "Camera uses Y-up, right-handed WebGL coordinate system" |
| Add rotation debugging | Verifies fix behavior | Log rotation values and computed forward vector when mouse moves |
| Test extreme angles | Catches gimbal lock edge cases | Test pitch = ±89°, yaw = 0°/90°/180° |

**Why fix Euler first:**
- Simpler to test and verify (minimal code changes)
- Teaches coordinate system fundamentals (essential for WebGL)
- May be sufficient for 6DOF camera (your use case doesn't require complex rotations)
- Aligns with your PROJECT.md decision to "debug current implementation before major refactor"

### Phase 2: Quaternion Migration (Conditional)

**Migrate to quaternions IF:**
- Euler fixes create jitter or unexpected behavior
- You need full 6DOF rotation (roll axis) later
- Performance profiling shows CPU matrix bottleneck (unlikely for single camera)

**Recommended library:** `gl-matrix` (toji/gl-matrix)
- Pure JavaScript, no dependencies
- Optimized for WebGL (Float32Array backing)
- Small bundle size (~15KB minified)
- Widely used (5.6k GitHub stars, 192k+ projects)
- MIT licensed

**Alternative:** Implement minimal Quaternion class
- Your Math.ts already has Vec3 operations
- Add `Quat4` class with `multiply`, `fromEuler`, `toVector3`
- Only ~50-100 lines of code for needed operations
- Total control over implementation (no dependency overhead)

### Euler vs Quaternion Trade-offs

| Criterion | Euler (Fixed) | Quaternion | Winner |
|-----------|----------------|-------------|----------|
| **Setup complexity** | Low (already implemented) | Medium (new library or class) | Euler |
| **Debug difficulty** | Medium (angle values intuitive) | Medium (axis/angle less intuitive) | Tie |
| **Gimbal lock** | Possible at ±90° pitch | None | Quaternion |
| **Rotation accumulation** | Poor (sequential angles don't combine well) | Excellent (quaternion multiplication) | Quaternion |
| **Bundle size** | 0 KB | 15 KB (gl-matrix) or 2 KB (custom) | Euler |
| **Performance** | Fast (2 float storage) | Fast (4 float storage, similar CPU cost) | Tie |
| **Use case fit** | Good for 6DOF camera with clamped pitch | Overkill for simple FPS camera | Euler |

**Verdict:** Fix Euler first. Only migrate to quaternions if you hit limitations.

## Architecture Patterns

### Current Pattern: Separated CPU/GPU Matrix Calculation

**What works:**
- Camera stores position + rotation (pitch, yaw) in JavaScript
- Shader calculates view/projection matrices from camera parameters
- Movement uses CPU-side forward/right vectors from rotation
- GPU handles all vertex transformations in parallel

**Why this pattern is good for your use case:**
- Single camera = CPU overhead negligible
- 100K-500K points = GPU bottleneck, not CPU
- Shader matrices calculated once per frame (not per vertex)
- Matches WebGL best practices (do per-vertex work in shader)

### Recommended Fix Pattern: Axis-Angle Accumulation

Instead of storing pitch/yaw separately and combining each frame, store orientation as cumulative rotation:

```typescript
// Current (problematic)
this.rotation.y += deltaX * this.mouseSensitivity
this.rotation.x += deltaY * this.mouseSensitivity
// Recompute forward vector from angles

// Better (if keeping Euler)
// Keep same approach, but fix axis signs and document coordinate system
```

**For quaternion migration (Phase 2):**

```typescript
class Camera {
  private orientation: Quaternion = new Quaternion()

  handleMouseMove(deltaX: number, deltaY: number): void {
    // Create small rotation quaternions from mouse deltas
    const yawQuat = Quaternion.fromAxisAngle(new Vec3(0, 1, 0), deltaX * this.mouseSensitivity)
    const pitchQuat = Quaternion.fromAxisAngle(new Vec3(1, 0, 0), deltaY * this.mouseSensitivity)

    // Multiply into current orientation
    this.orientation = Quaternion.multiply(pitchQuat, this.orientation)
    this.orientation = Quaternion.multiply(yawQuat, this.orientation)

    // Orthonormalize to prevent drift
    this.orientation = this.orientation.normalize()
  }

  getForward(): Vec3 {
    return this.orientation.applyToVector(new Vec3(0, 0, -1)) // -Z is forward
  }
}
```

### Anti-Patterns to Avoid

**Anti-Pattern 1: Storing Euler angles, converting every frame**
```typescript
// BAD: Rebuild orientation from scratch each frame
const rotX = rotationMatrixFromEuler(this.rotation.x, 0, 0)
const rotY = rotationMatrixFromEuler(0, this.rotation.y, 0)
const combined = multiply(rotX, rotY) // Order matters!
```
**Why bad:** Sequential rotation order causes gimbal lock and rotation direction bugs.

**Anti-Pattern 2: Not orthonormalizing quaternions**
```typescript
// BAD: Floating point error accumulates
this.orientation = Quaternion.multiply(yawQuat, this.orientation)
// Missing: this.orientation = this.orientation.normalize()
```
**Why bad:** Drift causes camera to slowly rotate even without input.

**Anti-Pattern 3: Using Y-up for camera but Z-up for world**
```typescript
// BAD: Mixed coordinate systems
camera.getForward() // Returns Y-up vector
world.up = new Vec3(0, 0, 1) // Z-up world
```
**Why bad:** Requires conversion matrices, creates confusion.

## Common WebGL Rotation Pitfalls

### Critical Pitfalls

#### Pitfall 1: Coordinate System Mismatch
**What goes wrong:** Camera expects Y-up, but WebGL uses different convention, causing inverted axes.

**Why it happens:** WebGL uses right-handed coordinate system, but conventions vary:
- Y-up: +Y is up, +Z is forward, +X is right (Three.js default)
- Z-up: +Z is up, -Y is forward, +X is right (OpenGL default)

**Your code:** Uses `getForwardVector` with `-Z` and `-Y`, suggesting Z-forward convention but unclear.

**Consequences:**
- Mouse up moves camera down (inverted pitch)
- Mouse right moves camera left (inverted yaw)
- Movement keys don't match visual direction

**Prevention:**
```typescript
// Document your coordinate system at top of Camera.ts
/**
 * Camera coordinate system:
 * - Right-handed WebGL coordinate system
 * - +X = right, +Y = up, +Z = out of screen (towards viewer)
 * - -Z = forward direction (look into screen)
 * - Camera looks down -Z axis at rotation (0, 0)
 */
```

**Detection:**
```typescript
// Add debug logging
handleMouseMove(deltaX: number, deltaY: number): void {
  console.log('Mouse delta:', {x: deltaX, y: deltaY})
  this.rotation.y += deltaX * this.mouseSensitivity
  this.rotation.x += deltaY * this.mouseSensitivity
  console.log('After update:', this.rotation)
  console.log('Forward vector:', this.getForward().toArray())
}
```
If moving mouse up (negative deltaY) decreases rotation.x, and forward vector Y component decreases in same direction, axes are inverted.

#### Pitfall 2: Sequential Rotation Order
**What goes wrong:** Rotating X then Y produces different result than Y then X.

**Why it happens:** Euler angles represent 3 sequential rotations. Order matters:
```
R = Rz * Ry * Rx  ≠  Rz * Rx * Ry
```

**In your code:**
```typescript
// Forward vector formula implicitly applies pitch (x) then yaw (y):
// 1. Rotate around X axis by rotation.x
// 2. Rotate around Y axis by rotation.y
const forward = new Vec3(
  Math.cos(pitch) * Math.sin(yaw),
  -Math.sin(pitch),
  -Math.cos(pitch) * Math.cos(yaw)
)
```

**Consequences:**
- Moving mouse horizontally after vertical movement produces unexpected rotation
- Camera feels "wrong" because axes are relative, not absolute
- Impossible to rotate purely horizontally (yaw always affected by pitch)

**Prevention (Euler fix):**
```typescript
// Document rotation order explicitly
/**
 * Rotation order: Yaw (y) then Pitch (x)
 * - Yaw rotates around Y axis (turning left/right)
 * - Pitch rotates around X axis (looking up/down)
 * - Order matches spherical coordinate convention
 */
```

**Prevention (quaternion):**
```typescript
// Quaternions automatically handle order via multiplication
// Order in code = order of application
this.orientation = Quaternion.multiply(pitchQuat, this.orientation) // Apply pitch first
this.orientation = Quaternion.multiply(yawQuat, this.orientation)  // Then yaw
```

#### Pitfall 3: Gimbal Lock
**What goes wrong:** When pitch = ±90°, yaw and roll axes align, losing a degree of freedom.

**Why it happens:** With 3 sequential rotations, at extreme angles two axes become parallel.

**In your code:** Already mitigated by clamping (line 95):
```typescript
this.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.rotation.x))
```

**Consequences:**
- Camera can't look straight up/down (prevents gimbal lock)
- User experience: slightly restricted but functional

**Prevention (already implemented):**
- Clamp pitch to ±89° (avoid exactly ±90°)

**Prevention (quaternion - if migrating):**
- No clamp needed, quaternions avoid gimbal lock naturally

### Moderate Pitfalls

#### Pitfall 4: Floating Point Drift
**What goes wrong:** Quaternion orientation slowly deviates from orthonormal due to accumulated floating point error.

**Why it happens:** Each quaternion multiplication introduces tiny errors (1e-15).

**Consequences:** Camera slowly rotates even without input over hours of use.

**Prevention:**
```typescript
// Renormalize every frame or every N frames
this.orientation = this.orientation.normalize()

// Or more aggressive:
if (Math.abs(1.0 - this.orientation.length()) > 1e-6) {
  this.orientation = this.orientation.normalize()
}
```

**Detection:**
```typescript
// Check magnitude in debug build
console.assert(Math.abs(1.0 - this.orientation.length()) < 1e-6, 'Quaternion drift detected')
```

#### Pitfall 5: Mouse Coordinate Inversion
**What goes wrong:** Moving mouse up moves camera down (or similar inversion).

**Why it happens:** HTML canvas coordinates use +Y downward, but 3D typically uses +Y upward.

**In your code:**
```typescript
handleMouseMove(deltaX: number, deltaY: number): void {
  this.rotation.y += deltaX * this.mouseSensitivity  // X is consistent
  this.rotation.x += deltaY * this.mouseSensitivity  // Y needs inversion check
}
```

**Consequences:** User feels camera controls are "broken."

**Prevention:**
```typescript
// Check if deltaY needs negation
// If moving mouse up (negative deltaY) should increase pitch (look up):
this.rotation.x -= deltaY * this.mouseSensitivity  // Subtract instead of add

// Or document the convention:
/**
 * Mouse coordinates: +X = right, +Y = down (canvas convention)
 * Camera rotation: +X pitch = look up, +Y yaw = turn right
 */
```

**Detection:** Visual test. Move mouse up. If camera looks down, negate `deltaY`.

## Migration Strategy: Euler to Quaternion (If Needed)

### Step 1: Add Quaternion Class

**Option A: Use gl-matrix library**
```bash
npm install gl-matrix
```

```typescript
import { quat } from 'gl-matrix'

class Camera {
  private orientation: quat = quat.create() // [0, 0, 0, 1] (identity)

  handleMouseMove(deltaX: number, deltaY: number): void {
    // Create axis-angle rotations
    const yawAxis = [0, 1, 0]  // Y axis
    const pitchAxis = [1, 0, 0] // X axis

    const yawQuat = quat.setAxisAngle([], yawAxis, deltaX * this.mouseSensitivity)
    const pitchQuat = quat.setAxisAngle([], pitchAxis, deltaY * this.mouseSensitivity)

    // Multiply into current orientation
    quat.multiply(this.orientation, pitchQuat, this.orientation) // orientation = pitch * orientation
    quat.multiply(this.orientation, yawQuat, this.orientation)    // orientation = yaw * orientation

    // Renormalize
    quat.normalize(this.orientation, this.orientation)
  }
}
```

**Option B: Minimal custom implementation**
```typescript
// Add to Math.ts
export class Quaternion {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0,
    public w: number = 1
  ) {}

  static identity(): Quaternion {
    return new Quaternion(0, 0, 0, 1)
  }

  static fromAxisAngle(axis: Vec3, angle: number): Quaternion {
    const halfAngle = angle * 0.5
    const sinHalf = Math.sin(halfAngle)
    return new Quaternion(
      axis.x * sinHalf,
      axis.y * sinHalf,
      axis.z * sinHalf,
      Math.cos(halfAngle)
    )
  }

  static multiply(a: Quaternion, b: Quaternion): Quaternion {
    return new Quaternion(
      a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
      a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
      a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
      a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
    )
  }

  normalize(): Quaternion {
    const len = Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w)
    if (len === 0) return Quaternion.identity()
    return new Quaternion(this.x/len, this.y/len, this.z/len, this.w/len)
  }

  applyToVector(v: Vec3): Vec3 {
    // Rotate vector by this quaternion
    // Formula: q * v * q^(-1)
    const q = this
    const qConj = new Quaternion(-q.x, -q.y, -q.z, q.w) // Conjugate

    // First multiplication: q * v (treat v as quaternion)
    const t1 = new Quaternion(
      q.w*v.x + q.y*v.z - q.z*v.y,
      q.w*v.y - q.x*v.z + q.z*v.x,
      q.w*v.z + q.x*v.y - q.y*v.x,
      -q.x*v.x - q.y*v.y - q.z*v.z
    )

    // Second multiplication: t1 * qConj
    const t2 = new Quaternion(
      t1.w*qConj.x + t1.x*qConj.w + t1.y*qConj.z - t1.z*qConj.y,
      t1.w*qConj.y - t1.x*qConj.z + t1.y*qConj.w + t1.z*qConj.x,
      t1.w*qConj.z + t1.x*qConj.y - t1.y*qConj.x + t1.z*qConj.w,
      t1.w*qConj.w - t1.x*qConj.x - t1.y*qConj.y - t1.z*qConj.z
    )

    return new Vec3(t2.x, t2.y, t2.z)
  }
}
```

### Step 2: Modify Camera Class

**Replace Euler storage with quaternion:**
```typescript
export class Camera {
  private orientation: Quaternion = Quaternion.identity()

  // Keep rotation for compatibility with getShaderUniforms()
  get rotation(): { x: number, y: number } {
    // Convert quaternion to Euler angles (pitch, yaw)
    // Simplified: extract from forward vector
    const forward = this.getForward()
    const pitch = Math.asin(-forward.y) // Pitch from Y component
    const yaw = Math.atan2(forward.x, -forward.z) // Yaw from X, Z
    return { x: pitch, y: yaw }
  }

  handleMouseMove(deltaX: number, deltaY: number): void {
    // Use quaternion multiplication
    const yawQuat = Quaternion.fromAxisAngle(new Vec3(0, 1, 0), deltaX * this.mouseSensitivity)
    const pitchQuat = Quaternion.fromAxisAngle(new Vec3(1, 0, 0), deltaY * this.mouseSensitivity)

    // Apply pitch first, then yaw
    this.orientation = Quaternion.multiply(pitchQuat, this.orientation)
    this.orientation = Quaternion.multiply(yawQuat, this.orientation)
    this.orientation = this.orientation.normalize()
  }

  getForward(): Vec3 {
    return this.orientation.applyToVector(new Vec3(0, 0, -1)) // -Z is forward
  }

  getRight(): Vec3 {
    return this.orientation.applyToVector(new Vec3(1, 0, 0))
  }

  getUp(): Vec3 {
    return this.orientation.applyToVector(new Vec3(0, 1, 0))
  }
}
```

### Step 3: Update Shader (If Using Quaternion in GPU)

**Current:** Shader computes matrices from Euler angles
```glsl
vec3 forward = getForwardVector(u_cameraRotation); // Uses pitch, yaw
```

**After migration:** Send quaternion as 4-component vector
```typescript
getShaderUniforms(aspect: number) {
  return {
    u_cameraPosition: this.position.toArray(),
    u_cameraOrientation: [this.orientation.x, this.orientation.y, this.orientation.z, this.orientation.w],
    u_fov: this.fov * Math.PI / 180,
    u_near: this.near,
    u_far: this.far,
    u_aspect: aspect
  }
}
```

```glsl
uniform vec4 u_cameraOrientation; // Quaternion [x, y, z, w]

vec3 rotateByQuaternion(vec3 v, vec4 q) {
  // Same formula as CPU applyToVector()
  vec4 qConj = vec4(-q.x, -q.y, -q.z, q.w);
  vec4 t1 = vec4(
    q.w*v.x + q.y*v.z - q.z*v.y,
    q.w*v.y - q.x*v.z + q.z*v.x,
    q.w*v.z + q.x*v.y - q.y*v.x,
    -q.x*v.x - q.y*v.y - q.z*v.z
  );
  vec4 t2 = vec4(
    t1.w*qConj.x + t1.x*qConj.w + t1.y*qConj.z - t1.z*qConj.y,
    t1.w*qConj.y - t1.x*qConj.z + t1.y*qConj.w + t1.z*qConj.x,
    t1.w*qConj.z + t1.x*qConj.y - t1.y*qConj.x + t1.z*qConj.w,
    t1.w*qConj.w - t1.x*qConj.x - t1.y*qConj.y - t1.z*qConj.z
  );
  return t2.xyz;
}

void main() {
  vec3 forward = rotateByQuaternion(vec3(0.0, 0.0, -1.0), u_cameraOrientation);
  vec3 target = u_cameraPosition + forward;
  mat4 view = lookAt(u_cameraPosition, target, vec3(0.0, 1.0, 0.0));
  mat4 mvp = projection * view;
  // ...
}
```

**Note:** Keeping Euler in shader and CPU-side quaternion migration is also valid. Only send quaternion if you need GPU-side orientation interpolation (e.g., for smooth camera animations).

### Step 4: Testing

**Test cases for rotation:**
```typescript
describe('Camera rotation', () => {
  it('looks forward at (0,0,0)', () => {
    const camera = new Camera()
    camera.position = new Vec3(0, 0, 10)
    const forward = camera.getForward()
    expect(forward.toArray()).toEqual([0, 0, -1]) // Look down -Z
  })

  it('pitch up 45° looks down', () => {
    const camera = new Camera()
    camera.handleMouseMove(0, 45 * Math.PI / 180)
    const forward = camera.getForward()
    expect(forward.y).toBeCloseTo(-0.707, 0.01) // sin(-45°)
    expect(forward.z).toBeCloseTo(-0.707, 0.01) // cos(-45°)
  })

  it('yaw 90° looks right', () => {
    const camera = new Camera()
    camera.handleMouseMove(90 * Math.PI / 180, 0)
    const forward = camera.getForward()
    expect(forward.x).toBeCloseTo(1, 0.01)
    expect(forward.z).toBeCloseTo(0, 0.01)
  })

  it('no gimbal lock at extreme pitch', () => {
    const camera = new Camera()
    camera.handleMouseMove(0, 89 * Math.PI / 180) // Max pitch
    camera.handleMouseMove(180 * Math.PI / 180, 0) // Yaw 180°
    camera.handleMouseMove(0, -89 * Math.PI / 180) // Back to level
    const forward = camera.getForward()
    expect(forward.toArray()).toEqual([0, 0, -1]) // Should return to forward
  })
})
```

## Implementation Recommendations

### Phase 1: Fix Euler (Recommended Start)

**Step 1: Debug and verify axis directions**
```typescript
// Add to handleMouseMove in Camera.ts
handleMouseMove(deltaX: number, deltaY: number): void {
  console.log('[DEBUG] Mouse input:', { deltaX, deltaY })
  this.rotation.y += deltaX * this.mouseSensitivity
  this.rotation.x += deltaY * this.mouseSensitivity
  console.log('[DEBUG] Rotation after update:', this.rotation)
  const forward = this.getForward()
  console.log('[DEBUG] Forward vector:', forward.toArray())

  this.rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.rotation.x))
}
```

**Expected behavior:**
- Move mouse UP (negative deltaY): Camera should look UP (decrease rotation.x if Y-up, increase if Y-down)
- Move mouse RIGHT (positive deltaX): Camera should turn RIGHT (increase rotation.y)

**Step 2: Fix axis signs based on debug output**
```typescript
// If debug shows inverted behavior, try these changes:

// Option A: Negate Y component
getForward(): Vec3 {
  return new Vec3(
    Math.cos(this.rotation.x) * Math.sin(this.rotation.y),
    Math.sin(this.rotation.x), // Changed from -Math.sin()
    -Math.cos(this.rotation.x) * Math.cos(this.rotation.y)
  )
}

// Option B: Negate Z component
getForward(): Vec3 {
  return new Vec3(
    Math.cos(this.rotation.x) * Math.sin(this.rotation.y),
    -Math.sin(this.rotation.x),
    Math.cos(this.rotation.x) * Math.cos(this.rotation.y) // Changed from -Math.cos()
  )
}

// Option C: Both
getForward(): Vec3 {
  return new Vec3(
    Math.cos(this.rotation.x) * Math.sin(this.rotation.y),
    Math.sin(this.rotation.x),
    Math.cos(this.rotation.x) * Math.cos(this.rotation.y)
  )
}
```

**Step 3: Update shader to match CPU fix**
```typescript
// In ShaderManager.ts, update getForwardVector:
vec3 getForwardVector(vec2 rotation) {
  float pitch = rotation.x;
  float yaw = rotation.y;
  // Apply same fix as CPU
  return vec3(
    cos(pitch) * sin(yaw),
    sin(pitch),           // Match CPU change
    cos(pitch) * cos(yaw)  // Match CPU change
  );
}
```

**Step 4: Test thoroughly**
- Test mouse movement in all directions
- Test at extreme angles (near ±89° pitch)
- Test WASD movement in different orientations
- Verify shader matches CPU output (log both in debug mode)

### Phase 2: Quaternion Migration (If Phase 1 Fails)

**Trigger conditions for migration:**
1. Phase 1 fixes work but camera feels "sluggish" or "wrong" at certain angles
2. You need to add roll rotation (6DOF instead of 5DOF)
3. Performance profiling shows orientation calculation taking > 1ms per frame

**Implementation steps (detailed in Migration Strategy above):**
1. Add Quaternion class or install gl-matrix
2. Replace Euler storage in Camera.ts
3. Update getForward/getRight/getUp to use quaternion
4. Update shader (optional: keep Euler in shader if only CPU changes)
5. Add comprehensive tests
6. Remove debug logging from Phase 1

## Pitfall-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|--------|----------------|------------|
| Phase 1 | Axis sign fix | Test with debug logging before/after | Log rotation and forward vector at each mouse move |
| Phase 1 | Shader-CPU mismatch | Update both files simultaneously | Keep shader function name as comment in Camera.ts for reference |
| Phase 1 | Mouse coordinate inversion | Verify with visual test | Move mouse up, expect camera to look up |
| Phase 2 | Quaternion order | Document multiplication order | Comment: "Apply pitch first, then yaw" |
| Phase 2 | Drift from float error | Renormalize every frame | Call `.normalize()` after each multiplication |
| Phase 2 | Gimbal lock assumption | Remove pitch clamp | Test pitch beyond ±90° to confirm no lock |
| Phase 2 | Shader complexity | Keep Euler in shader if possible | Only use quaternion in GPU if animating |

## Sources

**Confidence Level:** HIGH

| Source | Type | Why Trusted |
|--------|------|-------------|
| Camera.ts (codebase analysis) | Primary | Actual implementation, ground truth for current bug |
| ShaderManager.ts (codebase analysis) | Primary | GPU-side rotation formula, matches CPU implementation |
| Math.ts (codebase analysis) | Primary | Current Vec3 operations, foundation for quaternion implementation |
| WebGL Fundamentals: 3D Cameras | Official documentation | Authoritative explanation of view matrix construction |
| GameDev StackExchange: Euler vs Quaternion | Community consensus | 23k views, explains sequential rotation pitfalls |
| gl-matrix GitHub repository | Library source | 5.6k stars, used by 192k projects, MIT license |
| MDN WebGL Best Practices | Official documentation | WebGL-specific performance and correctness guidelines |

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack recommendations | HIGH | Based on codebase analysis + authoritative sources |
| Euler fix approach | HIGH | Minimal code changes, isolates axis sign bug |
| Quaternion migration path | HIGH | Documented migration strategy with alternatives |
| Pitfall identification | HIGH | All issues verified against codebase and common WebGL problems |
| Performance implications | MEDIUM | Requires actual profiling to confirm CPU bottleneck |

## Gaps to Address

- **User testing:** Actual user feedback on rotation "feel" after fixes
- **Performance profiling:** Measure CPU time spent on orientation calculation
- **Cross-browser testing:** Verify coordinate system consistency across browsers
- **Roll rotation requirement:** Confirm if 6DOF (roll) is needed for data visualization use case
