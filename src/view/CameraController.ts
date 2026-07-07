import { Notice } from 'obsidian';
import { t } from '../i18n';
import { MIN_ZOOM, MAX_ZOOM, VIEWPORT_PADDING } from '../constants';
import type { HexCartographerView } from './HexCartographerView';

/**
 * Manages the viewport camera for a HexCartographerView:
 * fit-to-view, canvas resize, coordinate conversion, zoom, and hex bounds.
 */
export class CameraController {
    private readonly view: HexCartographerView;

    constructor(view: HexCartographerView) {
        this.view = view;
    }

    /** Fit the map content into the visible canvas, centering and scaling to fill. */
    fit(): void {
        const { data, canvas } = this.view;
        const hexes = Object.values(data.hexes) as any[];
        const texts: any[] = data.texts || [];
        const borders: any[] = data.borders || [];

        const borderOnlyHexes: any[] = [];
        const hexKeySet = new Set(Object.keys(data.hexes));
        for (const region of borders) {
            for (const bh of region.hexes) {
                if (!hexKeySet.has(`${bh.q}_${bh.r}`)) {
                    borderOnlyHexes.push(bh);
                }
            }
        }

        if (hexes.length === 0 && texts.length === 0 && borderOnlyHexes.length === 0) {
            new Notice(t('notice.noHexesToShow'));
            return;
        }

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        const expandBounds = (hex: any) => {
            const pos = this.view.hexToPixel(hex);
            const s = data.gridSize;
            minX = Math.min(minX, pos.x - s);
            maxX = Math.max(maxX, pos.x + s);
            minY = Math.min(minY, pos.y - s);
            maxY = Math.max(maxY, pos.y + s);
        };

        hexes.forEach(expandBounds);
        borderOnlyHexes.forEach(expandBounds);

        texts.forEach((txt: any) => {
            const textSize = txt.size || 16;
            const estimatedWidth = txt.text.length * textSize * 0.6;
            const estimatedHeight = textSize;
            minX = Math.min(minX, txt.x - estimatedWidth / 2);
            maxX = Math.max(maxX, txt.x + estimatedWidth / 2);
            minY = Math.min(minY, txt.y - estimatedHeight / 2);
            maxY = Math.max(maxY, txt.y + estimatedHeight / 2);
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const width = maxX - minX;
        const height = maxY - minY;

        const canvasWidth: number = canvas.width;
        const canvasHeight: number = canvas.height;
        const zoomX = (canvasWidth * VIEWPORT_PADDING) / width;
        const zoomY = (canvasHeight * VIEWPORT_PADDING) / height;
        const newZoom = Math.max(MIN_ZOOM, Math.min(zoomX, zoomY, MAX_ZOOM));

        data.zoom = newZoom;
        data.offX = canvasWidth / 2 - centerX * newZoom;
        data.offY = canvasHeight / 2 - centerY * newZoom;

        this.view.render();
        this.view.requestSave();
    }

    /** Sync canvas pixel dimensions to CSS layout size and restore or initialise the viewport. */
    resize(): void {
        const { canvas, data } = this.view;
        if (!canvas) return;

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        if (!this.view._initialResizeDone) {
            this.view._initialResizeDone = true;
            if (data.settings?.viewportSaved && data.centerWorldX !== undefined && data.centerWorldY !== undefined) {
                data.offX = canvas.width / 2 - data.centerWorldX * data.zoom;
                data.offY = canvas.height / 2 - data.centerWorldY * data.zoom;
            } else if (!data.settings?.viewportSaved) {
                data.offX = canvas.width / 2;
                data.offY = canvas.height / 2;
            }
        }

        const textCanvas = this.view.textCanvas;
        if (textCanvas) {
            textCanvas.width = textCanvas.clientWidth;
            textCanvas.height = textCanvas.clientHeight;
        }

        this.view.render();
    }

    /** Convert a pointer event's client position to world (map) coordinates. */
    getWorldCoords(e: { clientX: number; clientY: number }): { x: number; y: number } {
        const { canvas, data } = this.view;
        const r = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - r.left - data.offX) / data.zoom,
            y: (e.clientY - r.top - data.offY) / data.zoom,
        };
    }

    /** Return the q/r bounding box of all painted hexes, or null when the map is empty. */
    getHexBounds(): { minQ: number; maxQ: number; minR: number; maxR: number } | null {
        const keys = Object.keys(this.view.data.hexes || {});
        if (keys.length === 0) return null;
        let minQ = Infinity, maxQ = -Infinity, minR = Infinity, maxR = -Infinity;
        for (const key of keys) {
            const h = this.view.data.hexes[key];
            if (h.q < minQ) minQ = h.q;
            if (h.q > maxQ) maxQ = h.q;
            if (h.r < minR) minR = h.r;
            if (h.r > maxR) maxR = h.r;
        }
        return { minQ, maxQ, minR, maxR };
    }

    /**
     * Apply a multiplicative zoom centred on the given canvas-space point.
     * Returns false when the zoom was already at its clamped limit (no change applied).
     */
    zoomAtPoint(factor: number, mouseX: number, mouseY: number): boolean {
        const data = this.view.data;
        const oldZoom = data.zoom;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * factor));
        if (newZoom === oldZoom) return false;

        const worldX = (mouseX - data.offX) / oldZoom;
        const worldY = (mouseY - data.offY) / oldZoom;

        data.offX = mouseX - worldX * newZoom;
        data.offY = mouseY - worldY * newZoom;
        data.zoom = newZoom;
        return true;
    }
}
