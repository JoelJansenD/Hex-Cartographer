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
import { CameraController } from './view/CameraController';
import { PersistenceController } from './view/PersistenceController';
import { RenderManager } from './view/RenderManager';
import { PaintTools } from './view/PaintTools';
import { PathTools } from './view/PathTools';
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
        this.camera = new CameraController(this);
        this.persistence = new PersistenceController(this);
        this.renderManager = new RenderManager(this);
        this.paintTools = new PaintTools(this);
        this.pathTools = new PathTools(this);

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

    handleWaypointClick(path, settings, clickedIdx) { this.pathTools.handleWaypointClick(path, settings, clickedIdx); }

    completePathPick(path, type) { this.pathTools.completePathPick(path, type); }

    pickPathAtHex(hex) { this.pathTools.pickPathAtHex(hex); }

    updateActivePathColor() { this.pathTools.updateActivePathColor(); }

    exitPathEditMode() { this.pathTools.exitPathEditMode(); }

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
            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            const rect = this.canvas.getBoundingClientRect();
            if (this.camera.zoomAtPoint(factor, e.clientX - rect.left, e.clientY - rect.top)) {
                this.render();
                this.requestSave();
            }
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

    findRoadAtHex(hex) { return this.pathTools.findRoadAtHex(hex); }

    addRoadWaypoint(hex) { this.pathTools.addRoadWaypoint(hex); }

    findRiverAtHex(hex) { return this.pathTools.findRiverAtHex(hex); }

    erasePathElement(paths, hex) { this.pathTools.erasePathElement(paths, hex); }

    addRiverWaypoint(hex) { this.pathTools.addRiverWaypoint(hex); }

    paintHex(hex) { this.paintTools.paintHex(hex); }

    handleEraser(hex, x, y) { this.paintTools.handleEraser(hex, x, y); }

    handleEraserFlood(hex) { this.paintTools.handleEraserFlood(hex); }

    floodEraseSymbol(startHex, targetSymbol) { this.paintTools.handleEraserFlood; /* delegated — called via handleEraserFlood */ }

    floodEraseColor(startHex, targetColor) { this.paintTools.handleEraserFlood; /* delegated — called via handleEraserFlood */ }

    floodEraseEntirePath(paths, pathIds) { this.paintTools.floodEraseEntirePath(paths, pathIds); }

    floodErasePattern(startHex, targetPattern) { this.paintTools.handleEraserFlood; /* delegated — called via handleEraserFlood */ }

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

    hexMatchesPattern(hex, pattern) { return this.paintTools.hexMatchesPattern(hex, pattern); }

    handleFillTool(startHex) { this.paintTools.handleFillTool(startHex); }

    floodFillColor(startHex, targetColor, newColor) { this.paintTools.handleFillTool; /* delegated — called via handleFillTool */ }

    floodFillSymbol(startHex, targetSymbol, targetColor, applyBackground) { this.paintTools.handleFillTool; /* delegated — called via handleFillTool */ }

    floodFillPattern(startHex, targetColor, targetSymbol) { this.paintTools.handleFillTool; /* delegated — called via handleFillTool */ }

    getHexNeighbors(hex) { return getHexNeighbors(hex); }

    isEnclosedByFrame(startHex) { this.paintTools.handleFillTool; /* delegated — called via handleFillTool */ }

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
