import HexCartographerViewState from "../views/hex-cartographer-view-state";
import { PixelCoordinates, pixelToHex } from "./hex-math";

export function getWorldCoordinates(e: MouseEvent, canvas: HTMLCanvasElement, offset?: PixelCoordinates, zoom?: number): PixelCoordinates {
    const r = canvas!.getBoundingClientRect();
    return {
        x: (e.clientX - r.left - (offset?.x ?? 0)) / (zoom ?? 1),
        y: (e.clientY - r.top - (offset?.y ?? 0)) / (zoom ?? 1)
    };
}

export function getHexagonCoordinatesAtMousePosition(e: MouseEvent, canvas: HTMLCanvasElement, state: HexCartographerViewState) {
    const world = getWorldCoordinates(e, canvas, { x: state.data.offX, y: state.data.offY}, state.data.zoom);
    const hex = pixelToHex(world.x, world.y, state.data.gridSize, state.data.settings.hexOrientation === 'horizontal');
    return hex;
}