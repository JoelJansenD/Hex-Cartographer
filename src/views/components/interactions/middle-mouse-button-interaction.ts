import { EditorInteractionState } from "./editor-interaction-state";
import { MouseButtonInteraction, MouseButtonInteractionDep } from "./mouse-button-interaction";

export interface MiddleMouseButtonInteractionContext {
    getState: () => EditorInteractionState;
    setState: (newState: EditorInteractionState) => void;
}

export function createMiddleMouseButtonInteraction(ctx: MiddleMouseButtonInteractionContext) : MouseButtonInteractionDep {
    return {
        down(_: MouseEvent) {
            const state = ctx.getState();
            state.isPanning = !state.isPanning;
            console.log(`Middle mouse button down: Panning ${state.isPanning ? 'enabled' : 'disabled'}`);
            ctx.setState(state);
        },
    };
}