import { App, Notice } from "obsidian";
import { calculateHexPath, getHexNeighbors, PixelCoordinates, pixelToHex } from "../../../functions/hex-math";
import { HexagonSet } from "../../../types/map-data";
import { MouseButtonInteraction } from "./mouse-button-interaction";
import { localizeString } from "../../../functions/i18n";
import { Border } from "../../../types/border";
import { Hexagon, HexCoordinates } from "../../../types/hexagon";
import { LinearFeature, River, Road } from "../../../types/rivers-and-roads";
import PathPickerModal from "../../../modals/path-picker-modal";
import { Label } from "../../../types/label";
import { TextInputModal, TextInputModalParams } from "../../../modals/text-input-modal";
import HexCartographerViewState from "../../hex-cartographer-view-state";
import { getWorldCoordinates } from "../../../functions/canvas";
import { getTextIndexAtClick } from "../../../functions/labels";

export interface LeftMouseButtonInteractionContext {
    getApp: () => App;
    getCanvas: () => HTMLCanvasElement;
    getState: () => HexCartographerViewState;
    setState: (state: HexCartographerViewState, pushToHistory?: boolean) => void;
}

export function createLeftMouseButtonInteraction(ctx: LeftMouseButtonInteractionContext) : MouseButtonInteraction {

    return {
        down(e: MouseEvent) {
            const state = ctx.getState();
            if(e.ctrlKey) {
                state.isPanning = true;
                ctx.setState(state, false);
                return;
            }

            const selectedToolGroup = state.selectedToolGroup;
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
                case null:
                    down_Paint(e, ctx, state);
                    break;
                default:
                    throw new Error(`Unhandled tool group: ${selectedToolGroup}`);
            }
            ctx.setState(state);
        },
        up(_: MouseEvent) {
            const state = ctx.getState();
            
            // We always want to stop, even if the user let go of the control button
            state.isPanning = false;
            ctx.setState(state, false);
        },
        doubleClick(e: MouseEvent) {
            const state = ctx.getState();
            if(state.selectedPaintMode === 'text') {
                doubleClick_SelectText(e, ctx, state);
            }
            ctx.setState(state, false);
        }
    };
}

function down_Paint(e: MouseEvent, ctx: LeftMouseButtonInteractionContext, state: HexCartographerViewState) {
    const hex = getHexagonCoordinatesAtMousePosition(ctx, e, state);
    const data = state.data;
    const hexData = getHexagonAtCoordinates(data.hexes, hex);

    switch(state.selectedPaintMode) {
        case 'eraser':
            if(!hexData) return;
            down_Eraser(hexData, state);
            break;
        default:
            throw new Error(`Unhandled paint mode: ${state.selectedPaintMode}`);
    }
}

function down_PaintBucket(hexData: Hexagon, state: HexCartographerViewState) {
    const target = {...hexData};
    const targetHexes: HexCoordinates[] = [ hexData ];
    const visited: string[] = [];

    while(targetHexes.length > 0) {
        const hex = targetHexes.pop()!;
        const currentKey = `${hex.q}_${hex.r}`;

        if(visited.includes(currentKey)) continue;
        
        const hexData = getHexagonAtCoordinates(state.data.hexes, hex);
        if(!hexData) continue;

        if(state.selectedSymbol !== 'hexagon') {
            if(hexData.symbol !== target.symbol || hexData.symbolColor !== target.symbolColor) {
                continue;
            }

            hexData.symbol = state.selectedSymbol;
            hexData.symbolColor = state.selectedColor;
        }
        else {
            if(hexData.color !== target.color) {
                continue;
            }

            hexData.color = state.selectedColor;
        }

        targetHexes.push(...getHexNeighbors(hex));
        visited.push(currentKey);
    }
}

function down_Eraser(hexData: Hexagon, state: HexCartographerViewState) {
    const key = `${hexData.q}_${hexData.r}`;
    if(state.selectedSymbol !== 'hexagon') {
        if(hexData.color) {
            hexData.symbol = undefined;
            hexData.symbolColor = undefined;
        }
        else {
            delete state.data.hexes[key];
        }
    }
    else {
        if(hexData.symbol) {
            hexData.color = undefined;
        }
        else {
            delete state.data.hexes[key];
        }
    }
}

function down_PatternPicker(e: MouseEvent, ctx: LeftMouseButtonInteractionContext, state: HexCartographerViewState) {
    const hex = getHexagonCoordinatesAtMousePosition(ctx, e, state);
    const data = state.data;
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

function down_SelectBorder(e: MouseEvent, ctx: LeftMouseButtonInteractionContext, state: HexCartographerViewState) {
    const hex = getHexagonCoordinatesAtMousePosition(ctx, e, state);
    const data = state.data;
    
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

function down_SelectPath(e: MouseEvent, ctx: LeftMouseButtonInteractionContext, state: HexCartographerViewState) {
    const foundRiver = findLinearFeatureAtHex(state.data.rivers, getHexagonCoordinatesAtMousePosition(ctx, e, state)) as River | null;
    const foundRoad = findLinearFeatureAtHex(state.data.roads, getHexagonCoordinatesAtMousePosition(ctx, e, state)) as Road | null;

    if(foundRiver && foundRoad) {
        const modal = new PathPickerModal(ctx.getApp(), foundRiver, foundRoad, (river, road) => {
            const newState: HexCartographerViewState = {...state,
                selectedRiver: river,
                selectedRoad: road,
                selectedToolGroup: river !== null ? 'river' : 'road',
            };

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

function doubleClick_SelectText(e: MouseEvent, ctx: LeftMouseButtonInteractionContext, state: HexCartographerViewState) {
    const location = getWorldCoordinates(e, ctx.getCanvas(), { x: state.data.offX, y: state.data.offY}, state.data.zoom);
    const textIdx = getTextIndexAtClick(location, ctx.getCanvas(), state);

    let inputParams: TextInputModalParams = {
        location: location,
        onSubmit: label => {
            if(label === 'delete') {
                if(textIdx !== -1) {
                    state.data.texts.splice(textIdx, 1);
                }
            }
            else if(label) {
                if(textIdx !== -1) {
                    state.data.texts[textIdx] = label;
                }
                else {
                    state.data.texts.push(label);
                }
            }

            // The history is already preserved by the main setState call before the modal opens.
            // We don't need to push to history here.
            ctx.setState(state, false);
        }
    }

    const foundText = textIdx !== -1 ? state.data.texts[textIdx] : null;
    if(foundText) {
        inputParams = {
            ...inputParams,
            value: foundText.text,
            size: foundText.size,
            link: foundText.link,
            bold: foundText.bold,
            color: foundText.color,
            outline: foundText.outline,
            shadow: foundText.shadow,
            shadowDistance: foundText.shadowDistance,
            shadowOpacity: foundText.shadowOpatown,
            colorPalette: state.data.settings.colorPalette,
            colorPalette2: state.data.settings.colorPalette2
        };
    }

    new TextInputModal(ctx.getApp(), inputParams).open();
}

function up_Text(state: HexCartographerViewState) {
    state.draggedText = null;
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

function getHexagonCoordinatesAtMousePosition(ctx: LeftMouseButtonInteractionContext, e: MouseEvent, state: HexCartographerViewState) {
    const world = getWorldCoordinates(e, ctx.getCanvas(), { x: state.data.offX, y: state.data.offY}, state.data.zoom);
    const hex = pixelToHex(world.x, world.y, state.data.gridSize, state.data.settings.hexOrientation === 'horizontal');
    return hex;
}

function getHexagonAtCoordinates(hexes: HexagonSet, hex: HexCoordinates) {
    const key = `${hex.q}_${hex.r}`;
    return hexes[key] || null;
}