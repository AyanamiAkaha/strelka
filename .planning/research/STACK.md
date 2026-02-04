# Stack Research

**Domain:** Vue 3 UX Refinements for WebGL Playground
**Researched:** 2026-02-04
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vue 3 | 3.3.8 | Existing - Component framework | Already in use, provides reactivity system, composables for stateful logic reuse |
| TypeScript | 5.3.0 | Existing - Type safety | Already in use, prevents runtime errors with compile-time checks |
| Vite | 5.0.0 | Existing - Build tool | Already in use, HMR for rapid UI iteration |

### UX Pattern Libraries (No New Dependencies)

| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| Vue Composables | Encapsulated stateful logic | For reusable state management patterns (error handling, form state) |
| Computed Properties | Derived reactive values | For dynamic disable states, validation conditions |
| Watchers | React to state changes | For auto-selection triggers, error recovery actions |
| Refs | Reactive primitives | For default state values, shared state across components |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (None needed) | - | - | Use existing Vue 3 built-in patterns only |

## Installation

```bash
# No new packages needed
# All UX refinement patterns use existing Vue 3 APIs:
# - ref(), reactive(), computed() from 'vue'
# - watch(), watchEffect() from 'vue'
# - defineProps(), defineEmits() from 'vue'
# - onMounted(), onUnmounted() from 'vue'
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-----------------------|
| Vue Composables | Pinia | Pinia when you need centralized state across many unrelated components. For this milestone, composables are sufficient - simpler, lighter weight |
| Computed refs | Watched refs | Watched refs when you need side effects. Computed when you need derived values without side effects |
| v-bind:disabled | v-show for disabling | v-show for toggle visibility, v-bind:disabled for actual control disabling (different UX semantics) |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Pinia | Overkill for 2-3 components sharing state | Composables in `src/composables/` - lighter, simpler to understand |
| VueUse | Unnecessary for simple UX patterns | Build custom composables - Vue 3 built-ins are sufficient |
| Global error handler | Too coarse-grained for per-component UX | Local composable-based error state - clearer error contexts |
| Reactive() for primitive refs | Cannot hold primitives directly, loses reactivity on reassignment | `ref()` - explicitly designed for primitives |
| Watching entire objects | Deep watch is expensive for performance | Watch specific computed getters or use `watchEffect()` |

## Stack Patterns by Variant

**If managing reset values (e.g., highlightedCluster):**
- Use explicit `ref()` defaults in composables
- Because ref() provides clear initial state and maintains reactivity on reassignment
- Example: `export const highlightedCluster = ref(-2) // -2 = "None" default`

**If implementing auto-selection (e.g., single-table SQLite):**
- Use `watch()` or `watchEffect()` on reactive state
- Because watchers automatically trigger side effects when data changes
- Example: Watch `availableTables`, emit selection when `length === 1`

**If implementing dynamic disable states (e.g., slider when no data):**
- Use `computed()` returning boolean derived from state
- Because computed properties automatically update templates when dependencies change
- Example: `const sliderDisabled = computed(() => !pointData.value || pointData.value.count === 0)`

**If implementing error recovery guidance:**
- Use composable with error array + recovery actions
- Because composable encapsulates error state and recovery logic together
- Example: `useErrorState()` returns `{ errors, addError, dismissError, clearErrors, recoverFromError }`

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| vue@3.3.8 | All Vue 3 APIs | Composition API stable since 3.0, TypeScript support excellent |
| typescript@5.3.0 | Vue 3.3+ | Vue's TS inference for composables requires TS 4.7+ |

## Sources

- https://vuejs.org/guide/essentials/reactivity-fundamentals — Ref API for state management
- https://vuejs.org/guide/essentials/watchers — Watchers for reactive state changes
- https://vuejs.org/guide/essentials/computed — Computed properties for derived values
- https://vuejs.org/guide/reusability/composables — Composables for encapsulated stateful logic
- https://vuejs.org/guide/typescript/composition-api — TypeScript patterns with Composition API
- https://vuejs.org/guide/essentials/class-and-style — Dynamic attribute binding for disable states

---
*Stack research for: Vue 3 UX refinement patterns*
*Researched: 2026-02-04*
