export default class SidebarView {
    private readonly sidebar: HTMLElement;

    constructor(container: HTMLElement) {
        this.sidebar = container.createDiv({ cls: 'hex-cartographer-sidebar' });
        this.build();
    }

    private build(): void {
        const sections: { id: string; label: string }[] = [
            { id: 'terrain',  label: 'Terrain'  },
            { id: 'icons',    label: 'Icons'    },
            { id: 'factions', label: 'Factions' },
        ];

        for (const section of sections) {
            const item = this.sidebar.createDiv({ cls: 'hex-accordion-item' });

            const header = item.createDiv({ cls: 'hex-accordion-header' });
            header.createSpan({ text: section.label });
            header.createDiv({ cls: 'hex-accordion-chevron' });

            item.createDiv({ cls: 'hex-accordion-body', attr: { 'data-panel': section.id } });

            header.addEventListener('click', () => {
                item.toggleClass('is-open', !item.hasClass('is-open'));
            });
        }

        // Open the first section by default
        (this.sidebar.firstElementChild as HTMLElement | null)?.classList.add('is-open');
    }

    getPanel(id: string): HTMLElement | null {
        return this.sidebar.querySelector(`[data-panel="${id}"]`);
    }
}
