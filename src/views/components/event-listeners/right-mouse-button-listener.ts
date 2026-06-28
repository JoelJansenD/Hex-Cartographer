import HexCartographerViewState from "../../hex-cartographer-view-state";

export interface RightMouseButtonContext {
    canvas: HTMLCanvasElement;
    down(e: MouseEvent): void;
    up(e: MouseEvent): void;
    doubleClick: (e: MouseEvent) => void;
}

export function registerRightMouseButtonListeners(ctx: RightMouseButtonContext) {
    const onMouseDown = (e: MouseEvent) => {
        if (e.button !== 2) return;
        e.preventDefault();
        ctx.canvas.focus();

        ctx.down(e);
    };

    const onMouseUp = (e: MouseEvent) => {
        if (e.button !== 2) return;
        e.preventDefault();
        ctx.canvas.focus();

        ctx.up(e);
    };
    
    const onDoubleClick = (e: MouseEvent) => {
        if (e.button !== 2) return;
        e.preventDefault();
        ctx.canvas.focus();

        ctx.doubleClick(e);
    };

    ctx.canvas.addEventListener("mousedown", onMouseDown);
    ctx.canvas.addEventListener("mouseup", onMouseUp);
    ctx.canvas.addEventListener("dblclick", onDoubleClick);

    return () => {
        ctx.canvas.removeEventListener("mousedown", onMouseDown);
        ctx.canvas.removeEventListener("mouseup", onMouseUp);
        ctx.canvas.removeEventListener("dblclick", onDoubleClick);
    };
}