import { ItemView, WorkspaceLeaf } from "obsidian";
import HexCartographerToolbar from "./hex-cartographer-toolbar";
import { isPaintingTool, ToolGroup } from "../toolgroup";
import HexCartographerContent from "./hex-cartographer-content";
import HexCartographerSidepanel from "./hex-cartographer-sidepanel";

export default class HexCartographerView extends ItemView {

    private _content: HexCartographerContent;
    private _toolbar: HexCartographerToolbar;
    private _sidebar: any;

    private _activeTool?: ToolGroup;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);

        const contentWrapper = this.contentEl.createDiv({ attr: {
            style: 'display: flex; flex-direction: row; height: 100%; width: 100%'
        }});

        const toolbarWrapper = contentWrapper.createDiv({ attr: {
            style: 'display: flex; flex-direction: column; height: 100%; width: 100%'
        }});
        this._toolbar = new HexCartographerToolbar(toolbarWrapper, {
            onEditModeChanged: this.onEditModeChanged.bind(this),
            onToolChanged: this.onToolChanged.bind(this),
        });
        this._content = new HexCartographerContent(toolbarWrapper);
        
        this._sidebar = new HexCartographerSidepanel(contentWrapper, {
            onIconChanged: this.onIconChange.bind(this)
        });
    }

    private onEditModeChanged(enabled: boolean) {
        this._sidebar.setEditMode(enabled);
    }

    private onIconChange(iconId: string) {
        console.log(`Icon changed to: ${iconId}`);
        if(this._activeTool && isPaintingTool(this._activeTool)) {
            // Painting tools can be used with any selected icon, so we can just set the tool again to ensure the same tool is being used.
            this._toolbar.setTool(this._activeTool);
        }
        else {
            // Other tools may not be compatible with the selected icon, so we will default to the brush tool when the icon changes.
            this._toolbar.setTool('brush');
        }
    }

    private onToolChanged(tool?: ToolGroup) {
        console.log(`Tool changed to: ${tool}`);
        this._activeTool = tool;
    }

    getViewType() { return 'hex-cartographer'; }
    getDisplayText() {
        return 'Hex Cartographer';
    }
}