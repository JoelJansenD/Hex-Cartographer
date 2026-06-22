import { MapData } from "../types/map-data";

export default class HistoryService {
    private undoStack: MapData[] = [];
    private redoStack: MapData[] = [];

    public push(state: MapData) {
        console.log('Pushing new state to history');
        this.undoStack.push(state);
        this.redoStack = [];
    }

    public undo(currentState: MapData) : MapData | null {
        console.log('Undoing');

        if(this.undoStack.length === 0) {
            return null;
        }

        const previousState = this.undoStack.pop()!;
        this.redoStack.push(currentState);
        return previousState;
    }

    public redo(currentState: MapData) : MapData | null {
        console.log('Redoing');

        if(this.redoStack.length === 0) {
            return null;
        }

        const nextState = this.redoStack.pop()!;
        this.undoStack.push(currentState);
        return nextState;
    }
}