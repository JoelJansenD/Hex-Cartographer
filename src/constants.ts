// === Farbpaletten ===
export const DEFAULT_PALETTE = ['#3295D2', '#6CC261', '#DDC88D', '#9c9090', '#CD6155', '#FFD700', '#000000', '#FFFFFF'];
export const DEFAULT_PALETTE2 = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#8000ff', '#ff00ff'];

// === Toolbar Schriftgröße & Höhe ===
export const TOOLBAR_INPUT_FONT_SIZE = '13px';
export const TOOLBAR_INPUT_HEIGHT = '24px';

// === Farben (Standardwerte) ===
export const DEFAULT_MASTER_COLOR = '#000000';
export const DEFAULT_RIVER_COLOR = '#3295D2';
export const DEFAULT_ROAD_COLOR = '#f5deb3';
export const DEFAULT_BORDER_COLOR = '#FF0000';
export const DEFAULT_TEXT_COLOR = '#ffffff';
export const DEFAULT_EXTRAS_SYMBOL_COLOR = '#228B22';
export const DEFAULT_EXTRAS_BG_COLOR = '#6CC261';
export const DEFAULT_VEGETATION_SYMBOL_COLOR = '#228B22';
export const DEFAULT_VEGETATION_BG_COLOR = '#6CC261';
export const DEFAULT_MOUNTAIN_SYMBOL_COLOR = '#5D4037';
export const DEFAULT_MOUNTAIN_BG_COLOR = '#808080';
export const DEFAULT_BUILDING_SYMBOL_COLOR = '#CD6155';
export const DEFAULT_BUILDING_BG_COLOR = '#DDC88D';

// === Größen & Abstände ===
export const DEFAULT_GRID_SIZE = 30;
export const DEFAULT_OFF_X = 400;
export const DEFAULT_OFF_Y = 300;
export const DEFAULT_RIVER_WIDTH = 5;
export const DEFAULT_ROAD_WIDTH = 3;
export const PATH_OVERLAP_SPACING = 1.5; // Abstandsfaktor Kante-zu-Kante: 1.0 = berühren sich, 1.5 = kleine Lücke, 2.0 = deutlicher Abstand
export const DEFAULT_BORDER_HIGHLIGHT_WIDTH = 3;
export const DEFAULT_BORDER_DASHES = 1;
export const DEFAULT_PATH_DASHES = 1;
export const PATH_END_INSET = 0.15;
export const MAX_HISTORY = 50;
export const MIN_ZOOM = 0.01; // Minimale Verkleinerung (1% einer Wabe)
export const MAX_ZOOM = 4; // Maximale Vergrößerung (Zahl x 100% einer Wabe. 4 = 400%)
export const VIEWPORT_PADDING = 0.9;

// === Text-Defaults ===
export const DEFAULT_TEXT_SIZE = 16;
export const DEFAULT_SHADOW_DISTANCE = 5;
export const DEFAULT_SHADOW_OPACITY = 50;

// === UI-Styling ===
export const ACTIVE_COLOR = '#4A9EFF';
export const ACTIVE_BOX_SHADOW = `0 0 8px ${ACTIVE_COLOR}66`;
export const ACTIVE_BORDER = `3px solid ${ACTIVE_COLOR}`;
export const PICKER_ACTIVE_BG = ACTIVE_COLOR;
export const BUTTON_BG_DEFAULT = '#ffffff';

// === Symbol-Konfiguration (Größe/Position pro Symbol) ===
export const SVG_SYMBOL_CONFIG = {
    'question':    { size: 0.5,   align: 'center', marginX: 0, marginY: 0 },
    'exclamation': { size: 0.5,   align: 'center', marginX: 0, marginY: 0 },
    'cross':       { size: 0.5,   align: 'center', marginX: 0, marginY: 0 },
    'dot':         { size: 0.45,   align: 'center', marginX: 0, marginY: 0 },
    'shield':      { size: 0.5,   align: 'center', marginX: 0, marginY: 0 },
    'pirateskull': { size: 0.5,   align: 'center', marginX: 0, marginY: 0 },
    'grass':       { size: 0.75,  align: 'center', marginX: 0, marginY: 0 },
    'swamp':       { size: 0.75,  align: 'center', marginX: 0, marginY: 0 },
    'bush':        { size: 0.35,  align: 'center', marginX: 0, marginY: 0 },
    'tree':        { size: 0.30,  align: 'center', marginX: 0, marginY: -6 },
    'pine':        { size: 0.35,  align: 'center', marginX: 0, marginY: -2 },
    'palm':        { size: 0.325, align: 'center', marginX: 0, marginY: 0 },
    'hill':        { size: 0.50,  align: 'center', marginX: 0, marginY: 0 },
    'mountain':    { size: 0.60,  align: 'center', marginX: 0, marginY: 0 },
    'tent':        { size: 0.325,  align: 'center', marginX: 0, marginY: 0 },
    'house':       { size: 0.30, align: 'center', marginX: 0, marginY: -2 },
    'village':     { size: 0.50,  align: 'center', marginX: 0, marginY: 0 },
    'town':        { size: 0.60,  align: 'center', marginX: 0, marginY: -1 },
    'castle':      { size: 0.65,  align: 'center', marginX: 0, marginY: 0 },
    'harbor':      { size: 0.60,  align: 'center', marginX: 0, marginY: -8 },
    'monastery':   { size: 0.60,  align: 'center', marginX: 0, marginY: -3 },
    'tower':       { size: 0.50,  align: 'center', marginX: 0, marginY: -7 },
    'ruins':        { size: 0.6,  align: 'center', marginX: 0, marginY: 0 },
    'cave':        { size: 0.40,  align: 'center', marginX: 0, marginY: 0 },
    'oasis':       { size: 0.4,  align: 'center', marginX: 0, marginY: -5 }
};
