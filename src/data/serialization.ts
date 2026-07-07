import type { MapData } from '../types';
import {
    DEFAULT_BORDER_COLOR,
    DEFAULT_GRID_SIZE,
    DEFAULT_OFF_X,
    DEFAULT_OFF_Y,
    DEFAULT_PALETTE,
    DEFAULT_PALETTE2,
    DEFAULT_RIVER_COLOR,
    DEFAULT_RIVER_WIDTH,
    DEFAULT_ROAD_COLOR,
    DEFAULT_ROAD_WIDTH,
    MAX_ZOOM,
    MIN_ZOOM,
} from '../constants';

/**
 * Extracts the JSON string from a .hexcartographer.md file.
 * If the content contains a ```json block, returns the inner content.
 * Otherwise returns the content unchanged (legacy plain-JSON files).
 */
export function extractJsonFromMarkdown(content: string): string {
    if (content.includes('```json')) {
        const match = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) return match[1];
    }
    return content;
}

/**
 * Parses a JSON string into a MapData object, running all schema migrations
 * and coordinate sanitization needed to support legacy file formats.
 */
export function parseMapData(jsonContent: string): MapData {
    const data = JSON.parse(jsonContent) as any;

    // Validate and repair gridSize
    if (!data.gridSize || data.gridSize < 1 || data.gridSize > 1000 || !isFinite(data.gridSize)) {
        console.warn('Invalid gridSize detected:', data.gridSize, '- resetting to', DEFAULT_GRID_SIZE);
        data.gridSize = DEFAULT_GRID_SIZE;
    }

    // Validate and repair zoom
    if (!data.zoom || data.zoom < MIN_ZOOM || data.zoom > MAX_ZOOM || !isFinite(data.zoom)) {
        console.warn('Invalid zoom detected:', data.zoom, '- resetting to 1');
        data.zoom = 1;
    }

    // Migration: old hexes array format [{q,r,backgroundColor?,color?,...}] -> record format
    if (Array.isArray(data.hexes)) {
        const migratedHexes: Record<string, any> = {};
        data.hexes.forEach((h: any) => {
            const key = `${h.q}_${h.r}`;
            migratedHexes[key] = {
                q: h.q,
                r: h.r,
                color: h.backgroundColor || h.color,
                symbol: h.symbol,
                symbolColor: h.symbolColor,
            };
        });
        data.hexes = migratedHexes;
    } else {
        // Migration: backgroundColor -> color
        Object.values(data.hexes).forEach((h: any) => {
            if (h.backgroundColor) {
                h.color = h.backgroundColor;
                delete h.backgroundColor;
            }
        });
    }

    // Ensure collections exist
    if (!data.borders) data.borders = [];
    if (!data.rivers) data.rivers = [];
    if (!data.roads) data.roads = [];

    // Migration: old flat border array [{q,r}] -> region format [{id, color, hexes}]
    if (data.borders.length > 0 && data.borders[0].q !== undefined) {
        data.borders = [{ id: 1, color: DEFAULT_BORDER_COLOR, hexes: data.borders }];
    }

    // Migration: old river segment format [{from, to, width}] -> waypoint format
    if (data.rivers.length > 0 && data.rivers[0].from !== undefined) {
        const waypoints: Array<{ q: number; r: number }> = [];
        data.rivers.forEach((seg: any) => {
            if (
                waypoints.length === 0 ||
                waypoints[waypoints.length - 1].q !== seg.from.q ||
                waypoints[waypoints.length - 1].r !== seg.from.r
            ) {
                waypoints.push({ q: seg.from.q, r: seg.from.r });
            }
            waypoints.push({ q: seg.to.q, r: seg.to.r });
        });
        data.rivers = waypoints.length > 0
            ? [{ id: 1, color: DEFAULT_RIVER_COLOR, width: DEFAULT_RIVER_WIDTH, waypoints }]
            : [];
    }

    // Migration: old road segment format [{from, to, width}] -> waypoint format
    if (data.roads.length > 0 && data.roads[0].from !== undefined) {
        const waypoints: Array<{ q: number; r: number }> = [];
        data.roads.forEach((seg: any) => {
            if (
                waypoints.length === 0 ||
                waypoints[waypoints.length - 1].q !== seg.from.q ||
                waypoints[waypoints.length - 1].r !== seg.from.r
            ) {
                waypoints.push({ q: seg.from.q, r: seg.from.r });
            }
            waypoints.push({ q: seg.to.q, r: seg.to.r });
        });
        data.roads = waypoints.length > 0
            ? [{ id: 1, color: DEFAULT_ROAD_COLOR, width: DEFAULT_ROAD_WIDTH, waypoints }]
            : [];
    }

    _sanitize(data);

    return data as MapData;
}

const VIEWPORT_KEYS = ['offX', 'offY', 'zoom', 'viewportSaved'] as const;

function _sanitize(data: any): void {
    // Compute bounding box from valid hex data for plausibility checks
    let minQ = Infinity, maxQ = -Infinity, minR = Infinity, maxR = -Infinity;
    if (data.hexes) {
        for (const h of Object.values(data.hexes) as any[]) {
            if (isFinite(h.q) && isFinite(h.r)) {
                if (h.q < minQ) minQ = h.q;
                if (h.q > maxQ) maxQ = h.q;
                if (h.r < minR) minR = h.r;
                if (h.r > maxR) maxR = h.r;
            }
        }
    }
    const hasBounds = isFinite(minQ);
    const margin = 50;
    const boundsMinQ = hasBounds ? minQ - margin : -9999;
    const boundsMaxQ = hasBounds ? maxQ + margin : 9999;
    const boundsMinR = hasBounds ? minR - margin : -9999;
    const boundsMaxR = hasBounds ? maxR + margin : 9999;

    // Remove hexes with non-finite coordinates
    if (data.hexes) {
        for (const key of Object.keys(data.hexes)) {
            const h = data.hexes[key];
            if (!isFinite(h.q) || !isFinite(h.r)) {
                console.warn('Removed corrupted hex:', key, h);
                delete data.hexes[key];
            }
        }
    }

    // Sanitize border regions
    if (data.borders) {
        for (const region of data.borders) {
            if (region.hexes) {
                region.hexes = region.hexes.filter((h: any) => {
                    if (!isFinite(h.q) || !isFinite(h.r)) {
                        console.warn('Removed corrupted border hex (non-finite):', h);
                        return false;
                    }
                    const rq = Math.round(h.q);
                    const rr = Math.round(h.r);
                    if (rq < boundsMinQ || rq > boundsMaxQ || rr < boundsMinR || rr > boundsMaxR) {
                        console.warn('Removed border hex outside map bounds:', h, { boundsMinQ, boundsMaxQ, boundsMinR, boundsMaxR });
                        return false;
                    }
                    return true;
                });
                for (const h of region.hexes) {
                    if (!Number.isInteger(h.q)) { console.warn('Rounded border hex q:', h.q); h.q = Math.round(h.q); }
                    if (!Number.isInteger(h.r)) { console.warn('Rounded border hex r:', h.r); h.r = Math.round(h.r); }
                    for (const key of VIEWPORT_KEYS) {
                        if (key in h) { console.warn('Stripped', key, 'from border hex:', h); delete h[key]; }
                    }
                }
            }
        }
    }

    // Sanitize path waypoints (rivers and roads)
    for (const pathArr of [data.rivers, data.roads]) {
        if (pathArr) {
            for (const path of pathArr) {
                if (path.waypoints) {
                    path.waypoints = path.waypoints.filter((w: any) => {
                        if (w.break) return true;
                        if (!isFinite(w.q) || !isFinite(w.r)) {
                            console.warn('Removed corrupted waypoint (non-finite):', w);
                            return false;
                        }
                        const rq = Math.round(w.q);
                        const rr = Math.round(w.r);
                        if (rq < boundsMinQ || rq > boundsMaxQ || rr < boundsMinR || rr > boundsMaxR) {
                            console.warn('Removed waypoint outside map bounds:', w);
                            return false;
                        }
                        return true;
                    });
                    for (const w of path.waypoints) {
                        if (!Number.isInteger(w.q)) w.q = Math.round(w.q);
                        if (!Number.isInteger(w.r)) w.r = Math.round(w.r);
                    }
                }
            }
        }
    }

    // Strip viewport keys from text labels
    if (data.texts) {
        for (const label of data.texts) {
            for (const key of VIEWPORT_KEYS) {
                if (key in label) { console.warn('Stripped', key, 'from text:', label.text); delete label[key]; }
            }
        }
    }
}

/**
 * Serializes a MapData object to the full content of a .hexcartographer.md file,
 * including YAML frontmatter, markdown title, and a JSON code block.
 */
export function serializeMapToFileContent(data: MapData, title: string): string {
    const now = new Date().toISOString().split('T')[0];
    const frontmatter = `---\ntype: hexcartographer\ncreated: ${now}\n---\n\n`;
    const jsonData = JSON.stringify(data, null, 2);
    return `${frontmatter}# ${title}\n\n\`\`\`json\n${jsonData}\n\`\`\`\n`;
}

/**
 * Returns the default MapData used when creating a new map file.
 */
export function createInitialMapData(): MapData {
    return {
        hexes: {},
        rivers: [],
        roads: [],
        texts: [],
        borders: [],
        gridSize: DEFAULT_GRID_SIZE,
        zoom: 1,
        offX: DEFAULT_OFF_X,
        offY: DEFAULT_OFF_Y,
        settings: {
            colorPalette: [...DEFAULT_PALETTE],
            colorPalette2: [...DEFAULT_PALETTE2],
            activeColorSlot: 0,
            drawMode: 'pen',
            currentToolGroup: 'hexcolor',
            patternData: null,
            patternSourceHex: null,
        } as any,
    };
}
