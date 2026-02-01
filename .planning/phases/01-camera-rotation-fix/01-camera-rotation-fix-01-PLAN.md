---
phase: 01-camera-rotation-fix
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/core/Camera.ts
  - src/core/ShaderManager.ts
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Forward vector Y component uses positive sin(pitch) instead of negative"
    - "Camera.ts and ShaderManager.ts use identical forward vector formula"
    - "Both TypeScript and GLSL code implement the same rotation calculation"
  artifacts:
    - path: "src/core/Camera.ts"
      provides: "Fixed forward vector calculation in getForward() and update() methods"
      contains: "+Math.sin(this.rotation.x)"
    - path: "src/core/ShaderManager.ts"
      provides: "Fixed forward vector calculation in GLSL shader"
      contains: "+sin(pitch)"
  key_links:
    - from: "src/core/Camera.ts"
      to: "src/core/ShaderManager.ts"
      via: "Identical forward vector formula"
      pattern: "\\+Math\\.sin\\(this\\.rotation\\.x\\)|\\+sin\\(pitch\\)"
---

<objective>
Fix camera rotation direction bug by correcting the forward vector Y component sign from negative to positive, matching standard Y-up right-handed WebGL coordinate system conventions.

Purpose: The current implementation uses `-sin(pitch)` in the forward vector's Y component, which inverts vertical rotation direction. This causes the camera to look opposite direction of intended movement on the vertical axis. Using the standard formula `+sin(pitch)` from LearnOpenGL.com ensures correct rotation behavior.

Output: Camera.ts and ShaderManager.ts with corrected forward vector calculations, ready for documentation and testing.
</objective>

<execution_context>
@/home/frater260/.config/opencode/get-shit-done/workflows/execute-plan.md
@/home/frater260/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

@.planning/phases/01-camera-rotation-fix/01-CONTEXT.md
@.planning/phases/01-camera-rotation-fix/01-RESEARCH.md

@src/core/Camera.ts
@src/core/ShaderManager.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix forward vector calculation in Camera.ts</name>
  <files>src/core/Camera.ts</files>
  <action>
    Fix the forward vector Y component sign in two methods:

    1. In the update() method (around line 116):
       Change: `-Math.sin(this.rotation.x)`
       To: `+Math.sin(this.rotation.x)`

    2. In the getForward() method (around line 180):
       Change: `-Math.sin(this.rotation.x)`
       To: `+Math.sin(this.rotation.x)`

    These are the only two forward vector calculations in Camera.ts.
    Do NOT change any other code - pitch clamping, mouse Y reversal, and all other logic are already correct.

    Reference: The standard formula from LearnOpenGL.com uses positive sin(pitch) for Y component in Y-up right-handed coordinate systems.
  </action>
  <verify>
    grep -n "Math.sin(this.rotation.x)" src/core/Camera.ts
  </verify>
  <done>
    Both forward vector calculations in Camera.ts use +Math.sin(this.rotation.x) (no negative sign)
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix forward vector calculation in ShaderManager.ts</name>
  <files>src/core/ShaderManager.ts</files>
  <action>
    Fix the forward vector Y component sign in the GLSL shader's getForwardVector() function (around line 210 in the shader string):

    In the getForwardVector() function within getGPUMatrixShaders():
      Change: `-sin(pitch)` in the Y component
      To: `+sin(pitch)`

    Ensure the GLSL formula matches the TypeScript formula exactly:
      X: cos(pitch) * sin(yaw)
      Y: sin(pitch)  (was -sin(pitch))
      Z: -cos(pitch) * cos(yaw)

    Do NOT change any other shader code - perspective matrix, lookAt matrix, and all other functions are already correct.

    Reference: The GLSL formula must match the TypeScript implementation to ensure CPU and GPU calculations are consistent.
  </action>
  <verify>
    grep -A 5 "getForwardVector" src/core/ShaderManager.ts | grep "sin(pitch)"
  </verify>
  <done>
    GLSL shader's getForwardVector() uses sin(pitch) in Y component (no negative sign), matching Camera.ts formula
  </done>
</task>

</tasks>

<verification>
After both tasks complete:
1. Confirm Camera.ts has exactly 2 occurrences of "Math.sin(this.rotation.x)" (both positive)
2. Confirm ShaderManager.ts getForwardVector() uses "sin(pitch)" without negative sign
3. Verify both formulas are identical: X uses cos*cos*sin pattern, Y uses sin, Z uses -cos*cos pattern
</verification>

<success_criteria>
- Forward vector Y component sign changed from negative to positive in both Camera.ts and ShaderManager.ts
- TypeScript and GLSL formulas are identical
- No other code changes were made (only the sign corrections)
- Ready for documentation and testing
</success_criteria>

<output>
After completion, create `.planning/phases/01-camera-rotation-fix/01-camera-rotation-fix-01-SUMMARY.md`
</output>
