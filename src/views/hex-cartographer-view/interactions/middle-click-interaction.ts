// src/views/hex-cartographer-view/interactions/right-click-interaction.ts
export interface MiddleClickInteractionState {
    isPanning: boolean;
}

export interface MiddleClickInteractionContext {
    state: MiddleClickInteractionState;
}

export function createMiddleClickInteraction(ctx: MiddleClickInteractionContext) {
    return {
        start(e: MouseEvent) {
            ctx.state.isPanning = true;
        },
    };
}