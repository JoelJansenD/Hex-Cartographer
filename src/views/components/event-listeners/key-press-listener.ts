import HexCartographerViewState from "../../hex-cartographer-view-state";

export interface KeyPressContext {
    canvas: HTMLCanvasElement;
    onKeyPress: (e: KeyboardEvent) => void;
}

export function registerKeyPressListener(context: KeyPressContext) {
    const onKeyPress = (e: KeyboardEvent) => {
        context.onKeyPress(e);
    };

    context.canvas.addEventListener('keydown', onKeyPress);

    return () => {
        context.canvas.removeEventListener('keydown', onKeyPress);
    };
}