// === Color conversion utilities ===

export interface Rgb { r: number; g: number; b: number; }
export interface Hsb { h: number; s: number; b: number; }

export function hexToRgb(hex: string): Rgb {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    return { r: parseInt(hex.substring(0, 2), 16), g: parseInt(hex.substring(2, 4), 16), b: parseInt(hex.substring(4, 6), 16) };
}

export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

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

export function hsbToHex(h: number, s: number, b: number): string {
    const rgb = hsbToRgb(h, s, b);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
}

export function hexToHsb(hex: string): Hsb {
    const rgb = hexToRgb(hex);
    return rgbToHsb(rgb.r, rgb.g, rgb.b);
}
