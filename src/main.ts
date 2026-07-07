import { Setting, TFile, Notice, Modal, ItemView, setIcon } from 'obsidian';

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
    TOOLBAR_INPUT_FONT_SIZE, TOOLBAR_INPUT_HEIGHT,
    DEFAULT_MASTER_COLOR, DEFAULT_TEXT_COLOR,
    DEFAULT_EXTRAS_SYMBOL_COLOR, DEFAULT_EXTRAS_BG_COLOR,
    DEFAULT_VEGETATION_SYMBOL_COLOR, DEFAULT_VEGETATION_BG_COLOR,
    DEFAULT_MOUNTAIN_SYMBOL_COLOR, DEFAULT_MOUNTAIN_BG_COLOR,
    DEFAULT_BUILDING_SYMBOL_COLOR, DEFAULT_BUILDING_BG_COLOR,
    DEFAULT_GRID_SIZE, DEFAULT_OFF_X, DEFAULT_OFF_Y,
    DEFAULT_RIVER_WIDTH, DEFAULT_ROAD_WIDTH, PATH_OVERLAP_SPACING,
    DEFAULT_BORDER_HIGHLIGHT_WIDTH, DEFAULT_BORDER_DASHES, DEFAULT_PATH_DASHES,
    PATH_END_INSET, MAX_HISTORY, MIN_ZOOM, MAX_ZOOM, VIEWPORT_PADDING,
    DEFAULT_TEXT_SIZE, DEFAULT_SHADOW_DISTANCE, DEFAULT_SHADOW_OPACITY, ACTIVE_BOX_SHADOW, ACTIVE_BORDER, PICKER_ACTIVE_BG, BUTTON_BG_DEFAULT,
    SVG_SYMBOL_CONFIG
} from './constants';
import { rgbToHex } from './utils/color';
import { hexToPixel, pixelToHex, hexDistance, hexLerp, getHexNeighbors, calculateHexPath } from './utils/hexMath';
import { t } from './i18n';
import { extractJsonFromMarkdown, parseMapData, serializeMapToFileContent } from './data/serialization';
import HexCartographerPlugin from './plugin/HexCartographerPlugin';
import { SvgSymbolLoader } from './view/SvgSymbolLoader';
import { HistoryManager } from './view/HistoryManager';
import { TextInputModal } from './modals/TextInputModal';
import { ColorPickerModal } from './modals/ColorPickerModal';
import { ExportMapModal } from './modals/ExportMapModal';

// === View-Klasse für den Hex Cartographer ===
export class HexCartographerView extends ItemView {
    [key: string]: any;
    constructor(leaf, plugin) {
        super(leaf);
        this.navigation = true;
        this.plugin = plugin;
        this.file = null;
        this.data = { hexes: {}, rivers: [], roads: [], texts: [], borders: [], gridSize: DEFAULT_GRID_SIZE, zoom: 1, offX: DEFAULT_OFF_X, offY: DEFAULT_OFF_Y };

        this.historyManager = new HistoryManager(this);

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

        this.initToolConfigs();

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

    initToolConfigs() {
        const ex = this.toolConfigs || {};
        this.toolConfigs = {
            grass: {
                name: t('tool.extras'),
                variants: [
                    { id: 'question', label: t('variant.question'), icon: 'help-circle' },
                    { id: 'exclamation', label: t('variant.exclamation'), icon: 'alert-circle' },
                    { id: 'cross', label: t('variant.cross'), icon: 'x' },
                    { id: 'dot', label: t('variant.dot'), icon: 'circle' },
                    { id: 'shield', label: t('variant.shield'), icon: 'shield' },
                    { id: 'pirateskull', label: t('variant.pirateskull'), icon: 'skull' }
                ],
                currentVariant: ex.grass?.currentVariant || 'question',
                symbolColor: ex.grass?.symbolColor || DEFAULT_EXTRAS_SYMBOL_COLOR,
                backgroundColor: ex.grass?.backgroundColor || DEFAULT_EXTRAS_BG_COLOR,
                backgroundEnabled: ex.grass?.backgroundEnabled || false
            },
            tree: {
                name: t('tool.vegetation'),
                variants: [
                    { id: 'grass', label: t('variant.grass'), icon: 'sprout' },
                    { id: 'swamp', label: t('variant.swamp'), icon: 'waves' },
                    { id: 'bush', label: t('variant.bush'), icon: 'leaf' },
                    { id: 'tree', label: t('variant.tree'), icon: 'trees' },
                    { id: 'pine', label: t('variant.pine'), icon: 'triangle' },
                    { id: 'palm', label: t('variant.palm'), icon: 'palmtree' }
                ],
                currentVariant: ex.tree?.currentVariant || 'tree',
                symbolColor: ex.tree?.symbolColor || DEFAULT_VEGETATION_SYMBOL_COLOR,
                backgroundColor: ex.tree?.backgroundColor || DEFAULT_VEGETATION_BG_COLOR,
                backgroundEnabled: ex.tree?.backgroundEnabled || false
            },
            mountain: {
                name: t('tool.mountain'),
                variants: [
                    { id: 'hill', label: t('variant.hill'), icon: 'chevron-up' },
                    { id: 'mountain', label: t('variant.mountain'), icon: 'mountain' }
                ],
                currentVariant: ex.mountain?.currentVariant || 'mountain',
                symbolColor: ex.mountain?.symbolColor || DEFAULT_MOUNTAIN_SYMBOL_COLOR,
                backgroundColor: ex.mountain?.backgroundColor || DEFAULT_MOUNTAIN_BG_COLOR,
                backgroundEnabled: ex.mountain?.backgroundEnabled || false
            },
            building: {
                name: t('tool.building'),
                variants: [
                    { id: 'tent', label: t('variant.tent'), icon: 'tent' },
                    { id: 'house', label: t('variant.house'), icon: 'home' },
                    { id: 'village', label: t('variant.village'), icon: 'school' },
                    { id: 'town', label: t('variant.town'), icon: 'castle' },
                    { id: 'castle', label: t('variant.castle'), icon: 'shield' },
                    { id: 'monastery', label: t('variant.monastery'), icon: 'church' },
                    { id: 'harbor', label: t('variant.harbor'), icon: 'ship' },
                    { id: 'tower', label: t('variant.tower'), icon: 'tower' },
                    { id: 'ruins', label: t('variant.ruins'), icon: 'archive' },
                    { id: 'cave', label: t('variant.cave'), icon: 'circle' },
                    { id: 'oasis', label: t('variant.oasis'), icon: 'droplet' }
                ],
                currentVariant: ex.building?.currentVariant || 'house',
                symbolColor: ex.building?.symbolColor || DEFAULT_BUILDING_SYMBOL_COLOR,
                backgroundColor: ex.building?.backgroundColor || DEFAULT_BUILDING_BG_COLOR,
                backgroundEnabled: ex.building?.backgroundEnabled || false
            }
        };
    }

    rebuildToolbar() {
        const toolbar = this.containerEl.querySelector('.hex-toolbar');
        if (!toolbar) return;
        toolbar.empty();
        this.createToolbar(toolbar);
        this.updateToolbarState(toolbar);
        if (this.editMode) {
            this.recalcToolbarWidths();
        }
    }

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
        if (state && state.file) {
            const file = this.app.vault.getAbstractFileByPath(state.file);
            if (file instanceof TFile) {
                this.file = file;
                await this.reloadFile();
            }
        }
        await super.setState(state, result);
    }

    async reloadFile() {
        if (!this.file || this.isReloading) return;
        this.isReloading = true;
        try {
            if (this.svgLoadPromise && !this.svgSymbolsLoaded) {
                await this.svgLoadPromise;
            }

            const content = await this.app.vault.read(this.file);

            const jsonContent = extractJsonFromMarkdown(content);
            const newData = parseMapData(jsonContent);

            if (newData.settings) {
                if (newData.settings.colorPalette) {
                    this.colorPalette = newData.settings.colorPalette;
                }
                if (newData.settings.colorPalette2) {
                    this.colorPalette2 = newData.settings.colorPalette2;
                }
                if (newData.settings.activeColorSlot !== undefined) {
                    this.activeColorSlot = newData.settings.activeColorSlot;
                }
                this.editMode = newData.settings.editMode === true;
                if (newData.settings.hexOrientation !== undefined) this.hexOrientation = newData.settings.hexOrientation === true;
                const savedToolGroup = newData.settings.currentToolGroup || null;
                const savedDrawMode = newData.settings.drawMode || 'pen';
                if (this.editMode) {
                    this.currentToolGroup = savedToolGroup;
                    this.drawMode = savedDrawMode;
                } else {
                    this.currentToolGroup = null;
                    this.drawMode = 'pen';
                    this._savedToolGroup = savedToolGroup;
                    this._savedDrawMode = savedDrawMode;
                }
                if (newData.settings.toolConfigs) {
                    // WICHTIG: Explizit jeden Key einzeln laden, um sicherzustellen,
                    ['grass', 'tree', 'mountain', 'building'].forEach(key => {
                        if (newData.settings.toolConfigs[key] && this.toolConfigs[key]) {
                            const saved = newData.settings.toolConfigs[key];

                            if (saved.currentVariant !== undefined) {
                                this.toolConfigs[key].currentVariant = saved.currentVariant;
                            }
                            if (saved.symbolColor !== undefined) {
                                this.toolConfigs[key].symbolColor = saved.symbolColor;
                            }
                            if (saved.backgroundColor !== undefined) {
                                this.toolConfigs[key].backgroundColor = saved.backgroundColor;
                            }
                            if (saved.backgroundEnabled !== undefined) {
                                this.toolConfigs[key].backgroundEnabled = saved.backgroundEnabled;
                            }
                        }
                    });
                    this.svgLoader.updateButtonIcons();
                } else {
                    this.svgLoader.updateToolConfigDefaults();
                    this.svgLoader.updateButtonIcons();
                }
                if (newData.settings.patternData) {
                    this.patternData = newData.settings.patternData;
                }
                if (newData.settings.patternSourceHex) {
                    this.patternSourceHex = newData.settings.patternSourceHex;
                }
                if (newData.settings.borderSettings) {
                    this.borderSettings = newData.settings.borderSettings;
                    this.borderSettings.activeRegionId = null;
                    this.borderSettings.pickedHex = null;
                }
                if (newData.settings.riverSettings) {
                    this.riverSettings = newData.settings.riverSettings;
                    this.riverSettings.editMode = false;
                    this.riverSettings.activeRiverId = null;
                    this.riverSettings.insertAfter = null;
                }
                if (newData.settings.roadSettings) {
                    this.roadSettings = newData.settings.roadSettings;
                    this.roadSettings.editMode = false;
                    this.roadSettings.activeRoadId = null;
                    this.roadSettings.insertAfter = null;
                }
                if (newData.settings.hexColorColor) {
                    this.hexColorColor = newData.settings.hexColorColor;
                }
                if (newData.settings.lastUsedTextSize !== undefined) this.lastUsedTextSize = newData.settings.lastUsedTextSize;
                if (newData.settings.lastUsedTextOutline !== undefined) this.lastUsedTextOutline = newData.settings.lastUsedTextOutline;
                if (newData.settings.lastUsedTextBold !== undefined) this.lastUsedTextBold = newData.settings.lastUsedTextBold;
                if (newData.settings.lastUsedTextShadow !== undefined) this.lastUsedTextShadow = newData.settings.lastUsedTextShadow;
                if (newData.settings.lastUsedTextShadowDistance !== undefined) this.lastUsedTextShadowDistance = newData.settings.lastUsedTextShadowDistance;
                if (newData.settings.lastUsedTextShadowOpatown !== undefined) this.lastUsedTextShadowOpatown = newData.settings.lastUsedTextShadowOpatown;
                if (newData.settings.masterColor) {
                    this.masterColor = newData.settings.masterColor;
                    if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                }
                if (this.currentToolGroup === 'hexcolor') {
                    this.masterColor = this.hexColorColor;
                    if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                } else if (this.currentToolGroup && this.toolConfigs[this.currentToolGroup]) {
                    this.masterColor = this.toolConfigs[this.currentToolGroup].symbolColor;
                    if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                }
            } else {
                this.svgLoader.updateToolConfigDefaults();
                this.svgLoader.updateButtonIcons();
            }

            if (JSON.stringify(this.data) !== JSON.stringify(newData)) {
                this.data = Object.assign({}, newData);

                if (this.canvas) {
                    if (this.data.settings && this.data.settings.viewportSaved) {
                        this.render();
                    } else if (Object.keys(this.data.hexes).length > 0) {
                        setTimeout(() => { this.fitMapToView(); }, 100);
                    } else {
                        if (this.canvas.width > 0) {
                            this.data.offX = this.canvas.width / 2;
                            this.data.offY = this.canvas.height / 2;
                        }
                        this.render();
                    }
                }
            }

            if (this.containerEl) {
                const toolbar = this.containerEl.querySelector('.hex-toolbar');
                if (toolbar) {
                    this.updateToolbarState(toolbar);
                    if (this.editMode) {
                        setTimeout(() => {
                            this.updateToolbarState(toolbar);
                            this.recalcToolbarWidths();
                        }, 50);
                    }
                }
            }
        } catch(e) {
            console.error("HexCartographer Sync Fehler:", e);
        } finally {
            this.isReloading = false;
        }
    }



    fitMapToView() {
        const hexes = Object.values(this.data.hexes);
        const texts = this.data.texts || [];
        const borders = this.data.borders || [];

        const borderOnlyHexes = [];
        const hexKeySet = new Set(Object.keys(this.data.hexes));
        for (const region of borders) {
            for (const bh of region.hexes) {
                if (!hexKeySet.has(`${bh.q}_${bh.r}`)) {
                    borderOnlyHexes.push(bh);
                }
            }
        }

        if (hexes.length === 0 && texts.length === 0 && borderOnlyHexes.length === 0) {
            new Notice(t('notice.noHexesToShow'));
            return;
        }

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        const expandBounds = (hex) => {
            const pos = this.hexToPixel(hex);
            const s = this.data.gridSize;
            minX = Math.min(minX, pos.x - s);
            maxX = Math.max(maxX, pos.x + s);
            minY = Math.min(minY, pos.y - s);
            maxY = Math.max(maxY, pos.y + s);
        };

        hexes.forEach(expandBounds);
        borderOnlyHexes.forEach(expandBounds);

        texts.forEach(t => {
            const textSize = t.size || 16;
            const estimatedWidth = t.text.length * textSize * 0.6; // Geschätzte Textbreite
            const estimatedHeight = textSize;

            minX = Math.min(minX, t.x - estimatedWidth / 2);
            maxX = Math.max(maxX, t.x + estimatedWidth / 2);
            minY = Math.min(minY, t.y - estimatedHeight / 2);
            maxY = Math.max(maxY, t.y + estimatedHeight / 2);
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const width = maxX - minX;
        const height = maxY - minY;

        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const zoomX = (canvasWidth * VIEWPORT_PADDING) / width;
        const zoomY = (canvasHeight * VIEWPORT_PADDING) / height;
        const newZoom = Math.max(MIN_ZOOM, Math.min(zoomX, zoomY, MAX_ZOOM));

        this.data.zoom = newZoom;
        this.data.offX = canvasWidth / 2 - centerX * newZoom;
        this.data.offY = canvasHeight / 2 - centerY * newZoom;

        this.render();
        this.requestSave();
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

        toolbar.addEventListener('wheel', (e) => {
            e.stopPropagation();
        }, { passive: true });

        this.createToolbar(toolbar);

        this.updateToolbarState(toolbar);

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

    createToolbar(toolbar) {
        const editModeBtn = this.createToolButton(toolbar, { icon: 'wrench', title: t('tooltip.editMode') });
        this.editModeBtn = editModeBtn;
        editModeBtn.onclick = () => {
            this.editMode = !this.editMode;
            if (!this.editMode) {
                this.exitPathEditMode();
                this._savedToolGroup = this.currentToolGroup;
                this._savedDrawMode = this.drawMode;
                this.drawMode = 'pen';
                this.currentToolGroup = null;
                this.borderPickMode = false;
                this.pathPickMode = false;
            } else {
                this.currentToolGroup = this._savedToolGroup !== undefined ? this._savedToolGroup : 'hexcolor';
                this.drawMode = this._savedDrawMode || 'pen';
                if (this.currentToolGroup === 'hexcolor') {
                    this.masterColor = this.hexColorColor;
                } else if (this.currentToolGroup && this.toolConfigs[this.currentToolGroup]) {
                    this.masterColor = this.toolConfigs[this.currentToolGroup].symbolColor;
                }
            }
            this.editContent.style.display = this.editMode ? 'contents' : 'none';
            editModeBtn.classList.toggle('active', this.editMode);
            this.updateToolbarState(toolbar);
            if (this.editMode) {
                setTimeout(() => this.recalcToolbarWidths(), 0);
            }
            this.render();
            this.requestSave();
        };

        const editContent = toolbar.createDiv({ style: this.editMode ? 'display: contents;' : 'display: none;' });
        this.editContent = editContent;

        const masterColorBtn = editContent.createEl('button', {
            attr: { title: t('tooltip.colorPicker'), style: 'width: 50px; height: 50px; min-width: 50px; border: 1px solid var(--divider-color); border-radius: 4px; cursor: pointer; box-sizing: border-box; padding: 0;' }
        });
        masterColorBtn.style.backgroundColor = this.masterColor;
        this.masterColorBtn = masterColorBtn;

        const masterColorInput = editContent.createEl('input', {
            type: 'color',
            value: this.masterColor,
            attr: { style: 'position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none;' }
        });
        this.masterColorInput = masterColorInput;

        masterColorBtn.onclick = () => {
            if (this.isTouchDevice) {
                new ColorPickerModal(this.app, this.masterColor, (color) => {
                    this.masterColor = color;
                    masterColorBtn.style.backgroundColor = this.masterColor;
                    masterColorInput.value = this.masterColor;
                    this.updateActivePathColor();
                    this.requestSave();
                }).open();
            } else {
                masterColorInput.click();
            }
        };
        this.makeInputInteractive(masterColorBtn);
        masterColorInput.oninput = (e) => {
            this.masterColor = e.target.value;
            masterColorBtn.style.backgroundColor = this.masterColor;
            this.updateActivePathColor();
        };
        masterColorInput.addEventListener('change', () => {
            this.requestSave();
        });

        const colorEyedropperBtn = this.createToolButton(editContent, { icon: 'pipette', title: t('tooltip.colorEyedropper') });
        colorEyedropperBtn.style.background = BUTTON_BG_DEFAULT;
        this.colorEyedropperBtn = colorEyedropperBtn;
        colorEyedropperBtn.onclick = () => {
            const wasActive = this.colorPickMode;
            this.exitPathEditMode();
            this.colorPickMode = !wasActive;
            colorEyedropperBtn.style.background = this.colorPickMode ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            colorEyedropperBtn.style.color = this.colorPickMode ? 'var(--text-on-accent)' : '';
            if (this.colorPickMode) new Notice(t('notice.tapToPickColor'));
        };

        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        this.createColorPalette(editContent);
        
        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        const hexColorBtn = this.createToolButton(editContent, { icon: 'hexagon', title: t('tooltip.hexColor'), dataset: { toolGroup: 'hexcolor' } });
        hexColorBtn.onclick = () => {
            const needsRender = this.currentToolGroup === 'pattern' || this.borderSettings.pickedHex;
            this.exitPathEditMode();
            if (this.currentToolGroup === 'hexcolor') {
                this.drawMode = 'pen';
            } else {
                this.currentToolGroup = 'hexcolor';
                this.drawMode = 'pen';
                this.masterColor = this.hexColorColor;
                if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
            }
            this.updateToolbarState(toolbar);
            if (needsRender) this.render();
            this.requestSave();
        };

        this.createToolGroupButton(editContent, 'grass');
        this.createToolGroupButton(editContent, 'tree');
        this.createToolGroupButton(editContent, 'mountain');
        this.createToolGroupButton(editContent, 'building');

        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        this.createDrawModeButton(editContent, 'fill', 'paint-bucket', t('tooltip.fill'));

        const textBtn = this.createToolButton(editContent, { icon: 'type', title: t('tooltip.text'), dataset: { toolGroup: 'text' } });
        textBtn.onclick = () => {
            const needsRender = this.currentToolGroup === 'pattern' || this.borderSettings.pickedHex;
            this.exitPathEditMode();
            this.currentToolGroup = 'text';
            this.drawMode = 'none';
            this.updateToolbarState(toolbar);
            if (needsRender) this.render();
            this.requestSave();
        };

        this.createDrawModeButton(editContent, 'eraser', 'eraser', t('tooltip.eraser'));

        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        this.createPatternTool(editContent);

        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        this.createPathToolbar(editContent);
        this.createBorderButton(editContent);

        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        const undoBtn = this.createToolButton(editContent, { icon: 'undo-2', title: t('tooltip.undo') });
        undoBtn.onclick = () => this.historyManager.undo();

        const redoBtn = this.createToolButton(editContent, { icon: 'redo-2', title: t('tooltip.redo') });
        redoBtn.onclick = () => this.historyManager.redo();

        const fitBtn = this.createToolButton(toolbar, { icon: 'maximize-2', title: t('tooltip.fit') });
        fitBtn.onclick = () => this.fitMapToView();

        const hexOrientationBtn = this.createToolButton(toolbar, { icon: 'rotate-cw', title: t('tooltip.hexOrientation') });
        this.hexOrientationBtn = hexOrientationBtn;
        hexOrientationBtn.classList.toggle('active', this.hexOrientation);
        hexOrientationBtn.style.background = this.hexOrientation ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
        hexOrientationBtn.style.border = this.hexOrientation ? ACTIVE_BORDER : '';
        hexOrientationBtn.style.boxShadow = this.hexOrientation ? ACTIVE_BOX_SHADOW : '';
        hexOrientationBtn.onclick = () => {
            this.hexOrientation = !this.hexOrientation;
            hexOrientationBtn.classList.toggle('active', this.hexOrientation);
            hexOrientationBtn.style.background = this.hexOrientation ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            hexOrientationBtn.style.border = this.hexOrientation ? ACTIVE_BORDER : '';
            hexOrientationBtn.style.boxShadow = this.hexOrientation ? ACTIVE_BOX_SHADOW : '';
            this.render();
            this.requestSave();
        };

        const settingsBtn = this.createToolButton(toolbar, { icon: 'settings', title: t('tooltip.settings') });
        settingsBtn.onclick = () => {
            this.app.setting.open();
            this.app.setting.openTabById('hex-cartographer');
        };

        this.updateToolbarState(toolbar);
    }

    createDrawModeButton(toolbar, mode, icon, title) {
        const btn = this.createToolButton(toolbar, { icon, title, dataset: { drawMode: mode } });
        btn.onclick = () => {
            if (mode === 'eraser' && (this.patternPickMode || this.pathPickMode || this.borderPickMode || this.colorPickMode)) return;
            const needsRender = this.currentToolGroup === 'pattern' || this.borderSettings.pickedHex;
            if (mode !== 'eraser') this.exitPathEditMode();
            if (this.drawMode === mode && (mode === 'eraser' || mode === 'fill')) {
                this.drawMode = 'pen';
                this.updateToolbarState(toolbar);
                return;
            }
            this.drawMode = mode;

            if (mode === 'fill' && (!this.currentToolGroup || this.currentToolGroup === 'text' || this.currentToolGroup === 'river' || this.currentToolGroup === 'road' || this.currentToolGroup === 'border')) {
                this.exitPathEditMode();
                this.currentToolGroup = 'hexcolor';
            }
            else if (this.currentToolGroup === 'text') {
                this.currentToolGroup = null;
            }

            this.updateToolbarState(toolbar);

            if (needsRender && this.currentToolGroup !== 'pattern') {
                this.render();
            }
            this.requestSave();
        };
    }

    createToolGroupButton(toolbar, groupId) {
        const config = this.toolConfigs[groupId];
        const wrapper = toolbar.createDiv({
            cls: 'tool-group-wrapper',
            style: 'display: inline-flex; flex-direction: column; align-items: center; gap: 2px;'
        });
        wrapper.dataset.toolGroupWrapper = groupId;

        const btnWrapper = wrapper.createDiv({ style: 'position: relative; display: inline-block;' });
        const btn = this.createToolButton(btnWrapper, {
            title: t('tooltip.toolGroup', { name: config.name }),
            dataset: { toolGroup: groupId },
            style: `position: relative; background: ${config.backgroundEnabled ? config.backgroundColor : BUTTON_BG_DEFAULT};`
        });

        const currentVariant = config.variants.find(v => v.id === config.currentVariant);

        if (this.svgSymbols[currentVariant.id]) {
            const symbolInfo = this.svgSymbols[currentVariant.id];
            btn.innerHTML = `<svg viewBox="0 0 ${symbolInfo.viewBoxWidth} ${symbolInfo.viewBoxWidth}"
                                  width="16" height="16" style="vertical-align: middle;">
                <path d="${symbolInfo.pathData}" fill="currentColor"/>
            </svg>`;
        } else {
            setIcon(btn, currentVariant.icon);
        }

        if (config.symbolColor) {
            btn.style.color = config.symbolColor;
        }

        btnWrapper.createEl('span', {
            text: '▼',
            attr: {
                style: 'position: absolute; right: 2px; bottom: 2px; font-size: 8px; pointer-events: none; color: var(--text-muted);'
            }
        });

        btn.onclick = () => {
            const needsRender = this.currentToolGroup === 'pattern' || this.borderSettings.pickedHex;
            this.exitPathEditMode();
            this.currentToolGroup = groupId;
            this.drawMode = 'pen';
            this.masterColor = config.symbolColor;
            if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }

            this.updateToolbarState(toolbar);

            if (needsRender) {
                this.render();
            }
            this.requestSave();
        };

        btn.oncontextmenu = (e) => {
            e.preventDefault();
            this.showVariantMenu(groupId, wrapper);
        };

    }

    createPatternTool(toolbar) {
        const wrapper = toolbar.createDiv({ style: 'display: flex; align-items: center; gap: 4px;' });

        const patternBtn = this.createToolButton(wrapper, { icon: 'copy', title: t('tooltip.pattern'), dataset: { toolGroup: 'pattern' } });

        patternBtn.onclick = () => {
            if (!this.patternData) {
                new Notice(t('notice.noPattern'));
                return;
            }
            this.exitPathEditMode();
            this.currentToolGroup = 'pattern';
            this.drawMode = 'pen';
            this.updateToolbarState(toolbar);
            this.render();
            this.requestSave();
        };

        const pickerBtn = this.createToolButton(wrapper, { icon: 'pipette', title: t('tooltip.patternPicker'), style: 'width: 24px; padding: 2px;' });

        pickerBtn.onclick = () => {
            const wasActive = this.patternPickMode;
            this.exitPathEditMode();
            this.patternPickMode = !wasActive;
            pickerBtn.style.background = this.patternPickMode ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            if (this.patternPickMode) {
                this.currentToolGroup = null;
                new Notice(t('notice.clickToPickPattern'));
            }
            this.updateToolbarState(toolbar);
        };

        this.patternPickerBtn = pickerBtn;
    }

    showVariantMenu(groupId, wrapper) {
        const config = this.toolConfigs[groupId];
        const btn = wrapper.querySelector('.hex-tool-btn');

        const oldMenu = document.querySelector('.hex-variant-menu');
        if (oldMenu) oldMenu.remove();

        const menu = document.body.createDiv({ cls: 'hex-variant-menu' });
        menu.style.position = 'absolute';
        menu.style.background = 'var(--background-primary)';
        menu.style.border = '1px solid var(--divider-color)';
        menu.style.borderRadius = '4px';
        menu.style.padding = '4px';
        menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        menu.style.zIndex = '1000';

        const rect = btn.getBoundingClientRect();
        menu.style.left = rect.left + 'px';
        menu.style.top = (rect.bottom + 4) + 'px';

        config.variants.forEach(variant => {
            const item = menu.createDiv({
                text: variant.label,
                style: 'padding: 6px 12px; cursor: pointer; border-radius: 3px;'
            });

            if (variant.id === config.currentVariant) {
                item.style.background = 'var(--interactive-accent)';
                item.style.color = 'var(--text-on-accent)';
            }

            item.onmouseover = () => {
                if (variant.id !== config.currentVariant) {
                    item.style.background = 'var(--background-modifier-hover)';
                }
            };
            item.onmouseout = () => {
                if (variant.id !== config.currentVariant) {
                    item.style.background = '';
                }
            };

            item.onclick = () => {
                config.currentVariant = variant.id;

                if (this.svgSymbols[variant.id]) {
                    const symbolInfo = this.svgSymbols[variant.id];
                    btn.innerHTML = `<svg viewBox="0 0 ${symbolInfo.viewBoxWidth} ${symbolInfo.viewBoxWidth}"
                                          width="16" height="16" style="vertical-align: middle;">
                        <path d="${symbolInfo.pathData}" fill="currentColor"/>
                    </svg>`;
                } else {
                    setIcon(btn, variant.icon);
                }

                this.currentToolGroup = groupId;
                this.drawMode = 'pen';
                this.masterColor = config.symbolColor;
                if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }

                menu.remove();
                this.updateToolbarState(this.containerEl.querySelector('.hex-toolbar'));
                this.requestSave();
            };
        });

        setTimeout(() => {
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        }, 10);
    }

    openColorPickerModal(groupId, wrapper) {
        const config = this.toolConfigs[groupId];
        const btn = wrapper.querySelector('.hex-tool-btn');

        const modal = new Modal(this.app);
        modal.contentEl.createEl('h3', { text: `${config.name} - Hintergrundfarbe` });

        const bgSection = modal.contentEl.createDiv({ style: 'margin: 15px 0;' });

        const bgRow = bgSection.createDiv({ style: 'display: flex; gap: 10px; align-items: center; margin-bottom: 10px;' });
        bgRow.createEl('label', { text: 'Farbe:' });
        const bgPicker = bgRow.createEl('input', { type: 'color', value: config.backgroundColor || BUTTON_BG_DEFAULT });

        const bgPaletteRow = bgSection.createDiv({ style: 'display: flex; gap: 5px; flex-wrap: wrap;' });
        bgPaletteRow.createEl('span', { text: 'Palette:', attr: { style: 'width: 100%; font-size: 11px; margin-bottom: 5px;' } });
        this.colorPalette.forEach(color => {
            const paletteBtn = bgPaletteRow.createEl('button', {
                attr: {
                    style: `width: 30px; height: 30px; background: ${color}; border: 2px solid var(--divider-color); border-radius: 3px; cursor: pointer;`
                }
            });
            paletteBtn.onclick = () => {
                bgPicker.value = color;
            };
        });

        const btnRow = modal.contentEl.createDiv({ style: 'display: flex; gap: 10px; margin-top: 20px;' });

        const okBtn = btnRow.createEl('button', { text: 'OK', cls: 'mod-cta' });
        okBtn.onclick = () => {
            config.backgroundColor = bgPicker.value;
            if (config.backgroundEnabled) {
                btn.style.background = config.backgroundColor;
            }
            modal.close();
            this.requestSave();
            this.render();
        };

        const cancelBtn = btnRow.createEl('button', { text: 'Abbrechen' });
        cancelBtn.onclick = () => modal.close();

        modal.open();
    }

    createColorPalette(toolbar) {
        const outer = toolbar.createDiv({ style: 'display: inline-flex; flex-direction: column; gap: 2px; border-left: 1px solid #bbb; border-right: 1px solid #bbb; padding: 0 6px;' });
        this.paletteOuter = outer;

        this._createPaletteRow(outer, this.colorPalette, 'colorPalette');
        this._createPaletteRow(outer, this.colorPalette2, 'colorPalette2');
    }

    _createPaletteRow(parent, palette, paletteKey) {
        const row = parent.createDiv({ style: 'display: flex; align-items: center; gap: 3px;' });

        palette.forEach((color, index) => {
            const btn = row.createEl('button', {
                cls: 'hex-color-slot',
                attr: {
                    title: t('tooltip.palette'),
                    style: 'width: 24px; height: 24px; min-width: 24px; border: none; border-radius: 3px; cursor: pointer; padding: 0;'
                }
            });
            btn.style.backgroundColor = color;
            btn.dataset.paletteKey = paletteKey;
            btn.dataset.paletteIndex = index;

            const hiddenInput = row.createEl('input', {
                type: 'color',
                value: color,
                attr: { style: 'position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none;' }
            });

            btn.onclick = () => {
                if (this.currentToolGroup === 'pattern' || this.patternPickMode || this.pathPickMode || this.borderPickMode || this.colorPickMode) {
                    this.exitPathEditMode();
                    this.currentToolGroup = 'hexcolor';
                    this.drawMode = 'pen';
                }
                this.masterColor = this[paletteKey][index];
                if (this.currentToolGroup === 'hexcolor') this.hexColorColor = this.masterColor;
                if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                this.updateActivePathColor();
                const toolbar = this.containerEl.querySelector('.hex-toolbar');
                if (toolbar) this.updateToolbarState(toolbar);
            };

            const openPaletteColorPicker = () => {
                if (this.isTouchDevice) {
                    new ColorPickerModal(this.app, this[paletteKey][index], (color) => {
                        this[paletteKey][index] = color;
                        btn.style.backgroundColor = color;
                        hiddenInput.value = color;
                        this.masterColor = color;
                        if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                        this.updateActivePathColor();
                        this.requestSave();
                    }).open();
                } else {
                    hiddenInput.click();
                }
            };

            btn.oncontextmenu = (e) => {
                e.preventDefault();
                openPaletteColorPicker();
            };

            let longPressTimer = null;
            btn.addEventListener('touchstart', (e) => {
                longPressTimer = setTimeout(() => {
                    e.preventDefault();
                    openPaletteColorPicker();
                    longPressTimer = null;
                }, 500);
            }, { passive: false });
            btn.addEventListener('touchend', () => {
                if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
            });
            btn.addEventListener('touchmove', () => {
                if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
            });

            hiddenInput.oninput = (e) => {
                this[paletteKey][index] = e.target.value;
                btn.style.backgroundColor = e.target.value;
                this.masterColor = e.target.value;
                if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                this.updateActivePathColor();
            };
            hiddenInput.addEventListener('change', () => {
                this.requestSave();
            });
        });
    }

    createPathToolbar(toolbar) {
        const wrapper = toolbar.createDiv({
            style: 'display: inline-flex; flex-direction: column; gap: 2px;'
        });

        const topRow = wrapper.createDiv({ style: 'display: flex; gap: 2px; align-items: center;' });

        const riverBtn = this.createToolButton(topRow, { icon: 'waves', title: t('tooltip.river'), dataset: { toolGroup: 'river' } });
        this.riverBtn = riverBtn;
        riverBtn.onclick = () => {
            if (this.pathPickPending) {
                this.completePathPick(this.pathPickPending.river, 'river');
                return;
            }
            const needsRender = this.currentToolGroup === 'pattern' || this.borderSettings.pickedHex;
            this.exitPathEditMode();
            this.currentToolGroup = 'river';
            this.drawMode = 'pen';
            this.updateToolbarState(toolbar);
            if (needsRender) this.render();
            this.requestSave();
        };

        const roadBtn = this.createToolButton(topRow, { icon: 'route', title: t('tooltip.road'), dataset: { toolGroup: 'road' } });
        this.roadBtn = roadBtn;
        roadBtn.onclick = () => {
            if (this.pathPickPending) {
                this.completePathPick(this.pathPickPending.road, 'road');
                return;
            }
            const needsRender = this.currentToolGroup === 'pattern' || this.borderSettings.pickedHex;
            this.exitPathEditMode();
            this.currentToolGroup = 'road';
            this.drawMode = 'pen';
            this.updateToolbarState(toolbar);
            if (needsRender) this.render();
            this.requestSave();
        };

        const pickerBtn = this.createToolButton(topRow, { icon: 'mouse-pointer', title: t('tooltip.pathPicker') });
        this.pathPickerBtn = pickerBtn;
        pickerBtn.onclick = () => {
            if (this.pathPickPending) {
                this.pathPickPending = null;
                this.pathPickMode = false;
                this.currentToolGroup = this.lastToolGroup;
                this.lastToolGroup = null;
                pickerBtn.style.background = BUTTON_BG_DEFAULT;
                pickerBtn.style.color = '';
                this.updateToolbarState(toolbar);
                return;
            }
            const settings = this.currentToolGroup === 'river' ? this.riverSettings : this.roadSettings;
            if (settings.editMode) {
                this.exitPathEditMode();
                return;
            }
            this.pathPickMode = !this.pathPickMode;
            if (this.pathPickMode) {
                this.lastToolGroup = this.currentToolGroup;
                this.currentToolGroup = null;
                this.patternPickMode = false;
                if (this.patternPickerBtn) { this.patternPickerBtn.style.background = BUTTON_BG_DEFAULT; }
                this.borderPickMode = false;
                if (this.borderPickerBtn) { this.borderPickerBtn.style.background = BUTTON_BG_DEFAULT; this.borderPickerBtn.style.color = ''; }
            }
            this.drawMode = 'pen';
            pickerBtn.style.background = this.pathPickMode ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            pickerBtn.style.color = this.pathPickMode ? 'var(--text-on-accent)' : '';
            this.updateToolbarState(toolbar);
        };

        const bottomRow = wrapper.createDiv({ style: 'display: flex; gap: 2px;' });

        const riverWidthInput = bottomRow.createEl('input', {
            type: 'number',
            value: this.riverSettings.width.toString(),
            attr: { title: t('input.riverWidth'), min: '1', max: '999', style: `height: ${TOOLBAR_INPUT_HEIGHT}; font-size: ${TOOLBAR_INPUT_FONT_SIZE}; padding: 2px; box-sizing: border-box;` }
        });
        this.makeInputInteractive(riverWidthInput);
        this.riverWidthInput = riverWidthInput;
        riverWidthInput.oninput = (e) => {
            if (e.target.value.length > 3) e.target.value = e.target.value.slice(0, 3);
            this.riverSettings.width = Math.min(999, Math.max(1, parseInt(e.target.value) || DEFAULT_RIVER_WIDTH));
            e.target.value = this.riverSettings.width;
            const river = this.data.rivers && this.data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
            if (river) river.width = this.riverSettings.width;
            this.render();
        };

        const roadWidthInput = bottomRow.createEl('input', {
            type: 'number',
            value: this.roadSettings.width.toString(),
            attr: { title: t('input.roadWidth'), min: '1', max: '999', style: `height: ${TOOLBAR_INPUT_HEIGHT}; font-size: ${TOOLBAR_INPUT_FONT_SIZE}; padding: 2px; box-sizing: border-box;` }
        });
        this.makeInputInteractive(roadWidthInput);
        this.roadWidthInput = roadWidthInput;
        roadWidthInput.oninput = (e) => {
            if (e.target.value.length > 3) e.target.value = e.target.value.slice(0, 3);
            this.roadSettings.width = Math.min(999, Math.max(1, parseInt(e.target.value) || DEFAULT_ROAD_WIDTH));
            e.target.value = this.roadSettings.width;
            const road = this.data.roads && this.data.roads.find(r => r.id === this.roadSettings.activeRoadId);
            if (road) road.width = this.roadSettings.width;
            this.render();
        };

        const dashesInput = bottomRow.createEl('input', {
            type: 'number',
            value: (this.pathDashes || DEFAULT_PATH_DASHES).toString(),
            attr: { title: t('input.pathDashes'), min: '1', max: '99', style: `height: ${TOOLBAR_INPUT_HEIGHT}; font-size: ${TOOLBAR_INPUT_FONT_SIZE}; padding: 2px; box-sizing: border-box;` }
        });
        this.makeInputInteractive(dashesInput);
        this.pathDashesInput = dashesInput;
        dashesInput.oninput = (e) => {
            if (e.target.value.length > 2) e.target.value = e.target.value.slice(0, 2);
            this.pathDashes = Math.min(99, Math.max(1, parseInt(e.target.value) || DEFAULT_PATH_DASHES));
            e.target.value = this.pathDashes;
            const river = this.data.rivers && this.data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
            if (river) river.dashes = this.pathDashes;
            const road = this.data.roads && this.data.roads.find(r => r.id === this.roadSettings.activeRoadId);
            if (road) road.dashes = this.pathDashes;
            this.render();
        };

        setTimeout(() => {
            riverWidthInput.style.width = `${riverBtn.offsetWidth}px`;
            roadWidthInput.style.width = `${roadBtn.offsetWidth}px`;
            dashesInput.style.width = `${pickerBtn.offsetWidth}px`;
        }, 0);
    }

    handleWaypointClick(path, settings, clickedIdx) {
        const now = Date.now();
        const isDouble = this.lastWaypointClick &&
                         this.lastWaypointClick.pathId === path.id &&
                         this.lastWaypointClick.idx === clickedIdx &&
                         (now - this.lastWaypointClick.time) < 400;
        if (isDouble) {
            const anchorIdx = this.lastWaypointClick.previousInsertAfter;
            if (anchorIdx !== null && anchorIdx !== undefined && anchorIdx !== clickedIdx) {
                const fromWp = path.waypoints[anchorIdx];
                const toWp = path.waypoints[clickedIdx];
                if (fromWp && toWp && (fromWp.q !== toWp.q || fromWp.r !== toWp.r)) {
                    path.waypoints.push({ q: fromWp.q, r: fromWp.r, break: true });
                    path.waypoints.push({ q: toWp.q, r: toWp.r });
                    settings.insertAfter = path.waypoints.length - 1;
                }
            }
            this.lastWaypointClick = null;
        } else {
            this.lastWaypointClick = {
                pathId: path.id,
                idx: clickedIdx,
                time: now,
                previousInsertAfter: settings.insertAfter
            };
            settings.insertAfter = clickedIdx;
        }
        this.render();
        this.requestSave();
    }

    completePathPick(path, type) {
        this.exitPathEditMode();
        this.pathPickPending = null;
        if (type === 'river') {
            this.currentToolGroup = 'river';
            this.riverSettings.activeRiverId = path.id;
            this.riverSettings.width = path.width;
            this.riverSettings.editMode = true;
            this.riverSettings.insertAfter = path.waypoints.length - 1;
            this.masterColor = path.color;
            if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
            if (this.riverWidthInput) this.riverWidthInput.value = path.width.toString();
            this.pathDashes = path.dashes || DEFAULT_PATH_DASHES;
            if (this.pathDashesInput) this.pathDashesInput.value = this.pathDashes.toString();
            new Notice(t('notice.riverSelected', { id: path.id }));
        } else {
            this.currentToolGroup = 'road';
            this.roadSettings.activeRoadId = path.id;
            this.roadSettings.width = path.width;
            this.roadSettings.editMode = true;
            this.roadSettings.insertAfter = path.waypoints.length - 1;
            this.masterColor = path.color;
            if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
            if (this.roadWidthInput) this.roadWidthInput.value = path.width.toString();
            this.pathDashes = path.dashes || DEFAULT_PATH_DASHES;
            if (this.pathDashesInput) this.pathDashesInput.value = this.pathDashes.toString();
            new Notice(t('notice.roadSelected', { id: path.id }));
        }
        this.lastToolGroup = null;
        this.pathPickMode = false;
        if (this.pathPickerBtn) {
            this.pathPickerBtn.style.background = BUTTON_BG_DEFAULT;
            this.pathPickerBtn.style.color = '';
        }
        this.drawMode = 'pen';
        const toolbar = this.containerEl.querySelector('.hex-toolbar');
        if (toolbar) this.updateToolbarState(toolbar);
        this.render();
        this.requestSave();
    }

    pickPathAtHex(hex) {
        this.pathPickPending = null;
        const foundRiver = this.findRiverAtHex(hex);
        const foundRoad = this.findRoadAtHex(hex);

        if (foundRiver && foundRoad) {
            this.pathPickPending = { river: foundRiver, road: foundRoad };
            new Notice(t('notice.chooseRiverOrRoad'));
            const toolbar = this.containerEl.querySelector('.hex-toolbar');
            if (toolbar) this.updateToolbarState(toolbar);
            return;
        }

        if (foundRiver) {
            this.completePathPick(foundRiver, 'river');
        } else if (foundRoad) {
            this.completePathPick(foundRoad, 'road');
        } else {
            this.currentToolGroup = this.lastToolGroup;
            if (this.currentToolGroup === 'hexcolor') {
                this.masterColor = this.hexColorColor;
            } else if (this.currentToolGroup && this.toolConfigs[this.currentToolGroup]) {
                this.masterColor = this.toolConfigs[this.currentToolGroup].symbolColor;
            }
            this.lastToolGroup = null;
            this.pathPickMode = false;
            if (this.pathPickerBtn) {
                this.pathPickerBtn.style.background = BUTTON_BG_DEFAULT;
                this.pathPickerBtn.style.color = '';
            }
            this.drawMode = 'pen';
            const toolbar = this.containerEl.querySelector('.hex-toolbar');
            if (toolbar) this.updateToolbarState(toolbar);
            this.render();
        }
    }

    updateActivePathColor() {
        if (this.riverSettings.editMode) {
            const river = this.data.rivers && this.data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
            if (river) { river.color = this.masterColor; this.render(); this.requestSave(); }
        }
        if (this.roadSettings.editMode) {
            const road = this.data.roads && this.data.roads.find(r => r.id === this.roadSettings.activeRoadId);
            if (road) { road.color = this.masterColor; this.render(); this.requestSave(); }
        }
        if (this.borderSettings.activeRegionId !== null && this.currentToolGroup === 'border') {
            const region = this.data.borders && this.data.borders.find(r => r.id === this.borderSettings.activeRegionId);
            if (region) { region.color = this.masterColor; this.render(); this.requestSave(); }
        }
        if (this.currentToolGroup === 'hexcolor') {
            this.hexColorColor = this.masterColor;
            const toolbar = this.containerEl.querySelector('.hex-toolbar');
            if (toolbar) this.updateToolbarState(toolbar);
        } else if (this.currentToolGroup && this.toolConfigs[this.currentToolGroup]) {
            this.toolConfigs[this.currentToolGroup].symbolColor = this.masterColor;
            const toolbar = this.containerEl.querySelector('.hex-toolbar');
            if (toolbar) this.updateToolbarState(toolbar);
        }
    }

    exitPathEditMode() {
        let changed = false;
        for (const settings of [this.riverSettings, this.roadSettings]) {
            if (settings.editMode) {
                const isRiver = settings === this.riverSettings;
                const activeIdKey = isRiver ? 'activeRiverId' : 'activeRoadId';
                const arr = isRiver ? this.data.rivers : this.data.roads;
                const activeId = settings[activeIdKey];
                if (activeId != null && arr) {
                    const idx = arr.findIndex(p => p.id === activeId);
                    if (idx !== -1 && arr[idx].waypoints.length < 2) {
                        arr.splice(idx, 1);
                    }
                }
                settings.editMode = false;
                settings[activeIdKey] = null;
                settings.insertAfter = null;
                changed = true;
            }
        }
        if (this.pathPickerBtn) {
            setIcon(this.pathPickerBtn, 'mouse-pointer');
            this.pathPickerBtn.style.background = BUTTON_BG_DEFAULT;
            this.pathPickerBtn.style.color = '';
            this.pathPickerBtn.setAttribute('title', t('tooltip.pathPicker'));
        }
        this.pathPickMode = false;
        this.patternPickMode = false;
        if (this.patternPickerBtn) {
            this.patternPickerBtn.style.background = BUTTON_BG_DEFAULT;
        }
        this.borderPickMode = false;
        if (this.borderPickerBtn) {
            this.borderPickerBtn.style.background = BUTTON_BG_DEFAULT;
            this.borderPickerBtn.style.color = '';
        }
        this.colorPickMode = false;
        if (this.colorEyedropperBtn) {
            this.colorEyedropperBtn.style.background = BUTTON_BG_DEFAULT;
            this.colorEyedropperBtn.style.color = '';
        }
        if (this.borderSettings.activeRegionId !== null) {
            this.borderSettings.activeRegionId = null;
            this.borderSettings.pickedHex = null;
            if (this.drawMode === 'eraser') this.drawMode = 'pen';
            changed = true;
        }
        if (changed) this.render();
    }

    createBorderButton(toolbar) {
        const wrapper = toolbar.createDiv({
            style: 'display: inline-flex; flex-direction: column; gap: 2px;'
        });

        const topRow = wrapper.createDiv({ style: 'display: flex; gap: 2px; align-items: center;' });

        const btn = this.createToolButton(topRow, { icon: 'shield', title: t('tooltip.border'), dataset: { toolGroup: 'border' } });
        this.borderBtn = btn;

        btn.onclick = () => {
            const wasPatternActive = this.currentToolGroup === 'pattern';
            const wasHidden = !this.borderSettings.visible;
            this.exitPathEditMode();
            this.borderPickMode = false;
            this.borderSettings.activeRegionId = null;
            this.borderSettings.pickedHex = null;
            this.currentToolGroup = 'border';
            this.drawMode = 'pen';
            if (wasHidden) this.borderSettings.visible = true;
            this.updateToolbarState(toolbar);
            if (wasPatternActive || wasHidden) {
                this.render();
            }
            this.requestSave();
        };

        const pickerBtn = this.createToolButton(topRow, { icon: 'mouse-pointer', title: t('tooltip.borderPicker') });
        this.borderPickerBtn = pickerBtn;
        pickerBtn.onclick = () => {
            if (this.borderSettings.activeRegionId !== null) {
                this.borderSettings.activeRegionId = null;
                this.borderSettings.pickedHex = null;
                if (this.drawMode === 'eraser') this.drawMode = 'pen';
                this.updateToolbarState(toolbar);
                this.render();
                return;
            }
            const wasActive = this.borderPickMode;
            this.exitPathEditMode();
            this.borderPickMode = !wasActive;
            this.currentToolGroup = this.borderPickMode ? null : 'border';
            this.drawMode = 'pen';
            pickerBtn.style.background = this.borderPickMode ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            pickerBtn.style.color = this.borderPickMode ? 'var(--text-on-accent)' : '';
            this.updateToolbarState(toolbar);
        };

        const visBtn = this.createToolButton(topRow, { icon: this.borderSettings.visible ? 'eye' : 'eye-off', title: t('tooltip.borderVisibility') });
        visBtn.style.opacity = this.borderSettings.visible ? '1' : '0.4';
        visBtn.onclick = () => {
            this.borderSettings.visible = !this.borderSettings.visible;
            setIcon(visBtn, this.borderSettings.visible ? 'eye' : 'eye-off');
            visBtn.style.opacity = this.borderSettings.visible ? '1' : '0.4';
            this.render();
            this.requestSave();
        };
        this.borderVisBtn = visBtn;

        const inputRow = wrapper.createDiv({ style: 'display: flex; gap: 2px;' });

        const dashesInput = inputRow.createEl('input', {
            type: 'number',
            value: (this.borderSettings.dashes || DEFAULT_BORDER_DASHES).toString(),
            attr: { title: t('input.borderDashes'), min: '1', max: '99', style: `height: ${TOOLBAR_INPUT_HEIGHT}; font-size: ${TOOLBAR_INPUT_FONT_SIZE}; padding: 2px; box-sizing: border-box;` }
        });
        this.makeInputInteractive(dashesInput);
        this.borderDashesInput = dashesInput;
        dashesInput.oninput = (e) => {
            if (e.target.value.length > 2) e.target.value = e.target.value.slice(0, 2);
            this.borderSettings.dashes = Math.min(99, Math.max(1, parseInt(e.target.value) || DEFAULT_BORDER_DASHES));
            e.target.value = this.borderSettings.dashes;
            const region = this.data.borders && this.data.borders.find(r => r.id === this.borderSettings.activeRegionId);
            if (region) region.dashes = this.borderSettings.dashes;
            this.render();
        };

        setTimeout(() => {
            dashesInput.style.width = `${btn.offsetWidth}px`;
        }, 0);
    }

    makeInputInteractive(input) {
        input.addEventListener('mousedown', (e) => e.stopPropagation());
        input.addEventListener('keydown', (e) => e.stopPropagation());
        input.addEventListener('pointerdown', (e) => e.stopPropagation());
    }

    createToolButton(parent, { icon, title, dataset, style }: any = {}) {
        const btn = parent.createEl('button', {
            cls: 'hex-tool-btn',
            attr: { title, ...(style ? { style } : {}) }
        });
        btn.style.background = BUTTON_BG_DEFAULT;
        if (dataset) Object.assign(btn.dataset, dataset);
        if (icon) setIcon(btn, icon);
        return btn;
    }

    recalcToolbarWidths() {
        if (this.riverBtn && this.roadBtn && this.riverWidthInput && this.roadWidthInput) {
            this.riverWidthInput.style.width = `${this.riverBtn.offsetWidth}px`;
            this.roadWidthInput.style.width = `${this.roadBtn.offsetWidth}px`;
            if (this.pathDashesInput && this.pathPickerBtn) this.pathDashesInput.style.width = `${this.pathPickerBtn.offsetWidth}px`;
        }
        if (this.borderBtn && this.borderDashesInput) {
            this.borderDashesInput.style.width = `${this.borderBtn.offsetWidth}px`;
        }
    }

    updateToolbarState(toolbar) {
        if (this.editModeBtn) {
            this.editModeBtn.classList.toggle('active', this.editMode);
            this.editModeBtn.style.background = this.editMode ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            this.editModeBtn.style.border = this.editMode ? ACTIVE_BORDER : '';
            this.editModeBtn.style.boxShadow = this.editMode ? ACTIVE_BOX_SHADOW : '';
        }
        if (this.editContent) this.editContent.style.display = this.editMode ? 'contents' : 'none';

        if (this.borderVisBtn) {
            setIcon(this.borderVisBtn, this.borderSettings.visible ? 'eye' : 'eye-off');
            this.borderVisBtn.style.opacity = this.borderSettings.visible ? '1' : '0.4';
        }

        if (this.riverWidthInput) this.riverWidthInput.value = this.riverSettings.width.toString();
        if (this.roadWidthInput) this.roadWidthInput.value = this.roadSettings.width.toString();

        const activePathSettings = this.currentToolGroup === 'river' ? this.riverSettings : this.roadSettings;
        if (this.pathPickerBtn) {
            if (activePathSettings.editMode) {
                setIcon(this.pathPickerBtn, 'check');
                this.pathPickerBtn.style.background = PICKER_ACTIVE_BG;
                this.pathPickerBtn.style.color = 'var(--text-on-accent)';
                this.pathPickerBtn.setAttribute('title', t('tooltip.pathFinish'));
            } else if (!this.pathPickMode) {
                setIcon(this.pathPickerBtn, 'mouse-pointer');
                this.pathPickerBtn.style.background = BUTTON_BG_DEFAULT;
                this.pathPickerBtn.style.color = '';
                this.pathPickerBtn.setAttribute('title', t('tooltip.pathPicker'));
            }
        }

        if (this.borderPickerBtn) {
            if (this.borderSettings.activeRegionId !== null) {
                setIcon(this.borderPickerBtn, 'check');
                this.borderPickerBtn.style.background = PICKER_ACTIVE_BG;
                this.borderPickerBtn.style.color = 'var(--text-on-accent)';
                this.borderPickerBtn.setAttribute('title', t('tooltip.borderFinish'));
            } else if (!this.borderPickMode) {
                setIcon(this.borderPickerBtn, 'mouse-pointer');
                this.borderPickerBtn.style.background = BUTTON_BG_DEFAULT;
                this.borderPickerBtn.style.color = '';
                this.borderPickerBtn.setAttribute('title', t('tooltip.borderPicker'));
            }
        }

        if (this.borderDashesInput) this.borderDashesInput.value = (this.borderSettings.dashes || DEFAULT_BORDER_DASHES).toString();

        toolbar.querySelectorAll('[data-draw-mode]').forEach(btn => {
            const isActive = btn.dataset.drawMode === this.drawMode;
            btn.classList.toggle('active', isActive);
            btn.style.background = isActive ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            btn.style.border = isActive ? ACTIVE_BORDER : '';
            btn.style.boxShadow = isActive ? ACTIVE_BOX_SHADOW : '';
        });

        ['grass', 'tree', 'mountain', 'building'].forEach(groupId => {
            const config = this.toolConfigs[groupId];
            const wrapper = toolbar.querySelector(`[data-tool-group-wrapper="${groupId}"]`);
            const btn = toolbar.querySelector(`[data-tool-group="${groupId}"]`);

            if (!btn || !config || !wrapper) return;

            const isActive = this.currentToolGroup === groupId;
            btn.classList.toggle('active', isActive);

            const currentVariant = config.variants.find(v => v.id === config.currentVariant);
            if (currentVariant) {
                btn.setAttribute('title', t('tooltip.toolGroupVariant', { label: currentVariant.label }));
            }

            btn.style.background = isActive ? PICKER_ACTIVE_BG : (config.backgroundEnabled ? config.backgroundColor : BUTTON_BG_DEFAULT);
            btn.style.color = config.symbolColor;

            btn.style.border = isActive ? ACTIVE_BORDER : '';
            btn.style.boxShadow = isActive ? ACTIVE_BOX_SHADOW : '';
        });

        toolbar.querySelectorAll('[data-tool-group]').forEach(btn => {
            const groupId = btn.dataset.toolGroup;
            if (!['grass', 'tree', 'mountain', 'building'].includes(groupId)) {
                const isPending = this.pathPickPending && (groupId === 'river' || groupId === 'road');
                const isActive = !isPending && btn.dataset.toolGroup === this.currentToolGroup;
                btn.classList.toggle('active', isActive);
                btn.style.background = isActive ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
                btn.style.border = (isActive || isPending) ? ACTIVE_BORDER : '';
                btn.style.boxShadow = (isActive || isPending) ? ACTIVE_BOX_SHADOW : '';
                if (groupId === 'hexcolor') {
                    btn.style.color = this.hexColorColor;
                }
            }
        });

        toolbar.querySelectorAll('.hex-color-slot').forEach(slot => {
            const pk = slot.dataset.paletteKey;
            const pi = parseInt(slot.dataset.paletteIndex);
            if (pk && this[pk]) {
                slot.style.backgroundColor = this[pk][pi];
            }
        });
    }


    getTextAt(worldX, worldY) {
        if (!this.data.texts) return null;
        return this.data.texts.find(t => {
            const weight = t.bold ? "bold " : "";
            this.ctx.font = `${weight}${t.size || 16}px Verdana`;
            const metrics = this.ctx.measureText(t.text);
            const halfWidth = metrics.width / 2;
            const height = t.size || 16;
            return worldX >= t.x - halfWidth - 5 && worldX <= t.x + halfWidth + 5 &&
                   worldY >= t.y - height && worldY <= t.y + 5;
        });
    }

    setupEventListeners() {
        this.containerEl.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                this.historyManager.undo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                this.historyManager.redo();
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            this.canvas.focus();
            const world = this.getWorldCoords(e);

            if (e.button === 1 || e.shiftKey) {
                this.isDraggingMap = true;
                return;
            }

            if (e.button === 2 && this.editMode) {
                e.preventDefault();
                const now = Date.now();
                const hex = this.pixelToHex(world.x, world.y);
                const key = `${hex.q}_${hex.r}`;
                if (this._rightClickLast && now - this._rightClickLast.time < 400 && this._rightClickLast.key === key) {
                    this._rightClickLast = null;
                    this.handleEraserFlood(hex);
                    this.render();
                    this.requestSave();
                    return;
                }
                this._rightClickLast = { time: now, key };
                this.isRightMouseErasing = true;
                this.rightEraseLastHex = null;
                this.historyManager.push();
                this.handleEraser(hex, world.x, world.y);
                this.rightEraseLastHex = key;
                this.render();
                return;
            }

            this.historyManager.markPending();
            this.isMouseDown = true;
            this.mouseDownPos = { x: world.x, y: world.y };
            this.startHex = this.pixelToHex(world.x, world.y);
            this.lastHex = this.startHex;

            if (this.colorPickMode) {
                const cx = Math.round(this.mouseDownPos.x * this.data.zoom + this.data.offX);
                const cy = Math.round(this.mouseDownPos.y * this.data.zoom + this.data.offY);
                if (cx >= 0 && cy >= 0 && cx < this.canvas.width && cy < this.canvas.height) {
                    const pixel = this.ctx.getImageData(cx, cy, 1, 1).data;
                    if (pixel[3] > 0) {
                        this.masterColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
                        if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                        this.updateActivePathColor();
                        new Notice(t('notice.colorPicked'));
                    } else {
                        new Notice(t('notice.noColorAtPosition'));
                    }
                } else {
                    new Notice(t('notice.noColorAtPosition'));
                }
                this.colorPickMode = false;
                if (this.colorEyedropperBtn) { this.colorEyedropperBtn.style.background = BUTTON_BG_DEFAULT; this.colorEyedropperBtn.style.color = ''; }
                this.isMouseDown = false;
                const toolbar = this.containerEl.querySelector('.hex-toolbar');
                if (toolbar) this.updateToolbarState(toolbar);
                this.render();
                return;
            }

            if (this.patternPickMode) {
                const key = `${this.startHex.q}_${this.startHex.r}`;
                const hexData = this.data.hexes[key];
                if (hexData) {
                    this.patternData = JSON.parse(JSON.stringify(hexData));
                    this.patternSourceHex = { q: this.startHex.q, r: this.startHex.r };
                    new Notice(t('notice.patternPicked'));
                    this.currentToolGroup = 'pattern';
                    this.drawMode = 'pen';
                } else {
                    this.patternData = null;
                    this.patternSourceHex = null;
                    new Notice(t('notice.noHexAtPosition'));
                }
                this.patternPickMode = false;
                if (this.patternPickerBtn) {
                    this.patternPickerBtn.style.background = BUTTON_BG_DEFAULT;
                }
                const toolbar = this.containerEl.querySelector('.hex-toolbar');
                if (toolbar) {
                    this.updateToolbarState(toolbar);
                }
                this.render();
                this.requestSave(); // Speichere Muster sofort
                return;
            }

            if (this.borderPickMode) {
                const clickedHex = this.startHex;
                let foundRegion = null;
                if (this.data.borders) {
                    for (const region of this.data.borders) {
                        if (region.hexes.some(b => b.q === clickedHex.q && b.r === clickedHex.r)) {
                            foundRegion = region;
                            break;
                        }
                    }
                }
                if (foundRegion) {
                    this.borderSettings.activeRegionId = foundRegion.id;
                    this.borderSettings.pickedHex = { q: clickedHex.q, r: clickedHex.r };
                    this.borderSettings.dashes = foundRegion.dashes || DEFAULT_BORDER_DASHES;
                    this.masterColor = foundRegion.color;
                    if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                    if (this.borderDashesInput) this.borderDashesInput.value = this.borderSettings.dashes.toString();
                    new Notice(t('notice.borderSelected', { id: foundRegion.id }));
                } else {
                    new Notice(t('notice.noBorderAtPosition'));
                }
                this.borderPickMode = false;
                if (this.borderPickerBtn) {
                    this.borderPickerBtn.style.background = BUTTON_BG_DEFAULT;
                    this.borderPickerBtn.style.color = '';
                }
                this.currentToolGroup = 'border';
                this.drawMode = 'pen';
                const toolbar = this.containerEl.querySelector('.hex-toolbar');
                if (toolbar) {
                    this.updateToolbarState(toolbar);
                }
                this.render();
                return;
            }

            if (this.pathPickMode) {
                this.pickPathAtHex(this.startHex);
                return;
            }

            let hitText = this.getTextAt(world.x, world.y);
            if (hitText && this.currentToolGroup === 'text' && this.drawMode === 'none') {
                this.historyManager.pushIfNeeded();
                this.draggedText = hitText;
            } else {
                this.processInput(e, true);
            }
        });

        this.canvas.addEventListener('contextmenu', (e) => {
            if (this.editMode) e.preventDefault();
        });

        this.canvas.addEventListener('dblclick', (e) => {
            if (!this.editMode) return;
            if (e.button === 2 || this.drawMode === 'eraser') {
                const world = this.getWorldCoords(e);
                const hex = this.pixelToHex(world.x, world.y);
                this.historyManager.dropLast();
                this.handleEraserFlood(hex);
                this.render();
                this.requestSave();
            }
        });

        this.containerEl.addEventListener('mousemove', (e) => {
            const world = this.getWorldCoords(e);
            if (this.isRightMouseErasing) {
                const hex = this.pixelToHex(world.x, world.y);
                const key = `${hex.q}_${hex.r}`;
                if (key !== this.rightEraseLastHex) {
                    this.handleEraser(hex, world.x, world.y);
                    this.rightEraseLastHex = key;
                    this.render();
                }
                return;
            }
            if (this.isDraggingMap) {
                this.data.offX += e.movementX;
                this.data.offY += e.movementY;
                this.render();
            } else if (this.draggedText) {
                this.draggedText.x = world.x;
                this.draggedText.y = world.y;
                this.render();
            } else if (this.isMouseDown) {
                if (!this.editMode) {
                    this.data.offX += e.movementX;
                    this.data.offY += e.movementY;
                    this.render();
                } else if (this.roadDragIndex !== null && this.roadSettings.editMode) {
                    const road = this.data.roads && this.data.roads.find(r => r.id === this.roadSettings.activeRoadId);
                    if (road) {
                        const currentHex = this.pixelToHex(world.x, world.y);
                        const curQ = road.waypoints[this.roadDragIndex.idx].q;
                        const curR = road.waypoints[this.roadDragIndex.idx].r;
                        if (curQ !== currentHex.q || curR !== currentHex.r) {
                            this.historyManager.pushIfNeeded();
                            this.roadDragIndex.group.forEach(i => {
                                road.waypoints[i].q = currentHex.q;
                                road.waypoints[i].r = currentHex.r;
                            });
                            this.render();
                        }
                    }
                } else if (this.riverDragIndex !== null && this.riverSettings.editMode) {
                    const river = this.data.rivers && this.data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
                    if (river) {
                        const currentHex = this.pixelToHex(world.x, world.y);
                        const curQ = river.waypoints[this.riverDragIndex.idx].q;
                        const curR = river.waypoints[this.riverDragIndex.idx].r;
                        if (curQ !== currentHex.q || curR !== currentHex.r) {
                            this.historyManager.pushIfNeeded();
                            this.riverDragIndex.group.forEach(i => {
                                river.waypoints[i].q = currentHex.q;
                                river.waypoints[i].r = currentHex.r;
                            });
                            this.render();
                        }
                    }
                } else {
                    this.processInput(e, false);
                    this.render();
                }
            }

            const hoverText = this.getTextAt(world.x, world.y);
            if (hoverText && hoverText.link) {
                this.canvas.title = `${hoverText.link}`;
                this.canvas.style.cursor = 'pointer';
            } else {
                this.canvas.title = '';
                this.canvas.style.cursor = (hoverText && this.currentToolGroup === 'text') ? 'text' : 'crosshair';
            }
        });

        const stop = (e) => {
            if (this.isRightMouseErasing) {
                this.isRightMouseErasing = false;
                this.rightEraseLastHex = null;
                this.requestSave();
                return;
            }
            const world = this.getWorldCoords(e);
            if (this.isMouseDown && this.mouseDownPos) {
                if (this.roadDragIndex !== null && this.roadSettings.editMode) {
                    const dist = Math.sqrt((world.x - this.mouseDownPos.x)**2 + (world.y - this.mouseDownPos.y)**2);
                    if (dist < 5) {
                        const road = this.data.roads && this.data.roads.find(r => r.id === this.roadSettings.activeRoadId);
                        if (road) {
                            this.handleWaypointClick(road, this.roadSettings, this.roadDragIndex.idx);
                        }
                    }
                    this.roadDragIndex = null;
                    this.requestSave();
                    this.isMouseDown = false;
                    this.isDraggingMap = false;
                    this.draggedText = null;
                    this.lastHex = null;
                    this.startHex = null;
                    this.render();
                    return;
                }

                if (this.riverDragIndex !== null && this.riverSettings.editMode) {
                    const dist = Math.sqrt((world.x - this.mouseDownPos.x)**2 + (world.y - this.mouseDownPos.y)**2);
                    if (dist < 5) {
                        const river = this.data.rivers && this.data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
                        if (river) {
                            this.handleWaypointClick(river, this.riverSettings, this.riverDragIndex.idx);
                        }
                    }
                    this.riverDragIndex = null;
                    this.requestSave();
                    this.isMouseDown = false;
                    this.isDraggingMap = false;
                    this.draggedText = null;
                    this.lastHex = null;
                    this.startHex = null;
                    this.render();
                    return;
                }
                const dist = Math.sqrt((world.x - this.mouseDownPos.x)**2 + (world.y - this.mouseDownPos.y)**2);
                if (dist < 5 && this.drawMode !== 'eraser') {
                    const hitText = this.getTextAt(world.x, world.y);
                    if (hitText) {
                        if (this.currentToolGroup === 'text') {
                            const hitX = hitText.x, hitY = hitText.y;
                            new TextInputModal(this.app, (v, s, l, c, o, b, sh, shd, sho) => {
                                const target = this.data.texts.find(t => t.x === hitX && t.y === hitY);
                                if (v && target) {
                                    target.text = v; target.size = s; target.link = l;
                                    target.color = c; target.outline = o; target.bold = b;
                                    target.shadow = sh; target.shadowDistance = shd; target.shadowOpatown = sho;
                                    this.lastUsedTextSize = s; this.lastUsedTextColor = c; this.lastUsedTextOutline = o; this.lastUsedTextBold = b;
                                    this.lastUsedTextShadow = sh; this.lastUsedTextShadowDistance = shd; this.lastUsedTextShadowOpatown = sho;
                                }
                                else if (!v) { this.data.texts = this.data.texts.filter(t => !(t.x === hitX && t.y === hitY)); }
                                this.render(); this.requestSave();
                            }, hitText.text, hitText.size, hitText.link, hitText.color, hitText.outline, hitText.bold, hitText.shadow, hitText.shadowDistance, hitText.shadowOpatown, this.colorPalette, this.colorPalette2).open();
                        } else if (hitText.link) {
                            this.app.workspace.openLinkText(hitText.link, this.file.path, true);
                        }
                    }
                }
            }
            if (this.isMouseDown || this.draggedText || this.isDraggingMap) this.requestSave();
            this.isMouseDown = false;
            this.isDraggingMap = false;
            this.draggedText = null;
            this.roadDragIndex = null;
            this.riverDragIndex = null;
            this.lastHex = null;
            this.startHex = null;
            this.render();
        };
        this.containerEl.addEventListener('mouseup', stop);
        this.containerEl.addEventListener('mouseleave', stop);

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();

            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const oldZoom = this.data.zoom;
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * zoomFactor));
            if (newZoom === oldZoom) return;

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const worldX = (mouseX - this.data.offX) / oldZoom;
            const worldY = (mouseY - this.data.offY) / oldZoom;

            this.data.offX = mouseX - worldX * newZoom;
            this.data.offY = mouseY - worldY * newZoom;
            this.data.zoom = newZoom;

            this.render();
            this.requestSave();
        }, { passive: false });

        this.touchState = {
            touches: [],
            initialDistance: 0,
            initialZoom: 1,
            initialPanX: 0,
            initialPanY: 0,
            isTwoFingerGesture: false,
            touchStartTimeout: null,
            pendingTouchStart: null,
            hasMovedSinceStart: false,
            lastTapTime: 0,
            lastTapHex: null,
            lastTouchX: undefined,
            lastTouchY: undefined
        };

        this.canvas.addEventListener('touchstart', (e) => {
            this.canvas.focus();
            this.touchState.touches = Array.from(e.touches);

            if (this.touchState.touchStartTimeout) {
                clearTimeout(this.touchState.touchStartTimeout);
                this.touchState.touchStartTimeout = null;
                this.touchState.pendingTouchStart = null;
            }

            if (e.touches.length === 2) {
                e.preventDefault();
                this.touchState.isTwoFingerGesture = true;
                this.touchState.hasMovedSinceStart = false;
                this.touchState.pendingTouchStart = null;

                if (this.isMouseDown && !this.touchState.hasMovedSinceStart) {
                    this.isMouseDown = false;
                    this.draggedText = null;
                    if (!this.touchState.hasMovedSinceStart) {
                        this.historyManager.dropLast();
                    }
                }

                const touch1 = e.touches[0];
                const touch2 = e.touches[1];

                const dx = touch2.clientX - touch1.clientX;
                const dy = touch2.clientY - touch1.clientY;
                this.touchState.initialDistance = Math.sqrt(dx * dx + dy * dy);
                this.touchState.initialZoom = this.data.zoom;

                this.touchState.initialPanX = this.data.offX;
                this.touchState.initialPanY = this.data.offY;
                this.touchState.centerX = (touch1.clientX + touch2.clientX) / 2;
                this.touchState.centerY = (touch1.clientY + touch2.clientY) / 2;

                const rect = this.canvas.getBoundingClientRect();
                this.touchState.pivotX = this.touchState.centerX - rect.left;
                this.touchState.pivotY = this.touchState.centerY - rect.top;
            } else if (e.touches.length === 1) {
                this.touchState.isTwoFingerGesture = false;
                this.touchState.hasMovedSinceStart = false;

                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    button: 0,
                    bubbles: true,
                    cancelable: true
                });

                this.touchState.pendingTouchStart = {
                    touch: touch,
                    mouseEvent: mouseEvent,
                    timestamp: Date.now()
                };

                if (!this.editMode) {
                    this.touchState.lastTouchX = touch.clientX;
                    this.touchState.lastTouchY = touch.clientY;
                }

                this.touchState.touchStartTimeout = setTimeout(() => {
                    if (this.touchState.pendingTouchStart && !this.touchState.isTwoFingerGesture) {
                        if (this.touchState.lastTouchX === undefined) {
                            this.touchState.lastTouchX = this.touchState.pendingTouchStart.touch.clientX;
                            this.touchState.lastTouchY = this.touchState.pendingTouchStart.touch.clientY;
                        }
                        const world = this.getWorldCoords(this.touchState.pendingTouchStart.mouseEvent);
                        this.historyManager.markPending();
                        this.isMouseDown = true;
                        this.mouseDownPos = { x: world.x, y: world.y };
                        this.startHex = this.pixelToHex(world.x, world.y);
                        this.lastHex = this.startHex;

                        if (this.colorPickMode) {
                            const cx = Math.round(this.mouseDownPos.x * this.data.zoom + this.data.offX);
                            const cy = Math.round(this.mouseDownPos.y * this.data.zoom + this.data.offY);
                            if (cx >= 0 && cy >= 0 && cx < this.canvas.width && cy < this.canvas.height) {
                                const pixel = this.ctx.getImageData(cx, cy, 1, 1).data;
                                if (pixel[3] > 0) {
                                    this.masterColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
                                    if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                                    this.updateActivePathColor();
                                    new Notice(t('notice.colorPicked'));
                                } else {
                                    new Notice(t('notice.noColorAtPosition'));
                                }
                            } else {
                                new Notice(t('notice.noColorAtPosition'));
                            }
                            this.colorPickMode = false;
                            if (this.colorEyedropperBtn) { this.colorEyedropperBtn.style.background = BUTTON_BG_DEFAULT; this.colorEyedropperBtn.style.color = ''; }
                            this.isMouseDown = false;
                            this.touchState.pendingTouchStart = null;
                            const toolbar = this.containerEl.querySelector('.hex-toolbar');
                            if (toolbar) this.updateToolbarState(toolbar);
                            this.render();
                            return;
                        }

                        if (this.patternPickMode) {
                            const key = `${this.startHex.q}_${this.startHex.r}`;
                            const hexData = this.data.hexes[key];
                            if (hexData) {
                                this.patternData = JSON.parse(JSON.stringify(hexData));
                                this.patternSourceHex = { q: this.startHex.q, r: this.startHex.r };
                                new Notice(t('notice.patternPicked'));
                                this.currentToolGroup = 'pattern';
                                this.drawMode = 'pen';
                            } else {
                                this.patternData = null;
                                this.patternSourceHex = null;
                                new Notice(t('notice.noHexAtPosition'));
                            }
                            this.patternPickMode = false;
                            if (this.patternPickerBtn) {
                                this.patternPickerBtn.style.background = BUTTON_BG_DEFAULT;
                            }
                            const toolbar = this.containerEl.querySelector('.hex-toolbar');
                            if (toolbar) {
                                this.updateToolbarState(toolbar);
                            }
                            this.render();
                            this.requestSave();
                            this.touchState.pendingTouchStart = null;
                            return;
                        }

                        if (this.borderPickMode) {
                            const clickedHex = this.startHex;
                            let foundRegion = null;
                            if (this.data.borders) {
                                for (const region of this.data.borders) {
                                    if (region.hexes.some(b => b.q === clickedHex.q && b.r === clickedHex.r)) {
                                        foundRegion = region;
                                        break;
                                    }
                                }
                            }
                            if (foundRegion) {
                                this.borderSettings.activeRegionId = foundRegion.id;
                                this.borderSettings.pickedHex = { q: clickedHex.q, r: clickedHex.r };
                                this.borderSettings.dashes = foundRegion.dashes || DEFAULT_BORDER_DASHES;
                                this.masterColor = foundRegion.color;
                                if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                                if (this.borderDashesInput) this.borderDashesInput.value = this.borderSettings.dashes.toString();
                                new Notice(t('notice.borderSelected', { id: foundRegion.id }));
                            } else {
                                new Notice(t('notice.noBorderAtPosition'));
                            }
                            this.borderPickMode = false;
                            if (this.borderPickerBtn) { this.borderPickerBtn.style.background = BUTTON_BG_DEFAULT; this.borderPickerBtn.style.color = ''; }
                            this.currentToolGroup = 'border';
                            this.drawMode = 'pen';
                            const toolbar = this.containerEl.querySelector('.hex-toolbar');
                            if (toolbar) this.updateToolbarState(toolbar);
                            this.render();
                            this.touchState.pendingTouchStart = null;
                            return;
                        }

                        if (this.pathPickMode) {
                            this.pickPathAtHex(this.startHex);
                            this.touchState.pendingTouchStart = null;
                            return;
                        }

                        let hitText = this.getTextAt(world.x, world.y);
                        if (hitText && this.currentToolGroup === 'text' && this.drawMode === 'none') {
                            this.historyManager.pushIfNeeded();
                            this.draggedText = hitText;
                        } else {
                            this.processInput(this.touchState.pendingTouchStart.mouseEvent, true);
                        }
                    }
                    this.touchState.pendingTouchStart = null;
                    this.touchState.touchStartTimeout = null;
                }, 150); // 150ms Verzögerung
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && this.touchState.isTwoFingerGesture) {
                e.preventDefault();

                const touch1 = e.touches[0];
                const touch2 = e.touches[1];

                const dx = touch2.clientX - touch1.clientX;
                const dy = touch2.clientY - touch1.clientY;
                const currentDistance = Math.sqrt(dx * dx + dy * dy);
                const zoomFactor = currentDistance / this.touchState.initialDistance;
                const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.touchState.initialZoom * zoomFactor));

                const pivotWorldX = (this.touchState.pivotX - this.touchState.initialPanX) / this.touchState.initialZoom;
                const pivotWorldY = (this.touchState.pivotY - this.touchState.initialPanY) / this.touchState.initialZoom;

                const newOffX = this.touchState.pivotX - pivotWorldX * newZoom;
                const newOffY = this.touchState.pivotY - pivotWorldY * newZoom;

                const currentCenterX = (touch1.clientX + touch2.clientX) / 2;
                const currentCenterY = (touch1.clientY + touch2.clientY) / 2;
                const deltaX = currentCenterX - this.touchState.centerX;
                const deltaY = currentCenterY - this.touchState.centerY;

                this.data.zoom = newZoom;
                this.data.offX = newOffX + deltaX;
                this.data.offY = newOffY + deltaY;

                this.render();
            } else if (e.touches.length === 1 && !this.touchState.isTwoFingerGesture) {
                if (!this.isMouseDown && this.touchState.pendingTouchStart) {
                    if (!this.editMode) {
                        e.preventDefault();
                        this.touchState.hasMovedSinceStart = true;
                        const touch = e.touches[0];
                        if (this.touchState.lastTouchX !== undefined) {
                            this.data.offX += touch.clientX - this.touchState.lastTouchX;
                            this.data.offY += touch.clientY - this.touchState.lastTouchY;
                            this.render();
                        }
                        this.touchState.lastTouchX = touch.clientX;
                        this.touchState.lastTouchY = touch.clientY;
                    }
                    return;
                }

                e.preventDefault();
                this.touchState.hasMovedSinceStart = true;

                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    bubbles: true,
                    cancelable: true
                });

                const world = this.getWorldCoords(mouseEvent);

                if (this.draggedText) {
                    this.draggedText.x = world.x;
                    this.draggedText.y = world.y;
                    this.render();
                } else if (this.isMouseDown) {
                    if (!this.editMode) {
                        const touch = e.touches[0];
                        if (this.touchState.lastTouchX !== undefined) {
                            this.data.offX += touch.clientX - this.touchState.lastTouchX;
                            this.data.offY += touch.clientY - this.touchState.lastTouchY;
                            this.render();
                        }
                        this.touchState.lastTouchX = touch.clientX;
                        this.touchState.lastTouchY = touch.clientY;
                    } else if (this.roadDragIndex !== null && this.roadSettings.editMode) {
                        const road = this.data.roads && this.data.roads.find(r => r.id === this.roadSettings.activeRoadId);
                        if (road) {
                            const currentHex = this.pixelToHex(world.x, world.y);
                            const curQ = road.waypoints[this.roadDragIndex.idx].q;
                            const curR = road.waypoints[this.roadDragIndex.idx].r;
                            if (curQ !== currentHex.q || curR !== currentHex.r) {
                                this.historyManager.pushIfNeeded();
                                this.roadDragIndex.group.forEach(i => {
                                    road.waypoints[i].q = currentHex.q;
                                    road.waypoints[i].r = currentHex.r;
                                });
                                this.render();
                            }
                        }
                    } else if (this.riverDragIndex !== null && this.riverSettings.editMode) {
                        const river = this.data.rivers && this.data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
                        if (river) {
                            const currentHex = this.pixelToHex(world.x, world.y);
                            const curQ = river.waypoints[this.riverDragIndex.idx].q;
                            const curR = river.waypoints[this.riverDragIndex.idx].r;
                            if (curQ !== currentHex.q || curR !== currentHex.r) {
                                this.historyManager.pushIfNeeded();
                                this.riverDragIndex.group.forEach(i => {
                                    river.waypoints[i].q = currentHex.q;
                                    river.waypoints[i].r = currentHex.r;
                                });
                                this.render();
                            }
                        }
                    } else {
                        this.processInput(mouseEvent, false);
                        this.render();
                    }
                }
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            if (this.touchState.touchStartTimeout) {
                clearTimeout(this.touchState.touchStartTimeout);
                this.touchState.touchStartTimeout = null;
            }

            if (this.touchState.isTwoFingerGesture && e.touches.length < 2) {
                e.preventDefault();
                this.touchState.isTwoFingerGesture = false;
                this.requestSave();
            } else if (e.touches.length === 0 && !this.touchState.isTwoFingerGesture) {
                e.preventDefault();

                if (this.touchState.pendingTouchStart && !this.isMouseDown) {
                    const world = this.getWorldCoords(this.touchState.pendingTouchStart.mouseEvent);
                    this.historyManager.markPending();
                    this.isMouseDown = true;
                    this.mouseDownPos = { x: world.x, y: world.y };
                    this.startHex = this.pixelToHex(world.x, world.y);
                    this.lastHex = this.startHex;

                    if (this.colorPickMode) {
                        const cx = Math.round(this.mouseDownPos.x * this.data.zoom + this.data.offX);
                        const cy = Math.round(this.mouseDownPos.y * this.data.zoom + this.data.offY);
                        if (cx >= 0 && cy >= 0 && cx < this.canvas.width && cy < this.canvas.height) {
                            const pixel = this.ctx.getImageData(cx, cy, 1, 1).data;
                            if (pixel[3] > 0) {
                                this.masterColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
                                if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                                this.updateActivePathColor();
                                new Notice(t('notice.colorPicked'));
                            } else {
                                new Notice(t('notice.noColorAtPosition'));
                            }
                        } else {
                            new Notice(t('notice.noColorAtPosition'));
                        }
                        this.colorPickMode = false;
                        if (this.colorEyedropperBtn) { this.colorEyedropperBtn.style.background = BUTTON_BG_DEFAULT; this.colorEyedropperBtn.style.color = ''; }
                        this.isMouseDown = false;
                        this.touchState.pendingTouchStart = null;
                        const toolbar = this.containerEl.querySelector('.hex-toolbar');
                        if (toolbar) this.updateToolbarState(toolbar);
                        this.render();
                        return;
                    }

                    if (this.patternPickMode) {
                        const key = `${this.startHex.q}_${this.startHex.r}`;
                        const hexData = this.data.hexes[key];
                        if (hexData) {
                            this.patternData = JSON.parse(JSON.stringify(hexData));
                            this.patternSourceHex = { q: this.startHex.q, r: this.startHex.r };
                            new Notice(t('notice.patternPicked'));
                            this.currentToolGroup = 'pattern';
                            this.drawMode = 'pen';
                        } else {
                            this.patternData = null;
                            this.patternSourceHex = null;
                            new Notice(t('notice.noHexAtPosition'));
                        }
                        this.patternPickMode = false;
                        if (this.patternPickerBtn) {
                            this.patternPickerBtn.style.background = BUTTON_BG_DEFAULT;
                        }
                        const toolbar = this.containerEl.querySelector('.hex-toolbar');
                        if (toolbar) {
                            this.updateToolbarState(toolbar);
                        }
                        this.render();
                        this.requestSave();
                        this.touchState.pendingTouchStart = null;
                        this.isMouseDown = false;
                        return;
                    }

                    if (this.borderPickMode) {
                        const clickedHex = this.startHex;
                        let foundRegion = null;
                        if (this.data.borders) {
                            for (const region of this.data.borders) {
                                if (region.hexes.some(b => b.q === clickedHex.q && b.r === clickedHex.r)) {
                                    foundRegion = region;
                                    break;
                                }
                            }
                        }
                        if (foundRegion) {
                            this.borderSettings.activeRegionId = foundRegion.id;
                            this.borderSettings.pickedHex = { q: clickedHex.q, r: clickedHex.r };
                            this.borderSettings.dashes = foundRegion.dashes || DEFAULT_BORDER_DASHES;
                            this.masterColor = foundRegion.color;
                            if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
                            if (this.borderDashesInput) this.borderDashesInput.value = this.borderSettings.dashes.toString();
                            new Notice(t('notice.borderSelected', { id: foundRegion.id }));
                        } else {
                            new Notice(t('notice.noBorderAtPosition'));
                        }
                        this.borderPickMode = false;
                        if (this.borderPickerBtn) { this.borderPickerBtn.style.background = BUTTON_BG_DEFAULT; this.borderPickerBtn.style.color = ''; }
                        this.currentToolGroup = 'border';
                        this.drawMode = 'pen';
                        const toolbar = this.containerEl.querySelector('.hex-toolbar');
                        if (toolbar) this.updateToolbarState(toolbar);
                        this.render();
                        this.touchState.pendingTouchStart = null;
                        this.isMouseDown = false;
                        return;
                    }

                    if (this.pathPickMode) {
                        this.pickPathAtHex(this.startHex);
                        this.touchState.pendingTouchStart = null;
                        this.isMouseDown = false;
                        return;
                    }

                    let hitText = this.getTextAt(world.x, world.y);
                    if (hitText && this.currentToolGroup === 'text' && this.drawMode === 'none') {
                        this.historyManager.pushIfNeeded();
                        this.draggedText = hitText;
                    } else {
                        this.processInput(this.touchState.pendingTouchStart.mouseEvent, true);
                    }
                }

                const touch = e.changedTouches[0];
                const mouseEvent = new MouseEvent('mouseup', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    bubbles: true,
                    cancelable: true
                });

                const world = this.getWorldCoords(mouseEvent);

                if (this.isMouseDown && this.mouseDownPos) {
                    if (this.roadDragIndex !== null && this.roadSettings.editMode) {
                        const dist = Math.sqrt((world.x - this.mouseDownPos.x)**2 + (world.y - this.mouseDownPos.y)**2);
                        if (dist < 5) {
                            const road = this.data.roads && this.data.roads.find(r => r.id === this.roadSettings.activeRoadId);
                            if (road) {
                                this.handleWaypointClick(road, this.roadSettings, this.roadDragIndex.idx);
                            }
                        }
                        this.roadDragIndex = null;
                        this.requestSave();
                        this.isMouseDown = false;
                        this.draggedText = null;
                        this.lastHex = null;
                        this.startHex = null;
                        this.touchState.pendingTouchStart = null;
                        this.render();
                        return;
                    }

                    if (this.riverDragIndex !== null && this.riverSettings.editMode) {
                        const dist = Math.sqrt((world.x - this.mouseDownPos.x)**2 + (world.y - this.mouseDownPos.y)**2);
                        if (dist < 5) {
                            const river = this.data.rivers && this.data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
                            if (river) {
                                this.handleWaypointClick(river, this.riverSettings, this.riverDragIndex.idx);
                            }
                        }
                        this.riverDragIndex = null;
                        this.requestSave();
                        this.isMouseDown = false;
                        this.draggedText = null;
                        this.lastHex = null;
                        this.startHex = null;
                        this.touchState.pendingTouchStart = null;
                        this.render();
                        return;
                    }
                    const dist = Math.sqrt((world.x - this.mouseDownPos.x)**2 + (world.y - this.mouseDownPos.y)**2);
                    if (dist < 5 && this.drawMode !== 'eraser') {
                        const hitText = this.getTextAt(world.x, world.y);
                        if (hitText) {
                            if (this.currentToolGroup === 'text') {
                                const hitX = hitText.x, hitY = hitText.y;
                                new TextInputModal(this.app, (v, s, l, c, o, b, sh, shd, sho) => {
                                    const target = this.data.texts.find(t => t.x === hitX && t.y === hitY);
                                    if (v && target) {
                                        target.text = v; target.size = s; target.link = l;
                                        target.color = c; target.outline = o; target.bold = b;
                                        target.shadow = sh; target.shadowDistance = shd; target.shadowOpatown = sho;
                                        this.lastUsedTextSize = s; this.lastUsedTextColor = c; this.lastUsedTextOutline = o; this.lastUsedTextBold = b;
                                        this.lastUsedTextShadow = sh; this.lastUsedTextShadowDistance = shd; this.lastUsedTextShadowOpatown = sho;
                                    }
                                    else if (!v) { this.data.texts = this.data.texts.filter(t => !(t.x === hitX && t.y === hitY)); }
                                    this.render(); this.requestSave();
                                }, hitText.text, hitText.size, hitText.link, hitText.color, hitText.outline, hitText.bold, hitText.shadow, hitText.shadowDistance, hitText.shadowOpatown, this.colorPalette, this.colorPalette2).open();
                            } else if (hitText.link) {
                                this.app.workspace.openLinkText(hitText.link, this.file.path, true);
                            }
                        }
                    }
                }
                if (this.isMouseDown || this.draggedText || this.touchState.hasMovedSinceStart) this.requestSave();

                if (this.editMode && this.drawMode === 'eraser' && e.changedTouches.length > 0) {
                    const tapTouch = e.changedTouches[0];
                    const tapEvent = new MouseEvent('mouseup', { clientX: tapTouch.clientX, clientY: tapTouch.clientY, bubbles: true, cancelable: true });
                    const tapWorld = this.getWorldCoords(tapEvent);
                    const tapHex = this.pixelToHex(tapWorld.x, tapWorld.y);
                    const now = Date.now();

                    if (this.touchState.lastTapTime &&
                        now - this.touchState.lastTapTime < 400 &&
                        this.touchState.lastTapHex &&
                        this.touchState.lastTapHex.q === tapHex.q &&
                        this.touchState.lastTapHex.r === tapHex.r) {
                        this.historyManager.dropLast();
                        this.handleEraserFlood(tapHex);
                        this.render();
                        this.requestSave();
                        this.touchState.lastTapTime = 0;
                        this.touchState.lastTapHex = null;
                    } else {
                        this.touchState.lastTapTime = now;
                        this.touchState.lastTapHex = { q: tapHex.q, r: tapHex.r };
                    }
                }

                this.isMouseDown = false;
                this.draggedText = null;
                this.roadDragIndex = null;
                this.riverDragIndex = null;
                this.lastHex = null;
                this.startHex = null;
                this.touchState.pendingTouchStart = null;
                this.touchState.lastTouchX = undefined;
                this.touchState.lastTouchY = undefined;
                this.render();
            }

            this.touchState.touches = Array.from(e.touches);
        }, { passive: false });

        this.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();

            if (this.touchState.touchStartTimeout) {
                clearTimeout(this.touchState.touchStartTimeout);
                this.touchState.touchStartTimeout = null;
            }

            this.touchState.isTwoFingerGesture = false;
            this.touchState.pendingTouchStart = null;
            this.touchState.lastTouchX = undefined;
            this.touchState.lastTouchY = undefined;
            this.isMouseDown = false;
            this.draggedText = null;
            this.roadDragIndex = null;
            this.riverDragIndex = null;
            this.lastHex = null;
            this.startHex = null;
            this.touchState.touches = [];
            this.render();
        }, { passive: false });
    }

    calculateHexPath(start, end, width) { return calculateHexPath(start, end, width); }

    hexDistance(a, b) { return hexDistance(a, b); }

    hexLerp(a, b, t) { return hexLerp(a, b, t); }

    processInput(e, isInitial) {
        this.historyManager.pushIfNeeded();
        const world = this.getWorldCoords(e);
        if (!isFinite(world.x) || !isFinite(world.y) || Math.abs(world.x) > 1e6 || Math.abs(world.y) > 1e6) {
            console.warn('Rejected processInput: implausible world coords', world);
            return;
        }
        const hex = this.pixelToHex(world.x, world.y);

        if (this.currentToolGroup === 'text' && this.drawMode === 'none' && isInitial) {
            const existingText = this.getTextAt(world.x, world.y);
            if (!existingText) {
                new TextInputModal(this.app, (v, s, l, c, o, b, sh, shd, sho) => {
                    if(v) {
                        this.data.texts.push({text: v, x: world.x, y: world.y, size: s, link: l, color: c, outline: o, bold: b, shadow: sh, shadowDistance: shd, shadowOpatown: sho});
                        this.lastUsedTextSize = s; this.lastUsedTextColor = c; this.lastUsedTextOutline = o; this.lastUsedTextBold = b;
                        this.lastUsedTextShadow = sh; this.lastUsedTextShadowDistance = shd; this.lastUsedTextShadowOpatown = sho;
                        this.render(); this.requestSave();
                    }
                }, '', this.lastUsedTextSize, '', this.lastUsedTextColor || this.masterColor, this.lastUsedTextOutline, this.lastUsedTextBold, this.lastUsedTextShadow, this.lastUsedTextShadowDistance, this.lastUsedTextShadowOpatown, this.colorPalette, this.colorPalette2).open();
            }
            return;
        }

        if (!this.editMode || this.drawMode === 'none') {
            return;
        }

        if (this.drawMode === 'eraser') {
            this.handleEraser(hex, world.x, world.y);
        } else if (this.drawMode === 'fill') {
            if (isInitial) this.handleFillTool(hex);
        } else if (this.drawMode === 'pen') {
            if (this.currentToolGroup === 'border') {
                this.addBorderHex(hex);
            } else if (this.currentToolGroup === 'road' && isInitial) {
                this.addRoadWaypoint(hex);
            } else if (this.currentToolGroup === 'river' && isInitial) {
                this.addRiverWaypoint(hex);
            } else if (!['river', 'road', 'text'].includes(this.currentToolGroup)) {
                this.paintHex(hex);
            }
        }
    }

    addBorderHex(hex) {
        if (!this.data.borders) this.data.borders = [];

        const hq = Math.round(hex.q);
        const hr = Math.round(hex.r);

        const bounds = this.getHexBounds();
        if (bounds && (hq < bounds.minQ - 50 || hq > bounds.maxQ + 50 || hr < bounds.minR - 50 || hr > bounds.maxR + 50)) {
            console.warn('Rejected border hex: outside plausible range', { q: hq, r: hr, bounds });
            return;
        }

        let region = this.data.borders.find(r => r.id === this.borderSettings.activeRegionId);
        if (!region) {
            const maxId = this.data.borders.reduce((max, r) => Math.max(max, r.id || 0), 0);
            region = { id: maxId + 1, color: this.masterColor, dashes: this.borderSettings.dashes || DEFAULT_BORDER_DASHES, hexes: [] };
            this.data.borders.push(region);
            this.borderSettings.activeRegionId = region.id;
        }

        this.data.borders.forEach(r => {
            if (r.id !== region.id) {
                r.hexes = r.hexes.filter(b => !(b.q === hex.q && b.r === hex.r));
            }
        });
        this.data.borders = this.data.borders.filter(r => r.hexes.length > 0 || r.id === region.id);
        const exists = region.hexes.some(b => b.q === hq && b.r === hr);
        if (!exists) {
            region.hexes.push({ q: hq, r: hr });
        }

        const toolbar = this.containerEl.querySelector('.hex-toolbar');
        if (toolbar) this.updateToolbarState(toolbar);
    }

    findRoadAtHex(hex) {
        if (!this.data.roads) return null;
        for (const road of this.data.roads) {
            if (!road.waypoints || road.waypoints.length === 0) continue;
            if (road.waypoints.some(w => w.q === hex.q && w.r === hex.r)) return road;
            for (let i = 0; i < road.waypoints.length - 1; i++) {
                const segs = this.calculateHexPath(road.waypoints[i], road.waypoints[i + 1], road.width);
                for (const seg of segs) {
                    if (seg.to.q === hex.q && seg.to.r === hex.r) return road;
                    if (seg.from.q === hex.q && seg.from.r === hex.r) return road;
                }
            }
        }
        return null;
    }

    addRoadWaypoint(hex) {
        if (!this.data.roads) this.data.roads = [];

        let road = this.data.roads.find(r => r.id === this.roadSettings.activeRoadId);
        if (road) road.dashes = this.pathDashes || DEFAULT_PATH_DASHES;
        if (!road) {
            const maxId = this.data.roads.reduce((max, r) => Math.max(max, r.id || 0), 0);
            road = { id: maxId + 1, color: this.masterColor, width: this.roadSettings.width, dashes: this.pathDashes || DEFAULT_PATH_DASHES, waypoints: [] };
            this.data.roads.push(road);
            this.roadSettings.activeRoadId = road.id;
            this.roadSettings.editMode = true;
            this.roadSettings.insertAfter = null;
            if (this.pathPickerBtn) {
                setIcon(this.pathPickerBtn, 'check');
                this.pathPickerBtn.style.background = PICKER_ACTIVE_BG;
                this.pathPickerBtn.style.color = 'var(--text-on-accent)';
                this.pathPickerBtn.setAttribute('title', t('tooltip.roadFinish'));
            }
        }

        if (this.roadSettings.editMode) {
            const existingIdx = road.waypoints.findIndex(w => w.q === hex.q && w.r === hex.r);
            if (existingIdx !== -1) {
                const dragGroup = [];
                road.waypoints.forEach((wp, i) => { if (wp.q === hex.q && wp.r === hex.r) dragGroup.push(i); });
                this.roadDragIndex = { idx: existingIdx, origQ: hex.q, origR: hex.r, group: dragGroup };
                return;
            }

            for (let i = 0; i < road.waypoints.length - 1; i++) {
                const to = road.waypoints[i + 1];
                if (to.break) continue;
                const from = road.waypoints[i];
                const segs = this.calculateHexPath(from, to, road.width);
                const onSegment = segs.some(s =>
                    (s.from.q === hex.q && s.from.r === hex.r) ||
                    (s.to.q === hex.q && s.to.r === hex.r)
                );
                if (onSegment) {
                    road.waypoints.splice(i + 1, 0, { q: hex.q, r: hex.r });
                    this.roadSettings.insertAfter = i + 1;
                    return;
                }
            }
        }

        const insertIdx = this.roadSettings.insertAfter;
        if (insertIdx !== null && insertIdx < road.waypoints.length - 1) {
            const bp = road.waypoints[insertIdx];
            road.waypoints.push({ q: bp.q, r: bp.r, break: true });
            road.waypoints.push({ q: hex.q, r: hex.r });
            this.roadSettings.insertAfter = road.waypoints.length - 1;
        } else {
            road.waypoints.push({ q: hex.q, r: hex.r });
            this.roadSettings.insertAfter = road.waypoints.length - 1;
        }
    }

    findRiverAtHex(hex) {
        if (!this.data.rivers) return null;
        for (const river of this.data.rivers) {
            if (!river.waypoints || river.waypoints.length === 0) continue;
            if (river.waypoints.some(w => w.q === hex.q && w.r === hex.r)) return river;
            for (let i = 0; i < river.waypoints.length - 1; i++) {
                const segs = this.calculateHexPath(river.waypoints[i], river.waypoints[i + 1], river.width);
                for (const seg of segs) {
                    if (seg.to.q === hex.q && seg.to.r === hex.r) return river;
                    if (seg.from.q === hex.q && seg.from.r === hex.r) return river;
                }
            }
        }
        return null;
    }

    erasePathElement(paths, hex) {
        if (!paths) return;
        const onWaypoint = paths.some(p =>
            p.waypoints && p.waypoints.some(w => w.q === hex.q && w.r === hex.r)
        );
        if (onWaypoint) {
            paths.forEach(p => {
                p.waypoints = p.waypoints.filter(w => !(w.q === hex.q && w.r === hex.r));
            });
        } else {
            for (const path of paths) {
                if (!path.waypoints || path.waypoints.length < 2) continue;
                for (let i = 0; i < path.waypoints.length - 1; i++) {
                    const to = path.waypoints[i + 1];
                    if (to.break) continue;
                    const from = path.waypoints[i];
                    const segs = this.calculateHexPath(from, to, path.width);
                    const onSegment = segs.some(s =>
                        (s.from.q === hex.q && s.from.r === hex.r) ||
                        (s.to.q === hex.q && s.to.r === hex.r)
                    );
                    if (onSegment) {
                        to.break = true;
                        break;
                    }
                }
            }
        }
        paths.forEach(path => {
            let changed = true;
            while (changed) {
                changed = false;
                for (let j = path.waypoints.length - 1; j >= 0; j--) {
                    const hasLeft = j > 0 && !path.waypoints[j].break;
                    const hasRight = j < path.waypoints.length - 1 && !path.waypoints[j + 1].break;
                    if (!hasLeft && !hasRight) {
                        path.waypoints.splice(j, 1);
                        changed = true;
                    }
                }
            }
            if (path.waypoints.length > 0 && path.waypoints[0].break) {
                delete path.waypoints[0].break;
            }
        });
        for (let i = paths.length - 1; i >= 0; i--) {
            if (paths[i].waypoints.length < 2) paths.splice(i, 1);
        }
    }

    addRiverWaypoint(hex) {
        if (!this.data.rivers) this.data.rivers = [];

        let river = this.data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
        if (river) river.dashes = this.pathDashes || DEFAULT_PATH_DASHES;
        if (!river) {
            const maxId = this.data.rivers.reduce((max, r) => Math.max(max, r.id || 0), 0);
            river = { id: maxId + 1, color: this.masterColor, width: this.riverSettings.width, dashes: this.pathDashes || DEFAULT_PATH_DASHES, waypoints: [] };
            this.data.rivers.push(river);
            this.riverSettings.activeRiverId = river.id;
            this.riverSettings.editMode = true;
            this.riverSettings.insertAfter = null;
            if (this.pathPickerBtn) {
                setIcon(this.pathPickerBtn, 'check');
                this.pathPickerBtn.style.background = PICKER_ACTIVE_BG;
                this.pathPickerBtn.style.color = 'var(--text-on-accent)';
                this.pathPickerBtn.setAttribute('title', t('tooltip.riverFinish'));
            }
        }

        if (this.riverSettings.editMode) {
            const existingIdx = river.waypoints.findIndex(w => w.q === hex.q && w.r === hex.r);
            if (existingIdx !== -1) {
                const dragGroup = [];
                river.waypoints.forEach((wp, i) => { if (wp.q === hex.q && wp.r === hex.r) dragGroup.push(i); });
                this.riverDragIndex = { idx: existingIdx, origQ: hex.q, origR: hex.r, group: dragGroup };
                return;
            }

            for (let i = 0; i < river.waypoints.length - 1; i++) {
                const to = river.waypoints[i + 1];
                if (to.break) continue;
                const from = river.waypoints[i];
                const segs = this.calculateHexPath(from, to, river.width);
                const onSegment = segs.some(s =>
                    (s.from.q === hex.q && s.from.r === hex.r) ||
                    (s.to.q === hex.q && s.to.r === hex.r)
                );
                if (onSegment) {
                    river.waypoints.splice(i + 1, 0, { q: hex.q, r: hex.r });
                    this.riverSettings.insertAfter = i + 1;
                    return;
                }
            }
        }

        const insertIdx = this.riverSettings.insertAfter;
        if (insertIdx !== null && insertIdx < river.waypoints.length - 1) {
            const bp = river.waypoints[insertIdx];
            river.waypoints.push({ q: bp.q, r: bp.r, break: true });
            river.waypoints.push({ q: hex.q, r: hex.r });
            this.riverSettings.insertAfter = river.waypoints.length - 1;
        } else {
            river.waypoints.push({ q: hex.q, r: hex.r });
            this.riverSettings.insertAfter = river.waypoints.length - 1;
        }
    }

    paintHex(hex) {
        const key = `${hex.q}_${hex.r}`;
        let h = this.data.hexes[key];

        if (!h) {
            h = { q: hex.q, r: hex.r };
            this.data.hexes[key] = h;
        }

        if (this.currentToolGroup === 'pattern' && this.patternData) {
            h.color = this.patternData.backgroundColor || this.patternData.color;
            h.symbol = this.patternData.symbol;
            h.symbolColor = this.patternData.symbolColor;
            return;
        }

        if (this.currentToolGroup === 'hexcolor') {
            h.color = this.masterColor;
            return;
        }

        if (this.currentToolGroup && this.toolConfigs[this.currentToolGroup]) {
            const config = this.toolConfigs[this.currentToolGroup];
            h.symbol = config.currentVariant;
            h.symbolColor = this.masterColor;
            config.symbolColor = this.masterColor;

            if (config.backgroundEnabled) {
                h.color = config.backgroundColor;
            }
        }
        else if (this.currentToolGroup === null) {
            h.color = this.colorPalette[this.activeColorSlot];
        }
    }

    handleEraser(hex, x, y) {
        const hasRecentData = this.lastErasedHex &&
            this.lastErasedHex.q === hex.q && this.lastErasedHex.r === hex.r &&
            Date.now() - this.lastErasedHex.timestamp < 1000;

        if (!hasRecentData) {
            const preKey = `${hex.q}_${hex.r}`;
            const preData = this.data.hexes[preKey];
            const tg = this.currentToolGroup;

            if (tg === 'border') {
                const region = this.data.borders.find(r => r.hexes.some(b => b.q === hex.q && b.r === hex.r));
                this.lastErasedHex = region ? { q: hex.q, r: hex.r, type: 'border', regionId: region.id, timestamp: Date.now() } : null;
            } else if (tg === 'pattern' && preData) {
                this.lastErasedHex = { q: hex.q, r: hex.r, type: 'pattern', pattern: { color: preData.color, symbol: preData.symbol, symbolColor: preData.symbolColor }, timestamp: Date.now() };
            } else if (tg && this.toolConfigs[tg] && preData && preData.symbol) {
                this.lastErasedHex = { q: hex.q, r: hex.r, type: 'symbol', symbol: preData.symbol, timestamp: Date.now() };
            } else if ((tg === 'hexcolor' || tg === null) && preData && preData.color) {
                this.lastErasedHex = { q: hex.q, r: hex.r, type: 'color', color: preData.color, toolGroup: tg, timestamp: Date.now() };
            } else if (tg === 'river' || tg === 'road') {
                const paths = tg === 'river' ? (this.data.rivers || []) : (this.data.roads || []);
                const pathIds = [];
                for (const p of paths) {
                    if (p.waypoints && p.waypoints.some(w => w.q === hex.q && w.r === hex.r)) {
                        pathIds.push(p.id);
                        continue;
                    }
                    if (p.waypoints && p.waypoints.length >= 2) {
                        let found = false;
                        for (let i = 0; i < p.waypoints.length - 1 && !found; i++) {
                            if (p.waypoints[i + 1].break) continue;
                            const segs = this.calculateHexPath(p.waypoints[i], p.waypoints[i + 1], p.width);
                            if (segs.some(s => (s.from.q === hex.q && s.from.r === hex.r) || (s.to.q === hex.q && s.to.r === hex.r))) {
                                pathIds.push(p.id);
                                found = true;
                            }
                        }
                    }
                }
                this.lastErasedHex = pathIds.length > 0 ? { q: hex.q, r: hex.r, type: tg, pathIds, toolGroup: tg, timestamp: Date.now() } : null;
            } else {
                this.lastErasedHex = null;
            }
        }

        if (this.currentToolGroup === 'text') {
            const hit = this.getTextAt(x, y);
            if (hit) this.data.texts = this.data.texts.filter(t => t !== hit);
        } else if (this.currentToolGroup === 'border') {
            this.data.borders.forEach(r => {
                r.hexes = r.hexes.filter(b => !(b.q === hex.q && b.r === hex.r));
            });
            this.data.borders = this.data.borders.filter(r => r.hexes.length > 0);
        } else if (this.currentToolGroup === 'river') {
            this.erasePathElement(this.data.rivers, hex);
        } else if (this.currentToolGroup === 'road') {
            this.erasePathElement(this.data.roads, hex);
        } else if (this.currentToolGroup === 'hexcolor') {
            const key = `${hex.q}_${hex.r}`;
            const h = this.data.hexes[key];
            if (h) {
                delete h.color;
                if (!h.symbol) delete this.data.hexes[key];
            }
        } else if (this.currentToolGroup === 'pattern') {
            const key = `${hex.q}_${hex.r}`;
            delete this.data.hexes[key];
        } else {
            const key = `${hex.q}_${hex.r}`;
            const h = this.data.hexes[key];

            if (h) {
                if (this.currentToolGroup && this.toolConfigs[this.currentToolGroup]) {
                    const config = this.toolConfigs[this.currentToolGroup];
                    if (h.symbol) {
                        delete h.symbol;
                        delete h.symbolColor;
                        if (config.backgroundEnabled) {
                            delete h.color;
                        }
                        if (!h.symbol && !h.color) {
                            delete this.data.hexes[key];
                        }
                    }
                } else if (this.currentToolGroup === null) {
                    if (h.color || h.backgroundColor) {
                        delete h.color;
                        delete h.backgroundColor;
                        if (!h.symbol) {
                            delete this.data.hexes[key];
                        }
                    }
                }
            }
        }
    }

    handleEraserFlood(hex) {
        const last = this.lastErasedHex;
        if (!last) return;
        if (Date.now() - last.timestamp > 1000) return;
        if (last.q !== hex.q || last.r !== hex.r) return;

        if (last.type === 'symbol') {
            this.floodEraseSymbol(hex, last.symbol);
        } else if (last.type === 'color') {
            this.floodEraseColor(hex, last.color);
        } else if (last.type === 'pattern') {
            this.floodErasePattern(hex, last.pattern);
        } else if (last.type === 'border') {
            this.floodEraseBorderSegment(hex, last.regionId);
        } else if (last.type === 'river' || last.type === 'road') {
            const paths = last.type === 'river' ? this.data.rivers : this.data.roads;
            this.floodEraseEntirePath(paths, last.pathIds);
        }
        this.lastErasedHex = null;
    }

    floodEraseSymbol(startHex, targetSymbol) {
        const visited = new Set();
        const queue = this.getHexNeighbors(startHex);

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;
            if (visited.has(key)) continue;
            visited.add(key);

            const hexData = this.data.hexes[key];
            if (!hexData || hexData.symbol !== targetSymbol) continue;

            delete hexData.symbol;
            delete hexData.symbolColor;
            if (!hexData.color) {
                delete this.data.hexes[key];
            }

            const neighbors = this.getHexNeighbors(hex);
            neighbors.forEach(n => queue.push(n));
        }
    }

    floodEraseColor(startHex, targetColor) {
        const visited = new Set();
        const queue = this.getHexNeighbors(startHex);

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;
            if (visited.has(key)) continue;
            visited.add(key);

            const hexData = this.data.hexes[key];
            const currentColor = hexData ? hexData.color : null;
            if (currentColor !== targetColor) continue;

            delete hexData.color;
            if (!hexData.symbol) {
                delete this.data.hexes[key];
            }

            const neighbors = this.getHexNeighbors(hex);
            neighbors.forEach(n => queue.push(n));
        }
    }

    floodEraseEntirePath(paths, pathIds) {
        if (!paths || !pathIds || pathIds.length === 0) return;
        for (let i = paths.length - 1; i >= 0; i--) {
            if (pathIds.includes(paths[i].id)) {
                paths.splice(i, 1);
            }
        }
    }

    floodErasePattern(startHex, targetPattern) {
        const visited = new Set();
        const queue = this.getHexNeighbors(startHex);

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;
            if (visited.has(key)) continue;
            visited.add(key);

            const hexData = this.data.hexes[key];
            if (!hexData) continue;
            if (!this.hexMatchesPattern(hexData, targetPattern)) continue;

            delete this.data.hexes[key];

            const neighbors = this.getHexNeighbors(hex);
            neighbors.forEach(n => queue.push(n));
        }
    }

    floodEraseBorderSegment(startHex, regionId) {
        const region = this.data.borders.find(r => r.id === regionId);
        if (!region) return;

        const regionHexSet = new Set(region.hexes.map(h => `${h.q}_${h.r}`));
        const toRemove = new Set();
        const visited = new Set();

        const queue = [startHex, ...this.getHexNeighbors(startHex)];

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;
            if (visited.has(key)) continue;
            visited.add(key);

            if (!regionHexSet.has(key)) continue;

            toRemove.add(key);
            const neighbors = this.getHexNeighbors(hex);
            neighbors.forEach(n => queue.push(n));
        }

        region.hexes = region.hexes.filter(h => !toRemove.has(`${h.q}_${h.r}`));

        if (region.hexes.length === 0) {
            this.data.borders = this.data.borders.filter(r => r.id !== regionId);
        }
    }

    hexMatchesPattern(hex, pattern) {
        const hexColor = hex.backgroundColor || hex.color;
        const patternColor = pattern.backgroundColor || pattern.color;
        return hexColor === patternColor &&
               hex.symbol === pattern.symbol &&
               hex.symbolColor === pattern.symbolColor;
    }

    handleFillTool(startHex) {
        const key = `${startHex.q}_${startHex.r}`;
        const startData = this.data.hexes[key];

        if (!startData) {
            if (!this.isEnclosedByFrame(startHex)) {
                return; // Nicht füllen, wenn kein Rahmen vorhanden
            }
            this.floodFillEmpty(startHex);
            return;
        }

        if (this.currentToolGroup === 'pattern' && this.patternData) {
            const targetColor = startData.color;
            const targetSymbol = startData.symbol;
            this.floodFillPattern(startHex, targetColor, targetSymbol);
        }
        else if (this.currentToolGroup === 'hexcolor') {
            const targetColor = startData.color;
            this.floodFillColor(startHex, targetColor, this.masterColor);
        }
        else if (this.currentToolGroup === null) {
            const targetColor = startData.color;
            const newColor = this.colorPalette[this.activeColorSlot];
            this.floodFillColor(startHex, targetColor, newColor);
        }
        else if (this.toolConfigs[this.currentToolGroup]) {
            const config = this.toolConfigs[this.currentToolGroup];
            const targetSymbol = startData ? startData.symbol : null;
            const targetColor = startData ? startData.color : null;
            this.floodFillSymbol(startHex, targetSymbol, targetColor, config.backgroundEnabled);
        }
    }

    floodFillColor(startHex, targetColor, newColor) {
        if (targetColor === newColor) return;

        const visited = new Set();
        const queue = [startHex];

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;

            if (visited.has(key)) continue;
            visited.add(key);

            const hexData = this.data.hexes[key];
            const currentColor = hexData ? hexData.color : null;

            if (currentColor !== targetColor) continue;

            if (hexData) {
                hexData.color = newColor;
            } else {
                this.data.hexes[key] = { q: hex.q, r: hex.r, color: newColor };
            }

            const neighbors = this.getHexNeighbors(hex);
            neighbors.forEach(n => queue.push(n));
        }
    }

    floodFillSymbol(startHex, targetSymbol, targetColor, applyBackground) {
        const config = this.toolConfigs[this.currentToolGroup];
        const newSymbol = config.currentVariant;
        const newSymbolColor = config.symbolColor;
        const newBgColor = config.backgroundColor;

        const visited = new Set();
        const queue = [startHex];

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;

            if (visited.has(key)) continue;
            visited.add(key);

            const hexData = this.data.hexes[key];
            const currentSymbol = hexData ? hexData.symbol : null;
            const currentColor = hexData ? hexData.color : null;

            if (targetSymbol) {
                if (currentSymbol !== targetSymbol) continue;
            } else {
                if (currentSymbol || currentColor !== targetColor) continue;
            }

            if (!hexData) {
                this.data.hexes[key] = {
                    q: hex.q,
                    r: hex.r,
                    symbol: newSymbol,
                    symbolColor: newSymbolColor
                };
                if (applyBackground) {
                    this.data.hexes[key].color = newBgColor;
                }
            } else {
                hexData.symbol = newSymbol;
                hexData.symbolColor = newSymbolColor;
                if (applyBackground) {
                    hexData.color = newBgColor;
                }
            }

            const neighbors = this.getHexNeighbors(hex);
            neighbors.forEach(n => queue.push(n));
        }
    }

    floodFillPattern(startHex, targetColor, targetSymbol) {
        const visited = new Set();
        const queue = [startHex];

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;

            if (visited.has(key)) continue;
            visited.add(key);

            const hexData = this.data.hexes[key];
            const currentColor = hexData ? hexData.color : null;
            const currentSymbol = hexData ? hexData.symbol : null;

            if (currentColor !== targetColor || currentSymbol !== targetSymbol) continue;

            if (!hexData) {
                this.data.hexes[key] = {
                    q: hex.q,
                    r: hex.r,
                    color: this.patternData.color,
                    symbol: this.patternData.symbol,
                    symbolColor: this.patternData.symbolColor
                };
            } else {
                hexData.color = this.patternData.color;
                hexData.symbol = this.patternData.symbol;
                hexData.symbolColor = this.patternData.symbolColor;
            }

            const neighbors = this.getHexNeighbors(hex);
            neighbors.forEach(n => queue.push(n));
        }
    }

    getHexNeighbors(hex) { return getHexNeighbors(hex); }

    isEnclosedByFrame(startHex) {
        const visited = new Set();
        const queue = [startHex];
        const maxDistance = 50; // Maximale Distanz zum Prüfen (verhindert endlose Suche)
        let foundBoundary = false;

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;

            if (visited.has(key)) continue;

            const distance = Math.abs(hex.q - startHex.q) + Math.abs(hex.r - startHex.r);
            if (distance > maxDistance) {
                return false; // Zu weit = nicht umrahmt
            }

            visited.add(key);

            const hexData = this.data.hexes[key];

            if (hexData) {
                foundBoundary = true;
                continue; // Nicht weiter in diese Richtung
            }

            const neighbors = this.getHexNeighbors(hex);
            neighbors.forEach(n => queue.push(n));
        }

        return foundBoundary && visited.size < (maxDistance * maxDistance);
    }

    floodFillEmpty(startHex) {
        const visited = new Set();
        const queue = [startHex];
        const maxDistance = 50;

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;

            if (visited.has(key)) continue;

            const distance = Math.abs(hex.q - startHex.q) + Math.abs(hex.r - startHex.r);
            if (distance > maxDistance) continue;

            visited.add(key);

            const hexData = this.data.hexes[key];

            if (hexData) continue;

            if (this.currentToolGroup === 'pattern' && this.patternData) {
                this.data.hexes[key] = {
                    q: hex.q,
                    r: hex.r,
                    color: this.patternData.color,
                    symbol: this.patternData.symbol,
                    symbolColor: this.patternData.symbolColor,
                    backgroundColor: this.patternData.backgroundColor
                };
            } else if (this.currentToolGroup === 'hexcolor') {
                this.data.hexes[key] = {
                    q: hex.q,
                    r: hex.r,
                    color: this.masterColor
                };
            } else if (this.currentToolGroup === null) {
                this.data.hexes[key] = {
                    q: hex.q,
                    r: hex.r,
                    color: this.colorPalette[this.activeColorSlot]
                };
            } else if (this.toolConfigs[this.currentToolGroup]) {
                const config = this.toolConfigs[this.currentToolGroup];
                this.data.hexes[key] = {
                    q: hex.q,
                    r: hex.r,
                    symbol: config.currentVariant,
                    symbolColor: config.symbolColor
                };
                if (config.backgroundEnabled) {
                    this.data.hexes[key].color = config.backgroundColor;
                }
            }

            const neighbors = this.getHexNeighbors(hex);
            neighbors.forEach(n => queue.push(n));
        }
    }

    render() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(this.data.offX, this.data.offY);
        this.ctx.scale(this.data.zoom, this.data.zoom);

        Object.values(this.data.hexes).forEach(h => {
            this.drawHexBase(h);
        });

        // Zeichenreihenfolge (unten → oben):

        const drawSymbolLayer = (symbols) => {
            Object.values(this.data.hexes).forEach((h: any) => {
                if (h.symbol && symbols.includes(h.symbol)) {
                    const pos = this.hexToPixel(h);
                    if (this.svgSymbols[h.symbol]) {
                        this.drawSVGOnCanvas(h.symbol, pos, h.symbolColor);
                    } else {
                        this.drawCustomSymbol(h.symbol, pos.x, pos.y, this.data.gridSize, h.symbolColor);
                    }
                }
            });
        };

        drawSymbolLayer(['swamp','grass', 'bush', 'tree', 'pine', 'palm']);

        drawSymbolLayer(['hill', 'mountain']);

        this.buildOverlapMap();
        this.drawRivers();

        this.drawRoads();

        drawSymbolLayer(['question', 'exclamation', 'cross', 'dot', 'shield', 'pirateskull']);

        drawSymbolLayer(['tent', 'house', 'village', 'town', 'castle', 'harbor', 'monastery', 'tower', 'ruins', 'cave', 'oasis']);

        this.drawBorders();

        this.drawPathWaypoints(); // Wegpunkte immer als letztes (ueber allen anderen Elementen)

        if (this.svgLayer) {
            while (this.svgLayer.firstChild) this.svgLayer.removeChild(this.svgLayer.firstChild);
        }


        if (this.currentToolGroup === 'pattern' && this.patternSourceHex) {
            const pos = this.hexToPixel(this.patternSourceHex);
            const s = this.data.gridSize;

            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 180) * (60 * i + (this.hexOrientation ? 0 : -30));
                this.ctx.lineTo(pos.x + s * Math.cos(a), pos.y + s * Math.sin(a));
            }
            this.ctx.closePath();
            this.ctx.strokeStyle = '#FF0000';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }

        this.ctx.restore();

        this.renderCrosshair();
        this.renderTexts();
        this.renderHexNumbering();
    }

    renderCrosshair() {
        if (!this.plugin.settings.showCrosshair) return;

        const origin = this.hexToPixel({ q: 0, r: 0 });
        const sx = origin.x * this.data.zoom + this.data.offX;
        const sy = origin.y * this.data.zoom + this.data.offY;
        const arm = 2 * this.data.gridSize * this.data.zoom;

        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(sx - arm, sy);
        this.ctx.lineTo(sx + arm, sy);
        this.ctx.moveTo(sx, sy - arm);
        this.ctx.lineTo(sx, sy + arm);
        this.ctx.stroke();
        this.ctx.restore();
    }

    renderTexts() {
        if (!this.textCtx || !this.textCanvas) return;

        this.textCtx.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);

        this.textCtx.save();
        this.textCtx.translate(this.data.offX, this.data.offY);
        this.textCtx.scale(this.data.zoom, this.data.zoom);

        if (this.data.texts) this.data.texts.forEach(t => {
            const weight = t.bold ? "bold " : "";
            this.textCtx.font = `${weight}${t.size || 16}px Verdana`;
            this.textCtx.textAlign = "center";

            if (t.shadow) {
                const distance = t.shadowDistance || 5;
                const opatown = (t.shadowOpatown || 50) / 100;
                this.textCtx.fillStyle = `rgba(0, 0, 0, ${opatown})`;
                this.textCtx.fillText(t.text, t.x + distance, t.y + distance);
            }

            this.textCtx.strokeStyle = "black";
            this.textCtx.lineWidth = 2;
            if (t.outline !== false) this.textCtx.strokeText(t.text, t.x, t.y);

            this.textCtx.fillStyle = t.color || "white";
            this.textCtx.fillText(t.text, t.x, t.y);
        });

        this.textCtx.restore();
    }

    // Berechnet für jede Wabe ein Label basierend auf den Settings
    _buildHexNumberLabels() {
        const settings = this.plugin.settings;
        const hexes = Object.values(this.data.hexes);
        if (hexes.length === 0) return [];

        const horizontal = settings.hexNumberingDirection !== 'vertical';
        const tol = this.data.gridSize * 0.6;

        // Pixelposition jeder Wabe berechnen
        const withPos = hexes.map(hex => {
            const pos = this.hexToPixel(hex);
            return { hex, px: pos.x, py: pos.y };
        });

        // Buchstabe aus Index: 0→A, 1→B … 25→Z, 26→AA, 27→AB …
        const toAlpha = (n) => {
            let s = '';
            n += 1;
            while (n > 0) {
                n--;
                s = String.fromCharCode(65 + (n % 26)) + s;
                n = Math.floor(n / 26);
            }
            return s;
        };

        // Gruppen aus Pixelwerten bilden (sortiert, mit Toleranz)
        const buildGroups = (values: number[]) => {
            const rounded: number[] = values.map(v => Math.round(v));
            const sorted: number[] = Array.from(new Set(rounded)).sort((a, b) => a - b);
            const groups = [];
            for (const v of sorted) {
                if (groups.length === 0 || Math.abs(v - groups[groups.length - 1]) > tol) {
                    groups.push(v);
                }
            }
            return groups;
        };

        const colGroups = buildGroups(withPos.map(e => e.px)); // Spalten (links→rechts)
        const rowGroups = buildGroups(withPos.map(e => e.py)); // Zeilen (oben→unten)

        const colIndex = (px) => colGroups.findIndex(g => Math.abs(px - g) <= tol);
        const rowIndex = (py) => rowGroups.findIndex(g => Math.abs(py - g) <= tol);

        // ── Buchstabenkoordinaten-Modus ───────────────────────────
        // Horizontal: Buchstabe = Zeilenindex (A=1.Zeile, B=2.Zeile …)
        //             Zahl     = laufende Position in der Zeile (1, 2, 3 …)
        // Vertikal:   Buchstabe = Spaltenindex (A=linkste Spalte, B=zweite …)
        //             Zahl     = laufende Position in der Spalte (1, 2, 3 …)
        if (settings.hexNumberingAlphaChess) {
            if (horizontal) {
                // Sortierung: erst Zeile (py), dann Spalte (px)
                withPos.sort((a, b) => {
                    if (Math.abs(a.py - b.py) > tol) return a.py - b.py;
                    return a.px - b.px;
                });
                let currentRowPy = null;
                let rowIdx = -1;
                let posInRow = 0;
                return withPos.map(({ hex, py }) => {
                    if (currentRowPy === null || Math.abs(py - currentRowPy) > tol) {
                        currentRowPy = py;
                        rowIdx++;
                        posInRow = 1;
                    } else {
                        posInRow++;
                    }
                    return { hex, label: `${toAlpha(rowIdx)}-${posInRow}` };
                });
            } else {
                // Sortierung: erst Spalte (px), dann Zeile (py)
                withPos.sort((a, b) => {
                    if (Math.abs(a.px - b.px) > tol) return a.px - b.px;
                    return a.py - b.py;
                });
                let currentColPx = null;
                let colIdx = -1;
                let posInCol = 0;
                return withPos.map(({ hex, px }) => {
                    if (currentColPx === null || Math.abs(px - currentColPx) > tol) {
                        currentColPx = px;
                        colIdx++;
                        posInCol = 1;
                    } else {
                        posInCol++;
                    }
                    return { hex, label: `${toAlpha(colIdx)}-${posInCol}` };
                });
            }
        }

        // ── Koordinaten-Modus ─────────────────────────────────────
        // Horizontal: erste Zahl = Zeilenindex, zweite Zahl = Position in Zeile
        // Vertikal:   erste Zahl = Spaltenindex, zweite Zahl = Position in Spalte
        if (settings.hexNumberingAlpha) {
            if (horizontal) {
                withPos.sort((a, b) => {
                    if (Math.abs(a.py - b.py) > tol) return a.py - b.py;
                    return a.px - b.px;
                });
                let currentRowPy = null;
                let rowIdx = -1;
                let posInRow = 0;
                return withPos.map(({ hex, py }) => {
                    if (currentRowPy === null || Math.abs(py - currentRowPy) > tol) {
                        currentRowPy = py;
                        rowIdx++;
                        posInRow = 1;
                    } else {
                        posInRow++;
                    }
                    return { hex, label: `${rowIdx + 1}-${posInRow}` };
                });
            } else {
                withPos.sort((a, b) => {
                    if (Math.abs(a.px - b.px) > tol) return a.px - b.px;
                    return a.py - b.py;
                });
                let currentColPx = null;
                let colIdx = -1;
                let posInCol = 0;
                return withPos.map(({ hex, px }) => {
                    if (currentColPx === null || Math.abs(px - currentColPx) > tol) {
                        currentColPx = px;
                        colIdx++;
                        posInCol = 1;
                    } else {
                        posInCol++;
                    }
                    return { hex, label: `${colIdx + 1}-${posInCol}` };
                });
            }
        }

        // ── Einfache Durchnummerierung ────────────────────────────
        // Horizontal: zeilenweise (py), dann spaltenweise (px)
        // Vertikal:   spaltenweise (px), dann zeilenweise (py)
        if (horizontal) {
            withPos.sort((a, b) => {
                if (Math.abs(a.py - b.py) > tol) return a.py - b.py;
                return a.px - b.px;
            });
        } else {
            withPos.sort((a, b) => {
                if (Math.abs(a.px - b.px) > tol) return a.px - b.px;
                return a.py - b.py;
            });
        }

        return withPos.map(({ hex }, i) => ({ hex, label: String(i + 1) }));
    }

    // Zeichnet Nummerierung auf einen beliebigen 2D-Context
    _renderHexNumberingToCtx(ctx, zoom, offX, offY) {
        const settings = this.plugin.settings;
        const labels = this._buildHexNumberLabels();
        if (labels.length === 0) return;

        const s = this.data.gridSize;
        const fontSize = Math.max(1, (this.plugin.settings.hexNumberingFontSize || 10) * zoom);
        const flatTop = this.hexOrientation; // true = flat-top

        ctx.save();
        ctx.font = `bold ${fontSize}px Verdana`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const { hex, label } of labels) {
            const pos = this.hexToPixel(hex);

            // Y-Offset je nach Position (top/bottom) und Orientierung
            // Bei pointy-top (flatTop=false) liegt die breiteste Stelle in der Mitte.
            // Wir setzen den Text ins obere oder untere Drittel der Wabe.
            let yOffset;
            if (flatTop) {
                // Flat-top: volle Höhe = s * sin(60°) * 2 ≈ s * 1.732
                // Oberes/unteres Drittel innen
                const halfH = s * Math.sin(Math.PI / 3); // ≈ 0.866 * s
                yOffset = settings.hexNumberingPosition === 'top'
                    ? -halfH * 0.55
                    :  halfH * 0.55;
            } else {
                // Pointy-top: Spitze oben/unten, breit in der Mitte
                // Von Mitte bis Spitze = s; wir setzen Text bei ~60% davon
                yOffset = settings.hexNumberingPosition === 'top'
                    ? -s * 0.52
                    :  s * 0.52;
            }

            const px = pos.x * zoom + offX;
            const py = (pos.y + yOffset) * zoom + offY;

            ctx.save();
            if (settings.hexNumberingOutline) {
                ctx.strokeStyle = 'rgba(0,0,0,0.85)';
                ctx.lineWidth = Math.max(2, fontSize * 0.25);
                ctx.lineJoin = 'round';
                ctx.strokeText(label, px, py);
            }
            ctx.fillStyle = settings.hexNumberingColor || '#ffffff';
            ctx.fillText(label, px, py);
            ctx.restore();
        }

        ctx.restore();
    }

    // Nummerierung auf den Live-Canvas zeichnen (kein zoom/translate nötig — direkt in Pixeln)
    renderHexNumbering() {
        if (!this.plugin.settings.hexNumberingEnabled) return;
        if (!this.ctx) return;
        this._renderHexNumberingToCtx(this.ctx, this.data.zoom, this.data.offX, this.data.offY);
    }

    getMapWorldSize() {
        const hexes = Object.values(this.data.hexes);
        const texts = this.data.texts || [];
        const borders = this.data.borders || [];
        const borderOnlyHexes = [];
        const hexKeySet = new Set(Object.keys(this.data.hexes));
        for (const region of borders) {
            for (const bh of region.hexes) {
                if (!hexKeySet.has(`${bh.q}_${bh.r}`)) borderOnlyHexes.push(bh);
            }
        }
        if (hexes.length === 0 && texts.length === 0 && borderOnlyHexes.length === 0) return null;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        const angleOffset = this.hexOrientation ? 0 : -30;
        const expandBounds = (hex) => {
            const pos = this.hexToPixel(hex);
            const s = this.data.gridSize;
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 180) * (60 * i + angleOffset);
                const cx = pos.x + s * Math.cos(a);
                const cy = pos.y + s * Math.sin(a);
                if (cx < minX) minX = cx;
                if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy;
                if (cy > maxY) maxY = cy;
            }
        };
        hexes.forEach(expandBounds);
        borderOnlyHexes.forEach(expandBounds);
        texts.forEach(tx => {
            const textSize = tx.size || 16;
            const w = tx.text.length * textSize * 0.6;
            minX = Math.min(minX, tx.x - w / 2); maxX = Math.max(maxX, tx.x + w / 2);
            minY = Math.min(minY, tx.y - textSize); maxY = Math.max(maxY, tx.y + textSize / 2);
        });
        const padding = this.data.gridSize;
        return { w: (maxX - minX) + padding * 2, h: (maxY - minY) + padding * 2 };
    }

    renderFullMap({ targetWidth, scale: fixedScale, cropless }: any = {}) {
        if (!this.getMapWorldSize()) return null;
        // Scale wird erst nach der Bounds-Berechnung gesetzt (siehe unten),
        // damit targetWidth die tatsächliche Export-Breite inkl. Crop-Option trifft.

        const hexes = Object.values(this.data.hexes);
        const texts = this.data.texts || [];
        const borders = this.data.borders || [];
        const borderOnlyHexes = [];
        const hexKeySet = new Set(Object.keys(this.data.hexes));
        for (const region of borders) {
            for (const bh of region.hexes) {
                if (!hexKeySet.has(`${bh.q}_${bh.r}`)) borderOnlyHexes.push(bh);
            }
        }
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        const angleOffset = this.hexOrientation ? 0 : -30;
        const expandBounds = (hex) => {
            const pos = this.hexToPixel(hex);
            const s = this.data.gridSize;
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 180) * (60 * i + angleOffset);
                const cx = pos.x + s * Math.cos(a);
                const cy = pos.y + s * Math.sin(a);
                if (cx < minX) minX = cx;
                if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy;
                if (cy > maxY) maxY = cy;
            }
        };
        hexes.forEach(expandBounds);
        borderOnlyHexes.forEach(expandBounds);
        texts.forEach(tx => {
            const textSize = tx.size || 16;
            const w = tx.text.length * textSize * 0.6;
            minX = Math.min(minX, tx.x - w / 2); maxX = Math.max(maxX, tx.x + w / 2);
            minY = Math.min(minY, tx.y - textSize); maxY = Math.max(maxY, tx.y + textSize / 2);
        });

        const padding = cropless ? 0 : this.data.gridSize;
        minX -= padding; minY -= padding;
        maxX += padding; maxY += padding;

        const w = maxX - minX;
        const h = maxY - minY;

        // Scale auf Basis der tatsächlichen Export-Breite berechnen (nach Padding-Anpassung),
        // damit targetWidth unabhängig von der Crop-Option exakt eingehalten wird.
        const scale = targetWidth ? targetWidth / w : (fixedScale || 2);

        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = Math.ceil(w * scale);
        tmpCanvas.height = Math.ceil(h * scale);
        const tmpCtx = tmpCanvas.getContext('2d');
        tmpCtx.fillStyle = '#ffffff';
        tmpCtx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);

        const origCtx = this.ctx;
        const origCanvas = this.canvas;
        const origTextCtx = this.textCtx;
        const origTextCanvas = this.textCanvas;
        const origZoom = this.data.zoom;
        const origOffX = this.data.offX;
        const origOffY = this.data.offY;

        this.ctx = tmpCtx;
        this.canvas = tmpCanvas;
        this.data.zoom = scale;
        this.data.offX = -minX * scale;
        this.data.offY = -minY * scale;

        tmpCtx.save();
        tmpCtx.translate(this.data.offX, this.data.offY);
        tmpCtx.scale(this.data.zoom, this.data.zoom);

        Object.values(this.data.hexes).forEach(hex => this.drawHexBase(hex));

        const drawSymbolLayer = (symbols) => {
            Object.values(this.data.hexes).forEach((hex: any) => {
                if (hex.symbol && symbols.includes(hex.symbol)) {
                    const pos = this.hexToPixel(hex);
                    if (this.svgSymbols[hex.symbol]) {
                        this.drawSVGOnCanvas(hex.symbol, pos, hex.symbolColor);
                    } else {
                        this.drawCustomSymbol(hex.symbol, pos.x, pos.y, this.data.gridSize, hex.symbolColor);
                    }
                }
            });
        };

        drawSymbolLayer(['swamp','grass', 'bush', 'tree', 'pine', 'palm']);
        drawSymbolLayer(['hill', 'mountain']);
        this.buildOverlapMap();
        this.drawRivers();
        this.drawRoads();
        drawSymbolLayer(['question', 'exclamation', 'cross', 'dot', 'shield', 'pirateskull']);
        drawSymbolLayer(['tent', 'house', 'village', 'town', 'castle', 'harbor', 'monastery', 'tower', 'ruins', 'cave', 'oasis']);
        this.drawBorders();

        tmpCtx.restore();

        // Texte direkt auf das Print-Canvas rendern
        if (this.data.texts) this.data.texts.forEach(tx => {
            tmpCtx.save();
            tmpCtx.translate(this.data.offX, this.data.offY);
            tmpCtx.scale(this.data.zoom, this.data.zoom);
            const weight = tx.bold ? "bold " : "";
            tmpCtx.font = `${weight}${tx.size || 16}px Verdana`;
            tmpCtx.textAlign = "center";
            if (tx.shadow) {
                const distance = tx.shadowDistance || 5;
                const opatown = (tx.shadowOpatown || 50) / 100;
                tmpCtx.fillStyle = `rgba(0, 0, 0, ${opatown})`;
                tmpCtx.fillText(tx.text, tx.x + distance, tx.y + distance);
            }
            tmpCtx.strokeStyle = "black";
            tmpCtx.lineWidth = 2;
            if (tx.outline !== false) tmpCtx.strokeText(tx.text, tx.x, tx.y);
            tmpCtx.fillStyle = tx.color || "white";
            tmpCtx.fillText(tx.text, tx.x, tx.y);
            tmpCtx.restore();
        });

        this.ctx = origCtx;
        this.canvas = origCanvas;
        this.textCtx = origTextCtx;
        this.textCanvas = origTextCanvas;
        this.data.zoom = origZoom;
        this.data.offX = origOffX;
        this.data.offY = origOffY;

        // Nummerierung auf Print-Canvas rendern (mit temporärem ctx)
        if (this.plugin.settings.hexNumberingEnabled) {
            const printCtx = tmpCtx;
            const printZoom = scale;
            const printOffX = -minX * scale;
            const printOffY = -minY * scale;
            this._renderHexNumberingToCtx(printCtx, printZoom, printOffX, printOffY);
        }

        return tmpCanvas;
    }

    renderSVGSymbols(symbols) {
        if (!this.svgLayer) return;

        while (this.svgLayer.firstChild) {
            this.svgLayer.removeChild(this.svgLayer.firstChild);
        }

        symbols.forEach(({ symbol, pos, color }) => {
            if (this.svgSymbols[symbol]) {
                const config = this.svgSymbolConfig[symbol] || { size: 0.30, align: 'center', marginX: 0, marginY: 0 };

                const screenX = pos.x * this.data.zoom + this.data.offX;
                const screenY = pos.y * this.data.zoom + this.data.offY;

                const baseSize = this.data.gridSize * 2.0; // Basis-Größe
                const size = baseSize * config.size * this.data.zoom;

                const hexWidth = this.data.gridSize * Math.sqrt(3) * this.data.zoom;
                const hexHeight = this.data.gridSize * 2 * this.data.zoom;

                let offsetX = 0;
                let offsetY = 0;

                const alignParts = config.align.split('-');
                alignParts.forEach(part => {
                    switch(part) {
                        case 'top':
                            offsetY = -hexHeight / 4;
                            break;
                        case 'bottom':
                            offsetY = hexHeight / 4;
                            break;
                        case 'left':
                            offsetX = -hexWidth / 4;
                            break;
                        case 'right':
                            offsetX = hexWidth / 4;
                            break;
                        case 'center':
                            break;
                    }
                });

                offsetX += (config.marginX / 100) * hexWidth;
                offsetY += (config.marginY / 100) * hexHeight;

                const svgData = this.svgSymbols[symbol];
                const viewBoxSize = svgData.viewBoxWidth;

                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                const scale = size / viewBoxSize;
                const finalX = screenX - size/2 + offsetX;
                const finalY = screenY - size/2 + offsetY;
                g.setAttribute('transform', `translate(${finalX}, ${finalY}) scale(${scale})`);

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', svgData.pathData);
                path.setAttribute('fill', color || '#228B22');
                g.appendChild(path);

                this.svgLayer.appendChild(g);
            }
        });
    }

    drawSVGOnCanvas(symbol, pos, color) {
        const svgData = this.svgSymbols[symbol];
        if (!svgData) return;

        const config = this.svgSymbolConfig[symbol] || { size: 0.30, align: 'center', marginX: 0, marginY: 0 };
        const baseSize = this.data.gridSize * 2.0;
        const size = baseSize * config.size;
        const viewBoxSize = svgData.viewBoxWidth;
        const scale = size / viewBoxSize;

        const hexWidth = this.data.gridSize * Math.sqrt(3);
        const hexHeight = this.data.gridSize * 2;
        let offsetX = 0, offsetY = 0;
        const alignParts = config.align.split('-');
        alignParts.forEach(part => {
            if (part === 'top') offsetY = -hexHeight / 4;
            else if (part === 'bottom') offsetY = hexHeight / 4;
            else if (part === 'left') offsetX = -hexWidth / 4;
            else if (part === 'right') offsetX = hexWidth / 4;
        });
        offsetX += (config.marginX / 100) * hexWidth;
        offsetY += (config.marginY / 100) * hexHeight;

        this.ctx.save();
        this.ctx.translate(pos.x - size / 2 + offsetX, pos.y - size / 2 + offsetY);
        this.ctx.scale(scale, scale);
        const path = new Path2D(svgData.pathData);
        this.ctx.fillStyle = color || '#228B22';
        this.ctx.fill(path);
        this.ctx.restore();
    }

    drawHexBase(h) {
        const pos = this.hexToPixel(h), s = this.data.gridSize;
        const angleOffset = this.hexOrientation ? 0 : -30;

        if (h.color) {
            const sf = s + 0.5; // Kleiner Überstand, damit keine Lücken zwischen benachbarten Hexen entstehen
            this.ctx.beginPath();
            for (let i=0; i<6; i++) {
                const a = (Math.PI/180) * (60*i + angleOffset);
                this.ctx.lineTo(pos.x + sf*Math.cos(a), pos.y + sf*Math.sin(a));
            }
            this.ctx.closePath();
            this.ctx.fillStyle = h.color;
            this.ctx.fill();
        }

        if (!this.plugin.settings.hideHexBorders) {
            this.ctx.beginPath();
            for (let i=0; i<6; i++) {
                const a = (Math.PI/180) * (60*i + angleOffset);
                this.ctx.lineTo(pos.x + s*Math.cos(a), pos.y + s*Math.sin(a));
            }
            this.ctx.closePath();
            this.ctx.strokeStyle = 'rgba(128,128,128,0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
    }

    drawBorders() {
        if (!this.data.borders || this.data.borders.length === 0 || !this.borderSettings.visible) return;

        const s = this.data.gridSize;
        const sf = s + 0.5;
        const lineWidth = 3;
        const inset = lineWidth / 2 + 0.575; // 1px Abstand zu Hex-Kante + Hälfte der Linienbreite
        const factor = (sf - inset) / sf;

        const neighbors = [
            { dq: 1, dr: 0 },   // Edge 0: Ost
            { dq: 0, dr: 1 },   // Edge 1: Süd-Ost
            { dq: -1, dr: 1 },  // Edge 2: Süd-West
            { dq: -1, dr: 0 },  // Edge 3: West
            { dq: 0, dr: -1 },  // Edge 4: Nord-West
            { dq: 1, dr: -1 }   // Edge 5: Nord-Ost
        ];

        this.ctx.save();
        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = 'round';

        this.data.borders.forEach(region => {
            if (!region.hexes || region.hexes.length === 0) return;

            const regionSet = new Set(region.hexes.map(b => `${b.q}_${b.r}`));
            this.ctx.strokeStyle = region.color || '#FF0000';

            const dashes = region.dashes || 1;
            if (dashes > 1) {
                const edgeLen = sf * factor;
                const unitLen = edgeLen / dashes;
                this.ctx.setLineDash([unitLen, unitLen]);
                this.ctx.lineDashOffset = (dashes % 2 === 0) ? unitLen / 2 : 0;
            }

            region.hexes.forEach(b => {
                const pos = this.hexToPixel(b);

                const corners = [];
                for (let i = 0; i < 6; i++) {
                    const a = (Math.PI / 180) * (60 * i + (this.hexOrientation ? 0 : -30));
                    corners.push({
                        x: pos.x + sf * factor * Math.cos(a),
                        y: pos.y + sf * factor * Math.sin(a)
                    });
                }

                for (let i = 0; i < 6; i++) {
                    const nb = neighbors[i];
                    const neighborKey = `${b.q + nb.dq}_${b.r + nb.dr}`;

                    if (!regionSet.has(neighborKey)) {
                        const p1 = corners[i];
                        const p2 = corners[(i + 1) % 6];
                        this.ctx.beginPath();
                        this.ctx.moveTo(p1.x, p1.y);
                        this.ctx.lineTo(p2.x, p2.y);
                        this.ctx.stroke();
                    }
                }
            });

            if (dashes > 1) { this.ctx.setLineDash([]); this.ctx.lineDashOffset = 0; }
        });

        const ph = this.borderSettings.pickedHex;
        if (ph && this.currentToolGroup === 'border') {
            const activeRegion = this.data.borders.find(r => r.id === this.borderSettings.activeRegionId);
            if (activeRegion) {
                this.ctx.strokeStyle = activeRegion.color || '#FF0000';
                this.ctx.lineWidth = this.borderHighlightWidth;
                this.ctx.setLineDash([4, 4]);
                const pos = this.hexToPixel(ph);
                const hlInset = (sf - this.borderHighlightWidth / 2 - 1) / sf;
                this.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = (Math.PI / 180) * (60 * i + (this.hexOrientation ? 0 : -30));
                    const cx = pos.x + sf * hlInset * Math.cos(a);
                    const cy = pos.y + sf * hlInset * Math.sin(a);
                    if (i === 0) this.ctx.moveTo(cx, cy);
                    else this.ctx.lineTo(cx, cy);
                }
                this.ctx.closePath();
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }

        this.ctx.restore();
    }

    drawCustomSymbol(type, x, y, size, color) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.lineJoin = "round";
        this.ctx.lineCap = "round";
        const s = size / 2;


        if (type === 'grass') {
            for (let i = 0; i < 3; i++) {
                const x = (i - 1) * s * 0.3;
                this.ctx.moveTo(x, s * 0.3);
                this.ctx.lineTo(x, -s * 0.3);
            }
            this.ctx.stroke();
        } else if (type === 'swamp') {
            for (let i = 0; i < 3; i++) {
                const y = (i - 1) * s * 0.25;
                this.ctx.moveTo(-s * 0.5, y);
                this.ctx.quadraticCurveTo(-s * 0.25, y - s * 0.1, 0, y);
                this.ctx.quadraticCurveTo(s * 0.25, y + s * 0.1, s * 0.5, y);
            }
            this.ctx.stroke();
        }
        else if (type === 'bush') {
            this.ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
            this.ctx.stroke();
        } else if (type === 'tree') {
            this.ctx.beginPath();
            this.ctx.arc(0, -s * 0.2, s * 0.3, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(0, s * 0.1);
            this.ctx.lineTo(0, s * 0.5);
            this.ctx.stroke();
        } else if (type === 'pine') {
            this.ctx.moveTo(-s * 0.3, 0);
            this.ctx.lineTo(0, -s * 0.5);
            this.ctx.lineTo(s * 0.3, 0);
            this.ctx.moveTo(-s * 0.35, s * 0.2);
            this.ctx.lineTo(0, -s * 0.1);
            this.ctx.lineTo(s * 0.35, s * 0.2);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(0, s * 0.2);
            this.ctx.lineTo(0, s * 0.5);
            this.ctx.stroke();
        } else if (type === 'palm') {
            this.ctx.moveTo(0, -s * 0.5);
            this.ctx.lineTo(0, s * 0.4);
            this.ctx.stroke();
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI / 2) - Math.PI / 4;
                this.ctx.beginPath();
                this.ctx.moveTo(0, -s * 0.5);
                this.ctx.lineTo(Math.cos(angle) * s * 0.4, -s * 0.5 + Math.sin(angle) * s * 0.4);
                this.ctx.stroke();
            }
        }
        else if (type === 'hill') {
            this.ctx.moveTo(-s * 0.6, s * 0.3);
            this.ctx.quadraticCurveTo(-s * 0.3, -s * 0.4, 0, -s * 0.3);
            this.ctx.quadraticCurveTo(s * 0.3, -s * 0.4, s * 0.6, s * 0.3);
            this.ctx.stroke();
        } else if (type === 'mountain') {
            this.ctx.beginPath();
            this.ctx.moveTo(-s * 0.8, s * 0.5);
            this.ctx.lineTo(0, -s * 0.6);
            this.ctx.lineTo(s * 0.8, s * 0.5);
            this.ctx.moveTo(-s * 0.3, s * 0.5);
            this.ctx.lineTo(s * 0.3, -s * 0.1);
            this.ctx.lineTo(s * 0.7, s * 0.5);
            this.ctx.stroke();
        }
        else if (type === 'tent') {
            this.ctx.moveTo(-s * 0.4, s * 0.3);
            this.ctx.lineTo(0, -s * 0.4);
            this.ctx.lineTo(s * 0.4, s * 0.3);
            this.ctx.closePath();
            this.ctx.stroke();
        } else if (type === 'house') {
            this.ctx.rect(-s*0.3, -s*0.1, s*0.6, s*0.5);
            this.ctx.moveTo(-s*0.4, -s*0.1);
            this.ctx.lineTo(0, -s*0.5);
            this.ctx.lineTo(s*0.4, -s*0.1);
            this.ctx.stroke();
        } else if (type === 'village') {
            for(let i=0; i<3; i++) {
                const ox = (i-1)*s*0.4, oy = (i%2)*s*0.2;
                this.ctx.moveTo(ox-s*0.2, oy+s*0.3);
                this.ctx.lineTo(ox-s*0.2, oy);
                this.ctx.lineTo(ox, oy-s*0.2);
                this.ctx.lineTo(ox+s*0.2, oy);
                this.ctx.lineTo(ox+s*0.2, oy+s*0.3);
                this.ctx.stroke();
            }
        } else if (type === 'town') {
            this.ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
            this.ctx.stroke();
            for (let i = 0; i < 4; i++) {
                const angle = i * Math.PI / 2;
                const px = Math.cos(angle) * s * 0.5;
                const py = Math.sin(angle) * s * 0.5;
                this.ctx.beginPath();
                this.ctx.rect(px - s*0.1, py - s*0.1, s*0.2, s*0.25);
                this.ctx.stroke();
            }
        } else if (type === 'castle') {
            this.ctx.moveTo(-s*0.6, s*0.5);
            this.ctx.lineTo(-s*0.6, -s*0.3);
            this.ctx.lineTo(-s*0.4, -s*0.3);
            this.ctx.lineTo(-s*0.4, -s*0.1);
            this.ctx.lineTo(-s*0.2, -s*0.1);
            this.ctx.lineTo(-s*0.2, -s*0.5);
            this.ctx.lineTo(s*0.2, -s*0.5);
            this.ctx.lineTo(s*0.2, -s*0.1);
            this.ctx.lineTo(s*0.4, -s*0.1);
            this.ctx.lineTo(s*0.4, -s*0.3);
            this.ctx.lineTo(s*0.6, -s*0.3);
            this.ctx.lineTo(s*0.6, s*0.5);
            this.ctx.closePath();
            this.ctx.stroke();
        } else if (type === 'harbor') {
            this.ctx.rect(-s*0.5, -s*0.3, s*1.0, s*0.6);
            this.ctx.stroke();
        } else if (type === 'monastery') {
            this.ctx.rect(-s*0.4, -s*0.2, s*0.8, s*0.6);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(0, -s*0.6);
            this.ctx.lineTo(0, -s*0.2);
            this.ctx.moveTo(-s*0.15, -s*0.5);
            this.ctx.lineTo(s*0.15, -s*0.5);
            this.ctx.stroke();
        } else if (type === 'tower') {
            this.ctx.rect(-s*0.2, -s*0.6, s*0.4, s*1.0);
            this.ctx.stroke();
            for (let i = 0; i < 3; i++) {
                const x = -s*0.2 + i * s*0.2;
                this.ctx.beginPath();
                this.ctx.rect(x, -s*0.7, s*0.15, s*0.1);
                this.ctx.stroke();
            }
        } else if (type === 'ruins') {
            this.ctx.moveTo(-s*0.4, s*0.3);
            this.ctx.lineTo(-s*0.4, -s*0.1);
            this.ctx.lineTo(-s*0.2, -s*0.3);
            this.ctx.moveTo(0, s*0.3);
            this.ctx.lineTo(0, 0);
            this.ctx.moveTo(s*0.3, s*0.3);
            this.ctx.lineTo(s*0.3, -s*0.2);
            this.ctx.stroke();
        } else if (type === 'cave') {
            this.ctx.arc(0, s*0.2, s*0.35, Math.PI, 0, true);
            this.ctx.lineTo(s*0.35, s*0.4);
            this.ctx.lineTo(-s*0.35, s*0.4);
            this.ctx.closePath();
            this.ctx.stroke();
        } else if (type === 'oasis') {
            this.ctx.ellipse(0, s*0.2, s*0.4, s*0.25, 0, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(s*0.3, 0);
            this.ctx.lineTo(s*0.3, -s*0.3);
            this.ctx.stroke();
            for (let i = 0; i < 3; i++) {
                const angle = (i * Math.PI / 3);
                this.ctx.beginPath();
                this.ctx.moveTo(s*0.3, -s*0.3);
                this.ctx.lineTo(s*0.3 + Math.cos(angle) * s*0.2, -s*0.3 + Math.sin(angle) * s*0.2);
                this.ctx.stroke();
            }
        }

        this.ctx.restore();
    }

    _segKey(from, to) {
        if (from.q < to.q || (from.q === to.q && from.r < to.r))
            return `${from.q},${from.r}|${to.q},${to.r}`;
        return `${to.q},${to.r}|${from.q},${from.r}`;
    }

    buildOverlapMap() {
        this.overlapMap = {};
        const addSegments = (pathObj, type) => {
            if (!pathObj.waypoints || pathObj.waypoints.length < 2) return;
            const wps = pathObj.waypoints;
            const chains = [];
            let currentChain = [];
            for (let i = 0; i < wps.length; i++) {
                if (wps[i].break) {
                    currentChain = [wps[i]];
                } else {
                    currentChain.push(wps[i]);
                }
                if (i === wps.length - 1 || (wps[i + 1] && wps[i + 1].break)) {
                    if (currentChain.length >= 2) chains.push(currentChain);
                    if (wps[i + 1] && wps[i + 1].break) currentChain = [];
                }
            }
            chains.forEach(chain => {
                for (let i = 0; i < chain.length - 1; i++) {
                    const pathSegs = this.calculateHexPath(chain[i], chain[i + 1], pathObj.width);
                    pathSegs.forEach(seg => {
                        const key = this._segKey(seg.from, seg.to);
                        if (!this.overlapMap[key]) this.overlapMap[key] = { hasRiver: false, hasRoad: false, maxRiverWidth: 0, maxRoadWidth: 0 };
                        if (type === 'river') {
                            this.overlapMap[key].hasRiver = true;
                            this.overlapMap[key].maxRiverWidth = Math.max(this.overlapMap[key].maxRiverWidth, pathObj.width);
                        } else {
                            this.overlapMap[key].hasRoad = true;
                            this.overlapMap[key].maxRoadWidth = Math.max(this.overlapMap[key].maxRoadWidth, pathObj.width);
                        }
                    });
                }
            });
        };
        if (this.data.rivers) this.data.rivers.forEach(r => addSegments(r, 'river'));
        if (this.data.roads) this.data.roads.forEach(r => addSegments(r, 'road'));
    }

    drawRivers() {
        if (!this.data.rivers) return;
        this.data.rivers.forEach(river => {
            if (!river.waypoints || river.waypoints.length === 0) return;
            if (river.waypoints.length >= 2) {
                this.drawPathChains(river, true, 'river');
            }
        });
    }

    drawRoads() {
        if (!this.data.roads) return;
        this.data.roads.forEach(road => {
            if (!road.waypoints || road.waypoints.length === 0) return;
            if (road.waypoints.length >= 2) {
                this.drawPathChains(road, false, 'road');
            }
        });
    }

    drawPathWaypoints() {
        if (this.riverSettings.editMode && this.data.rivers) {
            const river = this.data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
            if (river && river.waypoints) {
                const activeIdx = this.riverSettings.insertAfter;
                const activeWp = activeIdx !== null ? river.waypoints[activeIdx] : null;
                river.waypoints.forEach((wp) => {
                    const isActive = activeWp && wp.q === activeWp.q && wp.r === activeWp.r;
                    const pos = this.hexToPixel(wp);
                    this.ctx.beginPath();
                    this.ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
                    this.ctx.fillStyle = isActive ? '#FF0000' : '#000000';
                    this.ctx.fill();
                });
            }
        }
        if (this.roadSettings.editMode && this.data.roads) {
            const road = this.data.roads.find(r => r.id === this.roadSettings.activeRoadId);
            if (road && road.waypoints) {
                const activeIdx = this.roadSettings.insertAfter;
                const activeWp = activeIdx !== null ? road.waypoints[activeIdx] : null;
                road.waypoints.forEach((wp) => {
                    const isActive = activeWp && wp.q === activeWp.q && wp.r === activeWp.r;
                    const pos = this.hexToPixel(wp);
                    this.ctx.beginPath();
                    this.ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
                    this.ctx.fillStyle = isActive ? '#FF0000' : '#000000';
                    this.ctx.fill();
                });
            }
        }
    }

    drawPathChains(path, taper = false, pathType = null) {
        const wps = path.waypoints;
        const chains = [];
        let currentChain = [];
        for (let i = 0; i < wps.length; i++) {
            if (wps[i].break) {
                currentChain = [wps[i]];
            } else {
                if (currentChain.length === 0) currentChain.push(wps[i]);
                else currentChain.push(wps[i]);
            }
            if (i === wps.length - 1 || (wps[i + 1] && wps[i + 1].break)) {
                if (currentChain.length >= 2) chains.push(currentChain);
                if (wps[i + 1] && wps[i + 1].break) currentChain = [];
            }
        }

        const segCount = {};
        chains.forEach(chain => {
            for (let i = 0; i < chain.length - 1; i++) {
                const k1 = `${chain[i].q}_${chain[i].r}`;
                const k2 = `${chain[i + 1].q}_${chain[i + 1].r}`;
                segCount[k1] = (segCount[k1] || 0) + 1;
                segCount[k2] = (segCount[k2] || 0) + 1;
            }
        });

        chains.forEach(chain => {
            const segments = [];
            const pairCount = chain.length - 1;
            const pairSegCounts = [];
            for (let i = 0; i < pairCount; i++) {
                const pathSegs = this.calculateHexPath(chain[i], chain[i + 1], path.width);
                pairSegCounts.push(pathSegs.length);
                segments.push(...pathSegs);
            }
            if (pathType && this.overlapMap) {
                segments.forEach(seg => {
                    const key = this._segKey(seg.from, seg.to);
                    const info = this.overlapMap[key];
                    if (info && info.hasRiver && info.hasRoad) {
                        const isCanonical = seg.from.q < seg.to.q || (seg.from.q === seg.to.q && seg.from.r < seg.to.r);
                        const typeSign = pathType === 'river' ? 1 : -1;
                        const dirSign = isCanonical ? 1 : -1;
                        seg.lateralOffset = ((info.maxRiverWidth + info.maxRoadWidth) / 4) * PATH_OVERLAP_SPACING * typeSign * dirSign;
                    }
                });
            }

            const startKey = `${chain[0].q}_${chain[0].r}`;
            const endKey = `${chain[chain.length - 1].q}_${chain[chain.length - 1].r}`;
            const trimStart = segCount[startKey] === 1;
            const trimEnd = segCount[endKey] === 1;

            const canTaper = taper && (trimStart || trimEnd) && !(pairCount === 1 && trimStart && trimEnd);
            if (canTaper) {
                let offset = 0;
                for (let i = 0; i < pairCount; i++) {
                    const n = pairSegCounts[i];
                    if (i === 0 && trimStart) {
                        for (let j = 0; j < n; j++) {
                            const t = n <= 1 ? 0 : j / (n - 1);
                            const e = t * t * (3 - 2 * t);
                            segments[offset + j].width = path.width * (0.01 + 0.99 * e);
                        }
                    } else if (i === pairCount - 1 && trimEnd) {
                        for (let j = 0; j < n; j++) {
                            const t = n <= 1 ? 0 : j / (n - 1);
                            const e = t * t * (3 - 2 * t);
                            segments[offset + j].width = path.width * (1.0 - 0.99 * e);
                        }
                    }
                    offset += n;
                }
            }

            const hasTaper = canTaper;
            this.drawWavyLines(segments, path.color, path.width, trimStart, trimEnd, path.dashes || 1, hasTaper);
        });
    }

    drawWavyLines(lines, color, defaultWidth, trimStart, trimEnd, dashCount, taper = false) {
        if (!lines || lines.length === 0) return;
        this.ctx.strokeStyle = color;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
        this.ctx.lineWidth = defaultWidth;

        const computedLines = lines.map((l, idx) => {
            const fullP1 = this.hexToPixel(l.from), fullP2 = this.hexToPixel(l.to);
            let p1 = { x: fullP1.x, y: fullP1.y }, p2 = { x: fullP2.x, y: fullP2.y };
            const inset = (1 - this.pathEndInset) * 0.5;
            if (trimStart && idx === 0) p1 = { x: p1.x + (p2.x - p1.x) * inset, y: p1.y + (p2.y - p1.y) * inset };
            if (trimEnd && idx === lines.length - 1) p2 = { x: p2.x + (p1.x - p2.x) * inset, y: p2.y + (p1.y - p2.y) * inset };
            const fdx = fullP2.x - fullP1.x, fdy = fullP2.y - fullP1.y;
            const fullDist = Math.sqrt(fdx * fdx + fdy * fdy);
            if (l.lateralOffset && fullDist > 0) {
                const onx = -fdy / fullDist, ony = fdx / fullDist;
                p1 = { x: p1.x + onx * l.lateralOffset, y: p1.y + ony * l.lateralOffset };
                p2 = { x: p2.x + onx * l.lateralOffset, y: p2.y + ony * l.lateralOffset };
            }
            return { p1, p2, from: l.from, to: l.to, fullDist, width: l.width };
        });

        const allPts = [];
        computedLines.forEach((cl, segIdx) => {
            const { p1, p2, from, to, width } = cl;
            const dx = p2.x - p1.x, dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const curveSegs = Math.max(3, Math.floor(dist / 5));
            const nx = -dy / dist, ny = dx / dist;
            const nextWidth = segIdx < computedLines.length - 1 ? computedLines[segIdx + 1].width : (taper && trimEnd ? defaultWidth * 0.01 : width);

            if (segIdx === 0) allPts.push({ x: p1.x, y: p1.y, w: width });

            for (let i = 1; i < curveSegs; i++) {
                const t = i / curveSegs;
                const baseX = p1.x + dx * t;
                const baseY = p1.y + dy * t;
                const sf = (from.q < to.q || (from.q === to.q && from.r < to.r)) ? from : to;
                const st = sf === from ? to : from;
                const seedHash = Math.abs(sf.q * 7 + sf.r * 13 + st.q * 11 + st.r * 17 + i * 3);
                const seed = seedHash % 10;
                const sine = Math.sin(t * Math.PI * curveSegs / 2);
                const amplitude = (this.data.gridSize * 0.09) * (0.4 + seed / 15) * sine;
                allPts.push({ x: baseX + nx * amplitude, y: baseY + ny * amplitude, w: width + (nextWidth - width) * t });
            }

            allPts.push({ x: p2.x, y: p2.y, w: nextWidth });
        });

        if (allPts.length < 2) return;

        if (dashCount > 1 && computedLines.length > 0) {
            const unitLen = computedLines[0].fullDist / dashCount;
            this.ctx.setLineDash([unitLen, unitLen]);
            this.ctx.lineDashOffset = (dashCount % 2 === 0) ? unitLen / 2 : 0;
        }

        if (taper) {
            for (let i = 0; i < allPts.length - 1; i++) {
                const a = allPts[Math.max(0, i - 1)];
                const b = allPts[i];
                const c = allPts[i + 1];
                const d = allPts[Math.min(allPts.length - 1, i + 2)];
                const cp1x = b.x + (c.x - a.x) / 6;
                const cp1y = b.y + (c.y - a.y) / 6;
                const cp2x = c.x - (d.x - b.x) / 6;
                const cp2y = c.y - (d.y - b.y) / 6;
                this.ctx.lineWidth = b.w;
                this.ctx.beginPath();
                this.ctx.moveTo(b.x, b.y);
                this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, c.x, c.y);
                this.ctx.stroke();
            }
        } else {
            this.ctx.beginPath();
            this.ctx.moveTo(allPts[0].x, allPts[0].y);
            for (let i = 0; i < allPts.length - 1; i++) {
                const a = allPts[Math.max(0, i - 1)];
                const b = allPts[i];
                const c = allPts[i + 1];
                const d = allPts[Math.min(allPts.length - 1, i + 2)];
                const cp1x = b.x + (c.x - a.x) / 6;
                const cp1y = b.y + (c.y - a.y) / 6;
                const cp2x = c.x - (d.x - b.x) / 6;
                const cp2y = c.y - (d.y - b.y) / 6;
                this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, c.x, c.y);
            }
            this.ctx.stroke();
        }

        if (dashCount > 1) { this.ctx.setLineDash([]); this.ctx.lineDashOffset = 0; }
    }

    async saveData() {
        if (this.file && await this.app.vault.adapter.exists(this.file.path)) {
            this.isSaving = true;
            try {
                const toolConfigsToSave = {};
                Object.keys(this.toolConfigs).forEach(key => {
                    toolConfigsToSave[key] = {
                        currentVariant: this.toolConfigs[key].currentVariant,
                        symbolColor: this.toolConfigs[key].symbolColor,
                        backgroundColor: this.toolConfigs[key].backgroundColor,
                        backgroundEnabled: this.toolConfigs[key].backgroundEnabled
                    };
                });

                if (this.canvas && this.data.zoom) {
                    this.data.centerWorldX = (this.canvas.width / 2 - this.data.offX) / this.data.zoom;
                    this.data.centerWorldY = (this.canvas.height / 2 - this.data.offY) / this.data.zoom;
                }

                this.data.settings = {
                    colorPalette: this.colorPalette,
                    colorPalette2: this.colorPalette2,
                    activeColorSlot: this.activeColorSlot,
                    drawMode: !this.editMode && this._savedDrawMode ? this._savedDrawMode : this.drawMode,
                    currentToolGroup: !this.editMode && this._savedToolGroup !== undefined ? this._savedToolGroup : this.currentToolGroup,
                    toolConfigs: toolConfigsToSave,
                    patternData: this.patternData,
                    patternSourceHex: this.patternSourceHex,
                    borderSettings: this.borderSettings,
                    riverSettings: this.riverSettings,
                    roadSettings: this.roadSettings,
                    masterColor: this.masterColor,
                    editMode: this.editMode,
                    hexColorColor: this.hexColorColor,
                    lastUsedTextSize: this.lastUsedTextSize,
                    lastUsedTextOutline: this.lastUsedTextOutline,
                    lastUsedTextBold: this.lastUsedTextBold,
                    lastUsedTextShadow: this.lastUsedTextShadow,
                    lastUsedTextShadowDistance: this.lastUsedTextShadowDistance,
                    lastUsedTextShadowOpatown: this.lastUsedTextShadowOpatown,
                    viewportSaved: true,
                    hexOrientation: this.hexOrientation
                };

                const title = this.file.basename.replace('.hexcartographer', '');
                const content = serializeMapToFileContent(this.data, title);

                await this.app.vault.modify(this.file, content);
            }
            catch (e) {
                console.error(e);
            } finally {
                setTimeout(() => { this.isSaving = false; }, 200);
            }
        }
    }

    requestSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveData(), 1000);
    }

    resizeCanvas() {
        if (!this.canvas) return;
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        if (!this._initialResizeDone) {
            this._initialResizeDone = true;
            if (this.data.settings && this.data.settings.viewportSaved && this.data.centerWorldX !== undefined && this.data.centerWorldY !== undefined) {
                this.data.offX = this.canvas.width / 2 - this.data.centerWorldX * this.data.zoom;
                this.data.offY = this.canvas.height / 2 - this.data.centerWorldY * this.data.zoom;
            } else if (!this.data.settings || !this.data.settings.viewportSaved) {
                this.data.offX = this.canvas.width / 2;
                this.data.offY = this.canvas.height / 2;
            }
        }

        if (this.textCanvas) {
            this.textCanvas.width = this.textCanvas.clientWidth;
            this.textCanvas.height = this.textCanvas.clientHeight;
        }

        this.render();
    }

    getWorldCoords(e) {
        const r = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - r.left - this.data.offX) / this.data.zoom,
            y: (e.clientY - r.top - this.data.offY) / this.data.zoom
        };
    }

    getHexBounds() {
        const keys = Object.keys(this.data.hexes || {});
        if (keys.length === 0) return null;
        let minQ = Infinity, maxQ = -Infinity, minR = Infinity, maxR = -Infinity;
        for (const key of keys) {
            const h = this.data.hexes[key];
            if (h.q < minQ) minQ = h.q;
            if (h.q > maxQ) maxQ = h.q;
            if (h.r < minR) minR = h.r;
            if (h.r > maxR) maxR = h.r;
        }
        return { minQ, maxQ, minR, maxR };
    }

    hexToPixel(h) { return hexToPixel(h, this.data.gridSize, this.hexOrientation); }

    pixelToHex(x, y) { return pixelToHex(x, y, this.data.gridSize, this.hexOrientation); }

    async onClose() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        await this.saveData();
    }
}

export default HexCartographerPlugin;
