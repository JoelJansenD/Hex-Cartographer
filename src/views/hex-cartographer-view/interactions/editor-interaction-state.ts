import { Hexagon } from "../../../types/hexagon";
import { PaintMode, ToolGroup } from "../../../types/tool-group";

export interface EditorInteractionState {
    currentSymbol: string | null;
    editMode: boolean;
    isPanning: boolean;
    selectedToolGroup: ToolGroup | null;
    selectedPaintMode: PaintMode | null;
    selectedPattern: Hexagon | null;
}