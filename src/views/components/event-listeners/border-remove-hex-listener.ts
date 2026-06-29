import { RIGHT_MOUSE_BUTTON } from "../../../constants/Events";
import { getHexagonCoordinatesAtMousePosition } from "../../../functions/canvas";
import { Border } from "../../../types/border";
import { HexCoordinates } from "../../../types/hexagon";
import HexCartographerViewState from "../../hex-cartographer-view-state";
import { EventHandlerMap, Listener, ListenerContext } from "./listeners";

export default class BorderRemoveHexListener implements Listener {
    public events: EventHandlerMap = {
        mousedown: this.onMouseDown.bind(this),
        mousemove: this.onMouseMove.bind(this),
        mouseup: this.onMouseUp.bind(this),
    };

    private _context: ListenerContext;
    private _isHoldingMouseDown: boolean = false;

    constructor(context: ListenerContext) {
        this._context = context;
    }

    private onMouseDown(e: MouseEvent) {
        if(!this.canHandle(e)) {
            return;
        }
        
        const state = this._context.getState();
        const hex = getHexagonCoordinatesAtMousePosition(e, this._context.getCanvas(), state);
        this.removeHex(hex, state);

        this._isHoldingMouseDown = true;
        this._context.setState(state, true);
    }

    private onMouseMove(e: MouseEvent) {
        if(!this.canHandle(e) || !this._isHoldingMouseDown) {
            return;
        }

        const state = this._context.getState();
        const hex = getHexagonCoordinatesAtMousePosition(e, this._context.getCanvas(), state);
        this.removeHex(hex, state);
        
        this._context.setState(state, false);
    }

    private onMouseUp(e: MouseEvent) {
        if(!this.canHandle(e)) {
            return;
        }

        const state = this._context.getState();
        this._isHoldingMouseDown = false;
        this._context.setState(state, false);
    }

    private removeHex(hex: HexCoordinates, state: HexCartographerViewState) {
        const hexIndex = state.selectedRegion!.border.hexes.findIndex(h => h.q === hex.q && h.r === hex.r);
        if(hexIndex === -1) {
            return;
        }
        
        state.selectedRegion!.border.hexes.splice(hexIndex, 1);
        this.updateBorder(state.selectedRegion!.border, state);
    }

    private updateBorder(border: Border, state: HexCartographerViewState) {
        const existingBorderIndex = state.data.borders.findIndex(b => b.id === border.id);
        if(existingBorderIndex !== -1) {
            state.data.borders[existingBorderIndex] = border;
        }
    }

    private canHandle(e: MouseEvent): boolean {
        const state = this._context.getState();
        return (e.buttons & RIGHT_MOUSE_BUTTON) === RIGHT_MOUSE_BUTTON
            && (!e.ctrlKey || !e.metaKey)
            && state.editMode
            && state.selectedRegion !== null
            && state.selectedToolGroup === "border";
    }
}