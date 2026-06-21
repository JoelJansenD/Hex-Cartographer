import { Modal } from 'obsidian';
import { hsbToHex, hexToHsb } from '../functions/colors';
import { localizeString } from '../functions/i18n';
import { ColorPickerModalCallback } from '../types-legacy';

export class ColorPickerModal extends Modal {
    onSelect: ColorPickerModalCallback;
    initialColor: string;
    hue: number;
    sat: number;
    bri: number;
    previewEl?: HTMLDivElement;
    sbCanvas?: HTMLCanvasElement;
    sbCtx: any;
    hueCanvas?: HTMLCanvasElement;
    hueCtx: any;
    hexInput?: HTMLInputElement;
    _sbDragging: boolean = false;
    _hueDragging: boolean = false;

    constructor(app, initialColor: string, onSelect: ColorPickerModalCallback) {
        super(app);
        this.onSelect = onSelect;
        this.initialColor = initialColor || '#ff0000';
        const hsb = hexToHsb(this.initialColor);
        this.hue = hsb.h;
        this.sat = hsb.s;
        this.bri = hsb.b;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: localizeString('modal.colorPickerTitle') });

        this.previewEl = contentEl.createDiv({
            attr: { style: 'width: 100%; height: 60px; border-radius: 6px; border: 1px solid var(--divider-color); margin-bottom: 12px;' }
        });
        this.previewEl.style.backgroundColor = this.initialColor;

        const sbSize = 256;
        this.sbCanvas = contentEl.createEl('canvas', {
            attr: { width: sbSize, height: sbSize, style: 'width: 100%; aspect-ratio: 1; border-radius: 4px; cursor: crosshair; touch-action: none; display: block;' }
        });
        this.sbCtx = this.sbCanvas.getContext('2d');

        this.hueCanvas = contentEl.createEl('canvas', {
            attr: { width: 256, height: 24, style: 'width: 100%; height: 30px; border-radius: 4px; cursor: pointer; touch-action: none; display: block; margin-top: 10px;' }
        });
        this.hueCtx = this.hueCanvas.getContext('2d');

        const hexRow = contentEl.createDiv({ attr: { style: 'display: flex; align-items: center; gap: 8px; margin-top: 12px;' } });
        hexRow.createEl('label', { text: 'Hex:', attr: { style: 'font-weight: 500;' } });
        this.hexInput = hexRow.createEl('input', { value: this.initialColor, attr: { style: 'flex: 1; padding: 6px; font-family: monospace;' } });
        this.hexInput.addEventListener('input', () => {
            const val = this.hexInput!.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                const hsb = hexToHsb(val);
                this.hue = hsb.h;
                this.sat = hsb.s;
                this.bri = hsb.b;
                this.renderAll();
            }
        });

        const btnRow = contentEl.createDiv({ attr: { style: 'display: flex; gap: 10px; margin-top: 15px;' } });
        const okBtn = btnRow.createEl('button', { text: 'OK', cls: 'mod-cta', attr: { style: 'flex: 1;' } });
        okBtn.onclick = () => {
            this.onSelect(hsbToHex(this.hue, this.sat, this.bri));
            this.close();
        };
        const cancelBtn = btnRow.createEl('button', { text: localizeString('modal.colorPickerCancel'), attr: { style: 'flex: 1;' } });
        cancelBtn.onclick = () => this.close();

        this._sbDragging = false;
        this.sbCanvas.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.sbCanvas!.setPointerCapture(e.pointerId);
            this._sbDragging = true;
            this._updateSB(e);
        });
        this.sbCanvas.addEventListener('pointermove', (e) => { if (this._sbDragging) this._updateSB(e); });
        this.sbCanvas.addEventListener('pointerup', () => { this._sbDragging = false; });

        this._hueDragging = false;
        this.hueCanvas.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.hueCanvas!.setPointerCapture(e.pointerId);
            this._hueDragging = true;
            this._updateHue(e);
        });
        this.hueCanvas.addEventListener('pointermove', (e) => { if (this._hueDragging) this._updateHue(e); });
        this.hueCanvas.addEventListener('pointerup', () => { this._hueDragging = false; });

        this.renderAll();
    }

    _updateSB(e) {
        const rect = this.sbCanvas!.getBoundingClientRect();
        this.sat = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        this.bri = Math.max(0, Math.min(100, (1 - (e.clientY - rect.top) / rect.height) * 100));
        this.renderAll();
    }

    _updateHue(e) {
        const rect = this.hueCanvas!.getBoundingClientRect();
        this.hue = Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360));
        this.renderAll();
    }

    renderAll() {
        const hex = hsbToHex(this.hue, this.sat, this.bri);
        this.previewEl!.style.backgroundColor = hex;
        this.hexInput!.value = hex;
        this.renderSB();
        this.renderHue();
    }

    renderSB() {
        const ctx = this.sbCtx;
        const w = this.sbCanvas!.width;
        const h = this.sbCanvas!.height;
        ctx.fillStyle = hsbToHex(this.hue, 100, 100);
        ctx.fillRect(0, 0, w, h);

        const whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
        whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
        whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = whiteGrad;
        ctx.fillRect(0, 0, w, h);

        const blackGrad = ctx.createLinearGradient(0, 0, 0, h);
        blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
        blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = blackGrad;
        ctx.fillRect(0, 0, w, h);

        const cx = (this.sat / 100) * w;
        const cy = (1 - this.bri / 100) * h;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.strokeStyle = this.bri > 50 ? '#000' : '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    renderHue() {
        const ctx = this.hueCtx;
        const w = this.hueCanvas!.width;
        const h = this.hueCanvas!.height;
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        const stops = [0, 60, 120, 180, 240, 300, 360];
        stops.forEach(deg => grad.addColorStop(deg / 360, `hsl(${deg}, 100%, 50%)`));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        const x = (this.hue / 360) * w;
        ctx.beginPath();
        ctx.rect(x - 3, 0, 6, h);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}
