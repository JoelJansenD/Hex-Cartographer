import { ItemView, WorkspaceLeaf } from "obsidian";
import HexCartographerToolbar from "./hex-cartographer-toolbar";
import { isPaintingTool, ToolGroup } from "../types/tool-group";
import HexCartographerContent from "./hex-cartographer-content";
import HexCartographerSidepanel from "./hex-cartographer-sidepanel";
import { MapData } from "../types/map-data";

export default class HexCartographerView extends ItemView {

    private _content: HexCartographerContent;
    private _toolbar: HexCartographerToolbar;
    private _sidebar: HexCartographerSidepanel;

    private _activeTool?: ToolGroup;
    private _activeIcon?: string;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);

        const contentWrapper = this.contentEl.createDiv({
            attr: {
                style: 'display: flex; flex-direction: row; height: 100%; width: 100%'
            }
        });

        const toolbarWrapper = contentWrapper.createDiv({
            attr: {
                style: 'display: flex; flex-direction: column; height: 100%; width: 100%'
            }
        });
        this._toolbar = new HexCartographerToolbar(toolbarWrapper, {
            onEditModeChanged: this.onEditModeChanged.bind(this),
            onToolChanged: this.onToolChanged.bind(this),
        });
        this._content = new HexCartographerContent(toolbarWrapper, TEST_DATA);

        this._sidebar = new HexCartographerSidepanel(contentWrapper, {
            onIconChanged: this.onIconChange.bind(this)
        });
    }

    private onEditModeChanged(enabled: boolean) {
        console.log(`Edit mode changed: ${enabled}`);
        this._sidebar.setEditMode(enabled);
    }

    private onIconChange(iconId?: string) {
        console.log(`Icon changed to: ${iconId}`);
        this._activeIcon = iconId;

        if (this._activeTool && isPaintingTool(this._activeTool)) {
            // Painting tools can be used with any selected icon, so we can just set the tool again to ensure the same tool is being used.
            this._toolbar.setTool(this._activeTool, false);
        }
        else {
            // Other tools may not be compatible with the selected icon, so we will default to the brush tool when the icon changes.
            this._toolbar.setTool('brush', false);
        }
    }

    private onToolChanged(tool?: ToolGroup) {
        if (tool && this.toolChangedToPaintingTool(tool)) {
            // If we're switching from a non-painting tool to a painting tool, we will set the icon in the sidebar to the default which is the hexagon.
            this._sidebar.setIcon('hexagon', false);
        }
        else {
            this._sidebar.setIcon(undefined, false);
        }

        console.log(`Tool changed to: ${tool}`);
        this._activeTool = tool;
    }

    /** returns true if _activeTool is undefined or a non-painting tool and the given tool is a painting tool */
    private toolChangedToPaintingTool(tool: ToolGroup) {
        return (!this._activeTool || !isPaintingTool(this._activeTool!)) && isPaintingTool(tool);
    }

    getViewType() { return 'hex-cartographer'; }
    getDisplayText() {
        return 'Hex Cartographer';
    }
}

const TEST_DATA: MapData = {
    "hexes": {
        "0_3": {
            "q": 0,
            "r": 3,
            "color": "#00ffff"
        },
        "-2_2": {
            "q": -2,
            "r": 2,
            "color": "#CD6155"
        },
        "-2_1": {
            "q": -2,
            "r": 1,
            "color": "#CD6155",
            "symbol": "grass",
            "symbolColor": "#273a27"
        },
        "-1_0": {
            "q": -1,
            "r": 0,
            "color": "#CD6155",
            "symbol": "grass",
            "symbolColor": "#273a27"
        },
        "1_-1": {
            "q": 1,
            "r": -1,
            "color": "#CD6155",
            "symbol": "grass",
            "symbolColor": "#273a27"
        },
        "2_-1": {
            "q": 2,
            "r": -1,
            "color": "#CD6155",
            "symbol": "grass",
            "symbolColor": "#228B22"
        },
        "2_-2": {
            "q": 2,
            "r": -2,
            "color": "#CD6155",
            "symbol": "grass",
            "symbolColor": "#228B22"
        },
        "0_-1": {
            "q": 0,
            "r": -1,
            "color": "#CD6155",
            "symbol": "grass",
            "symbolColor": "#273a27"
        },
        "-1_-1": {
            "q": -1,
            "r": -1,
            "color": "#CD6155",
            "symbol": "grass",
            "symbolColor": "#273a27"
        },
        "-2_0": {
            "q": -2,
            "r": 0,
            "color": "#CD6155"
        },
        "0_1": {
            "q": 0,
            "r": 1,
            "color": "#00ffff",
            "symbol": "hill",
            "symbolColor": "#5D4037"
        },
        "1_2": {
            "q": 1,
            "r": 2,
            "color": "#CD6155"
        },
        "-1_4": {
            "q": -1,
            "r": 4,
            "color": "#00ffff"
        },
        "2_1": {
            "q": 2,
            "r": 1,
            "color": "#CD6155"
        },
        "3_0": {
            "q": 3,
            "r": 0,
            "color": "#CD6155"
        },
        "4_-1": {
            "q": 4,
            "r": -1,
            "color": "#3295D2"
        },
        "3_-1": {
            "q": 3,
            "r": -1,
            "color": "#CD6155"
        },
        "2_0": {
            "q": 2,
            "r": 0,
            "color": "#CD6155"
        },
        "0_-2": {
            "q": 0,
            "r": -2,
            "color": "#CD6155",
            "symbol": "grass",
            "symbolColor": "#273a27"
        },
        "1_-3": {
            "q": 1,
            "r": -3,
            "color": "#CD6155"
        },
        "1_-2": {
            "q": 1,
            "r": -2,
            "color": "#CD6155",
            "symbol": "grass",
            "symbolColor": "#228B22"
        },
        "-3_2": {
            "q": -3,
            "r": 2,
            "color": "#CD6155"
        },
        "-3_1": {
            "q": -3,
            "r": 1,
            "color": "#CD6155"
        },
        "-3_0": {
            "q": -3,
            "r": 0,
            "color": "#CD6155"
        },
        "-2_-1": {
            "q": -2,
            "r": -1,
            "color": "#CD6155",
            "symbol": "question",
            "symbolColor": "#228B22"
        },
        "-2_3": {
            "q": -2,
            "r": 3,
            "color": "#CD6155"
        },
        "-3_3": {
            "q": -3,
            "r": 3,
            "color": "#CD6155"
        },
        "-1_-2": {
            "q": -1,
            "r": -2,
            "color": "#CD6155",
            "symbol": "grass",
            "symbolColor": "#273a27"
        },
        "-4_2": {
            "q": -4,
            "r": 2,
            "color": "#00ffff"
        },
        "0_0": {
            "q": 0,
            "r": 0,
            "symbol": "hill",
            "symbolColor": "#5D4037"
        },
        "-1_1": {
            "q": -1,
            "r": 1,
            "symbol": "grass",
            "symbolColor": "#273a27",
            "color": "#CD6155"
        },
        "1_0": {
            "q": 1,
            "r": 0,
            "symbol": "hill",
            "symbolColor": "#5D4037",
            "color": "#CD6155"
        },
        "0_2": {
            "q": 0,
            "r": 2,
            "color": "#CD6155"
        },
        "-6_1": {
            "q": -6,
            "r": 1,
            "color": "#CD6155"
        },
        "0_-3": {
            "q": 0,
            "r": -3,
            "color": "#CD6155"
        },
        "-2_-2": {
            "q": -2,
            "r": -2,
            "color": "#CD6155"
        },
        "-3_-2": {
            "q": -3,
            "r": -2,
            "color": "#CD6155"
        },
        "-4_-2": {
            "q": -4,
            "r": -2,
            "color": "#CD6155"
        },
        "-5_-2": {
            "q": -5,
            "r": -2,
            "color": "#CD6155"
        },
        "-6_-2": {
            "q": -6,
            "r": -2,
            "color": "#CD6155"
        },
        "-6_-1": {
            "q": -6,
            "r": -1,
            "color": "#CD6155"
        },
        "-5_-1": {
            "q": -5,
            "r": -1,
            "color": "#CD6155"
        },
        "-4_-1": {
            "q": -4,
            "r": -1,
            "color": "#CD6155"
        },
        "-3_-1": {
            "q": -3,
            "r": -1,
            "color": "#CD6155"
        },
        "-3_4": {
            "q": -3,
            "r": 4,
            "color": "#CD6155"
        },
        "-4_3": {
            "q": -4,
            "r": 3,
            "color": "#CD6155"
        },
        "1_1": {
            "q": 1,
            "r": 1,
            "color": "#CD6155"
        },
        "-1_2": {
            "q": -1,
            "r": 2,
            "color": "#CD6155"
        }
    },
    "rivers": [
        {
            type: 'river',
            "id": 1,
            "color": "#0000ff",
            "width": 5,
            "dashes": 1,
            "waypoints": [
                {
                    "q": -3,
                    "r": -2
                },
                {
                    "q": -2,
                    "r": -2
                },
                {
                    "q": -3,
                    "r": -1
                },
                {
                    "q": -2,
                    "r": -1
                },
                {
                    "q": -1,
                    "r": -1
                },
                {
                    "q": 1,
                    "r": -2
                },
                {
                    "q": 1,
                    "r": -1
                },
                {
                    "q": 1,
                    "r": 1
                },
                {
                    "q": 2,
                    "r": 1
                }
            ]
        }
    ],
    "roads": [
        {
            type: 'road',
            "id": 1,
            "color": "#273a27",
            "width": 3,
            "dashes": 1,
            "waypoints": [
                {
                    "q": -3,
                    "r": 0
                },
                {
                    "q": -3,
                    "r": 2
                },
                {
                    "q": -3,
                    "r": 3
                },
                {
                    "q": -2,
                    "r": 3
                },
                {
                    "q": -1,
                    "r": 4
                }
            ]
        },
        {
            type: 'road',
            "id": 2,
            "color": "#FFD700",
            "width": 3,
            "dashes": 1,
            "waypoints": [
                {
                    "q": 4,
                    "r": -1
                },
                {
                    "q": 3,
                    "r": 0
                },
                {
                    "q": 2,
                    "r": 0
                },
                {
                    "q": 1,
                    "r": 0
                },
                {
                    "q": 0,
                    "r": 0
                },
                {
                    "q": -1,
                    "r": 1
                },
                {
                    "q": -2,
                    "r": 1
                }
            ]
        }
    ],
    "texts": [
        {
            "text": "bla bla bla",
            "x": -299.3172573421262,
            "y": -65.1311677112576,
            "size": 16,
            "link": "",
            "color": "#ffffff",
            "outline": true,
            "bold": false,
            "shadow": false,
            "shadowDistance": 5,
            "shadowOpatown": 50
        },
        {
            "text": "asdasdasdas",
            "x": -290.46549193844584,
            "y": -83.63940446440748,
            "size": 16,
            "link": "",
            "color": "#FFFFFF",
            "outline": true,
            "bold": false,
            "shadow": false,
            "shadowDistance": 5,
            "shadowOpatown": 50
        },
        {
            "text": "this is texzt",
            "x": -28.13135361119129,
            "y": -76.39705095230535,
            "size": 16,
            "link": "",
            "color": "#3295D2",
            "outline": true,
            "bold": false,
            "shadow": true,
            "shadowDistance": 5,
            "shadowOpatown": 50
        }
    ],
    "borders": [
        {
            "id": 1,
            "color": "#9c9090",
            "dashes": 1,
            "hexes": [
                {
                    "q": -2,
                    "r": 0
                },
                {
                    "q": -1,
                    "r": -1
                },
                {
                    "q": -2,
                    "r": -1
                },
                {
                    "q": -1,
                    "r": -2
                },
                {
                    "q": -3,
                    "r": 1
                },
                {
                    "q": -3,
                    "r": 2
                },
                {
                    "q": -2,
                    "r": 2
                },
                {
                    "q": -2,
                    "r": 1
                }
            ]
        }
    ],
    "gridSize": 30,
    "zoom": 1.2426899605164008,
    "offX": 605.4585507083642,
    "offY": 411.5003482314898,
    "settings": {
        "colorPalette": [
            "#3295D2",
            "#6CC261",
            "#DDC88D",
            "#9c9090",
            "#CD6155",
            "#FFD700",
            "#000000",
            "#FFFFFF"
        ],
        "colorPalette2": [
            "#ff0000",
            "#ff8000",
            "#ffff00",
            "#00ff00",
            "#00ffff",
            "#0000ff",
            "#8000ff",
            "#ff00ff"
        ],
        "activeColorSlot": 0,
        "drawMode": "none",
        "currentToolGroup": "text",
        "toolConfigs": {
            "grass": {
                "currentVariant": "question",
                "symbolColor": "#228B22",
                "backgroundColor": "#6CC261",
                "backgroundEnabled": false
            },
            "tree": {
                "currentVariant": "grass",
                "symbolColor": "#273a27",
                "backgroundColor": "#6CC261",
                "backgroundEnabled": false
            },
            "mountain": {
                "currentVariant": "hill",
                "symbolColor": "#5D4037",
                "backgroundColor": "#808080",
                "backgroundEnabled": false
            },
            "building": {
                "currentVariant": "tent",
                "symbolColor": "#CD6155",
                "backgroundColor": "#DDC88D",
                "backgroundEnabled": false
            }
        },
        "patternData": {
            "q": 0,
            "r": 2,
            "color": "#3295D2"
        },
        "patternSourceHex": {
            "q": 0,
            "r": 2
        },
        "borderSettings": {
            "dashes": 1,
            "activeRegionId": null,
            "pickedHex": null,
            "visible": true
        },
        "riverSettings": {
            "width": 5,
            "activeRiverId": null,
            "editMode": false,
            "insertAfter": null
        },
        "roadSettings": {
            "width": 3,
            "activeRoadId": null,
            "editMode": false,
            "insertAfter": null
        },
        "masterColor": "#FFD700",
        "editMode": true,
        "hexColorColor": "#CD6155",
        "viewportSaved": true,
        "hexOrientation": false
    },
    "centerWorldX": -12.841940641197926,
    "centerWorldY": -6.840280763157907
};