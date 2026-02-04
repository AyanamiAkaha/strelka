# Project Research Summary

**Project:** WebGL Clusters Playground — Vue 3 UX Refinements (v1.1)
**Domain:** Vue 3 + WebGL Application — UX Refinement
**Researched:** February 4, 2026
**Confidence:** HIGH

## Executive Summary

This project is a Vue 3 + WebGL playground for visualizing 3D cluster data. The existing application uses standard Vue 3 Composition API patterns (composables, refs, computed) for state management and Pure WebGL 2.0 for rendering. Research shows that the current architecture is sound but has UX inconsistencies around state reset values, auto-selection behavior, disabled control states, and error recovery guidance.

The recommended approach is to refine the UX without introducing new dependencies. Use existing Vue 3 built-in patterns: composables for shared state, computed properties for derived state, watchers for reactive side effects, and props/events for parent-child communication. Key risks include inconsistent reset sentinel values (-2 vs -1 for highlighted cluster), auto-selection without user feedback, ambiguous disabled states, and generic error messages. Mitigation strategies include centralized state management, visual feedback for automatic actions, clear disabled state styling with aria-disabled attributes, and context-aware error guidance with actionable recovery steps.

The research indicates that these changes are low-risk, independent improvements that can be implemented incrementally. Most patterns are well-documented in Vue 3 official documentation, and the existing codebase provides clear integration points. The suggested phase structure prioritizes state consistency first (to establish a foundation), followed by UI polish and enhanced error handling.

## Key Findings

### Recommended Stack

No new dependencies needed. The existing stack (Vue 3.3.8, TypeScript 5.3.0, Vite 5.0.0) is sufficient for all UX refinements. Use built-in Vue 3 patterns:

- **Vue Composables** — Encapsulated stateful logic for error handling and form state reuse
- **Computed Properties** — Derived reactive values for dynamic disable states and validation
- **Watchers** — React to state changes for auto-selection triggers and error recovery actions
- **Refs** — Reactive primitives for default state values and shared state across components

Avoid: Pinia (overkill for 2-3 components), VueUse (unnecessary for simple patterns), global error handlers (too coarse-grained).

### Expected Features

**Must have (table stakes):**
- **Consistent state reset values** — Users expect "None" to mean no selection, with clear distinction from special values like "Noise"
- **Auto-selection for single options** — When only one table exists, requiring manual selection feels inefficient
- **Disabled states for unavailable controls** — Slider for cluster highlighting should be visually disabled when no data is loaded
- **Clear error messages with context** — Generic errors don't tell users what's wrong or how to fix
- **Error recovery guidance** — After an error, users expect next steps (retry, change file, fix format)
- **Accessible disabled state styling** — Disabled controls must be perceivable by screen readers and colorblind users

**Should have (competitive):**
- **Smart default state management** — Intelligently reset to "None" (-2) when switching data sources
- **Context-aware error suggestions** — Analyze error type and provide specific recovery paths
- **Visual feedback for auto-selection** — Brief animation or tooltip when auto-selecting single table
- **Progressive disclosure for advanced controls** — Hide complex controls behind "Advanced" toggle

**Defer (v2+):**
- **Data preview before load** — Show row count and column names before parsing full file
- **Auto-detect data format** — Try JSON, SQLite, CSV based on file content
- **Error reporting integration** — Allow users to submit error reports with anonymized data

### Architecture Approach

The application follows a parent-child component hierarchy with shared global state via composables. WebGLPlayground.vue (parent) manages WebGL context, camera, rendering, and error state. ControlsOverlay.vue (child) handles settings UI and cluster slider. DataLoadControl.vue (grandchild) manages file selection and SQLite table selection. Global shared state (highlightedCluster, ppc) lives in composables/settings.ts as reactive refs imported directly by components. State mutations use props-down, events-up pattern: parent owns state, children emit events to request changes.

**Major components:**
1. **WebGLPlayground.vue** — WebGL context, camera controls, point data management, error management (errors array)
2. **ControlsOverlay.vue** — Settings UI, cluster slider, data source switching, emits file/table selection events
3. **DataLoadControl.vue** — File selection, SQLite table selection UI, handles auto-selection for single tables
4. **settings.ts** — Global shared state composable (highlightedCluster ref, ppc ref)
5. **DataProvider/validators** — Data loading, validation, error generation with context

### Critical Pitfalls

1. **Inconsistent state reset values** — Changing sentinel values (-2 vs -1) without updating all reset points causes partial state updates and rendering inconsistencies. Audit all reset codepaths and use a centralized reset function.

2. **Auto-selection without user feedback** — Users don't know what happened when the system auto-selects single tables, leading to trust issues. Always add visual feedback (toast message, tooltip) explaining the automatic action.

3. **Dynamic disabling without clear visual indicators** — Disabling controls without opacity changes, cursor changes, or aria-disabled attributes creates a "frozen UI" perception. Use high-contrast styling with forced-colors fallback for accessibility.

4. **Generic error messages without actionability** — Errors like "Failed to load" don't help users diagnose or recover. Use context-aware messages with specific guidance (e.g., "File too large. Try exporting with fewer rows.") and aria-errormessage linking to inputs.

5. **Mutation of props in child components** — Direct prop mutation breaks one-way data flow and causes Vue warnings. Always emit events to request state changes from the parent.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: State Reset Consistency
**Rationale:** Establish a consistent foundation before adding features. Changing sentinel values (-2 to -1) requires updates across multiple files (settings.ts, WebGLPlayground.vue, ControlsOverlay.vue). This is the lowest-risk change and clarifies semantic meaning of state values.
**Delivers:** Consistent highlightedCluster reset to -1 ("All clusters") across all data source switches
**Addresses:** Consistent state reset values (table stake)
**Avoids:** Partial state updates causing rendering inconsistencies (pitfall #1)
**Uses:** Vue refs and computed properties (stack)

### Phase 2: Dynamic Control Disabling
**Rationale:** Prevent confusing interaction patterns. This is independent of state reset changes and requires minimal code changes. Adding disabled states to the cluster slider when no data is loaded prevents user frustration from "sliding with no effect."
**Delivers:** Cluster slider disabled when pointData is null, with visual feedback (opacity, cursor) and aria-disabled attribute
**Addresses:** Disabled states for unavailable controls, accessible disabled state styling (table stakes)
**Avoids:** "Frozen UI" perception from silent disabling (pitfall #3)
**Uses:** Computed properties for derived state, Vue attribute binding (stack)

### Phase 3: SQLite Auto-Selection with Feedback
**Rationale:** Improve UX for single-table databases. Auto-selecting single tables eliminates unnecessary user action. Requires adding visual feedback to avoid confusion about what happened.
**Delivers:** Auto-select and load single-table SQLite files, hide table selection UI for single tables, show toast message confirming auto-selection
**Addresses:** Auto-selection for single options, visual feedback for auto-selection (table stakes + differentiator)
**Avoids:** Silent auto-selection confusion (pitfall #2)
**Uses:** Vue watchers or computed logic, conditional rendering (stack)

### Phase 4: Error Recovery Guidance
**Rationale:** Most complex change, requires updates across error system (ErrorInfo interface, validators, error panel UI). Completes the UX polish by making errors actionable.
**Delivers:** Context-aware error messages with recovery guidance, error panel displays guidance with actionable steps, aria-errormessage linking errors to inputs
**Addresses:** Clear error messages with context, error recovery guidance (table stakes + differentiator)
**Avoids:** Generic error messages without actionability (pitfall #4)
**Uses:** Vue error state management, composable pattern for error handling (stack)

### Phase Ordering Rationale

- **Foundation first (Phase 1):** State reset consistency is the foundation for all other features. Changing sentinel values (-2 to -1) affects display logic and slider ranges. Establishing this early prevents bugs in later phases.
- **Prevent confusion (Phase 2 & 3):** Dynamic disabling and auto-selection both improve UX by preventing confusing interactions. They are independent of each other and can be developed in parallel.
- **Complete the loop (Phase 4):** Error recovery guidance ties everything together by providing actionable steps when things go wrong. This requires a stable error system, so it comes last.

**Grouping rationale:** Phases 1-3 are independent changes that can be developed in parallel by different developers (touching different files: settings.ts, ControlsOverlay.vue, DataLoadControl.vue). Phase 4 requires testing across all error types and should be integrated after foundation changes are stable.

**Pitfall avoidance by phase ordering:**
- **Phase 1:** Avoids partial state updates by auditing all reset codepaths and using consistent sentinel values
- **Phase 2:** Avoids "frozen UI" perception by adding clear visual indicators (opacity, cursor) and aria-disabled attributes
- **Phase 3:** Avoids silent auto-selection confusion by requiring visual feedback mechanisms (toast message, tooltip)
- **Phase 4:** Avoids generic errors by implementing context-aware guidance with actionable recovery steps

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 4 (Error Recovery):** Error categorization system for context-aware messages needs definition. Consider creating an error type enum or error code mapping to guidance templates.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (State Reset):** Well-documented Vue ref and computed patterns. Codebase shows clear integration points.
- **Phase 2 (Dynamic Disabling):** Standard Vue attribute binding and accessibility patterns. MDN and Vue docs provide clear guidance.
- **Phase 3 (Auto-Selection):** Vue conditional rendering and event emission patterns. Existing codebase has similar patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Based on Vue 3 official documentation, codebase analysis confirms no new dependencies needed |
| Features | HIGH | WCAG guidelines, MDN accessibility docs, and codebase analysis provide clear feature requirements |
| Architecture | HIGH | Comprehensive codebase analysis of all Vue components, composables, and data flow patterns |
| Pitfalls | MEDIUM | Vue 3 reactivity docs and common Vue patterns identified pitfalls, but limited empirical data on UX effectiveness |

**Overall confidence:** HIGH

### Gaps to Address

- **Multi-table SQLite auto-selection strategies:** Current code only handles single-table auto-select. If multiple tables exist with similar names (e.g., "points_2023", "points_2024"), should we suggest to most recent based on naming convention? Define during planning.

- **Error state machine implementation:** Context-aware guidance requires categorizing errors (file size, format, schema, memory). Need to define error categories and guidance templates during Phase 4 planning.

- **User testing for auto-selection UX:** Research assumes visual feedback (toast message) improves UX, but needs A/B testing for validation. Consider user testing as part of Phase 3.

- **WebGL state synchronization timing:** Dynamic disabling based on pointData null/empty is straightforward, but need to verify WebGL rendering doesn't lag behind Vue state updates (edge case: large dataset loading).

**Handling during planning/execution:**
- Define multi-table selection strategy in Phase 3 planning document
- Create error category enum in Phase 4 planning before implementation
- Include user testing task in Phase 3 acceptance criteria
- Add manual testing for large dataset loading edge cases

## Sources

### Primary (HIGH confidence)
- [Vue 3 Composition API Documentation](https://vuejs.org/guide/essentials/reactivity-fundamentals) — Ref API for state management
- [Vue 3 Composables Guide](https://vuejs.org/guide/reusability/composables) — Composables for encapsulated stateful logic
- [MDN: aria-disabled attribute](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-disabled) — Official documentation for disabled states
- [W3C WCAG 2.2 Error Identification](https://www.w3.org/WAI/WCAG21/Understanding/errors-identification.html) — WCAG 1.3.1 guideline requiring errors to be identified
- **Codebase analysis** — All Vue components (WebGLPlayground.vue, ControlsOverlay.vue, DataLoadControl.vue), composables/settings.ts, DataProvider, validators.ts (818 lines analyzed)

### Secondary (MEDIUM confidence)
- [W3C ARIA Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) — Authoritative guide for dropdown/keyboard interactions
- [MDN Accessibility Best Practices](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG) — Accessibility principles for error recovery
- [Vue 3 TypeScript Integration](https://vuejs.org/guide/typescript/composition-api) — TypeScript patterns with Composition API

### Tertiary (LOW confidence)
- Personal UX observation that users expect visual feedback for auto-actions (needs A/B testing)
- Industry pattern observation that progressive disclosure reduces cognitive load (effectiveness varies by user expertise)

---

*Research completed: February 4, 2026*
*Ready for roadmap: yes*
