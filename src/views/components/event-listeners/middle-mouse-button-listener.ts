import HexCartographerViewState from "../../hex-cartographer-view-state";

const MIDDLE_CLICK_BUTTON = 1;

export interface MiddleMouseButtonContext {
    canvas: HTMLCanvasElement;
    down(e: MouseEvent): void;
    up(e: MouseEvent): void;
    doubleClick: (e: MouseEvent) => void;
}

export function registerMiddleMouseButtonListeners(ctx: MiddleMouseButtonContext) {
    const onMouseDown = (e: MouseEvent) => {
        if (e.button !== MIDDLE_CLICK_BUTTON) return;
        e.preventDefault();
        ctx.canvas.focus();

        ctx.down(e);
    };

    const onMouseUp = (e: MouseEvent) => {
        if (e.button !== MIDDLE_CLICK_BUTTON) return;
        e.preventDefault();
        ctx.canvas.focus();
        ctx.up(e);
    };

    ctx.canvas.addEventListener("mousedown", onMouseDown);
    ctx.canvas.addEventListener("mouseup", onMouseUp);

    return () => {
        ctx.canvas.removeEventListener("mousedown", onMouseDown);
        ctx.canvas.removeEventListener("mouseup", onMouseUp);
    };
}