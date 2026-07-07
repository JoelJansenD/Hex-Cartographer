import { describe, it, expect, beforeEach } from 'vitest';
import {
    floodFillColor,
    floodFillSymbol,
    floodFillPattern,
    floodFillEmpty,
    isEnclosedByFrame,
    floodEraseColor,
    floodEraseSymbol,
    floodErasePattern,
} from './floodFill';
import type { HexMap, HexCoord, NeighborFn } from './floodFill';
import { HexData } from '../types';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function key(q: number, r: number): string {
    return `${q}_${r}`;
}

/** Minimal neighbor function for a small linear strip: q in {0,1,2,3,4}, r=0. */
function linearNeighbors(hex: HexCoord): HexCoord[] {
    return [
        { q: hex.q - 1, r: hex.r },
        { q: hex.q + 1, r: hex.r },
    ];
}

/** 6-directional neighbor function (mirrors hexMath.getHexNeighbors). */
function hexNeighbors(hex: HexCoord): HexCoord[] {
    const dirs = [
        { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
        { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
    ];
    return dirs.map(d => ({ q: hex.q + d.q, r: hex.r + d.r }));
}

// ─── floodFillColor ─────────────────────────────────────────────────────────────

describe('floodFillColor', () => {
    it('replaces all connected hexes of targetColor', () => {
        const hexes: HexMap = {
            [key(0, 0)]: { q: 0, r: 0, color: 'red' },
            [key(1, 0)]: { q: 1, r: 0, color: 'red' },
            [key(2, 0)]: { q: 2, r: 0, color: 'blue' },
        };
        floodFillColor(hexes, { q: 0, r: 0 }, 'red', 'green', linearNeighbors);
        expect(hexes[key(0, 0)].color).toBe('green');
        expect(hexes[key(1, 0)].color).toBe('green');
        expect(hexes[key(2, 0)].color).toBe('blue'); // not connected to 'red' region
    });

    it('does not cross hexes of a different color', () => {
        const hexes: HexMap = {
            [key(0, 0)]: { q: 0, r: 0, color: 'red' },
            [key(1, 0)]: { q: 1, r: 0, color: 'blue' }, // barrier
            [key(2, 0)]: { q: 2, r: 0, color: 'red' },
        };
        floodFillColor(hexes, { q: 0, r: 0 }, 'red', 'green', linearNeighbors);
        expect(hexes[key(0, 0)].color).toBe('green');
        expect(hexes[key(2, 0)].color).toBe('red'); // disconnected from start
    });

    it('is a no-op when targetColor === newColor', () => {
        const hexes: HexMap = {
            [key(0, 0)]: { q: 0, r: 0, color: 'red' },
        };
        floodFillColor(hexes, { q: 0, r: 0 }, 'red', 'red', linearNeighbors);
        expect(hexes[key(0, 0)].color).toBe('red');
    });

    it('creates new hex entries for empty cells that match undefined targetColor', () => {
        const hexes: HexMap = {};
        floodFillColor(hexes, { q: 0, r: 0 }, undefined, 'green', linearNeighbors);
        // Only (0,0) is processed; neighbors (-1,0) and (1,0) also have undefined
        // color so they get created — but linearNeighbors only returns ±1 on q
        expect(hexes[key(0, 0)]?.color).toBe('green');
    });
});

// ─── floodFillSymbol ────────────────────────────────────────────────────────────

describe('floodFillSymbol', () => {
    it('fills connected hexes matching targetSymbol', () => {
        const hexes: HexMap = {
            [key(0, 0)]: { q: 0, r: 0, symbol: 'tree', symbolColor: '#000' },
            [key(1, 0)]: { q: 1, r: 0, symbol: 'tree', symbolColor: '#000' },
            [key(2, 0)]: { q: 2, r: 0, symbol: 'mountain', symbolColor: '#000' },
        };
        floodFillSymbol(hexes, { q: 0, r: 0 }, 'tree', undefined, 'pine', '#ff0', '#eee', false, linearNeighbors);
        expect(hexes[key(0, 0)].symbol).toBe('pine');
        expect(hexes[key(1, 0)].symbol).toBe('pine');
        expect(hexes[key(2, 0)].symbol).toBe('mountain'); // different symbol — untouched
    });

    it('applies background color when applyBackground is true', () => {
        const hexes: HexMap = {
            [key(0, 0)]: { q: 0, r: 0, symbol: 'tree', symbolColor: '#000' },
        };
        floodFillSymbol(hexes, { q: 0, r: 0 }, 'tree', undefined, 'pine', '#ff0', '#abc', true, linearNeighbors);
        expect(hexes[key(0, 0)].color).toBe('#abc');
    });

    it('does not apply background when applyBackground is false', () => {
        const hexes: HexMap = {
            [key(0, 0)]: { q: 0, r: 0, symbol: 'tree', symbolColor: '#000' },
        };
        floodFillSymbol(hexes, { q: 0, r: 0 }, 'tree', undefined, 'pine', '#ff0', '#abc', false, linearNeighbors);
        expect(hexes[key(0, 0)].color).toBeUndefined();
    });
});

// ─── floodFillPattern ──────────────────────────────────────────────────────────

describe('floodFillPattern', () => {
    it('replaces matching color+symbol with pattern data', () => {
        const hexes: HexMap = {
            [key(0, 0)]: { q: 0, r: 0, color: 'red', symbol: 'tree', symbolColor: '#000' },
            [key(1, 0)]: { q: 1, r: 0, color: 'red', symbol: 'tree', symbolColor: '#000' },
            [key(2, 0)]: { q: 2, r: 0, color: 'red', symbol: 'rock', symbolColor: '#000' }, // different symbol
        };
        floodFillPattern(hexes, { q: 0, r: 0 }, 'red', 'tree', 'blue', 'pine', '#aaa', linearNeighbors);
        expect(hexes[key(0, 0)].color).toBe('blue');
        expect(hexes[key(0, 0)].symbol).toBe('pine');
        expect(hexes[key(1, 0)].color).toBe('blue');
        expect(hexes[key(2, 0)].symbol).toBe('rock'); // untouched — different symbol
    });
});

// ─── floodFillEmpty ─────────────────────────────────────────────────────────────

describe('floodFillEmpty', () => {
    it('fills empty hexes up to maxDistance', () => {
        const hexes: HexMap = {};
        floodFillEmpty(
            hexes,
            { q: 0, r: 0 },
            hex => ({ q: hex.q, r: hex.r, color: 'fill' }),
            linearNeighbors,
            2,
        );
        expect(hexes[key(0, 0)]?.color).toBe('fill');
        expect(hexes[key(1, 0)]?.color).toBe('fill');
        expect(hexes[key(2, 0)]?.color).toBe('fill');
        // q=3 is at distance 3 > maxDistance=2, so not filled
        expect(hexes[key(3, 0)]).toBeUndefined();
    });

    it('stops at existing hexes (used as boundary)', () => {
        const hexes: HexMap = {
            [key(1, 0)]: { q: 1, r: 0, color: 'wall' },
        };
        floodFillEmpty(
            hexes,
            { q: 0, r: 0 },
            hex => ({ q: hex.q, r: hex.r, color: 'fill' }),
            linearNeighbors,
            5,
        );
        expect(hexes[key(0, 0)]?.color).toBe('fill');
        expect(hexes[key(1, 0)].color).toBe('wall'); // boundary untouched
        expect(hexes[key(2, 0)]).toBeUndefined(); // not reachable
    });

    it('skips cells where createHexData returns null', () => {
        const hexes: HexMap = {};
        floodFillEmpty(
            hexes,
            { q: 0, r: 0 },
            hex => (hex.q === 0 ? { q: hex.q, r: hex.r, color: 'ok' } : null),
            linearNeighbors,
            3,
        );
        expect(hexes[key(0, 0)]?.color).toBe('ok');
        // q=1 createHexData returns null → no entry created (but q=2 still visited because
        // floodFillEmpty keeps expanding through empty cells even when null is returned)
        expect(hexes[key(1, 0)]).toBeUndefined();
    });
});

// ─── isEnclosedByFrame ─────────────────────────────────────────────────────────

describe('isEnclosedByFrame', () => {
    it('returns true when startHex is fully surrounded by filled hexes', () => {
        // Build a "ring" around (0,0) using 6 hex neighbors
        const ring: HexCoord[] = [
            { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
            { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
        ];
        const hexes: HexMap = {};
        ring.forEach(h => { hexes[key(h.q, h.r)] = { q: h.q, r: h.r, color: 'wall' }; });

        expect(isEnclosedByFrame(hexes, { q: 0, r: 0 }, hexNeighbors, 5)).toBe(true);
    });

    it('returns false when there is a gap in the frame', () => {
        // Ring with one hex removed
        const ring: HexCoord[] = [
            { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
            { q: -1, r: 0 }, { q: -1, r: 1 },
            // { q: 0, r: 1 } is missing → gap
        ];
        const hexes: HexMap = {};
        ring.forEach(h => { hexes[key(h.q, h.r)] = { q: h.q, r: h.r, color: 'wall' }; });

        expect(isEnclosedByFrame(hexes, { q: 0, r: 0 }, hexNeighbors, 5)).toBe(false);
    });

    it('returns false when maxDistance is exceeded (no frame found)', () => {
        const hexes: HexMap = {};
        expect(isEnclosedByFrame(hexes, { q: 0, r: 0 }, hexNeighbors, 2)).toBe(false);
    });
});

// ─── floodEraseColor ───────────────────────────────────────────────────────────

describe('floodEraseColor', () => {
    it('removes color from connected neighbors matching targetColor', () => {
        const hexes: HexMap = {
            [key(0, 0)]: { q: 0, r: 0, color: 'red' }, // already cleared; flood starts from neighbors
            [key(1, 0)]: { q: 1, r: 0, color: 'red' },
            [key(2, 0)]: { q: 2, r: 0, color: 'red' },
            [key(3, 0)]: { q: 3, r: 0, color: 'blue' },
        };
        // simulate: (0,0) was already erased by single-click eraser
        delete hexes[key(0, 0)];
        floodEraseColor(hexes, { q: 0, r: 0 }, 'red', linearNeighbors);
        expect(hexes[key(1, 0)]).toBeUndefined();
        expect(hexes[key(2, 0)]).toBeUndefined();
        expect(hexes[key(3, 0)]?.color).toBe('blue'); // different color — untouched
    });

    it('keeps hex entry when a symbol remains after color removal', () => {
        const hexes: HexMap = {
            [key(1, 0)]: { q: 1, r: 0, color: 'red', symbol: 'tree', symbolColor: '#0f0' },
        };
        floodEraseColor(hexes, { q: 0, r: 0 }, 'red', linearNeighbors);
        expect(hexes[key(1, 0)]).toBeDefined();
        expect(hexes[key(1, 0)].color).toBeUndefined();
        expect(hexes[key(1, 0)].symbol).toBe('tree'); // symbol preserved
    });
});

// ─── floodEraseSymbol ──────────────────────────────────────────────────────────

describe('floodEraseSymbol', () => {
    it('removes symbol from connected neighbors matching targetSymbol', () => {
        const hexes: HexMap = {
            [key(1, 0)]: { q: 1, r: 0, symbol: 'tree', symbolColor: '#0f0' },
            [key(2, 0)]: { q: 2, r: 0, symbol: 'tree', symbolColor: '#0f0' },
            [key(3, 0)]: { q: 3, r: 0, symbol: 'rock', symbolColor: '#888' },
        };
        floodEraseSymbol(hexes, { q: 0, r: 0 }, 'tree', linearNeighbors);
        expect(hexes[key(1, 0)]).toBeUndefined(); // entry deleted (no color)
        expect(hexes[key(2, 0)]).toBeUndefined();
        expect(hexes[key(3, 0)]?.symbol).toBe('rock'); // untouched
    });
});

// ─── floodErasePattern ─────────────────────────────────────────────────────────

describe('floodErasePattern', () => {
    const matchesPattern = (hex: HexData, pattern: { color?: string; symbol?: string; symbolColor?: string }) => {
        return hex.color === pattern.color &&
               hex.symbol === pattern.symbol &&
               hex.symbolColor === pattern.symbolColor;
    };

    it('deletes connected hexes matching targetPattern', () => {
        const hexes: HexMap = {
            [key(1, 0)]: { q: 1, r: 0, color: 'red', symbol: 'tree', symbolColor: '#0f0' },
            [key(2, 0)]: { q: 2, r: 0, color: 'red', symbol: 'tree', symbolColor: '#0f0' },
            [key(3, 0)]: { q: 3, r: 0, color: 'red', symbol: 'rock', symbolColor: '#0f0' },
        };
        floodErasePattern(
            hexes,
            { q: 0, r: 0 },
            { color: 'red', symbol: 'tree', symbolColor: '#0f0' },
            matchesPattern,
            linearNeighbors,
        );
        expect(hexes[key(1, 0)]).toBeUndefined();
        expect(hexes[key(2, 0)]).toBeUndefined();
        expect(hexes[key(3, 0)]).toBeDefined(); // different symbol — untouched
    });
});
