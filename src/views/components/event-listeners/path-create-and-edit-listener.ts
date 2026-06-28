import { DEFAULT_PATH_DASHES } from "../../../constants";
import { LEFT_MOUSE_BUTTON } from "../../../constants/Events";
import { getHexagonCoordinatesAtMousePosition } from "../../../functions/canvas";
import { calculateHexPath } from "../../../functions/hexes";
import { HexCoordinates } from "../../../types/hexagon";
import { River, Road } from "../../../types/rivers-and-roads";
import { ToolGroup } from "../../../types/tool-group";
import HexCartographerViewState from "../../hex-cartographer-view-state";
import { EventHandlerMap, Listener, ListenerContext } from "./listeners";

export default class PathCreateAndEditListener implements Listener {
    public events: EventHandlerMap = {
        mousedown: this.onMouseDown.bind(this),
        mousemove: this.onMouseMove.bind(this),
        mouseup: this.onMouseUp.bind(this),
    };

    private _context: ListenerContext;
    private _lastWaypointClick: { pathId: number; idx: number; previousInsertAfter: number | null; } | null = null;
    private _draggingWaypoint: { pathKind: 'road' | 'river'; pathId: number; waypointIndices: number[]; } | null = null;

    constructor(context: ListenerContext) {
        this._context = context;
    }

    private onMouseDown(e: MouseEvent) {
        if(!this.canHandleToolContext()) {
            return;
        }

        if(e.button !== LEFT_MOUSE_BUTTON) {
            return;
        }

        const state = this._context.getState();
        const hexCoordinates = getHexagonCoordinatesAtMousePosition(e, this._context.getCanvas(), state);
        const tool = state.selectedToolGroup;

        if(tool === 'road' || tool === 'river') {
            this.handlePathToolMouseDown(state, tool, hexCoordinates, e.detail);
            return;
        }
        
        this._context.setState(state, false);
    }

    private handlePathToolMouseDown(state: HexCartographerViewState, tool: Extract<ToolGroup, 'road' | 'river'>, hex: HexCoordinates, clickCount: number) {
        const pathKind = this.getPathKind(tool);
        const hitPath = this.findPathAtHexLegacy(state, pathKind, hex);
        const activePathId = this.getActivePathId(state, pathKind);

        if(hitPath && activePathId !== hitPath.id) {
            this.setActivePathId(state, pathKind, hitPath.id);
            this.setSelectedPathState(state, hitPath, hex);
            this._context.setState(state, false);
            return;
        }

        const activePath = this.getActivePath(state, pathKind);
        const clickedIdx = activePath?.waypoints.findIndex(w => w.q === hex.q && w.r === hex.r) ?? -1;

        if(activePath && clickedIdx !== -1) {
            const activeWaypoint = this.handleWaypointClickLegacy(activePath, this.getPathInsertAfterRef(state, pathKind), clickedIdx, clickCount);
            this.setSelectedPathState(state, activePath, activeWaypoint);
            if(clickCount < 2) {
                const source = activePath.waypoints[clickedIdx]!;
                const waypointIndices = activePath.waypoints
                    .map((wp, idx) => ({ wp, idx }))
                    .filter(({ wp }) => wp.q === source.q && wp.r === source.r)
                    .map(({ idx }) => idx);
                this._draggingWaypoint = { pathKind, pathId: activePath.id, waypointIndices };
            } else {
                this._draggingWaypoint = null;
            }
            this._context.setState(state, true);
            return;
        }

        this.addPathWaypointLegacy(state, pathKind, hex);
        const newActivePath = this.getActivePath(state, pathKind);
        if(newActivePath) {
            this.setSelectedPathState(state, newActivePath, hex);
        } else {
            state.selectedPath = null;
            state.selectedRoad = null;
            state.selectedRiver = null;
        }
        this._context.setState(state, true);
    }

    private onMouseMove(e: MouseEvent) {
        if(!this.canHandleToolContext()) {
            return;
        }

        if(!this._draggingWaypoint) {
            return;
        }

        // Left mouse button is no longer down.
        if((e.buttons & 1) !== 1) {
            return;
        }

        const state = this._context.getState();
        const drag = this._draggingWaypoint;
        const path = this.getPaths(state, drag.pathKind).find(p => p.id === drag.pathId);
        if(!path || drag.waypointIndices.length === 0) {
            return;
        }

        const hex = getHexagonCoordinatesAtMousePosition(e, this._context.getCanvas(), state);
        const firstWaypoint = path.waypoints[drag.waypointIndices[0]!];
        if(!firstWaypoint) {
            return;
        }

        if(firstWaypoint.q === hex.q && firstWaypoint.r === hex.r) {
            return;
        }

        drag.waypointIndices.forEach((idx) => {
            const waypoint = path.waypoints[idx];
            if(!waypoint) {
                return;
            }
            waypoint.q = hex.q;
            waypoint.r = hex.r;
        });

        this.setSelectedPathState(state, path, { q: hex.q, r: hex.r });
        this._context.setState(state, false);
    }

    private onMouseUp(e: MouseEvent) {
        if(!this.canHandleToolContext()) {
            return;
        }

        if(e.button !== LEFT_MOUSE_BUTTON) {
            return;
        }

        if(!this._draggingWaypoint) {
            return;
        }

        const state = this._context.getState();
        this._draggingWaypoint = null;
        this._context.setState(state, false);
    }

    private handleWaypointClickLegacy(path: Road | River, settings: { insertAfter: number | null }, clickedIdx: number, clickCount: number): HexCoordinates {
        if(clickCount >= 2) {
            const anchorIdx = this._lastWaypointClick
                && this._lastWaypointClick.pathId === path.id
                && this._lastWaypointClick.idx === clickedIdx
                ? this._lastWaypointClick.previousInsertAfter
                : settings.insertAfter;

            if(anchorIdx !== null && anchorIdx !== undefined && anchorIdx !== clickedIdx) {
                const fromWp = path.waypoints[anchorIdx];
                const toWp = path.waypoints[clickedIdx];
                if(fromWp && toWp && (fromWp.q !== toWp.q || fromWp.r !== toWp.r)) {
                    path.waypoints.push({ q: fromWp.q, r: fromWp.r, break: true });
                    path.waypoints.push({ q: toWp.q, r: toWp.r });
                    settings.insertAfter = path.waypoints.length - 1;
                    this._lastWaypointClick = null;
                    return path.waypoints[settings.insertAfter]!;
                }
            }

            this._lastWaypointClick = null;
            settings.insertAfter = clickedIdx;
            return path.waypoints[clickedIdx]!;
        }

        this._lastWaypointClick = {
            pathId: path.id,
            idx: clickedIdx,
            previousInsertAfter: settings.insertAfter,
        };
        settings.insertAfter = clickedIdx;
        return path.waypoints[clickedIdx]!;
    }

    private getPathKind(tool: Extract<ToolGroup, 'road' | 'river'>): 'road' | 'river' {
        return tool === 'road' ? 'road' : 'river';
    }

    private getPaths(state: HexCartographerViewState, pathKind: 'road' | 'river'): Array<Road | River> {
        return pathKind === 'road' ? state.data.roads : state.data.rivers;
    }

    private getPathSettings(state: HexCartographerViewState, pathKind: 'road' | 'river') {
        return pathKind === 'road' ? state.data.settings.roadSettings : state.data.settings.riverSettings;
    }

    private getActivePathId(state: HexCartographerViewState, pathKind: 'road' | 'river') {
        return pathKind === 'road' ? state.data.settings.roadSettings.activeRoadId : state.data.settings.riverSettings.activeRiverId;
    }

    private setActivePathId(state: HexCartographerViewState, pathKind: 'road' | 'river', id: number) {
        if(pathKind === 'road') {
            state.data.settings.roadSettings.activeRoadId = id;
            return;
        }

        state.data.settings.riverSettings.activeRiverId = id;
    }

    private getActivePath(state: HexCartographerViewState, pathKind: 'road' | 'river'): Road | River | null {
        const activeId = this.getActivePathId(state, pathKind);
        if(activeId === null) {
            return null;
        }

        return this.getPaths(state, pathKind).find(p => p.id === activeId) ?? null;
    }

    private getPathInsertAfterRef(state: HexCartographerViewState, pathKind: 'road' | 'river') {
        return this.getPathSettings(state, pathKind);
    }

    private setSelectedPathState(state: HexCartographerViewState, path: Road | River, activeWaypoint: HexCoordinates) {
        state.selectedPath = { path, activeWaypoint };
        if(path.type === 'road') {
            state.selectedRoad = path;
            state.selectedRiver = null;
            return;
        }

        state.selectedRiver = path;
        state.selectedRoad = null;
    }

    private findPathAtHexLegacy(state: HexCartographerViewState, pathKind: 'road' | 'river', hex: HexCoordinates): Road | River | null {
        const paths = this.getPaths(state, pathKind);
        for(const path of paths) {
            if(!path.waypoints || path.waypoints.length === 0) {
                continue;
            }

            if(path.waypoints.some(w => w.q === hex.q && w.r === hex.r)) {
                return path;
            }

            for(let i = 0; i < path.waypoints.length - 1; i++) {
                const segs = calculateHexPath(path.waypoints[i]!, path.waypoints[i + 1]!, path.width);
                for(const seg of segs) {
                    if(seg.to.q === hex.q && seg.to.r === hex.r) {
                        return path;
                    }

                    if(seg.from.q === hex.q && seg.from.r === hex.r) {
                        return path;
                    }
                }
            }
        }

        return null;
    }

    private addPathWaypointLegacy(state: HexCartographerViewState, pathKind: 'road' | 'river', hex: HexCoordinates) {
        const settings = this.getPathSettings(state, pathKind);
        const paths = this.getPaths(state, pathKind);
        let activePath = this.getActivePath(state, pathKind);

        if(!activePath) {
            const maxId = paths.reduce((max, p) => Math.max(max, p.id || 0), 0);
            const createdPath: Road | River = {
                type: pathKind,
                id: maxId + 1,
                color: state.selectedColor,
                width: settings.width,
                dashes: DEFAULT_PATH_DASHES,
                waypoints: [],
            };

            paths.push(createdPath);
            this.setActivePathId(state, pathKind, createdPath.id);
            settings.editMode = true;
            settings.insertAfter = null;
            activePath = createdPath;
        }

        const path = activePath;

        const existingIdx = path.waypoints.findIndex(w => w.q === hex.q && w.r === hex.r);
        if(existingIdx !== -1) {
            return;
        }

        const insertIdx = settings.insertAfter;
        if(insertIdx !== null && insertIdx < path.waypoints.length - 1) {
            const bp = path.waypoints[insertIdx]!;
            path.waypoints.push({ q: bp.q, r: bp.r, break: true });
            path.waypoints.push({ q: hex.q, r: hex.r });
            settings.insertAfter = path.waypoints.length - 1;
            return;
        }

        path.waypoints.push({ q: hex.q, r: hex.r });
        settings.insertAfter = path.waypoints.length - 1;
    }

    private canHandleToolContext(): boolean {
        const state = this._context.getState();
        return (state.selectedToolGroup === 'river' || state.selectedToolGroup === 'road')
            && state.editMode;
    }
}