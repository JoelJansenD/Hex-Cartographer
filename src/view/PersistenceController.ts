import { TFile } from 'obsidian';
import { extractJsonFromMarkdown, parseMapData, serializeMapToFileContent } from '../data/serialization';

/**
 * Handles file persistence for a HexCartographerView:
 * setState file-loading, reload, save, and debounced requestSave.
 */
export class PersistenceController {
    private readonly view: any;

    constructor(view: any) {
        this.view = view;
    }

    /**
     * Handle the file-loading portion of the Obsidian setState lifecycle.
     * Call this from the view's setState override before invoking super.setState.
     */
    async setState(state: any): Promise<void> {
        if (state && state.file) {
            const file = this.view.app.vault.getAbstractFileByPath(state.file);
            if (file instanceof TFile) {
                this.view.file = file;
                await this.reload();
            }
        }
    }

    /** Read and apply the current file, updating all view state and triggering re-render. */
    async reload(): Promise<void> {
        if (!this.view.file || this.view.isReloading) return;
        this.view.isReloading = true;
        try {
            if (this.view.svgLoadPromise && !this.view.svgSymbolsLoaded) {
                await this.view.svgLoadPromise;
            }

            const content = await this.view.app.vault.read(this.view.file);
            const jsonContent = extractJsonFromMarkdown(content);
            const newData = parseMapData(jsonContent);

            if (newData.settings) {
                if (newData.settings.colorPalette) {
                    this.view.colorPalette = newData.settings.colorPalette;
                }
                if (newData.settings.colorPalette2) {
                    this.view.colorPalette2 = newData.settings.colorPalette2;
                }
                if (newData.settings.activeColorSlot !== undefined) {
                    this.view.activeColorSlot = newData.settings.activeColorSlot;
                }
                this.view.editMode = newData.settings.editMode === true;
                if (newData.settings.hexOrientation !== undefined) this.view.hexOrientation = newData.settings.hexOrientation === true;
                const savedToolGroup = newData.settings.currentToolGroup || null;
                const savedDrawMode = newData.settings.drawMode || 'pen';
                if (this.view.editMode) {
                    this.view.currentToolGroup = savedToolGroup;
                    this.view.drawMode = savedDrawMode;
                } else {
                    this.view.currentToolGroup = null;
                    this.view.drawMode = 'pen';
                    this.view._savedToolGroup = savedToolGroup;
                    this.view._savedDrawMode = savedDrawMode;
                }
                if (newData.settings.toolConfigs) {
                    ['grass', 'tree', 'mountain', 'building'].forEach(key => {
                        if (newData.settings.toolConfigs[key] && this.view.toolConfigs[key]) {
                            const saved = newData.settings.toolConfigs[key];
                            if (saved.currentVariant !== undefined) {
                                this.view.toolConfigs[key].currentVariant = saved.currentVariant;
                            }
                            if (saved.symbolColor !== undefined) {
                                this.view.toolConfigs[key].symbolColor = saved.symbolColor;
                            }
                            if (saved.backgroundColor !== undefined) {
                                this.view.toolConfigs[key].backgroundColor = saved.backgroundColor;
                            }
                            if (saved.backgroundEnabled !== undefined) {
                                this.view.toolConfigs[key].backgroundEnabled = saved.backgroundEnabled;
                            }
                        }
                    });
                    this.view.svgLoader.updateButtonIcons();
                } else {
                    this.view.svgLoader.updateToolConfigDefaults();
                    this.view.svgLoader.updateButtonIcons();
                }
                if (newData.settings.patternData) {
                    this.view.patternData = newData.settings.patternData;
                }
                if (newData.settings.patternSourceHex) {
                    this.view.patternSourceHex = newData.settings.patternSourceHex;
                }
                if (newData.settings.borderSettings) {
                    this.view.borderSettings = newData.settings.borderSettings;
                    this.view.borderSettings.activeRegionId = null;
                    this.view.borderSettings.pickedHex = null;
                }
                if (newData.settings.riverSettings) {
                    this.view.riverSettings = newData.settings.riverSettings;
                    this.view.riverSettings.editMode = false;
                    this.view.riverSettings.activeRiverId = null;
                    this.view.riverSettings.insertAfter = null;
                }
                if (newData.settings.roadSettings) {
                    this.view.roadSettings = newData.settings.roadSettings;
                    this.view.roadSettings.editMode = false;
                    this.view.roadSettings.activeRoadId = null;
                    this.view.roadSettings.insertAfter = null;
                }
                if (newData.settings.hexColorColor) {
                    this.view.hexColorColor = newData.settings.hexColorColor;
                }
                if (newData.settings.lastUsedTextSize !== undefined) this.view.lastUsedTextSize = newData.settings.lastUsedTextSize;
                if (newData.settings.lastUsedTextOutline !== undefined) this.view.lastUsedTextOutline = newData.settings.lastUsedTextOutline;
                if (newData.settings.lastUsedTextBold !== undefined) this.view.lastUsedTextBold = newData.settings.lastUsedTextBold;
                if (newData.settings.lastUsedTextShadow !== undefined) this.view.lastUsedTextShadow = newData.settings.lastUsedTextShadow;
                if (newData.settings.lastUsedTextShadowDistance !== undefined) this.view.lastUsedTextShadowDistance = newData.settings.lastUsedTextShadowDistance;
                if (newData.settings.lastUsedTextShadowOpatown !== undefined) this.view.lastUsedTextShadowOpatown = newData.settings.lastUsedTextShadowOpatown;
                if (newData.settings.masterColor) {
                    this.view.masterColor = newData.settings.masterColor;
                    if (this.view.masterColorInput) {
                        this.view.masterColorInput.value = this.view.masterColor;
                        if (this.view.masterColorBtn) this.view.masterColorBtn.style.backgroundColor = this.view.masterColor;
                    }
                }
                if (this.view.currentToolGroup === 'hexcolor') {
                    this.view.masterColor = this.view.hexColorColor;
                    if (this.view.masterColorInput) {
                        this.view.masterColorInput.value = this.view.masterColor;
                        if (this.view.masterColorBtn) this.view.masterColorBtn.style.backgroundColor = this.view.masterColor;
                    }
                } else if (this.view.currentToolGroup && this.view.toolConfigs[this.view.currentToolGroup]) {
                    this.view.masterColor = this.view.toolConfigs[this.view.currentToolGroup].symbolColor;
                    if (this.view.masterColorInput) {
                        this.view.masterColorInput.value = this.view.masterColor;
                        if (this.view.masterColorBtn) this.view.masterColorBtn.style.backgroundColor = this.view.masterColor;
                    }
                }
            } else {
                this.view.svgLoader.updateToolConfigDefaults();
                this.view.svgLoader.updateButtonIcons();
            }

            if (JSON.stringify(this.view.data) !== JSON.stringify(newData)) {
                this.view.data = Object.assign({}, newData);

                if (this.view.canvas) {
                    if (this.view.data.settings && this.view.data.settings.viewportSaved) {
                        this.view.render();
                    } else if (Object.keys(this.view.data.hexes).length > 0) {
                        setTimeout(() => { this.view.fitMapToView(); }, 100);
                    } else {
                        if (this.view.canvas.width > 0) {
                            this.view.data.offX = this.view.canvas.width / 2;
                            this.view.data.offY = this.view.canvas.height / 2;
                        }
                        this.view.render();
                    }
                }
            }

            if (this.view.containerEl) {
                const toolbar = this.view.containerEl.querySelector('.hex-toolbar');
                if (toolbar) {
                    this.view.updateToolbarState(toolbar);
                    if (this.view.editMode) {
                        setTimeout(() => {
                            this.view.updateToolbarState(toolbar);
                            this.view.recalcToolbarWidths();
                        }, 50);
                    }
                }
            }
        } catch (e) {
            console.error("HexCartographer Sync Fehler:", e);
        } finally {
            this.view.isReloading = false;
        }
    }

    /** Persist the current map state to disk. */
    async save(): Promise<void> {
        if (this.view.file && await this.view.app.vault.adapter.exists(this.view.file.path)) {
            this.view.isSaving = true;
            try {
                const toolConfigsToSave: Record<string, any> = {};
                Object.keys(this.view.toolConfigs).forEach(key => {
                    toolConfigsToSave[key] = {
                        currentVariant: this.view.toolConfigs[key].currentVariant,
                        symbolColor: this.view.toolConfigs[key].symbolColor,
                        backgroundColor: this.view.toolConfigs[key].backgroundColor,
                        backgroundEnabled: this.view.toolConfigs[key].backgroundEnabled,
                    };
                });

                if (this.view.canvas && this.view.data.zoom) {
                    this.view.data.centerWorldX = (this.view.canvas.width / 2 - this.view.data.offX) / this.view.data.zoom;
                    this.view.data.centerWorldY = (this.view.canvas.height / 2 - this.view.data.offY) / this.view.data.zoom;
                }

                this.view.data.settings = {
                    colorPalette: this.view.colorPalette,
                    colorPalette2: this.view.colorPalette2,
                    activeColorSlot: this.view.activeColorSlot,
                    drawMode: !this.view.editMode && this.view._savedDrawMode ? this.view._savedDrawMode : this.view.drawMode,
                    currentToolGroup: !this.view.editMode && this.view._savedToolGroup !== undefined ? this.view._savedToolGroup : this.view.currentToolGroup,
                    toolConfigs: toolConfigsToSave,
                    patternData: this.view.patternData,
                    patternSourceHex: this.view.patternSourceHex,
                    borderSettings: this.view.borderSettings,
                    riverSettings: this.view.riverSettings,
                    roadSettings: this.view.roadSettings,
                    masterColor: this.view.masterColor,
                    editMode: this.view.editMode,
                    hexColorColor: this.view.hexColorColor,
                    lastUsedTextSize: this.view.lastUsedTextSize,
                    lastUsedTextOutline: this.view.lastUsedTextOutline,
                    lastUsedTextBold: this.view.lastUsedTextBold,
                    lastUsedTextShadow: this.view.lastUsedTextShadow,
                    lastUsedTextShadowDistance: this.view.lastUsedTextShadowDistance,
                    lastUsedTextShadowOpatown: this.view.lastUsedTextShadowOpatown,
                    viewportSaved: true,
                    hexOrientation: this.view.hexOrientation,
                };

                const title = this.view.file.basename.replace('.hexcartographer', '');
                const content = serializeMapToFileContent(this.view.data, title);

                await this.view.app.vault.modify(this.view.file, content);
            } catch (e) {
                console.error(e);
            } finally {
                setTimeout(() => { this.view.isSaving = false; }, 200);
            }
        }
    }

    /** Schedule a debounced save (1 s after the last call). */
    requestSave(): void {
        if (this.view.saveTimeout) clearTimeout(this.view.saveTimeout);
        this.view.saveTimeout = setTimeout(() => this.save(), 1000);
    }
}
