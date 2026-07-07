import { getHexNeighbors } from '../utils/hexMath';
import { DEFAULT_BORDER_DASHES } from '../constants';
import type { HexCartographerView } from './HexCartographerView';

/**
 * Handles border-region editing for HexCartographerView.
 * Covers adding hexes to a border region and flood-erasing an entire region.
 */
export class BorderTools {
    private readonly view: HexCartographerView;

    constructor(view: HexCartographerView) {
        this.view = view;
    }

    // ─── Add border hex ────────────────────────────────────────────────────────

    /**
     * Paints `hex` into the currently active border region.
     *
     * - If no active region exists a new one is created (auto-incrementing id,
     *   current `masterColor` and `borderSettings.dashes`).
     * - The hex is removed from every *other* region so each hex belongs to at
     *   most one region at a time.
     * - Regions that become empty as a side-effect are pruned (except the newly
     *   active one, which may legitimately be empty while the user is drawing).
     * - Fractional coordinates are rounded before storage.
     * - Hexes that fall more than 50 cells outside the current map bounds are
     *   silently rejected to guard against runaway input.
     */
    addBorderHex(hex: any): void {
        const v = this.view;
        if (!v.data.borders) v.data.borders = [];

        const hq = Math.round(hex.q);
        const hr = Math.round(hex.r);

        const bounds = v.getHexBounds();
        if (bounds && (hq < bounds.minQ - 50 || hq > bounds.maxQ + 50 || hr < bounds.minR - 50 || hr > bounds.maxR + 50)) {
            console.warn('Rejected border hex: outside plausible range', { q: hq, r: hr, bounds });
            return;
        }

        let region = v.data.borders.find((r: any) => r.id === v.borderSettings.activeRegionId);
        if (!region) {
            const maxId = v.data.borders.reduce((max: number, r: any) => Math.max(max, r.id || 0), 0);
            region = {
                id: maxId + 1,
                color: v.masterColor,
                dashes: v.borderSettings.dashes || DEFAULT_BORDER_DASHES,
                hexes: [],
            };
            v.data.borders.push(region);
            v.borderSettings.activeRegionId = region.id;
        }

        v.data.borders.forEach((r: any) => {
            if (r.id !== region.id) {
                r.hexes = r.hexes.filter((b: any) => !(b.q === hex.q && b.r === hex.r));
            }
        });
        v.data.borders = v.data.borders.filter((r: any) => r.hexes.length > 0 || r.id === region.id);

        const exists = region.hexes.some((b: any) => b.q === hq && b.r === hr);
        if (!exists) {
            region.hexes.push({ q: hq, r: hr });
        }

        const toolbar = v.containerEl.querySelector('.hex-toolbar');
        if (toolbar) v.updateToolbarState(toolbar);
    }

    // ─── Flood erase border segment ────────────────────────────────────────────

    /**
     * Flood-erases the contiguous blob of border hexes in `regionId` that is
     * reachable from `startHex`.
     *
     * The BFS seeds itself with `startHex` *and* its immediate neighbours so
     * that clicking just outside the painted area still triggers the erase (the
     * eraser tool records the last erased hex, which may be a neighbour of the
     * visually clicked cell).
     *
     * Only hexes that belong to the specified region are removed; hexes in
     * other regions are left untouched.  If the region becomes empty after the
     * erase it is removed from `data.borders` entirely.
     *
     * @param startHex - Hex coordinate that seeds the flood-fill.
     * @param regionId - Id of the border region to erase from.
     */
    floodEraseBorderSegment(startHex: any, regionId: number): void {
        const v = this.view;
        const region = v.data.borders.find((r: any) => r.id === regionId);
        if (!region) return;

        const regionHexSet = new Set(region.hexes.map((h: any) => `${h.q}_${h.r}`));
        const toRemove = new Set<string>();
        const visited = new Set<string>();

        const queue: any[] = [startHex, ...getHexNeighbors(startHex)];

        while (queue.length > 0) {
            const hex = queue.shift();
            const key = `${hex.q}_${hex.r}`;
            if (visited.has(key)) continue;
            visited.add(key);

            if (!regionHexSet.has(key)) continue;

            toRemove.add(key);
            getHexNeighbors(hex).forEach((n: any) => queue.push(n));
        }

        region.hexes = region.hexes.filter((h: any) => !toRemove.has(`${h.q}_${h.r}`));

        if (region.hexes.length === 0) {
            v.data.borders = v.data.borders.filter((r: any) => r.id !== regionId);
        }
    }
}
