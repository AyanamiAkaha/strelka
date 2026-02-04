# Phase 11: Screen Overlay - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

## Phase Boundary

Vue overlay displays point metadata (tag, image) at screen position when hovering over points detected by Phase 10. Overlay positions near the hovered point without covering the point itself. Edge clamping to viewport is optional (nice-to-have, not required).

## Implementation Decisions

### Positioning strategy
- Top-center positioning: Overlay appears above the point, horizontally centered
- Vertical spacing: 10-15px from point (close spacing for tight visual connection)
- Edge handling: Smart positioning to avoid going off-screen is nice-to-have, not required
- Camera movement: Overlay updates in real-time when panning or zooming

### Content layout
- Both tag and image: Image at top, tag below
- Image sizing: Explicit width/height with `object-fit: contain` to preserve aspect ratio
- Tag styling: Chip/badge style (pill-shaped badge with colored background)
- Overlay container: Minimal card style with light background, subtle shadow, rounded corners

### Transition behavior
- Appearance: Instant (no fade-in transition)
- Between points: Jump between points (hide/show cycle)
- Disappearance: Instant when hover ends (no fade-out)
- Rapid hovering: Update instantly to latest point (no debouncing)

### Missing data handling
- No tag or image: No overlay appears at all
- Tag only: Just the tag badge, no placeholder area
- Image only: Just the image, no tag area
- Broken image URLs: Assume URLs are correct; let browser handle naturally

### Claude's Discretion
- Edge handling when overlay would go off-screen at top edge (flip, push, allow clipping)
- Exact overlay container styling (colors, shadows, border radius)
- Image dimensions (width/height values)
- Tag badge colors and styling details

## Specific Ideas

- Instant transitions for responsiveness — no delays, no fades
- Keep layout simple and clean based on what data is available
- Tight 10-15px spacing keeps overlay visually connected to point

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 11-screen-overlay*
*Context gathered: 2026-02-05*
