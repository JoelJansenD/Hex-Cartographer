// src/views/hex-cartographer-view/interactions/right-click-interaction.ts
import { pixelToHex } from "../../../functions/hex-math";
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
                removeHex(ctx, key);
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

function removeHex(ctx: RightClickInteractionContext, key: string) {
    const activeTool = ctx.activeTool();
    const activeSymbol = ctx.activeSymbol();

    if(activeTool === 'brush' || activeTool === 'eraser') {
        if(!activeSymbol && activeSymbol !== 'hexagon') {
            deleteHexSymbol(ctx.data.hexes, key);
        }
        else {
            deleteHexColor(ctx.data.hexes, key);
        }
    }
}

function deleteHexColor(hexes: HexagonSet, key: string) {
    if(!hexes[key]) throw new Error(`Hex with key ${key} does not exist.`);

    if(hexes[key].symbol) {
        delete hexes[key].color;
    }
    else {
        delete hexes[key];
    }
}

function deleteHexSymbol(hexes: HexagonSet, key: string) {
    if(!hexes[key]) throw new Error(`Hex with key ${key} does not exist.`);

    if(hexes[key].color) {
        delete hexes[key].symbol;
    }
    else {
        delete hexes[key];
    }
}