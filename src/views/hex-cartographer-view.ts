import { ItemView, WorkspaceLeaf } from "obsidian";
import HexCartographerToolbar from "./hex-cartographer-toolbar";
import { ToolGroup } from "../types";
import HexCartographerContent from "./hex-cartographer-content";
import HexCartographerSidepanel from "./hex-cartographer-sidepanel";

export default class HexCartographerView extends ItemView {

    private _content: HexCartographerContent;
    private _toolbar: HexCartographerToolbar;
    private _sidebar: any;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);

        const toolbarWrapper = this.contentEl.createDiv({ attr: {
            style: 'display: flex; flex-direction: column; height: 100%; width: 100%'
        }});
        this._toolbar = new HexCartographerToolbar(toolbarWrapper, {
            onToolChanged: this.onToolChanged.bind(this)
        });

        const contentWrapper = toolbarWrapper.createDiv({ attr: {
            style: 'display: flex; flex-direction: row; height: 100%; width: 100%'
        }});
        this._content = new HexCartographerContent(contentWrapper);
        this._sidebar = new HexCartographerSidepanel(contentWrapper, {
            onIconChanged: this.onIconChange.bind(this)
        });
    }

    private onIconChange(iconId: string) {
        console.log(`Icon changed to: ${iconId}`);
        this._toolbar.setTool();
    }

    private onToolChanged(tool?: ToolGroup) {
        console.log(`Tool changed to: ${tool}`);
    }

    getViewType() { return 'hex-cartographer'; }
    getDisplayText() {
        return 'Hex Cartographer';
    }
}