import { PixelCoordinates } from "./hex-math";

export function getWorldCoordinates(e: MouseEvent, canvas: HTMLCanvasElement, offset?: PixelCoordinates, zoom?: number): PixelCoordinates {
    const r = canvas!.getBoundingClientRect();
    return {
        x: (e.clientX - r.left - (offset?.x ?? 0)) / (zoom ?? 1),
        y: (e.clientY - r.top - (offset?.y ?? 0)) / (zoom ?? 1)
    };
}