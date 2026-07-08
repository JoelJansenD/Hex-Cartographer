import { SidebarSection } from "./SidebarSection";
import { SVG_SYMBOL_DATA } from "../../data/svgSymbols";

export class IconsSidebarSection extends SidebarSection {
    private selectedKey: string | null = null;
    private buttons: Map<string, HTMLElement>;

    getId()    { return 'icons'; }
    getLabel() { return 'Icons'; }

    protected build(): void {
        this.buttons = new Map<string, HTMLElement>();
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
            console.log(key)
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
