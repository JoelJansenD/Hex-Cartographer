import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolbarBuilder } from './ToolbarBuilder';

// ---------------------------------------------------------------------------
// Constants (mirror src/constants.ts values used in updateToolbarState)
// ---------------------------------------------------------------------------

const PICKER_ACTIVE_BG = '#4A9EFF';
const BUTTON_BG_DEFAULT = '#ffffff';
const ACTIVE_BORDER = '3px solid #4A9EFF';
const ACTIVE_BOX_SHADOW = '0 0 8px #4A9EFF66';

// ---------------------------------------------------------------------------
// Helpers — minimal tool configs (mirrors initToolConfigs structure)
// ---------------------------------------------------------------------------

function makeToolConfigs() {
    const group = (variants: { id: string }[], currentVariant: string, symbolColor: string) => ({
        variants: variants.map(v => ({ ...v, label: v.id, icon: 'circle' })),
        currentVariant,
        symbolColor,
        backgroundColor: '#ffffff',
        backgroundEnabled: false,
    });
    return {
        grass:    group([{ id: 'question' }], 'question', '#228B22'),
        tree:     group([{ id: 'tree' }],     'tree',     '#228B22'),
        mountain: group([{ id: 'mountain' }], 'mountain', '#5D4037'),
        building: group([{ id: 'house' }],    'house',    '#CD6155'),
    };
}

// ---------------------------------------------------------------------------
// Helpers — mock DOM elements
// ---------------------------------------------------------------------------

/** A minimal button-like mock with trackable style and classList. */
function makeBtn(dataset: Record<string, string> = {}) {
    return {
        dataset,
        style: { background: '', border: '', boxShadow: '', color: '', opacity: '', display: '' },
        classList: { toggle: vi.fn() },
        setAttribute: vi.fn(),
        innerHTML: '',
        value: '',
    };
}

/** A minimal input-like mock. */
function makeInput(value = '') {
    return {
        style: { width: '' },
        value,
        addEventListener: vi.fn(),
    };
}

/**
 * Builds a mock toolbar whose `querySelectorAll` returns the provided buttons
 * filtered by selector, and `querySelector` finds a single button by attribute
 * selector `[data-tool-group="X"]` or `[data-tool-group-wrapper="X"]`.
 */
function makeToolbar(buttons: ReturnType<typeof makeBtn>[] = [], slots: any[] = []) {
    return {
        querySelectorAll: vi.fn((selector: string) => {
            if (selector === '[data-draw-mode]')
                return buttons.filter(b => 'drawMode' in b.dataset);
            if (selector === '[data-tool-group]')
                return buttons.filter(b => 'toolGroup' in b.dataset);
            if (selector === '.hex-color-slot')
                return slots;
            return [];
        }),
        querySelector: vi.fn((selector: string) => {
            const attrMatch = selector.match(/\[data-tool-group="([^"]+)"\]/);
            if (attrMatch) return buttons.find(b => b.dataset.toolGroup === attrMatch[1]) ?? null;
            const wrapMatch = selector.match(/\[data-tool-group-wrapper="([^"]+)"\]/);
            if (wrapMatch) return buttons.find(b => b.dataset.toolGroupWrapper === wrapMatch[1]) ?? null;
            return null;
        }),
        empty: vi.fn(),
    };
}

/** Minimal view with all fields read by updateToolbarState / recalcToolbarWidths. */
function makeView(overrides: Record<string, any> = {}) {
    return {
        editMode: false,
        drawMode: 'pen',
        currentToolGroup: null as string | null,
        hexColorColor: '#ff0000',
        pathPickMode: false,
        borderPickMode: false,
        pathPickPending: null as any,
        toolConfigs: makeToolConfigs() as any,
        colorPalette: [] as string[],
        colorPalette2: [] as string[],
        // settings
        riverSettings: { width: 3, editMode: false },
        roadSettings: { width: 2, editMode: false },
        borderSettings: { dashes: 5, activeRegionId: null as number | null, visible: true, pickedHex: null },
        // cached element refs (null = absent)
        editModeBtn: null as any,
        editContent: null as any,
        borderVisBtn: null as any,
        riverWidthInput: null as any,
        roadWidthInput: null as any,
        pathPickerBtn: null as any,
        borderPickerBtn: null as any,
        borderDashesInput: null as any,
        // for recalcToolbarWidths
        riverBtn: null as any,
        roadBtn: null as any,
        pathDashesInput: null as any,
        borderBtn: null as any,
        // collaborators
        containerEl: { querySelector: vi.fn(() => null) },
        render: vi.fn(),
        requestSave: vi.fn(),
        ...overrides,
    };
}

// ===========================================================================
// initToolConfigs()
// ===========================================================================

describe('ToolbarBuilder.initToolConfigs()', () => {
    let view: ReturnType<typeof makeView>;
    let tb: ToolbarBuilder;

    beforeEach(() => {
        view = makeView();
        tb = new ToolbarBuilder(view);
    });

    it('creates all four tool groups', () => {
        tb.initToolConfigs();
        expect(view.toolConfigs).toHaveProperty('grass');
        expect(view.toolConfigs).toHaveProperty('tree');
        expect(view.toolConfigs).toHaveProperty('mountain');
        expect(view.toolConfigs).toHaveProperty('building');
    });

    it('grass group has 6 variants', () => {
        tb.initToolConfigs();
        expect(view.toolConfigs.grass.variants).toHaveLength(6);
    });

    it('tree group has 6 variants', () => {
        tb.initToolConfigs();
        expect(view.toolConfigs.tree.variants).toHaveLength(6);
    });

    it('mountain group has 2 variants', () => {
        tb.initToolConfigs();
        expect(view.toolConfigs.mountain.variants).toHaveLength(2);
    });

    it('building group has 11 variants', () => {
        tb.initToolConfigs();
        expect(view.toolConfigs.building.variants).toHaveLength(11);
    });

    it('default currentVariant for grass is "question"', () => {
        tb.initToolConfigs();
        expect(view.toolConfigs.grass.currentVariant).toBe('question');
    });

    it('default currentVariant for tree is "tree"', () => {
        tb.initToolConfigs();
        expect(view.toolConfigs.tree.currentVariant).toBe('tree');
    });

    it('default currentVariant for mountain is "mountain"', () => {
        tb.initToolConfigs();
        expect(view.toolConfigs.mountain.currentVariant).toBe('mountain');
    });

    it('default currentVariant for building is "house"', () => {
        tb.initToolConfigs();
        expect(view.toolConfigs.building.currentVariant).toBe('house');
    });

    it('preserves existing currentVariant when toolConfigs already set', () => {
        view.toolConfigs = { grass: { currentVariant: 'pirateskull' } };
        tb.initToolConfigs();
        expect(view.toolConfigs.grass.currentVariant).toBe('pirateskull');
    });

    it('preserves existing symbolColor', () => {
        view.toolConfigs = { tree: { symbolColor: '#123456' } };
        tb.initToolConfigs();
        expect(view.toolConfigs.tree.symbolColor).toBe('#123456');
    });

    it('preserves existing backgroundEnabled', () => {
        view.toolConfigs = { mountain: { backgroundEnabled: true } };
        tb.initToolConfigs();
        expect(view.toolConfigs.mountain.backgroundEnabled).toBe(true);
    });

    it('preserves existing backgroundColor', () => {
        view.toolConfigs = { building: { backgroundColor: '#aabbcc' } };
        tb.initToolConfigs();
        expect(view.toolConfigs.building.backgroundColor).toBe('#aabbcc');
    });

    it('all variants have id, label and icon properties', () => {
        tb.initToolConfigs();
        for (const group of Object.values(view.toolConfigs) as any[]) {
            for (const v of group.variants) {
                expect(v).toHaveProperty('id');
                expect(v).toHaveProperty('label');
                expect(v).toHaveProperty('icon');
            }
        }
    });
});

// ===========================================================================
// makeInputInteractive()
// ===========================================================================

describe('ToolbarBuilder.makeInputInteractive()', () => {
    it('registers stopPropagation listeners for mousedown, keydown and pointerdown', () => {
        const view = makeView();
        const tb = new ToolbarBuilder(view);
        const input = makeInput();
        tb.makeInputInteractive(input);

        const events = input.addEventListener.mock.calls.map((c: any[]) => c[0]);
        expect(events).toContain('mousedown');
        expect(events).toContain('keydown');
        expect(events).toContain('pointerdown');
        expect(input.addEventListener).toHaveBeenCalledTimes(3);
    });

    it('each listener calls stopPropagation on the event', () => {
        const view = makeView();
        const tb = new ToolbarBuilder(view);
        const input = makeInput();
        tb.makeInputInteractive(input);

        for (const [, handler] of input.addEventListener.mock.calls) {
            const e = { stopPropagation: vi.fn() };
            handler(e);
            expect(e.stopPropagation).toHaveBeenCalledOnce();
        }
    });
});

// ===========================================================================
// recalcToolbarWidths()
// ===========================================================================

describe('ToolbarBuilder.recalcToolbarWidths()', () => {
    it('sets riverWidthInput.style.width to riverBtn.offsetWidth', () => {
        const view = makeView({
            riverBtn: { offsetWidth: 36 },
            roadBtn: { offsetWidth: 40 },
            riverWidthInput: makeInput(),
            roadWidthInput: makeInput(),
        });
        new ToolbarBuilder(view).recalcToolbarWidths();
        expect(view.riverWidthInput.style.width).toBe('36px');
    });

    it('sets roadWidthInput.style.width to roadBtn.offsetWidth', () => {
        const view = makeView({
            riverBtn: { offsetWidth: 36 },
            roadBtn: { offsetWidth: 40 },
            riverWidthInput: makeInput(),
            roadWidthInput: makeInput(),
        });
        new ToolbarBuilder(view).recalcToolbarWidths();
        expect(view.roadWidthInput.style.width).toBe('40px');
    });

    it('sets pathDashesInput.style.width to pathPickerBtn.offsetWidth', () => {
        const view = makeView({
            riverBtn: { offsetWidth: 36 },
            roadBtn: { offsetWidth: 40 },
            riverWidthInput: makeInput(),
            roadWidthInput: makeInput(),
            pathPickerBtn: { offsetWidth: 32 },
            pathDashesInput: makeInput(),
        });
        new ToolbarBuilder(view).recalcToolbarWidths();
        expect(view.pathDashesInput.style.width).toBe('32px');
    });

    it('sets borderDashesInput.style.width to borderBtn.offsetWidth', () => {
        const view = makeView({
            borderBtn: { offsetWidth: 34 },
            borderDashesInput: makeInput(),
        });
        new ToolbarBuilder(view).recalcToolbarWidths();
        expect(view.borderDashesInput.style.width).toBe('34px');
    });

    it('is a no-op when button refs are absent', () => {
        // Should not throw
        expect(() => new ToolbarBuilder(makeView()).recalcToolbarWidths()).not.toThrow();
    });
});

// ===========================================================================
// updateToolbarState() — edit mode
// ===========================================================================

describe('ToolbarBuilder.updateToolbarState() – edit-mode button', () => {
    it('gives editModeBtn PICKER_ACTIVE_BG when editMode is true', () => {
        const view = makeView({ editMode: true, editModeBtn: makeBtn() });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar());
        expect(view.editModeBtn.style.background).toBe(PICKER_ACTIVE_BG);
    });

    it('gives editModeBtn BUTTON_BG_DEFAULT when editMode is false', () => {
        const view = makeView({ editMode: false, editModeBtn: makeBtn() });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar());
        expect(view.editModeBtn.style.background).toBe(BUTTON_BG_DEFAULT);
    });

    it('sets active border and shadow when editMode is true', () => {
        const view = makeView({ editMode: true, editModeBtn: makeBtn() });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar());
        expect(view.editModeBtn.style.border).toBe(ACTIVE_BORDER);
        expect(view.editModeBtn.style.boxShadow).toBe(ACTIVE_BOX_SHADOW);
    });

    it('clears border and shadow when editMode is false', () => {
        const view = makeView({ editMode: false, editModeBtn: makeBtn() });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar());
        expect(view.editModeBtn.style.border).toBe('');
        expect(view.editModeBtn.style.boxShadow).toBe('');
    });

    it('shows editContent when editMode is true', () => {
        const content = { style: { display: 'none' } };
        const view = makeView({ editMode: true, editContent: content });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar());
        expect(content.style.display).toBe('contents');
    });

    it('hides editContent when editMode is false', () => {
        const content = { style: { display: 'contents' } };
        const view = makeView({ editMode: false, editContent: content });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar());
        expect(content.style.display).toBe('none');
    });
});

// ===========================================================================
// updateToolbarState() — width inputs
// ===========================================================================

describe('ToolbarBuilder.updateToolbarState() – width inputs', () => {
    it('syncs riverWidthInput.value from riverSettings.width', () => {
        const input = makeInput();
        const view = makeView({ riverWidthInput: input, riverSettings: { width: 7, editMode: false } });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar());
        expect(input.value).toBe('7');
    });

    it('syncs roadWidthInput.value from roadSettings.width', () => {
        const input = makeInput();
        const view = makeView({ roadWidthInput: input, roadSettings: { width: 4, editMode: false } });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar());
        expect(input.value).toBe('4');
    });

    it('syncs borderDashesInput.value from borderSettings.dashes', () => {
        const input = makeInput();
        const view = makeView({
            borderDashesInput: input,
            borderSettings: { dashes: 9, activeRegionId: null, visible: true, pickedHex: null },
        });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar());
        expect(input.value).toBe('9');
    });
});

// ===========================================================================
// updateToolbarState() — draw-mode buttons
// ===========================================================================

describe('ToolbarBuilder.updateToolbarState() – draw-mode buttons', () => {
    it('marks the active draw-mode button with PICKER_ACTIVE_BG', () => {
        const fillBtn = makeBtn({ drawMode: 'fill' });
        const eraserBtn = makeBtn({ drawMode: 'eraser' });
        const view = makeView({ drawMode: 'fill' });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar([fillBtn, eraserBtn]));
        expect(fillBtn.style.background).toBe(PICKER_ACTIVE_BG);
    });

    it('resets inactive draw-mode buttons to BUTTON_BG_DEFAULT', () => {
        const fillBtn = makeBtn({ drawMode: 'fill' });
        const eraserBtn = makeBtn({ drawMode: 'eraser' });
        const view = makeView({ drawMode: 'fill' });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar([fillBtn, eraserBtn]));
        expect(eraserBtn.style.background).toBe(BUTTON_BG_DEFAULT);
    });

    it('applies ACTIVE_BORDER to the active draw-mode button', () => {
        const fillBtn = makeBtn({ drawMode: 'fill' });
        const view = makeView({ drawMode: 'fill' });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar([fillBtn]));
        expect(fillBtn.style.border).toBe(ACTIVE_BORDER);
        expect(fillBtn.style.boxShadow).toBe(ACTIVE_BOX_SHADOW);
    });

    it('clears border from inactive draw-mode buttons', () => {
        const eraserBtn = makeBtn({ drawMode: 'eraser' });
        const view = makeView({ drawMode: 'fill' });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar([eraserBtn]));
        expect(eraserBtn.style.border).toBe('');
    });
});

// ===========================================================================
// updateToolbarState() — tool-group buttons (non-symbol groups)
// ===========================================================================

describe('ToolbarBuilder.updateToolbarState() – non-symbol tool-group buttons', () => {
    it('marks the active tool-group button', () => {
        const hexBtn = makeBtn({ toolGroup: 'hexcolor' });
        const textBtn = makeBtn({ toolGroup: 'text' });
        const view = makeView({ currentToolGroup: 'hexcolor' });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar([hexBtn, textBtn]));
        expect(hexBtn.classList.toggle).toHaveBeenCalledWith('active', true);
        expect(textBtn.classList.toggle).toHaveBeenCalledWith('active', false);
    });

    it('sets hexcolor button color to hexColorColor', () => {
        const hexBtn = makeBtn({ toolGroup: 'hexcolor' });
        const view = makeView({ currentToolGroup: 'hexcolor', hexColorColor: '#00ff00' });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar([hexBtn]));
        expect(hexBtn.style.color).toBe('#00ff00');
    });

    it('applies ACTIVE_BORDER to the active tool-group button', () => {
        const riverBtn = makeBtn({ toolGroup: 'river' });
        const view = makeView({ currentToolGroup: 'river' });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar([riverBtn]));
        expect(riverBtn.style.border).toBe(ACTIVE_BORDER);
    });

    it('applies ACTIVE_BORDER to pending path-pick buttons without making them active', () => {
        const riverBtn = makeBtn({ toolGroup: 'river' });
        const view = makeView({
            currentToolGroup: null,
            pathPickPending: { river: {}, road: {} },
        });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar([riverBtn]));
        expect(riverBtn.classList.toggle).toHaveBeenCalledWith('active', false);
        expect(riverBtn.style.border).toBe(ACTIVE_BORDER);
    });
});

// ===========================================================================
// updateToolbarState() — border visibility button
// ===========================================================================

describe('ToolbarBuilder.updateToolbarState() – border visibility button', () => {
    it('sets opacity to 1 when borders are visible', () => {
        const visBtn = makeBtn();
        const view = makeView({
            borderVisBtn: visBtn,
            borderSettings: { dashes: 5, activeRegionId: null, visible: true, pickedHex: null },
        });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar());
        expect(visBtn.style.opacity).toBe('1');
    });

    it('sets opacity to 0.4 when borders are hidden', () => {
        const visBtn = makeBtn();
        const view = makeView({
            borderVisBtn: visBtn,
            borderSettings: { dashes: 5, activeRegionId: null, visible: false, pickedHex: null },
        });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar());
        expect(visBtn.style.opacity).toBe('0.4');
    });
});

// ===========================================================================
// updateToolbarState() — colour palette slots
// ===========================================================================

describe('ToolbarBuilder.updateToolbarState() – colour slots', () => {
    it('sets backgroundColor on each slot from the corresponding palette array', () => {
        const slot = {
            dataset: { paletteKey: 'colorPalette', paletteIndex: '1' },
            style: { backgroundColor: '' },
        };
        const view = makeView({ colorPalette: ['#aaa', '#bbb', '#ccc'] });
        new ToolbarBuilder(view).updateToolbarState(makeToolbar([], [slot]));
        expect(slot.style.backgroundColor).toBe('#bbb');
    });
});

// ===========================================================================
// rebuildToolbar()
// ===========================================================================

describe('ToolbarBuilder.rebuildToolbar()', () => {
    it('is a no-op when .hex-toolbar element is absent', () => {
        const view = makeView({ containerEl: { querySelector: vi.fn(() => null) } });
        expect(() => new ToolbarBuilder(view).rebuildToolbar()).not.toThrow();
    });

    it('calls empty, createToolbar and updateToolbarState on the toolbar element', () => {
        const toolbar = makeToolbar();
        const view = makeView({ editMode: false, containerEl: { querySelector: vi.fn(() => toolbar) } });
        const tb = new ToolbarBuilder(view);
        const spyCreate = vi.spyOn(tb, 'createToolbar').mockImplementation(() => {});
        const spyUpdate = vi.spyOn(tb, 'updateToolbarState').mockImplementation(() => {});

        tb.rebuildToolbar();

        expect(toolbar.empty).toHaveBeenCalledOnce();
        expect(spyCreate).toHaveBeenCalledWith(toolbar);
        expect(spyUpdate).toHaveBeenCalledWith(toolbar);
    });

    it('calls recalcToolbarWidths when editMode is true', () => {
        const toolbar = makeToolbar();
        const view = makeView({ editMode: true, containerEl: { querySelector: vi.fn(() => toolbar) } });
        const tb = new ToolbarBuilder(view);
        vi.spyOn(tb, 'createToolbar').mockImplementation(() => {});
        vi.spyOn(tb, 'updateToolbarState').mockImplementation(() => {});
        const spyRecalc = vi.spyOn(tb, 'recalcToolbarWidths').mockImplementation(() => {});

        tb.rebuildToolbar();

        expect(spyRecalc).toHaveBeenCalledOnce();
    });

    it('does not call recalcToolbarWidths when editMode is false', () => {
        const toolbar = makeToolbar();
        const view = makeView({ editMode: false, containerEl: { querySelector: vi.fn(() => toolbar) } });
        const tb = new ToolbarBuilder(view);
        vi.spyOn(tb, 'createToolbar').mockImplementation(() => {});
        vi.spyOn(tb, 'updateToolbarState').mockImplementation(() => {});
        const spyRecalc = vi.spyOn(tb, 'recalcToolbarWidths').mockImplementation(() => {});

        tb.rebuildToolbar();

        expect(spyRecalc).not.toHaveBeenCalled();
    });
});
