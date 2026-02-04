# Phase 9: Data Foundation - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

System loads and uses optional `tag` and `image` columns from JSON and SQLite data, gracefully handling missing data. This is foundation work for hover detection (Phase 10) and screen overlay (Phase 11). No user-facing changes in this phase.

</domain>

<decisions>
## Implementation Decisions

### Type definitions
- tag and image are always optional: `tag?: string | null`, `image?: string | null`
- Single type with optional fields - no separate types for data with/without tag/image
- Image property is a simple string (URL), not a URL type - no type-level validation
- Loader type extension approach: Claude's discretion

### Missing data handling
- Null values treated as undefined internally - no distinction between null and missing
- No logging when tag/image columns are missing - silent, expected behavior
- Empty strings ("") converted to null/undefined - treated as missing data
- SQLite graceful degradation - silently return null for missing columns (no schema validation)

### Data validation
- No URL validation for image values - pass through as-is
- No constraints on tag values - accept any string
- Invalid rows: log error and continue loading - don't fail the entire load
- Allow mixed data across rows - no consistency checks (some have tag, some don't)

### Backward compatibility
- Detection strategy: Check if column exists in SQLite / check if any JSON entry has the property. Assume it exists if yes, silently ignore missing/empty values.
- No data format version field - infer format from data structure
- Error handling philosophy: Reject the phase and reimplement if breaking changes occur. By design, there should be no breaking changes to existing data loading.
- Testing: Yes, must test with existing data files to ensure backward compatibility

### Claude's Discretion
- Exact loader type extension pattern - choose what fits existing codebase
- Internal representation details for null/undefined conversion
- Specific log format for invalid rows
- How to implement "assume it exists if yes" detection logic efficiently

</decisions>

<specifics>
## Specific Ideas

- "Check if column exist in case of sql / if any entry in json has property. Assume it exists if yes, silently ignoring missing/empty values" - detection strategy from user
- "Reject phase, reimplement. By our design we shouldn't have breaking changes" - strong constraint on maintaining backward compatibility

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-data-foundation*
*Context gathered: 2026-02-05*
