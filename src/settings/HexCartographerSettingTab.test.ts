import { describe, it, expect } from 'vitest';
import { clampFontSize, isValidExportWidth, GUIDE_SECTIONS } from './HexCartographerSettingTab';

// ── clampFontSize ────────────────────────────────────────────────────────────

describe('clampFontSize', () => {
    it('returns the parsed value when within range', () => {
        expect(clampFontSize('10')).toBe(10);
        expect(clampFontSize('4')).toBe(4);
        expect(clampFontSize('40')).toBe(40);
        expect(clampFontSize('20')).toBe(20);
    });

    it('clamps values below the minimum to 4', () => {
        expect(clampFontSize('3')).toBe(4);
        expect(clampFontSize('-5')).toBe(4);
        expect(clampFontSize('1')).toBe(4);
    });

    it('clamps values above the maximum to 40', () => {
        expect(clampFontSize('41')).toBe(40);
        expect(clampFontSize('100')).toBe(40);
    });

    it('falls back to 10 for non-numeric input', () => {
        expect(clampFontSize('')).toBe(10);
        expect(clampFontSize('abc')).toBe(10);
        expect(clampFontSize('NaN')).toBe(10);
    });

    it("treats '0' as fallback (parseInt('0') is falsy) and clamps to min", () => {
        // parseInt('0') === 0, which is falsy, so || 10 applies → result is 10
        expect(clampFontSize('0')).toBe(10);
    });
});

// ── isValidExportWidth ───────────────────────────────────────────────────────

describe('isValidExportWidth', () => {
    it('accepts boundary values 64 and 8192', () => {
        expect(isValidExportWidth(64)).toBe(true);
        expect(isValidExportWidth(8192)).toBe(true);
    });

    it('accepts values inside the range', () => {
        expect(isValidExportWidth(1024)).toBe(true);
        expect(isValidExportWidth(512)).toBe(true);
        expect(isValidExportWidth(4096)).toBe(true);
    });

    it('rejects values below the minimum', () => {
        expect(isValidExportWidth(63)).toBe(false);
        expect(isValidExportWidth(0)).toBe(false);
        expect(isValidExportWidth(-1)).toBe(false);
    });

    it('rejects values above the maximum', () => {
        expect(isValidExportWidth(8193)).toBe(false);
        expect(isValidExportWidth(16384)).toBe(false);
    });
});

// ── GUIDE_SECTIONS ───────────────────────────────────────────────────────────

describe('GUIDE_SECTIONS', () => {
    it('contains all expected top-level section keys', () => {
        const keys = GUIDE_SECTIONS.map(([key]) => key);
        expect(keys).toEqual([
            'basics', 'navigation', 'hexcolor', 'symbols', 'drawing',
            'pattern', 'paths', 'borders', 'text', 'undoredo', 'print', 'touch',
        ]);
    });

    it('every section has at least one item', () => {
        for (const [key, items] of GUIDE_SECTIONS) {
            expect(items.length, `section "${key}" should have items`).toBeGreaterThan(0);
        }
    });

    it('every item has a non-empty translation key', () => {
        for (const [, items] of GUIDE_SECTIONS) {
            for (const [, textKey] of items) {
                expect(typeof textKey).toBe('string');
                expect(textKey.length).toBeGreaterThan(0);
            }
        }
    });

    it('every item icon is either null or a non-empty string', () => {
        for (const [, items] of GUIDE_SECTIONS) {
            for (const [icon] of items) {
                if (icon !== null) {
                    expect(typeof icon).toBe('string');
                    expect((icon as string).length).toBeGreaterThan(0);
                }
            }
        }
    });
});
