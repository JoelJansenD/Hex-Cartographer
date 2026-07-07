import { describe, it, expect, vi } from 'vitest';
import { HistoryManager } from './HistoryManager';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeData(overrides: Record<string, any> = {}) {
    return {
        hexes: {} as Record<string, any>,
        rivers: [] as any[],
        roads: [] as any[],
        texts: [] as any[],
        borders: [] as any[],
        gridSize: 6,
        ...overrides,
    };
}

function makeView(dataOverrides: Record<string, any> = {}) {
    return {
        data: makeData(dataOverrides),
        render: vi.fn(),
        requestSave: vi.fn(),
    } as any;
}

// ---------------------------------------------------------------------------
// push()
// ---------------------------------------------------------------------------

describe('HistoryManager.push()', () => {
    it('records the current state in history', () => {
        const view = makeView({ hexes: { '1_0': { q: 1, r: 0 } } });
        const hm = new HistoryManager(view, 10);
        hm.push();
        expect(hm.history).toHaveLength(1);
        const snap = JSON.parse(hm.history[0]);
        expect(snap.hexes['1_0']).toBeDefined();
    });

    it('clears the redo stack', () => {
        const view = makeView();
        const hm = new HistoryManager(view, 10);
        hm.redoStack.push('{"hexes":{},"rivers":[],"roads":[],"texts":[],"borders":[],"gridSize":6}');
        hm.push();
        expect(hm.redoStack).toHaveLength(0);
    });

    it('trims history when it exceeds maxHistory', () => {
        const view = makeView();
        const hm = new HistoryManager(view, 3);
        hm.push();
        hm.push();
        hm.push();
        hm.push(); // 4th push — oldest should be evicted
        expect(hm.history).toHaveLength(3);
    });

    it('sets pending to false', () => {
        const view = makeView();
        const hm = new HistoryManager(view, 10);
        hm.pending = true;
        hm.push();
        expect(hm.pending).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// pushIfNeeded()
// ---------------------------------------------------------------------------

describe('HistoryManager.pushIfNeeded()', () => {
    it('pushes when pending is true', () => {
        const view = makeView();
        const hm = new HistoryManager(view, 10);
        hm.pending = true;
        hm.pushIfNeeded();
        expect(hm.history).toHaveLength(1);
    });

    it('does not push when pending is false', () => {
        const view = makeView();
        const hm = new HistoryManager(view, 10);
        hm.pending = false;
        hm.pushIfNeeded();
        expect(hm.history).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// markPending()
// ---------------------------------------------------------------------------

describe('HistoryManager.markPending()', () => {
    it('sets pending to true', () => {
        const view = makeView();
        const hm = new HistoryManager(view, 10);
        expect(hm.pending).toBe(false);
        hm.markPending();
        expect(hm.pending).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// dropLast()
// ---------------------------------------------------------------------------

describe('HistoryManager.dropLast()', () => {
    it('removes the most-recent history entry', () => {
        const view = makeView();
        const hm = new HistoryManager(view, 10);
        hm.push();
        hm.push();
        expect(hm.history).toHaveLength(2);
        hm.dropLast();
        expect(hm.history).toHaveLength(1);
    });

    it('is a no-op on an empty history', () => {
        const view = makeView();
        const hm = new HistoryManager(view, 10);
        expect(() => hm.dropLast()).not.toThrow();
        expect(hm.history).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// undo()
// ---------------------------------------------------------------------------

describe('HistoryManager.undo()', () => {
    it('restores the previous state', () => {
        const view = makeView();
        const hm = new HistoryManager(view, 10);
        hm.push(); // snapshot of empty hexes
        view.data.hexes = { '1_0': { q: 1, r: 0 } };
        hm.undo();
        expect(Object.keys(view.data.hexes)).toHaveLength(0);
    });

    it('saves the pre-undo state to the redo stack', () => {
        const view = makeView();
        const hm = new HistoryManager(view, 10);
        hm.push();
        view.data.hexes = { '1_0': { q: 1, r: 0 } };
        hm.undo();
        expect(hm.redoStack).toHaveLength(1);
        const redoSnap = JSON.parse(hm.redoStack[0]);
        expect(redoSnap.hexes['1_0']).toBeDefined();
    });

    it('calls render() and requestSave()', () => {
        const view = makeView();
        const hm = new HistoryManager(view, 10);
        hm.push();
        hm.undo();
        expect(view.render).toHaveBeenCalledOnce();
        expect(view.requestSave).toHaveBeenCalledOnce();
    });

    it('does not call render() when history is empty', () => {
        const view = makeView();
        const hm = new HistoryManager(view, 10);
        hm.undo();
        expect(view.render).not.toHaveBeenCalled();
    });

    it('defaults missing borders to an empty array on restore', () => {
        const view = makeView();
        const hm = new HistoryManager(view, 10);
        // Push a snapshot that has no borders key (old map format)
        const snap = JSON.stringify({ hexes: {}, rivers: [], roads: [], texts: [], gridSize: 6 });
        hm.history.push(snap);
        hm.undo();
        expect(view.data.borders).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// redo()
// ---------------------------------------------------------------------------

describe('HistoryManager.redo()', () => {
    it('re-applies a previously undone state', () => {
        const view = makeView();
        const hm = new HistoryManager(view, 10);
        hm.push(); // snapshot empty state
        view.data.hexes = { '2_1': { q: 2, r: 1 } };
        hm.undo(); // back to empty; redo stack holds the mutated state
        hm.redo();
        expect(view.data.hexes['2_1']).toBeDefined();
    });

    it('pushes the pre-redo state onto history', () => {
        const view = makeView();
        const hm = new HistoryManager(view, 10);
        hm.push();
        view.data.hexes = { '2_1': { q: 2, r: 1 } };
        hm.undo();
        const histLenBeforeRedo = hm.history.length;
        hm.redo();
        expect(hm.history.length).toBe(histLenBeforeRedo + 1);
    });

    it('calls render() and requestSave()', () => {
        const view = makeView();
        const hm = new HistoryManager(view, 10);
        hm.push();
        view.data.hexes = { '2_1': { q: 2, r: 1 } };
        hm.undo();
        vi.clearAllMocks();
        hm.redo();
        expect(view.render).toHaveBeenCalledOnce();
        expect(view.requestSave).toHaveBeenCalledOnce();
    });

    it('does not call render() when redo stack is empty', () => {
        const view = makeView();
        const hm = new HistoryManager(view, 10);
        hm.redo();
        expect(view.render).not.toHaveBeenCalled();
    });
});
