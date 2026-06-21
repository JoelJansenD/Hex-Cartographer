import { App, TFile, TFolder } from 'obsidian';
import {
    DEFAULT_BORDER_COLOR,
    DEFAULT_BORDER_DASHES,
    DEFAULT_GRID_SIZE,
    DEFAULT_MASTER_COLOR,
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
import { MapDocumentData } from '../types-legacy';

const JSON_FENCE_REGEX = /```json\s*([\s\S]*?)\s*```/;
const VIEWPORT_KEYS = ['offX', 'offY', 'zoom', 'viewportSaved'] as const;

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

export function buildNewMapFileName(now: Date = new Date()): string {
    return `HexMap_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${pad(now.getDate())}${pad(now.getMonth() + 1)}${String(now.getFullYear()).slice(-2)}.hexcartographer.md`;
}

export function createDefaultMapDocumentData(): MapDocumentData {
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
        centerWorldX: 0,
        centerWorldY: 0,
        settings: {
            drawMode: 'pen',
            currentToolGroup: 'hexcolor',
            borderSettings: { visible: true, dashes: DEFAULT_BORDER_DASHES },
            riverSettings: { width: DEFAULT_RIVER_WIDTH, editMode: false },
            roadSettings: { width: DEFAULT_ROAD_WIDTH, editMode: false },
            masterColor: DEFAULT_MASTER_COLOR,
            colorPalette: [...DEFAULT_PALETTE],
            colorPalette2: [...DEFAULT_PALETTE2],
            activeColorSlot: 0,
        },
    };
}

export function buildMapDocumentContent(data: MapDocumentData, title: string, createdDate: Date = new Date()): string {
    const now = createdDate.toISOString().split('T')[0];
    const frontmatter = `---\ntype: hexcartographer\ncreated: ${now}\n---\n\n`;
    const jsonData = JSON.stringify(data, null, 2);
    return `${frontmatter}# ${title}\n\n\`\`\`json\n${jsonData}\n\`\`\`\n`;
}

function extractJsonPayload(content: string): string {
    if (!content.includes('```json')) {
        return content;
    }

    const jsonMatch = content.match(JSON_FENCE_REGEX);
    return jsonMatch ? jsonMatch[1]! : content;
}

export async function createNewMapFile(
    app: App,
    targetFile: TFolder | null,
    initialData: MapDocumentData,
    now: Date = new Date(),
): Promise<TFile> {
    const fileName = buildNewMapFileName(now);

    let folderPath = '';
    if (targetFile) {
        if ((targetFile as any).children) {
            folderPath = targetFile.path;
        } else if ((targetFile as any).parent) {
            folderPath = (targetFile as any).parent.path;
        }
    }

    const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
    const title = fileName.replace('.hexcartographer.md', '');
    const content = buildMapDocumentContent(initialData, title, now);
    return app.vault.create(filePath, content);
}

export function normalizeLoadedMapData(content: string): MapDocumentData {
    const jsonContent = extractJsonPayload(content);
    const newData = JSON.parse(jsonContent) as any;

    // Critical guardrail for corrupted legacy values.
    if (!newData.gridSize || newData.gridSize < 1 || newData.gridSize > 1000 || !isFinite(newData.gridSize)) {
        console.warn('Invalid gridSize detected:', newData.gridSize, '- resetting to 30');
        newData.gridSize = 30;
    }

    if (!newData.zoom || newData.zoom < MIN_ZOOM || newData.zoom > MAX_ZOOM || !isFinite(newData.zoom)) {
        console.warn('Invalid zoom detected:', newData.zoom, '- resetting to 1');
        newData.zoom = 1;
    }

    // Migration: old hex list format [{q, r, ...}] -> keyed object format {"q_r": {...}}.
    // Migration: when both exist, backgroundColor wins over color.
    if (Array.isArray(newData.hexes)) {
        const migratedHexes: Record<string, any> = {};
        newData.hexes.forEach((h: any) => {
            const key = `${h.q}_${h.r}`;
            migratedHexes[key] = {
                q: h.q,
                r: h.r,
                color: h.backgroundColor || h.color,
                symbol: h.symbol,
                symbolColor: h.symbolColor,
            };
        });
        newData.hexes = migratedHexes;
    } else {
        // Migration: legacy backgroundColor field -> color.
        Object.values(newData.hexes || {}).forEach((h: any) => {
            if (h.backgroundColor) {
                h.color = h.backgroundColor;
                delete h.backgroundColor;
            }
        });
    }

    if (!newData.borders) {
        newData.borders = [];
    }
    // Migration: old flat border format [{q, r}] -> region format [{id, color, hexes}].
    if (newData.borders.length > 0 && newData.borders[0].q !== undefined) {
        newData.borders = [{ id: 1, color: DEFAULT_BORDER_COLOR, hexes: newData.borders }];
    }

    if (!newData.rivers) {
        newData.rivers = [];
    }
    // Migration: old river segment format [{from, to, width}] -> waypoint path format.
    if (newData.rivers.length > 0 && newData.rivers[0].from !== undefined) {
        const waypoints: any[] = [];
        newData.rivers.forEach((seg: any) => {
            if (
                waypoints.length === 0 ||
                waypoints[waypoints.length - 1].q !== seg.from.q ||
                waypoints[waypoints.length - 1].r !== seg.from.r
            ) {
                waypoints.push({ q: seg.from.q, r: seg.from.r });
            }
            waypoints.push({ q: seg.to.q, r: seg.to.r });
        });
        newData.rivers =
            waypoints.length > 0
                ? [{ id: 1, color: DEFAULT_RIVER_COLOR, width: DEFAULT_RIVER_WIDTH, waypoints }]
                : [];
    }

    if (!newData.roads) {
        newData.roads = [];
    }
    // Migration: old road segment format [{from, to, width}] -> waypoint path format.
    if (newData.roads.length > 0 && newData.roads[0].from !== undefined) {
        const waypoints: any[] = [];
        newData.roads.forEach((seg: any) => {
            if (
                waypoints.length === 0 ||
                waypoints[waypoints.length - 1].q !== seg.from.q ||
                waypoints[waypoints.length - 1].r !== seg.from.r
            ) {
                waypoints.push({ q: seg.from.q, r: seg.from.r });
            }
            waypoints.push({ q: seg.to.q, r: seg.to.r });
        });
        newData.roads =
            waypoints.length > 0
                ? [{ id: 1, color: DEFAULT_ROAD_COLOR, width: DEFAULT_ROAD_WIDTH, waypoints }]
                : [];
    }

    let minQ = Infinity;
    let maxQ = -Infinity;
    let minR = Infinity;
    let maxR = -Infinity;

    if (newData.hexes) {
        for (const key of Object.keys(newData.hexes)) {
            const h = newData.hexes[key];
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

    // Sanitize: remove invalid hex coordinates.
    if (newData.hexes) {
        for (const key of Object.keys(newData.hexes)) {
            const h = newData.hexes[key];
            if (!isFinite(h.q) || !isFinite(h.r)) {
                console.warn('Removed corrupted hex:', key, h);
                delete newData.hexes[key];
            }
        }
    }

    // Sanitize: keep border hexes finite and near known map bounds.
    if (newData.borders) {
        for (const region of newData.borders) {
            if (region.hexes) {
                region.hexes = region.hexes.filter((h: any) => {
                    if (!isFinite(h.q) || !isFinite(h.r)) {
                        console.warn('Removed corrupted border hex (non-finite):', h);
                        return false;
                    }
                    const rq = Math.round(h.q);
                    const rr = Math.round(h.r);
                    if (rq < boundsMinQ || rq > boundsMaxQ || rr < boundsMinR || rr > boundsMaxR) {
                        console.warn('Removed border hex outside map bounds:', h, {
                            boundsMinQ,
                            boundsMaxQ,
                            boundsMinR,
                            boundsMaxR,
                        });
                        return false;
                    }
                    return true;
                });

                for (const h of region.hexes) {
                    if (!Number.isInteger(h.q)) {
                        console.warn('Rounded border hex q:', h.q);
                        h.q = Math.round(h.q);
                    }
                    if (!Number.isInteger(h.r)) {
                        console.warn('Rounded border hex r:', h.r);
                        h.r = Math.round(h.r);
                    }
                    for (const key of VIEWPORT_KEYS) {
                        if (key in h) {
                            console.warn('Stripped', key, 'from border hex:', h);
                            delete h[key];
                        }
                    }
                }
            }
        }
    }

    // Sanitize: keep river/road waypoints finite and near known map bounds.
    for (const pathArr of [newData.rivers, newData.roads]) {
        if (!pathArr) {
            continue;
        }

        for (const path of pathArr) {
            if (!path.waypoints) {
                continue;
            }

            path.waypoints = path.waypoints.filter((w: any) => {
                if (w.break) {
                    return true;
                }

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
                if (!Number.isInteger(w.q)) {
                    w.q = Math.round(w.q);
                }
                if (!Number.isInteger(w.r)) {
                    w.r = Math.round(w.r);
                }
            }
        }
    }

    // Sanitize: strip viewport state accidentally persisted in text entries.
    if (newData.texts) {
        for (const t of newData.texts) {
            for (const key of VIEWPORT_KEYS) {
                if (key in t) {
                    console.warn('Stripped', key, 'from text:', t.text);
                    delete t[key];
                }
            }
        }
    }

    return newData as MapDocumentData;
}

export class MapDocumentSaveController {
    private saveTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(private readonly delayMs: number = 1000) {}

    requestSave(doSave: () => Promise<void> | void, onBeforeSave?: () => void): void {
        this.cancelPendingSave();
        this.saveTimeout = setTimeout(async () => {
            onBeforeSave?.();
            await doSave();
            this.saveTimeout = null;
        }, this.delayMs);
    }

    async flushNow(doSave: () => Promise<void> | void, onBeforeSave?: () => void): Promise<void> {
        this.cancelPendingSave();
        onBeforeSave?.();
        await doSave();
    }

    cancelPendingSave(): void {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
    }

    get timeoutHandle(): ReturnType<typeof setTimeout> | null {
        return this.saveTimeout;
    }
}
