import { LEFT_MOUSE_BUTTON } from "../../../constants/Events";
import { getHexagonCoordinatesAtMousePosition } from "../../../functions/canvas";
import { getHexagonAtCoordinates, getHexNeighbors } from "../../../functions/hex-math";
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

        const target = {...hexData};
        const targetHexes: HexCoordinates[] = [ hexData ];
        const visited: string[] = [];

        while(targetHexes.length > 0) {
            const hex = targetHexes.pop()!;
            const currentKey = `${hex.q}_${hex.r}`;

            if(visited.includes(currentKey)) continue;
            
            const hexData = getHexagonAtCoordinates(state.data.hexes, hex);
            if(!hexData) continue;

            if(state.selectedSymbol !== 'hexagon') {
                if(hexData.symbol !== target.symbol || hexData.symbolColor !== target.symbolColor) {
                    continue;
                }

                hexData.symbol = state.selectedSymbol;
                hexData.symbolColor = state.selectedColor;
            }
            else {
                if(hexData.color !== target.color) {
                    continue;
                }

                hexData.color = state.selectedColor;
            }

            targetHexes.push(...getHexNeighbors(hex));
            visited.push(currentKey);
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