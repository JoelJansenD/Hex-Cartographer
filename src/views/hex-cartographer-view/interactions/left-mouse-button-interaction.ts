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
                case 'selectPathAndBorder':
                    down_PathAndBorderPicker(e, ctx, state);
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

    if (hexData) {
        state.selectedPattern = {...hexData};
        state.selectedToolGroup = 'pattern';
        state.selectedPaintMode = 'brush';
        new Notice(localizeString('notice.patternPicked'));
    }
    else {
        state.selectedPattern = null;
        new Notice(localizeString('notice.noHexAtPosition'));
    }
}

function down_PathAndBorderPicker(e: MouseEvent, ctx: LeftMouseButtonInteractionContext, state: EditorInteractionState) {
//     if (this.borderPickMode) {
//         const clickedHex = this.startHex;
//         let foundRegion: any = null;
//         if (this.data.borders) {
//             for (const region of this.data.borders) {
//                 if (region.hexes.some(b => b.q === clickedHex.q && b.r === clickedHex.r)) {
//                     foundRegion = region;
//                     break;
//                 }
//             }
//         }
//         if (foundRegion) {
//             this.borderSettings.activeRegionId = foundRegion.id;
//             this.borderSettings.pickedHex = { q: clickedHex.q, r: clickedHex.r };
//             this.borderSettings.dashes = foundRegion.dashes || DEFAULT_BORDER_DASHES;
//             this.masterColor = foundRegion.color;
//             if (this.masterColorInput) { this.masterColorInput.value = this.masterColor; if (this.masterColorBtn) this.masterColorBtn.style.backgroundColor = this.masterColor; }
//             if (this.borderDashesInput) this.borderDashesInput.value = this.borderSettings.dashes.toString();
//             new Notice(localizeString('notice.borderSelected', { id: foundRegion.id }));
//         } else {
//             new Notice(localizeString('notice.noBorderAtPosition'));
//         }
//         this.borderPickMode = false;
//         if (this.borderPickerBtn) {
//             this.borderPickerBtn.style.background = BUTTON_BG_DEFAULT;
//             this.borderPickerBtn.style.color = '';
//         }
//         this.currentToolGroup = 'border';
//         this.drawMode = 'pen';
//         const toolbar = this.contentEl.querySelector('.hex-toolbar');
//         if (toolbar) {
//             this.updateToolbarState(toolbar);
//         }
//         this.render();
//         return;
//     }
}