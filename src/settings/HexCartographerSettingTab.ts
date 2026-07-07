import { Plugin, PluginSettingTab, Setting, setIcon } from 'obsidian';
import { t } from '../i18n';
import { SVG_SYMBOL_DATA } from '../data/svgSymbols';
import { PluginSettings } from '../plugin/settings';

/** Clamps a raw string input to a valid hex-numbering font size (4–40). */
export function clampFontSize(value: string): number {
    return Math.min(40, Math.max(4, parseInt(value) || 10));
}

/** Returns true when num is a valid export-width value (64–8192). */
export function isValidExportWidth(num: number): boolean {
    return num >= 64 && num <= 8192;
}

/** Section definitions for the in-settings user guide. */
export const GUIDE_SECTIONS: [string, [string | null, string][]][] = [
    ['basics', [
        [null, 'guide.basics.create'],
        ['wrench', 'guide.basics.editMode'],
        ['rotate-cw', 'guide.basics.hexOrientation'],
    ]],
    ['navigation', [
        [null, 'guide.navigation.zoom'],
        [null, 'guide.navigation.pan'],
        ['maximize-2', 'guide.navigation.fit'],
    ]],
    ['hexcolor', [
        ['hexagon', 'guide.hexcolor.paint'],
        ['pipette', 'guide.hexcolor.eyedropper'],
        [null, 'guide.hexcolor.palette'],
    ]],
    ['symbols', [
        ['pine', 'guide.symbols.groups'],
        [null, 'guide.symbols.variant'],
        [null, 'guide.symbols.colors'],
    ]],
    ['drawing', [
        ['pencil', 'guide.drawing.pen'],
        ['paint-bucket', 'guide.drawing.fill'],
        ['eraser', 'guide.drawing.eraser'],
        ['mouse-pointer-2', 'guide.drawing.rightclick'],
    ]],
    ['pattern', [
        ['copy', 'guide.pattern.stamp'],
        ['pipette', 'guide.pattern.pick'],
    ]],
    ['paths', [
        ['waves', 'guide.paths.river'],
        ['route', 'guide.paths.road'],
        ['mouse-pointer', 'guide.paths.pick'],
        ['text-cursor-input', 'guide.paths.width'],
        ['text-cursor-input', 'guide.paths.dashes'],
    ]],
    ['borders', [
        ['shield', 'guide.borders.draw'],
        ['mouse-pointer', 'guide.borders.pick'],
        ['text-cursor-input', 'guide.borders.dash'],
        ['eye', 'guide.borders.visibility'],
    ]],
    ['text', [
        ['type', 'guide.text.tool'],
    ]],
    ['undoredo', [
        ['undo-2', 'guide.undoredo.undo'],
        ['redo-2', 'guide.undoredo.redo'],
    ]],
    ['print', [
        ['printer', 'guide.print.pc'],
        ['download', 'guide.print.export'],
        ['smartphone', 'guide.print.exportMobile'],
    ]],
    ['touch', [
        ['pointer', 'guide.touch.tap'],
        ['timer', 'guide.touch.longpress'],
        ['zoom-in', 'guide.touch.zoom'],
        ['move', 'guide.touch.pan'],
    ]],
];

interface IHexCartographerPlugin extends Plugin {
    settings: PluginSettings;
    saveSettings(): Promise<void>;
}

export class HexCartographerSettingTab extends PluginSettingTab {
    [key: string]: any;
    plugin: IHexCartographerPlugin;

    constructor(app: any, plugin: IHexCartographerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Hex Cartographer' });

        new Setting(containerEl)
            .setDesc(t('settings.donateText'))
            .addButton(btn => {
                btn.setButtonText(t('settings.donateButton'))
                    .setCta()
                    .onClick(() => {
                        window.open('https://ko-fi.com/christophwerner', '_blank');
                    });
            });

        new Setting(containerEl)
            .setName(t('settings.exportWidth'))
            .setDesc(t('settings.exportWidthDesc'))
            .addText(text => {
                text.inputEl.type = 'number';
                text.inputEl.min = '64';
                text.inputEl.max = '8192';
                text.inputEl.step = '1';
                text.setValue(String(this.plugin.settings.exportWidth))
                    .onChange(async (value) => {
                        const num = parseInt(value);
                        if (isValidExportWidth(num)) {
                            this.plugin.settings.exportWidth = num;
                            await this.plugin.saveSettings();
                        }
                    });
            });

        new Setting(containerEl)
            .setName(t('settings.showCrosshair'))
            .setDesc(t('settings.showCrosshairDesc'))
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.showCrosshair)
                    .onChange(async (value) => {
                        this.plugin.settings.showCrosshair = value;
                        await this.plugin.saveSettings();
                        this.app.workspace.iterateAllLeaves((leaf: any) => {
                            if (leaf.view.getViewType() === 'hex-cartographer') leaf.view.render();
                        });
                    });
            });

        new Setting(containerEl)
            .setName(t('settings.hideHexBorders'))
            .setDesc(t('settings.hideHexBordersDesc'))
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.hideHexBorders)
                    .onChange(async (value) => {
                        this.plugin.settings.hideHexBorders = value;
                        await this.plugin.saveSettings();
                        this.app.workspace.iterateAllLeaves((leaf: any) => {
                            if (leaf.view.getViewType() === 'hex-cartographer') leaf.view.render();
                        });
                    });
            });

        // ── Hex numbering ─────────────────────────────────────────
        containerEl.createEl('h3', { text: t('settings.hexNumbering') });

        const refreshAll = async () => {
            await this.plugin.saveSettings();
            this.app.workspace.iterateAllLeaves((leaf: any) => {
                if (leaf.view.getViewType() === 'hex-cartographer') leaf.view.render();
            });
        };

        // Master toggle
        new Setting(containerEl)
            .setName(t('settings.hexNumbering'))
            .setDesc(t('settings.hexNumberingDesc'))
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.hexNumberingEnabled)
                    .onChange(async (value) => {
                        this.plugin.settings.hexNumberingEnabled = value;
                        // Show/hide sub-options
                        subOptions.forEach(el => el.settingEl.style.display = value ? '' : 'none');
                        await refreshAll();
                    });
            });

        const subOptions: Setting[] = [];
        const hide = !this.plugin.settings.hexNumberingEnabled;

        // Counting direction: one toggle — off=horizontal (default), on=vertical
        const dirSetting = new Setting(containerEl)
            .setName(t('settings.hexNumberingVertical'))
            .setDesc(t('settings.hexNumberingVerticalDesc'))
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.hexNumberingDirection === 'vertical')
                    .onChange(async (value) => {
                        this.plugin.settings.hexNumberingDirection = value ? 'vertical' : 'horizontal';
                        await refreshAll();
                    });
            });
        subOptions.push(dirSetting);

        // Coordinate mode
        // Remembered chess state: saved when coordinate mode is disabled
        // and restored when re-enabled
        let rememberedChessState = this.plugin.settings.hexNumberingAlphaChess;

        const alphaSetting = new Setting(containerEl)
            .setName(t('settings.hexNumberingAlpha'))
            .setDesc(t('settings.hexNumberingAlphaDesc'))
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.hexNumberingAlpha)
                    .onChange(async (value) => {
                        this.plugin.settings.hexNumberingAlpha = value;
                        if (!value) {
                            // Remember state, disable and lock chess toggle
                            rememberedChessState = this.plugin.settings.hexNumberingAlphaChess;
                            this.plugin.settings.hexNumberingAlphaChess = false;
                            chessToggle.setValue(false);
                            chessToggle.setDisabled(true);
                        } else {
                            // Restore saved state
                            chessToggle.setDisabled(false);
                            this.plugin.settings.hexNumberingAlphaChess = rememberedChessState;
                            chessToggle.setValue(rememberedChessState);
                        }
                        await refreshAll();
                    });
            });
        subOptions.push(alphaSetting);

        // Chess-style letter coordinates
        let chessToggle: any;
        const chessModeSetting = new Setting(containerEl)
            .setName(t('settings.hexNumberingAlphaChess'))
            .setDesc(t('settings.hexNumberingAlphaChessDesc'))
            .addToggle(toggle => {
                chessToggle = toggle;
                toggle.setValue(this.plugin.settings.hexNumberingAlphaChess);
                // Lock initially if coordinate mode is off
                if (!this.plugin.settings.hexNumberingAlpha) toggle.setDisabled(true);
                toggle.onChange(async (value) => {
                    this.plugin.settings.hexNumberingAlphaChess = value;
                    rememberedChessState = value;
                    await refreshAll();
                });
            });
        subOptions.push(chessModeSetting);

        // Label position (dropdown)
        const posSetting = new Setting(containerEl)
            .setName(t('settings.hexNumberingPosition'))
            .addDropdown(drop => {
                drop.addOption('top', t('settings.hexNumberingPositionTop'));
                drop.addOption('bottom', t('settings.hexNumberingPositionBottom'));
                drop.setValue(this.plugin.settings.hexNumberingPosition)
                    .onChange(async (value) => {
                        this.plugin.settings.hexNumberingPosition = value;
                        await refreshAll();
                    });
            });
        subOptions.push(posSetting);

        // Label color
        const colorSetting = new Setting(containerEl)
            .setName(t('settings.hexNumberingColor'))
            .addColorPicker(picker => {
                picker.setValue(this.plugin.settings.hexNumberingColor)
                    .onChange(async (value) => {
                        this.plugin.settings.hexNumberingColor = value;
                        await refreshAll();
                    });
            });
        subOptions.push(colorSetting);

        // Label font size
        const fontSizeSetting = new Setting(containerEl)
            .setName(t('settings.hexNumberingFontSize'))
            .setDesc(t('settings.hexNumberingFontSizeDesc'))
            .addText(text => {
                text.inputEl.type = 'number';
                text.inputEl.min = '4';
                text.inputEl.max = '40';
                text.inputEl.style.width = '60px';
                text.setValue(String(this.plugin.settings.hexNumberingFontSize))
                    .onChange(async (value) => {
                        const num = clampFontSize(value);
                        this.plugin.settings.hexNumberingFontSize = num;
                        await refreshAll();
                    });
            });
        subOptions.push(fontSizeSetting);

        // Label outline
        const outlineSetting = new Setting(containerEl)
            .setName(t('settings.hexNumberingOutline'))
            .setDesc(t('settings.hexNumberingOutlineDesc'))
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.hexNumberingOutline)
                    .onChange(async (value) => {
                        this.plugin.settings.hexNumberingOutline = value;
                        await refreshAll();
                    });
            });
        subOptions.push(outlineSetting);

        // Set initial visibility of sub-options
        subOptions.forEach(el => el.settingEl.style.display = hide ? 'none' : '');

        this.buildGuide(containerEl);
    }

    buildGuide(containerEl: HTMLElement) {
        containerEl.createEl('h3', { text: t('guide.title') });

        for (const [key, items] of GUIDE_SECTIONS) {
            const details = containerEl.createEl('details');
            details.createEl('summary', { text: t(`guide.${key}`), cls: 'hex-guide-summary' });
            const content = details.createEl('div', { cls: 'hex-guide-content' });
            for (const [icon, textKey] of items) {
                const row = content.createEl('div', { cls: 'hex-guide-row' });
                const iconEl = row.createEl('span', { cls: 'hex-guide-icon' });
                if (icon && icon.startsWith('input:')) {
                    iconEl.createEl('span', { text: icon.slice(6), cls: 'hex-guide-input-icon' });
                } else if (icon && SVG_SYMBOL_DATA[icon]) {
                    const data = SVG_SYMBOL_DATA[icon];
                    const svgEl = iconEl.createSvg('svg', { attr: { viewBox: `0 0 ${data.viewBoxWidth} ${data.viewBoxWidth}`, width: '16', height: '16' } });
                    svgEl.createSvg('path', { attr: { d: data.pathData, fill: 'currentColor' } });
                } else if (icon) {
                    setIcon(iconEl, icon);
                }
                const textEl = row.createEl('span');
                textEl.innerHTML = t(textKey);
            }
        }

        const style = containerEl.createEl('style');
        style.textContent = `
            .hex-guide-summary { cursor: pointer; font-weight: 600; padding: 6px 0; }
            .hex-guide-content { padding: 4px 0 8px 12px; }
            .hex-guide-row { display: flex; align-items: flex-start; gap: 8px; padding: 3px 0; }
            .hex-guide-icon { display: flex; align-items: center; justify-content: center; width: 20px; flex-shrink: 0; margin-top: 2px; }
            .hex-guide-icon svg { width: 16px; height: 16px; }
            .hex-guide-input-icon { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 16px; border: 1px solid var(--text-muted); border-radius: 3px; font-size: 10px; line-height: 1; color: var(--text-muted); }
        `;
    }
}
