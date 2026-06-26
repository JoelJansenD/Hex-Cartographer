import { Border } from "../../../types/border";
import { Hexagon, HexCoordinates } from "../../../types/hexagon";
import { River, Road } from "../../../types/rivers-and-roads";
import { PaintMode, ToolGroup } from "../../../types/tool-group";

type SelectedRegion = { border: Border, hexagon: HexCoordinates };

/**
 * @deprecated This interface is no longer used and will be removed in a future version. Use the `HexCartographerViewState` interface instead.
 */
export interface EditorInteractionState {
    editMode: boolean;
    isPanning: boolean;
    selectedPaintMode: PaintMode | null;
    selectedPattern: Hexagon | null;
    selectedRegion: SelectedRegion | null;
    selectedRiver: River | null;
    selectedRoad: Road | null;
    selectedSymbol: string | null;
    selectedToolGroup: ToolGroup | null;
}