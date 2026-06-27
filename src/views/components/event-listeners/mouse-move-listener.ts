export interface MouseMoveContext {
    canvas: HTMLCanvasElement;
    onMouseMove: (e: MouseEvent) => void;
}

export function registerMouseMoveListener(context: MouseMoveContext) {
    const onMouseMove = (e: MouseEvent) => {
        context.onMouseMove(e);
    }

    context.canvas.addEventListener("mousemove", onMouseMove);

    return () => {
        context.canvas.removeEventListener("mousemove", onMouseMove);
    };
}