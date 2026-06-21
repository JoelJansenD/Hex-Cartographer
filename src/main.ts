import { Plugin, PluginSettingTab, Setting, TFile, Notice, setIcon, TFolder } from 'obsidian';
import {
    loadTranslations,
    localizeString,
} from './functions/i18n';
import { PluginSettings } from './types';
import { SVG_SYMBOL_DATA } from './data/svg-symbol-data';
import {
    createDefaultMapDocumentData,
    createNewMapFile,
} from './services/map-document-service';
import { HexCartographerViewLegacy } from './views/hex-cartographer-view';


const DEFAULT_SETTINGS: PluginSettings = {
    exportWidth: 1024,
    showCrosshair: true,
    hideHexBorders: false,
    hexNumberingEnabled: false,
    hexNumberingDirection: 'horizontal',
    hexNumberingAlpha: false,
    hexNumberingAlphaChess: false,
    hexNumberingPosition: 'top',
    hexNumberingColor: '#ffffff',
    hexNumberingOutline: true,
    hexNumberingFontSize: 10,
};

// === Hauptklasse des Plugins ===
class HexCartographerPlugin extends Plugin {
    settings: PluginSettings = DEFAULT_SETTINGS;

    async onload() {
        await this.loadSettings();
        await loadTranslations();
        // currentLanguage = getObsidianLanguage();
        this.addSettingTab(new HexCartographerSettingTab(this.app, this));

        this.registerView('hex-cartographer', (leaf) => new HexCartographerViewLegacy(leaf, this));

        this.registerExtensions(['hexcartographer.md'], 'hex-cartographer');

        this.registerEvent(
            this.app.workspace.on('file-open', async (file) => {
                if (!file || !file.path) return;
                if (file.path.endsWith('.hexcartographer.md')) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    const leaves = this.app.workspace.getLeavesOfType('markdown');
                    for (const leaf of leaves) {
                        const hexCartographerView = leaf.view as HexCartographerViewLegacy;
                        if(!hexCartographerView?.file) {
                            continue;
                        }

                        if (hexCartographerView.file.path === file.path) {
                            await leaf.setViewState({
                                type: 'hex-cartographer',
                                state: { file: file.path }
                            });
                        }
                    }
                }
            })
        );

        this.registerEvent(
            this.app.workspace.on('active-leaf-change', async (leaf) => {
                const hexCartographerView = leaf?.view as HexCartographerViewLegacy;
                if (leaf && leaf.view && leaf.view.getViewType() === 'markdown' &&
                    hexCartographerView?.file && hexCartographerView.file.path.endsWith('.hexcartographer.md')) {
                    await leaf.setViewState({
                        type: 'hex-cartographer',
                        state: { file: hexCartographerView.file.path }
                    });
                }
            })
        );

        setTimeout(() => {
            this.hideHexExtensionInExplorer();
        }, 500);

        this.registerEvent(this.app.vault.on('rename', async (file, oldPath) => {
            if (oldPath.endsWith('.hexcartographer.md') && !file.path.endsWith('.hexcartographer.md')) {
                const newName = file.name.replace(/\.md$/, '') + '.hexcartographer.md';
                const newPath = file.parent ? `${file.parent.path}/${newName}` : newName;
                await this.app.fileManager.renameFile(file, newPath);
            } else if (file.path.endsWith('.hexcartographer.md')) {
                this.hideHexExtensionInExplorer();
            }
        }));

        this.addRibbonIcon('map', 'Create Hex Map', async () => {
            await this.createNewHexMap();
        });

        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                menu.addItem((item) => {
                    item
                        .setTitle(localizeString('menu.createNew'))
                        .setIcon('map')
                        .setSection('create')
                        .onClick(async () => {
                            await this.createNewHexMap(file as TFolder);
                        });
                });
            })
        );

        this.registerEvent(this.app.vault.on('delete', (file) => {
            const leaves = this.app.workspace.getLeavesOfType('hex-cartographer');
            leaves.forEach(leaf => {
                if (leaf.view instanceof HexCartographerViewLegacy && leaf.view.file && leaf.view.file.path === file.path) {
                    leaf.view.cancelPendingSave();
                    leaf.detach();
                }
            });
        }));

        this.registerEvent(this.app.vault.on('modify', (file) => {
            const leaves = this.app.workspace.getLeavesOfType('hex-cartographer');
            leaves.forEach(leaf => {
                const view = leaf.view;
                if (view instanceof HexCartographerViewLegacy && view.file && view.file.path === file.path) {
                    if (!view.isSaving) {
                        view.reloadFile();
                    }
                }
            });
        }));

        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            const leaves = this.app.workspace.getLeavesOfType('hex-cartographer');
            leaves.forEach((leaf) => {
                const view = leaf.view;
                if (view instanceof HexCartographerViewLegacy && view.file &&
                    (view.file.path === oldPath || view.file === file)) {
                    view.file = file;
                }
            });
            setTimeout(() => {
                const allLeaves = this.app.workspace.getLeavesOfType('hex-cartographer');
                allLeaves.forEach((leaf: any) => {
                    const view = leaf.view;
                    if (view instanceof HexCartographerViewLegacy && view.file) {
                        leaf.updateHeader();
                        const titleEl = leaf.tabHeaderEl?.querySelector('.workspace-tab-header-inner-title');
                        if (titleEl) {
                            titleEl.textContent = view.getDisplayText();
                        }
                    }
                });
            }, 300);
        }));

        this.registerEvent(this.app.workspace.on('file-open', (file) => {
            if (!file || file.extension !== 'hexcartographer') return;

            const leaves = this.app.workspace.getLeavesOfType('hex-cartographer');
            leaves.forEach((leaf) => {
                const view = leaf.view;
                if (view instanceof HexCartographerViewLegacy && view.file && view.file.path === file.path) {
                    view.reloadFile();
                }
            });
        }));

        this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf) => {
            document.querySelectorAll('.nav-file-title.hex-active').forEach(el => {
                el.classList.remove('is-active');
                el.classList.remove('hex-active');
            });

            if (leaf?.view instanceof HexCartographerViewLegacy && leaf.view.file) {
                setTimeout(() => {
                    const hexCartographerView = leaf.view as HexCartographerViewLegacy;
                    document.querySelectorAll('.nav-file-title.is-active').forEach(el => {
                        el.classList.remove('is-active');
                    });
                    const fileEl = document.querySelector(`.nav-file-title[data-path="${CSS.escape(hexCartographerView.file.path)}"]`);
                    if (fileEl) {
                        fileEl.classList.add('is-active');
                        fileEl.classList.add('hex-active');
                    }
                }, 50);
            } else if (leaf && (leaf.view as any).file) {
                setTimeout(() => {
                    const view = leaf.view as any;
                    const fileEl = document.querySelector(`.nav-file-title[data-path="${CSS.escape(view.file.path)}"]`);
                    if (fileEl && !fileEl.classList.contains('is-active')) {
                        fileEl.classList.add('is-active');
                    }
                }, 100);
            }
        }));

        this.app.workspace.onLayoutReady(() => {
            setTimeout(() => {
                const activeLeaf = this.app.workspace.activeLeaf;
                if (!activeLeaf) return;
                const state = activeLeaf.getViewState();
                const filePath = state?.state?.file ||
                    (activeLeaf.view instanceof HexCartographerViewLegacy && activeLeaf.view.file?.path);
                if (state?.type === 'hex-cartographer' && filePath) {
                    const fileEl = document.querySelector(`.nav-file-title[data-path="${CSS.escape(filePath)}"]`);
                    if (fileEl) {
                        fileEl.classList.add('is-active');
                        fileEl.classList.add('hex-active');
                    }
                }
            }, 500);
        });
    }

    async createNewHexMap(targetFile: TFolder | null = null) {
        try {
            const file = await createNewMapFile(this.app, targetFile, createDefaultMapDocumentData());
            const leaf = this.app.workspace.getLeaf(false);
            await leaf.setViewState({
                type: 'hex-cartographer',
                active: true,
                state: { file: file.path }
            });
        } catch (err) {
            new Notice(localizeString('notice.fileCreateError', { error: err }));
        }
    }

    hideHexExtensionInExplorer() {
        const hideExtension = () => {
            const fileElements = document.querySelectorAll('.nav-file-title[data-path$=".hexcartographer.md"]');
            fileElements.forEach(el => {
                const titleEl = el.querySelector('.nav-file-title-content');
                if (titleEl && titleEl.textContent.includes('.hexcartographer')) {
                    titleEl.textContent = titleEl.textContent.replace('.hexcartographer', '');
                }

                if (!el.classList.contains('hex-cartographer-file')) {
                    el.classList.add('hex-cartographer-file');
                }
            });
        };

        hideExtension();

        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    shouldUpdate = true;
                }
            });
            if (shouldUpdate) {
                hideExtension();
            }
        });

        const fileExplorer = document.querySelector('.nav-files-container');
        if (fileExplorer) {
            observer.observe(fileExplorer, {
                childList: true,
                subtree: true,
                characterData: true
            });

            this.register(() => observer.disconnect());
        }

        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                setTimeout(hideExtension, 100);
            })
        );

        const intervalId = setInterval(hideExtension, 2000);
        this.register(() => clearInterval(intervalId));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class HexCartographerSettingTab extends PluginSettingTab {
    plugin: HexCartographerPlugin;
    constructor(app, plugin: HexCartographerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Hex Cartographer' });

        new Setting(containerEl)
            .setDesc(localizeString('settings.donateText'))
            .addButton(btn => {
                btn.setButtonText(localizeString('settings.donateButton'))
                    .setCta()
                    .onClick(() => {
                        window.open('https://ko-fi.com/christophwerner', '_blank');
                    });
            });

        new Setting(containerEl)
            .setName(localizeString('settings.exportWidth'))
            .setDesc(localizeString('settings.exportWidthDesc'))
            .addText(text => {
                text.inputEl.type = 'number';
                text.inputEl.min = '64';
                text.inputEl.max = '8192';
                text.inputEl.step = '1';
                text.setValue(String(this.plugin.settings.exportWidth))
                    .onChange(async (value) => {
                        const num = parseInt(value);
                        if (num >= 64 && num <= 8192) {
                            this.plugin.settings.exportWidth = num;
                            await this.plugin.saveSettings();
                        }
                    });
            });

        new Setting(containerEl)
            .setName(localizeString('settings.showCrosshair'))
            .setDesc(localizeString('settings.showCrosshairDesc'))
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.showCrosshair)
                    .onChange(async (value) => {
                        this.plugin.settings.showCrosshair = value;
                        await this.plugin.saveSettings();
                        this.app.workspace.iterateAllLeaves(leaf => {
                            if (leaf.view instanceof HexCartographerViewLegacy) leaf.view.render();
                        });
                    });
            });

        new Setting(containerEl)
            .setName(localizeString('settings.hideHexBorders'))
            .setDesc(localizeString('settings.hideHexBordersDesc'))
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.hideHexBorders)
                    .onChange(async (value) => {
                        this.plugin.settings.hideHexBorders = value;
                        await this.plugin.saveSettings();
                        this.app.workspace.iterateAllLeaves(leaf => {
                            if (leaf.view instanceof HexCartographerViewLegacy) leaf.view.render();
                        });
                    });
            });

        // ── Waben nummerieren ─────────────────────────────────────
        containerEl.createEl('h3', { text: localizeString('settings.hexNumbering') });

        const refreshAll = async () => {
            await this.plugin.saveSettings();
            this.app.workspace.iterateAllLeaves(leaf => {
                if (leaf.view instanceof HexCartographerViewLegacy) leaf.view.render();
            });
        };

        // Master-Schalter
        new Setting(containerEl)
            .setName(localizeString('settings.hexNumbering'))
            .setDesc(localizeString('settings.hexNumberingDesc'))
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.hexNumberingEnabled)
                    .onChange(async (value) => {
                        this.plugin.settings.hexNumberingEnabled = value;
                        // Unteroptionen ein-/ausblenden
                        subOptions.forEach((el:any) => el.settingEl.style.display = value ? '' : 'none');
                        await refreshAll();
                    });
            });

        const subOptions: Setting[] = [];
        const hide = !this.plugin.settings.hexNumberingEnabled;

        // Zähl-Ausrichtung: ein Schalter — aus=horizontal (Standard), ein=vertikal
        const dirSetting = new Setting(containerEl)
            .setName(localizeString('settings.hexNumberingVertical'))
            .setDesc(localizeString('settings.hexNumberingVerticalDesc'))
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.hexNumberingDirection === 'vertical')
                    .onChange(async (value) => {
                        this.plugin.settings.hexNumberingDirection = value ? 'vertical' : 'horizontal';
                        await refreshAll();
                    });
            });
        subOptions.push(dirSetting);

        // Koordinaten Modus
        // Gemerkter Chess-Zustand: wird beim Ausschalten des Koordinatenmodus gespeichert
        // und beim Wiedereinschalten wiederhergestellt
        let rememberedChessState = this.plugin.settings.hexNumberingAlphaChess;

        const alphaSetting = new Setting(containerEl)
            .setName(localizeString('settings.hexNumberingAlpha'))
            .setDesc(localizeString('settings.hexNumberingAlphaDesc'))
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.hexNumberingAlpha)
                    .onChange(async (value) => {
                        this.plugin.settings.hexNumberingAlpha = value;
                        if (!value) {
                            // Zustand merken, Chess deaktivieren und sperren
                            rememberedChessState = this.plugin.settings.hexNumberingAlphaChess;
                            this.plugin.settings.hexNumberingAlphaChess = false;
                            chessToggle.setValue(false);
                            chessToggle.setDisabled(true);
                        } else {
                            // Gespeicherten Zustand wiederherstellen
                            chessToggle.setDisabled(false);
                            this.plugin.settings.hexNumberingAlphaChess = rememberedChessState;
                            chessToggle.setValue(rememberedChessState);
                        }
                        await refreshAll();
                    });
            });
        subOptions.push(alphaSetting);

        // Buchstabenkoordinaten
        let chessToggle;
        const chessModeSetting = new Setting(containerEl)
            .setName(localizeString('settings.hexNumberingAlphaChess'))
            .setDesc(localizeString('settings.hexNumberingAlphaChessDesc'))
            .addToggle(toggle => {
                chessToggle = toggle;
                toggle.setValue(this.plugin.settings.hexNumberingAlphaChess);
                // Initial sperren wenn Koordinatenmodus aus
                if (!this.plugin.settings.hexNumberingAlpha) toggle.setDisabled(true);
                toggle.onChange(async (value) => {
                    this.plugin.settings.hexNumberingAlphaChess = value;
                    rememberedChessState = value;
                    await refreshAll();
                });
            });
        subOptions.push(chessModeSetting);

        // Textausrichtung (Pulldown)
        const posSetting = new Setting(containerEl)
            .setName(localizeString('settings.hexNumberingPosition'))
            .addDropdown(drop => {
                drop.addOption('top', localizeString('settings.hexNumberingPositionTop'));
                drop.addOption('bottom', localizeString('settings.hexNumberingPositionBottom'));
                drop.setValue(this.plugin.settings.hexNumberingPosition)
                    .onChange(async (value) => {
                        if(value !== 'top' && value !== 'bottom') throw new Error(`Invalid hex numbering position: ${value}`);
                        this.plugin.settings.hexNumberingPosition = value;
                        await refreshAll();
                    });
            });
        subOptions.push(posSetting);

        // Textfarbe
        const colorSetting = new Setting(containerEl)
            .setName(localizeString('settings.hexNumberingColor'))
            .addColorPicker(picker => {
                picker.setValue(this.plugin.settings.hexNumberingColor)
                    .onChange(async (value) => {
                        this.plugin.settings.hexNumberingColor = value;
                        await refreshAll();
                    });
            });
        subOptions.push(colorSetting);

        // Textgröße
        const fontSizeSetting = new Setting(containerEl)
            .setName(localizeString('settings.hexNumberingFontSize'))
            .setDesc(localizeString('settings.hexNumberingFontSizeDesc'))
            .addText(text => {
                text.inputEl.type = 'number';
                text.inputEl.min = '4';
                text.inputEl.max = '40';
                text.inputEl.style.width = '60px';
                text.setValue(String(this.plugin.settings.hexNumberingFontSize))
                    .onChange(async (value) => {
                        const num = Math.min(40, Math.max(4, parseInt(value) || 10));
                        this.plugin.settings.hexNumberingFontSize = num;
                        await refreshAll();
                    });
            });
        subOptions.push(fontSizeSetting);

        // Outline
        const outlineSetting = new Setting(containerEl)
            .setName(localizeString('settings.hexNumberingOutline'))
            .setDesc(localizeString('settings.hexNumberingOutlineDesc'))
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.hexNumberingOutline)
                    .onChange(async (value) => {
                        this.plugin.settings.hexNumberingOutline = value;
                        await refreshAll();
                    });
            });
        subOptions.push(outlineSetting);

        // Initial-Sichtbarkeit der Unteroptionen
        subOptions.forEach(el => el.settingEl.style.display = hide ? 'none' : '');

        this.buildGuide(containerEl);
    }

    buildGuide(containerEl) {
        containerEl.createEl('h3', { text: localizeString('guide.title') });

        const guide = [
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

        for (const [key, items] of guide) {
            const details = containerEl.createEl('details');
            details.createEl('summary', { text: localizeString(`guide.${key}`), cls: 'hex-guide-summary' });
            const content = details.createEl('div', { cls: 'hex-guide-content' });
            for (const [icon, textKey] of items!) {
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
                textEl.innerHTML = localizeString(textKey!);
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

export default HexCartographerPlugin;
