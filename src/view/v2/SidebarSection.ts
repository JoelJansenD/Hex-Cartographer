import { setIcon } from 'obsidian';

export abstract class SidebarSection {
    protected readonly body: HTMLElement;
    onOpen: (() => void) | null = null;

    constructor(container: HTMLElement) {
        const item = container.createDiv({ cls: 'hex-accordion-item' });

        const header = item.createDiv({ cls: 'hex-accordion-header' });
        header.createSpan({ text: this.getLabel() });
        header.createDiv({ cls: 'hex-accordion-chevron' });

        this.body = item.createDiv({ cls: 'hex-accordion-body', attr: { 'data-panel': this.getId() } });

        header.addEventListener('click', () => {
            if (!item.hasClass('is-open')) {
                this.onOpen?.();
                item.addClass('is-open');
            }
        });

        this.build();
    }

    abstract getId(): string;
    abstract getLabel(): string;
    protected abstract build(): void;

    open(): void  { this.body.closest('.hex-accordion-item')?.classList.add('is-open'); }
    close(): void { this.body.closest('.hex-accordion-item')?.classList.remove('is-open'); }

    protected createAddButton(label: string, onClick: () => void): HTMLElement {
        const btn = this.body.createDiv({ cls: 'hex-section-add-btn' });
        setIcon(btn.createDiv(), 'plus');
        btn.createSpan({ text: label });
        btn.addEventListener('click', onClick);
        return btn;
    }
}
