import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TFile } from 'obsidian';
import { PersistenceController } from './PersistenceController';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MINIMAL_MAP_JSON = JSON.stringify({
    hexes: {},
    rivers: [],
    roads: [],
    texts: [],
    borders: [],
    gridSize: 40,
    zoom: 1,
    offX: 0,
    offY: 0,
});

const MINIMAL_MAP_MARKDOWN = `\`\`\`json\n${MINIMAL_MAP_JSON}\n\`\`\``;

function makeFile(overrides: Partial<TFile> = {}): TFile {
    return Object.assign(new TFile(), { path: 'map.hexcartographer.md', basename: 'map.hexcartographer', ...overrides });
}

function makeView(overrides: Record<string, any> = {}) {
    return {
        file: null as TFile | null,
        isReloading: false,
        isSaving: false,
        saveTimeout: null as ReturnType<typeof setTimeout> | null,
        data: { hexes: {}, rivers: [], roads: [], texts: [], borders: [], gridSize: 40, zoom: 1, offX: 0, offY: 0 },
        canvas: null as any,
        containerEl: null as any,
        svgLoadPromise: null as any,
        svgSymbolsLoaded: false,
        svgLoader: {
            updateButtonIcons: vi.fn(),
            updateToolConfigDefaults: vi.fn(),
        },
        toolConfigs: {
            grass: { currentVariant: 0, symbolColor: '#aaa', backgroundColor: '#bbb', backgroundEnabled: false },
        },
        app: {
            vault: {
                read: vi.fn().mockResolvedValue(MINIMAL_MAP_MARKDOWN),
                modify: vi.fn().mockResolvedValue(undefined),
                adapter: { exists: vi.fn().mockResolvedValue(true) },
                getAbstractFileByPath: vi.fn().mockReturnValue(null),
            },
        },
        colorPalette: [] as string[],
        colorPalette2: [] as string[],
        activeColorSlot: 0,
        editMode: false,
        hexOrientation: false,
        currentToolGroup: null as string | null,
        drawMode: 'pen',
        masterColor: '#000000',
        masterColorInput: null as any,
        masterColorBtn: null as any,
        patternData: null as any,
        patternSourceHex: null as any,
        borderSettings: {} as any,
        riverSettings: {} as any,
        roadSettings: {} as any,
        hexColorColor: '#ffffff',
        lastUsedTextSize: 16,
        lastUsedTextOutline: true,
        lastUsedTextBold: false,
        lastUsedTextShadow: false,
        lastUsedTextShadowDistance: 2,
        lastUsedTextShadowOpatown: 0.5,
        _savedDrawMode: undefined as any,
        _savedToolGroup: undefined as any,
        render: vi.fn(),
        fitMapToView: vi.fn(),
        updateToolbarState: vi.fn(),
        recalcToolbarWidths: vi.fn(),
        ...overrides,
    } as any;
}

// ---------------------------------------------------------------------------
// requestSave()
// ---------------------------------------------------------------------------

describe('PersistenceController.requestSave()', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('schedules a save after 1 s', () => {
        const view = makeView();
        const pc = new PersistenceController(view);
        const saveSpy = vi.spyOn(pc, 'save').mockResolvedValue(undefined);

        pc.requestSave();
        expect(saveSpy).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1000);
        expect(saveSpy).toHaveBeenCalledOnce();
    });

    it('debounces — only the last call fires', () => {
        const view = makeView();
        const pc = new PersistenceController(view);
        const saveSpy = vi.spyOn(pc, 'save').mockResolvedValue(undefined);

        pc.requestSave();
        vi.advanceTimersByTime(500);
        pc.requestSave();
        vi.advanceTimersByTime(1000);

        expect(saveSpy).toHaveBeenCalledOnce();
    });

    it('stores the pending timer id on view.saveTimeout', () => {
        const view = makeView();
        const pc = new PersistenceController(view);
        vi.spyOn(pc, 'save').mockResolvedValue(undefined);

        pc.requestSave();
        expect(view.saveTimeout).not.toBeNull();
    });

    it('clears the timer after it fires', () => {
        const view = makeView();
        const pc = new PersistenceController(view);
        vi.spyOn(pc, 'save').mockResolvedValue(undefined);

        pc.requestSave();
        vi.advanceTimersByTime(1000);
        // timer has fired; a second requestSave should start a fresh timer
        const firstTimeout = view.saveTimeout;
        pc.requestSave();
        expect(view.saveTimeout).not.toBe(firstTimeout);
    });
});

// ---------------------------------------------------------------------------
// setState()
// ---------------------------------------------------------------------------

describe('PersistenceController.setState()', () => {
    it('does nothing when state has no file property', async () => {
        const view = makeView();
        const pc = new PersistenceController(view);
        const reloadSpy = vi.spyOn(pc, 'reload').mockResolvedValue(undefined);

        await pc.setState({});
        expect(reloadSpy).not.toHaveBeenCalled();
        expect(view.file).toBeNull();
    });

    it('does nothing when vault returns null for the path', async () => {
        const view = makeView();
        view.app.vault.getAbstractFileByPath = vi.fn().mockReturnValue(null);
        const pc = new PersistenceController(view);
        const reloadSpy = vi.spyOn(pc, 'reload').mockResolvedValue(undefined);

        await pc.setState({ file: 'some/path.hexcartographer.md' });
        expect(reloadSpy).not.toHaveBeenCalled();
        expect(view.file).toBeNull();
    });

    it('sets view.file and calls reload() when a TFile is returned', async () => {
        const view = makeView();
        const fakeFile = makeFile();
        view.app.vault.getAbstractFileByPath = vi.fn().mockReturnValue(fakeFile);
        const pc = new PersistenceController(view);
        const reloadSpy = vi.spyOn(pc, 'reload').mockResolvedValue(undefined);

        await pc.setState({ file: fakeFile.path });
        expect(view.file).toBe(fakeFile);
        expect(reloadSpy).toHaveBeenCalledOnce();
    });
});

// ---------------------------------------------------------------------------
// reload()
// ---------------------------------------------------------------------------

describe('PersistenceController.reload()', () => {
    it('returns immediately when view.file is null', async () => {
        const view = makeView();
        const pc = new PersistenceController(view);

        await pc.reload();
        expect(view.app.vault.read).not.toHaveBeenCalled();
    });

    it('returns immediately when already reloading', async () => {
        const view = makeView({ file: makeFile(), isReloading: true });
        const pc = new PersistenceController(view);

        await pc.reload();
        expect(view.app.vault.read).not.toHaveBeenCalled();
    });

    it('resets isReloading to false after success', async () => {
        const view = makeView({ file: makeFile() });
        const pc = new PersistenceController(view);

        await pc.reload();
        expect(view.isReloading).toBe(false);
    });

    it('resets isReloading to false after an error', async () => {
        const view = makeView({ file: makeFile() });
        view.app.vault.read = vi.fn().mockRejectedValue(new Error('disk error'));
        const pc = new PersistenceController(view);

        await pc.reload();
        expect(view.isReloading).toBe(false);
    });

    it('reads from vault using the current file', async () => {
        const file = makeFile();
        const view = makeView({ file });
        const pc = new PersistenceController(view);

        await pc.reload();
        expect(view.app.vault.read).toHaveBeenCalledWith(file);
    });

    it('applies colorPalette from settings', async () => {
        const palette = ['#ff0000', '#00ff00'];
        const mapWithSettings = JSON.stringify({
            hexes: {}, rivers: [], roads: [], texts: [], borders: [],
            gridSize: 40, zoom: 1, offX: 0, offY: 0,
            settings: { colorPalette: palette },
        });
        const view = makeView({ file: makeFile() });
        view.app.vault.read = vi.fn().mockResolvedValue(`\`\`\`json\n${mapWithSettings}\n\`\`\``);
        const pc = new PersistenceController(view);

        await pc.reload();
        expect(view.colorPalette).toEqual(palette);
    });

    it('applies editMode from settings', async () => {
        const mapWithSettings = JSON.stringify({
            hexes: {}, rivers: [], roads: [], texts: [], borders: [],
            gridSize: 40, zoom: 1, offX: 0, offY: 0,
            settings: { editMode: true },
        });
        const view = makeView({ file: makeFile() });
        view.app.vault.read = vi.fn().mockResolvedValue(`\`\`\`json\n${mapWithSettings}\n\`\`\``);
        const pc = new PersistenceController(view);

        await pc.reload();
        expect(view.editMode).toBe(true);
    });

    it('calls updateToolConfigDefaults when no toolConfigs in settings', async () => {
        const mapWithSettings = JSON.stringify({
            hexes: {}, rivers: [], roads: [], texts: [], borders: [],
            gridSize: 40, zoom: 1, offX: 0, offY: 0,
            settings: { editMode: false },
        });
        const view = makeView({ file: makeFile() });
        view.app.vault.read = vi.fn().mockResolvedValue(`\`\`\`json\n${mapWithSettings}\n\`\`\``);
        const pc = new PersistenceController(view);

        await pc.reload();
        expect(view.svgLoader.updateToolConfigDefaults).toHaveBeenCalled();
        expect(view.svgLoader.updateButtonIcons).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// save()
// ---------------------------------------------------------------------------

describe('PersistenceController.save()', () => {
    it('does nothing when view.file is null', async () => {
        const view = makeView();
        const pc = new PersistenceController(view);

        await pc.save();
        expect(view.app.vault.modify).not.toHaveBeenCalled();
    });

    it('does nothing when the file does not exist on disk', async () => {
        const view = makeView({ file: makeFile() });
        view.app.vault.adapter.exists = vi.fn().mockResolvedValue(false);
        const pc = new PersistenceController(view);

        await pc.save();
        expect(view.app.vault.modify).not.toHaveBeenCalled();
    });

    it('calls vault.modify with serialized content', async () => {
        const file = makeFile();
        const view = makeView({ file });
        const pc = new PersistenceController(view);

        await pc.save();
        expect(view.app.vault.modify).toHaveBeenCalledOnce();
        const [calledFile, calledContent] = view.app.vault.modify.mock.calls[0];
        expect(calledFile).toBe(file);
        expect(typeof calledContent).toBe('string');
    });

    it('resets isSaving to false after the 200 ms cooldown', async () => {
        vi.useFakeTimers();
        const file = makeFile();
        const view = makeView({ file });
        const pc = new PersistenceController(view);

        await pc.save();
        // isSaving is still true until the 200 ms setTimeout fires
        expect(view.isSaving).toBe(true);
        vi.advanceTimersByTime(200);
        expect(view.isSaving).toBe(false);
        vi.useRealTimers();
    });

    it('persists toolConfigs correctly', async () => {
        const file = makeFile();
        const view = makeView({ file });
        const pc = new PersistenceController(view);

        await pc.save();
        const content: string = view.app.vault.modify.mock.calls[0][1];
        expect(content).toContain('grass');
    });

    it('includes viewportSaved: true in the serialized settings', async () => {
        const file = makeFile({ path: 'mymap.hexcartographer.md', basename: 'mymap.hexcartographer' });
        const view = makeView({ file, canvas: { width: 800, height: 600 } });
        view.data.zoom = 1;
        view.data.offX = 400;
        view.data.offY = 300;
        const pc = new PersistenceController(view);

        await pc.save();
        const content: string = view.app.vault.modify.mock.calls[0][1];
        expect(content).toContain('viewportSaved');
    });
});
