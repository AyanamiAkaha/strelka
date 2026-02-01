# WebGL Coordinate System Convention

**Last updated:** 2026-02-02

## Coordinate System Convention

This project uses a **right-handed Y-up coordinate system**.

### Axis Directions

- **+X axis:** Points to the **RIGHT**
- **+Y axis:** Points **UP** (world up direction)
- **+Z axis:** Points **OUT OF SCREEN** (towards the viewer)

### Visual Representation

```
     +Y (UP)
      ↑
      |
      |
      |
      ·——→ +X (RIGHT)
     /
    /
  +Z (towards viewer)
```

## Camera Conventions

### Default Orientation

- Camera looks towards the **NEGATIVE Z axis** when rotation is (0, 0)
- At pitch = 0°, camera looks horizontally forward
- At yaw = 0°, camera looks along negative Z axis

### Rotation Angles

The camera uses Euler angles stored as `{ x: pitch, y: yaw }`:

- **Pitch (rotation.x):** Looking up/down (rotation around X-axis)
  - **Positive pitch:** Look **UP**
  - **Negative pitch:** Look **DOWN**

- **Yaw (rotation.y):** Looking left/right (rotation around Y-axis)
  - **Positive yaw:** Look **RIGHT** (counter-clockwise from +X axis)
  - **Negative yaw:** Look **LEFT** (clockwise from +X axis)

## Forward Vector Formula

The forward direction vector is calculated from pitch and yaw Euler angles:

```
X component: cos(yaw) * sin(pitch)
Y component: -sin(pitch)
Z component: -cos(pitch) * cos(yaw)
```

### Notes on Formula

- This matches the WebGL Y-up right-handed coordinate system convention
- At pitch = 0°, forward is horizontal (Y = 0)
- At yaw = 0°, forward points towards negative Z
- The formula is applied identically in both Camera.ts (TypeScript) and ShaderManager.ts (GLSL shader)

### Code Reference

**TypeScript implementation (Camera.ts):**
```typescript
const forward = new Vec3(
  Math.cos(this.rotation.x) * Math.sin(this.rotation.y),  // X
  -Math.sin(this.rotation.x),                                 // Y
  -Math.cos(this.rotation.x) * Math.cos(this.rotation.y)  // Z
)
```

**GLSL implementation (ShaderManager.ts):**
```glsl
vec3 getForwardVector(vec2 rotation) {
  float pitch = rotation.x;
  float yaw = rotation.y;

  return vec3(
    cos(pitch) * sin(yaw),
    -sin(pitch),
    -cos(pitch) * cos(yaw)
  );
}
```

## Pitch Clamping

Pitch is clamped to **±89°** (not ±90°) to prevent gimbal lock.

### Reason for Clamping

At exactly ±90° pitch:
- The forward vector's X and Z components become zero (cos(90°) = 0)
- Only the Y component remains (forward is parallel to world up)
- The `lookAt()` matrix calculation's cross product becomes a zero vector
- This causes the camera view matrix to flip or become undefined

### Implementation

```typescript
// Camera.ts - lines 94-95
const maxPitch = Math.PI / 2 - 0.1;  // ~89 degrees
const minPitch = -Math.PI / 2 + 0.1; // ~-89 degrees
this.rotation.x = Math.max(minPitch, Math.min(maxPitch, this.rotation.x));
```

### Gimbal Limitation - Root Cause

**Important:** The current Euler angle implementation has inherent limitations at extreme angles (near ±89°).

**Root Cause:**
The camera's movement vectors are calculated incorrectly at extreme pitch angles. Specifically:

1. **Right vector calculation (lines 120-124 in Camera.ts):**
   ```typescript
   const right = new Vec3(
     Math.cos(this.rotation.y),  // Only uses yaw!
     0,                        // Y component is ALWAYS zero
     -Math.sin(this.rotation.y)   // Only uses yaw!
   )
   ```
   This calculation ignores pitch (rotation.x) entirely - the right vector is always horizontal (world X-Z plane).

2. **Up vector is fixed to world up (line 126 in Camera.ts):**
   ```typescript
   const up = new Vec3(0, 1, 0)  // Always world up, never camera-local!
   ```

**Why this causes coordinate system collapse at extreme angles:**

- At normal pitch angles: Forward + right + up form a valid local coordinate system
- At extreme pitch (≈±89°): The forward vector is nearly vertical (parallel to world up)
- But right vector is still calculated purely from yaw in the horizontal plane
- Up vector is still fixed to world up
- Result: The coordinate system collapses - vectors are no longer orthogonal in camera's local space

**Symptoms at extreme pitch angles:**

1. **Yaw rotation rotates around world vertical, not camera vertical:**
   - When looking up/down, mouse left/right rotates camera around the world Y axis (0,1,0)
   - Instead of rotating around the camera's local up direction
   - This breaks the entire local coordinate system

2. **Left/right movement becomes diagonal:**
   - Pressing A/D moves you in the horizontal plane
   - But the camera is looking nearly straight up/down
   - Result: You move diagonally relative to what you're looking at

3. **Up/down movement locks to forward/backward direction:**
   - Pressing Q/E moves you vertically in world coordinates
   - But at extreme pitch, "vertical" relative to camera is actually horizontal in world space
   - Result: Up/down movement doesn't move you up/down relative to your view

4. **Complete coordinate system collapse:**
   - All movement vectors (left/right, up/down) operate in wrong coordinate space
   - The system thinks it's using camera-local coordinates
   - But actually using world coordinates due to incorrect vector calculations
   - This is complete gimbal lock - the entire local frame has collapsed

**Why this is a gimbal lock problem:**

Gimbal lock occurs when one rotational axis aligns with another, causing loss of a degree of freedom. In this case:
- At extreme pitch, the camera's local up direction aligns with the world up direction
- The yaw axis (world Y) becomes aligned with the camera's forward/backward axis
- Left/right and up/down movements lose their intuitive meanings
- You can still rotate, but rotations happen in the wrong coordinate space

**Current pitch clamping (±89°) prevents worst-case behavior:**
- Prevents exactly 90° where forward vector would be parallel to world up
- But even at 89°, the symptoms described above are clearly present
- The clamping is a band-aid, not a real solution

This is a **fundamental limitation of Euler angle representations**, not a bug in the forward vector formula. A full solution requires implementing **quaternion-based camera rotation**, which is planned for a future phase.

## Bug Fix History

### Phase 01 Attempt (2026-02-02) - Incorrect Approach

**Initial hypothesis:** Forward vector Y component had wrong sign (`-sin(pitch)` instead of `+sin(pitch)`)

**Attempted fix:**
- Changed Y component from `-sin(pitch)` to `+sin(pitch)`
- Applied to both Camera.ts and ShaderManager.ts

**Result:** **FIX WAS REVERTED**

**Why the approach was incorrect:**
- User feedback indicated the change inverted familiar vertical behavior globally
- The actual issue was NOT global vertical inversion
- The actual bug was **gimbal lock at extreme pitch angles** (see section above)
- Diagonal left/right movement and locked up/down movement at extremes
- This is a known Euler angle limitation, not a sign error

**Current state:**
- Code still uses `-sin(pitch)` in both Camera.ts and ShaderManager.ts
- This matches the project's established coordinate system and expected behavior
- The formula is mathematically correct for this coordinate system

### Recommended Future Fix

The actual solution to the extreme-angle behavior issues is to implement **quaternion-based camera rotation**:

- Eliminates gimbal lock completely
- Provides stable rotation at all angles
- Maintains proper local coordinate system
- Allows unconstrained 360° rotation on all axes

This is a major architectural change requiring proper planning in a dedicated phase.

## Key References

- **LearnOpenGL.com** - Camera chapter: https://learnopengl.com/Getting-started/Camera
- **Khronos WebGL Specification**: https://registry.khronos.org/webgl/specs/latest/1.0/

## Summary

- Coordinate system: Right-handed, Y-up
- Camera looks toward negative Z at (0,0) rotation
- Forward vector uses `-sin(pitch)` for Y component (current implementation)
- Pitch clamped to ±89° to prevent gimbal lock
- Extreme-angle behavior is Euler angle limitation (requires quaternion fix)
- Phase 01 sign-change fix was reverted (incorrect diagnosis)

---

*Document created as part of Phase 01 - Camera Rotation Fix*
