import { App, Notice } from "obsidian";
import { calculateHexPath, PixelCoordinates, pixelToHex } from "../../../functions/hex-math";
import { HexagonSet, MapData } from "../../../types/map-data";
import { MouseButtonInteraction } from "./mouse-button-interaction";
import { localizeString } from "../../../functions/i18n";
import { EditorInteractionState } from "./editor-interaction-state";
import { Border } from "../../../types/border";
import { Hexagon, HexCoordinates } from "../../../types/hexagon";
import { LinearFeature, River, Road } from "../../../types/rivers-and-roads";
import PathPickerModal from "../../../modals/path-picker-modal";

export interface LeftMouseButtonInteractionContext {
    getApp: () => App;
    getState: () => EditorInteractionState;
    getCanvas: () => HTMLCanvasElement;
    getData: () => MapData;
    getWorldCoordinates: (e: MouseEvent) => PixelCoordinates;
    setState: (newState: EditorInteractionState) => void;
}

export function createLeftMouseButtonInteraction(ctx: LeftMouseButtonInteractionContext) : MouseButtonInteraction {

    return {
        down(e: MouseEvent) {
            const state = {... ctx.getState()};

            if(e.ctrlKey) {
                state.isPanning = true;
                return;
            }

            const selectedToolGroup = ctx.getState().selectedToolGroup;
            switch(selectedToolGroup) {
                case 'pattern-picker':
                    down_PatternPicker(e, ctx, state);
                    break;
                case 'select-border':
                    down_SelectBorder(e, ctx, state);
                    break;
                case 'select-path':
                    down_SelectPath(e, ctx, state);
                    break;
                default:
                    throw new Error(`Unhandled tool group: ${selectedToolGroup}`);
            }

            ctx.setState(state);
        },
    };
}

function down_PatternPicker(e: MouseEvent, ctx: LeftMouseButtonInteractionContext, state: EditorInteractionState) {
    ctx.getCanvas().focus();
    const hex = getHexagonCoordinatesAtMousePosition(ctx, e);
    const data = ctx.getData();
    const hexData = getHexagonAtCoordinates(data.hexes, hex);

    if (hexData) {
        state.selectedPattern = {...hexData};
        state.selectedToolGroup = 'pattern';
        state.selectedPaintMode = 'brush';
        new Notice(localizeString('notice.patternPicked'));
    }
    else {
        state.selectedPattern = null;
        new Notice(localizeString('notice.noHexAtPosition'));
    }
}

function down_SelectBorder(e: MouseEvent, ctx: LeftMouseButtonInteractionContext, state: EditorInteractionState) {
    const hex = getHexagonCoordinatesAtMousePosition(ctx, e);
    const data = ctx.getData();
    
    let foundRegion: Border | null = null;
    for(const region of data.borders) {
        if(region.hexes.some(b => b.q === hex.q && b.r === hex.r)) {
            foundRegion = region;
            break;
        }
    }

    if(!foundRegion) {
        new Notice(localizeString('notice.noBorderAtPosition'));
        return;
    }

    state.selectedRegion = {
        border: foundRegion,
        hexagon: hex
    };

    new Notice(localizeString('notice.borderSelected', { id: foundRegion.id }));
}

function down_SelectPath(e: MouseEvent, ctx: LeftMouseButtonInteractionContext, state: EditorInteractionState) {
    const foundRiver = findLinearFeatureAtHex(ctx.getData().rivers, getHexagonCoordinatesAtMousePosition(ctx, e)) as River | null;
    const foundRoad = findLinearFeatureAtHex(ctx.getData().roads, getHexagonCoordinatesAtMousePosition(ctx, e)) as Road | null;

    console.log(foundRiver, foundRoad);

    if(foundRiver && foundRoad) {
        const modal = new PathPickerModal(ctx.getApp(), foundRiver, foundRoad, (river, road) => {
            const newState = {...ctx.getState()};
            newState.selectedRiver = river;
            newState.selectedRoad = road;
            newState.selectedToolGroup = river !== null ? 'river' : 'road';

            // Because this is a callback from a modal, we need to set the state here instead of relying on the outer function to do it.
            ctx.setState(newState);
        });
        modal.open();
        return;
    }

    if(foundRiver) {
        state.selectedRiver = foundRiver;
        state.selectedRoad = null;
        state.selectedToolGroup = 'river';
    }

    if(foundRoad) {
        state.selectedRoad = foundRoad;
        state.selectedRiver = null;
        state.selectedToolGroup = 'road';
    }
}

function findLinearFeatureAtHex(features: LinearFeature[], hex: HexCoordinates) {
    for (const feature of features) {
        if (!feature.waypoints || feature.waypoints.length === 0) continue;
        if (feature.waypoints.some(w => w.q === hex.q && w.r === hex.r)) return feature;

        for (let i = 0; i < feature.waypoints.length - 1; i++) {
            const waypoint1 = feature.waypoints[i]!;
            const waypoint2 = feature.waypoints[i + 1]!;

            const segs = calculateHexPath(waypoint1, waypoint2, feature.width);
            for(const seg of segs) {
                if (seg.to.q === hex.q && seg.to.r === hex.r) return feature;
                if (seg.from.q === hex.q && seg.from.r === hex.r) return feature;
            }
        }
    }

    return null;
}

function getHexagonCoordinatesAtMousePosition(ctx: LeftMouseButtonInteractionContext, e: MouseEvent) {
    const data = ctx.getData();
    const world = ctx.getWorldCoordinates(e);
    const hex = pixelToHex(world.x, world.y, data.gridSize, data.settings.hexOrientation === 'horizontal');
    return hex;
}

function getHexagonAtCoordinates(hexes: HexagonSet, hex: HexCoordinates) {
    const key = `${hex.q}_${hex.r}`;
    return hexes[key] || null;
}