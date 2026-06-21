import { Modal } from 'obsidian';
import {
    DEFAULT_SHADOW_DISTANCE,
    DEFAULT_SHADOW_OPACITY,
    DEFAULT_TEXT_COLOR,
    DEFAULT_TEXT_SIZE,
} from '../constants';
import { localizeString } from '../functions/i18n';
import { TextInputModalCallback } from '../types-legacy';
import { ColorPickerModal } from './color-picker-modal';
import { FileSelectorModal } from './file-selector-modal';
import isTouchDevice from '../functions/is-touch-device';

export class TextInputModal extends Modal {
    onSubmit: TextInputModalCallback;
    val: string;
    size: number;
    link: string;
    color: string;
    outline: boolean;
    bold: boolean;
    shadow: boolean;
    shadowDistance: number;
    shadowOpatown: number;
    colorPalette: string[] | null;
    colorPalette2: string[] | null;

    constructor(app, onSubmit: TextInputModalCallback, val = '', size = DEFAULT_TEXT_SIZE, link = '', color = DEFAULT_TEXT_COLOR, outline = true, bold = false, shadow = false, shadowDistance = DEFAULT_SHADOW_DISTANCE, shadowOpatown = DEFAULT_SHADOW_OPACITY, colorPalette: string[] | null = null, colorPalette2: string[] | null = null) {
        super(app);
        this.onSubmit = onSubmit;
        this.val = val;
        this.size = size;
        this.link = link;
        this.color = color;
        this.outline = outline;
        this.bold = bold;
        this.shadow = shadow;
        this.shadowDistance = shadowDistance;
        this.shadowOpatown = shadowOpatown;
        this.colorPalette = colorPalette;
        this.colorPalette2 = colorPalette2;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: localizeString('modal.formatText') });

        contentEl.createEl('label', { text: localizeString('modal.displayText'), attr: { style: 'display: block; margin-bottom: 5px; font-weight: 500;' } });
        const mainInput = contentEl.createEl('input', { value: this.val, placeholder: localizeString('modal.textPlaceholder') });
        mainInput.style.width = '100%';
        mainInput.style.marginBottom = '20px';
        mainInput.style.padding = '8px';

        contentEl.createEl('label', { text: localizeString('modal.textSize'), attr: { style: 'display: block; margin-bottom: 5px; font-weight: 500;' } });
        const sInput = contentEl.createEl('input', { type: 'number', attr: { value: this.size } });
        sInput.style.width = '100%';
        sInput.style.marginBottom = '20px';
        sInput.style.padding = '8px';

        const colorSection = contentEl.createDiv({ attr: { style: 'margin-bottom: 20px;' } });
        colorSection.createEl('label', { text: localizeString('modal.textColor'), attr: { style: 'display: block; margin-bottom: 5px; font-weight: 500;' } });
        const colorPicker = createColorPickerElement(colorSection, this.app, this.color, (color) => {
            this.color = color;
        });

        const paletteContainer = colorSection.createDiv({ attr: { style: 'display: flex; flex-direction: column; gap: 3px; margin-top: 10px;' } });
        paletteContainer.createEl('span', { text: localizeString('modal.palette'), attr: { style: 'font-size: 11px; margin-bottom: 3px;' } });

        [this.colorPalette, this.colorPalette2].forEach(palette => {
            if (!palette) return;
            const row = paletteContainer.createDiv({ attr: { style: 'display: flex; gap: 5px;' } });
            palette.forEach(color => {
                const paletteBtn = row.createEl('button', {
                    attr: {
                        style: `width: 30px; height: 30px; background: ${color}; border: 2px solid var(--divider-color); border-radius: 3px; cursor: pointer;`
                    }
                });
                paletteBtn.onclick = () => {
                    colorPicker.setColor(color);
                    this.color = color;
                };
            });
        });

        const formatSection = contentEl.createDiv({ attr: { style: 'margin-bottom: 20px;' } });
        formatSection.createEl('label', { text: localizeString('modal.formatting'), attr: { style: 'display: block; margin-bottom: 8px; font-weight: 500;' } });

        const checkboxGrid = formatSection.createDiv({ attr: { style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px;' } });

        const outlineLabel = checkboxGrid.createEl('label', { attr: { style: 'display: flex; gap: 8px; align-items: center; cursor: pointer;' } });
        const outlineInput = outlineLabel.createEl('input', { type: 'checkbox' });
        outlineInput.checked = this.outline;
        outlineInput.style.cursor = 'pointer';
        outlineInput.style.marginLeft = '4px';
        outlineLabel.appendText(localizeString('modal.outline'));

        const boldLabel = checkboxGrid.createEl('label', { attr: { style: 'display: flex; gap: 8px; align-items: center; cursor: pointer;' } });
        const boldInput = boldLabel.createEl('input', { type: 'checkbox' });
        boldInput.checked = this.bold;
        boldInput.style.cursor = 'pointer';
        boldInput.style.marginLeft = '4px';
        boldLabel.appendText(localizeString('modal.bold'));

        const shadowSection = contentEl.createDiv({ attr: { style: 'margin-bottom: 20px; padding: 15px; background: var(--background-secondary); border-radius: 5px;' } });
        shadowSection.createEl('label', { text: localizeString('modal.shadowSettings'), attr: { style: 'display: block; margin-bottom: 10px; font-weight: 500;' } });

        const shadowLabel = shadowSection.createEl('label', { attr: { style: 'display: flex; gap: 8px; align-items: center; cursor: pointer; margin-bottom: 12px;' } });
        const shadowInput = shadowLabel.createEl('input', { type: 'checkbox' });
        shadowInput.checked = this.shadow;
        shadowInput.style.cursor = 'pointer';
        shadowInput.style.marginLeft = '4px';
        shadowLabel.appendText(localizeString('modal.shadowEnable'));

        const shadowParams = shadowSection.createDiv({ attr: { style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px;' } });

        const distanceDiv = shadowParams.createDiv();
        distanceDiv.createEl('label', { text: localizeString('modal.shadowDistance'), attr: { style: 'display: block; margin-bottom: 5px; font-size: 12px;' } });
        const shadowDistanceInput = distanceDiv.createEl('input', {
            type: 'number',
            value: this.shadowDistance.toString()
        });
        shadowDistanceInput.style.width = '100%';
        shadowDistanceInput.style.padding = '6px';

        const opatownDiv = shadowParams.createDiv();
        opatownDiv.createEl('label', { text: localizeString('modal.shadowOpacity'), attr: { style: 'display: block; margin-bottom: 5px; font-size: 12px;' } });
        const shadowOpatownInput = opatownDiv.createEl('input', {
            type: 'number',
            value: this.shadowOpatown.toString()
        });
        shadowOpatownInput.style.width = '100%';
        shadowOpatownInput.style.padding = '6px';
        shadowOpatownInput.min = '0';
        shadowOpatownInput.max = '100';

        const linkSection = contentEl.createDiv({ attr: { style: 'margin-bottom: 20px;' } });
        linkSection.createEl('label', { text: localizeString('modal.linkToFile'), attr: { style: 'display: block; margin-bottom: 5px; font-weight: 500;' } });

        const linkDisplayRow = linkSection.createDiv({ attr: { style: 'display: flex; gap: 8px; align-items: stretch;' } });
        const linkDisplay = linkDisplayRow.createEl('input', {
            value: this.link,
            placeholder: localizeString('modal.noLinkSelected'),
            attr: { readonly: 'true' }
        });
        linkDisplay.style.flex = '1';
        linkDisplay.style.background = 'var(--background-secondary)';
        linkDisplay.style.cursor = 'default';
        linkDisplay.style.padding = '8px';

        const selectLinkBtn = linkDisplayRow.createEl('button', { text: localizeString('modal.selectFileBtn') });
        selectLinkBtn.style.padding = '8px 16px';
        selectLinkBtn.style.whiteSpace = 'nowrap';
        selectLinkBtn.onclick = () => {
            const selector = new FileSelectorModal(this.app, (selectedPath) => {
                linkDisplay.value = selectedPath;
                this.link = selectedPath;

                setTimeout(() => {
                    selectLinkBtn.focus();
                }, 100);
            }, linkDisplay.value);

            selector.open();
        };

        const btnRow = contentEl.createDiv();
        btnRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr 1fr; width: 100%; margin-top: 25px; padding-top: 15px; border-top: 1px solid var(--background-modifier-border);';
        const cancelBtn = btnRow.createEl('button', { text: localizeString('modal.cancel') });
        cancelBtn.style.justifySelf = 'start';
        cancelBtn.onclick = () => this.close();
        const deleteBtn = btnRow.createEl('button', { text: localizeString('modal.deleteText') });
        deleteBtn.style.cssText = 'justify-self: center; color: var(--text-error);';
        deleteBtn.onclick = () => { this.onSubmit('', 0, '', '', false, false, false, 0, 0); this.close(); };
        const okBtn = btnRow.createEl('button', { text: 'OK', cls: 'mod-cta' });
        okBtn.style.justifySelf = 'end';
        okBtn.onclick = () => {
            const opatownValue = shadowOpatownInput.value === '' ? 0 : parseInt(shadowOpatownInput.value);
            const clampedOpatown = Math.max(0, Math.min(100, opatownValue));
            const shadowEnabled = clampedOpatown === 0 ? false : shadowInput.checked;

            this.onSubmit(
                mainInput.value,
                parseInt(sInput.value),
                linkDisplay.value,
                this.color,
                outlineInput.checked,
                boldInput.checked,
                shadowEnabled,
                parseInt(shadowDistanceInput.value) || DEFAULT_SHADOW_DISTANCE,
                clampedOpatown
            );
            this.close();
        };

        mainInput.focus();
    }
}

function createColorPickerElement(containerEl, app, initialColor, onChange) {
    let currentColor = initialColor;
    const btn = containerEl.createEl('button', {
        attr: { style: 'width: 100%; height: 40px; border: 1px solid var(--divider-color); border-radius: 4px; cursor: pointer; padding: 0; box-sizing: border-box;' }
    });
    btn.style.backgroundColor = initialColor;

    let hiddenInput: any = null;
    if (isTouchDevice()) {
        btn.addEventListener('click', () => {
            new ColorPickerModal(app, currentColor, (color) => {
                currentColor = color;
                btn.style.backgroundColor = color;
                onChange(color);
            }).open();
        });
    } else {
        hiddenInput = containerEl.createEl('input', {
            type: 'color',
            value: initialColor,
            attr: { style: 'position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none;' }
        });
        btn.addEventListener('click', () => hiddenInput.click());
        hiddenInput.addEventListener('input', (e) => {
            currentColor = e.target.value;
            btn.style.backgroundColor = e.target.value;
            onChange(e.target.value);
        });
    }

    return {
        setColor(color) {
            currentColor = color;
            btn.style.backgroundColor = color;
            if (hiddenInput) hiddenInput.value = color;
        },
        getColor() { return currentColor; },
        btn
    };
}
