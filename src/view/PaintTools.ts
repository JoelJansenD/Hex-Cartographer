import {
    floodFillColor,
    floodFillSymbol,
    floodFillPattern,
    floodFillEmpty,
    isEnclosedByFrame,
    floodEraseColor,
    floodEraseSymbol,
    floodErasePattern,
} from '../utils/floodFill';
import type { PatternSnapshot } from '../utils/floodFill';
import type { HexData } from '../types';
import type { HexCartographerView } from './HexCartographerView';

/**
 * Handles the pen/eraser/fill-tool paint operations for HexCartographerView.
 * Stateful logic (reading tool state, mutating `view.data.hexes`, delegating
 * to view for path erasure and text hit-testing) lives here.
 * Pure flood algorithms are in `src/utils/floodFill.ts`.
 */
export class PaintTools {
    private readonly view: HexCartographerView;

    constructor(view: HexCartographerView) {
        this.view = view;
    }

    // ─── Pen tool ──────────────────────────────────────────────────────────────

    paintHex(hex: any): void {
        const v = this.view;
        const key = `${hex.q}_${hex.r}`;
        let h = v.data.hexes[key];

        if (!h) {
            h = { q: hex.q, r: hex.r };
            v.data.hexes[key] = h;
        }

        if (v.currentToolGroup === 'pattern' && v.patternData) {
            h.color = v.patternData.backgroundColor || v.patternData.color;
            h.symbol = v.patternData.symbol;
            h.symbolColor = v.patternData.symbolColor;
            return;
        }

        if (v.currentToolGroup === 'hexcolor') {
            h.color = v.masterColor;
            return;
        }

        if (v.currentToolGroup && v.toolConfigs[v.currentToolGroup]) {
            const config = v.toolConfigs[v.currentToolGroup];
            h.symbol = config.currentVariant;
            h.symbolColor = v.masterColor;
            config.symbolColor = v.masterColor;
            if (config.backgroundEnabled) {
                h.color = config.backgroundColor;
            }
        } else if (v.currentToolGroup === null) {
            h.color = v.colorPalette[v.activeColorSlot];
        }
    }

    // ─── Eraser tool ───────────────────────────────────────────────────────────

    handleEraser(hex: any, x: number, y: number): void {
        const v = this.view;
        const hasRecentData =
            v.lastErasedHex &&
            v.lastErasedHex.q === hex.q &&
            v.lastErasedHex.r === hex.r &&
            Date.now() - v.lastErasedHex.timestamp < 1000;

        if (!hasRecentData) {
            const preKey = `${hex.q}_${hex.r}`;
            const preData = v.data.hexes[preKey];
            const tg = v.currentToolGroup;

            if (tg === 'border') {
                const region = v.data.borders.find((r: any) =>
                    r.hexes.some((b: any) => b.q === hex.q && b.r === hex.r)
                );
                v.lastErasedHex = region
                    ? { q: hex.q, r: hex.r, type: 'border', regionId: region.id, timestamp: Date.now() }
                    : null;
            } else if (tg === 'pattern' && preData) {
                v.lastErasedHex = {
                    q: hex.q, r: hex.r, type: 'pattern',
                    pattern: { color: preData.color, symbol: preData.symbol, symbolColor: preData.symbolColor },
                    timestamp: Date.now(),
                };
            } else if (tg && v.toolConfigs[tg] && preData && preData.symbol) {
                v.lastErasedHex = { q: hex.q, r: hex.r, type: 'symbol', symbol: preData.symbol, timestamp: Date.now() };
            } else if ((tg === 'hexcolor' || tg === null) && preData && preData.color) {
                v.lastErasedHex = { q: hex.q, r: hex.r, type: 'color', color: preData.color, toolGroup: tg, timestamp: Date.now() };
            } else if (tg === 'river' || tg === 'road') {
                const paths: any[] = tg === 'river' ? (v.data.rivers || []) : (v.data.roads || []);
                const pathIds: number[] = [];
                for (const p of paths) {
                    if (p.waypoints && p.waypoints.some((w: any) => w.q === hex.q && w.r === hex.r)) {
                        pathIds.push(p.id);
                        continue;
                    }
                    if (p.waypoints && p.waypoints.length >= 2) {
                        let found = false;
                        for (let i = 0; i < p.waypoints.length - 1 && !found; i++) {
                            if (p.waypoints[i + 1].break) continue;
                            const segs = v.calculateHexPath(p.waypoints[i], p.waypoints[i + 1], p.width);
                            if (segs.some((s: any) =>
                                (s.from.q === hex.q && s.from.r === hex.r) ||
                                (s.to.q === hex.q && s.to.r === hex.r)
                            )) {
                                pathIds.push(p.id);
                                found = true;
                            }
                        }
                    }
                }
                v.lastErasedHex = pathIds.length > 0
                    ? { q: hex.q, r: hex.r, type: tg, pathIds, toolGroup: tg, timestamp: Date.now() }
                    : null;
            } else {
                v.lastErasedHex = null;
            }
        }

        if (v.currentToolGroup === 'text') {
            const hit = v.getTextAt(x, y);
            if (hit) v.data.texts = v.data.texts.filter((t: any) => t !== hit);
        } else if (v.currentToolGroup === 'border') {
            v.data.borders.forEach((r: any) => {
                r.hexes = r.hexes.filter((b: any) => !(b.q === hex.q && b.r === hex.r));
            });
            v.data.borders = v.data.borders.filter((r: any) => r.hexes.length > 0);
        } else if (v.currentToolGroup === 'river') {
            v.erasePathElement(v.data.rivers, hex);
        } else if (v.currentToolGroup === 'road') {
            v.erasePathElement(v.data.roads, hex);
        } else if (v.currentToolGroup === 'hexcolor') {
            const key = `${hex.q}_${hex.r}`;
            const h = v.data.hexes[key];
            if (h) {
                delete h.color;
                if (!h.symbol) delete v.data.hexes[key];
            }
        } else if (v.currentToolGroup === 'pattern') {
            const key = `${hex.q}_${hex.r}`;
            delete v.data.hexes[key];
        } else {
            const key = `${hex.q}_${hex.r}`;
            const h = v.data.hexes[key];
            if (h) {
                if (v.currentToolGroup && v.toolConfigs[v.currentToolGroup]) {
                    const config = v.toolConfigs[v.currentToolGroup];
                    if (h.symbol) {
                        delete h.symbol;
                        delete h.symbolColor;
                        if (config.backgroundEnabled) delete h.color;
                        if (!h.symbol && !h.color) delete v.data.hexes[key];
                    }
                } else if (v.currentToolGroup === null) {
                    if (h.color || h.backgroundColor) {
                        delete h.color;
                        delete h.backgroundColor;
                        if (!h.symbol) delete v.data.hexes[key];
                    }
                }
            }
        }
    }

    handleEraserFlood(hex: any): void {
        const v = this.view;
        const last = v.lastErasedHex;
        if (!last) return;
        if (Date.now() - last.timestamp > 1000) return;
        if (last.q !== hex.q || last.r !== hex.r) return;

        if (last.type === 'symbol') {
            floodEraseSymbol(v.data.hexes, hex, last.symbol);
        } else if (last.type === 'color') {
            floodEraseColor(v.data.hexes, hex, last.color);
        } else if (last.type === 'pattern') {
            floodErasePattern(v.data.hexes, hex, last.pattern, this.hexMatchesPattern);
        } else if (last.type === 'border') {
            v.borderTools.floodEraseBorderSegment(hex, last.regionId);
        } else if (last.type === 'river' || last.type === 'road') {
            const paths = last.type === 'river' ? v.data.rivers : v.data.roads;
            this.floodEraseEntirePath(paths, last.pathIds);
        }
        v.lastErasedHex = null;
    }

    /** Removes entire path objects whose id is listed in `pathIds`. */
    floodEraseEntirePath(paths: any[], pathIds: number[]): void {
        if (!paths || !pathIds || pathIds.length === 0) return;
        for (let i = paths.length - 1; i >= 0; i--) {
            if (pathIds.includes(paths[i].id)) paths.splice(i, 1);
        }
    }

    /** Returns true when a hex entry's color+symbol+symbolColor match the pattern snapshot. */
    hexMatchesPattern(hex: HexData, pattern: PatternSnapshot): boolean {
        const hexColor = (hex as any).backgroundColor || hex.color;
        const patternColor = pattern.backgroundColor || pattern.color;
        return hexColor === patternColor &&
               hex.symbol === pattern.symbol &&
               hex.symbolColor === pattern.symbolColor;
    }

    // ─── Fill tool ─────────────────────────────────────────────────────────────

    handleFillTool(startHex: any): void {
        const v = this.view;
        const key = `${startHex.q}_${startHex.r}`;
        const startData = v.data.hexes[key];

        if (!startData) {
            if (!isEnclosedByFrame(v.data.hexes, startHex)) return;
            this._floodFillEmpty(startHex);
            return;
        }

        if (v.currentToolGroup === 'pattern' && v.patternData) {
            floodFillPattern(
                v.data.hexes, startHex,
                startData.color, startData.symbol,
                v.patternData.color, v.patternData.symbol, v.patternData.symbolColor,
            );
        } else if (v.currentToolGroup === 'hexcolor') {
            floodFillColor(v.data.hexes, startHex, startData.color, v.masterColor);
        } else if (v.currentToolGroup === null) {
            floodFillColor(v.data.hexes, startHex, startData.color, v.colorPalette[v.activeColorSlot]);
        } else if (v.toolConfigs[v.currentToolGroup]) {
            const config = v.toolConfigs[v.currentToolGroup];
            floodFillSymbol(
                v.data.hexes, startHex,
                startData.symbol, startData.color,
                config.currentVariant, config.symbolColor, config.backgroundColor, config.backgroundEnabled,
            );
        }
    }

    private _floodFillEmpty(startHex: any): void {
        const v = this.view;
        floodFillEmpty(v.data.hexes, startHex, (hex: any) => {
            if (v.currentToolGroup === 'pattern' && v.patternData) {
                return {
                    q: hex.q, r: hex.r,
                    color: v.patternData.color,
                    symbol: v.patternData.symbol,
                    symbolColor: v.patternData.symbolColor,
                    backgroundColor: v.patternData.backgroundColor,
                };
            }
            if (v.currentToolGroup === 'hexcolor') {
                return { q: hex.q, r: hex.r, color: v.masterColor };
            }
            if (v.currentToolGroup === null) {
                return { q: hex.q, r: hex.r, color: v.colorPalette[v.activeColorSlot] };
            }
            if (v.toolConfigs[v.currentToolGroup]) {
                const config = v.toolConfigs[v.currentToolGroup];
                const data: any = { q: hex.q, r: hex.r, symbol: config.currentVariant, symbolColor: config.symbolColor };
                if (config.backgroundEnabled) data.color = config.backgroundColor;
                return data;
            }
            return null;
        });
    }
}
