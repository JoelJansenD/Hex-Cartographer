// === Pure flood-fill / flood-erase algorithms for the hex grid ===
//
// All functions operate directly on a `Record<string, HexData>` (mutating it in place)
// and accept an optional `getNeighbors` function so they can be unit-tested without
// a real hex grid.  The default is `getHexNeighbors` from hexMath.ts.

import { getHexNeighbors } from './hexMath';
import { HexData } from '../types';

export interface HexCoord { q: number; r: number; }
export type HexMap = Record<string, HexData>;
export type NeighborFn = (hex: HexCoord) => HexCoord[];

/** Returns the canonical string key for a hex cell. */
function hexKey(hex: HexCoord): string {
    return `${hex.q}_${hex.r}`;
}

// ─── Fill ──────────────────────────────────────────────────────────────────────

/**
 * BFS flood-fill: replaces the color of all connected hexes whose `color` equals
 * `targetColor` with `newColor`.  Creates a new hex entry when `hexes[key]` is
 * absent but still matches `targetColor === undefined`.
 * No-op when `targetColor === newColor`.
 */
export function floodFillColor(
    hexes: HexMap,
    startHex: HexCoord,
    targetColor: string | undefined,
    newColor: string,
    getNeighbors: NeighborFn = getHexNeighbors,
): void {
    if (targetColor === newColor) return;

    const visited = new Set<string>();
    const queue: HexCoord[] = [startHex];

    while (queue.length > 0) {
        const hex = queue.shift()!;
        const key = hexKey(hex);
        if (visited.has(key)) continue;
        visited.add(key);

        const hexData = hexes[key];
        const currentColor: string | undefined = hexData ? hexData.color : undefined;
        if (currentColor !== targetColor) continue;

        if (hexData) {
            hexData.color = newColor;
        } else {
            hexes[key] = { q: hex.q, r: hex.r, color: newColor };
        }

        getNeighbors(hex).forEach(n => queue.push(n));
    }
}

/**
 * BFS flood-fill: paints all connected hexes matching `targetSymbol` (or
 * `targetColor` when `targetSymbol` is falsy) with the supplied symbol data.
 */
export function floodFillSymbol(
    hexes: HexMap,
    startHex: HexCoord,
    targetSymbol: string | undefined,
    targetColor: string | undefined,
    newSymbol: string,
    newSymbolColor: string,
    newBgColor: string,
    applyBackground: boolean,
    getNeighbors: NeighborFn = getHexNeighbors,
): void {
    const visited = new Set<string>();
    const queue: HexCoord[] = [startHex];

    while (queue.length > 0) {
        const hex = queue.shift()!;
        const key = hexKey(hex);
        if (visited.has(key)) continue;
        visited.add(key);

        const hexData = hexes[key];
        const currentSymbol: string | undefined = hexData ? hexData.symbol : undefined;
        const currentColor: string | undefined = hexData ? hexData.color : undefined;

        if (targetSymbol) {
            if (currentSymbol !== targetSymbol) continue;
        } else {
            if (currentSymbol || currentColor !== targetColor) continue;
        }

        if (!hexData) {
            hexes[key] = { q: hex.q, r: hex.r, symbol: newSymbol, symbolColor: newSymbolColor };
            if (applyBackground) hexes[key].color = newBgColor;
        } else {
            hexData.symbol = newSymbol;
            hexData.symbolColor = newSymbolColor;
            if (applyBackground) hexData.color = newBgColor;
        }

        getNeighbors(hex).forEach(n => queue.push(n));
    }
}

/**
 * BFS flood-fill: paints all connected hexes whose color+symbol match
 * `targetColor`/`targetSymbol` with the given pattern data.
 */
export function floodFillPattern(
    hexes: HexMap,
    startHex: HexCoord,
    targetColor: string | undefined,
    targetSymbol: string | undefined,
    patternColor: string,
    patternSymbol: string,
    patternSymbolColor: string,
    getNeighbors: NeighborFn = getHexNeighbors,
): void {
    const visited = new Set<string>();
    const queue: HexCoord[] = [startHex];

    while (queue.length > 0) {
        const hex = queue.shift()!;
        const key = hexKey(hex);
        if (visited.has(key)) continue;
        visited.add(key);

        const hexData = hexes[key];
        const currentColor: string | undefined = hexData ? hexData.color : undefined;
        const currentSymbol: string | undefined = hexData ? hexData.symbol : undefined;
        if (currentColor !== targetColor || currentSymbol !== targetSymbol) continue;

        if (!hexData) {
            hexes[key] = { q: hex.q, r: hex.r, color: patternColor, symbol: patternSymbol, symbolColor: patternSymbolColor };
        } else {
            hexData.color = patternColor;
            hexData.symbol = patternSymbol;
            hexData.symbolColor = patternSymbolColor;
        }

        getNeighbors(hex).forEach(n => queue.push(n));
    }
}

/**
 * BFS flood-fill: fills connected **empty** (absent) hexes up to `maxDistance`
 * from `startHex` using `createHexData` to build each new entry.
 * Existing hexes act as boundaries and are left untouched.
 * If `createHexData` returns `null`, that cell is skipped (but still visited).
 */
export function floodFillEmpty(
    hexes: HexMap,
    startHex: HexCoord,
    createHexData: (hex: HexCoord) => HexData | null,
    getNeighbors: NeighborFn = getHexNeighbors,
    maxDistance = 50,
): void {
    const visited = new Set<string>();
    const queue: HexCoord[] = [startHex];

    while (queue.length > 0) {
        const hex = queue.shift()!;
        const key = hexKey(hex);
        if (visited.has(key)) continue;

        const dist = Math.abs(hex.q - startHex.q) + Math.abs(hex.r - startHex.r);
        if (dist > maxDistance) continue;

        visited.add(key);

        if (hexes[key]) continue; // occupied hex → boundary; don't expand further

        const data = createHexData(hex);
        if (data) hexes[key] = data;

        getNeighbors(hex).forEach(n => queue.push(n));
    }
}

// ─── Enclosed-frame check ──────────────────────────────────────────────────────

/**
 * Returns `true` if `startHex` (which must be **empty**) is enclosed by a ring of
 * filled hexes within `maxDistance` steps.  Used to gate `floodFillEmpty`.
 */
export function isEnclosedByFrame(
    hexes: HexMap,
    startHex: HexCoord,
    getNeighbors: NeighborFn = getHexNeighbors,
    maxDistance = 50,
): boolean {
    const visited = new Set<string>();
    const queue: HexCoord[] = [startHex];
    let foundBoundary = false;

    while (queue.length > 0) {
        const hex = queue.shift()!;
        const key = hexKey(hex);
        if (visited.has(key)) continue;

        const dist = Math.abs(hex.q - startHex.q) + Math.abs(hex.r - startHex.r);
        if (dist > maxDistance) return false; // escaped without a full boundary

        visited.add(key);

        if (hexes[key]) {
            foundBoundary = true;
            continue; // boundary cell — stop expanding in this direction
        }

        getNeighbors(hex).forEach(n => queue.push(n));
    }

    return foundBoundary && visited.size < maxDistance * maxDistance;
}

// ─── Erase ─────────────────────────────────────────────────────────────────────
//
// The flood-erase functions start BFS from the *neighbors* of `startHex` because
// the click-erased cell is already cleared before these are called.

/**
 * BFS flood-erase: removes the `color` property from all connected hexes
 * matching `targetColor`, starting from the neighbors of `startHex`.
 */
export function floodEraseColor(
    hexes: HexMap,
    startHex: HexCoord,
    targetColor: string,
    getNeighbors: NeighborFn = getHexNeighbors,
): void {
    const visited = new Set<string>();
    const queue: HexCoord[] = [...getNeighbors(startHex)];

    while (queue.length > 0) {
        const hex = queue.shift()!;
        const key = hexKey(hex);
        if (visited.has(key)) continue;
        visited.add(key);

        const hexData = hexes[key];
        if (!hexData || hexData.color !== targetColor) continue;

        delete hexData.color;
        if (!hexData.symbol) delete hexes[key];

        getNeighbors(hex).forEach(n => queue.push(n));
    }
}

/**
 * BFS flood-erase: removes the `symbol` + `symbolColor` from all connected hexes
 * matching `targetSymbol`, starting from the neighbors of `startHex`.
 */
export function floodEraseSymbol(
    hexes: HexMap,
    startHex: HexCoord,
    targetSymbol: string,
    getNeighbors: NeighborFn = getHexNeighbors,
): void {
    const visited = new Set<string>();
    const queue: HexCoord[] = [...getNeighbors(startHex)];

    while (queue.length > 0) {
        const hex = queue.shift()!;
        const key = hexKey(hex);
        if (visited.has(key)) continue;
        visited.add(key);

        const hexData = hexes[key];
        if (!hexData || hexData.symbol !== targetSymbol) continue;

        delete hexData.symbol;
        delete hexData.symbolColor;
        if (!hexData.color) delete hexes[key];

        getNeighbors(hex).forEach(n => queue.push(n));
    }
}

export type PatternSnapshot = {
    color?: string;
    backgroundColor?: string;
    symbol?: string;
    symbolColor?: string;
};

/**
 * BFS flood-erase: deletes all connected hexes that match `targetPattern`,
 * starting from the neighbors of `startHex`.
 * `hexMatchesPattern` is a caller-supplied predicate.
 */
export function floodErasePattern(
    hexes: HexMap,
    startHex: HexCoord,
    targetPattern: PatternSnapshot,
    hexMatchesPattern: (hex: HexData, pattern: PatternSnapshot) => boolean,
    getNeighbors: NeighborFn = getHexNeighbors,
): void {
    const visited = new Set<string>();
    const queue: HexCoord[] = [...getNeighbors(startHex)];

    while (queue.length > 0) {
        const hex = queue.shift()!;
        const key = hexKey(hex);
        if (visited.has(key)) continue;
        visited.add(key);

        const hexData = hexes[key];
        if (!hexData || !hexMatchesPattern(hexData, targetPattern)) continue;

        delete hexes[key];

        getNeighbors(hex).forEach(n => queue.push(n));
    }
}
