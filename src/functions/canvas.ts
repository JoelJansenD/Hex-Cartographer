import HexCartographerViewState from "../views/hex-cartographer-view-state";
import { PixelCoordinates, pixelToHex } from "./hexes";

export function getWorldCoordinates(clientX: number, clientY: number, canvasRect: { left: number; top: number }, offset?: PixelCoordinates, zoom?: number): PixelCoordinates {
    return {
        x: (clientX - canvasRect.left - (offset?.x ?? 0)) / (zoom ?? 1),
        y: (clientY - canvasRect.top - (offset?.y ?? 0)) / (zoom ?? 1)
    };
}

export function getHexagonCoordinatesAtMousePosition(e: MouseEvent, canvasRect: { left: number; top: number }, state: HexCartographerViewState) {
    const world = getWorldCoordinates(e.clientX, e.clientY, canvasRect, { x: state.data.offX, y: state.data.offY}, state.data.zoom);
    const hex = pixelToHex(world.x, world.y, state.data.gridSize, state.data.settings.hexOrientation === 'horizontal');
    return hex;
}