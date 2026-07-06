// === Color conversion utilities ===

/** RGB color with channels in the range [0, 255]. */
export interface Rgb { r: number; g: number; b: number; }

/** HSB color with hue in [0, 360), saturation and brightness in [0, 100]. */
export interface Hsb { h: number; s: number; b: number; }

/**
 * Parses a CSS hex color string (3- or 6-digit, with or without `#`) into RGB.
 * @param hex - e.g. `'#ff8000'`, `'ff8000'`, or `'#f80'`
 */
export function hexToRgb(hex: string): Rgb {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    return { r: parseInt(hex.substring(0, 2), 16), g: parseInt(hex.substring(2, 4), 16), b: parseInt(hex.substring(4, 6), 16) };
}

/**
 * Converts RGB channel values to a lowercase CSS hex color string.
 * Each channel is clamped to [0, 255] and rounded before conversion.
 * @param r - Red channel [0, 255]
 * @param g - Green channel [0, 255]
 * @param b - Blue channel [0, 255]
 * @returns e.g. `'#ff8000'`
 */
export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

/**
 * Converts RGB channel values to HSB (also known as HSV).
 * @param r - Red channel [0, 255]
 * @param g - Green channel [0, 255]
 * @param b - Blue channel [0, 255]
 * @returns `{ h: [0, 360), s: [0, 100], b: [0, 100] }`
 */
export function rgbToHsb(r: number, g: number, b: number): Hsb {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d !== 0) {
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }
    return { h: h * 360, s: max === 0 ? 0 : (d / max) * 100, b: max * 100 };
}

/**
 * Converts HSB (HSV) values to RGB.
 * @param h - Hue [0, 360)
 * @param s - Saturation [0, 100]
 * @param b - Brightness [0, 100]
 * @returns RGB with channels in [0, 255] (rounded)
 */
export function hsbToRgb(h: number, s: number, b: number): Rgb {
    h /= 360; s /= 100; b /= 100;
    const i = Math.floor(h * 6), f = h * 6 - i, p = b * (1 - s), q = b * (1 - f * s), t = b * (1 - (1 - f) * s);
    let r = 0, g = 0, bl = 0;
    switch (i % 6) {
        case 0: r = b; g = t; bl = p; break; case 1: r = q; g = b; bl = p; break;
        case 2: r = p; g = b; bl = t; break; case 3: r = p; g = q; bl = b; break;
        case 4: r = t; g = p; bl = b; break; case 5: r = b; g = p; bl = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(bl * 255) };
}

/**
 * Converts HSB (HSV) values directly to a CSS hex color string.
 * @param h - Hue [0, 360)
 * @param s - Saturation [0, 100]
 * @param b - Brightness [0, 100]
 * @returns e.g. `'#ff8000'`
 */
export function hsbToHex(h: number, s: number, b: number): string {
    const rgb = hsbToRgb(h, s, b);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/**
 * Parses a CSS hex color string and converts it to HSB (HSV).
 * @param hex - e.g. `'#ff8000'` or `'#f80'`
 * @returns `{ h: [0, 360), s: [0, 100], b: [0, 100] }`
 */
export function hexToHsb(hex: string): Hsb {
    const rgb = hexToRgb(hex);
    return rgbToHsb(rgb.r, rgb.g, rgb.b);
}
