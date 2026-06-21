export interface HexCoordinates {
    q: number;
    r: number;
}

export interface Hexagon extends HexCoordinates {
    color?: string;
    symbol?: string;
    symbolColor?: string;
}