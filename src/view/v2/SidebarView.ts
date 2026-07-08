import { TerrainSidebarSection } from "./TerrainSidebarSection";
import { IconsSidebarSection } from "./IconsSidebarSection";
import { TextSidebarSection } from "./TextSidebarSection";
import { RiversSidebarSection } from "./RiversSidebarSection";
import { RoadsSidebarSection } from "./RoadsSidebarSection";
import { FactionsSidebarSection } from "./FactionsSidebarSection";

export default class SidebarView {
    private readonly sidebar: HTMLElement;
    readonly terrain: TerrainSidebarSection;
    readonly icons: IconsSidebarSection;
    readonly text: TextSidebarSection;
    readonly rivers: RiversSidebarSection;
    readonly roads: RoadsSidebarSection;
    readonly factions: FactionsSidebarSection;

    constructor(container: HTMLElement) {
        this.sidebar = container.createDiv({ cls: 'hex-cartographer-sidebar' });

        this.terrain  = new TerrainSidebarSection(this.sidebar);
        this.icons    = new IconsSidebarSection(this.sidebar);
        this.text     = new TextSidebarSection(this.sidebar);
        this.rivers   = new RiversSidebarSection(this.sidebar);
        this.roads    = new RoadsSidebarSection(this.sidebar);
        this.factions = new FactionsSidebarSection(this.sidebar);

        const all = [this.terrain, this.icons, this.text, this.rivers, this.roads, this.factions];
        for (const section of all) {
            section.onOpen = () => all.filter(s => s !== section).forEach(s => s.close());
        }

        this.terrain.open();
    }
}
