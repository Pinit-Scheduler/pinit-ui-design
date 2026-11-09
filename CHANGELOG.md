# Change history

## 0.20.0 — 2026-11-09
- Make the 통계 menu "my statistics": the same numbers whichever space is selected, counting schedules I actually ran (or that are mine and not yet run) and tasks I am assigned, with a "스페이스별 내 완료 시간" breakdown by space and project. The breadcrumb reads 모든 스페이스.
- Add "이번 주 팀 기록" to the hub for spaces with two or more members: completed schedule count and time, per-day bars, time by project and time by the person who actually ran each schedule. Bars stay neutral grey; blue remains for actions.
- Record the runner on schedules started or completed in the prototype and seed three completed example schedules. Time is the planned duration of completed schedules, as in the existing statistics, and the screens say so.
- Why: the user decided statistics are personal across all spaces, team statistics live in the hub, time may be shared without restriction, and "my record" means the person who actually ran it. Supersedes the 0.19.0 in-screen team statistics.
- Propose the matching backend contract in spaces-summary-api.md. Validation: npm run check and npm run build; browser checks at 1365×900 and 390×844 with an empty error log.

## Statistics split decisions — 2026-11-09
- Record in docs/design-evidence/spaces-hub.md: the 통계 menu becomes "my statistics" across all spaces with space/project breakdown, team statistics move to the 스페이스 hub, and time metrics (focus and invested time) may be shared without restriction, including per-person time in team statistics.
- This supersedes the earlier "team statistics in the 통계 screen with the scope stated" decision that 0.19.0 drew. Follow-ups are listed but not built yet. Documentation only.

## 0.19.0 — 2026-11-09
- Scope the schedule and statistics screens to the selected space (and project), and show that scope in the breadcrumb.
- In a team space, add a "내 일정 | 팀 전체" switch to the schedule panel. It defaults to my schedules, resets on space change, tells how many teammate schedules are hidden that day, and names each schedule's assignee in the team view. A linked schedule follows its task's assignee. Today keeps showing only my schedules across spaces.
- Recompute statistics from the selected space's tasks and schedules and state the scope above them ("핀잇 개선 참여자 3명 전체의 기록이에요."). The summarizing rules are unchanged.
- Why: the user decided team schedules default to "mine" with a team toggle and team statistics keep the all-member total with the scope stated.
- Scoping swaps the global arrays only while a screen renders and guards save so the full lists are always stored. Example schedules 9101–9104 were added. Validation: npm run check and npm run build; browser checks at 1365×900 and 390×844 with an empty error log (docs/design-evidence/spaces-hub.md).

## Summary API decisions — 2026-11-09
- Record the user's answers in spaces-summary-api.md: future recurrence occurrences are excluded like the task list default, missed occurrences count as open, suspended schedules count as running, and the space list summary gets its own route.
- Record from backend code that leaving or removal unassigns the member's tasks, schedules and series, so the summary counts them as unassigned and the client must also refetch on membership changes. Note that the prototype's hand-off-before-leaving flow differs from the backend. Documentation only.

## Summary API specification — 2026-11-09
- Add docs/design-evidence/spaces-summary-api.md: a proposed backend contract for the hub's numbers (two read-only routes, disjoint per-state counts, nearest due dates, membership checks, refetch on existing `changed` events), grounded in pinit-monolith a806512d. Paths, fields and definitions are proposals for backend review, not confirmed policy.
- Link it from backend-domain-boundary.md and spaces-hub.md. Documentation only; no runtime code.

## Decisions — 2026-11-09
- Record four user decisions in docs/design-evidence/spaces-hub.md: hub counts come from a backend summary (the domain owns open/running definitions), team-space schedules default to my own with a team toggle, team-space statistics keep the all-member total with the scope stated on screen, and tasks created from 오늘 default to the personal space.
- Documentation only. The schedule toggle and statistics scope label are not drawn yet because this prototype's schedule and statistics screens do not use space scope.

## 0.18.0 — 2026-11-09
- Add a "스페이스" hub after 오늘 in the sidebar. It replaces the space management modal: a list of every space with member count and open-task count, and for the selected space its purpose as the one large type element, project rows with one dot per task (done, running, open, unassigned), counts and nearest deadline, per-member open work, an unassigned block with an assign dialog, and space settings.
- Why: a per-page review found no place to read team and project status, management limited to one space at a time, scattered entry points and invisible roles. The user approved turning management into an overview and lifting the earlier "no new dashboard" constraint.
- Rename the user-facing term 공간 to 스페이스 across the space modules, keeping "저장 공간" (storage) unchanged.
- Show the actual scope in the breadcrumb (space › project on 작업, 모든 스페이스 elsewhere). Space switching keeps the current screen. Remove the duplicate "공간 관리"/"프로젝트 관리" shortcuts in favour of the hub.
- Align example data with confirmed policy: administrator roles, an explicit unassigned choice, link invitations with a one-hour notice, and a space where 나 is not an administrator. Capabilities and reasons are static example records, not permission logic.
- Validation: npm run check and npm run build; browser checks at 1365×900 and 390×844 (list, detail, assign, non-administrator reasons, switcher, today scope, task breadcrumb) with an empty error log. Evidence and screenshots in docs/design-evidence/spaces-hub.md.

## Policy specifications — 2026-11-08
- Record confirmed assignee/default, shared editing/moving, administrator deletion/restoration, real-time and optimistic-lock UX, team-space domain, project classification, signup nickname and one-hour Redis invitation requirements.
- Specify invitation exceptions, UX messages, backend acceptance criteria and strict backend-domain ownership. Keep unresolved details explicit.
- Honor the user’s specification-only scope: withdraw uncommitted mock domain, synchronization, authorization, expiry and join execution code/tests; restore runtime sources to 97f5a9d. No backend, infrastructure or production changes.
- Validation: compare runtime source hashes with the approved baseline and review document consistency/links. No new runtime behavior is delivered.

## 0.17.1 — 2026-11-08
- Keep the three management tabs on one row at 320px with equal-width columns and 44px touch targets; retain the desktop layout.
- Recheck 320px/400px layouts, fixed action visibility and screenshots; npm run check and npm run build pass.

## 0.17.0 — 2026-11-08
- Connect space/purpose/project create, read, edit, delete and restore flows within the existing prototype, with contextual defaults and first-task empty states.
- Add example invitations, acceptance/decline/cancellation, member removal with task reassignment, leaving and last-member guidance. No emails or real account permissions are changed.
- Extend existing task/schedule forms with space/project affiliation, one assignee, explicit history-sharing confirmation and an optional linked-schedule move. Preserve Today due/ready predicates and their intersection.
- Show deletion impact, explicit child handling, parent-aware restoration and a running-schedule guard. Mark unresolved lifecycle and schedule-sharing policies as review proposals.
- Isolate modal background focus/scroll and restore focus to a visible control after desktop/mobile transitions.
- Record R-01–R-14, Q-01–Q-15, observed CRUD/cancel/error/empty states, limitations and desktop/mobile screenshots in docs/design-evidence/purpose-spaces-crud.md.
- Validation: npm run check and npm run build; browser flows at 1365px, 400px and 320px, persistence/reload, original Today counts and final empty browser error logs. Real multi-account collaboration, server conflicts and physical mobile devices remain unverified.

## 0.16.0 — 2026-11-08
- Extend the existing prototype with personal and purpose-space navigation, project entry, and task affiliation links; retain task cards, calendar, categories and existing feature entry points.
- Replace the native space select with an anchored desktop panel and a mobile bottom sheet, with selection feedback, keyboard dismissal, focus restoration, touch targets and safe-area spacing.
- Keep Today global across spaces and preserve its existing due-today and ready-task sections. Do not treat their intersection as a defect or change the existing task conditions.
- Add project completion/reopening as example view metadata without automatically completing its tasks.
- Record user decisions, design rationale, knowledge-base verification, actual checks and desktop/mobile screenshots in docs/design-evidence/purpose-spaces.md.
- Validation: npm run check and npm run build passed; checked space selection, project entry and completion, the existing task form, 320px mobile sheet bounds, focus/scroll restoration, task-map/statistics/calendar entry points and empty browser error logs.

## Workflow — 2026-11-08
- Record the user's requirement to make requested design changes in this repository and retain evidence, rather than leaving completed work only in chat previews.
- Require coherent commits and pushes, CHANGELOG entries, topic-specific UI validation evidence, and remote verification with reviewable links.
- Keep confirmed decisions, proposals and unresolved policies distinct; use isolated working copies and branches.
- Align the remote-write account rule with the user-designated main account, GoGradually.
- Validation: documentation-only change; reviewed the workflow and account rules. No UI source or generated preview changed, so desktop/mobile UI checks and application builds were not run for this change.

## 0.15.1 — 2026-11-03
- Restyle the schedule control bar as a workspace card: theme-aware surface, subtle border and shadow, muted text and soft blue accents.
- Replace multicolour circular controls with neutral rounded buttons; align schedule state icons with the same palette. Preserve all schedule actions and responsive navigation clearance.

## 0.15.0 — 2026-11-03
- Restore the production schedule-control flow: start from the card state icon, then use the persistent bottom bar for Start, Pause, Complete and Cancel. Keep quick completion and completed-state undo on cards.
- Keep the active schedule visible while paused and after reload; show state-aware disabled controls, and return cancelled schedules to Not started without deleting them.
- Match production action availability and prevent a second schedule from replacing the current active schedule. Remove duplicate lifecycle actions from cards and details.
- Preserve the responsive navigation/Add clearance and use accessible labelled controls.
- Verify desktop/mobile start, pause, reload, resume, complete, cancel, quick completion and undo; confirm the mobile bar clears the raised Add action.

## 0.14.0 — 2026-10-29
- Align all statistics bars, donut segments, legends and category tracks to the application blue palette, including dark-theme variants.
- Compact sequence cards and group spacing without changing task connections, and combine workspace tabs with the header.
- Fit the initial desktop overview automatically; use a readable flow focus when a large map would make text too small.
- Reduce the mobile map viewport to available space above the navigation/Add action; retain filters, task navigation and zoom in compact controls.
- Bound desktop matrix quadrants with independently scrollable task lists.
- Test compact desktop/mobile branching, merging, isolated nodes, bounds and source preservation.

## 0.13.0 — 2026-10-29
- Move task-sequence connections below the full detail grid.
- Remove tag controls and displays from task cards, details, forms and filters; use category filters and category management instead. Preserve legacy stored values without exposing a second classification system.
- Replace large category cards with six compact tiles and a compact None choice; keep personal category addition available.
- Condense previous/next dependency editing into two panels while preserving selection, search, unlinking and repeat constraints.
- Apply shared display, heading, lead, body and small-text tokens across pages, cards, forms, statistics and navigation.
- Verify detail ordering, category filtering, tag-free task forms and mobile dependency selection.

## 0.12.0 — 2026-10-29
- Shorten regular notifications to 1.5 seconds; replace older feedback and use inline feedback within dialogs to avoid stacked overlays.
- Position the active timer above the measured mobile navigation/Add-button bounds and retain pause/complete controls.
- Add period-aware daily bar, status donut and category-time charts using stored schedule records; retain type totals, recurrence management and calibration controls.
- Keep planned time explicitly distinguished from measured time and undated task-completion totals.
- Move the Eisenhower matrix under Task map beside Sequence, removing the separate sidebar/task-list entry.
- Verify period boundaries/empty states, notification expiry and mobile timer/Add separation.

## 0.11.0 — 2026-10-28
- Raise task context, dependency and explanation typography to the deadline text scale.
- Remove tag editing from task forms while retaining existing stored tag data; place title, description, deadline, importance, difficulty and duration before category and dependency sections.
- Add an explicit None category above six tiles, with three columns on desktop and two on mobile; preserve None across saves and reloads.
- Separate modal headers and action footers from the scrolling body, preserve native form submission with explicit form associations, and add missing Cancel buttons to editing forms.
- Verify desktop/mobile task forms, None-category persistence and schedule-form footer behavior.

## 0.10.0 — 2026-10-28
- Add an all-task Eisenhower matrix with urgency settings, search, category filters, completed-task access and existing task details.
- Add task-list/matrix switching and a desktop shortcut, keeping six mobile actions.
- Balance five equal mobile destinations with a raised Add button at the horizontal center.
- Test classification boundaries, overdue/undated tasks, completed separation and immutability.

## 0.9.0 — 2026-10-28
- Keep only the sequence task map; remove graph, tree and free-placement controls from the delivered UI.
- Use top-to-bottom sequences on mobile, readable 100% card framing, larger deadlines/titles/meters, and previous/next task navigation.
- Preserve desktop left-to-right connections, filters, independent-task sorting, details and zoom/fit controls.
- Center the mobile add action geometrically while retaining every navigation destination; make Add create a task on the task map.
- Remove obsolete graph/ranking bundles from the generated page while retaining their sources in history.

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
