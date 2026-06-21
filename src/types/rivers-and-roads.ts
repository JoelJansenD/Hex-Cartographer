import { HexCoordinates } from "./hexagon";

export interface LinearFeature {
    id: number;
    color: string;
    width: number;
    dashes: number;
    waypoints: HexCoordinates[];
}

export interface River extends LinearFeature {
    type: 'river';
}

export interface Road extends LinearFeature {
    type: 'road';
}