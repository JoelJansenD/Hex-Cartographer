export interface LinearFeature {
    id: number;
    color: string;
    width: number;
    dashes: number;
    waypoints: Waypoint[];
}

export interface River extends LinearFeature {
    type: 'river';
}

export interface Road extends LinearFeature {
    type: 'road';
}

export interface Waypoint {
    q: number;
    r: number;
    break?: boolean;
}