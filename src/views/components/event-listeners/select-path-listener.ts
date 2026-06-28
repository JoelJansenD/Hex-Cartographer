import { App } from "obsidian";
import { LEFT_MOUSE_BUTTON } from "../../../constants/Events";
import { getHexagonCoordinatesAtMousePosition } from "../../../functions/canvas";
import { calculateHexPath } from "../../../functions/hex-math";
import PathPickerModal from "../../../modals/path-picker-modal";
import { HexCoordinates } from "../../../types/hexagon";
import { LinearFeature, River, Road } from "../../../types/rivers-and-roads";
import HexCartographerViewState from "../../hex-cartographer-view-state";
import { EventHandlerMap, Listener, ListenerContext } from "./listeners";

export interface SelectPathListenerContext extends ListenerContext {
    getApp: () => App;
}

export default class SelectPathListener implements Listener {
    public events: EventHandlerMap = {
        mousedown: this.onMouseDown.bind(this),
    };

    private _context: SelectPathListenerContext;

    constructor(context: SelectPathListenerContext) {
        this._context = context;
    }

    private onMouseDown(e: MouseEvent) {
        if(!this.canHandle(e)) return;

        const state = this._context.getState();
        this.selectPath(e, state);

        // Selection updates are UI state only and should not pollute undo history.
        this._context.setState(state, false);
    }

    private selectPath(e: MouseEvent, state: HexCartographerViewState) {
        const hex = getHexagonCoordinatesAtMousePosition(e, this._context.getCanvas(), state);
        const foundRiver = this.findLinearFeatureAtHex(state.data.rivers, hex) as River | null;
        const foundRoad = this.findLinearFeatureAtHex(state.data.roads, hex) as Road | null;

        if(foundRiver && foundRoad) {
            const modal = new PathPickerModal(this._context.getApp(), foundRiver, foundRoad, (river, road) => {
                const newState: HexCartographerViewState = {
                    ...state,
                    selectedRiver: river,
                    selectedRoad: road,
                    selectedToolGroup: river !== null ? "river" : "road",
                };

                // Because this is a callback from a modal, we need to set the state here instead of relying on the outer function to do it.
                this._context.setState(newState, false);
            });
            modal.open();
            return;
        }

        if(foundRiver) {
            state.selectedRiver = foundRiver;
            state.selectedRoad = null;
            state.selectedToolGroup = "river";
        }

        if(foundRoad) {
            state.selectedRoad = foundRoad;
            state.selectedRiver = null;
            state.selectedToolGroup = "road";
        }
    }

    private findLinearFeatureAtHex(features: LinearFeature[], hex: HexCoordinates) {
        for(const feature of features) {
            if(!feature.waypoints || feature.waypoints.length === 0) continue;
            if(feature.waypoints.some(w => w.q === hex.q && w.r === hex.r)) return feature;

            for(let i = 0; i < feature.waypoints.length - 1; i++) {
                const waypoint1 = feature.waypoints[i]!;
                const waypoint2 = feature.waypoints[i + 1]!;

                const segs = calculateHexPath(waypoint1, waypoint2, feature.width);
                for(const seg of segs) {
                    if(seg.to.q === hex.q && seg.to.r === hex.r) return feature;
                    if(seg.from.q === hex.q && seg.from.r === hex.r) return feature;
                }
            }
        }

        return null;
    }

    private canHandle(e: MouseEvent): boolean {
        const state = this._context.getState();
        return e.button === LEFT_MOUSE_BUTTON
            && !e.ctrlKey
            && !e.metaKey
            && state.editMode
            && state.selectedToolGroup === "select-path";
    }
}