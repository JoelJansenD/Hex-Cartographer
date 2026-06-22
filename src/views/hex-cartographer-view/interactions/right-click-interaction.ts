// src/views/hex-cartographer-view/interactions/right-click-interaction.ts
import { getHexNeighbors, pixelToHex } from "../../../functions/hex-math";
import { PixelCoordinates } from "../../../types-legacy";
import { Hexagon, HexCoordinates } from "../../../types/hexagon";
import { HexagonSet, MapData } from "../../../types/map-data";
import { ToolGroup } from "../../../types/tool-group";

export interface RightClickInteractionState {
    lastRightClick?: { time: number; key: string } | null;
    isRightErasing: boolean;
    rightEraseLastHex: string | null;
}

export interface RightClickInteractionContext {
    data: MapData;
    activeSymbol: () => string | undefined;
    activeTool: () => ToolGroup | undefined;
    editMode: () => boolean;
    pushHistory(data: MapData): void;
}

export function createRightClickInteraction(ctx: RightClickInteractionContext) {
    return {
        start(hex: HexCoordinates) {
            const key = `${hex.q}_${hex.r}`;
            const now = Date.now();

            if(ctx.editMode()) {
                deleteHex(ctx, key);
                ctx.pushHistory(ctx.data);
            }
            else {
                console.log('Right click in view mode', key)
            }

            // ctx.state.lastRightClick = { time: now, key };
            // ctx.state.isRightErasing = true;
            // ctx.state.rightEraseLastHex = null;
            // ctx.pushHistory();
            // ctx.handleEraser(hex, world.x, world.y);
            // ctx.state.rightEraseLastHex = key;
            // ctx.render();
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

function deleteHex(ctx: RightClickInteractionContext, key: string) {
    const activeTool = ctx.activeTool();
    const activeSymbol = ctx.activeSymbol();
    const shouldTargetSymbol = activeSymbol !== undefined && activeSymbol !== 'hexagon';

    if(activeTool === 'brush' || activeTool === 'eraser') {
        if(shouldTargetSymbol) {
            deleteHexSymbol(ctx.data.hexes, key);
        }
        else {
            deleteHexColor(ctx.data.hexes, key);
        }
    }
    else if(activeTool === 'bucket') {
        floodDeleteHexes(ctx.data.hexes, key, shouldTargetSymbol);
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