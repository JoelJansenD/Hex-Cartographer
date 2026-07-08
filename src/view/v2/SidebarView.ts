import { TerrainSidebarSection } from "./TerrainSidebarSection";
import { IconsSidebarSection } from "./IconsSidebarSection";
import { FactionsSidebarSection } from "./FactionsSidebarSection";

export default class SidebarView {
    private readonly sidebar: HTMLElement;
    readonly terrain: TerrainSidebarSection;
    readonly icons: IconsSidebarSection;
    readonly factions: FactionsSidebarSection;

    constructor(container: HTMLElement) {
        this.sidebar = container.createDiv({ cls: 'hex-cartographer-sidebar' });

        this.terrain  = new TerrainSidebarSection(this.sidebar);
        this.icons    = new IconsSidebarSection(this.sidebar);
        this.factions = new FactionsSidebarSection(this.sidebar);

        this.terrain.open();
    }
}
