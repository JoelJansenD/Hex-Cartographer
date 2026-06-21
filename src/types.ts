/**
 * Shared types and data-shape aliases for Hex Cartographer plugin
 * These types define module boundaries and data flows between major components
 */

// ============================================================================
// HEX COORDINATE TYPES
// ============================================================================

/**
 * Axial hex coordinates (q, r) for the hexagonal grid system
 */
export interface HexCoordinates {
    q: number;
    r: number;
}

/**
 * Pixel coordinates in the canvas coordinate system
 */
export interface PixelCoordinates {
    x: number;
    y: number;
}

/**
 * Bounding box for a range of hex coordinates
 */
export interface HexBounds {
    minQ: number;
    maxQ: number;
    minR: number;
    maxR: number;
}

/**
 * Segment connecting two hexes (used for paths like rivers and roads)
 */
export interface HexSegment {
    from: HexCoordinates;
    to: HexCoordinates;
    width?: number;
    lateralOffset?: number;
}

// ============================================================================
// HEX CELL AND TERRAIN TYPES
// ============================================================================

/**
 * A waypoint in a river or road path with optional break marker
 */
export interface Waypoint extends HexCoordinates {
    break?: boolean;
}

export interface HexCoordinates {
    q: number;
    r: number;
}

/**
 * A single hex cell in the map with terrain color and optional metadata
 * Can contain additional tool-specific properties like symbol colors, backgrounds, etc.
 */
export interface HexCell extends HexCoordinates {
    color?: string;
    symbol?: string;
    pattern?: string;
    // Additional properties may be present for tool-specific data
    [key: string]: any;
}

/**
 * Collection of hex cells keyed by coordinate string (e.g., "1,2")
 */
export type HexMap = Record<string, HexCell>;

/**
 * Orientation of the hex grid: 'vertical' for pointy-topped hexes, 'horizontal' for flat-topped hexes
 */
export type HexOrientation = 'vertical' | 'horizontal';

// ============================================================================
// PATH TYPES (RIVERS AND ROADS)
// ============================================================================

/**
 * A river as a path of connected hex waypoints
 */
export interface River {
    id: number;
    name?: string;
    waypoints: Waypoint[];
    width: number;
    color: string;
    dashes: number;
}

/**
 * A road as a path of connected hex waypoints
 */
export interface Road {
    id: number;
    name?: string;
    waypoints: Waypoint[];
    width: number;
    color: string;
    dashes: number;
}

/**
 * Collection of rivers in the map
 */
export type RiverCollection = River[];

/**
 * Collection of roads in the map
 */
export type RoadCollection = Road[];

// ============================================================================
// BORDER TYPES
// ============================================================================

/**
 * A border region as a collection of connected hexes
 */
export interface Border {
    id: number;
    name?: string;
    hexes: Waypoint[];
    color: string;
    dashes: number;
}

/**
 * Collection of borders in the map
 */
export type BorderCollection = Border[];

// ============================================================================
// TEXT ANNOTATION TYPES
// ============================================================================

/**
 * A text annotation placed on the map at world coordinates
 */
export interface TextAnnotation {
    text: string;
    x: number;
    y: number;
    size: number;
    color: string;
    link?: string;
    outline: boolean;
    bold: boolean;
    shadow: boolean;
    shadowDistance: number;
    shadowOpatown: number; // Note: intentional typo preserved from source code
}

/**
 * Collection of text annotations in the map
 */
export type TextAnnotationCollection = TextAnnotation[];

// ============================================================================
// TOOL STATE TYPES
// ============================================================================

/**
 * Available drawing tools
 */
export type DrawMode = 'pen' | 'eraser' | 'line' | string;

/**
 * Available tool groups/categories
 */
export type ToolGroupLegacy = 'hexcolor' | 'river' | 'road' | 'border' | 'text' | string;

/**
 * Available tool groups/categories:
 * - 'hexcolor': Hex color fill tool
 * - 'bucket': Hex color bucket fill tool
 * - 'eraser': Eraser tool
 * - 'text': Text annotation tool
 * - 'pattern': Stamp pattern tool
 * - 'pickPattern': Pick pattern tool
 * - 'river': River drawing tool
 * - 'road': Road drawing tool
 * - 'border': Border drawing tool
 * - 'selectPathAndBorder': Select path and border tool
 */
export type ToolGroup = 'hexcolor' | 'bucket' | 'eraser' | 'text' | 'pattern' | 'pickPattern' | 'river' | 'road' | 'border' | 'selectPathAndBorder';

/**
 * Configuration for a tool group (grass, tree, mountain, building)
 */
export interface ToolConfig {
    currentVariant?: string;
    symbolColor?: string;
    backgroundColor?: string;
    backgroundEnabled?: boolean;
}

/**
 * State for the border drawing tool
 */
export interface BorderToolState {
    activeRegionId?: number | null;
    pickedHex?: HexCoordinates | null;
    visible: boolean;
    dashes: number;
}

/**
 * State for the river drawing tool
 */
export interface RiverToolState {
    width: number;
    activeRiverId?: number | null;
    editMode: boolean;
    insertAfter?: number | null;
}

/**
 * State for the road drawing tool
 */
export interface RoadToolState {
    width: number;
    activeRoadId?: number | null;
    editMode: boolean;
    insertAfter?: number | null;
}

/**
 * Current tool state including drawing mode and tool-specific settings
 * This is the state persisted to map files in the MapDocumentData.settings field
 */
export interface ToolState {
    // Drawing mode and active tool
    drawMode: DrawMode;
    currentToolGroup: ToolGroupLegacy;
    
    // Tool-specific states
    borderSettings: BorderToolState;
    riverSettings: RiverToolState;
    roadSettings: RoadToolState;
    
    // Colors and palettes
    masterColor: string;
    colorPalette: string[];
    colorPalette2: string[];
    activeColorSlot: number;
    hexColorColor?: string;
    
    // Patterns
    patternData?: any;
    patternSourceHex?: HexCoordinates;
    
    // Edit mode and orientation
    editMode?: boolean;
    hexOrientation?: boolean;
    
    // Tool configurations for symbol tools
    toolConfigs?: Record<string, ToolConfig>;
    
    // Viewport state persistence
    viewportSaved?: boolean;
}

// ============================================================================
// MAP VIEW STATE TYPES
// ============================================================================

/**
 * Viewport and camera settings for the map view
 */
export interface ViewportState {
    zoom: number;
    offX: number;
    offY: number;
    centerWorldX: number;
    centerWorldY: number;
}

/**
 * Undo/redo history entry
 */
export type HistoryEntry = string;

/**
 * Mouse/touch input tracking state
 */
export interface InputState {
    isMouseDown: boolean;
    isDraggingMap: boolean;
    lastHex?: HexCoordinates;
    draggedText?: TextAnnotation;
    startHex?: HexCoordinates;
}

// ============================================================================
// MAP DOCUMENT DATA TYPES
// ============================================================================

/**
 * The complete data structure stored in a hex cartographer map document
 */
export interface MapDocumentData {
    // Terrain
    hexes: HexMap;
    
    // Paths
    rivers: RiverCollection;
    roads: RoadCollection;
    
    // Annotations
    texts: TextAnnotationCollection;
    borders: BorderCollection;
    
    // Viewport settings
    gridSize: number;
    zoom: number;
    offX: number;
    offY: number;
    
    // Tool and UI state
    settings: ToolState;
    
    // Viewport center tracking
    centerWorldX: number;
    centerWorldY: number;
}

// ============================================================================
// PLUGIN SETTINGS TYPES
// ============================================================================

/**
 * Hexagon numbering direction for grid labels
 */
export type HexNumberingDirection = 'horizontal' | 'vertical';

/**
 * Position of hex numbers relative to hexagons
 */
export type HexNumberingPosition = 'top' | 'bottom';

/**
 * Global plugin settings stored in Obsidian's data.json
 */
export interface PluginSettings {
    // Export settings
    exportWidth: number;
    
    // UI preferences
    showCrosshair: boolean;
    hideHexBorders: boolean;
    
    // Hex numbering/labeling
    hexNumberingEnabled: boolean;
    hexNumberingDirection: HexNumberingDirection;
    hexNumberingAlpha: boolean;
    hexNumberingAlphaChess: boolean;
    hexNumberingPosition: HexNumberingPosition;
    hexNumberingColor: string;
    hexNumberingOutline: boolean;
    hexNumberingFontSize: number;
}

// ============================================================================
// MODAL PAYLOAD TYPES
// ============================================================================

/**
 * Callback for text input modal
 * Parameters: (text, size, link, color, outline, bold, shadow, shadowDistance, shadowOpacity)
 */
export type TextInputModalCallback = (
    text: string,
    size: number,
    link: string,
    color: string,
    outline: boolean,
    bold: boolean,
    shadow: boolean,
    shadowDistance: number,
    shadowOpacity: number
) => void;

/**
 * Callback for color picker modal
 * Parameters: (color) where color is hex string like "#ffffff"
 */
export type ColorPickerModalCallback = (color: string) => void;

/**
 * Callback for file selector modal
 * Parameters: (filePath) where filePath is the vault path to selected markdown file
 */
export type FileSelectorModalCallback = (filePath: string) => void;

/**
 * Payload for export map modal
 */
export interface ExportMapModalPayload {
    format: 'png' | 'jpeg';
    width: number;
    height: number;
    quality: number;
    cropless: boolean;
}

/**
 * Callback for export map modal
 * Parameters: (format, width, quality, cropless)
 */
export type ExportMapModalCallback = (
    format: 'png' | 'jpeg',
    width: number,
    quality: number,
    cropless: boolean
) => void;

// ============================================================================
// FILE AND VIEW CONTEXT TYPES
// ============================================================================

/**
 * Obsidian TFile representation for type safety at module boundaries
 */
export interface MapFile {
    path: string;
    name: string;
    extension: string;
    parent?: {
        path: string;
    };
}

/**
 * View state passed to the hex cartographer view
 */
export interface HexCartographerViewState {
    file: string; // file path
}

// ============================================================================
// SYMBOL CONFIGURATION TYPES
// ============================================================================

/**
 * Configuration for how an SVG symbol should be rendered
 */
export interface SymbolConfig {
    size: number;
    align: string;
    marginX: number;
    marginY: number;
}

/**
 * Map of symbol names to their rendering configurations
 */
export type SymbolConfigMap = Record<string, SymbolConfig>;
