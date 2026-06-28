import { HexCoordinates } from "../types/hexagon";
import { LinearFeature } from "../types/rivers-and-roads";
import { calculateHexPath } from "./hexes";

export function findLinearFeatureAtHex(features: LinearFeature[], hex: HexCoordinates) {
    for(const feature of features) {
        if(!feature.waypoints || feature.waypoints.length === 0) continue;
        if(feature.waypoints.some(w => w.q === hex.q && w.r === hex.r)) return feature;

        for(let i = 0; i < feature.waypoints.length - 1; i++) {
            const waypoint1 = feature.waypoints[i]!;
            const waypoint2 = feature.waypoints[i + 1]!;

            const segs = calculateHexPath(waypoint1, waypoint2, feature.width);
            for(const seg of segs) {
                if(seg.to.q === hex.q && seg.to.r === hex.r) return feature;
                if(seg.from.q === hex.q && seg.from.r === hex.r) return feature;
            }
        }
    }

    return null;
}