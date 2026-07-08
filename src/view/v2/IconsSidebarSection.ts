import { SidebarSection } from "./SidebarSection";
import { SVG_SYMBOL_DATA } from "../../data/svgSymbols";
import { ColourPicker } from "./ColourPicker";
import { setIcon } from "obsidian";

const ICON_COLOURS = [
    '#ffffff', '#e9ecef', '#adb5bd', '#212529',
    '#e63946', '#f4a261', '#ffd166', '#74c476',
    '#2d6a4f', '#4a90d9', '#9b5de5', '#f72585',
    '#8b4513', '#e9c46a', '#89cff0', '#1a3a5c',
];

const ICON_SETS = [
    'Hex Cartographer',
    'Lore of Middle-earth',
    'Thedas Codex',
];

export class IconsSidebarSection extends SidebarSection {
    private selectedKey: string | null = null;
    private buttons: Map<string, HTMLElement>;
    private picker: ColourPicker;

    getId()    { return 'icons'; }
    getLabel() { return 'Icons'; }

    protected build(): void {
        this.buttons = new Map<string, HTMLElement>();

        const stickyHeader = this.body.createDiv({ cls: 'hex-icons-sticky-header' });

        const setRow = stickyHeader.createDiv({ cls: 'hex-icon-set-row' });
        const select = setRow.createEl('select', { cls: 'hex-icon-set-select' });
        for (const name of ICON_SETS) {
            select.createEl('option', { text: name, value: name });
        }
        const addBtn = setRow.createDiv({ cls: 'hex-icon-set-add-btn', attr: { 'aria-label': 'Add icon set' } });
        setIcon(addBtn, 'plus');

        this.picker = new ColourPicker(stickyHeader, ICON_COLOURS, ICON_COLOURS[0], () => {});

        const grid = this.body.createDiv({ cls: 'hex-icon-grid' });

        for (const [key, data] of Object.entries(SVG_SYMBOL_DATA)) {
            const btn = grid.createDiv({ cls: 'hex-icon-btn', attr: { title: key } });

            const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgEl.setAttribute('viewBox', `0 0 ${data.viewBoxWidth} ${data.viewBoxWidth}`);
            svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathEl.setAttribute('d', data.pathData);
            svgEl.appendChild(pathEl);
            btn.appendChild(svgEl);

            btn.addEventListener('click', () => this.select(key));
            this.buttons.set(key, btn);
        }
    }

    private select(key: string): void {
        if (this.selectedKey) {
            this.buttons.get(this.selectedKey)?.classList.remove('is-selected');
        }
        this.selectedKey = key;
        this.buttons.get(key)?.classList.add('is-selected');
    }

    getSelectedKey(): string | null {
        return this.selectedKey;
    }
}
