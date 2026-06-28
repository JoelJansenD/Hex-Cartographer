import { getWorldCoordinates } from "../../../functions/canvas";
import HexCartographerViewState from "../../hex-cartographer-view-state";

export interface MouseMoveInteractionContext {
    getCanvas: () => HTMLCanvasElement;
    getState: () => HexCartographerViewState;
    setState: (state: HexCartographerViewState, pushToHistory?: boolean) => void;
}

export function createMouseMoveInteraction(context: MouseMoveInteractionContext) {
    return {
        move(e: MouseEvent) {
            const state = context.getState();
            if (state.isPanning) {
                state.data.offX += e.movementX;
                state.data.offY += e.movementY;
            }

            // Dragging can alway be excluded from history, any permanent changes should be saved on mouse up
            context.setState(state, false);
        },
    };
};