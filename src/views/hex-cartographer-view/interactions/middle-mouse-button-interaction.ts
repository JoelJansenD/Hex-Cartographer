import { MouseButtonInteraction } from "./mouse-button-interaction";

// src/views/hex-cartographer-view/interactions/right-click-interaction.ts
export interface MiddleMouseButtonInteractionState {
    isPanning: boolean;
}

export interface MiddleMouseButtonInteractionContext {
    state: MiddleMouseButtonInteractionState;
}

export function createMiddleMouseButtonInteraction(ctx: MiddleMouseButtonInteractionContext) : MouseButtonInteraction {
    return {
        down(_: MouseEvent) {
            ctx.state.isPanning = true;
        },
    };
}