import HexCartographerViewState from "../../hex-cartographer-view-state";
import { MouseButtonInteraction } from "./mouse-button-interaction";

export interface MiddleMouseButtonInteractionContext {
}

export function createMiddleMouseButtonInteraction(ctx: MiddleMouseButtonInteractionContext) : MouseButtonInteraction {
    return {
        down(_: MouseEvent, state: HexCartographerViewState) {
            state.isPanning = !state.isPanning;
            console.log(`Middle mouse button down: Panning ${state.isPanning ? 'enabled' : 'disabled'}`);
        },
    };
}