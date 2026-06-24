import { MouseButtonInteraction } from "./mouse-button-interaction";

export interface LeftMouseButtonInteractionState {
    isPanning: boolean;
}

export interface LeftMouseButtonInteractionContext {
    state: LeftMouseButtonInteractionState;
}

export function createLeftMouseButtonInteraction(ctx: LeftMouseButtonInteractionContext) : MouseButtonInteraction {
    return {
        down(e: MouseEvent) {
            if(e.ctrlKey) {
                ctx.state.isPanning = true;
            }
        },
    };
}