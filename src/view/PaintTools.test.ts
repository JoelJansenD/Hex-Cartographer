import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaintTools } from './PaintTools';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHex(q: number, r: number, overrides: Record<string, any> = {}) {
    return { q, r, ...overrides };
}

function makeToolConfig(overrides: Record<string, any> = {}) {
    return {
        name: 'Test',
        variants: [{ id: 'tree', label: 'Tree', icon: 'tree' }],
        currentVariant: 'tree',
        symbolColor: '#228B22',
        backgroundColor: '#6CC261',
        backgroundEnabled: false,
        ...overrides,
    };
}

function makeView(overrides: Record<string, any> = {}) {
    return {
        data: {
            hexes: {} as Record<string, any>,
            borders: [] as any[],
            rivers: [] as any[],
            roads: [] as any[],
            texts: [] as any[],
        },
        currentToolGroup: null as string | null,
        drawMode: 'pen',
        masterColor: '#ff0000',
        colorPalette: ['#aaaaaa', '#bbbbbb', '#cccccc'],
        colorPalette2: [] as string[],
        activeColorSlot: 0,
        patternData: null as any,
        lastErasedHex: null as any,
        toolConfigs: {} as Record<string, any>,
        borderTools: { floodEraseBorderSegment: vi.fn() },
        calculateHexPath: vi.fn(() => []),
        getTextAt: vi.fn(() => null),
        erasePathElement: vi.fn(),
        ...overrides,
    } as any;
}

// ---------------------------------------------------------------------------
// paintHex()
// ---------------------------------------------------------------------------

describe('PaintTools.paintHex()', () => {
    let view: ReturnType<typeof makeView>;
    let pt: PaintTools;

    beforeEach(() => {
        view = makeView();
        pt = new PaintTools(view);
    });

    it('creates a new hex entry when the cell is empty', () => {
        pt.paintHex({ q: 1, r: 2 });
        expect(view.data.hexes['1_2']).toBeDefined();
    });

    it('null group — sets color from the active palette slot', () => {
        view.activeColorSlot = 1;
        pt.paintHex({ q: 0, r: 0 });
        expect(view.data.hexes['0_0'].color).toBe('#bbbbbb');
    });

    it('null group — uses slot 0 by default', () => {
        pt.paintHex({ q: 0, r: 0 });
        expect(view.data.hexes['0_0'].color).toBe('#aaaaaa');
    });

    it('hexcolor group — sets masterColor', () => {
        view.currentToolGroup = 'hexcolor';
        view.masterColor = '#123456';
        pt.paintHex({ q: 0, r: 0 });
        expect(view.data.hexes['0_0'].color).toBe('#123456');
    });

    it('hexcolor does not set symbol', () => {
        view.currentToolGroup = 'hexcolor';
        pt.paintHex({ q: 0, r: 0 });
        expect(view.data.hexes['0_0'].symbol).toBeUndefined();
    });

    it('pattern group — copies pattern data to the hex', () => {
        view.currentToolGroup = 'pattern';
        view.patternData = { color: '#ff0000', symbol: 'tree', symbolColor: '#00ff00' };
        pt.paintHex({ q: 2, r: 3 });
        const h = view.data.hexes['2_3'];
        expect(h.symbol).toBe('tree');
        expect(h.symbolColor).toBe('#00ff00');
    });

    it('pattern group — uses backgroundColor when present', () => {
        view.currentToolGroup = 'pattern';
        view.patternData = { backgroundColor: '#abcdef', color: '#111111', symbol: 'tree', symbolColor: '#00ff00' };
        pt.paintHex({ q: 0, r: 0 });
        expect(view.data.hexes['0_0'].color).toBe('#abcdef');
    });

    it('pattern group without patternData falls through to null-group logic', () => {
        view.currentToolGroup = 'pattern';
        view.patternData = null;
        pt.paintHex({ q: 0, r: 0 });
        // pattern is truthy but patternData is null — falls through to bottom else
        // currentToolGroup 'pattern' is not null and not in toolConfigs → no color set
        expect(view.data.hexes['0_0']).toEqual({ q: 0, r: 0 }); // no color/symbol
    });

    it('tool group — sets symbol and symbolColor', () => {
        view.currentToolGroup = 'tree';
        view.toolConfigs = { tree: makeToolConfig() };
        view.masterColor = '#ff8800';
        pt.paintHex({ q: 1, r: 1 });
        const h = view.data.hexes['1_1'];
        expect(h.symbol).toBe('tree');
        expect(h.symbolColor).toBe('#ff8800');
    });

    it('tool group — sets background color when backgroundEnabled', () => {
        view.currentToolGroup = 'tree';
        view.toolConfigs = { tree: makeToolConfig({ backgroundEnabled: true, backgroundColor: '#336633' }) };
        pt.paintHex({ q: 0, r: 0 });
        expect(view.data.hexes['0_0'].color).toBe('#336633');
    });

    it('tool group — does not set background when backgroundEnabled is false', () => {
        view.currentToolGroup = 'tree';
        view.toolConfigs = { tree: makeToolConfig({ backgroundEnabled: false }) };
        pt.paintHex({ q: 0, r: 0 });
        expect(view.data.hexes['0_0'].color).toBeUndefined();
    });

    it('tool group — updates config.symbolColor to masterColor', () => {
        view.currentToolGroup = 'tree';
        view.toolConfigs = { tree: makeToolConfig({ symbolColor: '#000000' }) };
        view.masterColor = '#ff00ff';
        pt.paintHex({ q: 0, r: 0 });
        expect(view.toolConfigs.tree.symbolColor).toBe('#ff00ff');
    });

    it('updates an existing hex in-place', () => {
        view.data.hexes['0_0'] = makeHex(0, 0, { color: '#old' });
        view.currentToolGroup = 'hexcolor';
        view.masterColor = '#new';
        pt.paintHex({ q: 0, r: 0 });
        expect(view.data.hexes['0_0'].color).toBe('#new');
    });
});

// ---------------------------------------------------------------------------
// handleEraser()  — data-mutation side
// ---------------------------------------------------------------------------

describe('PaintTools.handleEraser() — hex mutation', () => {
    let view: ReturnType<typeof makeView>;
    let pt: PaintTools;

    beforeEach(() => {
        view = makeView();
        pt = new PaintTools(view);
    });

    it('hexcolor group — removes color; keeps hex when it has a symbol', () => {
        view.currentToolGroup = 'hexcolor';
        view.data.hexes['0_0'] = makeHex(0, 0, { color: '#aa0000', symbol: 'tree' });
        pt.handleEraser({ q: 0, r: 0 }, 0, 0);
        expect(view.data.hexes['0_0']).toBeDefined();
        expect(view.data.hexes['0_0'].color).toBeUndefined();
    });

    it('hexcolor group — deletes hex when it has no symbol after erasing color', () => {
        view.currentToolGroup = 'hexcolor';
        view.data.hexes['0_0'] = makeHex(0, 0, { color: '#aa0000' });
        pt.handleEraser({ q: 0, r: 0 }, 0, 0);
        expect(view.data.hexes['0_0']).toBeUndefined();
    });

    it('null group — deletes color from hex', () => {
        view.currentToolGroup = null;
        view.data.hexes['1_2'] = makeHex(1, 2, { color: '#abc' });
        pt.handleEraser({ q: 1, r: 2 }, 0, 0);
        expect(view.data.hexes['1_2']).toBeUndefined();
    });

    it('null group — also removes backgroundColor', () => {
        view.currentToolGroup = null;
        view.data.hexes['0_0'] = makeHex(0, 0, { backgroundColor: '#abc' });
        pt.handleEraser({ q: 0, r: 0 }, 0, 0);
        expect(view.data.hexes['0_0']).toBeUndefined();
    });

    it('null group — keeps hex when it still has a symbol', () => {
        view.currentToolGroup = null;
        view.data.hexes['0_0'] = makeHex(0, 0, { color: '#abc', symbol: 'tree' });
        pt.handleEraser({ q: 0, r: 0 }, 0, 0);
        expect(view.data.hexes['0_0']).toBeDefined();
        expect(view.data.hexes['0_0'].color).toBeUndefined();
    });

    it('pattern group — deletes hex entirely', () => {
        view.currentToolGroup = 'pattern';
        view.data.hexes['3_4'] = makeHex(3, 4, { color: '#123', symbol: 'tree' });
        pt.handleEraser({ q: 3, r: 4 }, 0, 0);
        expect(view.data.hexes['3_4']).toBeUndefined();
    });

    it('border group — removes hex from all regions', () => {
        view.currentToolGroup = 'border';
        view.data.borders = [
            { id: 1, hexes: [{ q: 0, r: 0 }, { q: 1, r: 0 }] },
            { id: 2, hexes: [{ q: 0, r: 0 }] },
        ];
        pt.handleEraser({ q: 0, r: 0 }, 0, 0);
        expect(view.data.borders[0].hexes).toEqual([{ q: 1, r: 0 }]);
        expect(view.data.borders).toHaveLength(1); // region 2 becomes empty → pruned
    });

    it('border group — removes empty regions after erasing', () => {
        view.currentToolGroup = 'border';
        view.data.borders = [{ id: 1, hexes: [{ q: 0, r: 0 }] }];
        pt.handleEraser({ q: 0, r: 0 }, 0, 0);
        expect(view.data.borders).toHaveLength(0);
    });

    it('river group — delegates to erasePathElement', () => {
        view.currentToolGroup = 'river';
        view.data.rivers = [{ id: 1, waypoints: [{ q: 0, r: 0 }] }];
        pt.handleEraser({ q: 0, r: 0 }, 0, 0);
        expect(view.erasePathElement).toHaveBeenCalledWith(view.data.rivers, { q: 0, r: 0 });
    });

    it('road group — delegates to erasePathElement', () => {
        view.currentToolGroup = 'road';
        view.data.roads = [{ id: 1, waypoints: [{ q: 2, r: 2 }] }];
        pt.handleEraser({ q: 2, r: 2 }, 0, 0);
        expect(view.erasePathElement).toHaveBeenCalledWith(view.data.roads, { q: 2, r: 2 });
    });

    it('text group — calls getTextAt and removes matching label', () => {
        const label = { text: 'hello', x: 0, y: 0 };
        view.getTextAt = vi.fn(() => label);
        view.currentToolGroup = 'text';
        view.data.texts = [label, { text: 'world', x: 5, y: 5 }];
        pt.handleEraser({ q: 0, r: 0 }, 0, 0);
        expect(view.data.texts).toHaveLength(1);
        expect(view.data.texts[0].text).toBe('world');
    });

    it('text group — no-op when getTextAt returns null', () => {
        view.getTextAt = vi.fn(() => null);
        view.currentToolGroup = 'text';
        view.data.texts = [{ text: 'keep', x: 0, y: 0 }];
        pt.handleEraser({ q: 0, r: 0 }, 0, 0);
        expect(view.data.texts).toHaveLength(1);
    });

    it('symbol group — deletes hex entirely when it has no color', () => {
        view.currentToolGroup = 'tree';
        view.toolConfigs = { tree: makeToolConfig({ backgroundEnabled: false }) };
        view.data.hexes['0_0'] = makeHex(0, 0, { symbol: 'tree', symbolColor: '#green' });
        pt.handleEraser({ q: 0, r: 0 }, 0, 0);
        // symbol-only hex → no properties remain → hex entry is removed entirely
        expect(view.data.hexes['0_0']).toBeUndefined();
    });

    it('symbol group with background — deletes hex when all fields removed', () => {
        view.currentToolGroup = 'tree';
        view.toolConfigs = { tree: makeToolConfig({ backgroundEnabled: true }) };
        view.data.hexes['0_0'] = makeHex(0, 0, { symbol: 'tree', symbolColor: '#green', color: '#bg' });
        pt.handleEraser({ q: 0, r: 0 }, 0, 0);
        // backgroundEnabled removes color too → hex is empty → deleted entirely
        expect(view.data.hexes['0_0']).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// handleEraser() — lastErasedHex recording
// ---------------------------------------------------------------------------

describe('PaintTools.handleEraser() — lastErasedHex recording', () => {
    let view: ReturnType<typeof makeView>;
    let pt: PaintTools;

    beforeEach(() => {
        view = makeView();
        pt = new PaintTools(view);
    });

    it('records color type when hexcolor group erases a colored hex', () => {
        view.currentToolGroup = 'hexcolor';
        view.data.hexes['1_0'] = makeHex(1, 0, { color: '#abc' });
        pt.handleEraser({ q: 1, r: 0 }, 0, 0);
        expect(view.lastErasedHex?.type).toBe('color');
        expect(view.lastErasedHex?.color).toBe('#abc');
    });

    it('records color type when null group erases a colored hex', () => {
        view.currentToolGroup = null;
        view.data.hexes['0_0'] = makeHex(0, 0, { color: '#abc' });
        pt.handleEraser({ q: 0, r: 0 }, 0, 0);
        expect(view.lastErasedHex?.type).toBe('color');
        expect(view.lastErasedHex?.toolGroup).toBe(null);
    });

    it('records symbol type for symbol group', () => {
        view.currentToolGroup = 'tree';
        view.toolConfigs = { tree: makeToolConfig() };
        view.data.hexes['0_0'] = makeHex(0, 0, { symbol: 'tree', symbolColor: '#green' });
        pt.handleEraser({ q: 0, r: 0 }, 0, 0);
        expect(view.lastErasedHex?.type).toBe('symbol');
        expect(view.lastErasedHex?.symbol).toBe('tree');
    });

    it('records border type when border group erases a hex in a region', () => {
        view.currentToolGroup = 'border';
        view.data.borders = [{ id: 5, hexes: [{ q: 0, r: 0 }] }];
        pt.handleEraser({ q: 0, r: 0 }, 0, 0);
        expect(view.lastErasedHex?.type).toBe('border');
        expect(view.lastErasedHex?.regionId).toBe(5);
    });

    it('sets lastErasedHex to null when border group erases an empty hex', () => {
        view.currentToolGroup = 'border';
        view.data.borders = [];
        pt.handleEraser({ q: 0, r: 0 }, 0, 0);
        expect(view.lastErasedHex).toBe(null);
    });

    it('does not overwrite a recent lastErasedHex for the same hex', () => {
        view.currentToolGroup = 'hexcolor';
        view.data.hexes['0_0'] = makeHex(0, 0, { color: '#first' });
        view.lastErasedHex = { q: 0, r: 0, type: 'color', color: '#cached', toolGroup: 'hexcolor', timestamp: Date.now() };
        pt.handleEraser({ q: 0, r: 0 }, 0, 0);
        // should keep the cached value because hasRecentData = true
        expect(view.lastErasedHex.color).toBe('#cached');
    });
});

// ---------------------------------------------------------------------------
// handleEraserFlood()
// ---------------------------------------------------------------------------

describe('PaintTools.handleEraserFlood()', () => {
    let view: ReturnType<typeof makeView>;
    let pt: PaintTools;

    beforeEach(() => {
        view = makeView();
        pt = new PaintTools(view);
    });

    it('returns immediately when lastErasedHex is null', () => {
        view.lastErasedHex = null;
        view.data.hexes['0_0'] = makeHex(0, 0, { color: '#red', symbol: 'tree' });
        pt.handleEraserFlood({ q: 0, r: 0 });
        // hex unchanged — flood did not run
        expect(view.data.hexes['0_0'].color).toBe('#red');
    });

    it('returns when timestamp is older than 1000 ms', () => {
        view.lastErasedHex = { q: 0, r: 0, type: 'color', color: '#red', toolGroup: null, timestamp: Date.now() - 2000 };
        view.data.hexes['0_0'] = makeHex(0, 0, { color: '#red' });
        view.data.hexes['1_0'] = makeHex(1, 0, { color: '#red' });
        pt.handleEraserFlood({ q: 0, r: 0 });
        expect(view.data.hexes['1_0'].color).toBe('#red'); // unchanged
    });

    it('returns when hex position does not match lastErasedHex', () => {
        view.lastErasedHex = { q: 5, r: 5, type: 'color', color: '#red', toolGroup: null, timestamp: Date.now() };
        pt.handleEraserFlood({ q: 0, r: 0 }); // different position
        expect(view.lastErasedHex).not.toBeNull(); // not cleared
    });

    it('flood-erases color region', () => {
        view.lastErasedHex = { q: 0, r: 0, type: 'color', color: '#red', toolGroup: null, timestamp: Date.now() };
        view.data.hexes = {
            '0_0': makeHex(0, 0, { color: '#red' }),
            '1_0': makeHex(1, 0, { color: '#red' }),
            '2_0': makeHex(2, 0, { color: '#blue' }),
        };
        pt.handleEraserFlood({ q: 0, r: 0 });
        expect(view.data.hexes['0_0']).toBeUndefined();
        expect(view.data.hexes['1_0']).toBeUndefined();
        expect(view.data.hexes['2_0']).toBeDefined(); // different color, untouched
    });

    it('flood-erases symbol region — deletes symbol-only hexes', () => {
        view.lastErasedHex = { q: 0, r: 0, type: 'symbol', symbol: 'tree', timestamp: Date.now() };
        view.data.hexes = {
            '0_0': makeHex(0, 0, { symbol: 'tree' }),
            '1_0': makeHex(1, 0, { symbol: 'tree' }),
            '0_1': makeHex(0, 1, { symbol: 'mountain' }),
        };
        pt.handleEraserFlood({ q: 0, r: 0 });
        // symbol-only hexes are deleted entirely after flood-erasing
        expect(view.data.hexes['0_0']).toBeUndefined();
        expect(view.data.hexes['1_0']).toBeUndefined();
        expect(view.data.hexes['0_1'].symbol).toBe('mountain'); // different symbol, untouched
    });

    it('delegates border flood to borderTools.floodEraseBorderSegment', () => {
        view.lastErasedHex = { q: 0, r: 0, type: 'border', regionId: 3, timestamp: Date.now() };
        pt.handleEraserFlood({ q: 0, r: 0 });
        expect(view.borderTools.floodEraseBorderSegment).toHaveBeenCalledWith({ q: 0, r: 0 }, 3);
    });

    it('flood-erases river paths', () => {
        view.data.rivers = [
            { id: 1, waypoints: [] },
            { id: 2, waypoints: [] },
            { id: 3, waypoints: [] },
        ];
        view.lastErasedHex = { q: 0, r: 0, type: 'river', pathIds: [1, 3], toolGroup: 'river', timestamp: Date.now() };
        pt.handleEraserFlood({ q: 0, r: 0 });
        expect(view.data.rivers).toHaveLength(1);
        expect(view.data.rivers[0].id).toBe(2);
    });

    it('clears lastErasedHex after successful flood', () => {
        view.lastErasedHex = { q: 0, r: 0, type: 'color', color: '#red', toolGroup: null, timestamp: Date.now() };
        view.data.hexes['0_0'] = makeHex(0, 0, { color: '#red' });
        pt.handleEraserFlood({ q: 0, r: 0 });
        expect(view.lastErasedHex).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// floodEraseEntirePath()
// ---------------------------------------------------------------------------

describe('PaintTools.floodEraseEntirePath()', () => {
    let pt: PaintTools;

    beforeEach(() => {
        pt = new PaintTools(makeView());
    });

    it('removes paths whose id is in pathIds', () => {
        const paths = [{ id: 1 }, { id: 2 }, { id: 3 }];
        pt.floodEraseEntirePath(paths, [1, 3]);
        expect(paths).toHaveLength(1);
        expect(paths[0].id).toBe(2);
    });

    it('is a no-op when pathIds is empty', () => {
        const paths = [{ id: 1 }, { id: 2 }];
        pt.floodEraseEntirePath(paths, []);
        expect(paths).toHaveLength(2);
    });

    it('is a no-op when paths is empty', () => {
        const paths: any[] = [];
        pt.floodEraseEntirePath(paths, [1]);
        expect(paths).toHaveLength(0);
    });

    it('handles null inputs gracefully', () => {
        expect(() => pt.floodEraseEntirePath(null as any, null as any)).not.toThrow();
    });

    it('removes all paths when all ids match', () => {
        const paths = [{ id: 10 }, { id: 20 }];
        pt.floodEraseEntirePath(paths, [10, 20]);
        expect(paths).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// hexMatchesPattern()
// ---------------------------------------------------------------------------

describe('PaintTools.hexMatchesPattern()', () => {
    let pt: PaintTools;

    beforeEach(() => {
        pt = new PaintTools(makeView());
    });

    it('returns true when all fields match', () => {
        const hex = { q: 0, r: 0, color: '#red', symbol: 'tree', symbolColor: '#green' };
        const pattern = { color: '#red', symbol: 'tree', symbolColor: '#green' };
        expect(pt.hexMatchesPattern(hex, pattern)).toBe(true);
    });

    it('returns false when color differs', () => {
        const hex = { q: 0, r: 0, color: '#blue', symbol: 'tree', symbolColor: '#green' };
        const pattern = { color: '#red', symbol: 'tree', symbolColor: '#green' };
        expect(pt.hexMatchesPattern(hex, pattern)).toBe(false);
    });

    it('returns false when symbol differs', () => {
        const hex = { q: 0, r: 0, color: '#red', symbol: 'mountain', symbolColor: '#green' };
        const pattern = { color: '#red', symbol: 'tree', symbolColor: '#green' };
        expect(pt.hexMatchesPattern(hex, pattern)).toBe(false);
    });

    it('returns false when symbolColor differs', () => {
        const hex = { q: 0, r: 0, color: '#red', symbol: 'tree', symbolColor: '#blue' };
        const pattern = { color: '#red', symbol: 'tree', symbolColor: '#green' };
        expect(pt.hexMatchesPattern(hex, pattern)).toBe(false);
    });

    it('uses hex.backgroundColor over hex.color for comparison', () => {
        const hex = { q: 0, r: 0, color: '#old', backgroundColor: '#red', symbol: 'tree', symbolColor: '#green' };
        const pattern = { color: '#red', symbol: 'tree', symbolColor: '#green' };
        expect(pt.hexMatchesPattern(hex as any, pattern)).toBe(true);
    });

    it('uses pattern.backgroundColor over pattern.color for comparison', () => {
        const hex = { q: 0, r: 0, color: '#red', symbol: 'tree', symbolColor: '#green' };
        const pattern = { backgroundColor: '#red', color: '#other', symbol: 'tree', symbolColor: '#green' };
        expect(pt.hexMatchesPattern(hex, pattern)).toBe(true);
    });

    it('matches when both color fields are undefined', () => {
        const hex = { q: 0, r: 0, symbol: 'tree', symbolColor: '#green' };
        const pattern = { symbol: 'tree', symbolColor: '#green' };
        expect(pt.hexMatchesPattern(hex, pattern)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// handleFillTool()
// ---------------------------------------------------------------------------

describe('PaintTools.handleFillTool()', () => {
    let view: ReturnType<typeof makeView>;
    let pt: PaintTools;

    beforeEach(() => {
        view = makeView();
        pt = new PaintTools(view);
    });

    it('does nothing when start hex is empty and not enclosed', () => {
        // no hex at 0_0, isEnclosedByFrame returns false for open space
        pt.handleFillTool({ q: 0, r: 0 });
        expect(Object.keys(view.data.hexes)).toHaveLength(0);
    });

    it('hexcolor group — flood-fills matching color region', () => {
        view.currentToolGroup = 'hexcolor';
        view.masterColor = '#new';
        view.data.hexes = {
            '0_0': makeHex(0, 0, { color: '#old' }),
            '1_0': makeHex(1, 0, { color: '#old' }),
            '2_0': makeHex(2, 0, { color: '#other' }),
        };
        pt.handleFillTool({ q: 0, r: 0 });
        expect(view.data.hexes['0_0'].color).toBe('#new');
        expect(view.data.hexes['1_0'].color).toBe('#new');
        expect(view.data.hexes['2_0'].color).toBe('#other'); // different color, untouched
    });

    it('null group — flood-fills with active palette color', () => {
        view.currentToolGroup = null;
        view.activeColorSlot = 2;
        view.data.hexes = {
            '0_0': makeHex(0, 0, { color: '#fill-target' }),
            '1_0': makeHex(1, 0, { color: '#fill-target' }),
        };
        pt.handleFillTool({ q: 0, r: 0 });
        expect(view.data.hexes['0_0'].color).toBe('#cccccc'); // palette[2]
        expect(view.data.hexes['1_0'].color).toBe('#cccccc');
    });

    it('symbol group — flood-fills matching symbol region', () => {
        view.currentToolGroup = 'tree';
        view.toolConfigs = { tree: makeToolConfig({ currentVariant: 'pine', symbolColor: '#darkgreen', backgroundEnabled: false }) };
        view.data.hexes = {
            '0_0': makeHex(0, 0, { symbol: 'tree' }),
            '1_0': makeHex(1, 0, { symbol: 'tree' }),
            '2_0': makeHex(2, 0, { symbol: 'mountain' }),
        };
        pt.handleFillTool({ q: 0, r: 0 });
        expect(view.data.hexes['0_0'].symbol).toBe('pine');
        expect(view.data.hexes['1_0'].symbol).toBe('pine');
        expect(view.data.hexes['2_0'].symbol).toBe('mountain'); // untouched
    });

    it('pattern group — flood-fills matching pattern', () => {
        view.currentToolGroup = 'pattern';
        view.patternData = { color: '#pat', symbol: 'bush', symbolColor: '#patSymbol' };
        view.data.hexes = {
            '0_0': makeHex(0, 0, { color: '#old', symbol: 'tree' }),
            '1_0': makeHex(1, 0, { color: '#old', symbol: 'tree' }),
        };
        pt.handleFillTool({ q: 0, r: 0 });
        expect(view.data.hexes['0_0'].symbol).toBe('bush');
        expect(view.data.hexes['1_0'].symbol).toBe('bush');
    });
});
