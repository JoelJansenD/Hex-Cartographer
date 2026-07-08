// === Hex math utilities ===

/** Axial hex coordinate. */
export interface HexCoordinate { q: number; r: number; }

/** 2D point in pixel space. */
export interface Point { x: number; y: number; }

/** A single segment of a hex path (used by rivers and roads). */
export interface PathSegment { from: HexCoordinate; to: HexCoordinate; width: number; }

/**
 * Converts axial hex coordinates to pixel coordinates.
 * @param h - Axial hex coordinate
 * @param gridSize - Hex circumradius in pixels
 * @param flatTop - `true` for flat-top orientation, `false` for pointy-top
 */
export function hexToPixel(h: HexCoordinate, gridSize: number, flatTop: boolean): Point {
    const s = gridSize;
    if (flatTop) {
        return {
            x: s * (3 / 2 * h.q),
            y: s * (Math.sqrt(3) / 2 * h.q + Math.sqrt(3) * h.r)
        };
    }
    return {
        x: s * (Math.sqrt(3) * h.q + Math.sqrt(3) / 2 * h.r),
        y: s * (3 / 2 * h.r)
    };
}

/**
 * Converts pixel coordinates to the nearest axial hex coordinate (cube rounding).
 * @param x - Pixel x
 * @param y - Pixel y
 * @param gridSize - Hex circumradius in pixels
 * @param flatTop - `true` for flat-top orientation, `false` for pointy-top
 */
export function pixelToHex(x: number, y: number, gridSize: number, flatTop: boolean): HexCoordinate {
    const s = gridSize;
    let q: number, r: number;
    if (flatTop) {
        q = (2 / 3 * x) / s;
        r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / s;
    } else {
        q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / s;
        r = (2 / 3 * y) / s;
    }

    const cubeX = q;
    const cubeZ = r;
    const cubeY = -cubeX - cubeZ;

    let rx = Math.round(cubeX);
    let ry = Math.round(cubeY);
    let rz = Math.round(cubeZ);

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
 * Returns the hex grid distance between two axial hex coordinates.
 */
export function hexDistance(a: HexCoordinate, b: HexCoordinate): number {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

/**
 * Linearly interpolates between two hex coordinates and rounds to the nearest hex
 * using cube-coordinate rounding to avoid axial drift.
 * @param a - Start hex
 * @param b - End hex
 * @param t - Interpolation factor in [0, 1]
 */
export function hexLerp(a: HexCoordinate, b: HexCoordinate, t: number): HexCoordinate {
    const q = a.q + (b.q - a.q) * t, r = a.r + (b.r - a.r) * t;
    let rq = Math.round(q), rr = Math.round(r), rs = Math.round(-q - r);
    const qd = Math.abs(rq - q), rd = Math.abs(rr - r), sd = Math.abs(rs - (-q - r));
    if (qd > rd && qd > sd) rq = -rr - rs;
    else if (rd > sd) rr = -rq - rs;
    return { q: rq, r: rr };
}

/**
 * Returns the 6 axial neighbors of a hex coordinate.
 */
export function getHexNeighbors(hex: HexCoordinate): HexCoordinate[] {
    const directions: HexCoordinate[] = [
        { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
        { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
    ];
    return directions.map(d => ({ q: hex.q + d.q, r: hex.r + d.r }));
}

/**
 * Builds the list of hex-to-hex segments forming a straight line from `start` to `end`.
 * Uses `hexDistance` + `hexLerp` internally; returns `[]` if either endpoint is nullish.
 * @param start - Starting hex (or null/undefined)
 * @param end   - Ending hex (or null/undefined)
 * @param width - Width value to attach to every segment
 */
export function calculateHexPath(
    start: HexCoordinate | null | undefined,
    end: HexCoordinate | null | undefined,
    width: number
): PathSegment[] {
    if (!start || !end) return [];
    const path: PathSegment[] = [];
    const n = hexDistance(start, end);
    let prev = start;
    for (let i = 1; i <= n; i++) {
        const next = hexLerp(start, end, i / n);
        path.push({ from: { q: prev.q, r: prev.r }, to: { q: next.q, r: next.r }, width });
        prev = next;
    }
    return path;
}
