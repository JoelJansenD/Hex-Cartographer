import { App, Modal } from 'obsidian';
import { t } from '../i18n';
import {
    DEFAULT_TEXT_SIZE, DEFAULT_TEXT_COLOR,
    DEFAULT_SHADOW_DISTANCE, DEFAULT_SHADOW_OPACITY
} from '../constants';
import { FileSelectorModal } from './FileSelectorModal';
import { ColorPickerModal } from './ColorPickerModal';

/** Parses an opacity input string to an integer and clamps it to [0, 100]. Empty string maps to 0. */
export function clampOpacity(raw: string): number {
    const value = raw === '' ? 0 : parseInt(raw, 10);
    return Math.max(0, Math.min(100, isNaN(value) ? 0 : value));
}

/** Shadow is only considered enabled when the checkbox is checked AND opacity is non-zero. */
export function resolveShadowEnabled(checked: boolean, opacity: number): boolean {
    return opacity !== 0 && checked;
}

/** Parses a shadow distance string; returns `fallback` when the result is falsy (NaN, 0, empty). */
export function parseShadowDistance(raw: string, fallback: number): number {
    return parseInt(raw, 10) || fallback;
}

function createColorPickerElement(containerEl: HTMLElement, app: App, initialColor: string, onChange: (color: string) => void) {
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    let currentColor = initialColor;
    const btn = containerEl.createEl('button', {
        attr: { style: 'width: 100%; height: 40px; border: 1px solid var(--divider-color); border-radius: 4px; cursor: pointer; padding: 0; box-sizing: border-box;' }
    });
    btn.style.backgroundColor = initialColor;
    let hiddenInput: HTMLInputElement | null = null;
    if (isTouchDevice) {
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
        btn.addEventListener('click', () => hiddenInput!.click());
        hiddenInput.addEventListener('input', (e) => {
            currentColor = (e.target as HTMLInputElement).value;
            btn.style.backgroundColor = currentColor;
            onChange(currentColor);
        });
    }
    return {
        setColor(color: string) {
            currentColor = color;
            btn.style.backgroundColor = color;
            if (hiddenInput) hiddenInput.value = color;
        },
        getColor() { return currentColor; },
        btn
    };
}

export class TextInputModal extends Modal {
    [key: string]: any;
    constructor(
        app: App,
        onSubmit: (val: string, size: number, link: string, color: string, outline: boolean, bold: boolean, shadow: boolean, shadowDistance: number, shadowOpatown: number) => void,
        val = '',
        size = DEFAULT_TEXT_SIZE,
        link = '',
        color = DEFAULT_TEXT_COLOR,
        outline = true,
        bold = false,
        shadow = false,
        shadowDistance = DEFAULT_SHADOW_DISTANCE,
        shadowOpatown = DEFAULT_SHADOW_OPACITY,
        colorPalette: string[] | null = null,
        colorPalette2: string[] | null = null
    ) {
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
        contentEl.createEl('h2', { text: t('modal.formatText') });

        contentEl.createEl('label', { text: t('modal.displayText'), style: 'display: block; margin-bottom: 5px; font-weight: 500;' });
        const mainInput = contentEl.createEl('input', { value: this.val, placeholder: t('modal.textPlaceholder') });
        mainInput.style.width = '100%';
        mainInput.style.marginBottom = '20px';
        mainInput.style.padding = '8px';

        contentEl.createEl('label', { text: t('modal.textSize'), style: 'display: block; margin-bottom: 5px; font-weight: 500;' });
        const sInput = contentEl.createEl('input', { type: 'number', value: this.size });
        sInput.style.width = '100%';
        sInput.style.marginBottom = '20px';
        sInput.style.padding = '8px';

        const colorSection = contentEl.createDiv({ style: 'margin-bottom: 20px;' });
        colorSection.createEl('label', { text: t('modal.textColor'), style: 'display: block; margin-bottom: 5px; font-weight: 500;' });
        const colorPicker = createColorPickerElement(colorSection, this.app, this.color, (color) => {
            this.color = color;
        });

        const paletteContainer = colorSection.createDiv({ style: 'display: flex; flex-direction: column; gap: 3px; margin-top: 10px;' });
        paletteContainer.createEl('span', { text: t('modal.palette'), attr: { style: 'font-size: 11px; margin-bottom: 3px;' } });

        [this.colorPalette, this.colorPalette2].forEach(palette => {
            if (!palette) return;
            const row = paletteContainer.createDiv({ style: 'display: flex; gap: 5px;' });
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

        const formatSection = contentEl.createDiv({ style: 'margin-bottom: 20px;' });
        formatSection.createEl('label', { text: t('modal.formatting'), style: 'display: block; margin-bottom: 8px; font-weight: 500;' });

        const checkboxGrid = formatSection.createDiv({ style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px;' });

        const outlineLabel = checkboxGrid.createEl('label', { style: 'display: flex; gap: 8px; align-items: center; cursor: pointer;' });
        const outlineInput = outlineLabel.createEl('input', { type: 'checkbox' });
        outlineInput.checked = this.outline;
        outlineInput.style.cursor = 'pointer';
        outlineInput.style.marginLeft = '4px';
        outlineLabel.appendText(t('modal.outline'));

        const boldLabel = checkboxGrid.createEl('label', { style: 'display: flex; gap: 8px; align-items: center; cursor: pointer;' });
        const boldInput = boldLabel.createEl('input', { type: 'checkbox' });
        boldInput.checked = this.bold;
        boldInput.style.cursor = 'pointer';
        boldInput.style.marginLeft = '4px';
        boldLabel.appendText(t('modal.bold'));

        const shadowSection = contentEl.createDiv({ style: 'margin-bottom: 20px; padding: 15px; background: var(--background-secondary); border-radius: 5px;' });
        shadowSection.createEl('label', { text: t('modal.shadowSettings'), style: 'display: block; margin-bottom: 10px; font-weight: 500;' });

        const shadowLabel = shadowSection.createEl('label', { style: 'display: flex; gap: 8px; align-items: center; cursor: pointer; margin-bottom: 12px;' });
        const shadowInput = shadowLabel.createEl('input', { type: 'checkbox' });
        shadowInput.checked = this.shadow;
        shadowInput.style.cursor = 'pointer';
        shadowInput.style.marginLeft = '4px';
        shadowLabel.appendText(t('modal.shadowEnable'));

        const shadowParams = shadowSection.createDiv({ style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px;' });

        const distanceDiv = shadowParams.createDiv();
        distanceDiv.createEl('label', { text: t('modal.shadowDistance'), style: 'display: block; margin-bottom: 5px; font-size: 12px;' });
        const shadowDistanceInput = distanceDiv.createEl('input', {
            type: 'number',
            value: this.shadowDistance.toString()
        });
        shadowDistanceInput.style.width = '100%';
        shadowDistanceInput.style.padding = '6px';

        const opatownDiv = shadowParams.createDiv();
        opatownDiv.createEl('label', { text: t('modal.shadowOpacity'), style: 'display: block; margin-bottom: 5px; font-size: 12px;' });
        const shadowOpatownInput = opatownDiv.createEl('input', {
            type: 'number',
            value: this.shadowOpatown.toString()
        });
        shadowOpatownInput.style.width = '100%';
        shadowOpatownInput.style.padding = '6px';
        shadowOpatownInput.min = '0';
        shadowOpatownInput.max = '100';

        const linkSection = contentEl.createDiv({ style: 'margin-bottom: 20px;' });
        linkSection.createEl('label', { text: t('modal.linkToFile'), style: 'display: block; margin-bottom: 5px; font-weight: 500;' });

        const linkDisplayRow = linkSection.createDiv({ style: 'display: flex; gap: 8px; align-items: stretch;' });
        const linkDisplay = linkDisplayRow.createEl('input', {
            value: this.link,
            placeholder: t('modal.noLinkSelected'),
            attr: { readonly: 'true' }
        });
        linkDisplay.style.flex = '1';
        linkDisplay.style.background = 'var(--background-secondary)';
        linkDisplay.style.cursor = 'default';
        linkDisplay.style.padding = '8px';

        const selectLinkBtn = linkDisplayRow.createEl('button', { text: t('modal.selectFileBtn') });
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
        const cancelBtn = btnRow.createEl('button', { text: t('modal.cancel') });
        cancelBtn.style.justifySelf = 'start';
        cancelBtn.onclick = () => this.close();
        const deleteBtn = btnRow.createEl('button', { text: t('modal.deleteText') });
        deleteBtn.style.cssText = 'justify-self: center; color: var(--text-error);';
        deleteBtn.onclick = () => { this.onSubmit('', 0, '', '', false, false, false, 0, 0); this.close(); };
        const okBtn = btnRow.createEl('button', { text: 'OK', cls: 'mod-cta' });
        okBtn.style.justifySelf = 'end';
        okBtn.onclick = () => {
            const clampedOpatown = clampOpacity(shadowOpatownInput.value);
            const shadowEnabled = resolveShadowEnabled(shadowInput.checked, clampedOpatown);

            this.onSubmit(
                mainInput.value,
                parseInt(sInput.value),
                linkDisplay.value,
                this.color,
                outlineInput.checked,
                boldInput.checked,
                shadowEnabled,
                parseShadowDistance(shadowDistanceInput.value, DEFAULT_SHADOW_DISTANCE),
                clampedOpatown
            );
            this.close();
        };

        mainInput.focus();
    }
}
