# Change history

## 0.8.0 — 2026-10-28
- Default to a directed execution flow with explicit Start here, Next and Waiting for predecessor labels; retain free spatial placement as an option.
- Prefer ready continuations of the current sequence before unrelated tasks, and keep completed tasks outside the recommended execution path.
- Keep all task labels readable during neighborhood focus.

- Increase task label size and weight, dot size and link contrast in the spatial graph.
- Keep deadlines and labelled importance/difficulty meters visible without hovering.
- Default to a readable graph scale; offer separate Read larger and Show all controls.
- Increase collision spacing to fit visible task metadata and keep unrelated nodes readable during focus.

## 0.7.0 — 2026-10-28
- Add an Obsidian-inspired spatial graph: small category-colored nodes, task labels, connection-weighted sizes and a deterministic force layout.
- Add node dragging, neighborhood hover/keyboard focus, spacing control, layout reset and a toggle for recommendation paths.
- Keep all tasks, dependency arrows, ranking criteria, task details, zoom/pan and sequence/tree views.
- Add tests for force-layout determinism, label collision, bounds, immutability and edge preservation.

## 0.6.1 — 2026-10-28
- Replace numeric graph nodes with task names inside larger circular nodes.
- Retain full-task ordering, dependency arrows, recommendation links and existing task details.
- Adjust edge endpoints and node spacing to match the larger task nodes.

## 0.6.0 — 2026-10-28
- Make a continuous node-and-arrow graph the default map view, with circular status nodes and straight directed dependency edges.
- Show branching and merging without enclosing sequence cards; retain sequence and tree views.
- Unify all recorded tasks into one numbered recommendation path ordered by priority, importance or deadline, respecting existing dependencies.
- Distinguish real dependency edges (solid) from suggested next-task edges (dashed); never modify stored task connections.
- Keep task titles, due dates, importance and difficulty visible and open existing details from each node.
- Verify network node collisions and dependency preservation across all ordering modes.

## 0.5.0 — 2026-10-28
- Replace the plain independent-task grid with priority, importance, and deadline maps while preserving connected sequence positions and edges.
- Priority uses explicit importance (7–9 / 1–6) and deadline proximity (within two days, including overdue / later or undated) quadrants.
- Importance bands sort by value then deadline; deadline columns sort by date and place undated tasks last.
- Separate completed independent tasks from open-task ranking. Show axes, counts, empty regions, and a criteria explanation.
- Preserve zoom, pan, flow navigation, existing task details, and mobile controls; demonstrate all quadrants with isolated sample data.
- Add regression checks for deterministic classification, date boundaries, missing deadlines, source/dependency preservation and node collisions.

## 0.4.0 — 2026-10-28
- Add a Task map tab to desktop and mobile navigation without removing the existing tabs or add action.
- Group connected tasks and display dependencies in horizontal sequence or vertical tree layouts; render shared children only once.
- Add zoom, wheel/pinch gestures, pointer panning, fit-all, expanded view, flow navigation, and a desktop minimap.
- Highlight task-name, category, and state matches while preserving dependency context; open the existing task detail from each node.
- Add an isolated branch-and-merge example that does not alter stored tasks.
- Verify branching, merging, disconnected nodes, missing links, cyclic input, long chains, viewport fitting, and zoom-anchor invariance.

## 0.3.1 — 2026-10-28
- Apply the same primary-category picker to direct schedule creation and editing.
- Retain category IDs when assigning tasks or applying plan drafts; show categories on schedule cards and details.
- Require deliberate category selection for new entries instead of defaulting to work.
- Improve Korean word wrapping in the visible previous/current/next workflow.
- Place sequence controls above secondary task metadata so they are visible when details first open.

## 0.3.0 — 2026-10-28
- Replace collapsed dependency editing with a visible Previous → Current → Next workflow.
- Keep selection search, multiple links, unlinking, repeat restrictions, and cycle validation.
- Add six default primary categories and custom categories; retain optional multi-select tags.
- Increase task titles, deadlines, and circular importance/difficulty indicators on desktop and mobile.
- Mobile indicators are 44px (42px on the narrowest layout), with 14–15px values.

## 0.2.0 — 2026-10-28
- Restore original feature entry points and clarify backend-only prototype boundaries.
- Add responsive desktop/mobile layouts and preserve fixed deadline/indicator placement.

## 0.1.0 — 2026-10-28
- Initial standalone HTML design proposal.
