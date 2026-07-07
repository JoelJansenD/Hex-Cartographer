import { Notice } from 'obsidian';
import { rgbToHex } from '../utils/color';
import { t } from '../i18n';
import { TextInputModal } from '../modals/TextInputModal';
import {
    DEFAULT_BORDER_DASHES,
    BUTTON_BG_DEFAULT,
    MIN_ZOOM,
    MAX_ZOOM,
} from '../constants';

/**
 * Handles all canvas/container event listeners and input processing for
 * HexCartographerView. Covers keyboard, mouse, wheel, and touch events as
 * well as processInput (tool dispatch) and getTextAt (hit-test).
 */
export class InputController {
    private readonly view: any;

    /** @param view The owning HexCartographerView instance. */
    constructor(view: any) {
        this.view = view;
    }

    // ─── Text hit-test ─────────────────────────────────────────────────────────

    /**
     * Returns the first text label whose bounding box contains the given world
     * coordinates, or `null` if none match.
     *
     * Bounding box is derived from the canvas `measureText` result, so the
     * canvas font must be set correctly before this call (it is set internally).
     *
     * @param worldX  X position in world (pre-zoom) coordinates.
     * @param worldY  Y position in world (pre-zoom) coordinates.
     * @returns The matching text object from `view.data.texts`, or `null`.
     */
    getTextAt(worldX: number, worldY: number): any {
        const v = this.view;
        if (!v.data.texts) return null;
        return v.data.texts.find((txt: any) => {
            const weight = txt.bold ? 'bold ' : '';
            v.ctx.font = `${weight}${txt.size || 16}px Verdana`;
            const metrics = v.ctx.measureText(txt.text);
            const halfWidth = metrics.width / 2;
            const height = txt.size || 16;
            return worldX >= txt.x - halfWidth - 5 && worldX <= txt.x + halfWidth + 5 &&
                   worldY >= txt.y - height && worldY <= txt.y + 5;
        }) ?? null;
    }

    // ─── Tool dispatch ─────────────────────────────────────────────────────────

    /**
     * Dispatches a pointer event to the active tool.
     *
     * Called on both mousedown / touchstart (`isInitial = true`) and mousemove /
     * touchmove (`isInitial = false`).  Implausible world coordinates are
     * rejected with a console warning to guard against runaway input.
     *
     * Routing table:
     * - `text` + `drawMode === 'none'` + initial → open TextInputModal.
     * - `eraser` → handleEraser.
     * - `fill`   + initial → handleFillTool.
     * - `pen`    → addBorderHex / addRoadWaypoint / addRiverWaypoint / paintHex.
     *
     * @param e         The originating MouseEvent (or a synthetic MouseEvent
     *                  constructed from a TouchEvent).
     * @param isInitial `true` for the first contact point of a gesture;
     *                  `false` for subsequent drag updates.
     */
    processInput(e: any, isInitial: boolean): void {
        const v = this.view;
        v.historyManager.pushIfNeeded();
        const world = v.getWorldCoords(e);
        if (!isFinite(world.x) || !isFinite(world.y) || Math.abs(world.x) > 1e6 || Math.abs(world.y) > 1e6) {
            console.warn('Rejected processInput: implausible world coords', world);
            return;
        }
        const hex = v.pixelToHex(world.x, world.y);

        if (v.currentToolGroup === 'text' && v.drawMode === 'none' && isInitial) {
            const existingText = this.getTextAt(world.x, world.y);
            if (!existingText) {
                new TextInputModal(v.app, (val, s, l, c, o, b, sh, shd, sho) => {
                    if (val) {
                        v.data.texts.push({ text: val, x: world.x, y: world.y, size: s, link: l, color: c, outline: o, bold: b, shadow: sh, shadowDistance: shd, shadowOpatown: sho });
                        v.lastUsedTextSize = s; v.lastUsedTextColor = c; v.lastUsedTextOutline = o; v.lastUsedTextBold = b;
                        v.lastUsedTextShadow = sh; v.lastUsedTextShadowDistance = shd; v.lastUsedTextShadowOpatown = sho;
                        v.render(); v.requestSave();
                    }
                }, '', v.lastUsedTextSize, '', v.lastUsedTextColor || v.masterColor, v.lastUsedTextOutline, v.lastUsedTextBold, v.lastUsedTextShadow, v.lastUsedTextShadowDistance, v.lastUsedTextShadowOpatown, v.colorPalette, v.colorPalette2).open();
            }
            return;
        }

        if (!v.editMode || v.drawMode === 'none') {
            return;
        }

        if (v.drawMode === 'eraser') {
            v.handleEraser(hex, world.x, world.y);
        } else if (v.drawMode === 'fill') {
            if (isInitial) v.handleFillTool(hex);
        } else if (v.drawMode === 'pen') {
            if (v.currentToolGroup === 'border') {
                v.addBorderHex(hex);
            } else if (v.currentToolGroup === 'road' && isInitial) {
                v.addRoadWaypoint(hex);
            } else if (v.currentToolGroup === 'river' && isInitial) {
                v.addRiverWaypoint(hex);
            } else if (!['river', 'road', 'text'].includes(v.currentToolGroup)) {
                v.paintHex(hex);
            }
        }
    }

    // ─── Event wiring ──────────────────────────────────────────────────────────

    /**
     * Attaches all event listeners to the view's canvas and container element.
     * Must be called exactly once, after the canvas has been added to the DOM
     * (i.e. from `HexCartographerView.onOpen`).
     *
     * Listeners registered:
     * - `keydown`      on containerEl — Ctrl/Cmd+Z undo, Ctrl/Cmd+Y redo.
     * - `mousedown`    on canvas      — tool dispatch, pick modes, drag start.
     * - `contextmenu`  on canvas      — suppress browser menu in edit mode.
     * - `dblclick`     on canvas      — flood-erase shortcut.
     * - `mousemove`    on containerEl — pan, drag text, paint stroke.
     * - `mouseup`      on containerEl — commit stroke / open text modal.
     * - `mouseleave`   on containerEl — same handler as mouseup (stop stroke).
     * - `wheel`        on canvas      — pinch-style zoom at cursor position.
     * - `touchstart`   on canvas      — single-finger draw or two-finger zoom.
     * - `touchmove`    on canvas      — drag / pan / zoom update.
     * - `touchend`     on canvas      — commit tap / stroke.
     * - `touchcancel`  on canvas      — abort gesture, reset state.
     *
     * Also initialises `view.touchState` with its default values.
     */
    setupEventListeners(): void {
        const v = this.view;

        v.containerEl.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                v.historyManager.undo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                v.historyManager.redo();
            }
        });

        v.canvas.addEventListener('mousedown', (e) => {
            v.canvas.focus();
            const world = v.getWorldCoords(e);

            if (e.button === 1 || e.shiftKey) {
                v.isDraggingMap = true;
                return;
            }

            if (e.button === 2 && v.editMode) {
                e.preventDefault();
                const now = Date.now();
                const hex = v.pixelToHex(world.x, world.y);
                const key = `${hex.q}_${hex.r}`;
                if (v._rightClickLast && now - v._rightClickLast.time < 400 && v._rightClickLast.key === key) {
                    v._rightClickLast = null;
                    v.handleEraserFlood(hex);
                    v.render();
                    v.requestSave();
                    return;
                }
                v._rightClickLast = { time: now, key };
                v.isRightMouseErasing = true;
                v.rightEraseLastHex = null;
                v.historyManager.push();
                v.handleEraser(hex, world.x, world.y);
                v.rightEraseLastHex = key;
                v.render();
                return;
            }

            v.historyManager.markPending();
            v.isMouseDown = true;
            v.mouseDownPos = { x: world.x, y: world.y };
            v.startHex = v.pixelToHex(world.x, world.y);
            v.lastHex = v.startHex;

            if (v.colorPickMode) {
                const cx = Math.round(v.mouseDownPos.x * v.data.zoom + v.data.offX);
                const cy = Math.round(v.mouseDownPos.y * v.data.zoom + v.data.offY);
                if (cx >= 0 && cy >= 0 && cx < v.canvas.width && cy < v.canvas.height) {
                    const pixel = v.ctx.getImageData(cx, cy, 1, 1).data;
                    if (pixel[3] > 0) {
                        v.masterColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
                        if (v.masterColorInput) { v.masterColorInput.value = v.masterColor; if (v.masterColorBtn) v.masterColorBtn.style.backgroundColor = v.masterColor; }
                        v.updateActivePathColor();
                        new Notice(t('notice.colorPicked'));
                    } else {
                        new Notice(t('notice.noColorAtPosition'));
                    }
                } else {
                    new Notice(t('notice.noColorAtPosition'));
                }
                v.colorPickMode = false;
                if (v.colorEyedropperBtn) { v.colorEyedropperBtn.style.background = BUTTON_BG_DEFAULT; v.colorEyedropperBtn.style.color = ''; }
                v.isMouseDown = false;
                const toolbar = v.containerEl.querySelector('.hex-toolbar');
                if (toolbar) v.updateToolbarState(toolbar);
                v.render();
                return;
            }

            if (v.patternPickMode) {
                const key = `${v.startHex.q}_${v.startHex.r}`;
                const hexData = v.data.hexes[key];
                if (hexData) {
                    v.patternData = JSON.parse(JSON.stringify(hexData));
                    v.patternSourceHex = { q: v.startHex.q, r: v.startHex.r };
                    new Notice(t('notice.patternPicked'));
                    v.currentToolGroup = 'pattern';
                    v.drawMode = 'pen';
                } else {
                    v.patternData = null;
                    v.patternSourceHex = null;
                    new Notice(t('notice.noHexAtPosition'));
                }
                v.patternPickMode = false;
                if (v.patternPickerBtn) {
                    v.patternPickerBtn.style.background = BUTTON_BG_DEFAULT;
                }
                const toolbar = v.containerEl.querySelector('.hex-toolbar');
                if (toolbar) {
                    v.updateToolbarState(toolbar);
                }
                v.render();
                v.requestSave();
                return;
            }

            if (v.borderPickMode) {
                const clickedHex = v.startHex;
                let foundRegion = null;
                if (v.data.borders) {
                    for (const region of v.data.borders) {
                        if (region.hexes.some(b => b.q === clickedHex.q && b.r === clickedHex.r)) {
                            foundRegion = region;
                            break;
                        }
                    }
                }
                if (foundRegion) {
                    v.borderSettings.activeRegionId = foundRegion.id;
                    v.borderSettings.pickedHex = { q: clickedHex.q, r: clickedHex.r };
                    v.borderSettings.dashes = foundRegion.dashes || DEFAULT_BORDER_DASHES;
                    v.masterColor = foundRegion.color;
                    if (v.masterColorInput) { v.masterColorInput.value = v.masterColor; if (v.masterColorBtn) v.masterColorBtn.style.backgroundColor = v.masterColor; }
                    if (v.borderDashesInput) v.borderDashesInput.value = v.borderSettings.dashes.toString();
                    new Notice(t('notice.borderSelected', { id: foundRegion.id }));
                } else {
                    new Notice(t('notice.noBorderAtPosition'));
                }
                v.borderPickMode = false;
                if (v.borderPickerBtn) {
                    v.borderPickerBtn.style.background = BUTTON_BG_DEFAULT;
                    v.borderPickerBtn.style.color = '';
                }
                v.currentToolGroup = 'border';
                v.drawMode = 'pen';
                const toolbar = v.containerEl.querySelector('.hex-toolbar');
                if (toolbar) {
                    v.updateToolbarState(toolbar);
                }
                v.render();
                return;
            }

            if (v.pathPickMode) {
                v.pickPathAtHex(v.startHex);
                return;
            }

            const hitText = this.getTextAt(world.x, world.y);
            if (hitText && v.currentToolGroup === 'text' && v.drawMode === 'none') {
                v.historyManager.pushIfNeeded();
                v.draggedText = hitText;
            } else {
                this.processInput(e, true);
            }
        });

        v.canvas.addEventListener('contextmenu', (e) => {
            if (v.editMode) e.preventDefault();
        });

        v.canvas.addEventListener('dblclick', (e) => {
            if (!v.editMode) return;
            if (e.button === 2 || v.drawMode === 'eraser') {
                const world = v.getWorldCoords(e);
                const hex = v.pixelToHex(world.x, world.y);
                v.historyManager.dropLast();
                v.handleEraserFlood(hex);
                v.render();
                v.requestSave();
            }
        });

        v.containerEl.addEventListener('mousemove', (e) => {
            const world = v.getWorldCoords(e);
            if (v.isRightMouseErasing) {
                const hex = v.pixelToHex(world.x, world.y);
                const key = `${hex.q}_${hex.r}`;
                if (key !== v.rightEraseLastHex) {
                    v.handleEraser(hex, world.x, world.y);
                    v.rightEraseLastHex = key;
                    v.render();
                }
                return;
            }
            if (v.isDraggingMap) {
                v.data.offX += e.movementX;
                v.data.offY += e.movementY;
                v.render();
            } else if (v.draggedText) {
                v.draggedText.x = world.x;
                v.draggedText.y = world.y;
                v.render();
            } else if (v.isMouseDown) {
                if (!v.editMode) {
                    v.data.offX += e.movementX;
                    v.data.offY += e.movementY;
                    v.render();
                } else if (v.roadDragIndex !== null && v.roadSettings.editMode) {
                    const road = v.data.roads && v.data.roads.find(r => r.id === v.roadSettings.activeRoadId);
                    if (road) {
                        const currentHex = v.pixelToHex(world.x, world.y);
                        const curQ = road.waypoints[v.roadDragIndex.idx].q;
                        const curR = road.waypoints[v.roadDragIndex.idx].r;
                        if (curQ !== currentHex.q || curR !== currentHex.r) {
                            v.historyManager.pushIfNeeded();
                            v.roadDragIndex.group.forEach(i => {
                                road.waypoints[i].q = currentHex.q;
                                road.waypoints[i].r = currentHex.r;
                            });
                            v.render();
                        }
                    }
                } else if (v.riverDragIndex !== null && v.riverSettings.editMode) {
                    const river = v.data.rivers && v.data.rivers.find(r => r.id === v.riverSettings.activeRiverId);
                    if (river) {
                        const currentHex = v.pixelToHex(world.x, world.y);
                        const curQ = river.waypoints[v.riverDragIndex.idx].q;
                        const curR = river.waypoints[v.riverDragIndex.idx].r;
                        if (curQ !== currentHex.q || curR !== currentHex.r) {
                            v.historyManager.pushIfNeeded();
                            v.riverDragIndex.group.forEach(i => {
                                river.waypoints[i].q = currentHex.q;
                                river.waypoints[i].r = currentHex.r;
                            });
                            v.render();
                        }
                    }
                } else {
                    this.processInput(e, false);
                    v.render();
                }
            }

            const hoverText = this.getTextAt(world.x, world.y);
            if (hoverText && hoverText.link) {
                v.canvas.title = `${hoverText.link}`;
                v.canvas.style.cursor = 'pointer';
            } else {
                v.canvas.title = '';
                v.canvas.style.cursor = (hoverText && v.currentToolGroup === 'text') ? 'text' : 'crosshair';
            }
        });

        const stop = (e) => {
            if (v.isRightMouseErasing) {
                v.isRightMouseErasing = false;
                v.rightEraseLastHex = null;
                v.requestSave();
                return;
            }
            const world = v.getWorldCoords(e);
            if (v.isMouseDown && v.mouseDownPos) {
                if (v.roadDragIndex !== null && v.roadSettings.editMode) {
                    const dist = Math.sqrt((world.x - v.mouseDownPos.x) ** 2 + (world.y - v.mouseDownPos.y) ** 2);
                    if (dist < 5) {
                        const road = v.data.roads && v.data.roads.find(r => r.id === v.roadSettings.activeRoadId);
                        if (road) {
                            v.handleWaypointClick(road, v.roadSettings, v.roadDragIndex.idx);
                        }
                    }
                    v.roadDragIndex = null;
                    v.requestSave();
                    v.isMouseDown = false;
                    v.isDraggingMap = false;
                    v.draggedText = null;
                    v.lastHex = null;
                    v.startHex = null;
                    v.render();
                    return;
                }

                if (v.riverDragIndex !== null && v.riverSettings.editMode) {
                    const dist = Math.sqrt((world.x - v.mouseDownPos.x) ** 2 + (world.y - v.mouseDownPos.y) ** 2);
                    if (dist < 5) {
                        const river = v.data.rivers && v.data.rivers.find(r => r.id === v.riverSettings.activeRiverId);
                        if (river) {
                            v.handleWaypointClick(river, v.riverSettings, v.riverDragIndex.idx);
                        }
                    }
                    v.riverDragIndex = null;
                    v.requestSave();
                    v.isMouseDown = false;
                    v.isDraggingMap = false;
                    v.draggedText = null;
                    v.lastHex = null;
                    v.startHex = null;
                    v.render();
                    return;
                }
                const dist = Math.sqrt((world.x - v.mouseDownPos.x) ** 2 + (world.y - v.mouseDownPos.y) ** 2);
                if (dist < 5 && v.drawMode !== 'eraser') {
                    const hitText = this.getTextAt(world.x, world.y);
                    if (hitText) {
                        if (v.currentToolGroup === 'text') {
                            const hitX = hitText.x, hitY = hitText.y;
                            new TextInputModal(v.app, (val, s, l, c, o, b, sh, shd, sho) => {
                                const target = v.data.texts.find((txt: any) => txt.x === hitX && txt.y === hitY);
                                if (val && target) {
                                    target.text = val; target.size = s; target.link = l;
                                    target.color = c; target.outline = o; target.bold = b;
                                    target.shadow = sh; target.shadowDistance = shd; target.shadowOpatown = sho;
                                    v.lastUsedTextSize = s; v.lastUsedTextColor = c; v.lastUsedTextOutline = o; v.lastUsedTextBold = b;
                                    v.lastUsedTextShadow = sh; v.lastUsedTextShadowDistance = shd; v.lastUsedTextShadowOpatown = sho;
                                }
                                else if (!val) { v.data.texts = v.data.texts.filter((txt: any) => !(txt.x === hitX && txt.y === hitY)); }
                                v.render(); v.requestSave();
                            }, hitText.text, hitText.size, hitText.link, hitText.color, hitText.outline, hitText.bold, hitText.shadow, hitText.shadowDistance, hitText.shadowOpatown, v.colorPalette, v.colorPalette2).open();
                        } else if (hitText.link) {
                            v.app.workspace.openLinkText(hitText.link, v.file.path, true);
                        }
                    }
                }
            }
            if (v.isMouseDown || v.draggedText || v.isDraggingMap) v.requestSave();
            v.isMouseDown = false;
            v.isDraggingMap = false;
            v.draggedText = null;
            v.roadDragIndex = null;
            v.riverDragIndex = null;
            v.lastHex = null;
            v.startHex = null;
            v.render();
        };
        v.containerEl.addEventListener('mouseup', stop);
        v.containerEl.addEventListener('mouseleave', stop);

        v.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            const rect = v.canvas.getBoundingClientRect();
            if (v.camera.zoomAtPoint(factor, e.clientX - rect.left, e.clientY - rect.top)) {
                v.render();
                v.requestSave();
            }
        }, { passive: false });

        v.touchState = {
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

        v.canvas.addEventListener('touchstart', (e) => {
            v.canvas.focus();
            v.touchState.touches = Array.from(e.touches);

            if (v.touchState.touchStartTimeout) {
                clearTimeout(v.touchState.touchStartTimeout);
                v.touchState.touchStartTimeout = null;
                v.touchState.pendingTouchStart = null;
            }

            if (e.touches.length === 2) {
                e.preventDefault();
                v.touchState.isTwoFingerGesture = true;
                v.touchState.hasMovedSinceStart = false;
                v.touchState.pendingTouchStart = null;

                if (v.isMouseDown && !v.touchState.hasMovedSinceStart) {
                    v.isMouseDown = false;
                    v.draggedText = null;
                    if (!v.touchState.hasMovedSinceStart) {
                        v.historyManager.dropLast();
                    }
                }

                const touch1 = e.touches[0];
                const touch2 = e.touches[1];

                const dx = touch2.clientX - touch1.clientX;
                const dy = touch2.clientY - touch1.clientY;
                v.touchState.initialDistance = Math.sqrt(dx * dx + dy * dy);
                v.touchState.initialZoom = v.data.zoom;

                v.touchState.initialPanX = v.data.offX;
                v.touchState.initialPanY = v.data.offY;
                v.touchState.centerX = (touch1.clientX + touch2.clientX) / 2;
                v.touchState.centerY = (touch1.clientY + touch2.clientY) / 2;

                const rect = v.canvas.getBoundingClientRect();
                v.touchState.pivotX = v.touchState.centerX - rect.left;
                v.touchState.pivotY = v.touchState.centerY - rect.top;
            } else if (e.touches.length === 1) {
                v.touchState.isTwoFingerGesture = false;
                v.touchState.hasMovedSinceStart = false;

                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    button: 0,
                    bubbles: true,
                    cancelable: true
                });

                v.touchState.pendingTouchStart = {
                    touch: touch,
                    mouseEvent: mouseEvent,
                    timestamp: Date.now()
                };

                if (!v.editMode) {
                    v.touchState.lastTouchX = touch.clientX;
                    v.touchState.lastTouchY = touch.clientY;
                }

                v.touchState.touchStartTimeout = setTimeout(() => {
                    if (v.touchState.pendingTouchStart && !v.touchState.isTwoFingerGesture) {
                        if (v.touchState.lastTouchX === undefined) {
                            v.touchState.lastTouchX = v.touchState.pendingTouchStart.touch.clientX;
                            v.touchState.lastTouchY = v.touchState.pendingTouchStart.touch.clientY;
                        }
                        const world = v.getWorldCoords(v.touchState.pendingTouchStart.mouseEvent);
                        v.historyManager.markPending();
                        v.isMouseDown = true;
                        v.mouseDownPos = { x: world.x, y: world.y };
                        v.startHex = v.pixelToHex(world.x, world.y);
                        v.lastHex = v.startHex;

                        if (v.colorPickMode) {
                            const cx = Math.round(v.mouseDownPos.x * v.data.zoom + v.data.offX);
                            const cy = Math.round(v.mouseDownPos.y * v.data.zoom + v.data.offY);
                            if (cx >= 0 && cy >= 0 && cx < v.canvas.width && cy < v.canvas.height) {
                                const pixel = v.ctx.getImageData(cx, cy, 1, 1).data;
                                if (pixel[3] > 0) {
                                    v.masterColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
                                    if (v.masterColorInput) { v.masterColorInput.value = v.masterColor; if (v.masterColorBtn) v.masterColorBtn.style.backgroundColor = v.masterColor; }
                                    v.updateActivePathColor();
                                    new Notice(t('notice.colorPicked'));
                                } else {
                                    new Notice(t('notice.noColorAtPosition'));
                                }
                            } else {
                                new Notice(t('notice.noColorAtPosition'));
                            }
                            v.colorPickMode = false;
                            if (v.colorEyedropperBtn) { v.colorEyedropperBtn.style.background = BUTTON_BG_DEFAULT; v.colorEyedropperBtn.style.color = ''; }
                            v.isMouseDown = false;
                            v.touchState.pendingTouchStart = null;
                            const toolbar = v.containerEl.querySelector('.hex-toolbar');
                            if (toolbar) v.updateToolbarState(toolbar);
                            v.render();
                            return;
                        }

                        if (v.patternPickMode) {
                            const key = `${v.startHex.q}_${v.startHex.r}`;
                            const hexData = v.data.hexes[key];
                            if (hexData) {
                                v.patternData = JSON.parse(JSON.stringify(hexData));
                                v.patternSourceHex = { q: v.startHex.q, r: v.startHex.r };
                                new Notice(t('notice.patternPicked'));
                                v.currentToolGroup = 'pattern';
                                v.drawMode = 'pen';
                            } else {
                                v.patternData = null;
                                v.patternSourceHex = null;
                                new Notice(t('notice.noHexAtPosition'));
                            }
                            v.patternPickMode = false;
                            if (v.patternPickerBtn) {
                                v.patternPickerBtn.style.background = BUTTON_BG_DEFAULT;
                            }
                            const toolbar = v.containerEl.querySelector('.hex-toolbar');
                            if (toolbar) {
                                v.updateToolbarState(toolbar);
                            }
                            v.render();
                            v.requestSave();
                            v.touchState.pendingTouchStart = null;
                            return;
                        }

                        if (v.borderPickMode) {
                            const clickedHex = v.startHex;
                            let foundRegion = null;
                            if (v.data.borders) {
                                for (const region of v.data.borders) {
                                    if (region.hexes.some(b => b.q === clickedHex.q && b.r === clickedHex.r)) {
                                        foundRegion = region;
                                        break;
                                    }
                                }
                            }
                            if (foundRegion) {
                                v.borderSettings.activeRegionId = foundRegion.id;
                                v.borderSettings.pickedHex = { q: clickedHex.q, r: clickedHex.r };
                                v.borderSettings.dashes = foundRegion.dashes || DEFAULT_BORDER_DASHES;
                                v.masterColor = foundRegion.color;
                                if (v.masterColorInput) { v.masterColorInput.value = v.masterColor; if (v.masterColorBtn) v.masterColorBtn.style.backgroundColor = v.masterColor; }
                                if (v.borderDashesInput) v.borderDashesInput.value = v.borderSettings.dashes.toString();
                                new Notice(t('notice.borderSelected', { id: foundRegion.id }));
                            } else {
                                new Notice(t('notice.noBorderAtPosition'));
                            }
                            v.borderPickMode = false;
                            if (v.borderPickerBtn) { v.borderPickerBtn.style.background = BUTTON_BG_DEFAULT; v.borderPickerBtn.style.color = ''; }
                            v.currentToolGroup = 'border';
                            v.drawMode = 'pen';
                            const toolbar = v.containerEl.querySelector('.hex-toolbar');
                            if (toolbar) v.updateToolbarState(toolbar);
                            v.render();
                            v.touchState.pendingTouchStart = null;
                            return;
                        }

                        if (v.pathPickMode) {
                            v.pickPathAtHex(v.startHex);
                            v.touchState.pendingTouchStart = null;
                            return;
                        }

                        const hitText = this.getTextAt(world.x, world.y);
                        if (hitText && v.currentToolGroup === 'text' && v.drawMode === 'none') {
                            v.historyManager.pushIfNeeded();
                            v.draggedText = hitText;
                        } else {
                            this.processInput(v.touchState.pendingTouchStart.mouseEvent, true);
                        }
                    }
                    v.touchState.pendingTouchStart = null;
                    v.touchState.touchStartTimeout = null;
                }, 150);
            }
        }, { passive: false });

        v.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && v.touchState.isTwoFingerGesture) {
                e.preventDefault();

                const touch1 = e.touches[0];
                const touch2 = e.touches[1];

                const dx = touch2.clientX - touch1.clientX;
                const dy = touch2.clientY - touch1.clientY;
                const currentDistance = Math.sqrt(dx * dx + dy * dy);
                const zoomFactor = currentDistance / v.touchState.initialDistance;
                const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.touchState.initialZoom * zoomFactor));

                const pivotWorldX = (v.touchState.pivotX - v.touchState.initialPanX) / v.touchState.initialZoom;
                const pivotWorldY = (v.touchState.pivotY - v.touchState.initialPanY) / v.touchState.initialZoom;

                const newOffX = v.touchState.pivotX - pivotWorldX * newZoom;
                const newOffY = v.touchState.pivotY - pivotWorldY * newZoom;

                const currentCenterX = (touch1.clientX + touch2.clientX) / 2;
                const currentCenterY = (touch1.clientY + touch2.clientY) / 2;
                const deltaX = currentCenterX - v.touchState.centerX;
                const deltaY = currentCenterY - v.touchState.centerY;

                v.data.zoom = newZoom;
                v.data.offX = newOffX + deltaX;
                v.data.offY = newOffY + deltaY;

                v.render();
            } else if (e.touches.length === 1 && !v.touchState.isTwoFingerGesture) {
                if (!v.isMouseDown && v.touchState.pendingTouchStart) {
                    if (!v.editMode) {
                        e.preventDefault();
                        v.touchState.hasMovedSinceStart = true;
                        const touch = e.touches[0];
                        if (v.touchState.lastTouchX !== undefined) {
                            v.data.offX += touch.clientX - v.touchState.lastTouchX;
                            v.data.offY += touch.clientY - v.touchState.lastTouchY;
                            v.render();
                        }
                        v.touchState.lastTouchX = touch.clientX;
                        v.touchState.lastTouchY = touch.clientY;
                    }
                    return;
                }

                e.preventDefault();
                v.touchState.hasMovedSinceStart = true;

                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    bubbles: true,
                    cancelable: true
                });

                const world = v.getWorldCoords(mouseEvent);

                if (v.draggedText) {
                    v.draggedText.x = world.x;
                    v.draggedText.y = world.y;
                    v.render();
                } else if (v.isMouseDown) {
                    if (!v.editMode) {
                        const touchInner = e.touches[0];
                        if (v.touchState.lastTouchX !== undefined) {
                            v.data.offX += touchInner.clientX - v.touchState.lastTouchX;
                            v.data.offY += touchInner.clientY - v.touchState.lastTouchY;
                            v.render();
                        }
                        v.touchState.lastTouchX = touchInner.clientX;
                        v.touchState.lastTouchY = touchInner.clientY;
                    } else if (v.roadDragIndex !== null && v.roadSettings.editMode) {
                        const road = v.data.roads && v.data.roads.find(r => r.id === v.roadSettings.activeRoadId);
                        if (road) {
                            const currentHex = v.pixelToHex(world.x, world.y);
                            const curQ = road.waypoints[v.roadDragIndex.idx].q;
                            const curR = road.waypoints[v.roadDragIndex.idx].r;
                            if (curQ !== currentHex.q || curR !== currentHex.r) {
                                v.historyManager.pushIfNeeded();
                                v.roadDragIndex.group.forEach(i => {
                                    road.waypoints[i].q = currentHex.q;
                                    road.waypoints[i].r = currentHex.r;
                                });
                                v.render();
                            }
                        }
                    } else if (v.riverDragIndex !== null && v.riverSettings.editMode) {
                        const river = v.data.rivers && v.data.rivers.find(r => r.id === v.riverSettings.activeRiverId);
                        if (river) {
                            const currentHex = v.pixelToHex(world.x, world.y);
                            const curQ = river.waypoints[v.riverDragIndex.idx].q;
                            const curR = river.waypoints[v.riverDragIndex.idx].r;
                            if (curQ !== currentHex.q || curR !== currentHex.r) {
                                v.historyManager.pushIfNeeded();
                                v.riverDragIndex.group.forEach(i => {
                                    river.waypoints[i].q = currentHex.q;
                                    river.waypoints[i].r = currentHex.r;
                                });
                                v.render();
                            }
                        }
                    } else {
                        this.processInput(mouseEvent, false);
                        v.render();
                    }
                }
            }
        }, { passive: false });

        v.canvas.addEventListener('touchend', (e) => {
            if (v.touchState.touchStartTimeout) {
                clearTimeout(v.touchState.touchStartTimeout);
                v.touchState.touchStartTimeout = null;
            }

            if (v.touchState.isTwoFingerGesture && e.touches.length < 2) {
                e.preventDefault();
                v.touchState.isTwoFingerGesture = false;
                v.requestSave();
            } else if (e.touches.length === 0 && !v.touchState.isTwoFingerGesture) {
                e.preventDefault();

                if (v.touchState.pendingTouchStart && !v.isMouseDown) {
                    const worldPending = v.getWorldCoords(v.touchState.pendingTouchStart.mouseEvent);
                    v.historyManager.markPending();
                    v.isMouseDown = true;
                    v.mouseDownPos = { x: worldPending.x, y: worldPending.y };
                    v.startHex = v.pixelToHex(worldPending.x, worldPending.y);
                    v.lastHex = v.startHex;

                    if (v.colorPickMode) {
                        const cx = Math.round(v.mouseDownPos.x * v.data.zoom + v.data.offX);
                        const cy = Math.round(v.mouseDownPos.y * v.data.zoom + v.data.offY);
                        if (cx >= 0 && cy >= 0 && cx < v.canvas.width && cy < v.canvas.height) {
                            const pixel = v.ctx.getImageData(cx, cy, 1, 1).data;
                            if (pixel[3] > 0) {
                                v.masterColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
                                if (v.masterColorInput) { v.masterColorInput.value = v.masterColor; if (v.masterColorBtn) v.masterColorBtn.style.backgroundColor = v.masterColor; }
                                v.updateActivePathColor();
                                new Notice(t('notice.colorPicked'));
                            } else {
                                new Notice(t('notice.noColorAtPosition'));
                            }
                        } else {
                            new Notice(t('notice.noColorAtPosition'));
                        }
                        v.colorPickMode = false;
                        if (v.colorEyedropperBtn) { v.colorEyedropperBtn.style.background = BUTTON_BG_DEFAULT; v.colorEyedropperBtn.style.color = ''; }
                        v.isMouseDown = false;
                        v.touchState.pendingTouchStart = null;
                        const toolbar = v.containerEl.querySelector('.hex-toolbar');
                        if (toolbar) v.updateToolbarState(toolbar);
                        v.render();
                        return;
                    }

                    if (v.patternPickMode) {
                        const key = `${v.startHex.q}_${v.startHex.r}`;
                        const hexData = v.data.hexes[key];
                        if (hexData) {
                            v.patternData = JSON.parse(JSON.stringify(hexData));
                            v.patternSourceHex = { q: v.startHex.q, r: v.startHex.r };
                            new Notice(t('notice.patternPicked'));
                            v.currentToolGroup = 'pattern';
                            v.drawMode = 'pen';
                        } else {
                            v.patternData = null;
                            v.patternSourceHex = null;
                            new Notice(t('notice.noHexAtPosition'));
                        }
                        v.patternPickMode = false;
                        if (v.patternPickerBtn) {
                            v.patternPickerBtn.style.background = BUTTON_BG_DEFAULT;
                        }
                        const toolbar = v.containerEl.querySelector('.hex-toolbar');
                        if (toolbar) {
                            v.updateToolbarState(toolbar);
                        }
                        v.render();
                        v.requestSave();
                        v.touchState.pendingTouchStart = null;
                        v.isMouseDown = false;
                        return;
                    }

                    if (v.borderPickMode) {
                        const clickedHex = v.startHex;
                        let foundRegion = null;
                        if (v.data.borders) {
                            for (const region of v.data.borders) {
                                if (region.hexes.some(b => b.q === clickedHex.q && b.r === clickedHex.r)) {
                                    foundRegion = region;
                                    break;
                                }
                            }
                        }
                        if (foundRegion) {
                            v.borderSettings.activeRegionId = foundRegion.id;
                            v.borderSettings.pickedHex = { q: clickedHex.q, r: clickedHex.r };
                            v.borderSettings.dashes = foundRegion.dashes || DEFAULT_BORDER_DASHES;
                            v.masterColor = foundRegion.color;
                            if (v.masterColorInput) { v.masterColorInput.value = v.masterColor; if (v.masterColorBtn) v.masterColorBtn.style.backgroundColor = v.masterColor; }
                            if (v.borderDashesInput) v.borderDashesInput.value = v.borderSettings.dashes.toString();
                            new Notice(t('notice.borderSelected', { id: foundRegion.id }));
                        } else {
                            new Notice(t('notice.noBorderAtPosition'));
                        }
                        v.borderPickMode = false;
                        if (v.borderPickerBtn) { v.borderPickerBtn.style.background = BUTTON_BG_DEFAULT; v.borderPickerBtn.style.color = ''; }
                        v.currentToolGroup = 'border';
                        v.drawMode = 'pen';
                        const toolbar = v.containerEl.querySelector('.hex-toolbar');
                        if (toolbar) v.updateToolbarState(toolbar);
                        v.render();
                        v.touchState.pendingTouchStart = null;
                        v.isMouseDown = false;
                        return;
                    }

                    if (v.pathPickMode) {
                        v.pickPathAtHex(v.startHex);
                        v.touchState.pendingTouchStart = null;
                        v.isMouseDown = false;
                        return;
                    }

                    const hitTextPending = this.getTextAt(worldPending.x, worldPending.y);
                    if (hitTextPending && v.currentToolGroup === 'text' && v.drawMode === 'none') {
                        v.historyManager.pushIfNeeded();
                        v.draggedText = hitTextPending;
                    } else {
                        this.processInput(v.touchState.pendingTouchStart.mouseEvent, true);
                    }
                }

                const touch = e.changedTouches[0];
                const mouseEvent = new MouseEvent('mouseup', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    bubbles: true,
                    cancelable: true
                });

                const world = v.getWorldCoords(mouseEvent);

                if (v.isMouseDown && v.mouseDownPos) {
                    if (v.roadDragIndex !== null && v.roadSettings.editMode) {
                        const dist = Math.sqrt((world.x - v.mouseDownPos.x) ** 2 + (world.y - v.mouseDownPos.y) ** 2);
                        if (dist < 5) {
                            const road = v.data.roads && v.data.roads.find(r => r.id === v.roadSettings.activeRoadId);
                            if (road) {
                                v.handleWaypointClick(road, v.roadSettings, v.roadDragIndex.idx);
                            }
                        }
                        v.roadDragIndex = null;
                        v.requestSave();
                        v.isMouseDown = false;
                        v.draggedText = null;
                        v.lastHex = null;
                        v.startHex = null;
                        v.touchState.pendingTouchStart = null;
                        v.render();
                        return;
                    }

                    if (v.riverDragIndex !== null && v.riverSettings.editMode) {
                        const dist = Math.sqrt((world.x - v.mouseDownPos.x) ** 2 + (world.y - v.mouseDownPos.y) ** 2);
                        if (dist < 5) {
                            const river = v.data.rivers && v.data.rivers.find(r => r.id === v.riverSettings.activeRiverId);
                            if (river) {
                                v.handleWaypointClick(river, v.riverSettings, v.riverDragIndex.idx);
                            }
                        }
                        v.riverDragIndex = null;
                        v.requestSave();
                        v.isMouseDown = false;
                        v.draggedText = null;
                        v.lastHex = null;
                        v.startHex = null;
                        v.touchState.pendingTouchStart = null;
                        v.render();
                        return;
                    }
                    const dist = Math.sqrt((world.x - v.mouseDownPos.x) ** 2 + (world.y - v.mouseDownPos.y) ** 2);
                    if (dist < 5 && v.drawMode !== 'eraser') {
                        const hitText = this.getTextAt(world.x, world.y);
                        if (hitText) {
                            if (v.currentToolGroup === 'text') {
                                const hitX = hitText.x, hitY = hitText.y;
                                new TextInputModal(v.app, (val, s, l, c, o, b, sh, shd, sho) => {
                                    const target = v.data.texts.find((txt: any) => txt.x === hitX && txt.y === hitY);
                                    if (val && target) {
                                        target.text = val; target.size = s; target.link = l;
                                        target.color = c; target.outline = o; target.bold = b;
                                        target.shadow = sh; target.shadowDistance = shd; target.shadowOpatown = sho;
                                        v.lastUsedTextSize = s; v.lastUsedTextColor = c; v.lastUsedTextOutline = o; v.lastUsedTextBold = b;
                                        v.lastUsedTextShadow = sh; v.lastUsedTextShadowDistance = shd; v.lastUsedTextShadowOpatown = sho;
                                    }
                                    else if (!val) { v.data.texts = v.data.texts.filter((txt: any) => !(txt.x === hitX && txt.y === hitY)); }
                                    v.render(); v.requestSave();
                                }, hitText.text, hitText.size, hitText.link, hitText.color, hitText.outline, hitText.bold, hitText.shadow, hitText.shadowDistance, hitText.shadowOpatown, v.colorPalette, v.colorPalette2).open();
                            } else if (hitText.link) {
                                v.app.workspace.openLinkText(hitText.link, v.file.path, true);
                            }
                        }
                    }
                }
                if (v.isMouseDown || v.draggedText || v.touchState.hasMovedSinceStart) v.requestSave();

                if (v.editMode && v.drawMode === 'eraser' && e.changedTouches.length > 0) {
                    const tapTouch = e.changedTouches[0];
                    const tapEvent = new MouseEvent('mouseup', { clientX: tapTouch.clientX, clientY: tapTouch.clientY, bubbles: true, cancelable: true });
                    const tapWorld = v.getWorldCoords(tapEvent);
                    const tapHex = v.pixelToHex(tapWorld.x, tapWorld.y);
                    const now = Date.now();

                    if (v.touchState.lastTapTime &&
                        now - v.touchState.lastTapTime < 400 &&
                        v.touchState.lastTapHex &&
                        v.touchState.lastTapHex.q === tapHex.q &&
                        v.touchState.lastTapHex.r === tapHex.r) {
                        v.historyManager.dropLast();
                        v.handleEraserFlood(tapHex);
                        v.render();
                        v.requestSave();
                        v.touchState.lastTapTime = 0;
                        v.touchState.lastTapHex = null;
                    } else {
                        v.touchState.lastTapTime = now;
                        v.touchState.lastTapHex = { q: tapHex.q, r: tapHex.r };
                    }
                }

                v.isMouseDown = false;
                v.draggedText = null;
                v.roadDragIndex = null;
                v.riverDragIndex = null;
                v.lastHex = null;
                v.startHex = null;
                v.touchState.pendingTouchStart = null;
                v.touchState.lastTouchX = undefined;
                v.touchState.lastTouchY = undefined;
                v.render();
            }

            v.touchState.touches = Array.from(e.touches);
        }, { passive: false });

        v.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();

            if (v.touchState.touchStartTimeout) {
                clearTimeout(v.touchState.touchStartTimeout);
                v.touchState.touchStartTimeout = null;
            }

            v.touchState.isTwoFingerGesture = false;
            v.touchState.pendingTouchStart = null;
            v.touchState.lastTouchX = undefined;
            v.touchState.lastTouchY = undefined;
            v.isMouseDown = false;
            v.draggedText = null;
            v.roadDragIndex = null;
            v.riverDragIndex = null;
            v.lastHex = null;
            v.startHex = null;
            v.touchState.touches = [];
            v.render();
        }, { passive: false });
    }
}
