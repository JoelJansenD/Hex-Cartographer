import { SidebarSection } from "./SidebarSection";
import { FactionRow } from "./FactionRow";

const MOCK_ROADS = [
    { name: "King's Highway",  fillColour: '#8b6914', borderColour: '#c9a84c' },
    { name: 'The Dust Trail',  fillColour: '#c2a06e', borderColour: '#e9c46a' },
    { name: "Merchant's Pass", fillColour: '#6c757d', borderColour: '#adb5bd' },
    { name: 'Shadowpath',      fillColour: '#2d2d2d', borderColour: '#6c757d' },
    { name: 'The Golden Road',  fillColour: '#9a6b00', borderColour: '#f4c430' },
];

export class RoadsSidebarSection extends SidebarSection {
    getId()    { return 'roads'; }
    getLabel() { return 'Roads'; }
    getIcon()  { return 'route'; }

    protected build(): void {
        this.createAddButton('New road', () => {});
        const list = this.body.createDiv({ cls: 'hex-faction-list' });

        for (const data of MOCK_ROADS) {
            new FactionRow(list, data, () => {});
        }
    }
}
