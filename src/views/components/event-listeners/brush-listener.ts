import { getHexagonCoordinatesAtMousePosition, getWorldCoordinates } from "../../../functions/canvas";
import { getHexagonAtCoordinates } from "../../../functions/hex-math";
import HexCartographerViewState from "../../hex-cartographer-view-state";
import { EventHandlerMap, Listener, ListenerContext } from "./listeners";

const LEFT_MOUSE_BUTTON = 0;

export default class BrushListener implements Listener {
    public events: EventHandlerMap = {
        mousedown: this.onMouseDown.bind(this),
        mousemove: this.onMouseMove.bind(this),
        mouseup: this.onMouseUp.bind(this),
    };
    private _context: ListenerContext;

    constructor(context: ListenerContext) {
        this._context = context;
    }

    onMouseDown(e: MouseEvent) {
        if(!this.canTrigger(e)) return;
        const state = this._context.getState();
        this.paint(e, state);
        state.heldButton = LEFT_MOUSE_BUTTON;
        this._context.setState(state, false); // We push to history in the mouseup event to support dragging
    }

    onMouseMove(e: MouseEvent) {
        const state = this._context.getState();
        if(!this.canTrigger(e) || state.heldButton === null) return;

        this.paint(e, state);
        this._context.setState(state, false);
    }

    onMouseUp(e: MouseEvent) {
        const state = this._context.getState();
        if(!this.canTrigger(e) || state.heldButton === null) return;
        state.heldButton = null;
        this._context.setState(state, true);
    }

    private paint(e: MouseEvent, state: HexCartographerViewState) {
        const hexCoordinates = getHexagonCoordinatesAtMousePosition(e, this._context.getCanvas(), state);
        const hexData = getHexagonAtCoordinates(state.data.hexes, hexCoordinates)!;
        if(hexData === null){
            const key = `${hexCoordinates.q}_${hexCoordinates.r}`;
            state.data.hexes[key] = {
                q: hexCoordinates.q,
                r: hexCoordinates.r,
                color: state.selectedColor === 'hexagon' ? state.selectedColor : undefined,
                symbol: state.selectedSymbol !== 'hexagon' ? state.selectedSymbol : undefined,
                symbolColor: state.selectedSymbol !== 'hexagon' ? state.selectedColor : undefined
            };
        }
        else {
            if(state.selectedSymbol !== 'hexagon') {
                hexData.symbol = state.selectedSymbol;
                hexData.symbolColor = state.selectedColor;
            }
            else {
                hexData.color = state.selectedColor;
            }
        }
    }

    private canTrigger(e: MouseEvent) {
        const state = this._context.getState();
        return !e.ctrlKey // Control is an override for panning the camera
            && e.button === LEFT_MOUSE_BUTTON
            && state.editMode
            && state.selectedToolGroup === null
            && state.selectedPaintMode === 'brush';
    }

}