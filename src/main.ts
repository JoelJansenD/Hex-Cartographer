import { TFile, Notice, ItemView } from 'obsidian';

declare module 'obsidian' {
    interface WorkspaceLeaf {
        updateHeader?: () => void;
        tabHeaderEl?: HTMLElement;
    }
    interface App {
        setting?: any;
    }
    interface View {
        file?: any;
    }
}

declare global {
    interface DomElementInfo {
        style?: any;
    }
}

import {
    DEFAULT_PALETTE, DEFAULT_PALETTE2,
    DEFAULT_MASTER_COLOR, DEFAULT_TEXT_COLOR,
    DEFAULT_GRID_SIZE, DEFAULT_OFF_X, DEFAULT_OFF_Y,
    DEFAULT_RIVER_WIDTH, DEFAULT_ROAD_WIDTH,
    DEFAULT_BORDER_HIGHLIGHT_WIDTH, DEFAULT_BORDER_DASHES, DEFAULT_PATH_DASHES,
    PATH_END_INSET,
    DEFAULT_TEXT_SIZE, DEFAULT_SHADOW_DISTANCE, DEFAULT_SHADOW_OPACITY,
    SVG_SYMBOL_CONFIG
} from './constants';
import { hexToPixel, pixelToHex, hexDistance, hexLerp, getHexNeighbors, calculateHexPath } from './utils/hexMath';
import { t } from './i18n';
import { extractJsonFromMarkdown, parseMapData, serializeMapToFileContent } from './data/serialization';
import HexCartographerPlugin from './plugin/HexCartographerPlugin';
import { SvgSymbolLoader } from './view/SvgSymbolLoader';
import { HistoryManager } from './view/HistoryManager';
import { CameraController } from './view/CameraController';
import { PersistenceController } from './view/PersistenceController';
import { RenderManager } from './view/RenderManager';
import { PaintTools } from './view/PaintTools';
import { PathTools } from './view/PathTools';
import { BorderTools } from './view/BorderTools';
import { InputController } from './view/InputController';
import { ToolbarBuilder } from './view/ToolbarBuilder';
import { TextInputModal } from './modals/TextInputModal';
import { ColorPickerModal } from './modals/ColorPickerModal';
import { ExportMapModal } from './modals/ExportMapModal';

// === View-Klasse f�r den Hex Cartographer ===
export class HexCartographerView extends ItemView {
    [key: string]: any;
    constructor(leaf, plugin) {
        super(leaf);
        this.navigation = true;
        this.plugin = plugin;
        this.file = null;
        this.data = { hexes: {}, rivers: [], roads: [], texts: [], borders: [], gridSize: DEFAULT_GRID_SIZE, zoom: 1, offX: DEFAULT_OFF_X, offY: DEFAULT_OFF_Y };

        this.historyManager = new HistoryManager(this);
        this.camera = new CameraController(this);
        this.persistence = new PersistenceController(this);
        this.renderManager = new RenderManager(this);
        this.paintTools = new PaintTools(this);
        this.pathTools = new PathTools(this);
        this.borderTools = new BorderTools(this);
        this.inputController = new InputController(this);

        this.saveTimeout = null;
        this.isMouseDown = false;
        this.isDraggingMap = false;
        this.lastHex = null;
        this.lastErasedHex = null;
        this.isReloading = false;
        this.isSaving = false;
        this.draggedText = null;

        this.startHex = null;
        this.borderSettings = { dashes: DEFAULT_BORDER_DASHES, activeRegionId: null, pickedHex: null, visible: true };
        this.borderHighlightWidth = DEFAULT_BORDER_HIGHLIGHT_WIDTH;
        this.borderPickMode = false;
        this.riverSettings = { width: DEFAULT_RIVER_WIDTH, activeRiverId: null, editMode: false, insertAfter: null };
        this.roadSettings = { width: DEFAULT_ROAD_WIDTH, activeRoadId: null, editMode: false, insertAfter: null };
        this.pathDashes = DEFAULT_PATH_DASHES;
        this.pathPickMode = false;
        this.pathPickPending = null;
        this.lastToolGroup = null;
        // Wie weit Pfad-Endpunkte ins Hex reichen: 0 = Hex-Rand, 1 = Hex-Zentrum
        this.pathEndInset = PATH_END_INSET;
        this.riverDragIndex = null;
        this.roadDragIndex = null;
        this.lastWaypointClick = null;
        this.masterColor = DEFAULT_MASTER_COLOR;
        this.hexColorColor = DEFAULT_PALETTE[0];

        this.colorPalette = [...DEFAULT_PALETTE];
        this.colorPalette2 = [...DEFAULT_PALETTE2];
        this.activeColorSlot = 0; // Standardfarbe: erste Palettenfarbe
        this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        this.colorPickMode = false;

        this.toolbarBuilder.initToolConfigs();

        this.editMode = false; // Edit-Modus: true = Werkzeuge sichtbar, false = nur Navigation
        this.hexOrientation = false; // false = Spitze oben (Standard), true = Flache Seite oben (90° gedreht)
        this.drawMode = 'pen'; // pen, fill, eraser
        this.currentToolGroup = null; // grass, tree, mountain, building, oder null für Farbpalette

        this.patternData = null;
        this.patternPickMode = false;
        this.patternSourceHex = null; // Speichert q/r der Musterwabe

        this.svgSymbols = {};
        this.svgSymbolsLoaded = false;
        this.svgLoader = new SvgSymbolLoader(this);
        this.svgLoadPromise = this.svgLoader.load();

        this.svgSymbolConfig = SVG_SYMBOL_CONFIG;

        this.lastUsedTextSize = DEFAULT_TEXT_SIZE;
        this.lastUsedTextColor = DEFAULT_TEXT_COLOR;
        this.lastUsedTextOutline = true;
        this.lastUsedTextBold = false;
        this.lastUsedTextShadow = false;
        this.lastUsedTextShadowDistance = DEFAULT_SHADOW_DISTANCE;
        this.lastUsedTextShadowOpatown = DEFAULT_SHADOW_OPACITY;
    }

    rebuildToolbar() { this.toolbarBuilder.rebuildToolbar(); }

    getViewType() { return 'hex-cartographer'; }
    getDisplayText() {
        if (!this.file) return 'Hex Cartographer';
        return this.file.basename.replace('.hexcartographer', '');
    }
    getState() { return { file: this.file ? this.file.path : null }; }

    getIcon() { return 'map'; }

    onPaneMenu(menu, source) {
        if (source === 'more-options') {
            menu.addItem((item) => {
                item.setTitle(t('menu.exportMap'))
                    .setIcon('download')
                    .onClick(() => {
                        const mapSize = this.getMapWorldSize();
                        if (!mapSize) { new Notice(t('notice.noContentToPrint')); return; }
                        new ExportMapModal(this.app, mapSize, this.plugin.settings.exportWidth, async (format, width, quality, cropless) => {
                            const tmpCanvas = this.renderFullMap({ targetWidth: width, cropless: cropless });
                            if (!tmpCanvas) { new Notice(t('notice.noContentToPrint')); return; }
                            const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
                            const ext = format === 'jpeg' ? '.jpg' : '.png';
                            const baseName = this.file ? this.file.basename.replace('.hexcartographer', '') : 'hex-cartographer-map';
                            const blob = await new Promise<Blob>(resolve => tmpCanvas.toBlob(resolve, mimeType, format === 'jpeg' ? quality / 100 : undefined));
                            if (this.isTouchDevice) {
                                // Mobil: In Export-Unterordner neben der .hexcartographer-Datei speichern
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
                menu.addItem((item) => {
                    item.setTitle(t('menu.printMap'))
                        .setIcon('printer')
                        .onClick(() => {
                            const tmpCanvas = this.renderFullMap();
                            if (!tmpCanvas) { new Notice(t('notice.noContentToPrint')); return; }
                            const dataUrl = tmpCanvas.toDataURL('image/png');
                            const title = this.file ? this.file.basename.replace('.hexcartographer', '') : 'Hex Cartographer Map';
                            const iframe = document.createElement('iframe');
                            iframe.style.position = 'fixed';
                            iframe.style.left = '-9999px';
                            iframe.style.width = '0';
                            iframe.style.height = '0';
                            document.body.appendChild(iframe);
                            const doc = iframe.contentDocument || iframe.contentWindow.document;
                            doc.open();
                            doc.write(`<html><head><title>${title}</title><style>@media print { @page { margin: 10mm; } body { margin: 0; } img { max-width: 100%; max-height: 100%; } } body { margin: 0; }</style></head><body><img src="${dataUrl}" /></body></html>`);
                            doc.close();
                            iframe.contentWindow.onafterprint = () => { document.body.removeChild(iframe); };
                            setTimeout(() => { iframe.contentWindow.print(); }, 200);
                        });
                });
            }
        }
        super.onPaneMenu(menu, source);
    }

    async setState(state, result) {
        await this.persistence.setState(state);
        await super.setState(state, result);
    }

    async reloadFile() { return this.persistence.reload(); }

    fitMapToView() { this.camera.fit(); }

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

        toolbar.addEventListener('wheel', (e) => {
            e.stopPropagation();
        }, { passive: true });

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
        this.ctx = this.canvas.getContext('2d');

        this.svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svgLayer.style.position = 'absolute';
        this.svgLayer.style.top = '0';
        this.svgLayer.style.left = '0';
        this.svgLayer.style.width = '100%';
        this.svgLayer.style.height = '100%';
        this.svgLayer.style.pointerEvents = 'none'; // Lässt Maus-Events durch
        canvasContainer.appendChild(this.svgLayer);

        this.textCanvas = canvasContainer.createEl('canvas', { cls: 'hex-text-canvas' });
        this.textCtx = this.textCanvas.getContext('2d');

        this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
        this.resizeObserver.observe(canvasContainer);

        this.setupEventListeners();
        this.render();
    }

    handleWaypointClick(path, settings, clickedIdx) { this.pathTools.handleWaypointClick(path, settings, clickedIdx); }

    completePathPick(path, type) { this.pathTools.completePathPick(path, type); }

    pickPathAtHex(hex) { this.pathTools.pickPathAtHex(hex); }

    updateActivePathColor() { this.pathTools.updateActivePathColor(); }

    exitPathEditMode() { this.pathTools.exitPathEditMode(); }


    updateToolbarState(toolbar) { this.toolbarBuilder.updateToolbarState(toolbar); }

    recalcToolbarWidths() { this.toolbarBuilder.recalcToolbarWidths(); }

    getTextAt(worldX, worldY) { return this.inputController.getTextAt(worldX, worldY); }

    setupEventListeners() { this.inputController.setupEventListeners(); }

    calculateHexPath(start, end, width) { return calculateHexPath(start, end, width); }

    hexDistance(a, b) { return hexDistance(a, b); }

    hexLerp(a, b, t) { return hexLerp(a, b, t); }

    processInput(e, isInitial) { this.inputController.processInput(e, isInitial); }

    addBorderHex(hex) { this.borderTools.addBorderHex(hex); }

    findRoadAtHex(hex) { return this.pathTools.findRoadAtHex(hex); }

    addRoadWaypoint(hex) { this.pathTools.addRoadWaypoint(hex); }

    findRiverAtHex(hex) { return this.pathTools.findRiverAtHex(hex); }

    erasePathElement(paths, hex) { this.pathTools.erasePathElement(paths, hex); }

    addRiverWaypoint(hex) { this.pathTools.addRiverWaypoint(hex); }

    paintHex(hex) { this.paintTools.paintHex(hex); }

    handleEraser(hex, x, y) { this.paintTools.handleEraser(hex, x, y); }

    handleEraserFlood(hex) { this.paintTools.handleEraserFlood(hex); }

    floodEraseSymbol(startHex, targetSymbol) { this.paintTools.handleEraserFlood; /* delegated � called via handleEraserFlood */ }

    floodEraseColor(startHex, targetColor) { this.paintTools.handleEraserFlood; /* delegated � called via handleEraserFlood */ }

    floodEraseEntirePath(paths, pathIds) { this.paintTools.floodEraseEntirePath(paths, pathIds); }

    floodErasePattern(startHex, targetPattern) { this.paintTools.handleEraserFlood; /* delegated � called via handleEraserFlood */ }

    floodEraseBorderSegment(startHex, regionId) { this.borderTools.floodEraseBorderSegment(startHex, regionId); }

    hexMatchesPattern(hex, pattern) { return this.paintTools.hexMatchesPattern(hex, pattern); }

    handleFillTool(startHex) { this.paintTools.handleFillTool(startHex); }

    floodFillColor(startHex, targetColor, newColor) { this.paintTools.handleFillTool; /* delegated � called via handleFillTool */ }

    floodFillSymbol(startHex, targetSymbol, targetColor, applyBackground) { this.paintTools.handleFillTool; /* delegated � called via handleFillTool */ }

    floodFillPattern(startHex, targetColor, targetSymbol) { this.paintTools.handleFillTool; /* delegated � called via handleFillTool */ }

    getHexNeighbors(hex) { return getHexNeighbors(hex); }

    isEnclosedByFrame(startHex) { this.paintTools.handleFillTool; /* delegated � called via handleFillTool */ }

    floodFillEmpty(startHex) { this.paintTools.handleFillTool; /* delegated — called via handleFillTool */ }

    render() { this.renderManager.render(); }


    getMapWorldSize() { return this.renderManager.getMapWorldSize(); }

    renderFullMap({ targetWidth, scale: fixedScale, cropless }: any = {}) { return this.renderManager.renderFullMap({ targetWidth, scale: fixedScale, cropless }); }




    async saveData() { return this.persistence.save(); }

    requestSave() { this.persistence.requestSave(); }

    resizeCanvas() { this.camera.resize(); }

    getWorldCoords(e) { return this.camera.getWorldCoords(e); }

    getHexBounds() { return this.camera.getHexBounds(); }

    hexToPixel(h) { return hexToPixel(h, this.data.gridSize, this.hexOrientation); }

    pixelToHex(x, y) { return pixelToHex(x, y, this.data.gridSize, this.hexOrientation); }

    async onClose() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        await this.persistence.save();
    }
}

export default HexCartographerPlugin;