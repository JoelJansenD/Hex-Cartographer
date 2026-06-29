import { Notice } from "obsidian";
import { LEFT_MOUSE_BUTTON } from "../../../constants/Events";
import { getHexagonCoordinatesAtMousePosition } from "../../../functions/canvas";
import { localizeString } from "../../../functions/i18n";
import { Border } from "../../../types/border";
import HexCartographerViewState from "../../hex-cartographer-view-state";
import { EventHandlerMap, Listener, ListenerContext } from "./listeners";

export default class BorderSelectListener implements Listener {
    public events: EventHandlerMap = {
        mousedown: this.onMouseDown.bind(this),
    };

    private _context: ListenerContext;

    constructor(context: ListenerContext) {
        this._context = context;
    }

    private onMouseDown(e: MouseEvent) {
        if(!this.canHandle(e)) return;

        const state = this._context.getState();
        this.selectBorder(e, state);

        // Selection updates are UI state only and should not pollute undo history.
        this._context.setState(state, false);
    }

    private selectBorder(e: MouseEvent, state: HexCartographerViewState) {
        const hex = getHexagonCoordinatesAtMousePosition(e, this._context.getCanvas(), state);

        let foundRegion: Border | null = null;
        for(const region of state.data.borders) {
            if(region.hexes.some(b => b.q === hex.q && b.r === hex.r)) {
                foundRegion = region;
                break;
            }
        }

        if(!foundRegion) {
            new Notice(localizeString("notice.noBorderAtPosition"));
            return;
        }

        state.selectedRegion = {
            border: foundRegion,
            hexagon: hex,
        };
        state.selectedToolGroup = 'border';
        state.selectedPaintMode = 'brush';

        new Notice(localizeString("notice.borderSelected", { id: foundRegion.id }));
    }

    private canHandle(e: MouseEvent): boolean {
        const state = this._context.getState();
        return e.button === LEFT_MOUSE_BUTTON
            && !e.ctrlKey
            && !e.metaKey
            && state.editMode
            && state.selectedToolGroup === "select-border";
    }
}