import { MapData } from "../../../types/map-data";

export interface RightMouseButtonContext {
    canvas: HTMLCanvasElement;
    data: MapData;
    down(e: MouseEvent): void;
    // onRightClickMove(hex: { q: number; r: number }, world: { x: number; y: number }): void;
    // onRightClickEnd(): void;
    // onDoubleRightClick(hex: { q: number; r: number }): void;
}

export function registerRightMouseButtonListeners(ctx: RightMouseButtonContext) {
    const onMouseDown = (e: MouseEvent) => {
        if (e.button !== 2) return;
        e.preventDefault();

        ctx.down(e);
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