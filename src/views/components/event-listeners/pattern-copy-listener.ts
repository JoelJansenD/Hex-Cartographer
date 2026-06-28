import { LEFT_MOUSE_BUTTON } from "../../../constants/Events";
import { getHexagonCoordinatesAtMousePosition } from "../../../functions/canvas";
import { getHexagonAtCoordinates, getHexagonsInFloodRange, getHexNeighbors } from "../../../functions/hexes";
import { HexCoordinates } from "../../../legacy/types-legacy";
import { Hexagon } from "../../../types/hexagon";
import HexCartographerViewState from "../../hex-cartographer-view-state";
import { EventHandlerMap, Listener, ListenerContext } from "./listeners";

export default class PatternCopyListener implements Listener {
    public events: EventHandlerMap = {
        mousedown: this.onMouseDown.bind(this),
        mousemove: this.onMouseMove.bind(this),
        mouseup: this.onMouseUp.bind(this),
    };

    private _context: ListenerContext;

    constructor(context: ListenerContext) {
        this._context = context;
    }

    private onMouseDown(e: MouseEvent) {
        if(!this.canTrigger(e)) return;

        const state = this._context.getState();
        if(state.selectedPaintMode === 'brush') {
            this.paintBrush(e, state);
            state.heldButton = LEFT_MOUSE_BUTTON;
        }
        else if(state.selectedPaintMode === 'bucket') {
            this.paintBucket(e, state);
        }
        this._context.setState(state, true);
    }

    private onMouseMove(e: MouseEvent) {
        const state = this._context.getState();
        if(!this.canTrigger(e) || state.heldButton === null || state.selectedPaintMode === 'bucket') return;

        this.paintBrush(e, state);
        this._context.setState(state, false);
    }

    private onMouseUp(e: MouseEvent) {
        const state = this._context.getState();
        if(!this.canTrigger(e) || state.heldButton === null || state.selectedPaintMode === 'bucket') return;

        state.heldButton = null;
        this._context.setState(state, false);
    }

    private paintBrush(e: MouseEvent, state: HexCartographerViewState) {
        const hexCoordinates = getHexagonCoordinatesAtMousePosition(e, this._context.getCanvas(), state);
        const hexData = getHexagonAtCoordinates(state.data.hexes, hexCoordinates)!;
        this.paint(state, hexCoordinates, hexData);
    }

    private paintBucket(e: MouseEvent, state: HexCartographerViewState) {
        const hex = getHexagonCoordinatesAtMousePosition(e, this._context.getCanvas(), state);
        const data = state.data;
        const hexData = getHexagonAtCoordinates(data.hexes, hex);

        if(!hexData) return;

        const hexesToChange = getHexagonsInFloodRange(data.hexes, hexData);
        for(const hex of hexesToChange) {
            this.paint(state, hex, hex);
        }
    }

    private paint(state: HexCartographerViewState, hexCoordinates: HexCoordinates, hexData: Hexagon) {
        if(hexData === null){
            const key = `${hexCoordinates.q}_${hexCoordinates.r}`;
            state.data.hexes[key] = {
                q: hexCoordinates.q,
                r: hexCoordinates.r,
                color: state.selectedPattern!.color,
                symbol: state.selectedPattern!.symbol,
                symbolColor: state.selectedPattern!.symbolColor,
            };
        }
        else {
            hexData.color = state.selectedPattern!.color;
            hexData.symbol = state.selectedPattern!.symbol;
            hexData.symbolColor = state.selectedPattern!.symbolColor;
        }
    }

    private canTrigger(e: MouseEvent) {
        const state = this._context.getState();
        return !e.ctrlKey // Control is an override for panning the camera
            && e.button === LEFT_MOUSE_BUTTON
            && state.editMode
            && state.selectedPattern
            && (state.selectedPaintMode === 'brush' || state.selectedPaintMode === 'bucket')
            && state.selectedToolGroup === 'pattern';
    }
}
