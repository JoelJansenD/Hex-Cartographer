import { Plugin, Notice } from 'obsidian';
import { t, setCurrentLanguage, getObsidianLanguage } from '../i18n';
import { serializeMapToFileContent, createInitialMapData } from '../data/serialization';
import { DEFAULT_SETTINGS } from './settings';
import { HexCartographerSettingTab } from '../settings/HexCartographerSettingTab';
import { HexCartographerView } from '../main';

// === Hauptklasse des Plugins ===
class HexCartographerPlugin extends Plugin {
    [key: string]: any;
    async onload() {
        await this.loadSettings();
        setCurrentLanguage(getObsidianLanguage());
        this.addSettingTab(new HexCartographerSettingTab(this.app, this as any));

        this.registerView('hex-cartographer', (leaf) => new HexCartographerView(leaf, this));

        this.registerExtensions(['hexcartographer.md'], 'hex-cartographer');

        this.registerEvent(
            this.app.workspace.on('file-open', async (file) => {
                if (!file || !file.path) return;
                if (file.path.endsWith('.hexcartographer.md')) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    const leaves = this.app.workspace.getLeavesOfType('markdown');
                    for (const leaf of leaves) {
                        if (leaf.view.file && leaf.view.file.path === file.path) {
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
                if (leaf && leaf.view && leaf.view.getViewType() === 'markdown' &&
                    leaf.view.file && leaf.view.file.path.endsWith('.hexcartographer.md')) {
                    await leaf.setViewState({
                        type: 'hex-cartographer',
                        state: { file: leaf.view.file.path }
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
                        .setTitle(t('menu.createNew'))
                        .setIcon('map')
                        .setSection('create')
                        .onClick(async () => {
                            await this.createNewHexMap(file);
                        });
                });
            })
        );

        this.registerEvent(this.app.vault.on('delete', (file) => {
            const leaves = this.app.workspace.getLeavesOfType('hex-cartographer');
            leaves.forEach(leaf => {
                if (leaf.view instanceof HexCartographerView && leaf.view.file && leaf.view.file.path === file.path) {
                    if (leaf.view.saveTimeout) clearTimeout(leaf.view.saveTimeout);
                    leaf.detach();
                }
            });
        }));

        this.registerEvent(this.app.vault.on('modify', (file) => {
            const leaves = this.app.workspace.getLeavesOfType('hex-cartographer');
            leaves.forEach(leaf => {
                const view = leaf.view;
                if (view instanceof HexCartographerView && view.file && view.file.path === file.path) {
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
                if (view instanceof HexCartographerView && view.file &&
                    (view.file.path === oldPath || view.file === file)) {
                    view.file = file;
                }
            });
            setTimeout(() => {
                const allLeaves = this.app.workspace.getLeavesOfType('hex-cartographer');
                allLeaves.forEach((leaf) => {
                    const view = leaf.view;
                    if (view instanceof HexCartographerView && view.file) {
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
                if (view instanceof HexCartographerView && view.file && view.file.path === file.path) {
                    view.reloadFile();
                }
            });
        }));

        this.registerEvent(this.app.workspace.on('active-leaf-change', (leaf) => {
            document.querySelectorAll('.nav-file-title.hex-active').forEach(el => {
                el.classList.remove('is-active');
                el.classList.remove('hex-active');
            });

            if (leaf?.view instanceof HexCartographerView && leaf.view.file) {
                setTimeout(() => {
                    document.querySelectorAll('.nav-file-title.is-active').forEach(el => {
                        el.classList.remove('is-active');
                    });
                    const fileEl = document.querySelector(`.nav-file-title[data-path="${CSS.escape(leaf.view.file.path)}"]`);
                    if (fileEl) {
                        fileEl.classList.add('is-active');
                        fileEl.classList.add('hex-active');
                    }
                }, 50);
            } else if (leaf?.view?.file) {
                setTimeout(() => {
                    const fileEl = document.querySelector(`.nav-file-title[data-path="${CSS.escape(leaf.view.file.path)}"]`);
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
                    (activeLeaf.view instanceof HexCartographerView && activeLeaf.view.file?.path);
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

    async createNewHexMap(targetFile = null) {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const fileName = `HexMap_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${pad(now.getDate())}${pad(now.getMonth() + 1)}${String(now.getFullYear()).slice(-2)}.hexcartographer.md`;

        let folderPath = '';
        if (targetFile) {
            if (targetFile.children) {
                folderPath = targetFile.path;
            }
            else if (targetFile.parent) {
                folderPath = targetFile.parent.path;
            }
        }

        const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

        const initialData = createInitialMapData();

        try {
            const content = serializeMapToFileContent(initialData, fileName.replace('.hexcartographer.md', ''));

            const file = await this.app.vault.create(filePath, content);
            const leaf = this.app.workspace.getLeaf(false);
            await leaf.setViewState({
                type: 'hex-cartographer',
                active: true,
                state: { file: file.path }
            });
        } catch (err) {
            new Notice(t('notice.fileCreateError', { error: err }));
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
