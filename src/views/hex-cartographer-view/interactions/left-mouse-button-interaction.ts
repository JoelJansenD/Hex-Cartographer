import { Notice } from "obsidian";
import { PixelCoordinates, pixelToHex } from "../../../functions/hex-math";
import { HexagonSet, MapData } from "../../../types/map-data";
import { MouseButtonInteraction } from "./mouse-button-interaction";
import { localizeString } from "../../../functions/i18n";
import { EditorInteractionState } from "./editor-interaction-state";
import { Border } from "../../../types/border";
import { Hexagon, HexCoordinates } from "../../../types/hexagon";

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
                case 'select-border':
                    down_SelectBorder(e, ctx, state);
                    break;
                default:
                    throw new Error(`Unhandled tool group: ${selectedToolGroup}`);
            }

            ctx.setState(state);
        },
    };
}

function down_PatternPicker(e: MouseEvent, ctx: LeftMouseButtonInteractionContext, state: EditorInteractionState) {
    ctx.getCanvas().focus();
    const hex = getHexagonCoordinatesAtMousePosition(ctx, e);
    const data = ctx.getData();
    const hexData = getHexagonAtCoordinates(data.hexes, hex);

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

function down_SelectBorder(e: MouseEvent, ctx: LeftMouseButtonInteractionContext, state: EditorInteractionState) {
    const hex = getHexagonCoordinatesAtMousePosition(ctx, e);
    const data = ctx.getData();
    
    let foundRegion: Border | null = null;
    for(const region of data.borders) {
        if(region.hexes.some(b => b.q === hex.q && b.r === hex.r)) {
            foundRegion = region;
            break;
        }
    }

    if(!foundRegion) {
        new Notice(localizeString('notice.noBorderAtPosition'));
        return;
    }

    state.selectedRegion = {
        border: foundRegion,
        hexagon: hex
    };

    new Notice(localizeString('notice.borderSelected', { id: foundRegion.id }));
}

function getHexagonCoordinatesAtMousePosition(ctx: LeftMouseButtonInteractionContext, e: MouseEvent) {
    const data = ctx.getData();
    const world = ctx.getWorldCoordinates(e);
    const hex = pixelToHex(world.x, world.y, data.gridSize, data.settings.hexOrientation === 'horizontal');
    return hex;
}

function getHexagonAtCoordinates(hexes: HexagonSet, hex: HexCoordinates) {
    const key = `${hex.q}_${hex.r}`;
    return hexes[key] || null;
}