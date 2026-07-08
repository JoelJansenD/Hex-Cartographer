import { SidebarSection } from "./SidebarSection";
import { TextRow } from "./TextRow";

const MOCK_LABELS = [
    { name: 'Thornhaven',         font: 'Serif',      size: 13, colour: '#5c3d1e' },
    { name: 'The Ashwood Vale',   font: 'Sans-serif', size: 20, colour: '#1a3a5c', style: 'Bold' },
    { name: 'Greywater Falls',    font: 'Serif',      size: 10, colour: '#4a90d9', style: 'Italic' },
    { name: 'Ironspire Peak',     font: 'Sans-serif', size: 11, colour: '#6c757d', style: 'Bold' },
    { name: 'The Forbidden Wastes', font: 'Serif',    size: 16, colour: '#9b5de5', style: 'Caps' },
];

export class TextSidebarSection extends SidebarSection {
    getId()    { return 'text'; }
    getLabel() { return 'Text'; }
    getIcon()  { return 'type'; }

    protected build(): void {
        this.createAddButton('New label', () => {});
        const list = this.body.createDiv({ cls: 'hex-faction-list' });

        for (const data of MOCK_LABELS) {
            new TextRow(list, data, () => {});
        }
    }
}
