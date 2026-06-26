const LEFT_CLICK_BUTTON = 0;

export interface LeftMouseButtonContext {
    canvas: HTMLCanvasElement;
    down: (e: MouseEvent) => void;
}

export function registerLeftMouseButtonListeners(ctx: LeftMouseButtonContext) {
    const onMouseDown = (e: MouseEvent) => {
        if (e.button !== LEFT_CLICK_BUTTON) return;
        e.preventDefault();

        ctx.down(e);
    };

    ctx.canvas.addEventListener("mousedown", onMouseDown);

    return () => {
        ctx.canvas.removeEventListener("mousedown", onMouseDown);
    };
}