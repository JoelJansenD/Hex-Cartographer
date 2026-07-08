import { describe, it, expect } from 'vitest';
import {
    hexToPixel, pixelToHex,
    hexDistance, hexLerp,
    getHexNeighbors, calculateHexPath,
} from './hexMath';

// ---------------------------------------------------------------------------
// hexDistance
// ---------------------------------------------------------------------------
describe('hexDistance', () => {
    it('same hex has distance 0', () => {
        expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
    });

    it('each direct neighbor has distance 1', () => {
        expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
        expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(1);
        expect(hexDistance({ q: 0, r: 0 }, { q: -1, r: 1 })).toBe(1);
    });

    it('distance is symmetric', () => {
        const a = { q: 2, r: -3 }, b = { q: -1, r: 2 };
        expect(hexDistance(a, b)).toBe(hexDistance(b, a));
    });

    it('calculates distance of 3', () => {
        expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: 0 })).toBe(3);
    });

    it('calculates distance for diagonal move', () => {
        // {q:2, r:-2} is 2 steps diagonally
        expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: -2 })).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// hexLerp
// ---------------------------------------------------------------------------
describe('hexLerp', () => {
    it('t=0 returns start', () => {
        expect(hexLerp({ q: 0, r: 0 }, { q: 4, r: 0 }, 0)).toEqual({ q: 0, r: 0 });
    });
    it('t=1 returns end', () => {
        expect(hexLerp({ q: 0, r: 0 }, { q: 4, r: 0 }, 1)).toEqual({ q: 4, r: 0 });
    });
    it('t=0.5 returns midpoint of even-length segment', () => {
        expect(hexLerp({ q: 0, r: 0 }, { q: 4, r: 0 }, 0.5)).toEqual({ q: 2, r: 0 });
    });
    it('rounds to nearest hex on 1/3 step', () => {
        const result = hexLerp({ q: 0, r: 0 }, { q: 3, r: 0 }, 1 / 3);
        expect(result).toEqual({ q: 1, r: 0 });
    });
    it('result is valid axial coordinate (s = -q-r satisfies cube constraint)', () => {
        const result = hexLerp({ q: 1, r: -3 }, { q: 4, r: 2 }, 0.6);
        // cube constraint: q + r + s = 0  (s is implicit)
        // The returned {q, r} should be a whole-number axial coordinate
        expect(Number.isInteger(result.q)).toBe(true);
        expect(Number.isInteger(result.r)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// getHexNeighbors
// ---------------------------------------------------------------------------
describe('getHexNeighbors', () => {
    it('returns exactly 6 neighbors', () => {
        expect(getHexNeighbors({ q: 0, r: 0 })).toHaveLength(6);
    });

    it('every neighbor is distance 1 from origin', () => {
        const neighbors = getHexNeighbors({ q: 0, r: 0 });
        neighbors.forEach(n => expect(hexDistance({ q: 0, r: 0 }, n)).toBe(1));
    });

    it('all neighbors are distinct', () => {
        const neighbors = getHexNeighbors({ q: 2, r: -1 });
        const keys = new Set(neighbors.map(n => `${n.q},${n.r}`));
        expect(keys.size).toBe(6);
    });

    it('works for a non-origin hex', () => {
        const neighbors = getHexNeighbors({ q: 3, r: -2 });
        neighbors.forEach(n => expect(hexDistance({ q: 3, r: -2 }, n)).toBe(1));
    });
});

// ---------------------------------------------------------------------------
// calculateHexPath
// ---------------------------------------------------------------------------
describe('calculateHexPath', () => {
    it('returns [] when start is null', () => {
        expect(calculateHexPath(null, { q: 1, r: 0 }, 1)).toEqual([]);
    });

    it('returns [] when end is null', () => {
        expect(calculateHexPath({ q: 0, r: 0 }, null, 1)).toEqual([]);
    });
    
    it('returns [] when end is undefined', () => {
        expect(calculateHexPath({ q: 0, r: 0 }, undefined, 1)).toEqual([]);
    });
    
    it('adjacent hexes produce 1 segment', () => {
        const segs = calculateHexPath({ q: 0, r: 0 }, { q: 1, r: 0 }, 2);
        expect(segs).toHaveLength(1);
        expect(segs[0]).toEqual({ from: { q: 0, r: 0 }, to: { q: 1, r: 0 }, width: 2 });
    });
    
    it('3-step straight path has 3 segments', () => {
        const segs = calculateHexPath({ q: 0, r: 0 }, { q: 3, r: 0 }, 5);
        expect(segs).toHaveLength(3);
    });
    
    it('first segment starts at start hex', () => {
        const segs = calculateHexPath({ q: 0, r: 0 }, { q: 3, r: 0 }, 1);
        expect(segs[0].from).toEqual({ q: 0, r: 0 });
    });
    
    it('last segment ends at end hex', () => {
        const segs = calculateHexPath({ q: 0, r: 0 }, { q: 3, r: 0 }, 1);
        expect(segs[segs.length - 1].to).toEqual({ q: 3, r: 0 });
    });
    
    it('segments form a chain (to[i] === from[i+1])', () => {
        const segs = calculateHexPath({ q: 0, r: 0 }, { q: 4, r: 0 }, 1);
        for (let i = 0; i < segs.length - 1; i++) {
            expect(segs[i].to).toEqual(segs[i + 1].from);
        }
    });
    
    it('width is attached to every segment', () => {
        const segs = calculateHexPath({ q: 0, r: 0 }, { q: 2, r: 0 }, 7);
        segs.forEach(s => expect(s.width).toBe(7));
    });
});

// ---------------------------------------------------------------------------
// hexToPixel / pixelToHex  — round-trip
// ---------------------------------------------------------------------------
describe('hexToPixel', () => {
    it('origin maps to pixel (0, 0) in pointy-top', () => {
        const pt = hexToPixel({ q: 0, r: 0 }, 40, false);
        expect(pt.x).toBe(0);
        expect(pt.y).toBe(0);
    });

    it('origin maps to pixel (0, 0) in flat-top', () => {
        const pt = hexToPixel({ q: 0, r: 0 }, 40, true);
        expect(pt.x).toBe(0);
        expect(pt.y).toBe(0);
    });
    
    it('pointy-top: {q:1, r:0} x = sqrt(3)*s', () => {
        const s = 10;
        const pt = hexToPixel({ q: 1, r: 0 }, s, false);
        expect(pt.x).toBeCloseTo(Math.sqrt(3) * s);
        expect(pt.y).toBe(0);
    });
    it('flat-top: {q:1, r:0} x = 1.5*s', () => {
        const s = 10;
        const pt = hexToPixel({ q: 1, r: 0 }, s, true);
        expect(pt.x).toBeCloseTo(1.5 * s);
        expect(pt.y).toBeCloseTo(Math.sqrt(3) / 2 * s);
    });
});

describe('pixelToHex', () => {
    it('round-trips origin in pointy-top', () => {
        const hex = { q: 0, r: 0 };
        const pt = hexToPixel(hex, 40, false);
        expect(pixelToHex(pt.x, pt.y, 40, false)).toEqual(hex);
    });
    
    it('round-trips a non-origin hex in pointy-top', () => {
        const hex = { q: 3, r: -2 };
        const pt = hexToPixel(hex, 40, false);
        expect(pixelToHex(pt.x, pt.y, 40, false)).toEqual(hex);
    });
    
    it('round-trips origin in flat-top', () => {
        const hex = { q: 0, r: 0 };
        const pt = hexToPixel(hex, 40, true);
        expect(pixelToHex(pt.x, pt.y, 40, true)).toEqual(hex);
    });
    
    it('round-trips a non-origin hex in flat-top', () => {
        const hex = { q: -2, r: 4 };
        const pt = hexToPixel(hex, 40, true);
        expect(pixelToHex(pt.x, pt.y, 40, true)).toEqual(hex);
    });
    
    it('pointy-top and flat-top do not cross-map', () => {
        const hex = { q: 2, r: 1 };
        const ptPointy = hexToPixel(hex, 40, false);
        // Pixel from pointy-top layout should NOT round-trip under flat-top
        const result = pixelToHex(ptPointy.x, ptPointy.y, 40, true);
        // They should differ (different coordinate systems)
        expect(result).not.toEqual(hex);
    });
});
