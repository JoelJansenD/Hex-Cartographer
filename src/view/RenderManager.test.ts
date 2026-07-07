import { describe, it, expect } from 'vitest';
import { RenderManager } from './RenderManager';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSettings(overrides: Record<string, any> = {}) {
    return {
        hexNumberingDirection: 'horizontal',
        hexNumberingAlpha: false,
        hexNumberingAlphaChess: false,
        hexNumberingEnabled: false,
        hexNumberingPosition: 'top',
        hexNumberingFontSize: 10,
        hexNumberingColor: '#ffffff',
        hexNumberingOutline: false,
        hideHexBorders: false,
        showCrosshair: false,
        ...overrides,
    };
}

function makeView(overrides: Record<string, any> = {}) {
    return {
        data: {
            hexes: {} as Record<string, any>,
            texts: [] as any[],
            borders: [] as any[],
            rivers: [] as any[],
            roads: [] as any[],
            gridSize: 40,
            zoom: 1,
            offX: 0,
            offY: 0,
        },
        hexOrientation: false, // pointy-top
        plugin: { settings: makeSettings() },
        svgSymbols: {} as Record<string, any>,
        svgSymbolConfig: {} as Record<string, any>,
        borderSettings: { visible: true, pickedHex: null, activeRegionId: null },
        borderHighlightWidth: 4,
        riverSettings: { editMode: false, activeRiverId: null, insertAfter: null },
        roadSettings: { editMode: false, activeRoadId: null, insertAfter: null },
        patternSourceHex: null,
        currentToolGroup: null,
        ctx: null as any,
        canvas: null as any,
        textCtx: null as any,
        textCanvas: null as any,
        svgLayer: null as any,
        pathEndInset: 0.5,
        ...overrides,
    } as any;
}

// Convenience: build a RenderManager and expose its private overlapMap via cast.
function makeRM(viewOverrides: Record<string, any> = {}) {
    const view = makeView(viewOverrides);
    const rm = new RenderManager(view);
    return { rm, view };
}

// ---------------------------------------------------------------------------
// _segKey
// ---------------------------------------------------------------------------

describe('RenderManager._segKey()', () => {
    it('puts the hex with smaller q first', () => {
        const { rm } = makeRM();
        const key = rm._segKey({ q: 2, r: 0 }, { q: 0, r: 0 });
        expect(key).toBe('0,0|2,0');
    });

    it('breaks q ties by r, smaller r first', () => {
        const { rm } = makeRM();
        const key = rm._segKey({ q: 1, r: 3 }, { q: 1, r: 1 });
        expect(key).toBe('1,1|1,3');
    });

    it('produces the same key regardless of argument order', () => {
        const { rm } = makeRM();
        const a = { q: 0, r: 0 };
        const b = { q: 1, r: 0 };
        expect(rm._segKey(a, b)).toBe(rm._segKey(b, a));
    });
});

// ---------------------------------------------------------------------------
// buildOverlapMap
// ---------------------------------------------------------------------------

describe('RenderManager.buildOverlapMap()', () => {
    it('produces an empty map when there are no rivers or roads', () => {
        const { rm } = makeRM();
        rm.buildOverlapMap();
        expect(Object.keys((rm as any).overlapMap)).toHaveLength(0);
    });

    it('marks a segment as hasRiver for a single river', () => {
        const { rm, view } = makeRM();
        view.data.rivers = [
            { waypoints: [{ q: 0, r: 0 }, { q: 1, r: 0 }], width: 3 },
        ];
        rm.buildOverlapMap();
        const map = (rm as any).overlapMap;
        const key = '0,0|1,0';
        expect(map[key]).toBeDefined();
        expect(map[key].hasRiver).toBe(true);
        expect(map[key].hasRoad).toBe(false);
        expect(map[key].maxRiverWidth).toBe(3);
    });

    it('marks a segment as hasRoad for a single road', () => {
        const { rm, view } = makeRM();
        view.data.roads = [
            { waypoints: [{ q: 0, r: 0 }, { q: 0, r: 1 }], width: 2 },
        ];
        rm.buildOverlapMap();
        const map = (rm as any).overlapMap;
        // _segKey({q:0,r:0},{q:0,r:1}) → "0,0|0,1" (r=0 < r=1)
        const key = '0,0|0,1';
        expect(map[key]).toBeDefined();
        expect(map[key].hasRoad).toBe(true);
        expect(map[key].hasRiver).toBe(false);
        expect(map[key].maxRoadWidth).toBe(2);
    });

    it('marks both flags when a river and road share the same segment', () => {
        const { rm, view } = makeRM();
        view.data.rivers = [{ waypoints: [{ q: 0, r: 0 }, { q: 1, r: 0 }], width: 4 }];
        view.data.roads  = [{ waypoints: [{ q: 0, r: 0 }, { q: 1, r: 0 }], width: 2 }];
        rm.buildOverlapMap();
        const map = (rm as any).overlapMap;
        const key = '0,0|1,0';
        expect(map[key].hasRiver).toBe(true);
        expect(map[key].hasRoad).toBe(true);
        expect(map[key].maxRiverWidth).toBe(4);
        expect(map[key].maxRoadWidth).toBe(2);
    });

    it('tracks the maximum width across multiple paths on the same segment', () => {
        const { rm, view } = makeRM();
        view.data.rivers = [
            { waypoints: [{ q: 0, r: 0 }, { q: 1, r: 0 }], width: 2 },
            { waypoints: [{ q: 0, r: 0 }, { q: 1, r: 0 }], width: 5 },
        ];
        rm.buildOverlapMap();
        const map = (rm as any).overlapMap;
        expect(map['0,0|1,0'].maxRiverWidth).toBe(5);
    });

    it('ignores waypoints with break flags', () => {
        const { rm, view } = makeRM();
        // A path with a break at the second waypoint starts a new chain,
        // so the single-element chain [A] is too short and produces no segments.
        view.data.rivers = [
            { waypoints: [{ q: 0, r: 0 }, { q: 1, r: 0, break: true }], width: 3 },
        ];
        rm.buildOverlapMap();
        expect(Object.keys((rm as any).overlapMap)).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// getMapWorldSize
// ---------------------------------------------------------------------------

describe('RenderManager.getMapWorldSize()', () => {
    it('returns null for an empty map', () => {
        const { rm } = makeRM();
        expect(rm.getMapWorldSize()).toBeNull();
    });

    it('returns null when only empty border regions are present', () => {
        const { rm, view } = makeRM();
        view.data.borders = [{ id: 'r1', hexes: [], color: '#ff0000' }];
        expect(rm.getMapWorldSize()).toBeNull();
    });

    it('returns a positive size for a single hex', () => {
        const { rm, view } = makeRM();
        view.data.hexes['0_0'] = { q: 0, r: 0, color: '#aabbcc' };
        const size = rm.getMapWorldSize();
        expect(size).not.toBeNull();
        expect(size!.w).toBeGreaterThan(0);
        expect(size!.h).toBeGreaterThan(0);
    });

    it('includes the gridSize padding on all sides', () => {
        const { rm, view } = makeRM();
        // A single hex at origin with gridSize=40, pointy-top:
        // hex half-width = 40*√3/2 ≈ 34.64, half-height = 40
        // Raw bounds w ≈ 40*√3, h = 80; padding = 40 per side (×2).
        view.data.hexes['0_0'] = { q: 0, r: 0, color: '#000' };
        const size = rm.getMapWorldSize();
        const expected_w = 40 * Math.sqrt(3) + 2 * 40;
        const expected_h = 80 + 2 * 40;
        expect(size!.w).toBeCloseTo(expected_w, 1);
        expect(size!.h).toBeCloseTo(expected_h, 1);
    });

    it('expands bounds for multiple hexes', () => {
        const { rm, view } = makeRM();
        view.data.hexes['0_0'] = { q: 0, r: 0 };
        view.data.hexes['2_0'] = { q: 2, r: 0 };
        const single = (() => {
            view.data.hexes = { '0_0': { q: 0, r: 0 } };
            return rm.getMapWorldSize()!.w;
        })();
        view.data.hexes = { '0_0': { q: 0, r: 0 }, '2_0': { q: 2, r: 0 } };
        const multi = rm.getMapWorldSize()!.w;
        expect(multi).toBeGreaterThan(single);
    });

    it('includes border-only hexes (hexes present in a border region but not in data.hexes)', () => {
        const { rm, view } = makeRM();
        // No data hexes — only a border region containing a hex.
        view.data.borders = [{ id: 'r1', hexes: [{ q: 0, r: 0 }], color: '#f00' }];
        const size = rm.getMapWorldSize();
        expect(size).not.toBeNull();
        expect(size!.w).toBeGreaterThan(0);
    });

    it('expands bounds to include text labels', () => {
        const { rm, view } = makeRM();
        // A text far to the right of any hex.
        view.data.texts = [{ text: 'Hello', x: 500, y: 500, size: 16 }];
        const size = rm.getMapWorldSize();
        expect(size).not.toBeNull();
        // The text is at x=500, half-width ≈ 5*16*0.6=48, so maxX≥452.
        // With no hexes the width must at least cover the text span.
        expect(size!.w).toBeGreaterThan(90);
    });

    it('uses flat-top orientation when hexOrientation is true', () => {
        const { rm, view } = makeRM({ hexOrientation: true });
        view.data.hexes['0_0'] = { q: 0, r: 0 };
        const size = rm.getMapWorldSize();
        expect(size).not.toBeNull();
        // Flat-top single hex at origin: corners at 0°,60°,…
        // half-width = 40, half-height = 40*√3/2 ≈ 34.64
        const expected_w = 2 * 40 + 2 * 40;          // 160
        const expected_h = 40 * Math.sqrt(3) + 2 * 40;
        expect(size!.w).toBeCloseTo(expected_w, 1);
        expect(size!.h).toBeCloseTo(expected_h, 1);
    });
});

// ---------------------------------------------------------------------------
// _buildHexNumberLabels
// ---------------------------------------------------------------------------

describe('RenderManager._buildHexNumberLabels()', () => {
    it('returns an empty array when there are no hexes', () => {
        const { rm } = makeRM();
        expect(rm._buildHexNumberLabels()).toHaveLength(0);
    });

    it('returns a single label "1" for a single hex', () => {
        const { rm, view } = makeRM();
        view.data.hexes['0_0'] = { q: 0, r: 0 };
        const labels = rm._buildHexNumberLabels();
        expect(labels).toHaveLength(1);
        expect(labels[0].label).toBe('1');
    });

    // --- Sequential horizontal (default) ---

    it('sequential horizontal: numbers hexes left-to-right within each row', () => {
        const { rm, view } = makeRM();
        // Two hexes in the same row (same py in pointy-top): (0,0) and (1,0)
        view.data.hexes['0_0'] = { q: 0, r: 0 };
        view.data.hexes['1_0'] = { q: 1, r: 0 };
        const labels = rm._buildHexNumberLabels();
        const byHex = Object.fromEntries(
            labels.map(l => [`${(l.hex as any).q}_${(l.hex as any).r}`, l.label])
        );
        // (0,0) is left of (1,0) → "1" before "2"
        expect(byHex['0_0']).toBe('1');
        expect(byHex['1_0']).toBe('2');
    });

    it('sequential horizontal: second row gets higher numbers than first row', () => {
        const { rm, view } = makeRM();
        // (0,0) is row 0; (0,1) is in a lower row (larger py)
        view.data.hexes['0_0'] = { q: 0, r: 0 };
        view.data.hexes['0_1'] = { q: 0, r: 1 };
        const labels = rm._buildHexNumberLabels();
        const byHex = Object.fromEntries(
            labels.map(l => [`${(l.hex as any).q}_${(l.hex as any).r}`, l.label])
        );
        expect(byHex['0_0']).toBe('1');
        expect(byHex['0_1']).toBe('2');
    });

    // --- Sequential vertical ---

    it('sequential vertical: numbers hexes top-to-bottom within each column', () => {
        const { rm, view } = makeRM();
        view.plugin.settings = makeSettings({ hexNumberingDirection: 'vertical' });
        // (0,0) and (0,1) share the same column (px close), (0,1) is below
        view.data.hexes['0_0'] = { q: 0, r: 0 };
        view.data.hexes['0_1'] = { q: 0, r: 1 };
        view.data.hexes['1_0'] = { q: 1, r: 0 };
        const labels = rm._buildHexNumberLabels();
        const byHex = Object.fromEntries(
            labels.map(l => [`${(l.hex as any).q}_${(l.hex as any).r}`, l.label])
        );
        // Column 1 (px≈0): (0,0)→"1", (0,1)→"2"; Column 2 (px>0): (1,0)→"3"
        expect(Number(byHex['0_0'])).toBeLessThan(Number(byHex['0_1']));
        expect(Number(byHex['0_1'])).toBeLessThan(Number(byHex['1_0']));
    });

    // --- Coordinate mode (hexNumberingAlpha) ---

    it('alpha coordinate mode horizontal: labels are row-col pairs', () => {
        const { rm, view } = makeRM();
        view.plugin.settings = makeSettings({ hexNumberingAlpha: true });
        view.data.hexes['0_0'] = { q: 0, r: 0 };
        view.data.hexes['1_0'] = { q: 1, r: 0 };
        view.data.hexes['0_1'] = { q: 0, r: 1 };
        const labels = rm._buildHexNumberLabels();
        const byHex = Object.fromEntries(
            labels.map(l => [`${(l.hex as any).q}_${(l.hex as any).r}`, l.label])
        );
        // (0,0) and (1,0) are in row 1; (0,1) is in row 2
        expect(byHex['0_0']).toBe('1-1');
        expect(byHex['1_0']).toBe('1-2');
        expect(byHex['0_1']).toBe('2-1');
    });

    it('alpha coordinate mode vertical: labels are col-row pairs', () => {
        // Use flat-top so hexes with the same q share the same pixel column.
        const { rm, view } = makeRM({ hexOrientation: true });
        view.plugin.settings = makeSettings({ hexNumberingAlpha: true, hexNumberingDirection: 'vertical' });
        view.data.hexes['0_0'] = { q: 0, r: 0 };   // col 1, row 1
        view.data.hexes['0_1'] = { q: 0, r: 1 };   // col 1, row 2  (same px, larger py)
        view.data.hexes['1_0'] = { q: 1, r: 0 };   // col 2, row 1
        const labels = rm._buildHexNumberLabels();
        const byHex = Object.fromEntries(
            labels.map(l => [`${(l.hex as any).q}_${(l.hex as any).r}`, l.label])
        );
        expect(byHex['0_0']).toBe('1-1');
        expect(byHex['0_1']).toBe('1-2');
        expect(byHex['1_0']).toBe('2-1');
    });

    // --- Alpha-chess mode (hexNumberingAlphaChess) ---

    it('alpha-chess horizontal: labels use letters for rows and numbers for position', () => {
        const { rm, view } = makeRM();
        view.plugin.settings = makeSettings({ hexNumberingAlphaChess: true });
        view.data.hexes['0_0'] = { q: 0, r: 0 };
        view.data.hexes['1_0'] = { q: 1, r: 0 };
        view.data.hexes['0_1'] = { q: 0, r: 1 };
        const labels = rm._buildHexNumberLabels();
        const byHex = Object.fromEntries(
            labels.map(l => [`${(l.hex as any).q}_${(l.hex as any).r}`, l.label])
        );
        // Row A (first row, py≈0): (0,0)→"A-1", (1,0)→"A-2"; Row B: (0,1)→"B-1"
        expect(byHex['0_0']).toBe('A-1');
        expect(byHex['1_0']).toBe('A-2');
        expect(byHex['0_1']).toBe('B-1');
    });

    it('alpha-chess vertical: labels use letters for columns and numbers for position', () => {
        // Use flat-top so hexes with the same q share the same pixel column.
        const { rm, view } = makeRM({ hexOrientation: true });
        view.plugin.settings = makeSettings({ hexNumberingAlphaChess: true, hexNumberingDirection: 'vertical' });
        view.data.hexes['0_0'] = { q: 0, r: 0 };   // col A, pos 1
        view.data.hexes['0_1'] = { q: 0, r: 1 };   // col A, pos 2
        view.data.hexes['1_0'] = { q: 1, r: 0 };   // col B, pos 1
        const labels = rm._buildHexNumberLabels();
        const byHex = Object.fromEntries(
            labels.map(l => [`${(l.hex as any).q}_${(l.hex as any).r}`, l.label])
        );
        expect(byHex['0_0']).toBe('A-1');
        expect(byHex['0_1']).toBe('A-2');
        expect(byHex['1_0']).toBe('B-1');
    });

    it('alpha-chess: 27th letter index produces "AB"', () => {
        const { rm, view } = makeRM();
        view.plugin.settings = makeSettings({ hexNumberingAlphaChess: true });
        // Create 27 distinct rows so the 27th row gets label "AA"
        // In pointy-top, each step in r produces a distinct py.
        for (let r = 0; r < 27; r++) {
            view.data.hexes[`0_${r}`] = { q: 0, r };
        }
        const labels = rm._buildHexNumberLabels();
        // Row 0→A, row 25→Z, row 26→AA
        const row26 = labels.find(l => (l.hex as any).r === 26);
        expect(row26?.label).toBe('AA-1');
    });
});
