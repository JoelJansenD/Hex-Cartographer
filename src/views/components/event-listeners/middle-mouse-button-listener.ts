import HexCartographerViewState from "../../hex-cartographer-view-state";

const MIDDLE_CLICK_BUTTON = 1;

export interface MiddleMouseButtonContext {
    getState: () => HexCartographerViewState;
    setState: (newState: HexCartographerViewState) => void;
    canvas: HTMLCanvasElement;
    down(e: MouseEvent, state: HexCartographerViewState): void;
}

export function registerMiddleMouseButtonListeners(ctx: MiddleMouseButtonContext) {
    const onMouseDown = (e: MouseEvent) => {
        if (e.button !== MIDDLE_CLICK_BUTTON) return;
        e.preventDefault();
        ctx.canvas.focus();

        const state = ctx.getState();
        ctx.down(e, state);
        ctx.setState(state);
    };

    ctx.canvas.addEventListener("mousedown", onMouseDown);

    return () => {
        ctx.canvas.removeEventListener("mousedown", onMouseDown);
    };
}