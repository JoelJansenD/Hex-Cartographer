import { LEFT_MOUSE_BUTTON } from "../../../constants/Events";
import HexCartographerViewState from "../../hex-cartographer-view-state";
import { EventHandlerMap, Listener, ListenerContext } from "./listeners";

export default class CreateAndEditBorderListener implements Listener {
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
        if(!this.canHandle(e)) {
            return;
        }

        const state = this._context.getState();
        this.createOrEditBorder(e, state);
        this._context.setState(state, false);
    }

    private onMouseMove(e: MouseEvent) {
        if(!this.canHandle(e)) {
            return;
        }

        const state = this._context.getState();
        this.previewBorderEdit(e, state);
        this._context.setState(state, false);
    }

    private onMouseUp(e: MouseEvent) {
        if(!this.canHandle(e)) {
            return;
        }

        const state = this._context.getState();
        this.finishBorderEdit(e, state);
        this._context.setState(state, false);
    }

    private createOrEditBorder(_e: MouseEvent, _state: HexCartographerViewState) {
        // Boilerplate only: border create/edit behavior will be implemented in a follow-up change.
    }

    private previewBorderEdit(_e: MouseEvent, _state: HexCartographerViewState) {
        // Boilerplate only: border preview behavior will be implemented in a follow-up change.
    }

    private finishBorderEdit(_e: MouseEvent, _state: HexCartographerViewState) {
        // Boilerplate only: border finalize behavior will be implemented in a follow-up change.
    }

    private canHandle(e: MouseEvent): boolean {
        const state = this._context.getState();
        return e.button === LEFT_MOUSE_BUTTON
            && (!e.ctrlKey || !e.metaKey)
            && state.editMode
            && state.selectedToolGroup === "border";
    }
}