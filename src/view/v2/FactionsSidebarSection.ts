import { SidebarSection } from "./SidebarSection";

export class FactionsSidebarSection extends SidebarSection {
    getId()    { return 'factions'; }
    getLabel() { return 'Factions'; }

    protected build(): void {
        // TODO: populate faction controls
    }
}
