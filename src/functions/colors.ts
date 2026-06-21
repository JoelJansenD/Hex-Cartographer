/**
 * Color conversion utilities for hex, RGB, and HSB color formats
 */

export interface RgbColor {
    r: number;
    g: number;
    b: number;
}

export interface HsbColor {
    h: number;
    s: number;
    b: number;
}

/**
 * Convert hex color to RGB
 * @param hex - Hex color string (e.g., '#FF0000' or 'F00')
 * @returns RGB color object
 */
export function hexToRgb(hex: string): RgbColor {
    const formattedHex = formatHexString(hex);
    return {
        r: parseInt(formattedHex.substring(0, 2), 16),
        g: parseInt(formattedHex.substring(2, 4), 16),
        b: parseInt(formattedHex.substring(4, 6), 16)
    };
}

function formatHexString(hex: string): string {
    const result  = hex.replace('#', '');
    if(result.length === 6) {
        return result;
    }

    if(result.length === 3) {
        return result[0]! + result[0] + result[1] + result[1] + result[2] + result[2];
    }

    throw new Error('Invalid hex color format');
}

/**
 * Convert RGB to hex color
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Hex color string
 */
export function rgbToHex(r: number, g: number, b: number): string {
    const convert = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
    const rHex = convert(r);
    const gHex = convert(g);
    const bHex = convert(b);
    return `#${rHex}${gHex}${bHex}`;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Convert RGB to HSB
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns HSB color object
 */
export function rgbToHsb(r: number, g: number, b: number): HsbColor {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    
    if (d !== 0) {
        if (max === r) {
            h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        } else if (max === g) {
            h = ((b - r) / d + 2) / 6;
        } else {
            h = ((r - g) / d + 4) / 6;
        }
    }
    
    return {
        h: h * 360,
        s: max === 0 ? 0 : (d / max) * 100,
        b: max * 100
    };
}

/**
 * Convert HSB to RGB
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param b - Brightness (0-100)
 * @returns RGB color object
 */
export function hsbToRgb(h: number, s: number, b: number): RgbColor {
    h /= 360;
    s /= 100;
    b /= 100;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = b * (1 - s);
    const q = b * (1 - f * s);
    const t = b * (1 - (1 - f) * s);
    
    let r: number, g: number, bl: number;
    switch (i % 6) {
        case 0:
            r = b;
            g = t;
            bl = p;
            break;
        case 1:
            r = q;
            g = b;
            bl = p;
            break;
        case 2:
            r = p;
            g = b;
            bl = t;
            break;
        case 3:
            r = p;
            g = q;
            bl = b;
            break;
        case 4:
            r = t;
            g = p;
            bl = b;
            break;
        case 5:
            r = b;
            g = p;
            bl = q;
            break;
        default:
            r = 0;
            g = 0;
            bl = 0;
    }
    
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(bl * 255)
    };
}

/**
 * Convert HSB to hex color
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param b - Brightness (0-100)
 * @returns Hex color string
 */
export function hsbToHex(h: number, s: number, b: number): string {
    const rgb = hsbToRgb(h, s, b);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/**
 * Convert hex to HSB
 * @param hex - Hex color string
 * @returns HSB color object
 */
export function hexToHsb(hex: string): HsbColor {
    const rgb = hexToRgb(hex);
    return rgbToHsb(rgb.r, rgb.g, rgb.b);
}
