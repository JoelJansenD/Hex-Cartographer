import { Notice, setIcon } from 'obsidian';
import { calculateHexPath } from '../utils/hexMath';
import { t } from '../i18n';
import {
    DEFAULT_PATH_DASHES,
    BUTTON_BG_DEFAULT,
    PICKER_ACTIVE_BG,
} from '../constants';

/**
 * Handles river/road waypoint editing for HexCartographerView.
 * Covers path creation, waypoint insertion, drag initiation, waypoint-click
 * toggling, path-picker completion, erasing, and clearing edit mode.
 */
export class PathTools {
    private readonly view: any;

    constructor(view: any) {
        this.view = view;
    }

    // ─── Waypoint click ────────────────────────────────────────────────────────

    handleWaypointClick(path: any, settings: any, clickedIdx: number): void {
        const v = this.view;
        const now = Date.now();
        const isDouble = v.lastWaypointClick &&
                         v.lastWaypointClick.pathId === path.id &&
                         v.lastWaypointClick.idx === clickedIdx &&
                         (now - v.lastWaypointClick.time) < 400;
        if (isDouble) {
            const anchorIdx = v.lastWaypointClick.previousInsertAfter;
            if (anchorIdx !== null && anchorIdx !== undefined && anchorIdx !== clickedIdx) {
                const fromWp = path.waypoints[anchorIdx];
                const toWp   = path.waypoints[clickedIdx];
                if (fromWp && toWp && (fromWp.q !== toWp.q || fromWp.r !== toWp.r)) {
                    path.waypoints.push({ q: fromWp.q, r: fromWp.r, break: true });
                    path.waypoints.push({ q: toWp.q,   r: toWp.r });
                    settings.insertAfter = path.waypoints.length - 1;
                }
            }
            v.lastWaypointClick = null;
        } else {
            v.lastWaypointClick = {
                pathId: path.id,
                idx: clickedIdx,
                time: now,
                previousInsertAfter: settings.insertAfter,
            };
            settings.insertAfter = clickedIdx;
        }
        v.render();
        v.requestSave();
    }

    // ─── Path picker ───────────────────────────────────────────────────────────

    completePathPick(path: any, type: 'river' | 'road'): void {
        const v = this.view;
        this.exitPathEditMode();
        v.pathPickPending = null;
        if (type === 'river') {
            v.currentToolGroup = 'river';
            v.riverSettings.activeRiverId  = path.id;
            v.riverSettings.width          = path.width;
            v.riverSettings.editMode       = true;
            v.riverSettings.insertAfter    = path.waypoints.length - 1;
            v.masterColor = path.color;
            if (v.masterColorInput) { v.masterColorInput.value = v.masterColor; if (v.masterColorBtn) v.masterColorBtn.style.backgroundColor = v.masterColor; }
            if (v.riverWidthInput) v.riverWidthInput.value = path.width.toString();
            v.pathDashes = path.dashes || DEFAULT_PATH_DASHES;
            if (v.pathDashesInput) v.pathDashesInput.value = v.pathDashes.toString();
            new Notice(t('notice.riverSelected', { id: path.id }));
        } else {
            v.currentToolGroup = 'road';
            v.roadSettings.activeRoadId  = path.id;
            v.roadSettings.width         = path.width;
            v.roadSettings.editMode      = true;
            v.roadSettings.insertAfter   = path.waypoints.length - 1;
            v.masterColor = path.color;
            if (v.masterColorInput) { v.masterColorInput.value = v.masterColor; if (v.masterColorBtn) v.masterColorBtn.style.backgroundColor = v.masterColor; }
            if (v.roadWidthInput) v.roadWidthInput.value = path.width.toString();
            v.pathDashes = path.dashes || DEFAULT_PATH_DASHES;
            if (v.pathDashesInput) v.pathDashesInput.value = v.pathDashes.toString();
            new Notice(t('notice.roadSelected', { id: path.id }));
        }
        v.lastToolGroup = null;
        v.pathPickMode  = false;
        if (v.pathPickerBtn) {
            v.pathPickerBtn.style.background = BUTTON_BG_DEFAULT;
            v.pathPickerBtn.style.color      = '';
        }
        v.drawMode = 'pen';
        const toolbar = v.containerEl.querySelector('.hex-toolbar');
        if (toolbar) v.updateToolbarState(toolbar);
        v.render();
        v.requestSave();
    }

    pickPathAtHex(hex: any): void {
        const v = this.view;
        v.pathPickPending = null;
        const foundRiver = this.findRiverAtHex(hex);
        const foundRoad  = this.findRoadAtHex(hex);

        if (foundRiver && foundRoad) {
            v.pathPickPending = { river: foundRiver, road: foundRoad };
            new Notice(t('notice.chooseRiverOrRoad'));
            const toolbar = v.containerEl.querySelector('.hex-toolbar');
            if (toolbar) v.updateToolbarState(toolbar);
            return;
        }

        if (foundRiver) {
            this.completePathPick(foundRiver, 'river');
        } else if (foundRoad) {
            this.completePathPick(foundRoad, 'road');
        } else {
            v.currentToolGroup = v.lastToolGroup;
            if (v.currentToolGroup === 'hexcolor') {
                v.masterColor = v.hexColorColor;
            } else if (v.currentToolGroup && v.toolConfigs[v.currentToolGroup]) {
                v.masterColor = v.toolConfigs[v.currentToolGroup].symbolColor;
            }
            v.lastToolGroup = null;
            v.pathPickMode  = false;
            if (v.pathPickerBtn) {
                v.pathPickerBtn.style.background = BUTTON_BG_DEFAULT;
                v.pathPickerBtn.style.color      = '';
            }
            v.drawMode = 'pen';
            const toolbar = v.containerEl.querySelector('.hex-toolbar');
            if (toolbar) v.updateToolbarState(toolbar);
            v.render();
        }
    }

    // ─── Color update ──────────────────────────────────────────────────────────

    updateActivePathColor(): void {
        const v = this.view;
        if (v.riverSettings.editMode) {
            const river = v.data.rivers && v.data.rivers.find((r: any) => r.id === v.riverSettings.activeRiverId);
            if (river) { river.color = v.masterColor; v.render(); v.requestSave(); }
        }
        if (v.roadSettings.editMode) {
            const road = v.data.roads && v.data.roads.find((r: any) => r.id === v.roadSettings.activeRoadId);
            if (road) { road.color = v.masterColor; v.render(); v.requestSave(); }
        }
        if (v.borderSettings.activeRegionId !== null && v.currentToolGroup === 'border') {
            const region = v.data.borders && v.data.borders.find((r: any) => r.id === v.borderSettings.activeRegionId);
            if (region) { region.color = v.masterColor; v.render(); v.requestSave(); }
        }
        if (v.currentToolGroup === 'hexcolor') {
            v.hexColorColor = v.masterColor;
            const toolbar = v.containerEl.querySelector('.hex-toolbar');
            if (toolbar) v.updateToolbarState(toolbar);
        } else if (v.currentToolGroup && v.toolConfigs[v.currentToolGroup]) {
            v.toolConfigs[v.currentToolGroup].symbolColor = v.masterColor;
            const toolbar = v.containerEl.querySelector('.hex-toolbar');
            if (toolbar) v.updateToolbarState(toolbar);
        }
    }

    // ─── Exit edit mode ────────────────────────────────────────────────────────

    exitPathEditMode(): void {
        const v = this.view;
        let changed = false;
        for (const settings of [v.riverSettings, v.roadSettings]) {
            if (settings.editMode) {
                const isRiver    = settings === v.riverSettings;
                const activeIdKey = isRiver ? 'activeRiverId' : 'activeRoadId';
                const arr        = isRiver ? v.data.rivers : v.data.roads;
                const activeId   = settings[activeIdKey];
                if (activeId != null && arr) {
                    const idx = arr.findIndex((p: any) => p.id === activeId);
                    if (idx !== -1 && arr[idx].waypoints.length < 2) {
                        arr.splice(idx, 1);
                    }
                }
                settings.editMode      = false;
                settings[activeIdKey]  = null;
                settings.insertAfter   = null;
                changed = true;
            }
        }
        if (v.pathPickerBtn) {
            setIcon(v.pathPickerBtn, 'mouse-pointer');
            v.pathPickerBtn.style.background = BUTTON_BG_DEFAULT;
            v.pathPickerBtn.style.color      = '';
            v.pathPickerBtn.setAttribute('title', t('tooltip.pathPicker'));
        }
        v.pathPickMode    = false;
        v.patternPickMode = false;
        if (v.patternPickerBtn) {
            v.patternPickerBtn.style.background = BUTTON_BG_DEFAULT;
        }
        v.borderPickMode = false;
        if (v.borderPickerBtn) {
            v.borderPickerBtn.style.background = BUTTON_BG_DEFAULT;
            v.borderPickerBtn.style.color      = '';
        }
        v.colorPickMode = false;
        if (v.colorEyedropperBtn) {
            v.colorEyedropperBtn.style.background = BUTTON_BG_DEFAULT;
            v.colorEyedropperBtn.style.color      = '';
        }
        if (v.borderSettings.activeRegionId !== null) {
            v.borderSettings.activeRegionId = null;
            v.borderSettings.pickedHex      = null;
            if (v.drawMode === 'eraser') v.drawMode = 'pen';
            changed = true;
        }
        if (changed) v.render();
    }

    // ─── Find path at hex ──────────────────────────────────────────────────────

    findRoadAtHex(hex: any): any {
        const v = this.view;
        if (!v.data.roads) return null;
        for (const road of v.data.roads) {
            if (!road.waypoints || road.waypoints.length === 0) continue;
            if (road.waypoints.some((w: any) => w.q === hex.q && w.r === hex.r)) return road;
            for (let i = 0; i < road.waypoints.length - 1; i++) {
                const segs = calculateHexPath(road.waypoints[i], road.waypoints[i + 1], road.width);
                for (const seg of segs) {
                    if (seg.to.q === hex.q && seg.to.r === hex.r) return road;
                    if (seg.from.q === hex.q && seg.from.r === hex.r) return road;
                }
            }
        }
        return null;
    }

    findRiverAtHex(hex: any): any {
        const v = this.view;
        if (!v.data.rivers) return null;
        for (const river of v.data.rivers) {
            if (!river.waypoints || river.waypoints.length === 0) continue;
            if (river.waypoints.some((w: any) => w.q === hex.q && w.r === hex.r)) return river;
            for (let i = 0; i < river.waypoints.length - 1; i++) {
                const segs = calculateHexPath(river.waypoints[i], river.waypoints[i + 1], river.width);
                for (const seg of segs) {
                    if (seg.to.q === hex.q && seg.to.r === hex.r) return river;
                    if (seg.from.q === hex.q && seg.from.r === hex.r) return river;
                }
            }
        }
        return null;
    }

    // ─── Add waypoints ─────────────────────────────────────────────────────────

    addRoadWaypoint(hex: any): void {
        const v = this.view;
        if (!v.data.roads) v.data.roads = [];

        let road = v.data.roads.find((r: any) => r.id === v.roadSettings.activeRoadId);
        if (road) road.dashes = v.pathDashes || DEFAULT_PATH_DASHES;
        if (!road) {
            const maxId = v.data.roads.reduce((max: number, r: any) => Math.max(max, r.id || 0), 0);
            road = { id: maxId + 1, color: v.masterColor, width: v.roadSettings.width, dashes: v.pathDashes || DEFAULT_PATH_DASHES, waypoints: [] };
            v.data.roads.push(road);
            v.roadSettings.activeRoadId  = road.id;
            v.roadSettings.editMode      = true;
            v.roadSettings.insertAfter   = null;
            if (v.pathPickerBtn) {
                setIcon(v.pathPickerBtn, 'check');
                v.pathPickerBtn.style.background = PICKER_ACTIVE_BG;
                v.pathPickerBtn.style.color      = 'var(--text-on-accent)';
                v.pathPickerBtn.setAttribute('title', t('tooltip.roadFinish'));
            }
        }

        if (v.roadSettings.editMode) {
            const existingIdx = road.waypoints.findIndex((w: any) => w.q === hex.q && w.r === hex.r);
            if (existingIdx !== -1) {
                const dragGroup: number[] = [];
                road.waypoints.forEach((wp: any, i: number) => { if (wp.q === hex.q && wp.r === hex.r) dragGroup.push(i); });
                v.roadDragIndex = { idx: existingIdx, origQ: hex.q, origR: hex.r, group: dragGroup };
                return;
            }

            for (let i = 0; i < road.waypoints.length - 1; i++) {
                const to   = road.waypoints[i + 1];
                if (to.break) continue;
                const from = road.waypoints[i];
                const segs = calculateHexPath(from, to, road.width);
                const onSegment = segs.some((s: any) =>
                    (s.from.q === hex.q && s.from.r === hex.r) ||
                    (s.to.q   === hex.q && s.to.r   === hex.r)
                );
                if (onSegment) {
                    road.waypoints.splice(i + 1, 0, { q: hex.q, r: hex.r });
                    v.roadSettings.insertAfter = i + 1;
                    return;
                }
            }
        }

        const insertIdx = v.roadSettings.insertAfter;
        if (insertIdx !== null && insertIdx < road.waypoints.length - 1) {
            const bp = road.waypoints[insertIdx];
            road.waypoints.push({ q: bp.q, r: bp.r, break: true });
            road.waypoints.push({ q: hex.q, r: hex.r });
            v.roadSettings.insertAfter = road.waypoints.length - 1;
        } else {
            road.waypoints.push({ q: hex.q, r: hex.r });
            v.roadSettings.insertAfter = road.waypoints.length - 1;
        }
    }

    addRiverWaypoint(hex: any): void {
        const v = this.view;
        if (!v.data.rivers) v.data.rivers = [];

        let river = v.data.rivers.find((r: any) => r.id === v.riverSettings.activeRiverId);
        if (river) river.dashes = v.pathDashes || DEFAULT_PATH_DASHES;
        if (!river) {
            const maxId = v.data.rivers.reduce((max: number, r: any) => Math.max(max, r.id || 0), 0);
            river = { id: maxId + 1, color: v.masterColor, width: v.riverSettings.width, dashes: v.pathDashes || DEFAULT_PATH_DASHES, waypoints: [] };
            v.data.rivers.push(river);
            v.riverSettings.activeRiverId = river.id;
            v.riverSettings.editMode      = true;
            v.riverSettings.insertAfter   = null;
            if (v.pathPickerBtn) {
                setIcon(v.pathPickerBtn, 'check');
                v.pathPickerBtn.style.background = PICKER_ACTIVE_BG;
                v.pathPickerBtn.style.color      = 'var(--text-on-accent)';
                v.pathPickerBtn.setAttribute('title', t('tooltip.riverFinish'));
            }
        }

        if (v.riverSettings.editMode) {
            const existingIdx = river.waypoints.findIndex((w: any) => w.q === hex.q && w.r === hex.r);
            if (existingIdx !== -1) {
                const dragGroup: number[] = [];
                river.waypoints.forEach((wp: any, i: number) => { if (wp.q === hex.q && wp.r === hex.r) dragGroup.push(i); });
                v.riverDragIndex = { idx: existingIdx, origQ: hex.q, origR: hex.r, group: dragGroup };
                return;
            }

            for (let i = 0; i < river.waypoints.length - 1; i++) {
                const to   = river.waypoints[i + 1];
                if (to.break) continue;
                const from = river.waypoints[i];
                const segs = calculateHexPath(from, to, river.width);
                const onSegment = segs.some((s: any) =>
                    (s.from.q === hex.q && s.from.r === hex.r) ||
                    (s.to.q   === hex.q && s.to.r   === hex.r)
                );
                if (onSegment) {
                    river.waypoints.splice(i + 1, 0, { q: hex.q, r: hex.r });
                    v.riverSettings.insertAfter = i + 1;
                    return;
                }
            }
        }

        const insertIdx = v.riverSettings.insertAfter;
        if (insertIdx !== null && insertIdx < river.waypoints.length - 1) {
            const bp = river.waypoints[insertIdx];
            river.waypoints.push({ q: bp.q, r: bp.r, break: true });
            river.waypoints.push({ q: hex.q, r: hex.r });
            v.riverSettings.insertAfter = river.waypoints.length - 1;
        } else {
            river.waypoints.push({ q: hex.q, r: hex.r });
            v.riverSettings.insertAfter = river.waypoints.length - 1;
        }
    }

    // ─── Erase path elements ───────────────────────────────────────────────────

    erasePathElement(paths: any[], hex: any): void {
        if (!paths) return;
        const onWaypoint = paths.some((p: any) =>
            p.waypoints && p.waypoints.some((w: any) => w.q === hex.q && w.r === hex.r)
        );
        if (onWaypoint) {
            paths.forEach((p: any) => {
                p.waypoints = p.waypoints.filter((w: any) => !(w.q === hex.q && w.r === hex.r));
            });
        } else {
            for (const path of paths) {
                if (!path.waypoints || path.waypoints.length < 2) continue;
                for (let i = 0; i < path.waypoints.length - 1; i++) {
                    const to = path.waypoints[i + 1];
                    if (to.break) continue;
                    const from = path.waypoints[i];
                    const segs = calculateHexPath(from, to, path.width);
                    const onSegment = segs.some((s: any) =>
                        (s.from.q === hex.q && s.from.r === hex.r) ||
                        (s.to.q   === hex.q && s.to.r   === hex.r)
                    );
                    if (onSegment) {
                        to.break = true;
                        break;
                    }
                }
            }
        }
        paths.forEach((path: any) => {
            let changed = true;
            while (changed) {
                changed = false;
                for (let j = path.waypoints.length - 1; j >= 0; j--) {
                    const hasLeft  = j > 0 && !path.waypoints[j].break;
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
}
