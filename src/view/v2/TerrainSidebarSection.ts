import { SidebarSection } from "./SidebarSection";

export class TerrainSidebarSection extends SidebarSection {
    getId()    { return 'terrain'; }
    getLabel() { return 'Terrain'; }

    protected build(): void {
        // TODO: populate terrain controls
    }
}
