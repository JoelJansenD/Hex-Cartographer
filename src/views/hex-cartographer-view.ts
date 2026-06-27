import { ItemView, WorkspaceLeaf } from "obsidian";
import HexCartographerToolbar from "./components/hex-cartographer-toolbar";
import HexCartographerContent from "./components/hex-cartographer-content";
import HexCartographerSidepanel from "./components/hex-cartographer-sidepanel";
import { MapData } from "../types/map-data";
import HexCartographerPlugin from "../main";
import HexCartographerViewState from "./hex-cartographer-view-state";
import HistoryService from "../services/history-service";

export default class HexCartographerView extends ItemView {

    private _state: HexCartographerViewState = {
        data: TEST_DATA,
        editMode: false,
        isPanning: false,
        selectedPaintMode: 'brush',
        selectedPattern: null,
        selectedRegion: null,
        selectedRiver: null,
        selectedRoad: null,
        selectedSymbol: 'hexagon',
        selectedToolGroup: null,
    };

    private _content: HexCartographerContent;
    private _toolbar: HexCartographerToolbar;
    private _sidebar: HexCartographerSidepanel;

    private historyService = new HistoryService();
    
    constructor(plugin: HexCartographerPlugin, leaf: WorkspaceLeaf) {
        super(leaf);

        const container = this.contentEl.createDiv({
            attr: {
                style: 'display: flex; flex-direction: row; height: 100%; width: 100%'
            }
        });

        const mainViewContainer = container.createDiv({
            attr: {
                style: 'display: flex; flex-direction: column; height: 100%; width: 100%'
            }
        });
        
        this._toolbar = new HexCartographerToolbar(mainViewContainer, {
            getState: this.getViewState.bind(this),
            setState: this.setViewState.bind(this),
            undo: this.undo.bind(this),
            redo: this.redo.bind(this)
        });

        this._content = new HexCartographerContent(plugin, mainViewContainer, {
            getState: this.getViewState.bind(this),
            setState: this.setViewState.bind(this),
            redo: this.redo.bind(this),
            undo: this.undo.bind(this)
        }, TEST_DATA);

        this._sidebar = new HexCartographerSidepanel(container, {
            getState: this.getViewState.bind(this),
            setState: this.setViewState.bind(this)
        });
    }

    onload(): void {
        this._content.startRender();
    }

    private redo() {
      const data = this.historyService.redo(this._state.data);
      if(!data) {
        return;
      }

      this._state = {
        ...this._state,
        data: data
      };
    }

    private undo() {
      const data = this.historyService.undo(this._state.data);
      if(!data) {
        return;
      }

      this._state = {
        ...this._state,
        data: data
      };
    }

    private getViewState() {
      // We create a deep copy through JSON serialization
      // Spread-operators only create shallow copies, meaning that child objects are still pass-by-reference rather than value
      return JSON.parse(JSON.stringify(this._state)) as HexCartographerViewState;
    }

    private setViewState(newState: HexCartographerViewState) {
      this.historyService.push(this._state.data);
      this._state = newState;
      this._toolbar.updateState(this._state);
      this._sidebar.updateState(this._state);
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
    "type": "river",
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
    },
    {
    "type": "river",
      "id": 2,
      "color": "#3295D2",
      "width": 5,
      "dashes": 1,
      "waypoints": [
        {
          "q": -3,
          "r": 1
        },
        {
          "q": -2,
          "r": 0
        },
        {
          "q": -1,
          "r": -1
        },
        {
          "q": 0,
          "r": -2
        },
        {
          "q": 1,
          "r": -3
        }
      ]
    },
    {
      "type": "river",
      "id": 3,
      "color": "#3295D2",
      "width": 5,
      "dashes": 1,
      "waypoints": [
        {
          "q": -4,
          "r": 2
        },
        {
          "q": -3,
          "r": 1
        },
        {
          "q": -2,
          "r": 0
        },
        {
          "q": -1,
          "r": -1
        }
      ]
    }
  ],
  "roads": [
    {
    "type": "road",
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
      "type": "road",
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
    },
    {
    "type": "road",
      "id": 3,
      "color": "#3295D2",
      "width": 3,
      "dashes": 1,
      "waypoints": [
        {
          "q": -2,
          "r": 1
        },
        {
          "q": -3,
          "r": 1
        },
        {
          "q": -3,
          "r": 0
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
      "id": 2,
      "color": "#CD6155",
      "dashes": 1,
      "hexes": [
        {
          "q": -4,
          "r": -2
        }
      ]
    },
    {
      "id": 3,
      "color": "#3295D2",
      "dashes": 1,
      "hexes": [
        {
          "q": -1,
          "r": -2
        },
        {
          "q": -1,
          "r": -1
        },
        {
          "q": -2,
          "r": 0
        },
        {
          "q": -1,
          "r": 0
        },
        {
          "q": 0,
          "r": 0
        },
        {
          "q": 0,
          "r": -1
        },
        {
          "q": -2,
          "r": -2
        },
        {
          "q": -2,
          "r": -1
        }
      ]
    },
    {
      "id": 4,
      "color": "#3295D2",
      "dashes": 1,
      "hexes": [
        {
          "q": -3,
          "r": -1
        },
        {
          "q": -3,
          "r": 0
        },
        {
          "q": -3,
          "r": 1
        }
      ]
    },
    {
      "id": 5,
      "color": "#3295D2",
      "dashes": 1,
      "hexes": [
        {
          "q": -2,
          "r": 1
        }
      ]
    }
  ],
  "gridSize": 30,
  "zoom": 1.5523988544555591,
  "offX": 669.3743065049039,
  "offY": 420.3324159788506,
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
    "drawMode": "pen",
    "currentToolGroup": "road",
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
      "activeRoadId": 1,
      "editMode": true,
      "insertAfter": 4
    },
    "masterColor": "#273a27",
    "editMode": true,
    "hexColorColor": "#CD6155",
    "viewportSaved": true,
    "hexOrientation": "horizontal"
  },
  "centerWorldX": -75.28626175512915,
  "centerWorldY": -13.741581886397395
};