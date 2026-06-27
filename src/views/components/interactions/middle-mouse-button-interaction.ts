import HexCartographerViewState from "../../hex-cartographer-view-state";
import { MouseButtonInteraction } from "./mouse-button-interaction";

export function createMiddleMouseButtonInteraction() : MouseButtonInteraction {
    return {
        down(_: MouseEvent, state: HexCartographerViewState) {
            state.isPanning = true;
        },
        up(_: MouseEvent, state: HexCartographerViewState) {
            state.isPanning = false;
        },
    };
}