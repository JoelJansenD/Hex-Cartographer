import HexCartographerViewState from "../../hex-cartographer-view-state";

interface KeyPressInteractionContext {
    undo: () => void;
    redo: () => void;
}

export function createKeyPressInteraction(ctx: KeyPressInteractionContext) {
    return {
        down: (e: KeyboardEvent) => keyPress_Down(e, ctx)
    };
}

function keyPress_Down(e: KeyboardEvent, ctx: KeyPressInteractionContext) {
    const key = e.key.toUpperCase();
    const control = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    if(key === 'Z' && control && !shift) {
        ctx.undo();
        return;
    }

    if(control && (key === 'Y' || (key === 'Z' && shift))) {
        ctx.redo();
        return;
    }
}