import HexCartographerViewState from "../../hex-cartographer-view-state";
import { MouseButtonInteraction } from "./mouse-button-interaction";

export interface MiddleMouseButtonInteractionContext {
    getState: () => HexCartographerViewState;
    setState: (newState: HexCartographerViewState, pushToHistory?: boolean) => void;
}

export function createMiddleMouseButtonInteraction(ctx: MiddleMouseButtonInteractionContext) : MouseButtonInteraction {
    return {
        down(_: MouseEvent) {
            const state = ctx.getState();
            state.isPanning = true;
            ctx.setState(state, false);
        },
        up(_: MouseEvent) {
            const state = ctx.getState();
            state.isPanning = false;
            ctx.setState(state, false);
        },
        doubleClick(_: MouseEvent) {
        }
    };
}