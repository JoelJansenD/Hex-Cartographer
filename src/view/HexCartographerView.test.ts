import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { HexCartographerView } from './HexCartographerView';
import {
    DEFAULT_PALETTE, DEFAULT_PALETTE2,
    DEFAULT_MASTER_COLOR, DEFAULT_GRID_SIZE,
    DEFAULT_BORDER_DASHES, DEFAULT_BORDER_HIGHLIGHT_WIDTH,
    DEFAULT_RIVER_WIDTH, DEFAULT_ROAD_WIDTH, DEFAULT_PATH_DASHES,
    PATH_END_INSET,
    DEFAULT_TEXT_SIZE, DEFAULT_SHADOW_DISTANCE, DEFAULT_SHADOW_OPACITY,
    DEFAULT_TEXT_COLOR,
} from '../constants';

// ---------------------------------------------------------------------------
// Environment stubs
// HexCartographerView reads 'window' and 'navigator' in its constructor.
// ---------------------------------------------------------------------------

beforeAll(() => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', { maxTouchPoints: 0 });
});
afterAll(() => {
    vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockLeaf = {} as any;
const mockPlugin = { settings: { exportWidth: 1024 } } as any;

function makeView() {
    return new HexCartographerView(mockLeaf, mockPlugin);
}

// ---------------------------------------------------------------------------
// ItemView metadata
// ---------------------------------------------------------------------------

describe('HexCartographerView — metadata', () => {
    it('getViewType returns hex-cartographer', () => {
        const v = makeView();
        expect(v.getViewType()).toBe('hex-cartographer');
    });

    it('getIcon returns map', () => {
        const v = makeView();
        expect(v.getIcon()).toBe('map');
    });

    it('getDisplayText returns Hex Cartographer when no file is set', () => {
        const v = makeView();
        expect(v.getDisplayText()).toBe('Hex Cartographer');
    });

    it('getDisplayText returns the map name when a file is set', () => {
        const v = makeView();
        v.file = { basename: 'MyMap.hexcartographer', path: 'MyMap.hexcartographer.md' } as any;
        expect(v.getDisplayText()).toBe('MyMap');
    });

    it('getState returns file: null when no file', () => {
        const v = makeView();
        expect(v.getState()).toEqual({ file: null });
    });

    it('getState returns file path when a file is set', () => {
        const v = makeView();
        v.file = { path: 'maps/dungeon.hexcartographer.md', basename: 'dungeon.hexcartographer' } as any;
        expect(v.getState()).toEqual({ file: 'maps/dungeon.hexcartographer.md' });
    });
});

// ---------------------------------------------------------------------------
// Constructor — default state
// ---------------------------------------------------------------------------

describe('HexCartographerView — constructor defaults', () => {
    let v: HexCartographerView;

    beforeEach(() => { v = makeView(); });

    it('file is null', () => { expect(v.file).toBeNull(); });

    it('data.hexes is empty', () => { expect(v.data.hexes).toEqual({}); });
    it('data.rivers is empty array', () => { expect(v.data.rivers).toEqual([]); });
    it('data.roads is empty array', () => { expect(v.data.roads).toEqual([]); });
    it('data.texts is empty array', () => { expect(v.data.texts).toEqual([]); });
    it('data.borders is empty array', () => { expect(v.data.borders).toEqual([]); });
    it('data.gridSize matches constant', () => { expect(v.data.gridSize).toBe(DEFAULT_GRID_SIZE); });
    it('data.zoom defaults to 1', () => { expect(v.data.zoom).toBe(1); });

    it('editMode is false', () => { expect(v.editMode).toBe(false); });
    it('drawMode is pen', () => { expect(v.drawMode).toBe('pen'); });
    it('currentToolGroup is null', () => { expect(v.currentToolGroup).toBeNull(); });
    it('hexOrientation is false', () => { expect(v.hexOrientation).toBe(false); });

    it('masterColor matches constant', () => { expect(v.masterColor).toBe(DEFAULT_MASTER_COLOR); });
    it('colorPalette matches DEFAULT_PALETTE', () => { expect(v.colorPalette).toEqual(DEFAULT_PALETTE); });
    it('colorPalette2 matches DEFAULT_PALETTE2', () => { expect(v.colorPalette2).toEqual(DEFAULT_PALETTE2); });
    it('activeColorSlot is 0', () => { expect(v.activeColorSlot).toBe(0); });
    it('hexColorColor is the first palette entry', () => { expect(v.hexColorColor).toBe(DEFAULT_PALETTE[0]); });

    it('borderSettings.dashes matches constant', () => { expect(v.borderSettings.dashes).toBe(DEFAULT_BORDER_DASHES); });
    it('borderSettings.activeRegionId is null', () => { expect(v.borderSettings.activeRegionId).toBeNull(); });
    it('borderSettings.visible is true', () => { expect(v.borderSettings.visible).toBe(true); });
    it('borderHighlightWidth matches constant', () => { expect(v.borderHighlightWidth).toBe(DEFAULT_BORDER_HIGHLIGHT_WIDTH); });
    it('borderPickMode is false', () => { expect(v.borderPickMode).toBe(false); });

    it('riverSettings.width matches constant', () => { expect(v.riverSettings.width).toBe(DEFAULT_RIVER_WIDTH); });
    it('riverSettings.editMode is false', () => { expect(v.riverSettings.editMode).toBe(false); });
    it('roadSettings.width matches constant', () => { expect(v.roadSettings.width).toBe(DEFAULT_ROAD_WIDTH); });

    it('pathDashes matches constant', () => { expect(v.pathDashes).toBe(DEFAULT_PATH_DASHES); });
    it('pathPickMode is false', () => { expect(v.pathPickMode).toBe(false); });
    it('pathEndInset matches constant', () => { expect(v.pathEndInset).toBe(PATH_END_INSET); });

    it('lastUsedTextSize matches constant', () => { expect(v.lastUsedTextSize).toBe(DEFAULT_TEXT_SIZE); });
    it('lastUsedTextColor matches constant', () => { expect(v.lastUsedTextColor).toBe(DEFAULT_TEXT_COLOR); });
    it('lastUsedTextOutline is true', () => { expect(v.lastUsedTextOutline).toBe(true); });
    it('lastUsedTextBold is false', () => { expect(v.lastUsedTextBold).toBe(false); });
    it('lastUsedTextShadow is false', () => { expect(v.lastUsedTextShadow).toBe(false); });
    it('lastUsedTextShadowDistance matches constant', () => { expect(v.lastUsedTextShadowDistance).toBe(DEFAULT_SHADOW_DISTANCE); });
    it('lastUsedTextShadowOpatown matches constant', () => { expect(v.lastUsedTextShadowOpatown).toBe(DEFAULT_SHADOW_OPACITY); });

    it('patternData is null', () => { expect(v.patternData).toBeNull(); });
    it('patternSourceHex is null', () => { expect(v.patternSourceHex).toBeNull(); });
    it('patternPickMode is false', () => { expect(v.patternPickMode).toBe(false); });
    it('colorPickMode is false', () => { expect(v.colorPickMode).toBe(false); });

    it('isMouseDown is false', () => { expect(v.isMouseDown).toBe(false); });
    it('isDraggingMap is false', () => { expect(v.isDraggingMap).toBe(false); });
    it('isReloading is false', () => { expect(v.isReloading).toBe(false); });
    it('isSaving is false', () => { expect(v.isSaving).toBe(false); });
    it('saveTimeout is null', () => { expect(v.saveTimeout).toBeNull(); });
    it('draggedText is null', () => { expect(v.draggedText).toBeNull(); });
    it('lastHex is null', () => { expect(v.lastHex).toBeNull(); });
    it('lastErasedHex is null', () => { expect(v.lastErasedHex).toBeNull(); });
    it('riverDragIndex is null', () => { expect(v.riverDragIndex).toBeNull(); });
    it('roadDragIndex is null', () => { expect(v.roadDragIndex).toBeNull(); });

    it('toolConfigs has four symbol groups', () => {
        expect(Object.keys(v.toolConfigs)).toEqual(expect.arrayContaining(['grass', 'tree', 'mountain', 'building']));
    });

    it('each toolConfig has variants', () => {
        expect(v.toolConfigs.tree.variants.length).toBeGreaterThan(0);
        expect(v.toolConfigs.mountain.variants.length).toBeGreaterThan(0);
    });

    it('plugin reference is stored', () => { expect(v.plugin).toBe(mockPlugin); });
});

// ---------------------------------------------------------------------------
// Subsystem delegation
// ---------------------------------------------------------------------------

describe('HexCartographerView — delegation', () => {
    let v: HexCartographerView;

    beforeEach(() => { v = makeView(); });

    it('render() delegates to renderManager.render', () => {
        const spy = vi.spyOn(v.renderManager, 'render').mockImplementation(() => {});
        v.render();
        expect(spy).toHaveBeenCalledOnce();
    });

    it('requestSave() delegates to persistence.requestSave', () => {
        const spy = vi.spyOn(v.persistence, 'requestSave').mockImplementation(() => {});
        v.requestSave();
        expect(spy).toHaveBeenCalledOnce();
    });

    it('fitMapToView() delegates to camera.fit', () => {
        const spy = vi.spyOn(v.camera, 'fit').mockImplementation(() => {});
        v.fitMapToView();
        expect(spy).toHaveBeenCalledOnce();
    });

    it('rebuildToolbar() delegates to toolbarBuilder.rebuildToolbar', () => {
        const spy = vi.spyOn(v.toolbarBuilder, 'rebuildToolbar').mockImplementation(() => {});
        v.rebuildToolbar();
        expect(spy).toHaveBeenCalledOnce();
    });

    it('paintHex(hex) delegates to paintTools.paintHex', () => {
        const spy = vi.spyOn(v.paintTools, 'paintHex').mockImplementation(() => {});
        v.paintHex({ q: 1, r: 2 });
        expect(spy).toHaveBeenCalledWith({ q: 1, r: 2 });
    });

    it('handleEraser(hex, x, y) delegates to paintTools.handleEraser', () => {
        const spy = vi.spyOn(v.paintTools, 'handleEraser').mockImplementation(() => {});
        v.handleEraser({ q: 0, r: 0 }, 10, 20);
        expect(spy).toHaveBeenCalledWith({ q: 0, r: 0 }, 10, 20);
    });

    it('handleEraserFlood(hex) delegates to paintTools.handleEraserFlood', () => {
        const spy = vi.spyOn(v.paintTools, 'handleEraserFlood').mockImplementation(() => {});
        v.handleEraserFlood({ q: 3, r: 4 });
        expect(spy).toHaveBeenCalledWith({ q: 3, r: 4 });
    });

    it('handleFillTool(hex) delegates to paintTools.handleFillTool', () => {
        const spy = vi.spyOn(v.paintTools, 'handleFillTool').mockImplementation(() => {});
        v.handleFillTool({ q: 5, r: 6 });
        expect(spy).toHaveBeenCalledWith({ q: 5, r: 6 });
    });

    it('addBorderHex(hex) delegates to borderTools.addBorderHex', () => {
        const spy = vi.spyOn(v.borderTools, 'addBorderHex').mockImplementation(() => {});
        v.addBorderHex({ q: 0, r: 1 });
        expect(spy).toHaveBeenCalledWith({ q: 0, r: 1 });
    });

    it('exitPathEditMode() delegates to pathTools.exitPathEditMode', () => {
        const spy = vi.spyOn(v.pathTools, 'exitPathEditMode').mockImplementation(() => {});
        v.exitPathEditMode();
        expect(spy).toHaveBeenCalledOnce();
    });

    it('getTextAt(x, y) delegates to inputController.getTextAt', () => {
        const spy = vi.spyOn(v.inputController, 'getTextAt').mockReturnValue(null);
        v.getTextAt(10, 20);
        expect(spy).toHaveBeenCalledWith(10, 20);
    });
});

// ---------------------------------------------------------------------------
// Hex math helpers
// ---------------------------------------------------------------------------

describe('HexCartographerView — hex math helpers', () => {
    let v: HexCartographerView;

    beforeEach(() => { v = makeView(); });

    it('hexDistance returns 0 for the same hex', () => {
        expect(v.hexDistance({ q: 2, r: -1 }, { q: 2, r: -1 })).toBe(0);
    });

    it('hexDistance returns correct distance for adjacent hexes', () => {
        expect(v.hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
    });

    it('hexDistance returns correct distance for non-adjacent hexes', () => {
        expect(v.hexDistance({ q: 0, r: 0 }, { q: 3, r: -3 })).toBe(3);
    });

    it('hexLerp at t=0 returns the start hex', () => {
        const r = v.hexLerp({ q: 0, r: 0 }, { q: 4, r: -4 }, 0);
        expect(r).toMatchObject({ q: 0, r: 0 });
    });

    it('hexLerp at t=1 returns the end hex', () => {
        const r = v.hexLerp({ q: 0, r: 0 }, { q: 4, r: -4 }, 1);
        expect(r).toMatchObject({ q: 4, r: -4 });
    });

    it('getHexNeighbors returns 6 neighbors', () => {
        const neighbours = v.getHexNeighbors({ q: 0, r: 0 });
        expect(neighbours).toHaveLength(6);
    });

    it('hexToPixel returns pixel coordinates', () => {
        const pos = v.hexToPixel({ q: 0, r: 0 });
        expect(typeof pos.x).toBe('number');
        expect(typeof pos.y).toBe('number');
    });

    it('pixelToHex is the inverse of hexToPixel (round-trip)', () => {
        const original = { q: 3, r: -2 };
        const px = v.hexToPixel(original);
        const back = v.pixelToHex(px.x, px.y);
        expect(back.q).toBe(original.q);
        expect(back.r).toBe(original.r);
    });

    it('calculateHexPath returns an array', () => {
        const segs = v.calculateHexPath({ q: 0, r: 0 }, { q: 3, r: 0 }, 2);
        expect(Array.isArray(segs)).toBe(true);
    });
});
