import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock TextInputModal before InputController is imported so the constructor
// spy is already in place when processInput runs.
vi.mock('../modals/TextInputModal', () => ({
    TextInputModal: vi.fn(function(this: any) {
        this.open = vi.fn();
    }),
}));

import { InputController } from './InputController';
import { TextInputModal } from '../modals/TextInputModal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal canvas 2-D context: font is settable, measureText returns width. */
function makeCtx(charWidth = 10) {
    return {
        font: '',
        measureText: vi.fn((text: string) => ({ width: text.length * charWidth })),
        getImageData: vi.fn(() => ({ data: [0, 0, 0, 0] })),
    };
}

/** Minimal event-target that records addEventListener calls. */
function makeTarget(extra: Record<string, any> = {}) {
    return {
        addEventListener: vi.fn(),
        focus: vi.fn(),
        style: { cursor: '', color: '', background: '', border: '', boxShadow: '', opacity: '' },
        title: '',
        width: 800,
        height: 600,
        getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0 })),
        querySelector: vi.fn(() => null),
        ...extra,
    };
}

function makeView(overrides: Record<string, any> = {}) {
    const canvas = makeTarget();
    const containerEl = makeTarget();
    return {
        // data
        data: {
            texts: [] as any[],
            hexes: {} as Record<string, any>,
            rivers: [] as any[],
            roads: [] as any[],
            borders: [] as any[],
            zoom: 1,
            offX: 0,
            offY: 0,
        },
        ctx: makeCtx(),
        canvas,
        containerEl,
        // tool state
        editMode: true,
        drawMode: 'pen',
        currentToolGroup: 'hexcolor',
        // text defaults
        lastUsedTextSize: 16,
        lastUsedTextColor: '#000000',
        lastUsedTextOutline: true,
        lastUsedTextBold: false,
        lastUsedTextShadow: false,
        lastUsedTextShadowDistance: 2,
        lastUsedTextShadowOpatown: 0.5,
        masterColor: '#ff0000',
        colorPalette: [] as string[],
        colorPalette2: [] as string[],
        // app / file
        app: { workspace: { openLinkText: vi.fn() } },
        file: { path: 'map.hexcartographer.md' },
        // collaborators
        historyManager: {
            pushIfNeeded: vi.fn(),
            push: vi.fn(),
            markPending: vi.fn(),
            dropLast: vi.fn(),
            undo: vi.fn(),
            redo: vi.fn(),
        },
        camera: { zoomAtPoint: vi.fn(() => false) },
        // coordinate helpers
        getWorldCoords: vi.fn(() => ({ x: 50, y: 50 })),
        pixelToHex: vi.fn(() => ({ q: 1, r: 0 })),
        // tool dispatch
        handleEraser: vi.fn(),
        handleEraserFlood: vi.fn(),
        handleFillTool: vi.fn(),
        addBorderHex: vi.fn(),
        addRoadWaypoint: vi.fn(),
        addRiverWaypoint: vi.fn(),
        paintHex: vi.fn(),
        pickPathAtHex: vi.fn(),
        handleWaypointClick: vi.fn(),
        updateActivePathColor: vi.fn(),
        updateToolbarState: vi.fn(),
        render: vi.fn(),
        requestSave: vi.fn(),
        // drag / gesture state
        isMouseDown: false,
        isDraggingMap: false,
        draggedText: null,
        mouseDownPos: null as any,
        startHex: null as any,
        lastHex: null as any,
        isRightMouseErasing: false,
        rightEraseLastHex: null as any,
        roadDragIndex: null as any,
        riverDragIndex: null as any,
        // settings
        roadSettings: { editMode: false, activeRoadId: null },
        riverSettings: { editMode: false, activeRiverId: null },
        borderSettings: { activeRegionId: null, pickedHex: null, visible: true, dashes: 1 },
        // pick modes
        colorPickMode: false,
        patternPickMode: false,
        borderPickMode: false,
        pathPickMode: false,
        // UI refs (all null — not exercised in unit tests)
        masterColorInput: null,
        masterColorBtn: null,
        colorEyedropperBtn: null,
        patternPickerBtn: null,
        borderPickerBtn: null,
        borderDashesInput: null,
        patternData: null,
        patternSourceHex: null,
        touchState: undefined as any,
        _rightClickLast: null,
        ...overrides,
    };
}

/** Synthetic pointer event with default coordinates. */
function makeEvent(overrides: Record<string, any> = {}) {
    return { clientX: 100, clientY: 100, button: 0, ...overrides };
}

// ---------------------------------------------------------------------------
// getTextAt()
// ---------------------------------------------------------------------------

describe('InputController.getTextAt()', () => {
    let view: ReturnType<typeof makeView>;
    let ic: InputController;

    beforeEach(() => {
        view = makeView();
        ic = new InputController(view);
    });

    it('returns null when data.texts is missing', () => {
        (view.data as any).texts = undefined;
        expect(ic.getTextAt(0, 0)).toBeNull();
    });

    it('returns null when texts array is empty', () => {
        expect(ic.getTextAt(0, 0)).toBeNull();
    });

    it('returns null when coords do not intersect any label', () => {
        // text at (100, 100), size 16, 2 chars → halfWidth 10
        // x-range: [85, 115], y-range: [84, 105]
        view.data.texts = [{ x: 100, y: 100, text: 'hi', size: 16, bold: false }];
        expect(ic.getTextAt(200, 200)).toBeNull();
    });

    it('returns the text whose bounding box contains the point', () => {
        view.data.texts = [{ x: 100, y: 100, text: 'hi', size: 16, bold: false }];
        // centre of the label → definite hit
        const hit = ic.getTextAt(100, 97);
        expect(hit).toBe(view.data.texts[0]);
    });

    it('hits at the left boundary (x = txt.x - halfWidth - 5)', () => {
        // 'hi' = 2 chars × 10px = 20px width → halfWidth = 10
        // left edge x = 100 - 10 - 5 = 85
        view.data.texts = [{ x: 100, y: 100, text: 'hi', size: 16, bold: false }];
        expect(ic.getTextAt(85, 97)).toBe(view.data.texts[0]);
    });

    it('misses just beyond the right boundary', () => {
        // right edge x = 100 + 10 + 5 = 115 → 116 should miss
        view.data.texts = [{ x: 100, y: 100, text: 'hi', size: 16, bold: false }];
        expect(ic.getTextAt(116, 97)).toBeNull();
    });

    it('hits at the top boundary (y = txt.y - height)', () => {
        // size=16 → top edge y = 100 - 16 = 84
        view.data.texts = [{ x: 100, y: 100, text: 'hi', size: 16, bold: false }];
        expect(ic.getTextAt(100, 84)).toBe(view.data.texts[0]);
    });

    it('misses just above the top boundary', () => {
        view.data.texts = [{ x: 100, y: 100, text: 'hi', size: 16, bold: false }];
        expect(ic.getTextAt(100, 83)).toBeNull();
    });

    it('hits at the bottom boundary (y = txt.y + 5)', () => {
        view.data.texts = [{ x: 100, y: 100, text: 'hi', size: 16, bold: false }];
        expect(ic.getTextAt(100, 105)).toBe(view.data.texts[0]);
    });

    it('misses just below the bottom boundary', () => {
        view.data.texts = [{ x: 100, y: 100, text: 'hi', size: 16, bold: false }];
        expect(ic.getTextAt(100, 106)).toBeNull();
    });

    it('uses size=16 as default height when txt.size is undefined', () => {
        view.data.texts = [{ x: 100, y: 100, text: 'hi', bold: false }]; // no size
        // default height 16 → top edge y = 84
        expect(ic.getTextAt(100, 84)).toBe(view.data.texts[0]);
        expect(ic.getTextAt(100, 83)).toBeNull();
    });

    it('prepends "bold " to the font string for bold labels', () => {
        view.data.texts = [{ x: 100, y: 100, text: 'hi', size: 14, bold: true }];
        ic.getTextAt(100, 95);
        expect(view.ctx.font).toMatch(/^bold /);
    });

    it('does not prepend "bold " for non-bold labels', () => {
        view.data.texts = [{ x: 100, y: 100, text: 'hi', size: 14, bold: false }];
        ic.getTextAt(100, 95);
        expect(view.ctx.font).not.toMatch(/^bold /);
    });

    it('returns the first matching text when multiple labels overlap', () => {
        const a = { x: 100, y: 100, text: 'hi', size: 16, bold: false };
        const b = { x: 100, y: 100, text: 'hi', size: 16, bold: false };
        view.data.texts = [a, b];
        expect(ic.getTextAt(100, 97)).toBe(a);
    });
});

// ---------------------------------------------------------------------------
// processInput()
// ---------------------------------------------------------------------------

describe('InputController.processInput()', () => {
    let view: ReturnType<typeof makeView>;
    let ic: InputController;

    beforeEach(() => {
        view = makeView();
        ic = new InputController(view);
        vi.mocked(TextInputModal).mockClear();
    });

    it('always calls historyManager.pushIfNeeded()', () => {
        ic.processInput(makeEvent(), true);
        expect(view.historyManager.pushIfNeeded).toHaveBeenCalledOnce();
    });

    it('rejects and warns for non-finite x coordinate', () => {
        view.getWorldCoords = vi.fn(() => ({ x: Infinity, y: 50 }));
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        ic.processInput(makeEvent(), true);
        expect(warn).toHaveBeenCalled();
        expect(view.paintHex).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it('rejects and warns for coordinate magnitude > 1e6', () => {
        view.getWorldCoords = vi.fn(() => ({ x: 2e6, y: 0 }));
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        ic.processInput(makeEvent(), true);
        expect(warn).toHaveBeenCalled();
        expect(view.paintHex).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it('opens TextInputModal when text tool, drawMode=none, isInitial, no existing text', () => {
        view.currentToolGroup = 'text';
        view.drawMode = 'none';
        view.data.texts = [];
        ic.processInput(makeEvent(), true);
        expect(TextInputModal).toHaveBeenCalledOnce();
    });

    it('does not open TextInputModal when existing text occupies the position', () => {
        view.currentToolGroup = 'text';
        view.drawMode = 'none';
        // getWorldCoords returns (50, 50); place a text that hits at (50, 50)
        view.data.texts = [{ x: 50, y: 50, text: 'hi', size: 16, bold: false }];
        ic.processInput(makeEvent(), true);
        expect(TextInputModal).not.toHaveBeenCalled();
    });

    it('does not open TextInputModal when isInitial is false (text tool drag)', () => {
        view.currentToolGroup = 'text';
        view.drawMode = 'none';
        view.data.texts = [];
        ic.processInput(makeEvent(), false);
        expect(TextInputModal).not.toHaveBeenCalled();
    });

    it('returns without dispatching when editMode is false', () => {
        view.editMode = false;
        ic.processInput(makeEvent(), true);
        expect(view.paintHex).not.toHaveBeenCalled();
        expect(view.handleEraser).not.toHaveBeenCalled();
    });

    it('returns without dispatching when drawMode is "none" (non-text tool)', () => {
        view.currentToolGroup = 'hexcolor';
        view.drawMode = 'none';
        ic.processInput(makeEvent(), true);
        expect(view.paintHex).not.toHaveBeenCalled();
        expect(view.handleEraser).not.toHaveBeenCalled();
    });

    it('calls handleEraser when drawMode is "eraser"', () => {
        view.drawMode = 'eraser';
        ic.processInput(makeEvent(), true);
        expect(view.handleEraser).toHaveBeenCalledOnce();
    });

    it('calls handleFillTool on initial press when drawMode is "fill"', () => {
        view.drawMode = 'fill';
        ic.processInput(makeEvent(), true);
        expect(view.handleFillTool).toHaveBeenCalledOnce();
    });

    it('does not call handleFillTool on drag (isInitial=false)', () => {
        view.drawMode = 'fill';
        ic.processInput(makeEvent(), false);
        expect(view.handleFillTool).not.toHaveBeenCalled();
    });

    it('calls addBorderHex when pen + currentToolGroup = "border"', () => {
        view.drawMode = 'pen';
        view.currentToolGroup = 'border';
        ic.processInput(makeEvent(), true);
        expect(view.addBorderHex).toHaveBeenCalledOnce();
    });

    it('calls addRoadWaypoint on initial press when pen + currentToolGroup = "road"', () => {
        view.drawMode = 'pen';
        view.currentToolGroup = 'road';
        ic.processInput(makeEvent(), true);
        expect(view.addRoadWaypoint).toHaveBeenCalledOnce();
    });

    it('does not call addRoadWaypoint on drag when pen + currentToolGroup = "road"', () => {
        view.drawMode = 'pen';
        view.currentToolGroup = 'road';
        ic.processInput(makeEvent(), false);
        expect(view.addRoadWaypoint).not.toHaveBeenCalled();
    });

    it('calls addRiverWaypoint on initial press when pen + currentToolGroup = "river"', () => {
        view.drawMode = 'pen';
        view.currentToolGroup = 'river';
        ic.processInput(makeEvent(), true);
        expect(view.addRiverWaypoint).toHaveBeenCalledOnce();
    });

    it('calls paintHex for a standard symbol tool (pen + non-path group)', () => {
        view.drawMode = 'pen';
        view.currentToolGroup = 'tree';
        ic.processInput(makeEvent(), true);
        expect(view.paintHex).toHaveBeenCalledOnce();
    });

    it('calls paintHex for hexcolor tool', () => {
        view.drawMode = 'pen';
        view.currentToolGroup = 'hexcolor';
        ic.processInput(makeEvent(), true);
        expect(view.paintHex).toHaveBeenCalledOnce();
    });

    it('does not call paintHex when currentToolGroup is "river"', () => {
        view.drawMode = 'pen';
        view.currentToolGroup = 'river';
        // isInitial=false → addRiverWaypoint is skipped, paintHex must also be skipped
        ic.processInput(makeEvent(), false);
        expect(view.paintHex).not.toHaveBeenCalled();
    });

    it('does not call paintHex when currentToolGroup is "text"', () => {
        view.drawMode = 'pen';
        view.currentToolGroup = 'text';
        ic.processInput(makeEvent(), true);
        expect(view.paintHex).not.toHaveBeenCalled();
    });

    it('passes the correct hex to the dispatched tool method', () => {
        const hex = { q: 3, r: -2 };
        view.pixelToHex = vi.fn(() => hex);
        view.drawMode = 'pen';
        view.currentToolGroup = 'hexcolor';
        ic.processInput(makeEvent(), true);
        expect(view.paintHex).toHaveBeenCalledWith(hex);
    });
});

// ---------------------------------------------------------------------------
// setupEventListeners()
// ---------------------------------------------------------------------------

describe('InputController.setupEventListeners()', () => {
    let view: ReturnType<typeof makeView>;
    let ic: InputController;

    beforeEach(() => {
        view = makeView();
        ic = new InputController(view);
        ic.setupEventListeners();
    });

    it('initialises view.touchState with default values', () => {
        expect(view.touchState).toBeDefined();
        expect(view.touchState.touches).toEqual([]);
        expect(view.touchState.isTwoFingerGesture).toBe(false);
        expect(view.touchState.pendingTouchStart).toBeNull();
        expect(view.touchState.hasMovedSinceStart).toBe(false);
        expect(view.touchState.lastTapTime).toBe(0);
        expect(view.touchState.lastTapHex).toBeNull();
        expect(view.touchState.touchStartTimeout).toBeNull();
    });

    it('registers a keydown listener on containerEl', () => {
        expect(view.containerEl.addEventListener).toHaveBeenCalledWith(
            'keydown', expect.any(Function)
        );
    });

    it('registers mousedown, contextmenu, dblclick, and wheel on canvas', () => {
        const calls = (view.canvas.addEventListener as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
        expect(calls).toContain('mousedown');
        expect(calls).toContain('contextmenu');
        expect(calls).toContain('dblclick');
        expect(calls).toContain('wheel');
    });

    it('registers touch listeners on canvas', () => {
        const calls = (view.canvas.addEventListener as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
        expect(calls).toContain('touchstart');
        expect(calls).toContain('touchmove');
        expect(calls).toContain('touchend');
        expect(calls).toContain('touchcancel');
    });

    it('registers mousemove, mouseup, and mouseleave on containerEl', () => {
        const calls = (view.containerEl.addEventListener as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
        expect(calls).toContain('mousemove');
        expect(calls).toContain('mouseup');
        expect(calls).toContain('mouseleave');
    });

    describe('keydown handler', () => {
        function fireKeydown(key: string, ctrlKey = true) {
            const calls = (view.containerEl.addEventListener as ReturnType<typeof vi.fn>).mock.calls;
            const [, handler] = calls.find(([type]) => type === 'keydown') ?? [];
            handler?.({ ctrlKey, metaKey: false, key, preventDefault: vi.fn() });
        }

        it('calls historyManager.undo() on Ctrl+Z', () => {
            fireKeydown('z');
            expect(view.historyManager.undo).toHaveBeenCalledOnce();
        });

        it('calls historyManager.redo() on Ctrl+Y', () => {
            fireKeydown('y');
            expect(view.historyManager.redo).toHaveBeenCalledOnce();
        });

        it('does not call undo/redo without modifier key', () => {
            fireKeydown('z', false);
            expect(view.historyManager.undo).not.toHaveBeenCalled();
        });
    });
});
