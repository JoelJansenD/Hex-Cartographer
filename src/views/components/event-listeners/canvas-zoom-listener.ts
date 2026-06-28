import { MAX_ZOOM, MIN_ZOOM } from "../../../constants";
import { EventHandlerMap, Listener, ListenerContext } from "./listeners";

export default class CanvasZoomListener implements Listener {
    public events: EventHandlerMap = {
        wheel: this.onWheel.bind(this),
    };

    private _context: ListenerContext;

    constructor(context: ListenerContext) {
        this._context = context;
    }

    private onWheel(e: WheelEvent) {
        e.preventDefault();

        const state = this._context.getState();
        const canvas = this._context.getCanvas();

        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        
        const oldZoom = state.data.zoom;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * zoomFactor));
        if(newZoom === oldZoom) {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = (mouseX - state.data.offX) / oldZoom;
        const worldY = (mouseY - state.data.offY) / oldZoom;

        state.data.offX = mouseX - worldX * newZoom;
        state.data.offY = mouseY - worldY * newZoom;
        state.data.zoom = newZoom;

        this._context.setState(state, false);
    }
}