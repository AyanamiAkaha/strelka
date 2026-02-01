---
phase: 01-camera-rotation-fix
plan: 02
type: execute
wave: 2
depends_on:
  - 01
files_modified:
  - docs/coordinate-system.md
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Coordinate system conventions are documented in external markdown file"
    - "Documentation includes Y-up, right-handed coordinate system definition"
    - "Documentation explains the bug fix (which axis and sign correction)"
    - "Documentation matches the actual code implementation"
  artifacts:
    - path: "docs/coordinate-system.md"
      provides: "Authoritative reference for WebGL coordinate system conventions"
      min_lines: 20
  key_links:
    - from: "docs/coordinate-system.md"
      to: "src/core/Camera.ts"
      via: "Documents the forward vector formula implemented in Camera.ts"
      pattern: "forward.*vector|sin\\(pitch\\)"
---

<objective>
Create external documentation file that defines the project's WebGL coordinate system conventions and documents the camera rotation bug fix.

Purpose: Coordinate system conventions should be documented externally (not in code comments) so future developers understand the Y-up, right-handed system without reading code. The bug fix details (which axis had wrong sign and correction) should be documented to prevent similar errors.

Output: docs/coordinate-system.md with clear coordinate system definition, axis directions, Euler angle conventions, and bug fix documentation.
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
@.planning/phases/01-camera-rotation-fix/01-camera-rotation-fix-01-SUMMARY.md

@src/core/Camera.ts
@src/core/ShaderManager.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create coordinate system documentation file</name>
  <files>docs/coordinate-system.md</files>
  <action>
    Create docs/coordinate-system.md with the following sections:

    1. **Coordinate System Convention**
       - State: This project uses a right-handed Y-up coordinate system
       - Define axis directions:
         * +X: Points to the RIGHT
         * +Y: Points UP
         * +Z: Points OUT OF SCREEN (towards viewer)

    2. **Camera Conventions**
       - Camera looks towards NEGATIVE Z axis when rotation is (0, 0)
       - Forward direction calculated from pitch and yaw Euler angles
       - Positive pitch: Look UP (rotation around X-axis)
       - Positive yaw: Look RIGHT (rotation around Y-axis, counter-clockwise from +X)

    3. **Forward Vector Formula**
       - Document the standard FPS camera formula:
         X: cos(yaw) * cos(pitch)
         Y: sin(pitch)
         Z: sin(yaw) * cos(pitch)
       - Note: This matches LearnOpenGL.com standard formula for Y-up systems

    4. **Pitch Clamping**
       - Clamped to ±89° (not ±90°) to prevent gimbal lock
       - At ±90°, forward vector becomes parallel to world up, causing matrix flip

    5. **Bug Fix History**
       - Document the Phase 01 fix:
         * Issue: Forward vector Y component used `-sin(pitch)` instead of `+sin(pitch)`
         * Effect: Inverted vertical rotation direction
         * Fix: Changed to `+sin(pitch)` in both Camera.ts and ShaderManager.ts
         * Date: 2026-02-02

    Use clear markdown formatting with headings, bullet points, and code blocks where appropriate.
    Keep the file concise but complete - future developers should understand the coordinate system without reading code.
  </action>
  <verify>
    ls -la docs/coordinate-system.md && wc -l docs/coordinate-system.md
  </verify>
  <done>
    docs/coordinate-system.md exists and documents Y-up convention, axis directions, forward vector formula, pitch clamping, and bug fix details
  </done>
</task>

</tasks>

<verification>
After task complete:
1. Confirm docs/coordinate-system.md file exists
2. Verify file contains all required sections: coordinate system, camera conventions, forward vector formula, pitch clamping, bug fix
3. Check documentation matches actual code implementation (review forward vector formula in Camera.ts and ShaderManager.ts)
4. Ensure documentation is clear and self-contained (understandable without reading code)
</verification>

<success_criteria>
- External documentation file created at docs/coordinate-system.md
- All coordinate system conventions clearly documented
- Bug fix details recorded (what was wrong, what was fixed, when)
- Documentation is accurate and matches code implementation
- Ready for testing phase
</success_criteria>

<output>
After completion, create `.planning/phases/01-camera-rotation-fix/01-camera-rotation-fix-02-SUMMARY.md`
</output>
