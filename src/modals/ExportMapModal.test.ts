import { describe, it, expect } from 'vitest';
import { calcLinkedHeight, calcLinkedWidth, clampExportDimension } from './ExportMapModal';

describe('calcLinkedHeight', () => {
    it('computes height from width and aspect ratio', () => {
        expect(calcLinkedHeight(1024, 2)).toBe(512);
    });

    it('rounds to nearest integer', () => {
        // 1000 / 3 = 333.333... -> 333
        expect(calcLinkedHeight(1000, 3)).toBe(333);
    });

    it('handles square aspect ratio', () => {
        expect(calcLinkedHeight(800, 1)).toBe(800);
    });
});

describe('calcLinkedWidth', () => {
    it('computes width from height and aspect ratio', () => {
        expect(calcLinkedWidth(512, 2)).toBe(1024);
    });

    it('rounds to nearest integer', () => {
        // 333 * 3 = 999
        expect(calcLinkedWidth(333, 3)).toBe(999);
    });

    it('handles square aspect ratio', () => {
        expect(calcLinkedWidth(800, 1)).toBe(800);
    });
});

describe('clampExportDimension', () => {
    it('parses a valid integer string', () => {
        expect(clampExportDimension('1024', 512)).toBe(1024);
    });

    it('clamps values below 64 to 64', () => {
        expect(clampExportDimension('10', 512)).toBe(64);
    });

    it('clamps values above 8192 to 8192', () => {
        expect(clampExportDimension('9000', 512)).toBe(8192);
    });

    it('returns fallback for empty string', () => {
        expect(clampExportDimension('', 512)).toBe(512);
    });

    it('returns fallback for non-numeric string', () => {
        expect(clampExportDimension('abc', 512)).toBe(512);
    });

    it('accepts boundary value 64', () => {
        expect(clampExportDimension('64', 512)).toBe(64);
    });

    it('accepts boundary value 8192', () => {
        expect(clampExportDimension('8192', 512)).toBe(8192);
    });
});
