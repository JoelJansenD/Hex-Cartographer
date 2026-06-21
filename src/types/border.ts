import { HexCoordinates } from "./hexagon";

export interface Border {
    id: number;
    color: string;
    dashes: number;
    hexes: HexCoordinates[];
}