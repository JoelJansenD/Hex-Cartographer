import { SidebarSection } from "./SidebarSection";
import { FactionRow } from "./FactionRow";

const MOCK_RIVERS = [
    { name: 'The Silver Run',  fillColour: '#89cff0', borderColour: '#4a90d9' },
    { name: 'Darkwater',       fillColour: '#1a3a5c', borderColour: '#4a90d9' },
    { name: 'Crimson Fork',    fillColour: '#7b3f3f', borderColour: '#c0392b' },
    { name: 'The Mistflow',    fillColour: '#b0c4d8', borderColour: '#6c8fa8' },
    { name: 'Emberstream',     fillColour: '#c0642a', borderColour: '#e76f51' },
];

export class RiversSidebarSection extends SidebarSection {
    getId()    { return 'rivers'; }
    getLabel() { return 'Rivers'; }
    getIcon()  { return 'droplets'; }

    protected build(): void {
        this.createAddButton('New river', () => {});
        const list = this.body.createDiv({ cls: 'hex-faction-list' });

        for (const data of MOCK_RIVERS) {
            new FactionRow(list, data, () => {});
        }
    }
}
