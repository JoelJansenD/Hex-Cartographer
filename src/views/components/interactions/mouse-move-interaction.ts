import HexCartographerViewState from "../../hex-cartographer-view-state";

export interface MouseMoveInteractionContext {
    getState: () => HexCartographerViewState;
    setState: (state: HexCartographerViewState) => void;
}

export function createMouseMoveInteraction(context: MouseMoveInteractionContext) {
    return {
        move(e: MouseEvent) {
            const state = context.getState();
            if (state.isPanning) {
                state.data.offX += e.movementX;
                state.data.offY += e.movementY;
            }

            context.setState(state);

        },
    };
};