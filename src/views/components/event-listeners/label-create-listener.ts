import { App } from "obsidian";
import { LEFT_MOUSE_BUTTON } from "../../../constants/Events";
import { getWorldCoordinates } from "../../../functions/canvas";
import { getTextIndexAtClick } from "../../../functions/labels";
import { TextInputModal, TextInputModalParams } from "../../../modals/text-input-modal";
import { EventHandlerMap, Listener, ListenerContext } from "./listeners";

export interface LabelCreateListenerContext extends ListenerContext {
    getApp: () => App;
}

export default class LabelCreateListener implements Listener {
    public events: EventHandlerMap = {
        mousedown: this.onMouseDown.bind(this),
    };

    private _context: LabelCreateListenerContext;

    constructor(context: LabelCreateListenerContext) {
        this._context = context;
    }

    private onMouseDown(e: MouseEvent) {
        if(!this.canHandle(e)) return;

        const state = this._context.getState();
        const location = getWorldCoordinates(e, this._context.getCanvas(), { x: state.data.offX, y: state.data.offY }, state.data.zoom);
        const textIdx = getTextIndexAtClick(location, this._context.getCanvas(), state);

        // This listener only creates labels on empty space.
        if(textIdx !== -1) return;

        const inputParams: TextInputModalParams = {
            location,
            onSubmit: result => {
                if(result && result !== "delete") {
                    state.data.texts.push(result);
                    this._context.setState(state, true);
                }
            }
        };

        new TextInputModal(this._context.getApp(), inputParams).open();
    }

    private canHandle(e: MouseEvent): boolean {
        const state = this._context.getState();
        return e.button === LEFT_MOUSE_BUTTON
            && e.detail === 1
            && state.editMode
            && state.selectedPaintMode === "text";
    }
}