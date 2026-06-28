import { App } from "obsidian";
import { MouseButtonInteraction } from "./mouse-button-interaction";
import { TextInputModal, TextInputModalParams } from "../../../modals/text-input-modal";
import HexCartographerViewState from "../../hex-cartographer-view-state";
import { getWorldCoordinates } from "../../../functions/canvas";
import { getTextIndexAtClick } from "../../../functions/labels";

export interface LeftMouseButtonInteractionContext {
    getApp: () => App;
    getCanvas: () => HTMLCanvasElement;
    getState: () => HexCartographerViewState;
    setState: (state: HexCartographerViewState, pushToHistory?: boolean) => void;
}

export function createLeftMouseButtonInteraction(ctx: LeftMouseButtonInteractionContext) : MouseButtonInteraction {

    return {
        down(_: MouseEvent) {
        },
        up(_: MouseEvent) {
        },
        doubleClick(e: MouseEvent) {
            const state = ctx.getState();
            if(state.selectedPaintMode === 'text') {
                doubleClick_SelectText(e, ctx, state);
            }
            ctx.setState(state, false);
        }
    };
}

function doubleClick_SelectText(e: MouseEvent, ctx: LeftMouseButtonInteractionContext, state: HexCartographerViewState) {
    const location = getWorldCoordinates(e, ctx.getCanvas(), { x: state.data.offX, y: state.data.offY}, state.data.zoom);
    const textIdx = getTextIndexAtClick(location, ctx.getCanvas(), state);

    let inputParams: TextInputModalParams = {
        location: location,
        onSubmit: label => {
            if(label === 'delete') {
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

            // The history is already preserved by the main setState call before the modal opens.
            // We don't need to push to history here.
            ctx.setState(state, false);
        }
    }

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

    new TextInputModal(ctx.getApp(), inputParams).open();
}
