import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PathTools } from './PathTools';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePath(id: number, waypoints: any[], overrides: Record<string, any> = {}) {
    return { id, color: '#0000ff', width: 3, dashes: 1, waypoints, ...overrides };
}

function makeView(overrides: Record<string, any> = {}) {
    return {
        data: {
            rivers: [] as any[],
            roads:  [] as any[],
            borders: [] as any[],
            hexes:  {} as Record<string, any>,
        },
        riverSettings: { width: 5, activeRiverId: null as number | null, editMode: false, insertAfter: null as number | null },
        roadSettings:  { width: 3, activeRoadId:  null as number | null, editMode: false, insertAfter: null as number | null },
        borderSettings: { activeRegionId: null as number | null, pickedHex: null, dashes: 1, visible: true },
        pathDashes: 1,
        pathPickMode: false,
        pathPickPending: null as any,
        patternPickMode: false,
        borderPickMode: false,
        colorPickMode: false,
        drawMode: 'pen',
        masterColor: '#000000',
        hexColorColor: '#ffffff',
        lastToolGroup: null as string | null,
        currentToolGroup: null as string | null,
        riverDragIndex: null as any,
        roadDragIndex:  null as any,
        lastWaypointClick: null as any,
        toolConfigs: {} as Record<string, any>,
        // UI stubs — all null; PathTools guards every access
        masterColorInput: null,
        masterColorBtn:   null,
        riverWidthInput:  null,
        roadWidthInput:   null,
        pathDashesInput:  null,
        pathPickerBtn:    null,
        patternPickerBtn: null,
        borderPickerBtn:  null,
        colorEyedropperBtn: null,
        containerEl: { querySelector: () => null },
        render: vi.fn(),
        requestSave: vi.fn(),
        updateToolbarState: vi.fn(),
        ...overrides,
    } as any;
}

// ---------------------------------------------------------------------------
// erasePathElement()
// ---------------------------------------------------------------------------

describe('PathTools.erasePathElement()', () => {
    let view: ReturnType<typeof makeView>;
    let pt: PathTools;

    beforeEach(() => {
        view = makeView();
        pt = new PathTools(view);
    });

    it('removes the matching waypoint from every path', () => {
        const paths = [makePath(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }])];
        pt.erasePathElement(paths, { q: 1, r: 0 });
        expect(paths[0].waypoints.map((w: any) => w.q)).toEqual([0, 2]);
    });

    it('leaves the remaining two endpoints connected after erasing the middle waypoint', () => {
        // [A, B, C] erase B → [A, C]. A has a right-connection to C, C has a left, so neither
        // is isolated and the path survives with exactly 2 waypoints.
        const paths = [makePath(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }])];
        pt.erasePathElement(paths, { q: 1, r: 0 });
        expect(paths).toHaveLength(1);
        expect(paths[0].waypoints).toHaveLength(2);
        expect(paths[0].waypoints[0]).toEqual({ q: 0, r: 0 });
        expect(paths[0].waypoints[1]).toEqual({ q: 2, r: 0 });
    });

    it('keeps the path when erasing only one endpoint leaves a valid segment', () => {
        // path: A–B–C; erase A → B–C survives
        const paths = [makePath(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }])];
        pt.erasePathElement(paths, { q: 0, r: 0 });
        expect(paths).toHaveLength(1);
        expect(paths[0].waypoints).toHaveLength(2);
        expect(paths[0].waypoints[0]).toEqual({ q: 1, r: 0 });
    });

    it('splits a segment by erasing an interpolated hex, pruning unreachable endpoints', () => {
        // Path A–B–C: [0,0]–[2,0]–[4,0]. Erase (1,0), which is on segment A→B.
        // B gets break:true; A becomes isolated (no break-free right) and is pruned.
        // B's break flag is removed once it becomes the first waypoint.
        // Result: path [B, C] = [{q:2,r:0}, {q:4,r:0}].
        const paths = [makePath(1, [{ q: 0, r: 0 }, { q: 2, r: 0 }, { q: 4, r: 0 }])];
        pt.erasePathElement(paths, { q: 1, r: 0 });
        expect(paths).toHaveLength(1);
        expect(paths[0].waypoints).toHaveLength(2);
        expect(paths[0].waypoints[0]).toEqual({ q: 2, r: 0 }); // break flag stripped
        expect(paths[0].waypoints[1]).toEqual({ q: 4, r: 0 });
    });

    it('removes a path that ends up with fewer than 2 waypoints', () => {
        const paths = [makePath(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }])];
        pt.erasePathElement(paths, { q: 0, r: 0 });
        expect(paths).toHaveLength(0);
    });

    it('strips the break flag from the first waypoint after isolation pruning', () => {
        // Same as the segment-split test: erasing (1,0) from [A, B, C] causes A to be pruned
        // and B (which received break:true) to become waypoints[0]. The final cleanup pass
        // must delete that leading break flag so B is a clean endpoint.
        const paths = [makePath(1, [{ q: 0, r: 0 }, { q: 2, r: 0 }, { q: 4, r: 0 }])];
        pt.erasePathElement(paths, { q: 1, r: 0 });
        expect(paths[0].waypoints[0]).not.toHaveProperty('break');
    });

    it('does nothing when paths is falsy', () => {
        expect(() => pt.erasePathElement(null as any, { q: 0, r: 0 })).not.toThrow();
    });

    it('handles an empty paths array gracefully', () => {
        const paths: any[] = [];
        expect(() => pt.erasePathElement(paths, { q: 0, r: 0 })).not.toThrow();
        expect(paths).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// findRiverAtHex() / findRoadAtHex()
// ---------------------------------------------------------------------------

describe('PathTools.findRiverAtHex()', () => {
    let view: ReturnType<typeof makeView>;
    let pt: PathTools;

    beforeEach(() => {
        view = makeView();
        pt = new PathTools(view);
    });

    it('returns null when data.rivers is empty', () => {
        expect(pt.findRiverAtHex({ q: 0, r: 0 })).toBeNull();
    });

    it('finds a river whose waypoint matches exactly', () => {
        const river = makePath(1, [{ q: 0, r: 0 }, { q: 3, r: 0 }]);
        view.data.rivers.push(river);
        expect(pt.findRiverAtHex({ q: 0, r: 0 })).toBe(river);
    });

    it('finds a river by a hex on its interpolated segment', () => {
        const river = makePath(1, [{ q: 0, r: 0 }, { q: 3, r: 0 }]);
        view.data.rivers.push(river);
        // hex (2,0) lies on the path between (0,0) and (3,0)
        expect(pt.findRiverAtHex({ q: 2, r: 0 })).toBe(river);
    });

    it('returns null when the hex is not on any river', () => {
        view.data.rivers.push(makePath(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }]));
        expect(pt.findRiverAtHex({ q: 5, r: 5 })).toBeNull();
    });

    it('returns null when data.rivers is null/undefined', () => {
        (view.data as any).rivers = null;
        expect(pt.findRiverAtHex({ q: 0, r: 0 })).toBeNull();
    });
});

describe('PathTools.findRoadAtHex()', () => {
    let view: ReturnType<typeof makeView>;
    let pt: PathTools;

    beforeEach(() => {
        view = makeView();
        pt = new PathTools(view);
    });

    it('returns null when data.roads is empty', () => {
        expect(pt.findRoadAtHex({ q: 0, r: 0 })).toBeNull();
    });

    it('finds a road whose waypoint matches exactly', () => {
        const road = makePath(1, [{ q: 1, r: 1 }, { q: 2, r: 1 }]);
        view.data.roads.push(road);
        expect(pt.findRoadAtHex({ q: 1, r: 1 })).toBe(road);
    });

    it('finds a road by a hex on its interpolated segment', () => {
        const road = makePath(1, [{ q: 0, r: 0 }, { q: 4, r: 0 }]);
        view.data.roads.push(road);
        expect(pt.findRoadAtHex({ q: 2, r: 0 })).toBe(road);
    });

    it('returns null for a miss', () => {
        view.data.roads.push(makePath(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }]));
        expect(pt.findRoadAtHex({ q: 9, r: 9 })).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// addRiverWaypoint()
// ---------------------------------------------------------------------------

describe('PathTools.addRiverWaypoint()', () => {
    let view: ReturnType<typeof makeView>;
    let pt: PathTools;

    beforeEach(() => {
        view = makeView();
        pt = new PathTools(view);
    });

    it('creates a new river and appends the first waypoint', () => {
        pt.addRiverWaypoint({ q: 0, r: 0 });
        expect(view.data.rivers).toHaveLength(1);
        expect(view.data.rivers[0].waypoints).toEqual([{ q: 0, r: 0 }]);
    });

    it('assigns an id of 1 to the first river', () => {
        pt.addRiverWaypoint({ q: 0, r: 0 });
        expect(view.data.rivers[0].id).toBe(1);
    });

    it('uses the next available id when rivers already exist', () => {
        view.data.rivers.push(makePath(3, [{ q: 0, r: 0 }, { q: 1, r: 0 }]));
        pt.addRiverWaypoint({ q: 2, r: 0 });
        expect(view.data.rivers[1].id).toBe(4);
    });

    it('sets riverSettings.editMode to true and tracks the active id', () => {
        pt.addRiverWaypoint({ q: 0, r: 0 });
        expect(view.riverSettings.editMode).toBe(true);
        expect(view.riverSettings.activeRiverId).toBe(1);
    });

    it('appends successive waypoints to the active river', () => {
        pt.addRiverWaypoint({ q: 0, r: 0 });
        pt.addRiverWaypoint({ q: 1, r: 0 });
        expect(view.data.rivers[0].waypoints).toHaveLength(2);
        expect(view.data.rivers[0].waypoints[1]).toEqual({ q: 1, r: 0 });
    });

    it('sets riverDragIndex when clicking an existing waypoint', () => {
        pt.addRiverWaypoint({ q: 0, r: 0 });
        pt.addRiverWaypoint({ q: 1, r: 0 });
        // Click on the first waypoint again
        pt.addRiverWaypoint({ q: 0, r: 0 });
        expect(view.riverDragIndex).not.toBeNull();
        expect(view.riverDragIndex.origQ).toBe(0);
        expect(view.riverDragIndex.origR).toBe(0);
    });

    it('inserts at insertAfter position when not at end', () => {
        // Build river A–B–C, set insertAfter = 0 (at A), click D
        view.data.rivers.push(makePath(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }]));
        view.riverSettings.activeRiverId = 1;
        view.riverSettings.editMode = true;
        view.riverSettings.insertAfter = 0; // insertAfter A (index 0), not at end

        pt.addRiverWaypoint({ q: 5, r: 5 });

        // Should have pushed a break copy of A then D
        const wps = view.data.rivers[0].waypoints;
        expect(wps.some((w: any) => w.q === 5 && w.r === 5)).toBe(true);
        expect(wps.some((w: any) => w.break === true)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// addRoadWaypoint()
// ---------------------------------------------------------------------------

describe('PathTools.addRoadWaypoint()', () => {
    let view: ReturnType<typeof makeView>;
    let pt: PathTools;

    beforeEach(() => {
        view = makeView();
        pt = new PathTools(view);
    });

    it('creates a new road and appends the first waypoint', () => {
        pt.addRoadWaypoint({ q: 3, r: 3 });
        expect(view.data.roads).toHaveLength(1);
        expect(view.data.roads[0].waypoints).toEqual([{ q: 3, r: 3 }]);
    });

    it('sets roadSettings.editMode to true and tracks the active id', () => {
        pt.addRoadWaypoint({ q: 0, r: 0 });
        expect(view.roadSettings.editMode).toBe(true);
        expect(view.roadSettings.activeRoadId).toBe(1);
    });

    it('appends successive waypoints to the active road', () => {
        pt.addRoadWaypoint({ q: 0, r: 0 });
        pt.addRoadWaypoint({ q: 2, r: 0 });
        expect(view.data.roads[0].waypoints).toHaveLength(2);
    });

    it('sets roadDragIndex when clicking an existing waypoint', () => {
        pt.addRoadWaypoint({ q: 0, r: 0 });
        pt.addRoadWaypoint({ q: 1, r: 0 });
        pt.addRoadWaypoint({ q: 0, r: 0 }); // re-click existing
        expect(view.roadDragIndex).not.toBeNull();
        expect(view.roadDragIndex.origQ).toBe(0);
    });

    it('inherits the dashes setting from view.pathDashes', () => {
        view.pathDashes = 4;
        pt.addRoadWaypoint({ q: 0, r: 0 });
        expect(view.data.roads[0].dashes).toBe(4);
    });
});

// ---------------------------------------------------------------------------
// handleWaypointClick()
// ---------------------------------------------------------------------------

describe('PathTools.handleWaypointClick()', () => {
    let view: ReturnType<typeof makeView>;
    let pt: PathTools;

    beforeEach(() => {
        view = makeView();
        pt = new PathTools(view);
    });

    it('sets insertAfter to the clicked index on first click', () => {
        const path = makePath(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }]);
        const settings = { insertAfter: null as number | null };
        pt.handleWaypointClick(path, settings, 2);
        expect(settings.insertAfter).toBe(2);
    });

    it('records lastWaypointClick with the previous insertAfter value', () => {
        const path = makePath(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }]);
        const settings = { insertAfter: 0 as number | null };
        pt.handleWaypointClick(path, settings, 1);
        expect(view.lastWaypointClick).toMatchObject({
            pathId: 1,
            idx: 1,
            previousInsertAfter: 0,
        });
    });

    it('calls render and requestSave on single click', () => {
        const path = makePath(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }]);
        pt.handleWaypointClick(path, { insertAfter: null }, 0);
        expect(view.render).toHaveBeenCalledOnce();
        expect(view.requestSave).toHaveBeenCalledOnce();
    });

    it('inserts a break+waypoint pair on double-click when anchor differs from target', () => {
        const path = makePath(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }]);
        const settings = { insertAfter: 0 as number | null };

        // Simulate: previous state has insertAfter=0 pointing at waypoint[0]
        // First click on waypoint index 2
        pt.handleWaypointClick(path, settings, 2);
        // lastWaypointClick.previousInsertAfter = 0, idx = 2

        // Second click on the same index within 400ms
        pt.handleWaypointClick(path, settings, 2);

        // A break copy of waypoint[0] and a copy of waypoint[2] should have been pushed
        const wps = path.waypoints;
        expect(wps.some((w: any) => w.break === true)).toBe(true);
        expect(wps).toHaveLength(5); // original 3 + break + copy
        expect(view.lastWaypointClick).toBeNull();
    });

    it('does not insert a break pair when double-clicking with no previous anchor', () => {
        const path = makePath(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }]);
        const settings = { insertAfter: null as number | null };

        pt.handleWaypointClick(path, settings, 0);
        // lastWaypointClick.previousInsertAfter = null
        pt.handleWaypointClick(path, settings, 0);

        // No break pair should have been inserted
        expect(path.waypoints).toHaveLength(2);
        expect(view.lastWaypointClick).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// exitPathEditMode()
// ---------------------------------------------------------------------------

describe('PathTools.exitPathEditMode()', () => {
    let view: ReturnType<typeof makeView>;
    let pt: PathTools;

    beforeEach(() => {
        view = makeView();
        pt = new PathTools(view);
    });

    it('clears riverSettings.editMode and activeRiverId', () => {
        view.data.rivers.push(makePath(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }]));
        view.riverSettings.editMode = true;
        view.riverSettings.activeRiverId = 1;
        pt.exitPathEditMode();
        expect(view.riverSettings.editMode).toBe(false);
        expect(view.riverSettings.activeRiverId).toBeNull();
    });

    it('removes a river with fewer than 2 waypoints', () => {
        view.data.rivers.push(makePath(1, [{ q: 0, r: 0 }]));
        view.riverSettings.editMode = true;
        view.riverSettings.activeRiverId = 1;
        pt.exitPathEditMode();
        expect(view.data.rivers).toHaveLength(0);
    });

    it('keeps a river that has 2 or more waypoints', () => {
        view.data.rivers.push(makePath(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }]));
        view.riverSettings.editMode = true;
        view.riverSettings.activeRiverId = 1;
        pt.exitPathEditMode();
        expect(view.data.rivers).toHaveLength(1);
    });

    it('clears roadSettings.editMode and activeRoadId', () => {
        view.data.roads.push(makePath(2, [{ q: 0, r: 0 }, { q: 1, r: 0 }]));
        view.roadSettings.editMode = true;
        view.roadSettings.activeRoadId = 2;
        pt.exitPathEditMode();
        expect(view.roadSettings.editMode).toBe(false);
        expect(view.roadSettings.activeRoadId).toBeNull();
    });

    it('clears pathPickMode', () => {
        view.pathPickMode = true;
        pt.exitPathEditMode();
        expect(view.pathPickMode).toBe(false);
    });

    it('clears patternPickMode', () => {
        view.patternPickMode = true;
        pt.exitPathEditMode();
        expect(view.patternPickMode).toBe(false);
    });

    it('clears borderPickMode', () => {
        view.borderPickMode = true;
        pt.exitPathEditMode();
        expect(view.borderPickMode).toBe(false);
    });

    it('clears colorPickMode', () => {
        view.colorPickMode = true;
        pt.exitPathEditMode();
        expect(view.colorPickMode).toBe(false);
    });

    it('clears an active border region and calls render', () => {
        view.borderSettings.activeRegionId = 5;
        view.borderSettings.pickedHex = { q: 1, r: 0 };
        pt.exitPathEditMode();
        expect(view.borderSettings.activeRegionId).toBeNull();
        expect(view.borderSettings.pickedHex).toBeNull();
        expect(view.render).toHaveBeenCalled();
    });

    it('resets drawMode from eraser to pen when clearing active border', () => {
        view.borderSettings.activeRegionId = 5;
        view.drawMode = 'eraser';
        pt.exitPathEditMode();
        expect(view.drawMode).toBe('pen');
    });

    it('calls render when something changed', () => {
        view.riverSettings.editMode = true;
        view.riverSettings.activeRiverId = 99;
        // no rivers in data.rivers — that's fine; findIndex returns -1
        pt.exitPathEditMode();
        expect(view.render).toHaveBeenCalled();
    });

    it('does not call render when nothing was in edit mode', () => {
        pt.exitPathEditMode();
        expect(view.render).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// updateActivePathColor()
// ---------------------------------------------------------------------------

describe('PathTools.updateActivePathColor()', () => {
    let view: ReturnType<typeof makeView>;
    let pt: PathTools;

    beforeEach(() => {
        view = makeView();
        pt = new PathTools(view);
    });

    it('updates the active river color to masterColor', () => {
        const river = makePath(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }]);
        view.data.rivers.push(river);
        view.riverSettings.editMode = true;
        view.riverSettings.activeRiverId = 1;
        view.masterColor = '#ff0000';
        pt.updateActivePathColor();
        expect(river.color).toBe('#ff0000');
        expect(view.render).toHaveBeenCalled();
        expect(view.requestSave).toHaveBeenCalled();
    });

    it('updates the active road color to masterColor', () => {
        const road = makePath(2, [{ q: 0, r: 0 }, { q: 1, r: 0 }]);
        view.data.roads.push(road);
        view.roadSettings.editMode = true;
        view.roadSettings.activeRoadId = 2;
        view.masterColor = '#00ff00';
        pt.updateActivePathColor();
        expect(road.color).toBe('#00ff00');
    });

    it('updates the active border region color to masterColor', () => {
        const region = { id: 3, color: '#000', hexes: [] as any[] };
        view.data.borders.push(region);
        view.borderSettings.activeRegionId = 3;
        view.currentToolGroup = 'border';
        view.masterColor = '#0000ff';
        pt.updateActivePathColor();
        expect(region.color).toBe('#0000ff');
    });

    it('updates hexColorColor when currentToolGroup is hexcolor', () => {
        view.currentToolGroup = 'hexcolor';
        view.masterColor = '#abcdef';
        pt.updateActivePathColor();
        expect(view.hexColorColor).toBe('#abcdef');
    });

    it('updates symbolColor on the matching toolConfig', () => {
        view.currentToolGroup = 'forest';
        view.toolConfigs['forest'] = { symbolColor: '#000', currentVariant: 'tree' };
        view.masterColor = '#112233';
        pt.updateActivePathColor();
        expect(view.toolConfigs['forest'].symbolColor).toBe('#112233');
    });

    it('does nothing when no path or border is active', () => {
        view.masterColor = '#aabbcc';
        pt.updateActivePathColor();
        expect(view.render).not.toHaveBeenCalled();
        expect(view.requestSave).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// completePathPick()
// ---------------------------------------------------------------------------

describe('PathTools.completePathPick()', () => {
    let view: ReturnType<typeof makeView>;
    let pt: PathTools;

    beforeEach(() => {
        view = makeView();
        pt = new PathTools(view);
    });

    it('activates river edit mode for type="river"', () => {
        const river = makePath(7, [{ q: 0, r: 0 }, { q: 1, r: 0 }], { width: 6, dashes: 2, color: '#ff0000' });
        pt.completePathPick(river, 'river');
        expect(view.currentToolGroup).toBe('river');
        expect(view.riverSettings.editMode).toBe(true);
        expect(view.riverSettings.activeRiverId).toBe(7);
        expect(view.riverSettings.width).toBe(6);
        expect(view.riverSettings.insertAfter).toBe(1); // length-1
        expect(view.masterColor).toBe('#ff0000');
        expect(view.pathDashes).toBe(2);
    });

    it('activates road edit mode for type="road"', () => {
        const road = makePath(4, [{ q: 0, r: 0 }, { q: 2, r: 0 }, { q: 4, r: 0 }], { width: 2, dashes: 3, color: '#00ff00' });
        pt.completePathPick(road, 'road');
        expect(view.currentToolGroup).toBe('road');
        expect(view.roadSettings.editMode).toBe(true);
        expect(view.roadSettings.activeRoadId).toBe(4);
        expect(view.roadSettings.insertAfter).toBe(2); // length-1
        expect(view.masterColor).toBe('#00ff00');
        expect(view.pathDashes).toBe(3);
    });

    it('clears pathPickMode and sets drawMode to pen', () => {
        view.pathPickMode = true;
        const river = makePath(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }]);
        pt.completePathPick(river, 'river');
        expect(view.pathPickMode).toBe(false);
        expect(view.drawMode).toBe('pen');
    });

    it('calls render and requestSave', () => {
        const road = makePath(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }]);
        pt.completePathPick(road, 'road');
        expect(view.render).toHaveBeenCalled();
        expect(view.requestSave).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// pickPathAtHex()
// ---------------------------------------------------------------------------

describe('PathTools.pickPathAtHex()', () => {
    let view: ReturnType<typeof makeView>;
    let pt: PathTools;

    beforeEach(() => {
        view = makeView();
        pt = new PathTools(view);
    });

    it('calls completePathPick for river when only a river is found', () => {
        view.data.rivers.push(makePath(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }]));
        pt.pickPathAtHex({ q: 0, r: 0 });
        expect(view.currentToolGroup).toBe('river');
        expect(view.riverSettings.editMode).toBe(true);
    });

    it('calls completePathPick for road when only a road is found', () => {
        view.data.roads.push(makePath(2, [{ q: 3, r: 3 }, { q: 4, r: 3 }]));
        pt.pickPathAtHex({ q: 3, r: 3 });
        expect(view.currentToolGroup).toBe('road');
        expect(view.roadSettings.editMode).toBe(true);
    });

    it('sets pathPickPending when both river and road are at the same hex', () => {
        view.data.rivers.push(makePath(1, [{ q: 0, r: 0 }, { q: 1, r: 0 }]));
        view.data.roads.push(makePath(2,  [{ q: 0, r: 0 }, { q: 1, r: 0 }]));
        pt.pickPathAtHex({ q: 0, r: 0 });
        expect(view.pathPickPending).not.toBeNull();
        expect(view.pathPickPending.river).toBeDefined();
        expect(view.pathPickPending.road).toBeDefined();
    });

    it('restores lastToolGroup and clears pathPickMode when no path found', () => {
        view.lastToolGroup = 'forest';
        view.pathPickMode = true;
        pt.pickPathAtHex({ q: 9, r: 9 });
        expect(view.currentToolGroup).toBe('forest');
        expect(view.lastToolGroup).toBeNull();
        expect(view.pathPickMode).toBe(false);
        expect(view.drawMode).toBe('pen');
    });

    it('restores masterColor from hexColorColor when lastToolGroup is hexcolor', () => {
        view.lastToolGroup = 'hexcolor';
        view.hexColorColor = '#aabbcc';
        pt.pickPathAtHex({ q: 9, r: 9 });
        expect(view.masterColor).toBe('#aabbcc');
    });

    it('restores masterColor from toolConfigs when lastToolGroup is a symbol tool', () => {
        view.lastToolGroup = 'forest';
        view.toolConfigs['forest'] = { symbolColor: '#112233', currentVariant: 'tree' };
        pt.pickPathAtHex({ q: 9, r: 9 });
        expect(view.masterColor).toBe('#112233');
    });
});
