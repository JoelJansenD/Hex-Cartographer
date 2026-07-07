// === Shared domain types ===

/** A single hex cell stored in the map. */
export interface HexData {
    q: number;
    r: number;
    color?: string;
    backgroundColor?: string;
    symbol?: string;
    symbolColor?: string;
}

/** A single waypoint coordinate used by paths and border regions. */
export interface Waypoint {
    q: number;
    r: number;
    /** When true, no segment is drawn between this waypoint and the previous one (path break). */
    break?: boolean;
}

/** A river or road path. */
export interface Path {
    id: number;
    color: string;
    width: number;
    waypoints: Waypoint[];
    dashes?: number;
}

/** A text annotation placed in world space. */
export interface Label {
    text: string;
    x: number;
    y: number;
    size: number;
    link?: string;
    color: string;
    outline: boolean;
    bold: boolean;
    shadow: boolean;
    shadowDistance: number;
    shadowOpatown: number;
}

/** A border region composed of hex coordinates. */
export interface Border {
    id: number;
    color: string;
    dashes?: number;
    hexes: Waypoint[];
}

/** The full map document stored in the .hexcartographer.md file. */
export interface MapData {
    hexes: Record<string, HexData>;
    rivers: Path[];
    roads: Path[];
    texts: Label[];
    borders: Border[];
    gridSize: number;
    zoom: number;
    offX: number;
    offY: number;
    /** Persisted viewport centre in world space. */
    centerWorldX?: number;
    centerWorldY?: number;
    settings?: HexMapSettings;
}

/** A single tool variant (e.g. "pine", "castle"). */
export interface ToolVariant {
    id: string;
    label: string;
    icon: string;
}

/** Runtime configuration for a symbol tool group. */
export interface ToolConfig {
    name: string;
    variants: ToolVariant[];
    currentVariant: string;
    symbolColor: string;
    backgroundColor: string;
    backgroundEnabled: boolean;
}

/** Serialised subset of ToolConfig written into HexMapSettings. */
export interface SerializedToolConfig {
    currentVariant: string;
    symbolColor: string;
    backgroundColor: string;
    backgroundEnabled: boolean;
}

/** Live border-editing state (partially persisted to HexMapSettings). */
export interface BorderSettings {
    dashes: number;
    activeRegionId: number | null;
    pickedHex: Waypoint | null;
    visible: boolean;
}

/** Live river/road-editing state (partially persisted to HexMapSettings). */
export interface PathEditSettings {
    width: number;
    activeRiverId: number | null;
    activeRoadId: number | null;
    editMode: boolean;
    insertAfter: number | null;
}

/** Per-map view state persisted inside the map JSON under the `settings` key. */
export interface HexMapSettings {
    colorPalette: string[];
    colorPalette2: string[];
    activeColorSlot: number;
    drawMode: string;
    currentToolGroup: string | null;
    toolConfigs: Record<string, SerializedToolConfig>;
    patternData: HexData | null;
    patternSourceHex: Waypoint | null;
    borderSettings: BorderSettings;
    riverSettings: PathEditSettings;
    roadSettings: PathEditSettings;
    masterColor: string;
    editMode: boolean;
    hexColorColor: string;
    lastUsedTextSize: number;
    lastUsedTextOutline: boolean;
    lastUsedTextBold: boolean;
    lastUsedTextShadow: boolean;
    lastUsedTextShadowDistance: number;
    lastUsedTextShadowOpatown: number;
    viewportSaved: boolean;
    hexOrientation: boolean;
}

/** A loaded SVG symbol ready for canvas rendering. */
export interface SvgSymbol {
    pathData: string;
    viewBoxWidth: number;
}
