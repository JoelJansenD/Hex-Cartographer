import { getHexNeighbors, PixelCoordinates, pixelToHex } from "../../../functions/hex-math";
import { HexCoordinates } from "../../../types/hexagon";
import { HexagonSet, MapData } from "../../../types/map-data";
import { EditorInteractionState } from "./editor-interaction-state";
import { MouseButtonInteraction } from "./mouse-button-interaction";

export interface RightMouseButtonInteractionContext {
    data: MapData;
    getWorldCoordinates: (e: MouseEvent) => PixelCoordinates;
    pushHistory(data: MapData): void;
    getState: () => EditorInteractionState;
    setState: (newState: EditorInteractionState) => void;
}

export function createRightMouseButtonInteraction(ctx: RightMouseButtonInteractionContext) : MouseButtonInteraction {
    return {
        down(e: MouseEvent) {
            const state = ctx.getState();
            if(!state.editMode) {
                return;
            }

            const world = ctx.getWorldCoordinates(e);
            const hex = pixelToHex(world.x, world.y, ctx.data.gridSize, ctx.data.settings.hexOrientation === 'horizontal');

            const key = `${hex.q}_${hex.r}`;

            deleteHex(state, ctx.data.hexes, key);
            ctx.pushHistory(ctx.data);
        },

        // move(hex: HexCoordinates, world: PixelCoordinates) {
        //     if (!ctx.state.isRightErasing) return;

        //     const key = `${hex.q}_${hex.r}`;
        //     if (key === ctx.state.rightEraseLastHex) return;

        //     ctx.handleEraser(hex, world.x, world.y);
        //     ctx.state.rightEraseLastHex = key;
        //     ctx.render();
        // },

        // end() {
        //     if (!ctx.state.isRightErasing) return;
        //     ctx.state.isRightErasing = false;
        //     ctx.state.rightEraseLastHex = null;
        //     ctx.requestSave();
        // },
    };
}

function deleteHex(state: EditorInteractionState, hexes: HexagonSet, key: string) {
    const activeTool = state.selectedPaintMode;
    const activeSymbol = state.currentSymbol;
    const shouldTargetSymbol = activeSymbol !== undefined && activeSymbol !== 'hexagon';

    if(activeTool === 'brush' || activeTool === 'eraser') {
        if(shouldTargetSymbol) {
            deleteHexSymbol(hexes, key);
        }
        else {
            deleteHexColor(hexes, key);
        }
    }
    else if(activeTool === 'bucket') {
        floodDeleteHexes(hexes, key, shouldTargetSymbol);
    }
}

function deleteHexColor(hexes: HexagonSet, key: string) {
    if(!hexes[key]) throw new Error('Attempting to delete color of a hex that does not exist');

    if(hexes[key].symbol) {
        delete hexes[key].color;
    }
    else {
        delete hexes[key];
    }
}

function deleteHexSymbol(hexes: HexagonSet, key: string) {
    if(!hexes[key]) throw new Error('Attempting to delete symbol of a hex that does not exist');

    if(hexes[key].color) {
        delete hexes[key].symbol;
    }
    else {
        delete hexes[key];
    }
}

function floodDeleteHexes(hexes: HexagonSet, targetKey: string, shouldTargetSymbol: boolean) {
    const targetData = {... hexes[targetKey]!};
    const targetHexes: HexCoordinates[] = [ hexes[targetKey]! ];

    while(targetHexes.length > 0) {
        const currentHexData = targetHexes.pop()!;
        const currentKey = `${currentHexData.q}_${currentHexData.r}`;
        const currentData = hexes[currentKey];

        if(!currentData) continue;

        if(shouldTargetSymbol) {
            if(currentData.symbol !== targetData.symbol || currentData.symbolColor !== targetData.symbolColor) continue;
            deleteHexSymbol(hexes, currentKey);
        }
        else {
            if(currentData.color !== targetData.color) continue;
            deleteHexColor(hexes, currentKey);
        }

        targetHexes.push(...getHexNeighbors(currentHexData));
    }
}