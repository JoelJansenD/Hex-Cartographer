import { setIcon } from 'obsidian';

const HEX_PATH = 'M50,4 L89.8,27 L89.8,73 L50,96 L10.2,73 L10.2,27 Z';

export interface FactionRowData {
    name: string;
    fillColour: string;
    borderColour: string;
    patternType?: 'dots' | 'waves';
}

export class FactionRow {
    readonly el: HTMLElement;

    constructor(container: HTMLElement, data: FactionRowData, onEdit: () => void) {
        this.el = container.createDiv({ cls: 'hex-faction-row' });

        const swatch = this.el.createDiv({ cls: 'hex-faction-swatch' });
        const svg = swatch.createSvg('svg', { attr: { viewBox: '0 0 100 100' } });

        if (data.patternType) {
            const patternId = `hex-pat-${data.name.replace(/\W+/g, '-').toLowerCase()}`;
            const defs = svg.createSvg('defs');
            const pattern = defs.createSvg('pattern', {
                attr: { id: patternId, patternUnits: 'userSpaceOnUse' },
            });

            if (data.patternType === 'dots') {
                pattern.setAttribute('width', '14');
                pattern.setAttribute('height', '14');
                pattern.createSvg('rect', { attr: { width: '14', height: '14', fill: data.fillColour } });
                pattern.createSvg('circle', { attr: { cx: '7', cy: '7', r: '2.5', fill: data.borderColour, opacity: '0.7' } });
            } else if (data.patternType === 'waves') {
                pattern.setAttribute('width', '20');
                pattern.setAttribute('height', '10');
                pattern.createSvg('rect', { attr: { width: '20', height: '10', fill: data.fillColour } });
                pattern.createSvg('path', {
                    attr: {
                        d: 'M0,5 Q5,0 10,5 Q15,10 20,5',
                        stroke: data.borderColour,
                        'stroke-width': '2',
                        fill: 'none',
                        opacity: '0.75',
                    },
                });
            }

            svg.createSvg('path', {
                attr: { d: HEX_PATH, fill: `url(#${patternId})`, stroke: data.borderColour, 'stroke-width': '6' },
            });
        } else {
            svg.createSvg('path', {
                attr: { d: HEX_PATH, fill: data.fillColour, stroke: data.borderColour, 'stroke-width': '6' },
            });
        }

        this.el.createSpan({ cls: 'hex-faction-name', text: data.name });

        const editBtn = this.el.createDiv({ cls: 'hex-faction-edit-btn', attr: { 'aria-label': 'Edit faction' } });
        setIcon(editBtn, 'pencil');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onEdit();
        });
    }
}
