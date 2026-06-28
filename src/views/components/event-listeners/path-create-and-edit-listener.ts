import { LEFT_MOUSE_BUTTON } from "../../../constants/Events";
import { getHexagonCoordinatesAtMousePosition } from "../../../functions/canvas";
import { River, Road } from "../../../types/rivers-and-roads";
import { EventHandlerMap, Listener, ListenerContext } from "./listeners";

export default class PathCreateAndEditListener implements Listener {
    public events: EventHandlerMap = {
        mousedown: this.onMouseDown.bind(this),
    };

    private _context: ListenerContext;

    constructor(context: ListenerContext) {
        this._context = context;
    }

    private onMouseDown(e: MouseEvent) {
        if(!this.canHandle(e)) {
            return;
        }

        const state = this._context.getState();
        const hexCoordinates = getHexagonCoordinatesAtMousePosition(e, this._context.getCanvas(), state);
        
        const existingPaths = [...state.data.rivers, ...state.data.roads];
        const maxId = existingPaths.reduce((max, path) => Math.max(max, path.id), 0);
        const newId = maxId + 1;

        const newPath: River | Road = {
            id: newId,
            color: state.selectedColor,
            width: 1,
            dashes: 0,
            waypoints: [hexCoordinates],
            type: state.selectedToolGroup === 'river' ? 'river' : 'road',
        };

        state.selectedPath = {
            activeWaypoint: hexCoordinates,
            path: newPath
        };
        
        this._context.setState(state, true);
    }

    private canHandle(e: MouseEvent): boolean {
        const state = this._context.getState();
        return (state.selectedToolGroup === 'river' || state.selectedToolGroup === 'road')
            && state.editMode
            && !state.selectedPath // This listener should only create a new path, once created, editing should be handled by the PathEditListener
            && e.button === LEFT_MOUSE_BUTTON;
    }
}