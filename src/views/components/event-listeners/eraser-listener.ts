import { LEFT_MOUSE_BUTTON } from "../../../constants/Events";
import { getHexagonCoordinatesAtMousePosition } from "../../../functions/canvas";
import { getHexagonAtCoordinates } from "../../../functions/hex-math";
import HexCartographerViewState from "../../hex-cartographer-view-state";
import { EventHandlerMap, Listener, ListenerContext } from "./listeners";

export default class EraserListener implements Listener {
    events: EventHandlerMap = {
        mousedown: this.onMouseDown.bind(this),
        mousemove: this.onMouseMove.bind(this),
        mouseup: this.onMouseUp.bind(this),
    };
    private _context: ListenerContext;

    constructor(context: ListenerContext) {
        this._context = context;
    }

    private onMouseDown(e: MouseEvent) {
        if(!this.canHandle(e)) return;
        const state = this._context.getState();

        this.erase(e, state);
        state.heldButton = e.button;
        this._context.setState(state, true);
    }

    private onMouseMove(e: MouseEvent) {
        const state = this._context.getState();
        if(!this.canHandle(e) || state.heldButton !== LEFT_MOUSE_BUTTON) return;

        this.erase(e, state);
        this._context.setState(state, false);
    }

    private onMouseUp(e: MouseEvent) {
        const state = this._context.getState();
        if(!this.canHandle(e) || state.heldButton !== LEFT_MOUSE_BUTTON) return;

        state.heldButton = null;
        this._context.setState(state, false);
    }

    private erase(e: MouseEvent, state: HexCartographerViewState) {
        const hex = getHexagonCoordinatesAtMousePosition(e, this._context.getCanvas(), state);
        const data = state.data;
        const hexData = getHexagonAtCoordinates(data.hexes, hex);
        if(!hexData) return;

        const key = `${hexData.q}_${hexData.r}`;
        if(state.selectedSymbol !== 'hexagon') {
            if(hexData.color) {
                hexData.symbol = undefined;
                hexData.symbolColor = undefined;
            }
            else {
                delete state.data.hexes[key];
            }
        }
        else {
            if(hexData.symbol) {
                hexData.color = undefined;
            }
            else {
                delete state.data.hexes[key];
            }
        }
    }

    private canHandle(e: MouseEvent) {
        const state = this._context.getState();
        return e.button === LEFT_MOUSE_BUTTON
            && state.selectedPaintMode === 'eraser'
            && !state.selectedToolGroup;
    }
}
    