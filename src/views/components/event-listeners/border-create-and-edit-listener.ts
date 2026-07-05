import { LEFT_MOUSE_BUTTON } from "../../../constants/Events";
import { getHexagonCoordinatesAtMousePosition } from "../../../functions/canvas";
import { Border } from "../../../types/border";
import { HexCoordinates } from "../../../types/hexagon";
import HexCartographerViewState from "../../hex-cartographer-view-state";
import { EventHandlerMap, Listener, ListenerContext } from "./listeners";

export default class BorderCreateAndEditListener implements Listener {
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
        const hex = getHexagonCoordinatesAtMousePosition(e, this._context.getCanvasRect(), state);

        if(!state.selectedRegion) {
            state.selectedRegion = this.createBorder(hex, state);
        }

        if(this.addHexToBorder(state.selectedRegion.border, hex, state)) {
            this.removeHexFromOtherBorders(state.selectedRegion.border, hex, state);
            this.upsertBorder(state.selectedRegion.border, state);
            this._context.setState(state, true);
        }

        this._isHoldingMouseDown = true;
    }

    private onMouseMove(e: MouseEvent) {
        if(!this.canHandle(e) || !this._isHoldingMouseDown) {
            return;
        }

        const state = this._context.getState();
        if(!state.selectedRegion) {
            throw new Error("No selected region found while creating/editing border.");
        }

        const hex = getHexagonCoordinatesAtMousePosition(e, this._context.getCanvasRect(), state);
        if(state.selectedRegion.border.hexes.some(h => h.q === hex.q && h.r === hex.r)) {
            return;
        }

        if(this.addHexToBorder(state.selectedRegion.border, hex, state)) {
            this.upsertBorder(state.selectedRegion.border, state);
            this.removeHexFromOtherBorders(state.selectedRegion.border, hex, state);
            this._context.setState(state, false);
        }
    }

    private onMouseUp(e: MouseEvent) {
        if(!this.canHandle(e)) {
            return;
        }

        const state = this._context.getState();
        this._isHoldingMouseDown = false;
        this._context.setState(state, false);
    }

    private addHexToBorder(border: Border, hex: HexCoordinates, state: HexCartographerViewState) {
        if(border.hexes.some(h => h.q === hex.q && h.r === hex.r)) {
            return false;
        }

        state.selectedRegion!.border.hexes.push(hex);
        return true;
    }

    private createBorder(hex: HexCoordinates, state: HexCartographerViewState) : { border: Border; hexagon: HexCoordinates } {
        const highestId = state.data.borders.reduce((maxId, border) => Math.max(maxId, border.id), 0);
        const newId = highestId + 1;

        return {
            border: {
                id: newId, 
                color: state.selectedColor,
                hexes: [],
                dashes: 0,
                
            },
            hexagon: hex,
        };
    }

    private removeHexFromOtherBorders(border: Border, hex: HexCoordinates, state: HexCartographerViewState) {
        for(const otherBorder of state.data.borders) {
            if(otherBorder.id === border.id) {
                continue;
            }

            const hexIndex = otherBorder.hexes.findIndex(h => h.q === hex.q && h.r === hex.r);
            if(hexIndex !== -1) {
                otherBorder.hexes.splice(hexIndex, 1);
            }
        }
    }

    private upsertBorder(border: Border, state: HexCartographerViewState) {
        const existingIndex = state.data.borders.findIndex(b => b.id === border.id);
        if(existingIndex === -1) {
            state.data.borders.push(border);
        }
        else {
            state.data.borders[existingIndex] = border;
        }
    }

    private canHandle(e: MouseEvent): boolean {
        const state = this._context.getState();
        return e.button === LEFT_MOUSE_BUTTON
            && (!e.ctrlKey || !e.metaKey)
            && state.editMode
            && state.selectedToolGroup === "border";
    }
}