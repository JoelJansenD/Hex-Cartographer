import { Notice } from "obsidian";
import { getHexagonCoordinatesAtMousePosition } from "../../../functions/canvas";
import { getHexagonAtCoordinates } from "../../../functions/hexes";
import { localizeString } from "../../../functions/i18n";
import { EventHandlerMap, Listener, ListenerContext } from "./listeners";
import { LEFT_MOUSE_BUTTON } from "../../../constants/Events";

export default class PatternPickerListener implements Listener {
    events: EventHandlerMap = {
        mousedown: this.onMouseDown.bind(this),
    };
    private _context: ListenerContext;

    constructor(context: ListenerContext) {
        this._context = context;
    }

    private onMouseDown(e: MouseEvent) {
        if(!this.canHandle(e)) return;

        const state = this._context.getState();
        const hex = getHexagonCoordinatesAtMousePosition(e, this._context.getCanvas(), state);
        const data = state.data;
        const hexData = getHexagonAtCoordinates(data.hexes, hex);
    
        if (hexData) {
            state.selectedPattern = {...hexData};
            state.selectedToolGroup = 'pattern';
            state.selectedPaintMode = 'brush';
            new Notice(localizeString('notice.patternPicked'));
        }
        else {
            state.selectedPattern = null;
            new Notice(localizeString('notice.noHexAtPosition'));
        }

        this._context.setState(state, true);
    }

    private canHandle(e: MouseEvent) {
        const state = this._context.getState();
        return e.button === LEFT_MOUSE_BUTTON
            && state.editMode
            && state.selectedToolGroup === 'pattern-picker';
    }

}