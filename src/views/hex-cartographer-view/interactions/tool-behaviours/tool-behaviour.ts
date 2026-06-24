import { ToolGroup } from "../../../../types/tool-group";

export default interface ToolBehaviour {
    type: ToolGroup;
    execute(e: MouseEvent): void;
}