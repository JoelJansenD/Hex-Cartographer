import { Plugin, Notice, TFolder } from 'obsidian';
import {
    loadTranslations,
    localizeString,
} from './functions/i18n';
import { PluginSettings } from './types-legacy';
import {
    createDefaultMapDocumentData,
    createNewMapFile,
} from './services/map-document-service';
import { HexCartographerViewLegacy } from './views/hex-cartographer-view-legacy';
import HexCartographerSettingTab from './settings/hex-cartographer-setting-tab';
import HexCartographerView from './views/hex-cartographer-view/hex-cartographer-view';


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

        this.registerView('hex-cartographer', (leaf) => new HexCartographerView(this, leaf));
        // this.registerView('hex-cartographer', (leaf) => new HexCartographerViewLegacy(leaf, this));

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

export default HexCartographerPlugin;
