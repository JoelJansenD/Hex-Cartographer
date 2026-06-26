import { MapData } from "../types/map-data";

export default class HistoryService {
    private undoStack: string[] = [];
    private redoStack: string[] = [];

    public push(state: MapData) {
        console.log('Pushing new state to history', state);
        this.undoStack.push(JSON.stringify(state));
        this.redoStack = [];
    }

    public undo(currentState: MapData) : MapData | null {
        console.log('Undoing', this.undoStack);

        if(this.undoStack.length === 0) {
            return null;
        }

        const previousState = this.undoStack.pop()!;
        console.log(previousState)
        this.redoStack.push(JSON.stringify(currentState));
        return JSON.parse(previousState) as MapData;
    }

    public redo(currentState: MapData) : MapData | null {
        console.log('Redoing');

        if(this.redoStack.length === 0) {
            return null;
        }

        const nextState = this.redoStack.pop()!;
        this.undoStack.push(JSON.stringify(currentState));
        return JSON.parse(nextState) as MapData;
    }
}