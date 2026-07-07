import { Notice } from 'obsidian';
import { t } from '../i18n';
import { MAX_HISTORY } from '../constants';
import type { HexCartographerView } from './HexCartographerView';

/**
 * Manages the undo/redo history stack for a HexCartographerView.
 *
 * Snapshots cover the five mutable map collections plus gridSize;
 * viewport state (zoom, offsets) is intentionally excluded.
 */
export class HistoryManager {
    private readonly view: HexCartographerView;
    readonly history: string[] = [];
    readonly redoStack: string[] = [];
    readonly maxHistory: number;
    pending = false;

    constructor(view: HexCartographerView, maxHistory = MAX_HISTORY) {
        this.view = view;
        this.maxHistory = maxHistory;
    }

    private snapshot(): string {
        const { hexes, rivers, roads, texts, borders, gridSize } = this.view.data;
        return JSON.stringify({ hexes, rivers, roads, texts, borders, gridSize });
    }

    private restore(json: string): void {
        const s = JSON.parse(json);
        this.view.data.hexes = s.hexes;
        this.view.data.rivers = s.rivers;
        this.view.data.roads = s.roads;
        this.view.data.texts = s.texts;
        this.view.data.borders = s.borders ?? [];
        this.view.data.gridSize = s.gridSize;
    }

    /** Push the current map state onto the undo stack and clear the redo stack. */
    push(): void {
        this.history.push(this.snapshot());
        if (this.history.length > this.maxHistory) this.history.shift();
        this.redoStack.length = 0;
        this.pending = false;
    }

    /** Push only if a pending flag was set (e.g. at gesture start). */
    pushIfNeeded(): void {
        if (this.pending) this.push();
    }

    /** Mark that a push should happen before the next mutation completes. */
    markPending(): void {
        this.pending = true;
    }

    /**
     * Remove the most-recent history entry without restoring it.
     * Used when a speculative entry was pushed at gesture start but the
     * gesture turned out not to require a history record.
     */
    dropLast(): void {
        this.history.pop();
    }

    undo(): void {
        if (this.history.length > 0) {
            this.redoStack.push(this.snapshot());
            this.restore(this.history.pop()!);
            this.view.render();
            this.view.requestSave();
        } else {
            new Notice(t('notice.nothingToUndo'));
        }
    }

    redo(): void {
        if (this.redoStack.length > 0) {
            this.history.push(this.snapshot());
            this.restore(this.redoStack.pop()!);
            this.view.render();
            this.view.requestSave();
        } else {
            new Notice(t('notice.nothingToRedo'));
        }
    }
}
