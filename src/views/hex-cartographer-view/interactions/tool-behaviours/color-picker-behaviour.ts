import { ToolGroup } from "../../../../types/tool-group";
import ToolBehaviour from "./tool-behaviour";

export default class ColorPickerBehaviour implements ToolBehaviour {
    type: ToolGroup = 'pickColor';

    execute(e: MouseEvent): void {
        throw new Error("Method not implemented.");
    }
}