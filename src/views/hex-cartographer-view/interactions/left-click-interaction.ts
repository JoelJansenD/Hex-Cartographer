// src/views/hex-cartographer-view/interactions/right-click-interaction.ts
export interface LeftClickInteractionState {
    isPanning: boolean;
}

export interface LeftClickInteractionContext {
    state: LeftClickInteractionState;
}

export function createLeftClickInteraction(ctx: LeftClickInteractionContext) {
    return {
        start(e: MouseEvent) {
            if(e.ctrlKey) {
                ctx.state.isPanning = true;
            }
        },
    };
}