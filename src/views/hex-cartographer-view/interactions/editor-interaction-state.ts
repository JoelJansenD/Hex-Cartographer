import { Border } from "../../../types/border";
import { Hexagon, HexCoordinates } from "../../../types/hexagon";
import { PaintMode, ToolGroup } from "../../../types/tool-group";

type SelectedRegion = { border: Border, hexagon: HexCoordinates };

export interface EditorInteractionState {
    selectedRegion: SelectedRegion | null;
    selectedSymbol: string | null;
    editMode: boolean;
    isPanning: boolean;
    selectedToolGroup: ToolGroup | null;
    selectedPaintMode: PaintMode | null;
    selectedPattern: Hexagon | null;
}