import { describe, it, expect, vi } from 'vitest';
import { CameraController } from './CameraController';
import { MIN_ZOOM, MAX_ZOOM } from '../constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCanvas(width = 800, height = 600) {
    return {
        width,
        height,
        clientWidth: width,
        clientHeight: height,
        getBoundingClientRect: () => ({ left: 10, top: 20 }),
    };
}

function makeView(overrides: Record<string, any> = {}) {
    return {
        data: {
            hexes: {} as Record<string, any>,
            texts: [] as any[],
            borders: [] as any[],
            gridSize: 40,
            zoom: 1,
            offX: 0,
            offY: 0,
            settings: undefined as any,
            centerWorldX: undefined as any,
            centerWorldY: undefined as any,
        },
        canvas: makeCanvas(),
        textCanvas: null as any,
        _initialResizeDone: false,
        render: vi.fn(),
        requestSave: vi.fn(),
        hexToPixel: vi.fn((hex: any) => ({ x: hex.q * 100, y: hex.r * 100 })),
        ...overrides,
    } as any;
}

// ---------------------------------------------------------------------------
// getWorldCoords()
// ---------------------------------------------------------------------------

describe('CameraController.getWorldCoords()', () => {
    it('converts pointer client coordinates to world space', () => {
        const view = makeView();
        view.data.offX = 100;
        view.data.offY = 50;
        view.data.zoom = 2;
        const camera = new CameraController(view);

        // canvas rect left=10, top=20
        // canvasX = clientX(110) - left(10) = 100; worldX = (100 - offX(100)) / zoom(2) = 0
        // canvasY = clientY(70)  - top(20)  = 50;  worldY = (50  - offY(50))  / zoom(2) = 0
        const world = camera.getWorldCoords({ clientX: 110, clientY: 70 });
        expect(world.x).toBe(0);
        expect(world.y).toBe(0);
    });

    it('accounts for sub-unit zoom', () => {
        const view = makeView();
        view.data.zoom = 0.5;
        view.data.offX = 0;
        view.data.offY = 0;
        const camera = new CameraController(view);

        // canvasX = 60 - 10 = 50; worldX = 50 / 0.5 = 100
        // canvasY = 70 - 20 = 50; worldY = 50 / 0.5 = 100
        const world = camera.getWorldCoords({ clientX: 60, clientY: 70 });
        expect(world.x).toBe(100);
        expect(world.y).toBe(100);
    });
});

// ---------------------------------------------------------------------------
// getHexBounds()
// ---------------------------------------------------------------------------

describe('CameraController.getHexBounds()', () => {
    it('returns null for an empty map', () => {
        const camera = new CameraController(makeView());
        expect(camera.getHexBounds()).toBeNull();
    });

    it('returns correct bounds for a single hex', () => {
        const view = makeView();
        view.data.hexes['2_3'] = { q: 2, r: 3 };
        const camera = new CameraController(view);
        expect(camera.getHexBounds()).toEqual({ minQ: 2, maxQ: 2, minR: 3, maxR: 3 });
    });

    it('spans multiple hexes', () => {
        const view = makeView();
        view.data.hexes['-1_0'] = { q: -1, r: 0 };
        view.data.hexes['3_5']  = { q: 3,  r: 5 };
        view.data.hexes['0_2']  = { q: 0,  r: 2 };
        const camera = new CameraController(view);
        expect(camera.getHexBounds()).toEqual({ minQ: -1, maxQ: 3, minR: 0, maxR: 5 });
    });
});

// ---------------------------------------------------------------------------
// zoomAtPoint()
// ---------------------------------------------------------------------------

describe('CameraController.zoomAtPoint()', () => {
    it('doubles zoom and adjusts offsets to keep the pivot point fixed', () => {
        const view = makeView();
        view.data.zoom = 1;
        view.data.offX = 0;
        view.data.offY = 0;
        const camera = new CameraController(view);

        const changed = camera.zoomAtPoint(2, 100, 100);
        expect(changed).toBe(true);
        expect(view.data.zoom).toBe(2);
        // worldX = (100 - 0) / 1 = 100; newOffX = 100 - 100*2 = -100
        expect(view.data.offX).toBe(-100);
        expect(view.data.offY).toBe(-100);
    });

    it('halves zoom correctly', () => {
        const view = makeView();
        view.data.zoom = 2;
        view.data.offX = -100;
        view.data.offY = -100;
        const camera = new CameraController(view);

        camera.zoomAtPoint(0.5, 100, 100);
        expect(view.data.zoom).toBe(1);
        // worldX = (100 - (-100)) / 2 = 100; newOffX = 100 - 100*1 = 0
        expect(view.data.offX).toBe(0);
        expect(view.data.offY).toBe(0);
    });

    it('returns false and leaves data unchanged when already at MIN_ZOOM', () => {
        const view = makeView();
        view.data.zoom = MIN_ZOOM;
        view.data.offX = 42;
        const camera = new CameraController(view);

        expect(camera.zoomAtPoint(0.5, 0, 0)).toBe(false);
        expect(view.data.zoom).toBe(MIN_ZOOM);
        expect(view.data.offX).toBe(42);
    });

    it('returns false and leaves data unchanged when already at MAX_ZOOM', () => {
        const view = makeView();
        view.data.zoom = MAX_ZOOM;
        view.data.offX = 7;
        const camera = new CameraController(view);

        expect(camera.zoomAtPoint(2, 0, 0)).toBe(false);
        expect(view.data.zoom).toBe(MAX_ZOOM);
        expect(view.data.offX).toBe(7);
    });
});

// ---------------------------------------------------------------------------
// fit()
// ---------------------------------------------------------------------------

describe('CameraController.fit()', () => {
    it('does not render when the map is empty', () => {
        const view = makeView();
        new CameraController(view).fit();
        expect(view.render).not.toHaveBeenCalled();
        expect(view.requestSave).not.toHaveBeenCalled();
    });

    it('sets zoom/offX/offY and calls render+requestSave when hexes exist', () => {
        const view = makeView();
        view.data.hexes['0_0'] = { q: 0, r: 0 };
        new CameraController(view).fit();
        expect(view.data.zoom).toBeGreaterThan(0);
        expect(view.render).toHaveBeenCalledOnce();
        expect(view.requestSave).toHaveBeenCalledOnce();
    });

    it('treats texts as content when no hexes are present', () => {
        const view = makeView();
        view.data.texts = [{ text: 'Hello', x: 200, y: 100, size: 16 }];
        new CameraController(view).fit();
        expect(view.render).toHaveBeenCalledOnce();
    });

    it('treats border-only hexes as content', () => {
        const view = makeView();
        view.data.borders = [{ hexes: [{ q: 1, r: 0 }] }];
        new CameraController(view).fit();
        expect(view.render).toHaveBeenCalledOnce();
    });
});

// ---------------------------------------------------------------------------
// resize()
// ---------------------------------------------------------------------------

describe('CameraController.resize()', () => {
    it('does nothing when canvas is absent', () => {
        const view = makeView();
        view.canvas = null;
        expect(() => new CameraController(view).resize()).not.toThrow();
        expect(view.render).not.toHaveBeenCalled();
    });

    it('centers the viewport on first resize when viewportSaved is falsy', () => {
        const view = makeView();
        view.canvas.clientWidth = 800;
        view.canvas.clientHeight = 600;
        new CameraController(view).resize();
        expect(view._initialResizeDone).toBe(true);
        expect(view.data.offX).toBe(400);
        expect(view.data.offY).toBe(300);
        expect(view.render).toHaveBeenCalled();
    });

    it('restores saved viewport on first resize when viewportSaved is true', () => {
        const view = makeView();
        view.canvas.clientWidth = 800;
        view.canvas.clientHeight = 600;
        view.data.settings = { viewportSaved: true };
        view.data.centerWorldX = 50;
        view.data.centerWorldY = 75;
        view.data.zoom = 2;
        new CameraController(view).resize();
        // offX = 400 - 50*2 = 300
        expect(view.data.offX).toBe(300);
        // offY = 300 - 75*2 = 150
        expect(view.data.offY).toBe(150);
    });

    it('does not override offsets on subsequent resizes', () => {
        const view = makeView();
        view._initialResizeDone = true;
        view.data.offX = 999;
        view.data.offY = 888;
        new CameraController(view).resize();
        expect(view.data.offX).toBe(999);
        expect(view.data.offY).toBe(888);
    });

    it('also resizes textCanvas when present', () => {
        const view = makeView();
        view.textCanvas = { clientWidth: 800, clientHeight: 600, width: 0, height: 0 };
        new CameraController(view).resize();
        expect(view.textCanvas.width).toBe(800);
        expect(view.textCanvas.height).toBe(600);
    });
});
