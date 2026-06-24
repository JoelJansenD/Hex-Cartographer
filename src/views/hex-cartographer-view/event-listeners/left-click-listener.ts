const LEFT_CLICK_BUTTON = 0;

export interface LeftClickContext {
    canvas: HTMLCanvasElement;
    onLeftClickStart(e: MouseEvent): void;
}

export function registerLeftClickListeners(ctx: LeftClickContext) {
    const onMouseDown = (e: MouseEvent) => {
        if (e.button !== LEFT_CLICK_BUTTON) return;
        e.preventDefault();

        ctx.onLeftClickStart(e);
    };

    ctx.canvas.addEventListener("mousedown", onMouseDown);

    return () => {
        ctx.canvas.removeEventListener("mousedown", onMouseDown);
    };
}