const MIDDLE_CLICK_BUTTON = 1;

export interface MiddleMouseButtonContext {
    canvas: HTMLCanvasElement;
    down(e: MouseEvent): void;
}

export function registerMiddleMouseButtonListeners(ctx: MiddleMouseButtonContext) {
    const onMouseDown = (e: MouseEvent) => {
        if (e.button !== MIDDLE_CLICK_BUTTON) return;
        e.preventDefault();

        ctx.down(e);
    };

    ctx.canvas.addEventListener("mousedown", onMouseDown);

    return () => {
        ctx.canvas.removeEventListener("mousedown", onMouseDown);
    };
}