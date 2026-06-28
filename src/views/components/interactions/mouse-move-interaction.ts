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
            else if(state.draggedText) {
                const world = getWorldCoordinates(e, context.getCanvas(), { x: state.data.offX, y: state.data.offY }, state.data.zoom);
                const target = state.data.texts.find(t => t.text === state.draggedText?.text);
                if(!target) throw new Error("Dragged text not found in state");

                target.x = world.x;
                target.y = world.y;
            }

            // Dragging can alway be excluded from history, any permanent changes should be saved on mouse up
            context.setState(state, false);
        },
    };
};