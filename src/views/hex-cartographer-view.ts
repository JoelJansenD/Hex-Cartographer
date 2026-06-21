import { ItemView, WorkspaceLeaf } from "obsidian";
import HexCartographerToolbar from "./hex-cartographer-toolbar";
import { ToolGroup } from "../types";

export default class HexCartographerView extends ItemView {

    private _toolbar: HexCartographerToolbar;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);

        this._toolbar = new HexCartographerToolbar(this.contentEl, {
            onToolChanged: this.onToolChanged
        });
    }

    private onToolChanged(tool: ToolGroup) {
        console.log(`Tool changed to: ${tool}`);
    }

    getViewType() { return 'hex-cartographer'; }
    getDisplayText() {
        return 'Hex Cartographer';
    }
}