import { ToolGroup } from "../../../types/tool-group";
import { MouseButtonInteraction } from "./mouse-button-interaction";
import resolveToolBehaviour from "./tool-behaviours/resolve-tool-behaviour";

export interface LeftMouseButtonInteractionState {
    isPanning: boolean;
}

export interface LeftMouseButtonInteractionContext {
    state: LeftMouseButtonInteractionState;
    selectedToolGroup: () => ToolGroup;
}

export function createLeftMouseButtonInteraction(ctx: LeftMouseButtonInteractionContext) : MouseButtonInteraction {
    return {
        down(e: MouseEvent) {
            if(e.ctrlKey) {
                ctx.state.isPanning = true;
                return;
            }

            const selectedToolGroup = ctx.selectedToolGroup();
            const behaviour = resolveToolBehaviour(selectedToolGroup);
            if(behaviour) {
                behaviour.execute(e);
            }
            else {
                throw new Error(`No behaviour found for tool group: ${selectedToolGroup}`);
            }
        },
    };
}