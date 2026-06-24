const MIDDLE_CLICK_BUTTON = 1;

export interface MiddleClickContext {
    canvas: HTMLCanvasElement;
    onMiddleClickStart(e: MouseEvent): void;
}

export function registerMiddleClickListeners(ctx: MiddleClickContext) {
    const onMouseDown = (e: MouseEvent) => {
        if (e.button !== MIDDLE_CLICK_BUTTON) return;
        e.preventDefault();

        ctx.onMiddleClickStart(e);
    };

    ctx.canvas.addEventListener("mousedown", onMouseDown);

    return () => {
        ctx.canvas.removeEventListener("mousedown", onMouseDown);
    };
}