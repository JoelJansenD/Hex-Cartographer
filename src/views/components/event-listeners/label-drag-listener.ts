import { getWorldCoordinates } from "../../../functions/canvas";
import { getTextIndexAtClick } from "../../../functions/labels";
import HexCartographerViewState from "../../hex-cartographer-view-state";
import { Listener } from "./listeners";

interface LabelDragListenerContext {
    getCanvas: () => HTMLCanvasElement;
    getState: () => HexCartographerViewState;
    setState: (newState: HexCartographerViewState, pushToHistory: boolean) => void;
}

export default class LabelDragListener implements Listener {
    
    private _context: LabelDragListenerContext;
    
    constructor(context: LabelDragListenerContext) {
        this._context = context;
    }
    
    public events = {
        mousedown: this.mouseDown.bind(this),
        mouseup: this.mouseUp.bind(this),
        mousemove: this.mouseMove.bind(this),
    };

    mouseDown(e: MouseEvent): void {
        const state = this._context.getState();
        const location = getWorldCoordinates(e, this._context.getCanvas(), { x: state.data.offX, y: state.data.offY}, state.data.zoom);
        const textIdx = getTextIndexAtClick(location, this._context.getCanvas(), state);

        if(textIdx !== -1) {
            state.draggedText = state.data.texts[textIdx]!;
            this._context.setState(state, true);
        }
    }
    
    mouseUp(e: MouseEvent): void {
        const state = this._context.getState();
        if(!state.draggedText) {
            return;
        }
        
        state.draggedText = null;
        this._context.setState(state, false);
    }
    
    mouseMove(e: MouseEvent): void {
        const state = this._context.getState();
        if(!state.draggedText) {
            return;
        }

        const world = getWorldCoordinates(e, this._context.getCanvas(), { x: state.data.offX, y: state.data.offY }, state.data.zoom);
        const target = state.data.texts.find(t => t.text === state.draggedText?.text);
        if(!target) throw new Error("Dragged text not found in state");

        target.x = world.x;
        target.y = world.y;
        
        // Dragging can alway be excluded from history, any permanent changes should be saved on mouse up
        this._context.setState(state, false);
    }
}