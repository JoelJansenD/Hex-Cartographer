import { Border } from "../types/border";
import { Hexagon, HexCoordinates } from "../types/hexagon";
import { Label } from "../types/label";
import { MapData } from "../types/map-data";
import { River, Road } from "../types/rivers-and-roads";
import { PaintMode, ToolGroup } from "../types/tool-group";

export default interface HexCartographerViewState {

    /**
     * The current map data being displayed and edited in the view. This includes all hexes, rivers, roads, texts, borders, and other relevant map information.
     */
    data: MapData;

    /**
     * Indicates whether the view is currently in edit mode or not. When in edit mode, the user can modify the map, while in view mode, the map is read-only.
     */
    editMode: boolean;

    /**
     * The currently dragged text label, or null if no text is being dragged.
     */
    draggedText: Label | null;

    /**
     * The mouse button currently being held down, or null if no button is being held.
     */
    heldButton: number | null;

    /**
     * Indicates whether the user is currently panning the map. This is typically set when the user holds down the middle mouse button.
     */
    isPanning: boolean;

    /**
     * The currently selected color in the toolbar. This determines the color used for painting hexes, rivers, roads, and other elements on the map.
     */
    selectedColor: string;

    /**
     * The currently selected paint mode in the toolbar. This determines how the user interacts with the map when using painting tools.
     */
    selectedPaintMode: PaintMode | null;

    /**
     * The currently selected path (river or road) on the map.
     */
    selectedPath: SelectedPath | null;

    /**
     * The currently selected pattern which can be copied onto other hexes on the map.
     */
    selectedPattern: Hexagon | null;

    /**
     * The currently selected region on the map.
     */
    selectedRegion: { border: Border; hexagon: HexCoordinates; } | null;

    /**
     * The currently selected river on the map. This is used when the user wants to modify or interact with a specific river.
     * @deprecated will be replaced with selectedPath
     */
    selectedRiver: River | null;

    /**
     * The currently selected road on the map. This is used when the user wants to modify or interact with a specific road.
     * @deprecated will be replaced with selectedPath
     */
    selectedRoad: Road | null;

    /**
     * The currently selected symbol in the side panel. This determines which icon is active for the user to place on the map.
     */
    selectedSymbol: string;

    /**
     * The currently selected tool group in the toolbar. This determines which set of tools is active for the user to interact with the map.
     */
    selectedToolGroup: ToolGroup | null;
}

export interface SelectedPath {
    id?: number;
    color: string;
    width: number;
    dashes: number;
    waypoints: HexCoordinates[];
    type: 'river' | 'road';
}