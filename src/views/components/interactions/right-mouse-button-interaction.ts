import { getWorldCoordinates } from "../../../functions/canvas";
import { getHexNeighbors, pixelToHex } from "../../../functions/hex-math";
import { HexCoordinates } from "../../../types/hexagon";
import { HexagonSet } from "../../../types/map-data";
import HexCartographerViewState from "../../hex-cartographer-view-state";
import { MouseButtonInteraction } from "./mouse-button-interaction";

export interface RightMouseButtonInteractionContext {
    getState: () => HexCartographerViewState;
    setState: (newState: HexCartographerViewState, pushToHistory?: boolean) => void;
    getCanvas: () => HTMLCanvasElement;
}

export function createRightMouseButtonInteraction(ctx: RightMouseButtonInteractionContext) : MouseButtonInteraction {
    return {
        down(e: MouseEvent) {
            const state = ctx.getState();
            if(!state.editMode) {
                return;
            }

            const world = getWorldCoordinates(e, ctx.getCanvas(), {x: state.data.offX, y: state.data.offY}, state.data.zoom);
            const hex = pixelToHex(world.x, world.y, state.data.gridSize, state.data.settings.hexOrientation === 'horizontal');

            const key = `${hex.q}_${hex.r}`;

            deleteHex(state, key);
            ctx.setState(state);
        },
        up(_: MouseEvent) {
        },
        doubleClick(_: MouseEvent) {
        }
    };
}

function deleteHex(state: HexCartographerViewState, key: string) {
    const activeTool = state.selectedPaintMode;
    const activeSymbol = state.selectedSymbol;
    const shouldTargetSymbol = activeSymbol !== undefined && activeSymbol !== 'hexagon';

    if(activeTool === 'brush' || activeTool === 'eraser') {
        if(shouldTargetSymbol) {
            deleteHexSymbol(state.data.hexes, key);
        }
        else {
            deleteHexColor(state.data.hexes, key);
        }
    }
    else if(activeTool === 'bucket') {
        floodDeleteHexes(state.data.hexes, key, shouldTargetSymbol);
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
    const visited: string[] = [];

    while(targetHexes.length > 0) {
        const currentHexData = targetHexes.pop()!;
        const currentKey = `${currentHexData.q}_${currentHexData.r}`;
        
        if(visited.includes(currentKey)) continue;

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
        visited.push(currentKey);
    }
}