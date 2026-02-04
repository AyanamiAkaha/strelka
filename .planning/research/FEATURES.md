# Feature Landscape

**Domain:** WebGL Clusters Playground — UX Refinements (v1.1)
**Researched:** February 4, 2026
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Consistent state reset values** | Users expect "None" to mean no selection, with clear distinction from other special values like "Noise" | Low | Currently uses -2 for "None", -1 for "Noise". User confusion: Why two negative values? WCAG Perceivable guideline requires clear semantic labels |
| **Auto-selection for single options** | When only one table exists in SQLite file, requiring manual selection feels inefficient | Low | Already implemented in DataLoadControl.vue (line 109-111), but needs verification: does user expect auto-loading or just auto-selection? |
| **Disabled states for unavailable controls** | Slider for cluster highlighting should be visually disabled when no data is loaded | Low | Current code: maxClusterId computed returns -1 when no data, but input has no disabled attribute. User can slide but nothing happens - unclear UX |
| **Clear error messages with context** | Generic errors ("Failed to load") don't tell users what's wrong or how to fix | Medium | WCAG Guideline 1.3.1 requires error messages to identify the problem. aria-errormessage attribute should link error to input |
| **Error recovery guidance** | After an error, users expect next steps (retry, change file, fix format) | Medium | Pattern: Display error message + actionable next steps. Example: "File too large (>25MB). Try a smaller file or export with fewer rows." |
| **Accessible disabled state styling** | Disabled controls must be perceivable by screen readers and colorblind users | Low | MDN aria-disabled guide: Use `[aria-disabled="true"]` selector for styling, ensure high contrast in forced-colors mode |
| **Keyboard navigation for dropdowns** | Screen reader and keyboard-only users expect standard dropdown behavior (arrow keys, enter to select) | Low | Native HTML `<select>` provides this automatically. MDN confirms: native is preferred over custom listbox unless needed |

### Differentiators (Competitive Advantage)

Features that set product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Smart default state management** | Intelligently reset to "None" (-2) when switching data sources, not "Noise" (-1) | Medium | Demonstrates understanding of user intent: switching data = starting fresh, not viewing noise points |
| **Context-aware error suggestions** | Analyze error type and provide specific recovery paths (e.g., SQLite schema mismatch → "Expected columns: x, y, z, cluster") | High | Requires introspection into error data. Competitive advantage: most tools show generic errors only |
| **Graceful degradation on low memory** | Warn before loading large datasets, suggest alternatives | Medium | Differentiator: proactive guidance prevents crashes, builds trust |
| **Visual feedback for auto-selection** | Brief animation or tooltip when auto-selecting single table: "Only one table found, auto-selected: 'points'" | Low | Transparency about automation improves UX, users know what happened |
| **Progressive disclosure for advanced controls** | Hide complex controls (multiplier, order of magnitude) behind "Advanced" toggle | Low | Reduces cognitive load for new users, power users can expand. WCAG supports hidden content when relevant |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Always enabled cluster slider** | "Let me see what happens when I slide with no data" | Confusing UX: slider moves but visual feedback is absent or misleading | Disable slider with clear label: "Load data to enable cluster selection" + aria-disabled="true" |
| **Silent auto-selection** | "Just pick the table for me" | Users don't know what happened, can't trust the system | Auto-select + visual feedback (toast, highlight) explaining the action |
| **Generic error messages** | "Simpler is better, just say 'error'" | Users can't diagnose or recover, WCAG 1.3.1 requires problem identification | Context-specific errors with actionable guidance per WCAG guideline |
| **Color-only disabled states** | "Gray it out, that's enough" | Colorblind users can't perceive disabled state, violates WCAG 1.4.1 | Use aria-disabled="true" + CSS with `@media (forced-colors)` fallback, opacity, and icon overlay |
| **"Noise" as default selection** | "Show noise points when nothing selected" | Confusing mental model: "Noise" is a specific data state, not "nothing selected" | Use "None" as default, "Noise" as explicit opt-in via slider |
| **Hide disabled controls entirely** | "If it doesn't work, don't show it" | Layout shifts, keyboard navigation skips controls, users don't know feature exists | Keep visible with aria-disabled="true" so screen readers can discover it and understand it's unavailable |

## Feature Dependencies

```
Consistent state reset (None vs Noise)
    └──requires──> Display value mapping (computed clusterDisplayValue)
                      └──requires──> CSS styling for special values

Auto-selection for single tables
    └──requires──> Table count detection (availableTables.length === 1)
                      └──enhances──> Visual feedback for auto-selection (toast/tooltip)

Disabled states for unavailable controls
    └──requires──> Data availability check (pointData === null)
                      └──requires──> aria-disabled attribute management
                      └──requires──> CSS styling with high-contrast support

Error recovery UX
    └──requires──> Error categorization (file size, format, schema, memory)
                      └──requires──> Actionable message templates
                      └──enhances──> aria-errormessage linking to inputs
```

### Dependency Notes

- **Consistent state reset requires display value mapping:** Currently implemented (ControlsOverlay.vue line 120-125), but -2 vs -1 semantics unclear to users. Map should be documented in UI or tooltip.
- **Auto-selection enhances with visual feedback:** Already auto-selects (DataLoadControl.vue line 109-111), but no user notification. Add toast or brief tooltip: "Auto-selected table: {tableName}".
- **Disabled states require aria-disabled management:** Native HTML `disabled` attribute handles functionality and keyboard, but aria-disabled is needed for discoverability without removing from tab order. MDN recommends aria-disabled for elements that should remain in focus order but be inactive.
- **Error recovery enhances with aria-errormessage:** WCAG Guideline 1.3.1 requires errors to be identified and described. Use aria-errormessage on inputs to link them to error text for screen readers.

## MVP Definition

### Launch With (v1.1)

Minimum viable product — what's needed to validate concept.

- [ ] **Consistent state reset with clear labels** — Users expect -2 "None" to be no selection, separate from -1 "Noise". Add tooltip or help icon explaining the difference.
- [ ] **Auto-selection for single tables** — Already implemented, verify it works and add visual feedback (toast message).
- [ ] **Disabled cluster slider when no data** — Add disabled attribute to input when pointData is null, style with high-contrast support.
- [ ] **Context-specific error messages** — Replace generic errors with actionable guidance (file size, format, schema, memory).
- [ ] **Error recovery actions** — Add "Retry" button and "Load different file" option to error panel.

### Add After Validation (v1.2)

Features to add once core is working.

- [ ] **Progressive disclosure for advanced controls** — Hide "Points per cluster" multiplier/magnitude behind "Advanced" toggle to reduce cognitive load.
- [ ] **Graceful degradation warnings** — Add memory warnings before loading large datasets (>300K points).
- [ ] **Keyboard navigation shortcuts** — Add keyboard shortcuts for common actions (R for camera reset, Space for toggle pause).
- [ ] **Error history** — Keep last 3 errors accessible via dropdown for debugging complex issues.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Data preview before load** — Show row count and column names before parsing full file.
- [ ] **Auto-detect data format** — Try JSON, SQLite, CSV based on file content, not just extension.
- [ ] **Error reporting integration** — Allow users to submit error reports with anonymized data for debugging.
- [ ] **User preferences persistence** — Remember disabled state preferences, advanced control toggles across sessions.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| **Consistent state reset (None vs Noise)** | HIGH | LOW | P1 |
| **Disabled cluster slider when no data** | HIGH | LOW | P1 |
| **Context-specific error messages** | HIGH | MEDIUM | P1 |
| **Auto-selection visual feedback** | MEDIUM | LOW | P1 |
| **Error recovery actions (Retry, Load different)** | HIGH | MEDIUM | P2 |
| **aria-disabled attribute for discoverability** | MEDIUM | LOW | P2 |
| **Progressive disclosure for advanced controls** | MEDIUM | LOW | P2 |
| **Graceful degradation warnings** | MEDIUM | MEDIUM | P3 |
| **Keyboard navigation shortcuts** | LOW | MEDIUM | P3 |
| **Data preview before load** | MEDIUM | HIGH | P3 |
| **Error history** | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v1.1 launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Competitor A (Standard WebGL tools) | Competitor B (Data viz platforms) | Our Approach |
|---------|--------------------------------|-----------------------------------|--------------|
| **State reset values** | Often use 0 for "none", unclear special values | Use "Select all" toggle, no special values | Use explicit -2 "None", -1 "Noise" with semantic labels and visual distinction |
| **Auto-selection** | Manual table selection required (UX friction) | Auto-load first table found | Auto-select single table + visual feedback toast |
| **Disabled states** | Hide controls entirely when unavailable | Gray out controls with CSS only | aria-disabled + visible disabled state with high-contrast styling, keeps in tab order |
| **Error messages** | Generic: "Error loading file" | Detailed but technical: "SQLite: SQLITE_CONSTRAINT" | Contextual + actionable: "File too large (>25MB). Try exporting with fewer rows." + aria-errormessage |
| **Error recovery** | None, users must retry manually | "Dismiss" button only | "Retry" button + "Load different file" link in error panel |

## Sources

### Primary (HIGH confidence)
- [W3C ARIA Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) — Authoritative guide for combobox/keyboard interactions, auto-selection behavior
- [MDN: aria-disabled attribute](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-disabled) — Official documentation for disabled states, accessibility requirements, CSS styling patterns
- [MDN: listbox role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/listbox_role) — Accessibility requirements for dropdown/listbox patterns
- [MDN: WCAG Perceivable - Error Identification](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG/Perceivable) — WCAG 1.3.1 guideline requiring errors to be identified and described
- **Codebase analysis** — ControlsOverlay.vue (lines 46-60 for cluster slider), DataLoadControl.vue (lines 109-111 for auto-selection), composables/settings.ts (line 3 for -2 "None" state)

### Secondary (MEDIUM confidence)
- [W3C WCAG 2.2 Understanding Error Identification](https://www.w3.org/WAI/WCAG21/Understanding/errors-identification.html) — Official WCAG guidance for error messages
- [MDN HTML select element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select) — Native browser behavior for dropdowns, auto-selection patterns
- [MDN Accessibility Best Practices](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG/Understandable) — Accessibility principles for error recovery

### Tertiary (LOW confidence)
- **Personal UX experience** — Observation that users expect visual feedback for auto-actions, needs A/B testing for validation
- **Industry pattern observation** — Progressive disclosure in settings panels is common pattern (GitHub, VS Code), but effectiveness varies by user expertise level

---

*Feature research for: WebGL Clusters Playground — UX Refinements (v1.1)*
*Researched: February 4, 2026*
