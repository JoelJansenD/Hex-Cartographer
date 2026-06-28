import { EventHandlerMap, Listener } from "./listeners";

export interface UndoRedoListenerContext {
    undo: () => void;
    redo: () => void;
}

export default class UndoRedoListener implements Listener {
    public events: EventHandlerMap = {
        keydown: this.onKeyDown.bind(this),
    };

    private _context: UndoRedoListenerContext;

    constructor(context: UndoRedoListenerContext) {
        this._context = context;
    }

    private onKeyDown(e: KeyboardEvent) {
        const key = e.key.toUpperCase();
        const control = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;

        if(key === "Z" && control && !shift) {
            e.preventDefault();
            this._context.undo();
            return;
        }

        if(control && (key === "Y" || (key === "Z" && shift))) {
            e.preventDefault();
            this._context.redo();
        }
    }
}