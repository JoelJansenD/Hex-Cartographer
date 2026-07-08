import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
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

        const sidebar = new SidebarView(contentEl);

        const toggleBtn = contentEl.createDiv({ cls: 'hex-sidebar-toggle-btn' });
        setIcon(toggleBtn, 'chevron-right');
        contentEl.insertBefore(toggleBtn, sidebar.el);

        toggleBtn.addEventListener('click', () => {
            const collapsed = sidebar.el.classList.toggle('is-collapsed');
            setIcon(toggleBtn, collapsed ? 'chevron-left' : 'chevron-right');
        });
    }

    public getViewType(): string {
        return 'hex-cartographer';
    }
    
    public getDisplayText(): string {
        if (!this.file) return 'Hex Cartographer';
        return this.file.basename.replace('.hexcartographer', '');
    }

}