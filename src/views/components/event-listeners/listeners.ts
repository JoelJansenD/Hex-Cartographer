import HexCartographerViewState from "../../hex-cartographer-view-state";

export interface Listener {
    events: EventHandlerMap;
}

export type EventHandlerMap = {
    [K in keyof HTMLElementEventMap]?: (this: HTMLCanvasElement, ev: HTMLElementEventMap[K]) => any;
};

export interface ListenerContext {
    getCanvas: () => HTMLCanvasElement;
    getState: () => HexCartographerViewState;
    setState: (newState: HexCartographerViewState, pushToHistory: boolean) => void;
}