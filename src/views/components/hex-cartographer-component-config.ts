import HexCartographerViewState from "../hex-cartographer-view-state";

export default interface HexCartographerComponentConfig {
    getState: () => HexCartographerViewState,
    setState: (newState: HexCartographerViewState, pushToHistory: boolean) => void
}