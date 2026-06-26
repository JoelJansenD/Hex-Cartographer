import HexCartographerViewState from "../../hex-cartographer-view-state";

type MouseButtonInteraction = {
    down: (e: MouseEvent, state: HexCartographerViewState) => void;
}
export type { MouseButtonInteraction };