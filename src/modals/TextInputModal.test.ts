import { describe, it, expect } from 'vitest';
import { clampOpacity, resolveShadowEnabled, parseShadowDistance } from './TextInputModal';

describe('clampOpacity', () => {
    it('parses a normal value', () => {
        expect(clampOpacity('50')).toBe(50);
    });

    it('clamps above 100 to 100', () => {
        expect(clampOpacity('150')).toBe(100);
    });

    it('clamps negative values to 0', () => {
        expect(clampOpacity('-10')).toBe(0);
    });

    it('treats empty string as 0', () => {
        expect(clampOpacity('')).toBe(0);
    });

    it('treats non-numeric string as 0', () => {
        expect(clampOpacity('abc')).toBe(0);
    });

    it('accepts boundary value 0', () => {
        expect(clampOpacity('0')).toBe(0);
    });

    it('accepts boundary value 100', () => {
        expect(clampOpacity('100')).toBe(100);
    });
});

describe('resolveShadowEnabled', () => {
    it('is true when checked and opacity > 0', () => {
        expect(resolveShadowEnabled(true, 50)).toBe(true);
    });

    it('is false when unchecked even if opacity > 0', () => {
        expect(resolveShadowEnabled(false, 50)).toBe(false);
    });

    it('is false when opacity is 0 even if checked', () => {
        expect(resolveShadowEnabled(true, 0)).toBe(false);
    });

    it('is false when both unchecked and opacity is 0', () => {
        expect(resolveShadowEnabled(false, 0)).toBe(false);
    });
});

describe('parseShadowDistance', () => {
    it('parses a valid integer string', () => {
        expect(parseShadowDistance('8', 5)).toBe(8);
    });

    it('returns fallback for empty string', () => {
        expect(parseShadowDistance('', 5)).toBe(5);
    });

    it('returns fallback for non-numeric string', () => {
        expect(parseShadowDistance('abc', 5)).toBe(5);
    });

    it('returns fallback when string is "0" (falsy result)', () => {
        expect(parseShadowDistance('0', 5)).toBe(5);
    });

    it('handles negative values', () => {
        expect(parseShadowDistance('-3', 5)).toBe(-3);
    });
});
