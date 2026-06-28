import { LEFT_MOUSE_BUTTON } from "../../../constants/Events";
import { getHexagonCoordinatesAtMousePosition } from "../../../functions/canvas";
import { getHexagonAtCoordinates, getHexagonsInFloodRange, getHexNeighbors } from "../../../functions/hexes";
import { HexCoordinates } from "../../../legacy/types-legacy";
import HexCartographerViewState from "../../hex-cartographer-view-state";
import { EventHandlerMap, Listener, ListenerContext } from "./listeners";

export default class BucketListener implements Listener {
    
    public events: EventHandlerMap = {
        mousedown: this.mouseDown.bind(this),
    };
    private _context: ListenerContext;

    constructor(context: ListenerContext) {
        this._context = context;
    }

    private mouseDown(e: MouseEvent) {
        if(!this.canHandle(e)) return;
        const state = this._context.getState();
        this.paint(e, state);
        this._context.setState(state, true);
    }

    private paint(e: MouseEvent, state: HexCartographerViewState) {
        const hex = getHexagonCoordinatesAtMousePosition(e, this._context.getCanvas(), state);
        const data = state.data;
        const hexData = getHexagonAtCoordinates(data.hexes, hex);

        if(!hexData) return;

        const hexesToChange = state.selectedSymbol
            ? getHexagonsInFloodRange(data.hexes, hexData, (hex, target) => hex.symbol === target.symbol && hex.symbolColor === target.symbolColor)
            : getHexagonsInFloodRange(data.hexes, hexData, (hex, target) => hex.color === target.color);
        for(const hexToChange of hexesToChange) {
            if(state.selectedSymbol !== 'hexagon') {
                hexToChange.symbol = state.selectedSymbol;
                hexToChange.symbolColor = state.selectedColor;
            }
            else {
                hexToChange.color = state.selectedColor;
            }
        }
    }

    private canHandle(e: MouseEvent) {
        const state = this._context.getState();
        return !e.ctrlKey // Control is an override for panning the camera
            && e.button === LEFT_MOUSE_BUTTON
            && state.editMode
            && state.selectedToolGroup === null
            && state.selectedPaintMode === 'bucket';
    }

}