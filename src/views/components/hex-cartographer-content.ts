import { DEFAULT_BORDER_HIGHLIGHT_WIDTH, PATH_END_INSET, PATH_OVERLAP_SPACING, SVG_SYMBOL_CONFIG } from "../../constants";
import { SVG_SYMBOL_DATA } from "../../data/svg-symbol-data";
import { calculateHexPath, createSegmentKey, hexToPixel } from "../../functions/hex-math";
import HexCartographerPlugin from "../../main";
import { Hexagon, HexCoordinates } from "../../types/hexagon";
import { MapData } from "../../types/map-data";
import { LinearFeature } from "../../types/rivers-and-roads";
import HexCartographerViewState from "../hex-cartographer-view-state";
import { registerKeyPressListener } from "./event-listeners/key-press-listener";
import { registerLeftMouseButtonListeners } from "./event-listeners/left-mouse-button-listener";
import { registerMiddleMouseButtonListeners } from "./event-listeners/middle-mouse-button-listener";
import { registerMouseMoveListener } from "./event-listeners/mouse-move-listener";
import { registerRightMouseButtonListeners } from "./event-listeners/right-mouse-button-listener";
import { createKeyPressInteraction } from "./interactions/key-press-interaction";
import { createLeftMouseButtonInteraction } from "./interactions/left-mouse-button-interaction";
import { createMiddleMouseButtonInteraction } from "./interactions/middle-mouse-button-interaction";
import { createMouseMoveInteraction } from "./interactions/mouse-move-interaction";
import { createRightMouseButtonInteraction } from "./interactions/right-mouse-button-interaction";

interface HexCartographerContentConfig {
    getState: () => HexCartographerViewState;
    setState: (newState: HexCartographerViewState) => void;
    undo: () => void;
    redo: () => void;
}

export default class HexCartographerContent {
    private patternSourceHex?: HexCoordinates;
    private plugin: HexCartographerPlugin;
    
    // =============================================
    // Elements & Canvas
    // =============================================
    private contentEl: HTMLDivElement;
    private canvas?: HTMLCanvasElement;
    private ctx?: CanvasRenderingContext2D;
    private config: HexCartographerContentConfig;

    constructor(plugin: HexCartographerPlugin, parentEl: HTMLElement, config: HexCartographerContentConfig, data: MapData) {
        this.contentEl = parentEl.createDiv({ cls: 'hex-content' });
        this.plugin = plugin;
        this.config = config;
    }

    public startRender() {   
        const canvasContainer = this.contentEl.createDiv();
        canvasContainer.style.position = 'relative';
        canvasContainer.style.flexGrow = '1';
        canvasContainer.style.overflow = 'hidden';
        canvasContainer.style.height = '100%';
        canvasContainer.style.width = '100%';

        this.canvas = canvasContainer.createEl('canvas', { cls: 'hex-canvas' });
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.cursor = 'crosshair';
        this.canvas.tabIndex = 0;
        this.canvas.style.outline = 'none';

        const resizeObserver = new ResizeObserver(() => {
            if(!this.canvas) {
                return;
            }

            this.canvas.width = canvasContainer.clientWidth;
            this.canvas.height = canvasContainer.clientHeight;
        });
        resizeObserver.observe(canvasContainer);

        const renderingContext = this.canvas.getContext('2d');
        if(!renderingContext) {
            throw new Error('Failed to get 2D rendering context')
        }
        this.ctx = renderingContext;

        this.registerEventListeners();
        this.canvas.focus();
        this.render();
    }

    // ==============================
    // Event Listeners
    // ==============================
    private registerLeftMouseButtonListeners() {
        const leftClick = createLeftMouseButtonInteraction({
            getApp: () => this.plugin.app,
            getCanvas: () => this.canvas!,
            getData: () => this.config.getState().data,
            setState: this.config.setState,
        });

        return registerLeftMouseButtonListeners({
            getState: this.config.getState,
            setState: this.config.setState,
            canvas: this.canvas!,
            down: leftClick.down,
        });
    }

    private registerMiddleMouseButtonListeners() {
        const middleClick = createMiddleMouseButtonInteraction();

        return registerMiddleMouseButtonListeners({
            getState: this.config.getState,
            setState: this.config.setState,
            canvas: this.canvas!,
            down: middleClick.down,
            up: middleClick.up,
        });
    }

    private registerRightMouseButtonListeners() {
        const rightClick = createRightMouseButtonInteraction({
            getCanvas: () => this.canvas!,
        });

        return registerRightMouseButtonListeners({
            getState: this.config.getState,
            setState: this.config.setState,
            canvas: this.canvas!,
            down: rightClick.down,
            up: rightClick.up,
        });
    }

    private registerKeyPressListener() {
        const keyPress = createKeyPressInteraction({
            redo: this.config.redo.bind(this),
            undo: this.config.undo.bind(this),
        });

        return registerKeyPressListener({
            canvas: this.canvas!,
            onKeyPress: keyPress.down,
        });
    }

    private registerMouseMoveListener() {
        const mouseMove = createMouseMoveInteraction({
            getState: this.config.getState,
            setState: this.config.setState,
        });

        return registerMouseMoveListener({
            canvas: this.canvas!,
            onMouseMove: mouseMove.move
        });
    }

    private registerEventListeners() {
        if(!this.canvas) throw new Error("Canvas not initialized");

        const leftClickUnregister = this.registerLeftMouseButtonListeners();
        const middleClickUnregister = this.registerMiddleMouseButtonListeners();
        const rightClickUnregister = this.registerRightMouseButtonListeners();
        const keyPressUnregister = this.registerKeyPressListener();
        const mouseMoveUnregister = this.registerMouseMoveListener();

        

        // this.canvas.addEventListener('mousedown', (e) => {
        //     this.canvas.focus();
        //     const world = this.getWorldCoords(e);

        //     this.pendingHistory = true;
        //     this.isMouseDown = true;
        //     this.mouseDownPos = { x: world.x, y: world.y };
        //     this.startHex = pixelToHex(world.x, world.y, this.config.getState().data.gridSize, this.hexOrientation);
        //     this.lastHex = this.startHex;

        //     if (this.colorPickMode) {
        //         const cx = Math.round(this.mouseDownPos.x * this.config.getState().data.zoom + this.config.getState().data.offX);
        //         const cy = Math.round(this.mouseDownPos.y * this.config.getState().data.zoom + this.config.getState().data.offY);
        //         if (cx >= 0 && cy >= 0 && cx < this.canvas.width && cy < this.canvas.height) {
        //             const pixel = this.ctx.getImageData(cx, cy, 1, 1).data;
        //             if (pixel[3] > 0) {
        //                 this.masterColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
        //                 if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
        //                 this.updateActivePathColor();
        //                 new Notice(localizeString('notice.colorPicked'));
        //             } else {
        //                 new Notice(localizeString('notice.noColorAtPosition'));
        //             }
        //         } else {
        //             new Notice(localizeString('notice.noColorAtPosition'));
        //         }
        //         this.colorPickMode = false;
        //         if (this.colorEyedropperBtn) { this.colorEyedropperBtn.style.background = BUTTON_BG_DEFAULT; this.colorEyedropperBtn.style.color = ''; }
        //         this.isMouseDown = false;
        //         const toolbar = this.contentEl.querySelector('.hex-toolbar');
        //         if (toolbar) this.updateToolbarState(toolbar);
        //         this.render();
        //         return;
        //     }
        // });

        // this.contentEl.addEventListener('mousemove', (e) => {
        //     const world = this.getWorldCoords(e);
        //     if (this.isRightMouseErasing) {
        //         const hex = pixelToHex(world.x, world.y, this.config.getState().data.gridSize, this.hexOrientation);
        //         const key = `${hex.q}_${hex.r}`;
        //         if (key !== this.rightEraseLastHex) {
        //             this.handleEraser(hex, world.x, world.y);
        //             this.rightEraseLastHex = key;
        //             this.render();
        //         }
        //         return;
        //     }
        //     else if (this.draggedText) {
        //         this.draggedText.x = world.x;
        //         this.draggedText.y = world.y;
        //         this.render();
        //     } else if (this.isMouseDown) {
        //         if (!this.editMode) {
        //             this.config.getState().data.offX += e.movementX;
        //             this.config.getState().data.offY += e.movementY;
        //             this.render();
        //         } else if (this.roadDragIndex !== null && this.roadSettings.editMode) {
        //             const road = this.config.getState().data.roads && this.config.getState().data.roads.find(r => r.id === this.roadSettings.activeRoadId);
        //             if (road) {
        //                 const currentHex = pixelToHex(world.x, world.y, this.config.getState().data.gridSize, this.hexOrientation);
        //                 const curQ = road.waypoints[this.roadDragIndex.idx]!.q;
        //                 const curR = road.waypoints[this.roadDragIndex.idx]!.r;
        //                 if (curQ !== currentHex.q || curR !== currentHex.r) {
        //                     this.pushHistoryIfNeeded();
        //                     this.roadDragIndex.group.forEach(i => {
        //                         road.waypoints[i]!.q = currentHex.q;
        //                         road.waypoints[i]!.r = currentHex.r;
        //                     });
        //                     this.render();
        //                 }
        //             }
        //         } else if (this.riverDragIndex !== null && this.riverSettings.editMode) {
        //             const river = this.config.getState().data.rivers && this.config.getState().data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
        //             if (river) {
        //                 const currentHex = pixelToHex(world.x, world.y, this.config.getState().data.gridSize, this.hexOrientation);
        //                 const curQ = river.waypoints[this.riverDragIndex.idx]!.q;
        //                 const curR = river.waypoints[this.riverDragIndex.idx]!.r;
        //                 if (curQ !== currentHex.q || curR !== currentHex.r) {
        //                     this.pushHistoryIfNeeded();
        //                     this.riverDragIndex.group.forEach(i => {
        //                         river.waypoints[i]!.q = currentHex.q;
        //                         river.waypoints[i]!.r = currentHex.r;
        //                     });
        //                     this.render();
        //                 }
        //             }
        //         } else {
        //             this.processInput(e, false);
        //             this.render();
        //         }
        //     }

        //     const hoverText = this.getTextAt(world.x, world.y);
        //     if (hoverText && hoverText.link) {
        //         this.canvas.title = `${hoverText.link}`;
        //         this.canvas.style.cursor = 'pointer';
        //     } else {
        //         this.canvas.title = '';
        //         this.canvas.style.cursor = (hoverText && this.currentToolGroup === 'text') ? 'text' : 'crosshair';
        //     }
        // });  

        // const stop = (e) => {
        //     if (this.isRightMouseErasing) {
        //         this.isRightMouseErasing = false;
        //         this.rightEraseLastHex = null;
        //         this.requestSave();
        //         return;
        //     }
        //     const world = this.getWorldCoords(e);
        //     if (this.isMouseDown && this.mouseDownPos) {
        //         if (this.roadDragIndex !== null && this.roadSettings.editMode) {
        //             const dist = Math.sqrt((world.x - this.mouseDownPos.x)**2 + (world.y - this.mouseDownPos.y)**2);
        //             if (dist < 5) {
        //                 const road = this.config.getState().data.roads && this.config.getState().data.roads.find(r => r.id === this.roadSettings.activeRoadId);
        //                 if (road) {
        //                     this.handleWaypointClick(road, this.roadSettings, this.roadDragIndex.idx);
        //                 }
        //             }
        //             this.roadDragIndex = null;
        //             this.requestSave();
        //             this.isMouseDown = false;
        //             this.isDraggingMap = false;
        //             this.draggedText = null;
        //             this.lastHex = null;
        //             this.startHex = null;
        //             this.render();
        //             return;
        //         }

        //         if (this.riverDragIndex !== null && this.riverSettings.editMode) {
        //             const dist = Math.sqrt((world.x - this.mouseDownPos.x)**2 + (world.y - this.mouseDownPos.y)**2);
        //             if (dist < 5) {
        //                 const river = this.config.getState().data.rivers && this.config.getState().data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
        //                 if (river) {
        //                     this.handleWaypointClick(river, this.riverSettings, this.riverDragIndex.idx);
        //                 }
        //             }
        //             this.riverDragIndex = null;
        //             this.requestSave();
        //             this.isMouseDown = false;
        //             this.isDraggingMap = false;
        //             this.draggedText = null;
        //             this.lastHex = null;
        //             this.startHex = null;
        //             this.render();
        //             return;
        //         }
        //         const dist = Math.sqrt((world.x - this.mouseDownPos.x)**2 + (world.y - this.mouseDownPos.y)**2);
        //         if (dist < 5 && this.drawMode !== 'eraser') {
        //             const hitText = this.getTextAt(world.x, world.y);
        //             if (hitText) {
        //                 if (this.currentToolGroup === 'text') {
        //                     const hitX = hitText.x, hitY = hitText.y;
        //                     new TextInputModal(this.app, (v, s, l, c, o, b, sh, shd, sho) => {
        //                         const target = this.config.getState().data.texts.find(t => t.x === hitX && t.y === hitY);
        //                         if (v && target) {
        //                             target.text = v; target.size = s; target.link = l;
        //                             target.color = c; target.outline = o; target.bold = b;
        //                             target.shadow = sh; target.shadowDistance = shd; target.shadowOpatown = sho;
        //                             this.lastUsedTextSize = s; this.lastUsedTextColor = c; this.lastUsedTextOutline = o; this.lastUsedTextBold = b;
        //                             this.lastUsedTextShadow = sh; this.lastUsedTextShadowDistance = shd; this.lastUsedTextShadowOpatown = sho;
        //                         }
        //                         else if (!v) { this.config.getState().data.texts = this.config.getState().data.texts.filter(t => !(t.x === hitX && t.y === hitY)); }
        //                         this.render(); this.requestSave();
        //                     }, hitText.text, hitText.size, hitText.link, hitText.color, hitText.outline, hitText.bold, hitText.shadow, hitText.shadowDistance, hitText.shadowOpatown, this.colorPalette, this.colorPalette2).open();
        //                 } else if (hitText.link) {
        //                     this.app.workspace.openLinkText(hitText.link, this.file.path, true);
        //                 }
        //             }
        //         }
        //     }
        //     if (this.isMouseDown || this.draggedText || this.isDraggingMap) this.requestSave();
        //     this.isMouseDown = false;
        //     this.isDraggingMap = false;
        //     this.draggedText = null;
        //     this.roadDragIndex = null;
        //     this.riverDragIndex = null;
        //     this.lastHex = null;
        //     this.startHex = null;
        //     this.render();
        // };
        // this.contentEl.addEventListener('mouseup', stop);
        // this.contentEl.addEventListener('mouseleave', stop);

        // this.canvas.addEventListener('wheel', (e) => {
        //     e.preventDefault();

        //     const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        //     const oldZoom = this.config.getState().data.zoom;
        //     const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * zoomFactor));
        //     if (newZoom === oldZoom) return;

        //     const rect = this.canvas.getBoundingClientRect();
        //     const mouseX = e.clientX - rect.left;
        //     const mouseY = e.clientY - rect.top;

        //     const worldX = (mouseX - this.config.getState().data.offX) / oldZoom;
        //     const worldY = (mouseY - this.config.getState().data.offY) / oldZoom;

        //     this.config.getState().data.offX = mouseX - worldX * newZoom;
        //     this.config.getState().data.offY = mouseY - worldY * newZoom;
        //     this.config.getState().data.zoom = newZoom;

        //     this.render();
        //     this.requestSave();
        // }, { passive: false });

        // this.touchState = {
        //     touches: [],
        //     initialDistance: 0,
        //     initialZoom: 1,
        //     initialPanX: 0,
        //     initialPanY: 0,
        //     isTwoFingerGesture: false,
        //     touchStartTimeout: null,
        //     pendingTouchStart: null,
        //     hasMovedSinceStart: false,
        //     lastTapTime: 0,
        //     lastTapHex: null,
        //     lastTouchX: undefined,
        //     lastTouchY: undefined,
        //     centerX: 0,
        //     centerY: 0,
        //     pivotX: 0,
        //     pivotY: 0
        // };

        // this.canvas.addEventListener('touchstart', (e) => {
        //     this.canvas.focus();
        //     if(!this.touchState) return;
            
        //     this.touchState.touches = Array.from(e.touches);

        //     if (this.touchState.touchStartTimeout) {
        //         clearTimeout(this.touchState.touchStartTimeout);
        //         this.touchState.touchStartTimeout = null;
        //         this.touchState.pendingTouchStart = null;
        //     }

        //     if (e.touches.length === 2) {
        //         e.preventDefault();
        //         this.touchState.isTwoFingerGesture = true;
        //         this.touchState.hasMovedSinceStart = false;
        //         this.touchState.pendingTouchStart = null;

        //         if (this.isMouseDown && !this.touchState.hasMovedSinceStart) {
        //             this.isMouseDown = false;
        //             this.draggedText = null;
        //             if (this.history.length > 0 && !this.touchState.hasMovedSinceStart) {
        //                 this.history.pop(); // Entferne den History-Eintrag vom Touch-Start
        //             }
        //         }

        //         const touch1 = e.touches[0];
        //         const touch2 = e.touches[1];

        //         const dx = touch2.clientX - touch1.clientX;
        //         const dy = touch2.clientY - touch1.clientY;
        //         this.touchState.initialDistance = Math.sqrt(dx * dx + dy * dy);
        //         this.touchState.initialZoom = this.config.getState().data.zoom;

        //         this.touchState.initialPanX = this.config.getState().data.offX;
        //         this.touchState.initialPanY = this.config.getState().data.offY;
        //         this.touchState.centerX = (touch1.clientX + touch2.clientX) / 2;
        //         this.touchState.centerY = (touch1.clientY + touch2.clientY) / 2;

        //         const rect = this.canvas.getBoundingClientRect();
        //         this.touchState.pivotX = this.touchState.centerX - rect.left;
        //         this.touchState.pivotY = this.touchState.centerY - rect.top;
        //     } else if (e.touches.length === 1) {
        //         this.touchState.isTwoFingerGesture = false;
        //         this.touchState.hasMovedSinceStart = false;

        //         const touch = e.touches[0];
        //         const mouseEvent = new MouseEvent('mousedown', {
        //             clientX: touch.clientX,
        //             clientY: touch.clientY,
        //             button: 0,
        //             bubbles: true,
        //             cancelable: true
        //         });

        //         this.touchState.pendingTouchStart = {
        //             touch: touch,
        //             mouseEvent: mouseEvent,
        //             timestamp: Date.now()
        //         };

        //         if (!this.editMode) {
        //             this.touchState.lastTouchX = touch.clientX;
        //             this.touchState.lastTouchY = touch.clientY;
        //         }

        //         this.touchState.touchStartTimeout = setTimeout(() => {
        //             if(!this.touchState) throw new Error("No touch state found!");

        //             if (this.touchState.pendingTouchStart && !this.touchState.isTwoFingerGesture) {
        //                 if (this.touchState.lastTouchX === undefined) {
        //                     this.touchState.lastTouchX = this.touchState.pendingTouchStart.touch.clientX;
        //                     this.touchState.lastTouchY = this.touchState.pendingTouchStart.touch.clientY;
        //                 }
        //                 const world = this.getWorldCoords(this.touchState.pendingTouchStart.mouseEvent);
        //                 this.pendingHistory = true;
        //                 this.isMouseDown = true;
        //                 this.mouseDownPos = { x: world.x, y: world.y };
        //                 this.startHex = pixelToHex(world.x, world.y, this.config.getState().data.gridSize, this.hexOrientation);
        //                 this.lastHex = this.startHex;

        //                 if (this.colorPickMode) {
        //                     const cx = Math.round(this.mouseDownPos.x * this.config.getState().data.zoom + this.config.getState().data.offX);
        //                     const cy = Math.round(this.mouseDownPos.y * this.config.getState().data.zoom + this.config.getState().data.offY);
        //                     if (cx >= 0 && cy >= 0 && cx < this.canvas.width && cy < this.canvas.height) {
        //                         const pixel = this.ctx.getImageData(cx, cy, 1, 1).data;
        //                         if (pixel[3] > 0) {
        //                             this.masterColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
        //                             if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
        //                             this.updateActivePathColor();
        //                             new Notice(localizeString('notice.colorPicked'));
        //                         } else {
        //                             new Notice(localizeString('notice.noColorAtPosition'));
        //                         }
        //                     } else {
        //                         new Notice(localizeString('notice.noColorAtPosition'));
        //                     }
        //                     this.colorPickMode = false;
        //                     if (this.colorEyedropperBtn) { this.colorEyedropperBtn.style.background = BUTTON_BG_DEFAULT; this.colorEyedropperBtn.style.color = ''; }
        //                     this.isMouseDown = false;
        //                     this.touchState.pendingTouchStart = null;
        //                     const toolbar = this.contentEl.querySelector('.hex-toolbar');
        //                     if (toolbar) this.updateToolbarState(toolbar);
        //                     this.render();
        //                     return;
        //                 }

        //                 if (this.patternPickMode) {
        //                     const key = `${this.startHex.q}_${this.startHex.r}`;
        //                     const hexData = this.config.getState().data.hexes[key];
        //                     if (hexData) {
        //                         this.patternData = JSON.parse(JSON.stringify(hexData));
        //                         this.patternSourceHex = { q: this.startHex.q, r: this.startHex.r };
        //                         new Notice(localizeString('notice.patternPicked'));
        //                         this.currentToolGroup = 'pattern';
        //                         this.drawMode = 'pen';
        //                     } else {
        //                         this.patternData = null;
        //                         this.patternSourceHex = null;
        //                         new Notice(localizeString('notice.noHexAtPosition'));
        //                     }
        //                     this.patternPickMode = false;
        //                     if (this.patternPickerBtn) {
        //                         this.patternPickerBtn.style.background = BUTTON_BG_DEFAULT;
        //                     }
        //                     const toolbar = this.contentEl.querySelector('.hex-toolbar');
        //                     if (toolbar) {
        //                         this.updateToolbarState(toolbar);
        //                     }
        //                     this.render();
        //                     this.requestSave();
        //                     this.touchState.pendingTouchStart = null;
        //                     return;
        //                 }

        //                 if (this.borderPickMode) {
        //                     const clickedHex = this.startHex;
        //                     let foundRegion: any = null;
        //                     if (this.config.getState().data.borders) {
        //                         for (const region of this.config.getState().data.borders) {
        //                             if (region.hexes.some(b => b.q === clickedHex.q && b.r === clickedHex.r)) {
        //                                 foundRegion = region;
        //                                 break;
        //                             }
        //                         }
        //                     }
        //                     if (foundRegion) {
        //                         this.borderSettings.activeRegionId = foundRegion.id;
        //                         this.borderSettings.pickedHex = { q: clickedHex.q, r: clickedHex.r };
        //                         this.borderSettings.dashes = foundRegion.dashes || DEFAULT_BORDER_DASHES;
        //                         this.masterColor = foundRegion.color;
        //                         if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
        //                         if (this.borderDashesInput) this.borderDashesInput.value = this.borderSettings.dashes.toString();
        //                         new Notice(localizeString('notice.borderSelected', { id: foundRegion.id }));
        //                     } else {
        //                         new Notice(localizeString('notice.noBorderAtPosition'));
        //                     }
        //                     this.borderPickMode = false;
        //                     if (this.borderPickerBtn) { this.borderPickerBtn.style.background = BUTTON_BG_DEFAULT; this.borderPickerBtn.style.color = ''; }
        //                     this.currentToolGroup = 'border';
        //                     this.drawMode = 'pen';
        //                     const toolbar = this.contentEl.querySelector('.hex-toolbar');
        //                     if (toolbar) this.updateToolbarState(toolbar);
        //                     this.render();
        //                     this.touchState.pendingTouchStart = null;
        //                     return;
        //                 }

        //                 if (this.pathPickMode) {
        //                     this.pickPathAtHex(this.startHex);
        //                     this.touchState.pendingTouchStart = null;
        //                     return;
        //                 }

        //                 let hitText = this.getTextAt(world.x, world.y);
        //                 if (hitText && this.currentToolGroup === 'text' && this.drawMode === 'none') {
        //                     this.pushHistoryIfNeeded();
        //                     this.draggedText = hitText;
        //                 } else {
        //                     this.processInput(this.touchState.pendingTouchStart.mouseEvent, true);
        //                 }
        //             }
        //             this.touchState.pendingTouchStart = null;
        //             this.touchState.touchStartTimeout = null;
        //         }, 150); // 150ms Verzögerung
        //     }
        // }, { passive: false });

        // this.canvas.addEventListener('touchmove', (e) => {
        //     if (e.touches.length === 2 && this.touchState?.isTwoFingerGesture) {
        //         e.preventDefault();

        //         const touch1 = e.touches[0];
        //         const touch2 = e.touches[1];

        //         const dx = touch2.clientX - touch1.clientX;
        //         const dy = touch2.clientY - touch1.clientY;
        //         const currentDistance = Math.sqrt(dx * dx + dy * dy);
        //         const zoomFactor = currentDistance / this.touchState.initialDistance;
        //         const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.touchState.initialZoom * zoomFactor));

        //         const pivotWorldX = (this.touchState.pivotX - this.touchState.initialPanX) / this.touchState.initialZoom;
        //         const pivotWorldY = (this.touchState.pivotY - this.touchState.initialPanY) / this.touchState.initialZoom;

        //         const newOffX = this.touchState.pivotX - pivotWorldX * newZoom;
        //         const newOffY = this.touchState.pivotY - pivotWorldY * newZoom;

        //         const currentCenterX = (touch1.clientX + touch2.clientX) / 2;
        //         const currentCenterY = (touch1.clientY + touch2.clientY) / 2;
        //         const deltaX = currentCenterX - this.touchState.centerX;
        //         const deltaY = currentCenterY - this.touchState.centerY;

        //         this.config.getState().data.zoom = newZoom;
        //         this.config.getState().data.offX = newOffX + deltaX;
        //         this.config.getState().data.offY = newOffY + deltaY;

        //         this.render();
        //     } else if (e.touches.length === 1&& this.touchState && !this.touchState.isTwoFingerGesture) {
        //         if (!this.isMouseDown && this.touchState.pendingTouchStart) {
        //             if (!this.editMode) {
        //                 e.preventDefault();
        //                 this.touchState.hasMovedSinceStart = true;
        //                 const touch = e.touches[0];
        //                 if (this.touchState.lastTouchX !== undefined) {
        //                     this.config.getState().data.offX += touch.clientX - this.touchState.lastTouchX;
        //                     this.config.getState().data.offY += touch.clientY - this.touchState.lastTouchY!;
        //                     this.render();
        //                 }
        //                 this.touchState.lastTouchX = touch.clientX;
        //                 this.touchState.lastTouchY = touch.clientY;
        //             }
        //             return;
        //         }

        //         e.preventDefault();
        //         this.touchState.hasMovedSinceStart = true;

        //         const touch = e.touches[0];
        //         const mouseEvent = new MouseEvent('mousemove', {
        //             clientX: touch.clientX,
        //             clientY: touch.clientY,
        //             bubbles: true,
        //             cancelable: true
        //         });

        //         const world = this.getWorldCoords(mouseEvent);

        //         if (this.draggedText) {
        //             this.draggedText.x = world.x;
        //             this.draggedText.y = world.y;
        //             this.render();
        //         } else if (this.isMouseDown) {
        //             if (!this.editMode) {
        //                 const touch = e.touches[0];
        //                 if (this.touchState.lastTouchX !== undefined) {
        //                     this.config.getState().data.offX += touch.clientX - this.touchState.lastTouchX;
        //                     this.config.getState().data.offY += touch.clientY - this.touchState.lastTouchY!;
        //                     this.render();
        //                 }
        //                 this.touchState.lastTouchX = touch.clientX;
        //                 this.touchState.lastTouchY = touch.clientY;
        //             } else if (this.roadDragIndex !== null && this.roadSettings.editMode) {
        //                 const road = this.config.getState().data.roads && this.config.getState().data.roads.find(r => r.id === this.roadSettings.activeRoadId);
        //                 if (road) {
        //                     const currentHex = pixelToHex(world.x, world.y, this.config.getState().data.gridSize, this.hexOrientation);
        //                     const curQ = road.waypoints[this.roadDragIndex.idx]!.q;
        //                     const curR = road.waypoints[this.roadDragIndex.idx]!.r;
        //                     if (curQ !== currentHex.q || curR !== currentHex.r) {
        //                         this.pushHistoryIfNeeded();
        //                         this.roadDragIndex.group.forEach(i => {
        //                             road.waypoints[i]!.q = currentHex.q;
        //                             road.waypoints[i]!.r = currentHex.r;
        //                         });
        //                         this.render();
        //                     }
        //                 }
        //             } else if (this.riverDragIndex !== null && this.riverSettings.editMode) {
        //                 const river = this.config.getState().data.rivers && this.config.getState().data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
        //                 if (river) {
        //                     const currentHex = pixelToHex(world.x, world.y, this.config.getState().data.gridSize, this.hexOrientation);
        //                     const curQ = river.waypoints[this.riverDragIndex.idx]!.q;
        //                     const curR = river.waypoints[this.riverDragIndex.idx]!.r;
        //                     if (curQ !== currentHex.q || curR !== currentHex.r) {
        //                         this.pushHistoryIfNeeded();
        //                         this.riverDragIndex.group.forEach(i => {
        //                             river.waypoints[i]!.q = currentHex.q;
        //                             river.waypoints[i]!.r = currentHex.r;
        //                         });
        //                         this.render();
        //                     }
        //                 }
        //             } else {
        //                 this.processInput(mouseEvent, false);
        //                 this.render();
        //             }
        //         }
        //     }
        // }, { passive: false });

        // this.canvas.addEventListener('touchend', (e) => {
        //     if(!this.touchState) return;

        //     if (this.touchState.touchStartTimeout) {
        //         clearTimeout(this.touchState.touchStartTimeout);
        //         this.touchState.touchStartTimeout = null;
        //     }

        //     if (this.touchState.isTwoFingerGesture && e.touches.length < 2) {
        //         e.preventDefault();
        //         this.touchState.isTwoFingerGesture = false;
        //         this.requestSave();
        //     } else if (e.touches.length === 0 && !this.touchState.isTwoFingerGesture) {
        //         e.preventDefault();

        //         if (this.touchState.pendingTouchStart && !this.isMouseDown) {
        //             const world = this.getWorldCoords(this.touchState.pendingTouchStart.mouseEvent);
        //             this.pendingHistory = true;
        //             this.isMouseDown = true;
        //             this.mouseDownPos = { x: world.x, y: world.y };
        //             this.startHex = pixelToHex(world.x, world.y, this.config.getState().data.gridSize, this.hexOrientation);
        //             this.lastHex = this.startHex;

        //             if (this.colorPickMode) {
        //                 const cx = Math.round(this.mouseDownPos.x * this.config.getState().data.zoom + this.config.getState().data.offX);
        //                 const cy = Math.round(this.mouseDownPos.y * this.config.getState().data.zoom + this.config.getState().data.offY);
        //                 if (cx >= 0 && cy >= 0 && cx < this.canvas.width && cy < this.canvas.height) {
        //                     const pixel = this.ctx.getImageData(cx, cy, 1, 1).data;
        //                     if (pixel[3] > 0) {
        //                         this.masterColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
        //                         if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
        //                         this.updateActivePathColor();
        //                         new Notice(localizeString('notice.colorPicked'));
        //                     } else {
        //                         new Notice(localizeString('notice.noColorAtPosition'));
        //                     }
        //                 } else {
        //                     new Notice(localizeString('notice.noColorAtPosition'));
        //                 }
        //                 this.colorPickMode = false;
        //                 if (this.colorEyedropperBtn) { this.colorEyedropperBtn.style.background = BUTTON_BG_DEFAULT; this.colorEyedropperBtn.style.color = ''; }
        //                 this.isMouseDown = false;
        //                 this.touchState.pendingTouchStart = null;
        //                 const toolbar = this.contentEl.querySelector('.hex-toolbar');
        //                 if (toolbar) this.updateToolbarState(toolbar);
        //                 this.render();
        //                 return;
        //             }

        //             if (this.patternPickMode) {
        //                 const key = `${this.startHex.q}_${this.startHex.r}`;
        //                 const hexData = this.config.getState().data.hexes[key];
        //                 if (hexData) {
        //                     this.patternData = JSON.parse(JSON.stringify(hexData));
        //                     this.patternSourceHex = { q: this.startHex.q, r: this.startHex.r };
        //                     new Notice(localizeString('notice.patternPicked'));
        //                     this.currentToolGroup = 'pattern';
        //                     this.drawMode = 'pen';
        //                 } else {
        //                     this.patternData = null;
        //                     this.patternSourceHex = null;
        //                     new Notice(localizeString('notice.noHexAtPosition'));
        //                 }
        //                 this.patternPickMode = false;
        //                 if (this.patternPickerBtn) {
        //                     this.patternPickerBtn.style.background = BUTTON_BG_DEFAULT;
        //                 }
        //                 const toolbar = this.contentEl.querySelector('.hex-toolbar');
        //                 if (toolbar) {
        //                     this.updateToolbarState(toolbar);
        //                 }
        //                 this.render();
        //                 this.requestSave();
        //                 this.touchState.pendingTouchStart = null;
        //                 this.isMouseDown = false;
        //                 return;
        //             }

        //             if (this.borderPickMode) {
        //                 const clickedHex = this.startHex;
        //                 let foundRegion: any = null;
        //                 if (this.config.getState().data.borders) {
        //                     for (const region of this.config.getState().data.borders) {
        //                         if (region.hexes.some(b => b.q === clickedHex.q && b.r === clickedHex.r)) {
        //                             foundRegion = region;
        //                             break;
        //                         }
        //                     }
        //                 }
        //                 if (foundRegion) {
        //                     this.borderSettings.activeRegionId = foundRegion.id;
        //                     this.borderSettings.pickedHex = { q: clickedHex.q, r: clickedHex.r };
        //                     this.borderSettings.dashes = foundRegion.dashes || DEFAULT_BORDER_DASHES;
        //                     this.masterColor = foundRegion.color;
        //                     if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
        //                     if (this.borderDashesInput) this.borderDashesInput.value = this.borderSettings.dashes.toString();
        //                     new Notice(localizeString('notice.borderSelected', { id: foundRegion.id }));
        //                 } else {
        //                     new Notice(localizeString('notice.noBorderAtPosition'));
        //                 }
        //                 this.borderPickMode = false;
        //                 if (this.borderPickerBtn) { this.borderPickerBtn.style.background = BUTTON_BG_DEFAULT; this.borderPickerBtn.style.color = ''; }
        //                 this.currentToolGroup = 'border';
        //                 this.drawMode = 'pen';
        //                 const toolbar = this.contentEl.querySelector('.hex-toolbar');
        //                 if (toolbar) this.updateToolbarState(toolbar);
        //                 this.render();
        //                 this.touchState.pendingTouchStart = null;
        //                 this.isMouseDown = false;
        //                 return;
        //             }

        //             if (this.pathPickMode) {
        //                 this.pickPathAtHex(this.startHex);
        //                 this.touchState.pendingTouchStart = null;
        //                 this.isMouseDown = false;
        //                 return;
        //             }

        //             let hitText = this.getTextAt(world.x, world.y);
        //             if (hitText && this.currentToolGroup === 'text' && this.drawMode === 'none') {
        //                 this.pushHistoryIfNeeded();
        //                 this.draggedText = hitText;
        //             } else {
        //                 this.processInput(this.touchState.pendingTouchStart.mouseEvent, true);
        //             }
        //         }

        //         const touch = e.changedTouches[0];
        //         const mouseEvent = new MouseEvent('mouseup', {
        //             clientX: touch.clientX,
        //             clientY: touch.clientY,
        //             bubbles: true,
        //             cancelable: true
        //         });

        //         const world = this.getWorldCoords(mouseEvent);

        //         if (this.isMouseDown && this.mouseDownPos) {
        //             if (this.roadDragIndex !== null && this.roadSettings.editMode) {
        //                 const dist = Math.sqrt((world.x - this.mouseDownPos.x)**2 + (world.y - this.mouseDownPos.y)**2);
        //                 if (dist < 5) {
        //                     const road = this.config.getState().data.roads && this.config.getState().data.roads.find(r => r.id === this.roadSettings.activeRoadId);
        //                     if (road) {
        //                         this.handleWaypointClick(road, this.roadSettings, this.roadDragIndex.idx);
        //                     }
        //                 }
        //                 this.roadDragIndex = null;
        //                 this.requestSave();
        //                 this.isMouseDown = false;
        //                 this.draggedText = null;
        //                 this.lastHex = null;
        //                 this.startHex = null;
        //                 this.touchState.pendingTouchStart = null;
        //                 this.render();
        //                 return;
        //             }

        //             if (this.riverDragIndex !== null && this.riverSettings.editMode) {
        //                 const dist = Math.sqrt((world.x - this.mouseDownPos.x)**2 + (world.y - this.mouseDownPos.y)**2);
        //                 if (dist < 5) {
        //                     const river = this.config.getState().data.rivers && this.config.getState().data.rivers.find(r => r.id === this.riverSettings.activeRiverId);
        //                     if (river) {
        //                         this.handleWaypointClick(river, this.riverSettings, this.riverDragIndex.idx);
        //                     }
        //                 }
        //                 this.riverDragIndex = null;
        //                 this.requestSave();
        //                 this.isMouseDown = false;
        //                 this.draggedText = null;
        //                 this.lastHex = null;
        //                 this.startHex = null;
        //                 this.touchState.pendingTouchStart = null;
        //                 this.render();
        //                 return;
        //             }
        //             const dist = Math.sqrt((world.x - this.mouseDownPos.x)**2 + (world.y - this.mouseDownPos.y)**2);
        //             if (dist < 5 && this.drawMode !== 'eraser') {
        //                 const hitText = this.getTextAt(world.x, world.y);
        //                 if (hitText) {
        //                     if (this.currentToolGroup === 'text') {
        //                         const hitX = hitText.x, hitY = hitText.y;
        //                         new TextInputModal(this.app, (v, s, l, c, o, b, sh, shd, sho) => {
        //                             const target = this.config.getState().data.texts.find(t => t.x === hitX && t.y === hitY);
        //                             if (v && target) {
        //                                 target.text = v; target.size = s; target.link = l;
        //                                 target.color = c; target.outline = o; target.bold = b;
        //                                 target.shadow = sh; target.shadowDistance = shd; target.shadowOpatown = sho;
        //                                 this.lastUsedTextSize = s; this.lastUsedTextColor = c; this.lastUsedTextOutline = o; this.lastUsedTextBold = b;
        //                                 this.lastUsedTextShadow = sh; this.lastUsedTextShadowDistance = shd; this.lastUsedTextShadowOpatown = sho;
        //                             }
        //                             else if (!v) { this.config.getState().data.texts = this.config.getState().data.texts.filter(t => !(t.x === hitX && t.y === hitY)); }
        //                             this.render(); this.requestSave();
        //                         }, hitText.text, hitText.size, hitText.link, hitText.color, hitText.outline, hitText.bold, hitText.shadow, hitText.shadowDistance, hitText.shadowOpatown, this.colorPalette, this.colorPalette2).open();
        //                     } else if (hitText.link) {
        //                         this.app.workspace.openLinkText(hitText.link, this.file.path, true);
        //                     }
        //                 }
        //             }
        //         }
        //         if (this.isMouseDown || this.draggedText || this.touchState.hasMovedSinceStart) this.requestSave();

        //         if (this.editMode && this.drawMode === 'eraser' && e.changedTouches.length > 0) {
        //             const tapTouch = e.changedTouches[0];
        //             const tapEvent = new MouseEvent('mouseup', { clientX: tapTouch.clientX, clientY: tapTouch.clientY, bubbles: true, cancelable: true });
        //             const tapWorld = this.getWorldCoords(tapEvent);
        //             const tapHex = pixelToHex(tapWorld.x, tapWorld.y, this.config.getState().data.gridSize, this.hexOrientation);
        //             const now = Date.now();

        //             if (this.touchState.lastTapTime &&
        //                 now - this.touchState.lastTapTime < 400 &&
        //                 this.touchState.lastTapHex &&
        //                 this.touchState.lastTapHex.q === tapHex.q &&
        //                 this.touchState.lastTapHex.r === tapHex.r) {
        //                 if (this.history.length > 0) this.history.pop();
        //                 this.handleEraserFlood(tapHex);
        //                 this.render();
        //                 this.requestSave();
        //                 this.touchState.lastTapTime = 0;
        //                 this.touchState.lastTapHex = null;
        //             } else {
        //                 this.touchState.lastTapTime = now;
        //                 this.touchState.lastTapHex = { q: tapHex.q, r: tapHex.r };
        //             }
        //         }

        //         this.isMouseDown = false;
        //         this.draggedText = null;
        //         this.roadDragIndex = null;
        //         this.riverDragIndex = null;
        //         this.lastHex = null;
        //         this.startHex = null;
        //         this.touchState.pendingTouchStart = null;
        //         this.touchState.lastTouchX = undefined;
        //         this.touchState.lastTouchY = undefined;
        //         this.render();
        //     }

        //     this.touchState.touches = Array.from(e.touches);
        // }, { passive: false });

        // this.canvas.addEventListener('touchcancel', (e) => {
        //     e.preventDefault();

        //     if(!this.touchState) return;

        //     if (this.touchState.touchStartTimeout) {
        //         clearTimeout(this.touchState.touchStartTimeout);
        //         this.touchState.touchStartTimeout = null;
        //     }

        //     this.touchState.isTwoFingerGesture = false;
        //     this.touchState.pendingTouchStart = null;
        //     this.touchState.lastTouchX = undefined;
        //     this.touchState.lastTouchY = undefined;
        //     this.isMouseDown = false;
        //     this.draggedText = null;
        //     this.roadDragIndex = null;
        //     this.riverDragIndex = null;
        //     this.lastHex = null;
        //     this.startHex = null;
        //     this.touchState.touches = [];
        //     this.render();
        // }, { passive: false });
    }

    // ===============================
    // Rendering
    // ===============================
    private render() {
        if (!this.canvas || !this.ctx) throw new Error("Canvas or context not initialized");
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(this.config.getState().data.offX, this.config.getState().data.offY);
        this.ctx.scale(this.config.getState().data.zoom, this.config.getState().data.zoom);

        Object.values(this.config.getState().data.hexes).forEach(h => {
            this.drawHexBase(h);
        });

        // Zeichenreihenfolge (unten → oben):

        const drawSymbolLayer = (symbols: string[]) => {
            Object.values(this.config.getState().data.hexes).forEach((h: Hexagon) => {
                if (h.symbol && symbols.includes(h.symbol)) {
                    const pos = hexToPixel({  q: h.q, r: h.r }, this.config.getState().data.gridSize, this.config.getState().data.settings.hexOrientation === 'horizontal');
                    if (SVG_SYMBOL_DATA[h.symbol]) {
                        this.drawSVGOnCanvas(h.symbol, pos, h.symbolColor);
                    } else {
                        this.drawCustomSymbol(h.symbol, pos.x, pos.y, this.config.getState().data.gridSize, h.symbolColor);
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

        // if (this.svgLayer) {
        //     while (this.svgLayer.firstChild) this.svgLayer.removeChild(this.svgLayer.firstChild);
        // }

        this.highlightSelectedHex();

        this.ctx.restore();

        this.renderCrosshair();
        this.renderTexts();
        this.renderHexNumbering();
        requestAnimationFrame(() => this.render());
    }

    private highlightSelectedHex() {
        if (!this.canvas || !this.ctx) throw new Error("Canvas or context not initialized");
        if (this.config.getState().selectedToolGroup === 'pattern' && this.patternSourceHex) {
            const pos = hexToPixel({  q: this.patternSourceHex.q, r: this.patternSourceHex.r }, this.config.getState().data.gridSize, this.config.getState().data.settings.hexOrientation === 'horizontal');
            const s = this.config.getState().data.gridSize;

            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 180) * (60 * i + (this.config.getState().data.settings.hexOrientation === 'horizontal' ? 0 : -30));
                this.ctx.lineTo(pos.x + s * Math.cos(a), pos.y + s * Math.sin(a));
            }
            this.ctx.closePath();
            this.ctx.strokeStyle = '#FF0000';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }
    }

    private drawHexBase(h: Hexagon) {
        if (!this.canvas || !this.ctx) throw new Error("Canvas or context not initialized");
        const pos = hexToPixel({ q: h.q, r: h.r }, this.config.getState().data.gridSize, this.config.getState().data.settings.hexOrientation === 'horizontal'), s = this.config.getState().data.gridSize;
        const angleOffset = this.config.getState().data.settings.hexOrientation === 'horizontal' ? 0 : -30;

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

    private drawSVGOnCanvas(symbol, pos, color) {
        if (!this.canvas || !this.ctx) throw new Error("Canvas or context not initialized");
        const svgData = SVG_SYMBOL_DATA[symbol];
        if (!svgData) return;

        const config = SVG_SYMBOL_CONFIG[symbol] || { size: 0.30, align: 'center', marginX: 0, marginY: 0 };
        const baseSize = this.config.getState().data.gridSize * 2.0;
        const size = baseSize * config.size;
        const viewBoxSize = svgData.viewBoxWidth;
        const scale = size / viewBoxSize;

        const hexWidth = this.config.getState().data.gridSize * Math.sqrt(3);
        const hexHeight = this.config.getState().data.gridSize * 2;
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

    private drawCustomSymbol(type, x, y, size, color) {
        if (!this.canvas || !this.ctx) throw new Error("Canvas or context not initialized");
        
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

    private overlapMap: any;
    private buildOverlapMap() {
        this.overlapMap = {};
        const addSegments = (pathObj, type) => {
            if (!pathObj.waypoints || pathObj.waypoints.length < 2) return;
            const wps = pathObj.waypoints;
            const chains: any[] = [];
            let currentChain: any[] = [];
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
                    const pathSegs = calculateHexPath(chain[i], chain[i + 1], pathObj.width);
                    pathSegs.forEach(seg => {
                        if(!this.overlapMap) return;

                        const key = createSegmentKey(seg.from, seg.to);
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
        if (this.config.getState().data.rivers) this.config.getState().data.rivers.forEach(r => addSegments(r, 'river'));
        if (this.config.getState().data.roads) this.config.getState().data.roads.forEach(r => addSegments(r, 'road'));
    }

    private drawRivers() {
        if (!this.config.getState().data.rivers) return;
        this.config.getState().data.rivers.forEach(river => this.drawLinearFeature(river, 'river'));
    }

    private drawRoads() {
        if (!this.config.getState().data.roads) return;
        this.config.getState().data.roads.forEach(road => this.drawLinearFeature(road, 'road'));
    }

    private drawLinearFeature(feature: LinearFeature, type: 'river' | 'road') {
        if (!feature.waypoints || feature.waypoints.length === 0) return;
        if (feature.waypoints.length >= 2) {
            this.drawPathChains(feature, type === 'river', type);
        }
    }

    private drawBorders() {
        if (!this.config.getState().data.borders || this.config.getState().data.borders.length === 0 || !this.config.getState().data.settings.borderSettings.visible) return;
        if (!this.canvas || !this.ctx) throw new Error("Canvas or context not initialized");

        const s = this.config.getState().data.gridSize;
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

        this.config.getState().data.borders.forEach(region => {
        if (!this.canvas || !this.ctx) throw new Error("Canvas or context not initialized");
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
                if (!this.canvas || !this.ctx) throw new Error("Canvas or context not initialized");
                const pos = hexToPixel({ q: b.q, r: b.r }, this.config.getState().data.gridSize, this.config.getState().data.settings.hexOrientation === 'horizontal');

                const corners: any[] = [];
                for (let i = 0; i < 6; i++) {
                    const a = (Math.PI / 180) * (60 * i + (this.config.getState().data.settings.hexOrientation === 'horizontal' ? 0 : -30));
                    corners.push({
                        x: pos.x + sf * factor * Math.cos(a),
                        y: pos.y + sf * factor * Math.sin(a)
                    });
                }

                for (let i = 0; i < 6; i++) {
                    const nb = neighbors[i]!;
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

        const ph = this.config.getState().data.settings.borderSettings.pickedHex;
        if (ph && this.config.getState().selectedToolGroup === 'border') {
            const activeRegion = this.config.getState().data.borders.find(r => r.id === this.config.getState().data.settings.borderSettings.activeRegionId);
            if (activeRegion) {
                this.ctx.strokeStyle = activeRegion.color || '#FF0000';
                this.ctx.lineWidth = DEFAULT_BORDER_HIGHLIGHT_WIDTH;
                this.ctx.setLineDash([4, 4]);
                const pos = hexToPixel({ q: ph.q, r: ph.r }, this.config.getState().data.gridSize, this.config.getState().data.settings.hexOrientation === 'horizontal');
                const hlInset = (sf - DEFAULT_BORDER_HIGHLIGHT_WIDTH / 2 - 1) / sf;
                this.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = (Math.PI / 180) * (60 * i + (this.config.getState().data.settings.hexOrientation === 'horizontal' ? 0 : -30));
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

    private drawPathWaypoints() {
        if (this.config.getState().data.settings.riverSettings.editMode && this.config.getState().data.rivers) {
            const river = this.config.getState().data.rivers.find(r => r.id === this.config.getState().data.settings.riverSettings.activeRiverId);
            if (river && river.waypoints) {
                const activeIdx = this.config.getState().data.settings.riverSettings.insertAfter;
                const activeWp = activeIdx !== null ? river.waypoints[activeIdx] : null;
                river.waypoints.forEach((wp) => {
                    if (!this.canvas || !this.ctx) throw new Error("Canvas or context not initialized");
                    const isActive = activeWp && wp.q === activeWp.q && wp.r === activeWp.r;
                    const pos = hexToPixel({ q: wp.q, r: wp.r }, this.config.getState().data.gridSize, this.config.getState().data.settings.hexOrientation === 'horizontal');
                    this.ctx.beginPath();
                    this.ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
                    this.ctx.fillStyle = isActive ? '#FF0000' : '#000000';
                    this.ctx.fill();
                });
            }
        }
        if (this.config.getState().data.settings.roadSettings.editMode && this.config.getState().data.roads) {
            const road = this.config.getState().data.roads.find(r => r.id === this.config.getState().data.settings.roadSettings.activeRoadId);
            if (road && road.waypoints) {
                const activeIdx = this.config.getState().data.settings.roadSettings.insertAfter;
                const activeWp = activeIdx !== null ? road.waypoints[activeIdx] : null;
                road.waypoints.forEach((wp) => {
                    if (!this.canvas || !this.ctx) throw new Error("Canvas or context not initialized");
                    const isActive = activeWp && wp.q === activeWp.q && wp.r === activeWp.r;
                    const pos = hexToPixel({ q: wp.q, r: wp.r }, this.config.getState().data.gridSize, this.config.getState().data.settings.hexOrientation === 'horizontal');
                    this.ctx.beginPath();
                    this.ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
                    this.ctx.fillStyle = isActive ? '#FF0000' : '#000000';
                    this.ctx.fill();
                });
            }
        }
    }

    private renderCrosshair() {
        if (!this.canvas || !this.ctx) throw new Error("Canvas or context not initialized");
        if (!this.plugin.settings.showCrosshair) return;

        const origin = hexToPixel({ q: 0, r: 0 }, this.config.getState().data.gridSize, this.config.getState().data.settings.hexOrientation === 'horizontal');
        const sx = origin.x * this.config.getState().data.zoom + this.config.getState().data.offX;
        const sy = origin.y * this.config.getState().data.zoom + this.config.getState().data.offY;
        const arm = 2 * this.config.getState().data.gridSize * this.config.getState().data.zoom;

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

    private renderTexts() {
        if (!this.canvas || !this.ctx) throw new Error("Canvas or context not initialized");
        
        this.ctx.save();
        this.ctx.translate(this.config.getState().data.offX, this.config.getState().data.offY);
        this.ctx.scale(this.config.getState().data.zoom, this.config.getState().data.zoom);

        this.config.getState().data.texts.forEach(t => {
            if (!this.canvas || !this.ctx) throw new Error("Canvas or context not initialized");

            const weight = t.bold ? "bold " : "";
            this.ctx.font = `${weight}${t.size || 16}px Verdana`;
            this.ctx.textAlign = "center";

            if (t.shadow) {
                const distance = t.shadowDistance || 5;
                const opacity = (t.shadowOpatown || 50) / 100;
                this.ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
                this.ctx.fillText(t.text, t.x + distance, t.y + distance);
            }

            this.ctx.strokeStyle = "black";
            this.ctx.lineWidth = 2;
            
            if (t.outline !== false) {
                this.ctx.strokeText(t.text, t.x, t.y);
            }

            this.ctx.fillStyle = t.color || "white";
            this.ctx.fillText(t.text, t.x, t.y);
        });

        this.ctx.restore();
    }

    // Nummerierung auf den Live-Canvas zeichnen (kein zoom/translate nötig — direkt in Pixeln)
    private renderHexNumbering() {
        if (!this.plugin.settings.hexNumberingEnabled) return;
        if (!this.ctx) return;
        this._renderHexNumberingToCtx(this.ctx, this.config.getState().data.zoom, this.config.getState().data.offX, this.config.getState().data.offY);
    }

    // Zeichnet Nummerierung auf einen beliebigen 2D-Context
    private _renderHexNumberingToCtx(ctx, zoom, offX, offY) {
        const settings = this.plugin.settings;
        const labels = this._buildHexNumberLabels();
        if (labels.length === 0) return;

        const s = this.config.getState().data.gridSize;
        const fontSize = Math.max(1, (this.plugin.settings.hexNumberingFontSize || 10) * zoom);
        const flatTop = this.config.getState().data.settings.hexOrientation === 'horizontal';

        ctx.save();
        ctx.font = `bold ${fontSize}px Verdana`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const { hex, label } of labels) {
            const pos = hexToPixel({ q: hex.q, r: hex.r }, this.config.getState().data.gridSize, this.config.getState().data.settings.hexOrientation === 'horizontal');

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

    private _buildHexNumberLabels() {
        const settings = this.plugin.settings;
        const hexes: any[] = Object.values(this.config.getState().data.hexes);
        if (hexes.length === 0) return [];

        const horizontal = settings.hexNumberingDirection !== 'vertical';
        const tol = this.config.getState().data.gridSize * 0.6;

        // Pixelposition jeder Wabe berechnen
        const withPos = hexes.map(hex => {
            const pos = hexToPixel({ q: hex.q, r: hex.r }, this.config.getState().data.gridSize, this.config.getState().data.settings.hexOrientation === 'horizontal');
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
        const buildGroups = (values: any[]) => {
            const sorted = [...new Set(values.map(v => Math.round(v)))].sort((a, b) => a - b);
            const groups: any[] = [];
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
                let currentRowPy: number | null = null;
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
                let currentColPx: number | null = null;
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
                let currentRowPy: number | null = null;
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
                let currentColPx : number | null = null;
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

    private drawPathChains(path, taper = false, pathType: string | null = null) {
        const wps = path.waypoints;
        const chains: any[] = [];
        let currentChain: any[] = [];
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
            const segments: any[] = [];
            const pairCount = chain.length - 1;
            const pairSegCounts: any[] = [];
            for (let i = 0; i < pairCount; i++) {
                const pathSegs = calculateHexPath(chain[i], chain[i + 1], path.width);
                pairSegCounts.push(pathSegs.length);
                segments.push(...pathSegs);
            }
            if (pathType && this.overlapMap) {
                segments.forEach(seg => {
                    const key = createSegmentKey(seg.from, seg.to);
                    const info = this.overlapMap![key];
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

    private drawWavyLines(lines, color, defaultWidth, trimStart, trimEnd, dashCount, taper = false) {
        if (!lines || lines.length === 0) return;
        if (!this.canvas || !this.ctx) throw new Error("Canvas or context not initialized");
        this.ctx.strokeStyle = color;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
        this.ctx.lineWidth = defaultWidth;

        const computedLines = lines.map((l, idx) => {
            const fullP1 = hexToPixel({ q: l.from.q, r: l.from.r }, this.config.getState().data.gridSize, this.config.getState().data.settings.hexOrientation === "horizontal"), fullP2 = hexToPixel({ q: l.to.q, r: l.to.r }, this.config.getState().data.gridSize, this.config.getState().data.settings.hexOrientation === "horizontal");
            let p1 = { x: fullP1.x, y: fullP1.y }, p2 = { x: fullP2.x, y: fullP2.y };
            const inset = (1 - PATH_END_INSET) * 0.5;
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

        const allPts: any[] = [];
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
                const amplitude = (this.config.getState().data.gridSize * 0.09) * (0.4 + seed / 15) * sine;
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
}