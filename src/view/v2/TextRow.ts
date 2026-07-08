import { setIcon } from 'obsidian';

export interface TextRowData {
    name: string;
    font: string;
    size: number;
    colour: string;
    style?: string;
}

export class TextRow {
    readonly el: HTMLElement;

    constructor(container: HTMLElement, data: TextRowData, onEdit: () => void) {
        this.el = container.createDiv({ cls: 'hex-faction-row' });

        const swatch = this.el.createDiv({ cls: 'hex-text-swatch' });
        swatch.style.backgroundColor = data.colour;

        const info = this.el.createDiv({ cls: 'hex-text-info' });
        info.createSpan({ cls: 'hex-text-name', text: data.name });
        const descriptor = data.style
            ? `${data.font} · ${data.size}px · ${data.style}`
            : `${data.font} · ${data.size}px`;
        info.createSpan({ cls: 'hex-text-descriptor', text: descriptor });

        const editBtn = this.el.createDiv({ cls: 'hex-faction-edit-btn', attr: { 'aria-label': 'Edit label' } });
        setIcon(editBtn, 'pencil');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onEdit();
        });
    }
}
