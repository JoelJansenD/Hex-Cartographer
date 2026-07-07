import { describe, it, expect, vi } from 'vitest';

// Prevent loading the full HexCartographerView (Obsidian API, DOM) during unit tests.
vi.mock('../main', () => ({ HexCartographerView: class {} }));

import { buildNewMapFileName, resolveTargetFolder } from './HexCartographerPlugin';

// ── buildNewMapFileName ───────────────────────────────────────────────────────

describe('buildNewMapFileName', () => {
    it('produces a .hexcartographer.md filename', () => {
        const name = buildNewMapFileName(new Date());
        expect(name).toMatch(/\.hexcartographer\.md$/);
    });

    it('starts with HexMap_', () => {
        expect(buildNewMapFileName(new Date())).toMatch(/^HexMap_/);
    });

    it('formats time and date components with zero-padding', () => {
        // 01:02:03 on 2024-04-05 → HexMap_010203-050424.hexcartographer.md
        const d = new Date(2024, 3, 5, 1, 2, 3); // month is 0-indexed
        expect(buildNewMapFileName(d)).toBe('HexMap_010203-050424.hexcartographer.md');
    });

    it('uses only the last two digits of the year', () => {
        const d = new Date(2099, 11, 31, 23, 59, 59);
        expect(buildNewMapFileName(d)).toMatch(/^HexMap_235959-311299\.hexcartographer\.md$/);
    });

    it('zero-pads single-digit hours, minutes, and seconds', () => {
        const d = new Date(2024, 0, 1, 9, 5, 7);
        expect(buildNewMapFileName(d)).toMatch(/^HexMap_090507-/);
    });

    it('zero-pads single-digit day and month', () => {
        const d = new Date(2024, 0, 3, 12, 0, 0); // January 3
        expect(buildNewMapFileName(d)).toMatch(/^HexMap_120000-030124/);
    });
});

// ── resolveTargetFolder ───────────────────────────────────────────────────────

describe('resolveTargetFolder', () => {
    it('returns empty string when targetFile is null', () => {
        expect(resolveTargetFolder(null)).toBe('');
    });

    it('returns the file path when targetFile has children (is a folder)', () => {
        const folder = { path: 'Atlas', children: [] };
        expect(resolveTargetFolder(folder)).toBe('Atlas');
    });

    it('returns the parent path when targetFile is a file with a parent', () => {
        const file = { path: 'Atlas/map.md', parent: { path: 'Atlas' } };
        expect(resolveTargetFolder(file)).toBe('Atlas');
    });

    it('returns empty string when targetFile has no children and no parent', () => {
        const file = { path: 'orphan.md' };
        expect(resolveTargetFolder(file)).toBe('');
    });

    it('returns empty string when parent is null', () => {
        const file = { path: 'root-file.md', parent: null };
        expect(resolveTargetFolder(file)).toBe('');
    });

    it('prefers children-based (folder) detection over parent', () => {
        // A folder node that somehow also has a parent — should use folder path
        const node = { path: 'Nested/Sub', children: [], parent: { path: 'Nested' } };
        expect(resolveTargetFolder(node)).toBe('Nested/Sub');
    });
});
