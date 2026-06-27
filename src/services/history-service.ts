import { MapData } from "../types/map-data";

export default class HistoryService {
    private undoStack: string[] = [];
    private redoStack: string[] = [];

    public push(state: MapData) {
        this.undoStack.push(JSON.stringify(state));
        this.redoStack = [];
    }

    public undo(currentState: MapData) : MapData | null {
        if(this.undoStack.length === 0) {
            return null;
        }

        const previousState = this.undoStack.pop()!;
        this.redoStack.push(JSON.stringify(currentState));
        return JSON.parse(previousState) as MapData;
    }

    public redo(currentState: MapData) : MapData | null {
        if(this.redoStack.length === 0) {
            return null;
        }

        const nextState = this.redoStack.pop()!;
        this.undoStack.push(JSON.stringify(currentState));
        return JSON.parse(nextState) as MapData;
    }
}