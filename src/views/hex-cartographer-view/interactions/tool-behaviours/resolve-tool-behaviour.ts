import { ToolGroup } from "../../../../types/tool-group";
import ColorPickerBehaviour from "./color-picker-behaviour";
import ToolBehaviour from "./tool-behaviour";

const toolBehaviours: ToolBehaviour[] = [
    new ColorPickerBehaviour(),
];

export default function resolveToolBehaviour(tool: ToolGroup): ToolBehaviour | null {
    const behaviour = toolBehaviours.find(b => b.type === tool);
    return behaviour || null;
}