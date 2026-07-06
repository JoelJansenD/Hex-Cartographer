import { describe, it, expect } from 'vitest';
import { hexToRgb, rgbToHex, rgbToHsb, hsbToRgb, hsbToHex, hexToHsb } from './color';

describe('hexToRgb', () => {
    it('parses a 6-digit hex string', () => {
        expect(hexToRgb('#ff8000')).toEqual({ r: 255, g: 128, b: 0 });
    });
    it('parses a 6-digit hex without leading #', () => {
        expect(hexToRgb('0000ff')).toEqual({ r: 0, g: 0, b: 255 });
    });
    it('expands a 3-digit hex string', () => {
        expect(hexToRgb('#f0f')).toEqual({ r: 255, g: 0, b: 255 });
    });
    it('parses black', () => {
        expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });
    it('parses white', () => {
        expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });
});

describe('rgbToHex', () => {
    it('converts rgb to hex string', () => {
        expect(rgbToHex(255, 128, 0)).toBe('#ff8000');
    });
    it('pads single-digit hex components', () => {
        expect(rgbToHex(0, 0, 0)).toBe('#000000');
    });
    it('clamps values above 255', () => {
        expect(rgbToHex(300, 0, 0)).toBe('#ff0000');
    });
    it('clamps values below 0', () => {
        expect(rgbToHex(-10, 0, 0)).toBe('#000000');
    });
    it('rounds fractional values', () => {
        // 0.4 rounds to 0, 0.6 rounds to 1
        expect(rgbToHex(0.4, 0.6, 0)).toBe('#000100');
    });
});

describe('rgbToHsb', () => {
    it('converts red', () => {
        const hsb = rgbToHsb(255, 0, 0);
        expect(hsb.h).toBeCloseTo(0, 10);
        expect(hsb.s).toBeCloseTo(100, 10);
        expect(hsb.b).toBeCloseTo(100, 10);
    });
    it('converts green', () => {
        const hsb = rgbToHsb(0, 255, 0);
        expect(hsb.h).toBeCloseTo(120, 10);
        expect(hsb.s).toBeCloseTo(100, 10);
        expect(hsb.b).toBeCloseTo(100, 10);
    });
    it('converts blue', () => {
        const hsb = rgbToHsb(0, 0, 255);
        expect(hsb.h).toBeCloseTo(240, 10);
    });
    it('converts black', () => {
        const hsb = rgbToHsb(0, 0, 0);
        expect(hsb.s).toBeCloseTo(0, 10);
        expect(hsb.b).toBeCloseTo(0, 10);
    });
    it('converts white', () => {
        const hsb = rgbToHsb(255, 255, 255);
        expect(hsb.s).toBeCloseTo(0, 10);
        expect(hsb.b).toBeCloseTo(100, 10);
    });
});

describe('hsbToRgb', () => {
    it('converts red (hue=0)', () => {
        expect(hsbToRgb(0, 100, 100)).toEqual({ r: 255, g: 0, b: 0 });
    });
    it('converts green (hue=120)', () => {
        expect(hsbToRgb(120, 100, 100)).toEqual({ r: 0, g: 255, b: 0 });
    });
    it('converts blue (hue=240)', () => {
        expect(hsbToRgb(240, 100, 100)).toEqual({ r: 0, g: 0, b: 255 });
    });
    it('converts black (brightness=0)', () => {
        expect(hsbToRgb(0, 0, 0)).toEqual({ r: 0, g: 0, b: 0 });
    });
    it('converts white (saturation=0, brightness=100)', () => {
        expect(hsbToRgb(0, 0, 100)).toEqual({ r: 255, g: 255, b: 255 });
    });
});

describe('hsbToHex / hexToHsb round-trip', () => {
    it('round-trips a saturated color', () => {
        const hex = '#3295d2';
        const hsb = hexToHsb(hex);
        const result = hsbToHex(hsb.h, hsb.s, hsb.b);
        expect(result).toBe(hex);
    });
    it('round-trips black', () => {
        const hex = '#000000';
        const hsb = hexToHsb(hex);
        const result = hsbToHex(hsb.h, hsb.s, hsb.b);
        expect(result).toBe(hex);
    });
    it('round-trips white', () => {
        const hex = '#ffffff';
        const hsb = hexToHsb(hex);
        const result = hsbToHex(hsb.h, hsb.s, hsb.b);
        expect(result).toBe(hex);
    });
});
