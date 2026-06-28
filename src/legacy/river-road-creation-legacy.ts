import { setIcon } from 'obsidian';
import { DEFAULT_PATH_DASHES, PICKER_ACTIVE_BG } from '../constants';
import { localizeString } from '../functions/i18n';
import { calculateHexPath } from '../functions/hexes';

export function handleWaypointClickLegacy(view: any, path: any, settings: any, clickedIdx: number) {
    const now = Date.now();
    const isDouble = view.lastWaypointClick
        && view.lastWaypointClick.pathId === path.id
        && view.lastWaypointClick.idx === clickedIdx
        && (now - view.lastWaypointClick.time) < 400;

    if(isDouble) {
        const anchorIdx = view.lastWaypointClick.previousInsertAfter;
        if(anchorIdx !== null && anchorIdx !== undefined && anchorIdx !== clickedIdx) {
            const fromWp = path.waypoints[anchorIdx];
            const toWp = path.waypoints[clickedIdx];
            if(fromWp && toWp && (fromWp.q !== toWp.q || fromWp.r !== toWp.r)) {
                path.waypoints.push({ q: fromWp.q, r: fromWp.r, break: true });
                path.waypoints.push({ q: toWp.q, r: toWp.r });
                settings.insertAfter = path.waypoints.length - 1;
            }
        }
        view.lastWaypointClick = null;
    }
    else {
        view.lastWaypointClick = {
            pathId: path.id,
            idx: clickedIdx,
            time: now,
            previousInsertAfter: settings.insertAfter,
        };
        settings.insertAfter = clickedIdx;
    }

    view.render();
    view.requestSave();
}

export function findRoadAtHexLegacy(view: any, hex: { q: number; r: number }) {
    if(!view.data.roads) {
        return null;
    }

    for(const road of view.data.roads) {
        if(!road.waypoints || road.waypoints.length === 0) {
            continue;
        }

        if(road.waypoints.some((w: any) => w.q === hex.q && w.r === hex.r)) {
            return road;
        }

        for(let i = 0; i < road.waypoints.length - 1; i++) {
            const segs = calculateHexPath(road.waypoints[i]!, road.waypoints[i + 1]!, road.width);
            for(const seg of segs) {
                if(seg.to.q === hex.q && seg.to.r === hex.r) {
                    return road;
                }

                if(seg.from.q === hex.q && seg.from.r === hex.r) {
                    return road;
                }
            }
        }
    }

    return null;
}

export function addRoadWaypointLegacy(view: any, hex: { q: number; r: number }) {
    if(!view.data.roads) {
        view.data.roads = [];
    }

    let road = view.data.roads.find((r: any) => r.id === view.roadSettings.activeRoadId);
    if(road) {
        road.dashes = view.pathDashes || DEFAULT_PATH_DASHES;
    }

    if(!road) {
        const maxId = view.data.roads.reduce((max: number, r: any) => Math.max(max, r.id || 0), 0);
        road = {
            id: maxId + 1,
            color: view.masterColor,
            width: view.roadSettings.width,
            dashes: view.pathDashes || DEFAULT_PATH_DASHES,
            waypoints: [],
        };

        view.data.roads.push(road);
        view.roadSettings.activeRoadId = road.id;
        view.roadSettings.editMode = true;
        view.roadSettings.insertAfter = null;

        if(view.pathPickerBtn) {
            setIcon(view.pathPickerBtn, 'check');
            view.pathPickerBtn.style.background = PICKER_ACTIVE_BG;
            view.pathPickerBtn.style.color = 'var(--text-on-accent)';
            view.pathPickerBtn.setAttribute('title', localizeString('tooltip.roadFinish'));
        }
    }

    if(view.roadSettings.editMode) {
        const existingIdx = road.waypoints.findIndex((w: any) => w.q === hex.q && w.r === hex.r);
        if(existingIdx !== -1) {
            const dragGroup: number[] = [];
            road.waypoints.forEach((wp: any, i: number) => {
                if(wp.q === hex.q && wp.r === hex.r) {
                    dragGroup.push(i);
                }
            });
            view.roadDragIndex = { idx: existingIdx, origQ: hex.q, origR: hex.r, group: dragGroup };
            return;
        }

        for(let i = 0; i < road.waypoints.length - 1; i++) {
            const to = road.waypoints[i + 1]!;
            if(to.break) {
                continue;
            }

            const from = road.waypoints[i]!;
            const segs = calculateHexPath(from, to, road.width);
            const onSegment = segs.some((s: any) =>
                (s.from.q === hex.q && s.from.r === hex.r)
                || (s.to.q === hex.q && s.to.r === hex.r)
            );

            if(onSegment) {
                road.waypoints.splice(i + 1, 0, { q: hex.q, r: hex.r });
                view.roadSettings.insertAfter = i + 1;
                return;
            }
        }
    }

    const insertIdx = view.roadSettings.insertAfter;
    if(insertIdx !== null && insertIdx < road.waypoints.length - 1) {
        const bp = road.waypoints[insertIdx]!;
        road.waypoints.push({ q: bp.q, r: bp.r, break: true });
        road.waypoints.push({ q: hex.q, r: hex.r });
        view.roadSettings.insertAfter = road.waypoints.length - 1;
    }
    else {
        road.waypoints.push({ q: hex.q, r: hex.r });
        view.roadSettings.insertAfter = road.waypoints.length - 1;
    }
}

export function findRiverAtHexLegacy(view: any, hex: { q: number; r: number }) {
    if(!view.data.rivers) {
        return null;
    }

    for(const river of view.data.rivers) {
        if(!river.waypoints || river.waypoints.length === 0) {
            continue;
        }

        if(river.waypoints.some((w: any) => w.q === hex.q && w.r === hex.r)) {
            return river;
        }

        for(let i = 0; i < river.waypoints.length - 1; i++) {
            const segs = calculateHexPath(river.waypoints[i]!, river.waypoints[i + 1]!, river.width);
            for(const seg of segs) {
                if(seg.to.q === hex.q && seg.to.r === hex.r) {
                    return river;
                }

                if(seg.from.q === hex.q && seg.from.r === hex.r) {
                    return river;
                }
            }
        }
    }

    return null;
}

export function addRiverWaypointLegacy(view: any, hex: { q: number; r: number }) {
    if(!view.data.rivers) {
        view.data.rivers = [];
    }

    let river = view.data.rivers.find((r: any) => r.id === view.riverSettings.activeRiverId);
    if(river) {
        river.dashes = view.pathDashes || DEFAULT_PATH_DASHES;
    }

    if(!river) {
        const maxId = view.data.rivers.reduce((max: number, r: any) => Math.max(max, r.id || 0), 0);
        river = {
            id: maxId + 1,
            color: view.masterColor,
            width: view.riverSettings.width,
            dashes: view.pathDashes || DEFAULT_PATH_DASHES,
            waypoints: [],
        };

        view.data.rivers.push(river);
        view.riverSettings.activeRiverId = river.id;
        view.riverSettings.editMode = true;
        view.riverSettings.insertAfter = null;

        if(view.pathPickerBtn) {
            setIcon(view.pathPickerBtn, 'check');
            view.pathPickerBtn.style.background = PICKER_ACTIVE_BG;
            view.pathPickerBtn.style.color = 'var(--text-on-accent)';
            view.pathPickerBtn.setAttribute('title', localizeString('tooltip.riverFinish'));
        }
    }

    if(view.riverSettings.editMode) {
        const existingIdx = river.waypoints.findIndex((w: any) => w.q === hex.q && w.r === hex.r);
        if(existingIdx !== -1) {
            const dragGroup: number[] = [];
            river.waypoints.forEach((wp: any, i: number) => {
                if(wp.q === hex.q && wp.r === hex.r) {
                    dragGroup.push(i);
                }
            });
            view.riverDragIndex = { idx: existingIdx, origQ: hex.q, origR: hex.r, group: dragGroup };
            return;
        }

        for(let i = 0; i < river.waypoints.length - 1; i++) {
            const to = river.waypoints[i + 1]!;
            if(to.break) {
                continue;
            }

            const from = river.waypoints[i]!;
            const segs = calculateHexPath(from, to, river.width);
            const onSegment = segs.some((s: any) =>
                (s.from.q === hex.q && s.from.r === hex.r)
                || (s.to.q === hex.q && s.to.r === hex.r)
            );

            if(onSegment) {
                river.waypoints.splice(i + 1, 0, { q: hex.q, r: hex.r });
                view.riverSettings.insertAfter = i + 1;
                return;
            }
        }
    }

    const insertIdx = view.riverSettings.insertAfter;
    if(insertIdx !== null && insertIdx < river.waypoints.length - 1) {
        const bp = river.waypoints[insertIdx]!;
        river.waypoints.push({ q: bp.q, r: bp.r, break: true });
        river.waypoints.push({ q: hex.q, r: hex.r });
        view.riverSettings.insertAfter = river.waypoints.length - 1;
    }
    else {
        river.waypoints.push({ q: hex.q, r: hex.r });
        view.riverSettings.insertAfter = river.waypoints.length - 1;
    }
}
