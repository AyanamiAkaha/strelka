# Phase 01: Camera Rotation Fix - Research

**Researched:** 2026-02-02
**Domain:** WebGL Camera Rotation & Euler Angles
**Confidence:** HIGH

## Summary

This research phase investigated WebGL camera rotation implementations, focusing on Euler angle sign conventions and forward vector calculations. The phase requires fixing a camera rotation direction bug where one axis rotates incorrectly at certain angles, plus documenting the Y-up coordinate system convention.

The current implementation uses a non-standard forward vector calculation with incorrect sign on the pitch component, causing rotation direction errors. The authoritative source (LearnOpenGL.com) provides the standard FPS camera formula using `+sin(pitch)` for the Y component, while the current code uses `-sin(pitch)`.

**Primary recommendation:** Fix the forward vector Y component sign from `-sin(pitch)` to `+sin(pitch)` to match standard Y-up right-handed WebGL coordinate system conventions.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| None required | N/A | Custom WebGL implementation (no 3D library used) | Project uses raw WebGL with custom matrix calculation in GPU shaders |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | N/A | Pure WebGL/GLSL | This is a vanilla WebGL implementation without dependencies |

**Installation:**
\`\`\`bash
# No external dependencies needed - this is a custom WebGL implementation
\`\`\`

## Architecture Patterns

### Recommended Project Structure
\`\`\`
src/
├── core/              # Core rendering and camera systems
│   ├── Camera.ts       # Camera class with rotation logic
│   ├── ShaderManager.ts # GPU matrix calculations
│   └── Math.ts         # Vector math utilities
├── components/          # Vue components
└── views/             # Vue views/panels
\`\`\`

### Pattern 1: Standard FPS Camera Euler Angle Conversion

**What:** Converting pitch/yaw Euler angles to a forward direction vector using trigonometry.

**When to use:** First-person camera systems where mouse controls look direction.

**Formula:**
\`\`\`typescript
// Source: LearnOpenGL.com - Camera chapter
// Standard Y-up right-handed coordinate system
// Assumes camera looks towards negative Z by default

const pitch = rotation.x;  // Looking up/down (rotation around X-axis)
const yaw = rotation.y;    // Looking left/right (rotation around Y-axis)

const forward = new Vec3(
  Math.cos(yaw) * Math.cos(pitch),   // X component
  Math.sin(pitch),                     // Y component (CORRECT SIGN)
  Math.sin(yaw) * Math.cos(pitch)    // Z component
);
\`\`\`

**Key points:**
- Pitch: rotation around X-axis (vertical look)
- Yaw: rotation around Y-axis (horizontal look)
- Positive pitch = look up
- Positive yaw = look right (counter-clockwise from +X axis)

### Pattern 2: Pitch Clamping for Gimbal Lock Prevention

**What:** Constrain pitch angle to prevent camera from looking directly up/down, which causes direction vector to become parallel to world up vector.

**When to use:** Any FPS camera using Euler angles.

**Example:**
\`\`\`typescript
// Source: LearnOpenGL.com - Camera chapter
// Clamp pitch to prevent gimbal lock at ±90°
const maxPitch = Math.PI / 2 - 0.1;  // ~89 degrees
const minPitch = -Math.PI / 2 + 0.1; // ~-89 degrees

this.rotation.x = Math.max(minPitch, Math.min(maxPitch, this.rotation.x));
\`\`\`

**Anti-Patterns to Avoid:**
- **Negative sin(pitch) in Y component:** Inverts vertical rotation direction, causing camera to look opposite direction of intended
- **Full ±90° pitch clamping:** At exactly 90°, direction vector becomes parallel to world up, causing LookAt matrix to flip (use ±89° instead)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Camera rotation direction fix | Manual experimentation with sign flips | Standard Euler angle formula from authoritative sources | The sign conventions have been established through decades of 3D graphics research - custom guessing leads to subtle bugs |
| Coordinate system documentation | Inline comments in code only | External documentation file | Inline comments get outdated, external docs serve as authoritative reference and can include diagrams |
| Gimbal lock handling | Complex quaternion systems | Pitch clamping | For basic FPS cameras, simple pitch clamping (±89°) prevents gimbal lock without complexity of quaternions |

**Key insight:** The forward vector calculation is a well-researched mathematical convention. Using the standard formula eliminates trial-and-error debugging and ensures compatibility with coordinate system conventions used by the 3D graphics industry.

## Common Pitfalls

### Pitfall 1: Incorrect Sign in Forward Vector Y Component

**What goes wrong:** Camera rotates in wrong vertical direction - moving mouse up causes camera to look down, or vice versa.

**Why it happens:** Using `-sin(pitch)` instead of `+sin(pitch)` in the forward vector's Y component. This inverts the vertical component, which is mathematically equivalent to adding 180° to pitch.

**Root cause:** Misunderstanding of coordinate system conventions or copying code from a Y-down coordinate system (like some 2D graphics APIs) into a Y-up 3D system.

**How to avoid:**
1. Use the standard formula from authoritative sources (LearnOpenGL.com):
   \`\`\`typescript
   forward.y = Math.sin(pitch)  // NOT -Math.sin(pitch)
   \`\`\`
2. Verify coordinate system is Y-up (which it is: up = vec3(0,1,0))
3. Test with known rotation directions:
   - Pitch = 0 should look horizontally forward
   - Positive pitch should look up
   - Negative pitch should look down

**Warning signs:**
- Mouse up movement causes camera to look down
- Camera behavior feels "backwards" or "inverted" on one axis
- Rotation direction changes depending on current orientation (sign flip at certain angles)

### Pitfall 2: Mouse Y Coordinate Not Reversed

**What goes wrong:** Vertical mouse movement rotates camera in wrong direction consistently (not angle-dependent).

**Why it happens:** Screen Y coordinates go from top to bottom (increasing downward), but camera pitch expects positive to mean "look up". Without reversing, moving mouse up (decreasing Y) would cause camera to look down.

**Root cause:** Not accounting for screen coordinate system vs. world coordinate system difference.

**How to avoid:**
1. Reverse vertical mouse offset:
   \`\`\`typescript
   const yoffset = lastY - ypos;  // NOT: ypos - lastY
   \`\`\`
2. Apply to pitch (not negative):
   \`\`\`typescript
   this.rotation.x += yoffset * sensitivity;  // Add, don't subtract
   \`\`\`

**Current implementation check:** ✅ Already correct (line 92 in Camera.ts)

**Warning signs:**
- Moving mouse up always looks down (or vice versa)
- Consistent inversion that doesn't change with rotation angle

### Pitfall 3: Pitch Clamping at Exactly ±90°

**What goes wrong:** At pitch = ±90°, camera orientation becomes undefined or jumps/flickers.

**Why it happens:** At 90°, the forward vector's X and Z components become zero (cos(90°) = 0), leaving only Y component. This makes the forward vector parallel to the world up vector (0,1,0), which causes the LookAt view matrix calculation to fail (cross product becomes zero vector).

**Root cause:** Incomplete understanding of gimbal lock prevention.

**How to avoid:**
1. Use ±89° instead of ±90°:
   \`\`\`typescript
   const maxPitch = Math.PI / 2 - 0.1;  // ~89 degrees
   const minPitch = -Math.PI / 2 + 0.1; // ~-89 degrees
   this.rotation.x = Math.max(minPitch, Math.min(maxPitch, this.rotation.x));
   \`\`\`

**Current implementation check:** ✅ Already correct (line 95 in Camera.ts)

**Warning signs:**
- Camera jumps/flickers when looking nearly straight up/down
- LookAt matrix warnings or errors in shader compilation
- Discontinuous rotation near vertical extremes

## Code Examples

### Standard Forward Vector Calculation

\`\`\`typescript
// Source: LearnOpenGL.com - Camera chapter (HIGH confidence)
// https://learnopengl.com/Getting-started/Camera

/**
 * Convert Euler angles (pitch, yaw) to forward direction vector
 * Uses standard Y-up right-handed coordinate system
 * Assumes camera looks towards negative Z by default
 */
getForward(): Vec3 {
  const pitch = this.rotation.x;
  const yaw = this.rotation.y;

  return new Vec3(
    Math.cos(yaw) * Math.cos(pitch),  // X component
    Math.sin(pitch),                     // Y component (FIX: was -Math.sin(pitch))
    Math.sin(yaw) * Math.cos(pitch)     // Z component
  );
}
\`\`\`

### Pitch Clamping

\`\`\`typescript
// Source: LearnOpenGL.com - Camera chapter (HIGH confidence)
// Prevents gimbal lock by avoiding ±90° where forward becomes parallel to world up

handleMouseMove(deltaX: number, deltaY: number): void {
  this.rotation.y += deltaX * this.mouseSensitivity;
  this.rotation.x += deltaY * this.mouseSensitivity;

  // Clamp pitch to prevent gimbal lock
  const maxPitch = Math.PI / 2 - 0.1;  // ~89 degrees
  const minPitch = -Math.PI / 2 + 0.1; // ~-89 degrees
  this.rotation.x = Math.max(minPitch, Math.min(maxPitch, this.rotation.x));
}
\`\`\`

### Coordinate System Convention (for docs)

\`\`\`typescript
/**
 * WebGL Coordinate System Convention
 *
 * This project uses a right-handed Y-up coordinate system:
 *
 *   +X axis: Points to the RIGHT
 *   +Y axis: Points UP
 *   +Z axis: Points OUT OF SCREEN (towards viewer)
 *
 * Camera Conventions:
 *   - Camera looks towards NEGATIVE Z axis when rotation is (0, 0)
 *   - Forward direction calculated from pitch and yaw Euler angles
 *   - Positive pitch: Look UP (rotation around X-axis)
 *   - Positive yaw: Look RIGHT (rotation around Y-axis, counter-clockwise from +X)
 *
 * Pitch Clamping:
 *   - Clamped to ±89° (not ±90°) to prevent gimbal lock
 *   - At ±90°, forward vector becomes parallel to world up, causing matrix flip
 */
\`\`\`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| Incorrect: `-sin(pitch)` in forward Y component | Correct: `+sin(pitch)` in forward Y component | Phase 01 (this fix) | Fixes rotation direction bug - camera now looks in correct direction on all axes |
| No coordinate system documentation | External docs in `docs/coordinate-system.md` | Phase 01 (this fix) | Future developers understand coordinate system conventions without reading code |

**Current implementation status:**
- ✅ Pitch clamping at ±89° (correct)
- ✅ Mouse Y coordinate reversal (correct)
- ❌ Forward vector Y component sign (NEEDS FIX from `-sin(pitch)` to `+sin(pitch)`)
- ⚠️ Coordinate system documentation (NEEDS to be created)

## Open Questions

None - all research questions resolved with HIGH confidence from authoritative source.

1. **What is the correct forward vector formula?**
   - What we know: LearnOpenGL.com provides authoritative formula for Y-up right-handed coordinate system
   - Resolution: Use `direction.y = sin(pitch)` instead of `-sin(pitch)`
   - Confidence: HIGH (from LearnOpenGL.com, industry-standard source)

2. **Should coordinate system docs be in-code or external?**
   - What we know: Phase context specifies external docs only in `docs/coordinate-system.md`
   - Resolution: Create external markdown file, no code comments
   - Confidence: HIGH (explicit phase requirement)

3. **How to handle gimbal lock?**
   - What we know: Current pitch clamping at ±89° is correct approach
   - Resolution: Keep existing clamping, no changes needed
   - Confidence: HIGH (matches LearnOpenGL.com recommendation)

## Sources

### Primary (HIGH confidence)
- LearnOpenGL.com - Camera chapter
  - URL: https://learnopengl.com/Getting-started/Camera
  - Topics: FPS camera Euler angles, forward vector formula, pitch clamping, mouse input conventions
  - Confidence: HIGH (authoritative source used by millions of developers)
- Khronos WebGL Specification
  - URL: https://registry.khronos.org/webgl/specs/latest/1.0/
  - Topics: WebGL coordinate system conventions, right-handed coordinate system
  - Confidence: HIGH (official specification)
- Current codebase analysis
  - Files: src/core/Camera.ts, src/core/ShaderManager.ts
  - Topics: Existing forward vector calculation, pitch clamping, coordinate system usage
  - Confidence: HIGH (direct observation)

### Secondary (MEDIUM confidence)
- None - all findings from primary sources

### Tertiary (LOW confidence)
- None - no unverified web searches needed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Direct observation from package.json (no 3D library used)
- Architecture patterns: HIGH - From LearnOpenGL.com (authoritative industry standard)
- Pitfalls: HIGH - Derived from mathematical analysis and authoritative sources
- Fix recommendation: HIGH - Clear sign error identified comparing current code to standard formula

**Research date:** 2026-02-02
**Valid until:** 30 days (WebGL coordinate system conventions are stable and unlikely to change)

---

## Implementation Guide

### Files to Modify

1. **src/core/Camera.ts**
   - Line 116: Change `-Math.sin(this.rotation.x)` to `Math.sin(this.rotation.x)`
   - Line 180: Change `-Math.sin(this.rotation.x)` to `Math.sin(this.rotation.x)`
   - These are in `getForward()` and `update()` methods

2. **src/core/ShaderManager.ts**
   - Line 210: Change `-sin(pitch)` to `sin(pitch)` in shader's `getForwardVector()` function
   - Ensure shader uses same formula as TypeScript code for consistency

### Files to Create

1. **docs/coordinate-system.md**
   - Document Y-up right-handed coordinate system
   - Include axis directions and Euler angle conventions
   - Document the bug fix (which axis had wrong sign and correction)
   - See "Code Examples" section above for template

### Verification Steps

After implementing the fix:

1. Test vertical rotation:
   - Move mouse up → camera should look UP (positive pitch increases)
   - Move mouse down → camera should look DOWN (negative pitch decreases)

2. Test horizontal rotation:
   - Move mouse right → camera should look RIGHT (positive yaw increases)
   - Move mouse left → camera should look LEFT (negative yaw decreases)

3. Test at edge cases:
   - Pitch near +89°: should look straight up without jumping/flickering
   - Pitch near -89°: should look straight down without jumping/flickering
   - Yaw at various angles: should rotate smoothly in correct direction

4. Verify coordinate system docs:
   - docs/coordinate-system.md exists and is clear
   - Conventions match code implementation
