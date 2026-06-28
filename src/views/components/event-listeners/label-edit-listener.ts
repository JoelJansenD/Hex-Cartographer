import { App } from "obsidian";
import { LEFT_MOUSE_BUTTON } from "../../../constants/Events";
import { getWorldCoordinates } from "../../../functions/canvas";
import { getTextIndexAtClick } from "../../../functions/labels";
import { TextInputModal, TextInputModalParams } from "../../../modals/text-input-modal";
import HexCartographerViewState from "../../hex-cartographer-view-state";
import { EventHandlerMap, Listener, ListenerContext } from "./listeners";

export interface LabelEditListenerContext extends ListenerContext {
    getApp: () => App;
}

export default class LabelEditListener implements Listener {
    public events: EventHandlerMap = {
        dblclick: this.onDoubleClick.bind(this),
    };

    private _context: LabelEditListenerContext;

    constructor(context: LabelEditListenerContext) {
        this._context = context;
    }

    private onDoubleClick(e: MouseEvent) {
        if(!this.canHandle(e)) return;

        const state = this._context.getState();
        this.openLabelEditor(e, state);

        // The state is stored in the onSubmit callback of the modal, so we don't need to push to history here.
        this._context.setState(state, false);
    }

    private openLabelEditor(e: MouseEvent, state: HexCartographerViewState) {
        const location = getWorldCoordinates(e, this._context.getCanvas(), { x: state.data.offX, y: state.data.offY }, state.data.zoom);
        const textIdx = getTextIndexAtClick(location, this._context.getCanvas(), state);

        let inputParams: TextInputModalParams = {
            location,
            onSubmit: label => {
                if(label === "delete") {
                    if(textIdx !== -1) {
                        state.data.texts.splice(textIdx, 1);
                    }
                }
                else if(label) {
                    if(textIdx !== -1) {
                        state.data.texts[textIdx] = label;
                    }
                    else {
                        state.data.texts.push(label);
                    }
                }

                this._context.setState(state, true);
            }
        };

        const foundText = textIdx !== -1 ? state.data.texts[textIdx] : null;
        if(foundText) {
            inputParams = {
                ...inputParams,
                value: foundText.text,
                size: foundText.size,
                link: foundText.link,
                bold: foundText.bold,
                color: foundText.color,
                outline: foundText.outline,
                shadow: foundText.shadow,
                shadowDistance: foundText.shadowDistance,
                shadowOpacity: foundText.shadowOpatown,
                colorPalette: state.data.settings.colorPalette,
                colorPalette2: state.data.settings.colorPalette2
            };
        }

        new TextInputModal(this._context.getApp(), inputParams).open();
    }

    private canHandle(e: MouseEvent): boolean {
        const state = this._context.getState();
        return e.button === LEFT_MOUSE_BUTTON
            && state.editMode
            && state.selectedPaintMode === "text";
    }
}