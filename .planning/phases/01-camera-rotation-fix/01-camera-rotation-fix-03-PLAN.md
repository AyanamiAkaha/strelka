---
phase: 01-camera-rotation-fix
plan: 03
type: execute
wave: 3
depends_on:
  - 02
files_modified: []
autonomous: false
user_setup: []

must_haves:
  truths:
    - "Vertical rotation: mouse up causes camera to look up, mouse down causes camera to look down"
    - "Horizontal rotation: mouse right causes camera to look right, mouse left causes camera to look left"
    - "Camera does not jump or flicker at vertical extremes (no gimbal lock)"
    - "Coordinate system documentation matches actual implementation"
  artifacts: []
  key_links: []
---

<objective>
Verify that camera rotation works correctly on all axes after the forward vector sign fix, and confirm coordinate system documentation is accurate.

Purpose: The fix changes the forward vector Y component from `-sin(pitch)` to `+sin(pitch)`. This inverts vertical rotation direction from wrong to correct. Human verification is required because this is a visual/behavioral change that can only be confirmed by using the camera interactively.

Output: Confirmed working camera rotation on all axes with no regressions.
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
@.planning/phases/01-camera-rotation-fix/01-camera-rotation-fix-02-SUMMARY.md

@src/core/Camera.ts
@src/core/ShaderManager.ts
@docs/coordinate-system.md
</context>

<tasks>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Complete camera rotation fix (code corrections + documentation)</what-built>
  <how-to-verify>
    Test the camera rotation interactively by following these steps:

    1. **Start the application:**
       Run `npm run dev` and open the application in your browser

    2. **Test vertical rotation (pitch):**
       - Click and drag mouse UP → camera should look UP (moving toward ceiling)
       - Click and drag mouse DOWN → camera should look DOWN (moving toward floor)
       - If mouse up causes camera to look down (or vice versa), report this as a failure

    3. **Test horizontal rotation (yaw):**
       - Click and drag mouse RIGHT → camera should look RIGHT
       - Click and drag mouse LEFT → camera should look LEFT
       - Rotation should be smooth and in the direction of mouse movement

    4. **Test vertical extremes (gimbal lock prevention):**
       - Move mouse up continuously until you can't look any higher
       - Camera should look nearly straight up without jumping or flickering
       - Move mouse down continuously until you can't look any lower
       - Camera should look nearly straight down without jumping or flickering
       - If camera jumps or orientation flips at vertical extremes, report as failure

    5. **Test combined rotation:**
       - Rotate camera diagonally (both up/down and left/right simultaneously)
       - Rotation should feel natural and correct on both axes
       - No direction should feel "inverted" or "backwards"

    6. **Verify documentation accuracy:**
       - Open docs/coordinate-system.md
       - Read through the forward vector formula section
       - Confirm the documented formula matches the code in Camera.ts and ShaderManager.ts
       - Check that the bug fix description accurately describes what was fixed

    Expected behavior:
    - All rotation directions match mouse movement (no inversions)
    - Smooth rotation at all angles including near-vertical
    - No jumping or flickering at any point
    - Documentation is accurate and matches code
  </how-to-verify>
  <resume-signal>Type "approved" if all tests pass, or describe which specific behavior is incorrect</resume-signal>
</task>

</tasks>

<verification>
After checkpoint completes:
1. User has confirmed correct rotation behavior on all axes
2. No jumping/flickering at vertical extremes reported
3. Documentation accuracy confirmed
4. Phase success criteria achieved
</verification>

<success_criteria>
- User confirms camera rotates correctly on all axes
- No rotation direction inversions reported
- No gimbal lock issues (jumping/flickering) at vertical extremes
- Documentation accuracy verified
- Phase 01 requirements CAM-01 and CAM-02 satisfied
</success_criteria>

<output>
After completion, create `.planning/phases/01-camera-rotation-fix/01-camera-rotation-fix-03-SUMMARY.md`
</output>
