import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BorderTools } from './BorderTools';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRegion(id: number, hexes: { q: number; r: number }[], overrides: Record<string, any> = {}) {
    return { id, color: '#ff0000', dashes: 1, hexes, ...overrides };
}

function makeView(overrides: Record<string, any> = {}) {
    return {
        data: {
            borders: [] as any[],
        },
        borderSettings: {
            activeRegionId: null as number | null,
            dashes: 1,
            visible: true,
            pickedHex: null,
        },
        masterColor: '#ff0000',
        containerEl: { querySelector: () => null },
        getHexBounds: vi.fn(() => null),
        updateToolbarState: vi.fn(),
        render: vi.fn(),
        requestSave: vi.fn(),
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// addBorderHex()
// ---------------------------------------------------------------------------

describe('BorderTools.addBorderHex()', () => {
    let view: ReturnType<typeof makeView>;
    let bt: BorderTools;

    beforeEach(() => {
        view = makeView();
        bt = new BorderTools(view);
    });

    it('creates a new region when activeRegionId is null', () => {
        bt.addBorderHex({ q: 0, r: 0 });
        expect(view.data.borders).toHaveLength(1);
        expect(view.data.borders[0].hexes).toEqual([{ q: 0, r: 0 }]);
        expect(view.borderSettings.activeRegionId).toBe(1);
    });

    it('assigns incrementing id based on existing regions', () => {
        view.data.borders = [makeRegion(3, [{ q: 5, r: 5 }])];
        bt.addBorderHex({ q: 0, r: 0 });
        expect(view.data.borders.find((r: any) => r.id === 4)).toBeDefined();
        expect(view.borderSettings.activeRegionId).toBe(4);
    });

    it('appends to an existing active region', () => {
        view.data.borders = [makeRegion(1, [{ q: 0, r: 0 }])];
        view.borderSettings.activeRegionId = 1;
        bt.addBorderHex({ q: 1, r: 0 });
        expect(view.data.borders[0].hexes).toHaveLength(2);
    });

    it('does not add duplicate hexes to a region', () => {
        view.data.borders = [makeRegion(1, [{ q: 0, r: 0 }])];
        view.borderSettings.activeRegionId = 1;
        bt.addBorderHex({ q: 0, r: 0 });
        expect(view.data.borders[0].hexes).toHaveLength(1);
    });

    it('removes the hex from other regions when painting over them', () => {
        view.data.borders = [
            makeRegion(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }]),
            makeRegion(2, [{ q: 2, r: 0 }]),
        ];
        view.borderSettings.activeRegionId = 2;
        bt.addBorderHex({ q: 1, r: 0 });
        expect(view.data.borders[0].hexes).toEqual([{ q: 0, r: 0 }]);
        expect(view.data.borders[1].hexes).toContainEqual({ q: 1, r: 0 });
    });

    it('prunes empty regions that are not the active region', () => {
        view.data.borders = [
            makeRegion(1, [{ q: 0, r: 0 }]),
            makeRegion(2, [{ q: 1, r: 0 }]),
        ];
        view.borderSettings.activeRegionId = 2;
        // Paint over region 1's only hex
        bt.addBorderHex({ q: 0, r: 0 });
        // Region 1 should be pruned (empty and not active)
        expect(view.data.borders.some((r: any) => r.id === 1)).toBe(false);
    });

    it('rejects hexes that are far outside the map bounds', () => {
        view.getHexBounds = vi.fn(() => ({ minQ: 0, maxQ: 10, minR: 0, maxR: 10 }));
        bt.addBorderHex({ q: 1000, r: 1000 });
        expect(view.data.borders).toHaveLength(0);
    });

    it('rounds fractional hex coordinates before storing', () => {
        bt.addBorderHex({ q: 0.4, r: 0.6 });
        expect(view.data.borders[0].hexes[0]).toEqual({ q: 0, r: 1 });
    });

    it('uses masterColor for new region color', () => {
        view.masterColor = '#abcdef';
        bt.addBorderHex({ q: 0, r: 0 });
        expect(view.data.borders[0].color).toBe('#abcdef');
    });

    it('uses borderSettings.dashes for new region', () => {
        view.borderSettings.dashes = 3;
        bt.addBorderHex({ q: 0, r: 0 });
        expect(view.data.borders[0].dashes).toBe(3);
    });
});

// ---------------------------------------------------------------------------
// floodEraseBorderSegment()
// ---------------------------------------------------------------------------

describe('BorderTools.floodEraseBorderSegment()', () => {
    let view: ReturnType<typeof makeView>;
    let bt: BorderTools;

    beforeEach(() => {
        view = makeView();
        bt = new BorderTools(view);
    });

    it('does nothing when regionId does not exist', () => {
        view.data.borders = [makeRegion(1, [{ q: 0, r: 0 }])];
        bt.floodEraseBorderSegment({ q: 0, r: 0 }, 99);
        expect(view.data.borders[0].hexes).toHaveLength(1);
    });

    it('removes a connected contiguous blob of border hexes', () => {
        // A straight horizontal line: (0,0)-(1,0)-(2,0)
        view.data.borders = [makeRegion(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }])];
        bt.floodEraseBorderSegment({ q: 0, r: 0 }, 1);
        // All three are connected and should be erased
        expect(view.data.borders.find((r: any) => r.id === 1)).toBeUndefined();
    });

    it('also includes immediate neighbours of startHex in seed', () => {
        // Region contains only (1,0); startHex is (0,0) which is a neighbour
        view.data.borders = [makeRegion(1, [{ q: 1, r: 0 }])];
        bt.floodEraseBorderSegment({ q: 0, r: 0 }, 1);
        expect(view.data.borders.find((r: any) => r.id === 1)).toBeUndefined();
    });

    it('leaves hexes in other regions untouched', () => {
        view.data.borders = [
            makeRegion(1, [{ q: 0, r: 0 }]),
            makeRegion(2, [{ q: 5, r: 5 }]),
        ];
        bt.floodEraseBorderSegment({ q: 0, r: 0 }, 1);
        expect(view.data.borders.find((r: any) => r.id === 2)).toBeDefined();
    });

    it('removes the region entry when all hexes are erased', () => {
        view.data.borders = [makeRegion(1, [{ q: 0, r: 0 }])];
        bt.floodEraseBorderSegment({ q: 0, r: 0 }, 1);
        expect(view.data.borders).toHaveLength(0);
    });

    it('keeps the region if not all hexes are reachable from startHex', () => {
        // Two disconnected clusters in the same region: (0,0) and (10,10)
        view.data.borders = [
            makeRegion(1, [{ q: 0, r: 0 }, { q: 10, r: 10 }]),
        ];
        bt.floodEraseBorderSegment({ q: 0, r: 0 }, 1);
        const region = view.data.borders.find((r: any) => r.id === 1);
        expect(region).toBeDefined();
        expect(region!.hexes).toEqual([{ q: 10, r: 10 }]);
    });
});
