import { Label } from "../types/label";
import HexCartographerViewState from "../views/hex-cartographer-view-state";
import { PixelCoordinates } from "./hex-math";

export function getTextIndexAtClick(world: PixelCoordinates, canvas: HTMLCanvasElement, state: HexCartographerViewState): number {
    const data = state.data;
    if(!data.texts) return -1;

    return data.texts.findIndex((t: Label) => {
        const weight = t.bold ? "bold " : "";
        const context = canvas.getContext("2d")!;

        const height = t.size || 16;
        context.font = `${weight}${height}px Verdana`;

        const size = context.measureText(t.text);
        const halfWidth = size.width / 2;
        return world.x >= t.x - halfWidth - 5 
            && world.x <= t.x + halfWidth + 5 
            && world.y >= t.y - height 
            && world.y <= t.y + 5;
    });
}