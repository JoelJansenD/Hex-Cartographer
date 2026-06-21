import { Modal } from 'obsidian';
import { localizeString } from '../functions/i18n';
import { ExportMapModalCallback } from '../types';

export class ExportMapModal extends Modal {
    onExport: ExportMapModalCallback;
    aspect: number;
    format: 'png' | 'jpeg';
    quality: number;
    imgWidth: number;
    imgHeight: number;
    _updating: boolean;
    cropless: boolean;

    constructor(app, mapSize: { w: number; h: number }, defaultWidth: number, onExport: ExportMapModalCallback) {
        super(app);
        this.onExport = onExport;
        this.aspect = mapSize.w / mapSize.h;
        this.format = 'png';
        this.quality = 85;
        this.imgWidth = defaultWidth || 1024;
        this.imgHeight = Math.round(this.imgWidth / this.aspect);
        this._updating = false;
        this.cropless = false;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: localizeString('modal.exportTitle') });

        const formatRow = contentEl.createDiv({ attr: { style: 'display: flex; align-items: center; gap: 8px; margin-bottom: 12px;' } });
        formatRow.createEl('span', { text: localizeString('modal.exportFormat') + ':' });
        const pngBtn = formatRow.createEl('button', { text: 'PNG' });
        const jpegBtn = formatRow.createEl('button', { text: 'JPEG' });

        const btnStyle = (btn, active) => {
            btn.style.padding = '4px 12px';
            btn.style.borderRadius = '4px';
            btn.style.cursor = 'pointer';
            btn.style.border = '1px solid var(--divider-color)';
            btn.style.background = active ? 'var(--interactive-accent)' : 'var(--background-secondary)';
            btn.style.color = active ? 'var(--text-on-accent)' : 'var(--text-normal)';
        };

        const sizeRow = contentEl.createDiv({ attr: { style: 'display: flex; align-items: center; gap: 8px; margin-bottom: 12px;' } });
        sizeRow.createEl('span', { text: 'px:' });
        const widthInput = sizeRow.createEl('input', { attr: { type: 'number', min: '64', max: '8192', step: '1', value: this.imgWidth, style: 'width: 80px;' } });
        sizeRow.createEl('span', { text: '×' });
        const heightInput = sizeRow.createEl('input', { attr: { type: 'number', min: '64', max: '8192', step: '1', value: this.imgHeight, style: 'width: 80px;' } });

        widthInput.oninput = () => {
            if (this._updating) return;
            this._updating = true;
            this.imgWidth = parseInt(widthInput.value) || 1024;
            this.imgHeight = Math.round(this.imgWidth / this.aspect);
            heightInput.value = this.imgHeight.toString();
            this._updating = false;
        };
        heightInput.oninput = () => {
            if (this._updating) return;
            this._updating = true;
            this.imgHeight = parseInt(heightInput.value) || Math.round(1024 / this.aspect);
            this.imgWidth = Math.round(this.imgHeight * this.aspect);
            widthInput.value = this.imgWidth.toString();
            this._updating = false;
        };

        const qualityRow = contentEl.createDiv({ attr: { style: 'display: flex; align-items: center; gap: 8px; margin-bottom: 12px;' } });
        qualityRow.createEl('span', { text: localizeString('modal.exportQuality') + ':' });
        const slider = qualityRow.createEl('input', { attr: { type: 'range', min: '10', max: '100', step: '5', value: this.quality, style: 'flex: 1;' } });
        const valueDisplay = qualityRow.createEl('span', { text: this.quality + '%', attr: { style: 'min-width: 40px; text-align: right;' } });
        slider.oninput = () => {
            this.quality = parseInt(slider.value);
            valueDisplay.textContent = this.quality + '%';
        };

        const updateFormatUI = () => {
            btnStyle(pngBtn, this.format === 'png');
            btnStyle(jpegBtn, this.format === 'jpeg');
            qualityRow.style.display = this.format === 'jpeg' ? 'flex' : 'none';
        };

        pngBtn.onclick = () => {
            this.format = 'png';
            updateFormatUI();
        };
        jpegBtn.onclick = () => {
            this.format = 'jpeg';
            updateFormatUI();
        };

        const croplessRow = contentEl.createDiv({ attr: { style: 'display: flex; align-items: center; gap: 8px; margin-bottom: 12px;' } });
        const croplessCheckbox = croplessRow.createEl('input', { attr: { type: 'checkbox', id: 'hc-export-cropless' } });
        croplessCheckbox.checked = this.cropless;
        croplessCheckbox.onchange = () => {
            this.cropless = croplessCheckbox.checked;
        };
        croplessRow.createEl('label', { text: localizeString('modal.exportCropless'), attr: { for: 'hc-export-cropless', style: 'cursor: pointer;' } });

        const btnRow = contentEl.createDiv({ attr: { style: 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;' } });
        const cancelBtn = btnRow.createEl('button', { text: localizeString('modal.colorPickerCancel') });
        cancelBtn.onclick = () => this.close();
        const exportBtn = btnRow.createEl('button', { text: localizeString('modal.exportExport'), cls: 'mod-cta' });
        exportBtn.onclick = () => {
            this.onExport(this.format, this.imgWidth, this.quality, this.cropless);
            this.close();
        };

        updateFormatUI();
    }
}
