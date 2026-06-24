import { Border } from "./border";
import { Hexagon, HexCoordinates } from "./hexagon";
import { Label } from "./label";
import { River, Road } from "./rivers-and-roads";

export interface MapData {
    hexes: HexagonSet;
    rivers: River[];
    roads: Road[];
    texts: Label[];
    borders: Border[];
    gridSize: number;
    zoom: number;
    offX: number;
    offY: number;
    settings: MapSettings;
    centerWorldX: number;
    centerWorldY: number;
}

export type HexagonSet = { [key: string]: Hexagon };

export interface PatternData extends HexCoordinates {
    color: string;
}

export interface MapSettings {
    colorPalette: string[];
    colorPalette2: string[];
    activeColorSlot: number;
    drawMode: string;
    currentToolGroup: string;
    toolConfigs: ToolConfigs;
    patternData: PatternData;
    patternSourceHex: HexCoordinates;
    borderSettings: BorderSettings;
    riverSettings: RiverSettings;
    roadSettings: RoadSettings;
    masterColor: string;
    editMode: boolean;
    hexColorColor: string;
    viewportSaved: boolean;
    hexOrientation: HexagonOrientation;
}

export type HexagonOrientation = 'horizontal' | 'vertical';

export interface BorderSettings {
    dashes: number;
    activeRegionId: number | null;
    pickedHex: HexCoordinates | null;
    visible: boolean;
}

export interface RiverSettings {
    width: number;
    activeRiverId: number | null;
    editMode: boolean;
    insertAfter: number | null;
}

export interface RoadSettings {
    width: number;
    activeRoadId: number | null;
    editMode: boolean;
    insertAfter: number | null;
}

export interface ToolConfigs {
    grass: IconData;
    tree: IconData;
    mountain: IconData;
    building: IconData;
}

export interface IconData {
    currentVariant: string;
    symbolColor: string;
    backgroundColor: string;
    backgroundEnabled: boolean;
}
