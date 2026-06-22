import { PixelCoordinates, pixelToHex } from "../../../functions/hex-math";
import { HexCoordinates } from "../../../types-legacy";
import { MapData } from "../../../types/map-data";

export interface RightClickContext {
    canvas: HTMLCanvasElement;
    data: MapData;
    getWorldCoordinates: (e: MouseEvent) => PixelCoordinates;
    onRightClickStart(hex: HexCoordinates): void;
    // onRightClickMove(hex: { q: number; r: number }, world: { x: number; y: number }): void;
    // onRightClickEnd(): void;
    // onDoubleRightClick(hex: { q: number; r: number }): void;
}

export function registerRightClickListeners(ctx: RightClickContext) {
    const onMouseDown = (e: MouseEvent) => {
        if (e.button !== 2) return;
        e.preventDefault();

        const world = ctx.getWorldCoordinates(e);
        const hex = pixelToHex(world.x, world.y, ctx.data.gridSize, ctx.data.settings.hexOrientation === 'horizontal');
        ctx.onRightClickStart(hex);
    };

    // const onMouseMove = (e: MouseEvent) => {
    //     if (e.buttons !== 2) return;

    //     const hex = pixelToHex(ctx.world.x, ctx.world.y, ctx.data.gridSize, ctx.hexOrientation);
    //     ctx.onRightClickMove(hex, ctx.world);
    // };

    // const onMouseUp = () => {
    //     ctx.onRightClickEnd();
    // };

    // const onContextMenu = (e: MouseEvent) => {
    //     if (ctx.editMode) e.preventDefault();
    // };

    ctx.canvas.addEventListener("mousedown", onMouseDown);
    // ctx.canvas.addEventListener("mousemove", onMouseMove);
    // ctx.canvas.addEventListener("mouseup", onMouseUp);
    // ctx.canvas.addEventListener("mouseleave", onMouseUp);
    // ctx.canvas.addEventListener("contextmenu", onContextMenu);

    return () => {
        ctx.canvas.removeEventListener("mousedown", onMouseDown);
        // ctx.canvas.removeEventListener("mousemove", onMouseMove);
        // ctx.canvas.removeEventListener("mouseup", onMouseUp);
        // ctx.canvas.removeEventListener("mouseleave", onMouseUp);
        // ctx.canvas.removeEventListener("contextmenu", onContextMenu);
    };
}