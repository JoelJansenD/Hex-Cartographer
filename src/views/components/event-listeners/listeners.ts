import HexCartographerViewState from "../../hex-cartographer-view-state";

export interface Listener {
    events: EventHandlerMap;
}

export type EventHandlerMap = {
    [K in keyof HTMLElementEventMap]?: (this: HTMLCanvasElement, ev: HTMLElementEventMap[K]) => any;
};

export interface ListenerContext {
    getCanvasRect: () => DOMRect;
    measureText: (text: string, font: string) => number;
    getState: () => HexCartographerViewState;
    setState: (newState: HexCartographerViewState, pushToHistory: boolean) => void;
}

export function registerListeners(canvas: HTMLCanvasElement, listeners: Listener[]) {
    const removeListenerFunctions: (() => void)[] = [];
    const registerListener = function<K extends keyof HTMLElementEventMap>(canvas: HTMLCanvasElement, listener: Listener, type: K, options?: boolean | AddEventListenerOptions) {
        const handler = listener.events[type];
        if(!handler) {
            return;
        }

        canvas.addEventListener(type, handler, options);
        removeListenerFunctions.push(() => canvas.removeEventListener(type, handler, options));
    }

    listeners.forEach(listener => {
        registerListener(canvas, listener, 'mousedown', { passive: false });
        registerListener(canvas, listener, 'mouseup', { passive: false });
        registerListener(canvas, listener, 'mousemove', { passive: false });
        registerListener(canvas, listener, 'wheel', { passive: false });
        registerListener(canvas, listener, 'dblclick', { passive: false });
        registerListener(canvas, listener, 'keydown', { passive: false });
    });

    return removeListenerFunctions;
}