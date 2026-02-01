# Plan 01 Summary: Forward Vector Sign Fix

**Status:** INCORRECT APPROACH - ISSUE MISIDENTIFIED
**Date:** 2026-02-02

---

## What Was Attempted

This plan attempted to fix camera rotation by changing forward vector Y component sign from `-Math.sin(pitch)` to `+Math.sin(pitch)` in both Camera.ts and ShaderManager.ts.

**Commits:** None (changes reverted)

---

## Why This Approach Was Wrong

### User Feedback
1. **Global direction change inverted familiar behavior**
   - User was accustomed to original vertical direction
   - Change affected all rotation, not just edge cases
   - "The bug was about *specific part* not about inverted in general"

2. **Actual bug misidentified**
   - Bug is NOT global vertical inversion
   - Bug is: at extreme pitch angles, left/right movement is diagonal instead of horizontal
   - Bug is: up/down movement locks to forward/backward direction
   - This is classic **gimbal lock** symptom

---

## Actual Issue Discovered

### Gimbal Lock at Extreme Angles

**Symptoms (from user testing):**
- At startup/normal angles: camera works correctly
- At extreme pitch (≈±89°): left/right movement becomes diagonal
- At extreme pitch: up/down movement behaves like forward/backward
- After yaw rotation at extreme pitch: movement axes become incorrect

**Root cause:**
- Euler angle rotation has singularities at ±90° pitch
- Forward vector becomes nearly vertical at extremes
- Cross products used to derive local axes produce unstable results
- Coordinate system "flips" when rotating around world axes

**Why this happens:**
```
At pitch = 89°:
- Forward ≈ (0, 0.9998, 0.0175)  [nearly straight up]
- Right calculation: cross(worldUp, forward) → unstable tiny values
- Up calculation: cross(forward, right) → also unstable
- Yaw rotation: rotates around world Y axis, not camera's local Y axis
```

---

## Recommended Fix Approach

### Switch to Quaternions

**Why quaternions are required:**
- Eliminate gimbal lock completely
- Provide smooth rotation without Euler angle singularities
- Maintain stable local coordinate system at all angles
- Allow unconstrained 360° rotation on all axes

**Implementation scope:**
This is a **major architectural change** requiring:
1. Quaternion math library (or implement Vec4/quaternion operations)
2. Replace rotation storage: `rotation: {x, y}` → `rotation: Quaternion`
3. Update mouse input: convert delta rotations to quaternion multiplication
4. Update movement: rotate movement vectors by quaternion
5. Convert quaternion to matrix for shader: `toMatrix4()` method

**Phase scope mismatch:**
- Phase 01 was defined as "bug fix phase — no new features or behavior changes"
- Quaternion implementation is architectural redesign, not simple bug fix
- Should be separate phase with proper planning

---

## Alternative Mitigations (Not Recommended)

1. **Pitch clamping at ±85° instead of ±89°**
   - Prevents reaching most extreme angles
   - Does not fix problem, only hides it
   - User experience suffers (can't look straight up/down)

2. **Lock yaw rotation at extreme pitch**
   - Prevent rotating yaw when pitch is near ±89°
   - Breaks freeflight camera experience
   - Not acceptable for this project

3. **Switch to different Euler order**
   - Z-X-Y vs X-Y-Z vs other permutations
   - Does not eliminate singularities, just moves them
   - Still susceptible to gimbal lock

---

## Files Reviewed

- `src/core/Camera.ts` - Euler angle implementation, getForward(), getRight(), getUp()
- `src/core/ShaderManager.ts` - lookAt() matrix using Euler-derived forward vector
- `src/core/Math.ts` - Vec3 operations, no quaternion support

---

## Recommendation

**Create new phase:** "Implement Quaternion-Based Camera"

**Phase contents:**
1. Add quaternion math to Math.ts or add Quaternion.ts
2. Refactor Camera to use quaternions for rotation
3. Update mouse input to use quaternion multiplication
4. Maintain all existing movement controls (WASD + mouse drag)
5. Preserve current rotation sensitivity and speed settings
6. Test at all angles including extremes

**Dependencies:**
- Phase 02 (JSON Data Loader) should wait until quaternion camera is stable
- Current Camera.ts can remain in parallel for fallback/testing

---

## Lessons Learned

1. **Do not assume global changes for edge case bugs**
   - Edge case bug ≠ global behavior problem
   - User testing and specific feedback are critical

2. **Euler angle limitations require quaternions**
   - Gimbal lock is fundamental limitation, not fixable with vectors
   - Standard industry practice: use quaternions for 3D camera rotation

3. **Scope creep detection**
   - Simple bug fix that requires architectural redesign = wrong phase scope
   - Should replan as separate phase with proper research/planning

---

**Conclusion:** Plan 01 approach was incorrect. Actual issue (gimbal lock) requires quaternion-based camera system. Recommend deferring until dedicated planning phase.

**Next step:** Update Phase 1 plans to include quaternion implementation phase, then proceed to Plan 02 (documentation).
