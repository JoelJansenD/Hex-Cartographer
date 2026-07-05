import { Label } from "../types/label";
import HexCartographerViewState from "../views/hex-cartographer-view-state";
import { PixelCoordinates } from "./hexes";

export function getTextIndexAtClick(world: PixelCoordinates, measureText: (text: string, font: string) => number, state: HexCartographerViewState): number {
    const data = state.data;
    if(!data.texts) return -1;

    return data.texts.findIndex((t: Label) => {
        const weight = t.bold ? "bold " : "";
        const height = t.size || 16;
        const font = `${weight}${height}px Verdana`;
        const halfWidth = measureText(t.text, font) / 2;
        return world.x >= t.x - halfWidth - 5 
            && world.x <= t.x + halfWidth + 5 
            && world.y >= t.y - height 
            && world.y <= t.y + 5;
    });
}