import { App } from "obsidian";
import { LEFT_MOUSE_BUTTON } from "../../../constants/Events";
import { getHexagonCoordinatesAtMousePosition } from "../../../functions/canvas";
import { calculateHexPath } from "../../../functions/hexes";
import PathPickerModal from "../../../modals/path-picker-modal";
import { HexCoordinates } from "../../../types/hexagon";
import { LinearFeature, River, Road } from "../../../types/rivers-and-roads";
import HexCartographerViewState from "../../hex-cartographer-view-state";
import { EventHandlerMap, Listener, ListenerContext } from "./listeners";
import { findLinearFeatureAtHex } from "../../../functions/paths";

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
        const hex = getHexagonCoordinatesAtMousePosition(e, this._context.getCanvasRect(), state);
        const foundRiver = findLinearFeatureAtHex(state.data.rivers, hex) as River | null;
        const foundRoad = findLinearFeatureAtHex(state.data.roads, hex) as Road | null;

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

    private 

    private canHandle(e: MouseEvent): boolean {
        const state = this._context.getState();
        return e.button === LEFT_MOUSE_BUTTON
            && !e.ctrlKey
            && !e.metaKey
            && state.editMode
            && state.selectedToolGroup === "select-path";
    }
}