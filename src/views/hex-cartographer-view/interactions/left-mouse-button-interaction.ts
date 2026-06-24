import { Notice } from "obsidian";
import { PixelCoordinates, pixelToHex } from "../../../functions/hex-math";
import { MapData } from "../../../types/map-data";
import { ToolGroup } from "../../../types/tool-group";
import { MouseButtonInteraction } from "./mouse-button-interaction";
import { localizeString } from "../../../functions/i18n";
import { EditorInteractionState } from "./editor-interaction-state";

export interface LeftMouseButtonInteractionContext {
    getState: () => EditorInteractionState;
    getCanvas: () => HTMLCanvasElement;
    getData: () => MapData;
    getWorldCoordinates: (e: MouseEvent) => PixelCoordinates;
    setState: (newState: EditorInteractionState) => void;
}

export function createLeftMouseButtonInteraction(ctx: LeftMouseButtonInteractionContext) : MouseButtonInteraction {

    return {
        down(e: MouseEvent) {
            const state = {... ctx.getState()};

            if(e.ctrlKey) {
                state.isPanning = true;
                return;
            }

            const selectedToolGroup = ctx.getState().selectedToolGroup;
            switch(selectedToolGroup) {
                case 'pattern-picker':
                    down_PatternPicker(e, ctx, state);
                    break;
                default:
                    throw new Error(`Unhandled tool group: ${selectedToolGroup}`);
            }

            ctx.setState(state);
        },
    };
}

function down_PatternPicker(e: MouseEvent, ctx: LeftMouseButtonInteractionContext, state: EditorInteractionState) {
    const canvas = ctx.getCanvas();
    canvas.focus();

    const data = ctx.getData();
    const world = ctx.getWorldCoordinates(e);
    const hex = pixelToHex(world.x, world.y, data.gridSize, data.settings.hexOrientation === 'horizontal');
    
    const key = `${hex.q}_${hex.r}`;
    const hexData = data.hexes[key];

    console.log('Pattern picker down event:', { hex, key, hexData });

    if (hexData) {
        state.selectedPattern = {...hexData};
        state.selectedToolGroup = 'pattern';
        state.selectedPaintMode = 'brush';
        new Notice(localizeString('notice.patternPicked'));
    }
    else {
        const patternData = null;
        const patternSourceHex = null;
        new Notice(localizeString('notice.noHexAtPosition'));
    }

//     this.pendingHistory = true;
//     this.isMouseDown = true;
//     this.mouseDownPos = { x: world.x, y: world.y };
//     this.startHex = pixelToHex(world.x, world.y, this.data.gridSize, this.hexOrientation);
//     this.lastHex = this.startHex;


//     this.patternPickMode = false;
//     if (this.patternPickerBtn) {
//         this.patternPickerBtn.style.background = BUTTON_BG_DEFAULT;
//     }
//     const toolbar = this.contentEl.querySelector('.hex-toolbar');
//     if (toolbar) {
//         this.updateToolbarState(toolbar);
//     }
//     this.render();
//     this.requestSave(); // Speichere Muster sofort
//     return;
}