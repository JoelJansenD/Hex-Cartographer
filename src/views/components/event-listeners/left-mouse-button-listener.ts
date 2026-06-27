import HexCartographerViewState from "../../hex-cartographer-view-state";

const LEFT_CLICK_BUTTON = 0;

export interface LeftMouseButtonContext {
    canvas: HTMLCanvasElement;
    down: (e: MouseEvent) => void;
    up: (e: MouseEvent) => void;
}

export function registerLeftMouseButtonListeners(ctx: LeftMouseButtonContext) {
    const onMouseDown = (e: MouseEvent) => {
        if (e.button !== LEFT_CLICK_BUTTON) return;
        e.preventDefault();

        // We need to focus the canvas to ensure keyboard listeners
        // registered are triggered.
        ctx.canvas.focus();

        ctx.down(e);
    };

    const onMouseUp = (e: MouseEvent) => {
        if (e.button !== LEFT_CLICK_BUTTON) return;
        e.preventDefault();

        ctx.up(e);
    };

    ctx.canvas.addEventListener("mousedown", onMouseDown);
    ctx.canvas.addEventListener("mouseup", onMouseUp);

    return () => {
        ctx.canvas.removeEventListener("mousedown", onMouseDown);
        ctx.canvas.removeEventListener("mouseup", onMouseUp);
    };
}