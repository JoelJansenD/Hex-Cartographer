export interface Listener {
    events: EventHandlerMap;
}

export type EventHandlerMap = {
    [K in keyof HTMLElementEventMap]?: (this: HTMLCanvasElement, ev: HTMLElementEventMap[K]) => any;
};