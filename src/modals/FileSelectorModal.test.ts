import { describe, it, expect } from 'vitest';
import { filterFiles } from './FileSelectorModal';

const files = [
    { path: 'Notes/World Map.md' },
    { path: 'Notes/Cities.md' },
    { path: 'Atlas/Regions.md' },
    { path: 'Atlas/world-overview.md' },
];

describe('filterFiles', () => {
    it('returns all files when search term is empty', () => {
        expect(filterFiles(files, '')).toEqual(files);
    });

    it('filters by substring (case-insensitive)', () => {
        const result = filterFiles(files, 'world');
        expect(result).toEqual([
            { path: 'Notes/World Map.md' },
            { path: 'Atlas/world-overview.md' },
        ]);
    });

    it('matches against folder segments', () => {
        const result = filterFiles(files, 'atlas');
        expect(result).toEqual([
            { path: 'Atlas/Regions.md' },
            { path: 'Atlas/world-overview.md' },
        ]);
    });

    it('returns empty array when nothing matches', () => {
        expect(filterFiles(files, 'zzz')).toEqual([]);
    });

    it('handles an empty file list', () => {
        expect(filterFiles([], 'world')).toEqual([]);
    });
});
