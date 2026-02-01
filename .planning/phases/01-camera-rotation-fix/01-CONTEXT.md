# Phase 1: Camera Rotation Fix - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix camera rotation direction bug where one axis rotates in the wrong direction at certain angles. Document Y-up coordinate system convention. This is a bug fix phase only — no new features or behavior changes.

</domain>

<decisions>
## Implementation Decisions

### Rotation control scheme
- Keep existing freeflight mode: WASD movement + mouse rotation (only when clicked)
- Rotation direction fix applies to mouse drag only, not WASD controls
- Camera rotates from current position (free-look/FP style), not around a center point
- Do not document control scheme behavior — only fix the bug
- Scope: Fix rotation direction edge case, do not change control scheme

### Rotation feel & behavior
- Keep current rotation behavior (no changes to smoothing/momentum)
- Keep current rotation sensitivity — no adjustment needed
- Prefer unconstrained rotation (full 360° on all axes)
- If gimbal lock arises, constraints are acceptable to fix behavior
- Handle gimbal lock issues if discovered during testing

### Documentation approach
- Create external documentation file in `docs/coordinate-system.md`
- Concise reference: state Y-up convention and axis directions
- Include bug fix details (which axis had wrong sign and correction)
- Do not put coordinate system docs in Camera.ts comments — external only

### Claude's Discretion
- Exact handling of gimbal lock if discovered
- File format and structure of `docs/coordinate-system.md`
- How much detail to include about the bug fix (which specific axis, before/after values)

</decisions>

<specifics>
## Specific Ideas

- "Current behavior feels good when it works correctly" — preserve existing rotation feel
- Fix is only for edge case where rotation direction is invalid at certain angles
- Documentation should help future developers understand coordinate system conventions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-camera-rotation-fix*
*Context gathered: 2026-02-02*
