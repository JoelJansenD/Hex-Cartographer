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
import { BorderTools } from './view/BorderTools';
import { InputController } from './view/InputController';
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

    floodEraseSymbol(startHex, targetSymbol) { this.paintTools.handleEraserFlood; /* delegated — called via handleEraserFlood */ }

    floodEraseColor(startHex, targetColor) { this.paintTools.handleEraserFlood; /* delegated — called via handleEraserFlood */ }

    floodEraseEntirePath(paths, pathIds) { this.paintTools.floodEraseEntirePath(paths, pathIds); }

    floodErasePattern(startHex, targetPattern) { this.paintTools.handleEraserFlood; /* delegated — called via handleEraserFlood */ }

    floodEraseBorderSegment(startHex, regionId) { this.borderTools.floodEraseBorderSegment(startHex, regionId); }

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
