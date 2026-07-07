import { describe, it, expect } from 'vitest';
import {
    extractJsonFromMarkdown,
    parseMapData,
    serializeMapToFileContent,
    createInitialMapData,
} from './serialization';

// ---------------------------------------------------------------------------
// extractJsonFromMarkdown
// ---------------------------------------------------------------------------

describe('extractJsonFromMarkdown', () => {
    it('extracts JSON from a markdown code block', () => {
        const content = '---\ntype: hexcartographer\n---\n\n# Title\n\n```json\n{"hexes":{}}\n```\n';
        expect(extractJsonFromMarkdown(content)).toBe('{"hexes":{}}');
    });

    it('returns content unchanged when no code block is present', () => {
        const content = '{"hexes":{}}';
        expect(extractJsonFromMarkdown(content)).toBe('{"hexes":{}}');
    });

    it('handles multi-line JSON in code block', () => {
        const content = '```json\n{\n  "hexes": {}\n}\n```';
        expect(extractJsonFromMarkdown(content)).toBe('{\n  "hexes": {}\n}');
    });

    it('returns the first code block when multiple are present', () => {
        const content = '```json\n{"a":1}\n```\n\n```json\n{"b":2}\n```';
        expect(extractJsonFromMarkdown(content)).toBe('{"a":1}');
    });
});

// ---------------------------------------------------------------------------
// parseMapData
// ---------------------------------------------------------------------------

const minimalJson = JSON.stringify({
    hexes: {},
    rivers: [],
    roads: [],
    texts: [],
    borders: [],
    gridSize: 30,
    zoom: 1,
    offX: 400,
    offY: 300,
});

describe('parseMapData — valid data', () => {
    it('parses minimal valid JSON', () => {
        const data = parseMapData(minimalJson);
        expect(data.gridSize).toBe(30);
        expect(data.zoom).toBe(1);
        expect(data.hexes).toEqual({});
        expect(data.rivers).toEqual([]);
        expect(data.borders).toEqual([]);
    });

    it('preserves valid hex records', () => {
        const json = JSON.stringify({
            hexes: { '1_2': { q: 1, r: 2, color: '#ff0000' } },
            gridSize: 30, zoom: 1, offX: 0, offY: 0,
        });
        const data = parseMapData(json);
        expect(data.hexes['1_2'].color).toBe('#ff0000');
    });
});

describe('parseMapData — gridSize/zoom validation', () => {
    it('resets gridSize of 0 to default (30)', () => {
        const data = parseMapData(JSON.stringify({ hexes: {}, gridSize: 0, zoom: 1, offX: 0, offY: 0 }));
        expect(data.gridSize).toBe(30);
    });

    it('resets gridSize above 1000 to default', () => {
        const data = parseMapData(JSON.stringify({ hexes: {}, gridSize: 9999, zoom: 1, offX: 0, offY: 0 }));
        expect(data.gridSize).toBe(30);
    });

    it('resets zoom of 0 to 1', () => {
        const data = parseMapData(JSON.stringify({ hexes: {}, gridSize: 30, zoom: 0, offX: 0, offY: 0 }));
        expect(data.zoom).toBe(1);
    });

    it('resets zoom above MAX_ZOOM (4) to 1', () => {
        const data = parseMapData(JSON.stringify({ hexes: {}, gridSize: 30, zoom: 999, offX: 0, offY: 0 }));
        expect(data.zoom).toBe(1);
    });

    it('resets zoom below MIN_ZOOM (0.01) to 1', () => {
        const data = parseMapData(JSON.stringify({ hexes: {}, gridSize: 30, zoom: 0.001, offX: 0, offY: 0 }));
        expect(data.zoom).toBe(1);
    });
});

describe('parseMapData — hex migrations', () => {
    it('migrates old hex array format [{q,r,color}] to record format', () => {
        const json = JSON.stringify({
            hexes: [{ q: 1, r: 2, color: '#ff0000' }],
            gridSize: 30, zoom: 1, offX: 0, offY: 0,
        });
        const data = parseMapData(json);
        expect(data.hexes['1_2']).toBeDefined();
        expect(data.hexes['1_2'].color).toBe('#ff0000');
        expect(Array.isArray(data.hexes)).toBe(false);
    });

    it('migrates backgroundColor to color in array format (backgroundColor wins)', () => {
        const json = JSON.stringify({
            hexes: [{ q: 0, r: 0, color: '#111111', backgroundColor: '#00ff00' }],
            gridSize: 30, zoom: 1, offX: 0, offY: 0,
        });
        const data = parseMapData(json);
        expect(data.hexes['0_0'].color).toBe('#00ff00');
    });

    it('migrates backgroundColor to color in record format', () => {
        const json = JSON.stringify({
            hexes: { '1_2': { q: 1, r: 2, backgroundColor: '#0000ff' } },
            gridSize: 30, zoom: 1, offX: 0, offY: 0,
        });
        const data = parseMapData(json);
        expect(data.hexes['1_2'].color).toBe('#0000ff');
        expect((data.hexes['1_2'] as any).backgroundColor).toBeUndefined();
    });
});

describe('parseMapData — collection defaults', () => {
    it('defaults missing borders to empty array', () => {
        const data = parseMapData(JSON.stringify({ hexes: {}, gridSize: 30, zoom: 1, offX: 0, offY: 0 }));
        expect(data.borders).toEqual([]);
    });

    it('defaults missing rivers to empty array', () => {
        const data = parseMapData(JSON.stringify({ hexes: {}, gridSize: 30, zoom: 1, offX: 0, offY: 0 }));
        expect(data.rivers).toEqual([]);
    });

    it('defaults missing roads to empty array', () => {
        const data = parseMapData(JSON.stringify({ hexes: {}, gridSize: 30, zoom: 1, offX: 0, offY: 0 }));
        expect(data.roads).toEqual([]);
    });
});

describe('parseMapData — border migration', () => {
    it('migrates old flat border array [{q,r}] to region format', () => {
        const json = JSON.stringify({
            hexes: {},
            borders: [{ q: 0, r: 0 }, { q: 1, r: 0 }],
            gridSize: 30, zoom: 1, offX: 0, offY: 0,
        });
        const data = parseMapData(json);
        expect(data.borders).toHaveLength(1);
        expect(data.borders[0].id).toBe(1);
        expect(data.borders[0].color).toBe('#FF0000');
        expect(data.borders[0].hexes).toHaveLength(2);
    });

    it('leaves already-migrated border regions unchanged', () => {
        const json = JSON.stringify({
            hexes: {},
            borders: [{ id: 2, color: '#0000ff', hexes: [{ q: 0, r: 0 }] }],
            gridSize: 30, zoom: 1, offX: 0, offY: 0,
        });
        const data = parseMapData(json);
        expect(data.borders[0].id).toBe(2);
        expect(data.borders[0].color).toBe('#0000ff');
    });
});

describe('parseMapData — river migration', () => {
    it('migrates old segment format [{from,to,width}] to waypoint format', () => {
        const json = JSON.stringify({
            hexes: {},
            rivers: [
                { from: { q: 0, r: 0 }, to: { q: 1, r: 0 }, width: 3 },
                { from: { q: 1, r: 0 }, to: { q: 2, r: 0 }, width: 3 },
            ],
            gridSize: 30, zoom: 1, offX: 0, offY: 0,
        });
        const data = parseMapData(json);
        expect(data.rivers).toHaveLength(1);
        expect(data.rivers[0].id).toBe(1);
        expect(data.rivers[0].waypoints).toHaveLength(3);
        expect(data.rivers[0].waypoints[0]).toEqual({ q: 0, r: 0 });
        expect(data.rivers[0].waypoints[2]).toEqual({ q: 2, r: 0 });
    });

    it('deduplicates shared segment endpoints', () => {
        const json = JSON.stringify({
            hexes: {},
            rivers: [
                { from: { q: 0, r: 0 }, to: { q: 1, r: 0 }, width: 3 },
                { from: { q: 1, r: 0 }, to: { q: 2, r: 0 }, width: 3 },
            ],
            gridSize: 30, zoom: 1, offX: 0, offY: 0,
        });
        const data = parseMapData(json);
        // 2 segments sharing {1,0}: result should be 3 waypoints, not 4
        expect(data.rivers[0].waypoints).toHaveLength(3);
    });
});

describe('parseMapData — road migration', () => {
    it('migrates old road segment format to waypoint format', () => {
        const json = JSON.stringify({
            hexes: {},
            roads: [{ from: { q: 0, r: 0 }, to: { q: 0, r: 1 }, width: 2 }],
            gridSize: 30, zoom: 1, offX: 0, offY: 0,
        });
        const data = parseMapData(json);
        expect(data.roads).toHaveLength(1);
        expect(data.roads[0].waypoints).toHaveLength(2);
        expect(data.roads[0].waypoints[0]).toEqual({ q: 0, r: 0 });
        expect(data.roads[0].waypoints[1]).toEqual({ q: 0, r: 1 });
    });
});

describe('parseMapData — sanitization', () => {
    it('removes hexes with missing coordinates', () => {
        // JSON without r property → h.r = undefined → isFinite(undefined) = false
        const json = '{"hexes":{"good":{"q":1,"r":2,"color":"#ff0000"},"bad":{"q":1}},"gridSize":30,"zoom":1,"offX":0,"offY":0}';
        const data = parseMapData(json);
        expect(data.hexes['good']).toBeDefined();
        expect(data.hexes['bad']).toBeUndefined();
    });

    it('removes border hexes outside map bounds', () => {
        const json = JSON.stringify({
            hexes: { '0_0': { q: 0, r: 0, color: '#fff' } },
            borders: [{ id: 1, color: '#f00', hexes: [
                { q: 0, r: 0 },           // within bounds (margin = 50)
                { q: 9999, r: 9999 },     // far outside bounds
            ] }],
            gridSize: 30, zoom: 1, offX: 0, offY: 0,
        });
        const data = parseMapData(json);
        expect(data.borders[0].hexes).toHaveLength(1);
        expect(data.borders[0].hexes[0]).toEqual({ q: 0, r: 0 });
    });

    it('rounds fractional border hex coordinates to integers', () => {
        const json = JSON.stringify({
            hexes: { '0_0': { q: 0, r: 0, color: '#fff' } },
            borders: [{ id: 1, color: '#f00', hexes: [{ q: 0.4, r: 1.7 }] }],
            gridSize: 30, zoom: 1, offX: 0, offY: 0,
        });
        const data = parseMapData(json);
        expect(data.borders[0].hexes[0].q).toBe(0);
        expect(data.borders[0].hexes[0].r).toBe(2);
    });

    it('strips viewport keys from text labels', () => {
        const json = JSON.stringify({
            hexes: {},
            texts: [{ text: 'hello', x: 10, y: 20, size: 16, color: '#fff', outline: true, bold: false, shadow: false, shadowDistance: 5, shadowOpatown: 50, offX: 99 }],
            gridSize: 30, zoom: 1, offX: 0, offY: 0,
        });
        const data = parseMapData(json);
        expect((data.texts[0] as any).offX).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// serializeMapToFileContent
// ---------------------------------------------------------------------------

describe('serializeMapToFileContent', () => {
    const data = createInitialMapData();

    it('starts with YAML frontmatter', () => {
        const result = serializeMapToFileContent(data, 'My Map');
        expect(result).toMatch(/^---\n/);
        expect(result).toContain('type: hexcartographer');
    });

    it('includes a date in the frontmatter', () => {
        const result = serializeMapToFileContent(data, 'My Map');
        expect(result).toMatch(/created: \d{4}-\d{2}-\d{2}/);
    });

    it('includes the map title as a markdown heading', () => {
        const result = serializeMapToFileContent(data, 'Test Map');
        expect(result).toContain('# Test Map');
    });

    it('wraps JSON in a fenced code block', () => {
        const result = serializeMapToFileContent(data, 'Map');
        expect(result).toContain('```json\n');
        expect(result).toContain('\n```\n');
    });

    it('embeds the serialized JSON data', () => {
        const result = serializeMapToFileContent(data, 'Map');
        expect(result).toContain('"gridSize": 30');
    });

    it('round-trips through extractJsonFromMarkdown + JSON.parse', () => {
        const result = serializeMapToFileContent(data, 'Map');
        const extracted = extractJsonFromMarkdown(result);
        const parsed = JSON.parse(extracted);
        expect(parsed.gridSize).toBe(data.gridSize);
        expect(parsed.zoom).toBe(data.zoom);
    });
});

// ---------------------------------------------------------------------------
// createInitialMapData
// ---------------------------------------------------------------------------

describe('createInitialMapData', () => {
    it('returns empty hex/path/text/border collections', () => {
        const data = createInitialMapData();
        expect(data.hexes).toEqual({});
        expect(data.rivers).toEqual([]);
        expect(data.roads).toEqual([]);
        expect(data.texts).toEqual([]);
        expect(data.borders).toEqual([]);
    });

    it('uses default gridSize (30)', () => {
        expect(createInitialMapData().gridSize).toBe(30);
    });

    it('uses zoom of 1', () => {
        expect(createInitialMapData().zoom).toBe(1);
    });

    it('includes default color palettes in settings', () => {
        const data = createInitialMapData();
        expect(data.settings?.colorPalette).toBeDefined();
        expect(data.settings?.colorPalette?.length).toBeGreaterThan(0);
        expect(data.settings?.colorPalette2).toBeDefined();
    });

    it('returns independent palette array copies each call', () => {
        const a = createInitialMapData();
        const b = createInitialMapData();
        expect(a.settings?.colorPalette).not.toBe(b.settings?.colorPalette);
    });
});
