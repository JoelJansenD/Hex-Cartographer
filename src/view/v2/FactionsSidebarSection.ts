import { SidebarSection } from "./SidebarSection";
import { FactionRow } from "./FactionRow";

const MOCK_FACTIONS = [
    { name: 'The Iron Covenant',   fillColour: '#4a4e69', borderColour: '#c9ccd8' },
    { name: 'Sylvan Brotherhood',  fillColour: '#1b4332', borderColour: '#d4a017', patternType: 'dots'  as const },
    { name: 'Crimson Tide',        fillColour: '#6b1a1a', borderColour: '#c0392b' },
    { name: 'The Arcane Order',    fillColour: '#2d1b69', borderColour: '#c77dff', patternType: 'waves' as const },
    { name: 'Golden Dominion',     fillColour: '#7d4e00', borderColour: '#f4c430' },
];

export class FactionsSidebarSection extends SidebarSection {
    getId()    { return 'factions'; }
    getLabel() { return 'Factions'; }

    protected build(): void {
        this.createAddButton('New faction', () => {});
        const list = this.body.createDiv({ cls: 'hex-faction-list' });

        for (const data of MOCK_FACTIONS) {
            new FactionRow(list, data, () => {
                // TODO: open faction edit modal
            });
        }
    }
}
