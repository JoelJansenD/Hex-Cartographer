import HexCartographerViewState from "../../hex-cartographer-view-state";

/**
 * @deprecated This type is deprecated and will be removed in a future version. Use `MouseButtonInteraction` instead.
 */
type MouseButtonInteractionDep = {
    down: (e: MouseEvent) => void;
}
export type { MouseButtonInteractionDep };

type MouseButtonInteraction = {
    down: (e: MouseEvent, state: HexCartographerViewState) => void;
}
export type { MouseButtonInteraction };