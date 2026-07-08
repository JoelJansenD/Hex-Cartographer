import { ItemView, WorkspaceLeaf } from "obsidian";
import HexCartographerPlugin from "../../main";
import SidebarView from "./SidebarView";

export default class HexCartographerViewV2 extends ItemView {

    constructor(leaf: WorkspaceLeaf, plugin: HexCartographerPlugin) {
        super(leaf);
    }

    protected async onOpen(): Promise<void> {
        const { contentEl } = this;
        contentEl.addClass('hex-cartographer-container');
        contentEl.createDiv({ cls: 'hex-cartographer-map' });
        new SidebarView(contentEl);
    }

    public getViewType(): string {
        return 'hex-cartographer';
    }
    
    public getDisplayText(): string {
        if (!this.file) return 'Hex Cartographer';
        return this.file.basename.replace('.hexcartographer', '');
    }

}