# Hex Cartographer — Monolith Refactor Plan

## Goal
Split the single ~8,500-line `src/main.ts` into a clean module tree.
- One small PR per module; behavior-preserving at each step.
- Each extraction also adds types + unit tests (Vitest; pure modules only — Obsidian API isn't importable in tests).
- Issues documented here; filed manually.

## Build constraints
- esbuild already bundles multi-file ES modules (entry `src/main.ts`, cjs, `obsidian` external) — no build change needed.
- tsconfig: strict=false, module ESNext, includes `src/**/*.ts`.
- Map file model: `{ hexes, rivers, roads, texts, borders, gridSize, zoom, offX, offY, settings }` stored as a ```json block in a `.hexcartographer.md` file.

## Target architecture
```
src/
  main.ts                 # thin entry
  constants.ts            # palettes, colors, sizes, UI styling, SVG_SYMBOL_CONFIG
  types.ts                # HexData, PathData, TextData, BorderData, MapData, HexMapSettings, ToolConfig, SvgSymbol
  i18n/
    index.ts              # t(), currentLanguage, getObsidianLanguage
    translations/{de,en,zh,ru,ja,fr,pt,ko,es,pl,it}.ts + index.ts
  utils/
    color.ts              # hsb/rgb/hex (+ test)
    hexMath.ts            # distance/lerp/neighbors/path/pixel<->hex (+ test)
    floodFill.ts          # pure flood algorithms (+ test)
  data/
    svgSymbols.ts         # SVG_SYMBOL_DATA
    serialization.ts      # parse/serialize/migrate map file (+ test)
  plugin/
    HexCartographerPlugin.ts
    settings.ts           # DEFAULT_SETTINGS + PluginSettings type
  view/
    HexCartographerView.ts  # orchestrator (thin, typed state)
    SvgSymbolLoader.ts  HistoryManager.ts  CameraController.ts
    PersistenceController.ts  RenderManager.ts  PaintTools.ts
    PathTools.ts  BorderTools.ts  InputController.ts  ToolbarBuilder.ts
  modals/
    FileSelectorModal.ts  TextInputModal.ts  ColorPickerModal.ts  ExportMapModal.ts
  settings/
    HexCartographerSettingTab.ts
```

## View decomposition strategy (hybrid)
- Stateless logic (flood-fill, hex math, geometry, overlap-map) -> pure functions, unit-tested.
- Stateful subsystems (render, input, toolbar, camera, history, persistence) -> collaborator classes holding a `view` ref (e.g. `new RenderManager(view)` reading `view.data`/`view.ctx`).
- Full strict typing of shared state is the LAST view issue.

## Full issue list (one PR each)

### Phase 0 — Foundations
- I0.1  src/ folders + Vitest + `npm test`; tracking epic issue; labels; manual smoke-test checklist; baseline sample `.hexcartographer.md` for regression diffing.

### Phase 1 — Pure leaf modules
- I1.1  Extract constants -> src/constants.ts (palettes, colors, sizes, UI, SVG_SYMBOL_CONFIG).
- I1.2  Extract color utils -> src/utils/color.ts (+ tests).
- I1.3  Extract hex math -> src/utils/hexMath.ts (+ tests).
- I1.4  Extract shared types -> src/types.ts.
- I1.5  Extract i18n (11 langs + t) -> src/i18n/.
- I1.6  Extract SVG_SYMBOL_DATA -> src/data/svgSymbols.ts.

### Phase 2 — Data & settings
- I2.1  Extract serialization/parse/migration -> src/data/serialization.ts (+ tests).
- I2.2  Extract plugin settings -> src/plugin/settings.ts (DEFAULT_SETTINGS + type).

### Phase 3 — Standalone UI classes
- I3.1  FileSelectorModal -> src/modals/.
- I3.2  TextInputModal -> src/modals/.
- I3.3  ColorPickerModal -> src/modals/.
- I3.4  ExportMapModal -> src/modals/.
- I3.5  HexCartographerSettingTab (+ buildGuide) -> src/settings/.

### Phase 4 — Plugin entry
- I4.1  Extract HexCartographerPlugin + event/file registration -> src/plugin/; main.ts becomes thin default export.

### Phase 5 — View decomposition (most self-contained first)
- I5.1  SvgSymbolLoader (loadSVGSymbols + icon updates).
- I5.2  HistoryManager (push/undo/redo).
- I5.3  CameraController (fit, resize, coords, zoom, bounds).
- I5.4  PersistenceController (reload/save/requestSave/setState) — depends on I2.1.
- I5.5  RenderManager (full render pipeline; split into 2 PRs if large: base+symbols / paths+text+numbering).
- I5.6  PaintTools + pure floodFill.ts (paint, eraser, flood fill/erase) (+ tests).
- I5.7  PathTools (river/road waypoint editing).
- I5.8  BorderTools (addBorderHex, floodEraseBorderSegment).
- I5.9  InputController (setupEventListeners, processInput, getTextAt).
- I5.10 ToolbarBuilder (toolbar/palette/tool-config UI incl. initToolConfigs).
- I5.11 Slim HexCartographerView orchestrator + typed shared state (remove [key:string]:any).

### Phase 6 — Hardening (optional)
- I6.1  Enable stricter TS incrementally (strictNullChecks, etc.).
- I6.2  Add GitHub Actions CI (build + test on PR) + expand coverage.

## Verification (every PR)
1. `npm run build` (`tsc -noEmit -skipLibCheck` + esbuild) succeeds.
2. `npm test` green for touched pure modules.
3. Manual smoke test on baseline map: paint hex, place symbol, draw river+road, add border+text, undo/redo, zoom/pan/fit, export image, reload, open settings — diff saved JSON vs baseline.

## Decisions
- Small PR per module; pure move + types + tests (tests for pure modules only).
- Vitest for testing; hybrid view decomposition; issues documented only.
- Order: pure leaves -> data/settings -> standalone UI -> plugin -> view internals -> hardening. Each phase independently shippable.

## Open recommendations
- Barrels only for i18n/ and modals/ (avoid view/ barrels — circular-import risk).
- Split RenderManager into RenderManager + PathRenderer (2 PRs).
- Leave inline-JS styling as-is now; separate styles.css cleanup issue later.