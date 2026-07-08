import { TFile, Notice, ItemView, WorkspaceLeaf } from 'obsidian';
import {
    DEFAULT_PALETTE, DEFAULT_PALETTE2,
    DEFAULT_MASTER_COLOR, DEFAULT_TEXT_COLOR,
    DEFAULT_GRID_SIZE, DEFAULT_OFF_X, DEFAULT_OFF_Y,
    DEFAULT_RIVER_WIDTH, DEFAULT_ROAD_WIDTH,
    DEFAULT_BORDER_HIGHLIGHT_WIDTH, DEFAULT_BORDER_DASHES, DEFAULT_PATH_DASHES,
    PATH_END_INSET,
    DEFAULT_TEXT_SIZE, DEFAULT_SHADOW_DISTANCE, DEFAULT_SHADOW_OPACITY,
    SVG_SYMBOL_CONFIG
} from '../constants';
import { hexToPixel, pixelToHex, hexDistance, hexLerp, getHexNeighbors, calculateHexPath } from '../utils/hexMath';
import { t } from '../i18n';
import type HexCartographerPlugin from '../plugin/HexCartographerPlugin';
import { SvgSymbolLoader } from './SvgSymbolLoader';
import { HistoryManager } from './HistoryManager';
import { CameraController } from './CameraController';
import { PersistenceController } from './PersistenceController';
import { RenderManager } from './RenderManager';
import { PaintTools } from './PaintTools';
import { PathTools } from './PathTools';
import { BorderTools } from './BorderTools';
import { InputController } from './InputController';
import { ToolbarBuilder } from './ToolbarBuilder';
import { ExportMapModal } from '../modals/ExportMapModal';
import type { MapData, BorderSettings, HexData, Waypoint, Label, SvgSymbol, ToolConfig, PathEditSettings, Path } from '../types';

// ─── Internal state types ─────────────────────────────────────────────────────

/** Record written by handleEraser so that handleEraserFlood knows what to flood-erase. */
export type LastErasedHex =
    | { q: number; r: number; type: 'symbol'; symbol: string; timestamp: number }
    | { q: number; r: number; type: 'color'; color: string; toolGroup: string | null; timestamp: number }
    | { q: number; r: number; type: 'pattern'; pattern: { color?: string; symbol?: string; symbolColor?: string }; timestamp: number }
    | { q: number; r: number; type: 'border'; regionId: number; timestamp: number }
    | { q: number; r: number; type: 'river' | 'road'; pathIds: number[]; toolGroup: string; timestamp: number };

/** Transient state for multi-touch pinch/zoom gestures. */
export interface TouchState {
    touches: Touch[];
    initialDistance: number;
    initialZoom: number;
    initialPanX: number;
    initialPanY: number;
    isTwoFingerGesture: boolean;
    touchStartTimeout: ReturnType<typeof setTimeout> | null;
    pendingTouchStart: { touch: Touch; mouseEvent: MouseEvent; timestamp: number } | null;
    hasMovedSinceStart: boolean;
    lastTapTime: number;
    lastTapHex: Waypoint | null;
    lastTouchX: number | undefined;
    lastTouchY: number | undefined;
    centerX?: number;
    centerY?: number;
    pivotX?: number;
    pivotY?: number;
}

/** State recorded when the user clicks a path waypoint (for double-click detection). */
export interface LastWaypointClick {
    pathId: number;
    idx: number;
    time: number;
    previousInsertAfter: number | null;
}

/** A pending path-pick disambiguation when a river and road share the same hex. */
export interface PathPickPending {
    river: Path;
    road: Path;
}

// ─── View ─────────────────────────────────────────────────────────────────────

/**
 * The Hex Cartographer canvas view.  Acts as a thin orchestrator: it owns
 * the shared mutable state and delegates all non-trivial logic to the
 * collaborator classes below.
 */
export class HexCartographerView extends ItemView {

    // ─── Core ─────────────────────────────────────────────────────────────────
    plugin: HexCartographerPlugin;
    file: TFile | null = null;
    data: MapData;

    // ─── Subsystems ───────────────────────────────────────────────────────────
    historyManager: HistoryManager;
    camera: CameraController;
    persistence: PersistenceController;
    renderManager: RenderManager;
    paintTools: PaintTools;
    pathTools: PathTools;
    borderTools: BorderTools;
    inputController: InputController;
    toolbarBuilder: ToolbarBuilder;
    svgLoader: SvgSymbolLoader;
    svgLoadPromise: Promise<void>;

    // ─── Canvas elements (assigned in onOpen) ─────────────────────────────────
    canvas!: HTMLCanvasElement;
    ctx!: CanvasRenderingContext2D;
    textCanvas!: HTMLCanvasElement;
    textCtx!: CanvasRenderingContext2D;
    svgLayer!: SVGSVGElement;
    resizeObserver!: ResizeObserver;

    // ─── Persistence state ────────────────────────────────────────────────────
    saveTimeout: ReturnType<typeof setTimeout> | null = null;
    isReloading = false;
    isSaving = false;

    // ─── Mouse / touch input state ────────────────────────────────────────────
    isMouseDown = false;
    isDraggingMap = false;
    isRightMouseErasing = false;
    rightEraseLastHex: string | null = null;
    _rightClickLast: { time: number; key: string } | null = null;
    mouseDownPos: { x: number; y: number } | null = null;
    startHex: Waypoint | null = null;
    lastHex: Waypoint | null = null;
    lastErasedHex: LastErasedHex | null = null;
    draggedText: Label | null = null;
    isTouchDevice: boolean;
    touchState!: TouchState; // initialized in InputController.setupEventListeners

    // ─── Waypoint drag state ──────────────────────────────────────────────────
    riverDragIndex: { idx: number; group: number[]; origQ?: number; origR?: number } | null = null;
    roadDragIndex: { idx: number; group: number[]; origQ?: number; origR?: number } | null = null;
    lastWaypointClick: LastWaypointClick | null = null;

    // ─── Tool mode ────────────────────────────────────────────────────────────
    editMode = false;
    drawMode = 'pen';
    currentToolGroup: string | null = null;
    hexOrientation = false;
    lastToolGroup: string | null = null;
    _savedToolGroup: string | null = null;
    _savedDrawMode = 'pen';
    _initialResizeDone = false; // set by CameraController.resize on first resize

    // ─── Path / border settings ───────────────────────────────────────────────
    borderSettings: BorderSettings;
    borderHighlightWidth: number;
    borderPickMode = false;
    riverSettings: PathEditSettings;
    roadSettings: PathEditSettings;
    pathDashes: number;
    pathPickMode = false;
    pathPickPending: PathPickPending | null = null;
    pathEndInset: number;

    // ─── Colors ───────────────────────────────────────────────────────────────
    masterColor: string;
    colorPalette: string[];
    colorPalette2: string[];
    activeColorSlot = 0;
    hexColorColor: string;
    colorPickMode = false;

    // ─── Text defaults ────────────────────────────────────────────────────────
    lastUsedTextSize: number;
    lastUsedTextColor: string;
    lastUsedTextOutline = true;
    lastUsedTextBold = false;
    lastUsedTextShadow = false;
    lastUsedTextShadowDistance: number;
    lastUsedTextShadowOpatown: number;

    // ─── Tool configuration (symbol groups) ───────────────────────────────────
    toolConfigs: Record<string, ToolConfig> = {};

    // ─── Pattern tool ─────────────────────────────────────────────────────────
    patternData: HexData | null = null;
    patternSourceHex: Waypoint | null = null;
    patternPickMode = false;

    // ─── SVG symbol state ─────────────────────────────────────────────────────
    svgSymbols: Record<string, SvgSymbol> = {};
    svgSymbolsLoaded = false;
    svgSymbolConfig: typeof SVG_SYMBOL_CONFIG;

    // ─── DOM refs cached by ToolbarBuilder.createToolbar ──────────────────────
    editModeBtn: HTMLButtonElement | null = null;
    editContent: HTMLElement | null = null;
    masterColorBtn: HTMLButtonElement | null = null;
    masterColorInput: HTMLInputElement | null = null;
    colorEyedropperBtn: HTMLButtonElement | null = null;
    hexOrientationBtn: HTMLButtonElement | null = null;
    patternPickerBtn: HTMLButtonElement | null = null;
    borderPickerBtn: HTMLButtonElement | null = null;
    borderVisBtn: HTMLButtonElement | null = null;
    borderDashesInput: HTMLInputElement | null = null;
    borderBtn: HTMLButtonElement | null = null;
    riverBtn: HTMLButtonElement | null = null;
    roadBtn: HTMLButtonElement | null = null;
    pathPickerBtn: HTMLButtonElement | null = null;
    riverWidthInput: HTMLInputElement | null = null;
    roadWidthInput: HTMLInputElement | null = null;
    pathDashesInput: HTMLInputElement | null = null;
    paletteOuter: HTMLElement | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: HexCartographerPlugin) {
        super(leaf);
        this.navigation = true;
        this.plugin = plugin;
        this.data = {
            hexes: {},
            rivers: [],
            roads: [],
            texts: [],
            borders: [],
            gridSize: DEFAULT_GRID_SIZE,
            zoom: 1,
            offX: DEFAULT_OFF_X,
            offY: DEFAULT_OFF_Y,
        };

        this.historyManager    = new HistoryManager(this);
        this.camera            = new CameraController(this);
        this.persistence       = new PersistenceController(this);
        this.renderManager     = new RenderManager(this);
        this.paintTools        = new PaintTools(this);
        this.pathTools         = new PathTools(this);
        this.borderTools       = new BorderTools(this);
        this.inputController   = new InputController(this);
        this.toolbarBuilder    = new ToolbarBuilder(this);

        this.borderSettings      = { dashes: DEFAULT_BORDER_DASHES, activeRegionId: null, pickedHex: null, visible: true };
        this.borderHighlightWidth = DEFAULT_BORDER_HIGHLIGHT_WIDTH;
        this.riverSettings       = { width: DEFAULT_RIVER_WIDTH,  activeRiverId: null, activeRoadId: null, editMode: false, insertAfter: null };
        this.roadSettings        = { width: DEFAULT_ROAD_WIDTH,   activeRiverId: null, activeRoadId: null, editMode: false, insertAfter: null };
        this.pathDashes          = DEFAULT_PATH_DASHES;
        this.pathEndInset        = PATH_END_INSET;

        this.masterColor  = DEFAULT_MASTER_COLOR;
        this.hexColorColor = DEFAULT_PALETTE[0];
        this.colorPalette  = [...DEFAULT_PALETTE];
        this.colorPalette2 = [...DEFAULT_PALETTE2];
        this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        this.lastUsedTextSize           = DEFAULT_TEXT_SIZE;
        this.lastUsedTextColor          = DEFAULT_TEXT_COLOR;
        this.lastUsedTextShadowDistance = DEFAULT_SHADOW_DISTANCE;
        this.lastUsedTextShadowOpatown  = DEFAULT_SHADOW_OPACITY;

        this.svgSymbolConfig = SVG_SYMBOL_CONFIG;

        // initToolConfigs must run after toolbarBuilder is assigned
        this.toolbarBuilder.initToolConfigs();

        this.svgLoader      = new SvgSymbolLoader(this);
        this.svgLoadPromise = this.svgLoader.load();
    }

    // ─── ItemView lifecycle ───────────────────────────────────────────────────

    getViewType()    { return 'hex-cartographer'; }
    getDisplayText() {
        if (!this.file) return 'Hex Cartographer';
        return this.file.basename.replace('.hexcartographer', '');
    }
    getState()  { return { file: this.file ? this.file.path : null }; }
    getIcon()   { return 'map'; }

    onPaneMenu(menu: any, source: string) {
        if (source === 'more-options') {
            menu.addItem((item: any) => {
                item.setTitle(t('menu.exportMap'))
                    .setIcon('download')
                    .onClick(() => {
                        const mapSize = this.getMapWorldSize();
                        if (!mapSize) { new Notice(t('notice.noContentToPrint')); return; }
                        new ExportMapModal(this.app, mapSize, this.plugin.settings.exportWidth, async (format: string, width: number, quality: number, cropless: boolean) => {
                            const tmpCanvas = this.renderFullMap({ targetWidth: width, cropless: cropless });
                            if (!tmpCanvas) { new Notice(t('notice.noContentToPrint')); return; }
                            const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
                            const ext      = format === 'jpeg' ? '.jpg' : '.png';
                            const baseName = this.file ? this.file.basename.replace('.hexcartographer', '') : 'hex-cartographer-map';
                            const blob = await new Promise<Blob>(resolve => tmpCanvas.toBlob(resolve, mimeType, format === 'jpeg' ? quality / 100 : undefined));
                            if (this.isTouchDevice) {
                                const parentFolder = this.file ? this.file.parent.path : '';
                                const exportFolder = parentFolder ? `${parentFolder}/Hex Cartographer Export` : 'Hex Cartographer Export';
                                if (!this.app.vault.getAbstractFileByPath(exportFolder)) {
                                    await this.app.vault.createFolder(exportFolder);
                                }
                                const fileName = baseName + ext;
                                const filePath = `${exportFolder}/${fileName}`;
                                const buffer = await blob.arrayBuffer();
                                const existing = this.app.vault.getAbstractFileByPath(filePath);
                                if (existing) { await this.app.vault.modifyBinary(existing as TFile, buffer); }
                                else { await this.app.vault.createBinary(filePath, buffer); }
                                new Notice(`${t('notice.exportSaved')}: ${filePath}`);
                            } else {
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(blob);
                                link.download = baseName + ext;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                setTimeout(() => URL.revokeObjectURL(link.href), 5000);
                            }
                        }).open();
                    });
            });

            if (!this.isTouchDevice) {
                menu.addItem((item: any) => {
                    item.setTitle(t('menu.printMap'))
                        .setIcon('printer')
                        .onClick(() => {
                            const tmpCanvas = this.renderFullMap();
                            if (!tmpCanvas) { new Notice(t('notice.noContentToPrint')); return; }
                            const dataUrl = tmpCanvas.toDataURL('image/png');
                            const title = this.file ? this.file.basename.replace('.hexcartographer', '') : 'Hex Cartographer Map';
                            const iframe = document.createElement('iframe') as HTMLIFrameElement;
                            iframe.style.position = 'fixed';
                            iframe.style.left = '-9999px';
                            iframe.style.width = '0';
                            iframe.style.height = '0';
                            document.body.appendChild(iframe);
                            const doc = iframe.contentDocument || (iframe.contentWindow as any).document;
                            doc.open();
                            doc.write(`<html><head><title>${title}</title><style>@media print { @page { margin: 10mm; } body { margin: 0; } img { max-width: 100%; max-height: 100%; } } body { margin: 0; }</style></head><body><img src="${dataUrl}" /></body></html>`);
                            doc.close();
                            (iframe.contentWindow as any).onafterprint = () => { document.body.removeChild(iframe); };
                            setTimeout(() => { (iframe.contentWindow as any).print(); }, 200);
                        });
                });
            }
        }
        super.onPaneMenu(menu, source);
    }

    async setState(state: any, result: any) {
        await this.persistence.setState(state);
        await super.setState(state, result);
    }

    async onOpen() {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.height = '100%';

        const style = document.createElement('style');
        style.textContent = `
            input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
            input[type="color"]::-webkit-color-swatch { border: none; border-radius: 3px; }
            .hex-toolbar-sep {
                width: 1px !important;
                min-width: 1px !important;
                align-self: stretch !important;
                background-color: #b8b8b8 !important;
                flex-shrink: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                display: block !important;
            }
        `;
        container.appendChild(style);

        const toolbar = container.createDiv({ cls: 'hex-toolbar' });
        toolbar.style.padding = '8px';
        toolbar.style.display = 'flex';
        toolbar.style.flexWrap = 'wrap';
        toolbar.style.gap = '8px';
        toolbar.style.background = 'var(--background-secondary)';
        toolbar.style.borderBottom = '1px solid var(--divider-color)';
        toolbar.style.alignItems = 'flex-start';
        toolbar.style.flexShrink = '0';
        toolbar.style.overflowY = 'auto';
        toolbar.style.maxHeight = '120px';

        toolbar.addEventListener('wheel', (e) => { e.stopPropagation(); }, { passive: true });

        this.toolbarBuilder.createToolbar(toolbar);
        this.toolbarBuilder.updateToolbarState(toolbar);

        const canvasContainer = container.createDiv();
        canvasContainer.style.position = 'relative';
        canvasContainer.style.flexGrow = '1';
        canvasContainer.style.overflow = 'hidden';

        this.canvas = canvasContainer.createEl('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.cursor = 'crosshair';
        this.canvas.tabIndex = 0;
        this.canvas.style.outline = 'none';
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

        this.svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
        this.svgLayer.style.position = 'absolute';
        this.svgLayer.style.top = '0';
        this.svgLayer.style.left = '0';
        this.svgLayer.style.width = '100%';
        this.svgLayer.style.height = '100%';
        this.svgLayer.style.pointerEvents = 'none';
        canvasContainer.appendChild(this.svgLayer);

        this.textCanvas = canvasContainer.createEl('canvas', { cls: 'hex-text-canvas' });
        this.textCtx = this.textCanvas.getContext('2d') as CanvasRenderingContext2D;

        this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
        this.resizeObserver.observe(canvasContainer);

        this.setupEventListeners();
        this.render();
    }

    async onClose() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        await this.persistence.save();
    }

    // ─── Toolbar ──────────────────────────────────────────────────────────────
    rebuildToolbar()                        { this.toolbarBuilder.rebuildToolbar(); }
    updateToolbarState(toolbar: Element)    { this.toolbarBuilder.updateToolbarState(toolbar); }
    recalcToolbarWidths()                   { this.toolbarBuilder.recalcToolbarWidths(); }

    // ─── Camera ───────────────────────────────────────────────────────────────
    fitMapToView()                                  { this.camera.fit(); }
    resizeCanvas()                                  { this.camera.resize(); }
    getWorldCoords(e: { clientX: number; clientY: number }) { return this.camera.getWorldCoords(e); }
    getHexBounds()                                  { return this.camera.getHexBounds(); }

    // ─── Persistence ──────────────────────────────────────────────────────────
    async reloadFile()  { return this.persistence.reload(); }
    async saveData()    { return this.persistence.save(); }
    requestSave()       { this.persistence.requestSave(); }

    // ─── Render ───────────────────────────────────────────────────────────────
    render()                                                              { this.renderManager.render(); }
    getMapWorldSize()                                                     { return this.renderManager.getMapWorldSize(); }
    renderFullMap(opts: { targetWidth?: number; scale?: number; cropless?: boolean } = {}) {
        return this.renderManager.renderFullMap({ targetWidth: opts.targetWidth, scale: opts.scale, cropless: opts.cropless });
    }

    // ─── Input ────────────────────────────────────────────────────────────────
    setupEventListeners()                { this.inputController.setupEventListeners(); }
    processInput(e: MouseEvent, isInitial: boolean) { this.inputController.processInput(e, isInitial); }
    getTextAt(worldX: number, worldY: number)       { return this.inputController.getTextAt(worldX, worldY); }

    // ─── History ──────────────────────────────────────────────────────────────
    // (exposed directly via view.historyManager; no extra delegates needed)

    // ─── Paint tools ──────────────────────────────────────────────────────────
    paintHex(hex: Waypoint)                  { this.paintTools.paintHex(hex); }
    handleEraser(hex: Waypoint, x: number, y: number) { this.paintTools.handleEraser(hex, x, y); }
    handleEraserFlood(hex: Waypoint)         { this.paintTools.handleEraserFlood(hex); }
    handleFillTool(startHex: Waypoint)       { this.paintTools.handleFillTool(startHex); }

    // ─── Path tools ───────────────────────────────────────────────────────────
    findRiverAtHex(hex: Waypoint)                                { return this.pathTools.findRiverAtHex(hex); }
    findRoadAtHex(hex: Waypoint)                                 { return this.pathTools.findRoadAtHex(hex); }
    addRiverWaypoint(hex: Waypoint)                              { this.pathTools.addRiverWaypoint(hex); }
    addRoadWaypoint(hex: Waypoint)                               { this.pathTools.addRoadWaypoint(hex); }
    erasePathElement(paths: Path[], hex: Waypoint)               { this.pathTools.erasePathElement(paths, hex); }
    handleWaypointClick(path: Path, settings: PathEditSettings, clickedIdx: number) {
        this.pathTools.handleWaypointClick(path, settings as any, clickedIdx);
    }
    completePathPick(path: Path, type: 'river' | 'road')        { this.pathTools.completePathPick(path, type); }
    pickPathAtHex(hex: Waypoint)                                 { this.pathTools.pickPathAtHex(hex); }
    updateActivePathColor()                                      { this.pathTools.updateActivePathColor(); }
    exitPathEditMode()                                           { this.pathTools.exitPathEditMode(); }

    // ─── Border tools ─────────────────────────────────────────────────────────
    addBorderHex(hex: Waypoint)                                  { this.borderTools.addBorderHex(hex); }
    floodEraseBorderSegment(startHex: Waypoint, regionId: number) { this.borderTools.floodEraseBorderSegment(startHex, regionId); }

    // ─── Hex math helpers (bound to current grid state) ───────────────────────
    hexToPixel(h: Waypoint)                           { return hexToPixel(h, this.data.gridSize, this.hexOrientation); }
    pixelToHex(x: number, y: number)                 { return pixelToHex(x, y, this.data.gridSize, this.hexOrientation); }
    hexDistance(a: Waypoint, b: Waypoint)             { return hexDistance(a, b); }
    hexLerp(a: Waypoint, b: Waypoint, t: number)      { return hexLerp(a, b, t); }
    getHexNeighbors(hex: Waypoint)                    { return getHexNeighbors(hex); }
    calculateHexPath(start: Waypoint, end: Waypoint, width: number) { return calculateHexPath(start, end, width); }
}
