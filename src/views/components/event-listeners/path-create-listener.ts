import { getHexagonCoordinatesAtMousePosition } from "../../../functions/canvas";
import { EventHandlerMap, Listener, ListenerContext } from "./listeners";

export default class PathCreateListener implements Listener {
    public events: EventHandlerMap = {
        mousedown: this.onMouseDown.bind(this),
    };

    private _context: ListenerContext;

    constructor(context: ListenerContext) {
        this._context = context;
    }

    private onMouseDown(e: MouseEvent) {
        const state = this._context.getState();
        const hexCoordinates = getHexagonCoordinatesAtMousePosition(e, this._context.getCanvas(), state);
        
    }
}