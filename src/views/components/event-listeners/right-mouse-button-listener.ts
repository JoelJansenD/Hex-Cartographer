import HexCartographerViewState from "../../hex-cartographer-view-state";

export interface RightMouseButtonContext {
    getState: () => HexCartographerViewState;
    setState: (newState: HexCartographerViewState) => void;
    canvas: HTMLCanvasElement;
    down(e: MouseEvent, state: HexCartographerViewState): void;
    // onRightClickMove(hex: { q: number; r: number }, world: { x: number; y: number }): void;
    // onRightClickEnd(): void;
    // onDoubleRightClick(hex: { q: number; r: number }): void;
}

export function registerRightMouseButtonListeners(ctx: RightMouseButtonContext) {
    const onMouseDown = (e: MouseEvent) => {
        if (e.button !== 2) return;
        e.preventDefault();
        ctx.canvas.focus();

        const state = ctx.getState();
        ctx.down(e, state);
        ctx.setState(state);
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