import { ToolGroup } from "../types/tool-group";

export default interface HexCartographerViewState {
    /**
     * Indicates whether the view is currently in edit mode or not. When in edit mode, the user can modify the map, while in view mode, the map is read-only.
     */
    editMode: boolean;

    /**
     * The currently selected tool group in the toolbar. This determines which set of tools is active for the user to interact with the map.
     */
    selectedToolGroup: ToolGroup;
}