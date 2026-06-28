/**
 * Hex grid mathematics and coordinate conversion utilities
 * Implements axial coordinate system (q, r) for hexagonal grids
 */

import { HexCoordinates } from "../types/hexagon";
import { HexagonSet } from "../types/map-data";

export interface PixelCoordinates {
    x: number;
    y: number;
}

export interface HexBounds {
    minQ: number;
    maxQ: number;
    minR: number;
    maxR: number;
}

export interface HexSegment {
    from: HexCoordinates;
    to: HexCoordinates;
    width?: number;
    lateralOffset?: number;
}

export function getHexagonAtCoordinates(hexes: HexagonSet, hex: HexCoordinates) {
    const key = `${hex.q}_${hex.r}`;
    return hexes[key] || null;
}

/**
 * Convert axial hex coordinates to pixel coordinates
 * Supports both pointy-top (default) and flat-top orientations
 * @param hex - Hex coordinates in axial system (q, r)
 * @param gridSize - The size of each hex cell
 * @param orientation - true for flat-top (90°), false for pointy-top (default)
 * @returns Pixel coordinates
 */
export function hexToPixel(
    hex: HexCoordinates,
    gridSize: number,
    orientation: boolean = false
): PixelCoordinates {
    const s = gridSize;
    if (orientation) {
        // Flat-top orientation
        return {
            x: s * (3 / 2 * hex.q),
            y: s * (Math.sqrt(3) / 2 * hex.q + Math.sqrt(3) * hex.r)
        };
    }
    // Pointy-top orientation (default)
    return {
        x: s * (Math.sqrt(3) * hex.q + Math.sqrt(3) / 2 * hex.r),
        y: s * (3 / 2 * hex.r)
    };
}

/**
 * Convert pixel coordinates to axial hex coordinates
 * Supports both pointy-top (default) and flat-top orientations
 * @param x - Pixel X coordinate
 * @param y - Pixel Y coordinate
 * @param gridSize - The size of each hex cell
 * @param orientation - true for flat-top (90°), false for pointy-top (default)
 * @returns Hex coordinates in axial system
 */
export function pixelToHex(
    x: number,
    y: number,
    gridSize: number,
    orientation: boolean = false
): HexCoordinates {
    const s = gridSize;
    let q: number, r: number;

    if (orientation) {
        // Flat-top orientation
        q = (2 / 3 * x) / s;
        r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / s;
    } else {
        // Pointy-top orientation (default)
        q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / s;
        r = (2 / 3 * y) / s;
    }

    // Convert to cube coordinates for rounding
    const cubeX = q;
    const cubeZ = r;
    const cubeY = -cubeX - cubeZ;

    // Round cube coordinates
    let rx = Math.round(cubeX);
    let ry = Math.round(cubeY);
    let rz = Math.round(cubeZ);

    // Fix rounding errors by finding which coordinate changed most
    const xDiff = Math.abs(rx - cubeX);
    const yDiff = Math.abs(ry - cubeY);
    const zDiff = Math.abs(rz - cubeZ);

    if (xDiff > yDiff && xDiff > zDiff) {
        rx = -ry - rz;
    } else if (yDiff > zDiff) {
        ry = -rx - rz;
    } else {
        rz = -rx - ry;
    }

    return { q: rx, r: rz };
}

/**
 * Calculate the distance between two hexes
 * @param a - First hex coordinates
 * @param b - Second hex coordinates
 * @returns Distance in hex cells
 */
export function hexDistance(a: HexCoordinates, b: HexCoordinates): number {
    return (
        Math.abs(a.q - b.q) +
        Math.abs(a.q + a.r - b.q - b.r) +
        Math.abs(a.r - b.r)
    ) / 2;
}

/**
 * Linear interpolation between two hex coordinates
 * Uses cube coordinate system for accurate interpolation
 * @param a - Start hex
 * @param b - End hex
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated hex coordinate
 */
export function hexLerp(a: HexCoordinates, b: HexCoordinates, t: number): HexCoordinates {
    const q = a.q + (b.q - a.q) * t;
    const r = a.r + (b.r - a.r) * t;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(-q - r);

    const qd = Math.abs(rq - q);
    const rd = Math.abs(rr - r);
    const sd = Math.abs(rs - (-q - r));

    if (qd > rd && qd > sd) {
        rq = -rr - rs;
    } else if (rd > sd) {
        rr = -rq - rs;
    }

    return { q: rq, r: rr };
}

/**
 * Get the 6 neighboring hex coordinates
 * @param hex - The hex to get neighbors for
 * @returns Array of 6 neighboring hex coordinates
 */
export function getHexNeighbors(hex: HexCoordinates): HexCoordinates[] {
    const directions = [
        { q: 1, r: 0 },
        { q: 1, r: -1 },
        { q: 0, r: -1 },
        { q: -1, r: 0 },
        { q: -1, r: 1 },
        { q: 0, r: 1 }
    ];
    return directions.map(d => ({ q: hex.q + d.q, r: hex.r + d.r }));
}

/**
 * Calculate a path of hex segments between two hexes
 * @param start - Starting hex coordinate
 * @param end - Ending hex coordinate
 * @param width - Width parameter for the segments
 * @returns Array of hex segments forming the path
 */
export function calculateHexPath(
    start: HexCoordinates,
    end: HexCoordinates,
    width: number
): HexSegment[] {
    if (!start || !end) return [];

    const path: HexSegment[] = [];
    const n = hexDistance(start, end);

    let prev = start;
    for (let i = 1; i <= n; i++) {
        const next = hexLerp(start, end, i / n);
        path.push({
            from: { q: prev.q, r: prev.r },
            to: { q: next.q, r: next.r },
            width: width
        });
        prev = next;
    }

    return path;
}

/**
 * Calculate the bounding box of a set of hexes
 * @param hexes - Array of hex coordinates
 * @returns Bounding box with min/max q and r values, or null if empty
 */
export function getHexBounds(hexes: HexCoordinates[]): HexBounds | null {
    if (hexes.length === 0) return null;

    let minQ = Infinity;
    let maxQ = -Infinity;
    let minR = Infinity;
    let maxR = -Infinity;

    for (const hex of hexes) {
        if (hex.q < minQ) minQ = hex.q;
        if (hex.q > maxQ) maxQ = hex.q;
        if (hex.r < minR) minR = hex.r;
        if (hex.r > maxR) maxR = hex.r;
    }

    return { minQ, maxQ, minR, maxR };
}

/**
 * Check if hex coordinates are within plausible range relative to known bounds
 * @param hex - Hex coordinate to check
 * @param bounds - Known hex bounds
 * @param margin - Acceptable margin beyond bounds
 * @returns true if hex is within plausible range
 */
export function isHexInPlausibleRange(
    hex: HexCoordinates,
    bounds: HexBounds | null,
    margin: number = 50
): boolean {
    if (!bounds) return true; // No bounds, everything is plausible

    return !(
        hex.q < bounds.minQ - margin ||
        hex.q > bounds.maxQ + margin ||
        hex.r < bounds.minR - margin ||
        hex.r > bounds.maxR + margin
    );
}

/**
 * Create a segment key for identifying unique edges between hexes
 * Ensures the same edge is identified consistently regardless of direction
 * @param from - First hex coordinate
 * @param to - Second hex coordinate
 * @returns Canonical segment key string
 */
export function createSegmentKey(from: HexCoordinates, to: HexCoordinates): string {
    if (from.q < to.q || (from.q === to.q && from.r < to.r)) {
        return `${from.q},${from.r}|${to.q},${to.r}`;
    }
    return `${to.q},${to.r}|${from.q},${from.r}`;
}
