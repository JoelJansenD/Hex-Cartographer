import { Listener } from "./listeners";


export default function registerListeners(canvas: HTMLCanvasElement, listeners: Listener[]) {
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
        registerListener(canvas, listener, 'mousedown');
        registerListener(canvas, listener, 'mouseup');
        registerListener(canvas, listener, 'mousemove');
        registerListener(canvas, listener, 'dblclick');
    });

    return removeListenerFunctions;
}