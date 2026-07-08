import { TerrainSidebarSection } from "./TerrainSidebarSection";
import { IconsSidebarSection } from "./IconsSidebarSection";
import { TextSidebarSection } from "./TextSidebarSection";
import { RiversSidebarSection } from "./RiversSidebarSection";
import { RoadsSidebarSection } from "./RoadsSidebarSection";
import { FactionsSidebarSection } from "./FactionsSidebarSection";

export default class SidebarView {
    readonly el: HTMLElement;
    readonly terrain: TerrainSidebarSection;
    readonly icons: IconsSidebarSection;
    readonly text: TextSidebarSection;
    readonly rivers: RiversSidebarSection;
    readonly roads: RoadsSidebarSection;
    readonly factions: FactionsSidebarSection;

    /** Called whenever a section becomes the active one, with its id. */
    onSectionOpen: ((sectionId: string) => void) | null = null;

    constructor(container: HTMLElement) {
        this.el = container.createDiv({ cls: 'hex-cartographer-sidebar' });

        this.terrain  = new TerrainSidebarSection(this.el);
        this.icons    = new IconsSidebarSection(this.el);
        this.text     = new TextSidebarSection(this.el);
        this.rivers   = new RiversSidebarSection(this.el);
        this.roads    = new RoadsSidebarSection(this.el);
        this.factions = new FactionsSidebarSection(this.el);

        const all = [this.terrain, this.icons, this.text, this.rivers, this.roads, this.factions];
        for (const section of all) {
            section.onOpen = () => {
                all.filter(s => s !== section).forEach(s => s.close());
                this.onSectionOpen?.(section.getId());
            };
        }

        this.terrain.open();
    }
}
