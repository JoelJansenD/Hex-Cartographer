## Plan: Hex Cartographer Refactor

Refactor the current TypeScript monolith into a modular Obsidian plugin without changing behavior. The recommended path is to extract low-risk pure utilities and shared types first, then move persistence and UI-adjacent logic behind clearer boundaries, and only then split the large view/controller code. Because the chosen priority is behavior preservation with minimal added test infrastructure, every phase should end with a build/lint pass and a short manual Obsidian smoke test before continuing.

**Steps**
1. Baseline the monolith before structural changes. Record the current behavior contract for file creation, file opening, canvas editing, export, localization, settings, mobile/touch interactions, and rename/delete synchronization. Capture a short manual smoke checklist and keep a few representative map files for regression checks.
2. Extract pure utilities first in parallel: move color conversion helpers out of src/main.ts into a utility module, move hex/grid math into a separate utility module, and move localization loading/translation helpers into an i18n module. Keep signatures stable and wire src/main.ts to import them with no behavior change.
3. Introduce shared types and data-shape aliases next. Define explicit TypeScript types for plugin settings, map document data, hex coordinates, text annotations, paths, borders, tool state, and modal payloads. Use these types first at module boundaries rather than trying to type every internal local variable immediately.
4. Separate static data/config from runtime behavior. Keep src/constants.ts as the home for numeric and visual constants, and move any remaining large static lookup/config payloads such as symbol metadata or grouped tool definitions into dedicated data/config modules so the future view file only orchestrates behavior.
5. Isolate document persistence and migration behind one boundary. Extract the code that creates new maps, loads the fenced JSON payload, sanitizes/migrates old data, saves edits, and manages save timing/history-trigger conditions into a dedicated map document service or model layer. This step should preserve the current file format exactly.
6. Split the plugin entry from the editor view. Reduce the plugin class to lifecycle registration, command/ribbon/menu wiring, view registration, and explorer/file-event coordination. Move the large HexCartographerView class into its own module as the single integration point for editor behavior.
7. Break the view into internal subsystems in dependency order. Start with rendering helpers and geometry-dependent drawing code, then extract input/tool logic, then modal construction helpers, then toolbar construction/state sync. Keep the view as an orchestrator that owns state and delegates work instead of scattering cross-module mutations.
8. Extract rendering by layer rather than by feature name. Create rendering modules for base grid/hexes, symbols, paths/borders, and text/numbering/export. Preserve current draw order explicitly so visual output remains unchanged.
9. Extract interaction logic with clear state ownership. Separate mouse/keyboard handling from touch/gesture handling, and isolate tool actions such as paint, erase, fill, path placement, and text placement behind explicit methods/services. The key goal is to stop DOM events from directly mutating unrelated editor state in many places.
10. Move self-contained UI classes into their own folder after the core editor split is stable. File selector, text input, color picker, export modal, and settings tab are good low-risk extractions once their dependencies are typed and passed in explicitly.
11. Tighten TypeScript only after the structure is stable. Remove remaining broad any usage incrementally, starting with extracted modules and public interfaces. Postpone full strictness cleanup in the most coupled canvas/input code until after the architectural split is complete.
12. Finish with cleanup and architectural guardrails. Add a short module map to the README or a developer note, define allowed dependency directions, and keep src/main.ts intentionally small so future changes do not collapse back into a monolith.

**Relevant files**
- `c:\code\hex-cartographer\.obsidian\plugins\hex-cartographer\src\main.ts` — current monolith containing plugin lifecycle, editor view, rendering, input handling, persistence, modals, and settings UI; primary source to split in phases.
- `c:\code\hex-cartographer\.obsidian\plugins\hex-cartographer\src\constants.ts` — existing stable constants module to preserve and potentially expand with adjacent static configuration.
- `c:\code\hex-cartographer\.obsidian\plugins\hex-cartographer\tsconfig.json` — strictness baseline; defer broad tightening until later phases.
- `c:\code\hex-cartographer\.obsidian\plugins\hex-cartographer\esbuild.config.mjs` — build entry and bundling contract that should remain stable while modules are introduced.
- `c:\code\hex-cartographer\.obsidian\plugins\hex-cartographer\package.json` — build/lint scripts used as the primary automated verification checkpoints.
- `c:\code\hex-cartographer\.obsidian\plugins\hex-cartographer\manifest.json` — plugin metadata; useful for smoke-testing load/install behavior after each phase.

**Verification**
1. After every extraction phase, run the existing build and lint scripts and fix structural regressions before moving on.
2. After every phase that touches persistence or view wiring, manually verify: create map, reopen map, edit at least one hex, undo/redo, export image, and reopen Obsidian if feasible.
3. After file-event related refactors, manually verify rename/delete/open behavior for .hexcartographer.md files and confirm explorer title cleanup still works.
4. After rendering refactors, compare a representative map visually before and after edits, including symbols, rivers, roads, borders, text, numbering, zoom, and pan.
5. After input refactors, verify one desktop path per tool and one touch/mobile path for the features you actively support.
6. Before tightening types, confirm the codebase is already modular enough that strictness fixes are local and not architecture-disrupting.

**Decisions**
- In scope: architectural modularization, stronger types at module boundaries, preserving existing plugin behavior and file format.
- Out of scope for this pass: UI redesign, feature changes, storage format changes, broad performance rewrites, and large new automated test infrastructure.
- Recommended dependency direction: plugin entry -> view/orchestrator -> services/renderers/input/ui -> utils/types/constants/data.
- Recommended extraction order favors low-risk seams first so the plugin stays shippable throughout the refactor.

**Further Considerations**
1. The biggest risk area is not the pure helpers; it is the interaction between view state, canvas rendering, and Obsidian file events. Treat that as a late-stage extraction target, not an early one.
2. If you later want stronger safety without broad test investment, the highest-value small addition is a few tests around pure geometry/color helpers and map-data migration/parsing.
3. A practical success metric is reducing src/main.ts to a thin plugin entry plus a thin view orchestrator, with all other behavior moved behind named modules.