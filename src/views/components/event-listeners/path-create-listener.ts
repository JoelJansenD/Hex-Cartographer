import { EventHandlerMap, Listener, ListenerContext } from "./listeners";

export default class PathCreateListener implements Listener {
    public events: EventHandlerMap = {
        mousedown: this.onMouseDown.bind(this),
    };

    private _context: ListenerContext;

    constructor(context: ListenerContext) {
        this._context = context;
    }

    private onMouseDown(_e: MouseEvent) {
        void this._context;
    }
}