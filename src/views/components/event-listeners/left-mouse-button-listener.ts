import HexCartographerViewState from "../../hex-cartographer-view-state";

const LEFT_CLICK_BUTTON = 0;

export interface LeftMouseButtonContext {
    canvas: HTMLCanvasElement;
    down: (e: MouseEvent, state: HexCartographerViewState) => void;
    getState: () => HexCartographerViewState;
    setState: (newState: HexCartographerViewState) => void;
}

export function registerLeftMouseButtonListeners(ctx: LeftMouseButtonContext) {
    const onMouseDown = (e: MouseEvent) => {
        if (e.button !== LEFT_CLICK_BUTTON) return;
        e.preventDefault();

        const state = ctx.getState();
        ctx.down(e, state);
        ctx.setState(state);
    };

    ctx.canvas.addEventListener("mousedown", onMouseDown);

    return () => {
        ctx.canvas.removeEventListener("mousedown", onMouseDown);
    };
}