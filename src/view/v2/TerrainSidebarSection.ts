import { SidebarSection } from "./SidebarSection";
import { ColourPicker } from "./ColourPicker";

const TERRAIN_COLOURS = [
    { label: 'Grassland',     colour: '#74c476' },
    { label: 'Forest',        colour: '#2d6a4f' },
    { label: 'Dense Forest',  colour: '#1b4332' },
    { label: 'Savanna',       colour: '#ffd166' },
    { label: 'Desert',        colour: '#e9c46a' },
    { label: 'Scrubland',     colour: '#f4a261' },
    { label: 'Swamp',         colour: '#4a7c59' },
    { label: 'Shallow Water', colour: '#89cff0' },
    { label: 'Water',         colour: '#4a90d9' },
    { label: 'Deep Water',    colour: '#1a3a5c' },
    { label: 'Hills',         colour: '#a8855a' },
    { label: 'Mountains',     colour: '#6c757d' },
    { label: 'Snow',          colour: '#dde8f0' },
    { label: 'Tundra',        colour: '#b0c4d8' },
    { label: 'Volcanic',      colour: '#e76f51' },
    { label: 'Magic',         colour: '#9b5de5' },
];

const HEX_PATH = 'M50,4 L89.8,27 L89.8,73 L50,96 L10.2,73 L10.2,27 Z';

export class TerrainSidebarSection extends SidebarSection {
    private picker: ColourPicker;
    private selectedColour: string | null = null;
    private buttons: Map<string, HTMLElement>;

    getId()    { return 'terrain'; }
    getLabel() { return 'Terrain'; }

    protected build(): void {
        this.buttons = new Map<string, HTMLElement>();

        this.picker = new ColourPicker(
            this.body,
            TERRAIN_COLOURS.map(t => t.colour),
            TERRAIN_COLOURS[0].colour,
            () => {}
        );

        const grid = this.body.createDiv({ cls: 'hex-icon-grid' });

        for (const { label, colour } of TERRAIN_COLOURS) {
            const btn = grid.createDiv({ cls: 'hex-icon-btn hex-colour-btn', attr: { title: label } });

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 100 100');

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', HEX_PATH);
            path.setAttribute('fill', colour);
            path.setAttribute('stroke', 'var(--background-modifier-border)');
            path.setAttribute('stroke-width', '2');
            svg.appendChild(path);
            btn.appendChild(svg);

            btn.addEventListener('click', () => this.select(colour));
            this.buttons.set(colour, btn);
        }
    }

    private select(colour: string): void {
        this.buttons.get(this.selectedColour ?? '')?.classList.remove('is-selected');
        this.selectedColour = colour;
        this.buttons.get(colour)?.classList.add('is-selected');
    }

    getSelectedColour(): string | null { return this.selectedColour; }
}
