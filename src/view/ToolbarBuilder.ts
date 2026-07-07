import { setIcon, Modal, Notice } from 'obsidian';
import { t } from '../i18n';
import {
    DEFAULT_EXTRAS_SYMBOL_COLOR, DEFAULT_EXTRAS_BG_COLOR,
    DEFAULT_VEGETATION_SYMBOL_COLOR, DEFAULT_VEGETATION_BG_COLOR,
    DEFAULT_MOUNTAIN_SYMBOL_COLOR, DEFAULT_MOUNTAIN_BG_COLOR,
    DEFAULT_BUILDING_SYMBOL_COLOR, DEFAULT_BUILDING_BG_COLOR,
    DEFAULT_RIVER_WIDTH, DEFAULT_ROAD_WIDTH, DEFAULT_PATH_DASHES,
    DEFAULT_BORDER_DASHES, TOOLBAR_INPUT_FONT_SIZE, TOOLBAR_INPUT_HEIGHT,
    PICKER_ACTIVE_BG, BUTTON_BG_DEFAULT, ACTIVE_BORDER, ACTIVE_BOX_SHADOW
} from '../constants';
import { ColorPickerModal } from '../modals/ColorPickerModal';

/**
 * Builds and manages the toolbar UI for HexCartographerView.
 * Covers initToolConfigs, createToolbar, updateToolbarState, and all
 * sub-toolbar helpers (palette, path, border, pattern, variant menu).
 */
export class ToolbarBuilder {
    private readonly view: any;

    /** @param view The owning HexCartographerView instance. */
    constructor(view: any) {
        this.view = view;
    }

    // ─── Tool configuration ────────────────────────────────────────────────────

    /**
     * (Re-)initialises `view.toolConfigs` for the four symbol tool groups
     * (extras, vegetation, mountain, building).  Preserves any existing
     * per-group state (currentVariant, symbolColor, backgroundColor,
     * backgroundEnabled) so the method is safe to call multiple times, e.g.
     * after a language change.
     */
    initToolConfigs(): void {
        const v = this.view;
        const ex = v.toolConfigs || {};
        v.toolConfigs = {
            grass: {
                name: t('tool.extras'),
                variants: [
                    { id: 'question', label: t('variant.question'), icon: 'help-circle' },
                    { id: 'exclamation', label: t('variant.exclamation'), icon: 'alert-circle' },
                    { id: 'cross', label: t('variant.cross'), icon: 'x' },
                    { id: 'dot', label: t('variant.dot'), icon: 'circle' },
                    { id: 'shield', label: t('variant.shield'), icon: 'shield' },
                    { id: 'pirateskull', label: t('variant.pirateskull'), icon: 'skull' }
                ],
                currentVariant: ex.grass?.currentVariant || 'question',
                symbolColor: ex.grass?.symbolColor || DEFAULT_EXTRAS_SYMBOL_COLOR,
                backgroundColor: ex.grass?.backgroundColor || DEFAULT_EXTRAS_BG_COLOR,
                backgroundEnabled: ex.grass?.backgroundEnabled || false
            },
            tree: {
                name: t('tool.vegetation'),
                variants: [
                    { id: 'grass', label: t('variant.grass'), icon: 'sprout' },
                    { id: 'swamp', label: t('variant.swamp'), icon: 'waves' },
                    { id: 'bush', label: t('variant.bush'), icon: 'leaf' },
                    { id: 'tree', label: t('variant.tree'), icon: 'trees' },
                    { id: 'pine', label: t('variant.pine'), icon: 'triangle' },
                    { id: 'palm', label: t('variant.palm'), icon: 'palmtree' }
                ],
                currentVariant: ex.tree?.currentVariant || 'tree',
                symbolColor: ex.tree?.symbolColor || DEFAULT_VEGETATION_SYMBOL_COLOR,
                backgroundColor: ex.tree?.backgroundColor || DEFAULT_VEGETATION_BG_COLOR,
                backgroundEnabled: ex.tree?.backgroundEnabled || false
            },
            mountain: {
                name: t('tool.mountain'),
                variants: [
                    { id: 'hill', label: t('variant.hill'), icon: 'chevron-up' },
                    { id: 'mountain', label: t('variant.mountain'), icon: 'mountain' }
                ],
                currentVariant: ex.mountain?.currentVariant || 'mountain',
                symbolColor: ex.mountain?.symbolColor || DEFAULT_MOUNTAIN_SYMBOL_COLOR,
                backgroundColor: ex.mountain?.backgroundColor || DEFAULT_MOUNTAIN_BG_COLOR,
                backgroundEnabled: ex.mountain?.backgroundEnabled || false
            },
            building: {
                name: t('tool.building'),
                variants: [
                    { id: 'tent', label: t('variant.tent'), icon: 'tent' },
                    { id: 'house', label: t('variant.house'), icon: 'home' },
                    { id: 'village', label: t('variant.village'), icon: 'school' },
                    { id: 'town', label: t('variant.town'), icon: 'castle' },
                    { id: 'castle', label: t('variant.castle'), icon: 'shield' },
                    { id: 'monastery', label: t('variant.monastery'), icon: 'church' },
                    { id: 'harbor', label: t('variant.harbor'), icon: 'ship' },
                    { id: 'tower', label: t('variant.tower'), icon: 'tower' },
                    { id: 'ruins', label: t('variant.ruins'), icon: 'archive' },
                    { id: 'cave', label: t('variant.cave'), icon: 'circle' },
                    { id: 'oasis', label: t('variant.oasis'), icon: 'droplet' }
                ],
                currentVariant: ex.building?.currentVariant || 'house',
                symbolColor: ex.building?.symbolColor || DEFAULT_BUILDING_SYMBOL_COLOR,
                backgroundColor: ex.building?.backgroundColor || DEFAULT_BUILDING_BG_COLOR,
                backgroundEnabled: ex.building?.backgroundEnabled || false
            }
        };
    }

    // ─── Toolbar lifecycle ─────────────────────────────────────────────────────

    /**
     * Clears and fully recreates the `.hex-toolbar` element in-place, then
     * syncs all button states.  Also triggers `recalcToolbarWidths` when the
     * toolbar is in edit mode so width-locked inputs stay in sync with their
     * sibling buttons.
     */
    rebuildToolbar(): void {
        const v = this.view;
        const toolbar = v.containerEl.querySelector('.hex-toolbar');
        if (!toolbar) return;
        toolbar.empty();
        this.createToolbar(toolbar);
        this.updateToolbarState(toolbar);
        if (v.editMode) {
            this.recalcToolbarWidths();
        }
    }

    // ─── Toolbar creation ──────────────────────────────────────────────────────

    /**
     * Populates `toolbar` with all top-level controls: the edit-mode toggle,
     * master colour picker, palette, hex-colour / symbol tool group buttons,
     * draw-mode buttons (fill, eraser, text), pattern tool, path toolbar,
     * border button, undo/redo, fit, orientation toggle, and settings.
     *
     * DOM element references used by `updateToolbarState` are cached on the
     * view (`view.editModeBtn`, `view.masterColorBtn`, etc.).
     *
     * @param toolbar The `.hex-toolbar` container element.
     */
    createToolbar(toolbar: any): void {
        const v = this.view;

        const editModeBtn = this.createToolButton(toolbar, { icon: 'wrench', title: t('tooltip.editMode') });
        v.editModeBtn = editModeBtn;
        editModeBtn.onclick = () => {
            v.editMode = !v.editMode;
            if (!v.editMode) {
                v.exitPathEditMode();
                v._savedToolGroup = v.currentToolGroup;
                v._savedDrawMode = v.drawMode;
                v.drawMode = 'pen';
                v.currentToolGroup = null;
                v.borderPickMode = false;
                v.pathPickMode = false;
            } else {
                v.currentToolGroup = v._savedToolGroup !== undefined ? v._savedToolGroup : 'hexcolor';
                v.drawMode = v._savedDrawMode || 'pen';
                if (v.currentToolGroup === 'hexcolor') {
                    v.masterColor = v.hexColorColor;
                } else if (v.currentToolGroup && v.toolConfigs[v.currentToolGroup]) {
                    v.masterColor = v.toolConfigs[v.currentToolGroup].symbolColor;
                }
            }
            v.editContent.style.display = v.editMode ? 'contents' : 'none';
            editModeBtn.classList.toggle('active', v.editMode);
            this.updateToolbarState(toolbar);
            if (v.editMode) {
                setTimeout(() => this.recalcToolbarWidths(), 0);
            }
            v.render();
            v.requestSave();
        };

        const editContent = toolbar.createDiv({ style: v.editMode ? 'display: contents;' : 'display: none;' });
        v.editContent = editContent;

        const masterColorBtn = editContent.createEl('button', {
            attr: { title: t('tooltip.colorPicker'), style: 'width: 50px; height: 50px; min-width: 50px; border: 1px solid var(--divider-color); border-radius: 4px; cursor: pointer; box-sizing: border-box; padding: 0;' }
        });
        masterColorBtn.style.backgroundColor = v.masterColor;
        v.masterColorBtn = masterColorBtn;

        const masterColorInput = editContent.createEl('input', {
            type: 'color',
            value: v.masterColor,
            attr: { style: 'position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none;' }
        });
        v.masterColorInput = masterColorInput;

        masterColorBtn.onclick = () => {
            if (v.isTouchDevice) {
                new ColorPickerModal(v.app, v.masterColor, (color: string) => {
                    v.masterColor = color;
                    masterColorBtn.style.backgroundColor = v.masterColor;
                    masterColorInput.value = v.masterColor;
                    v.updateActivePathColor();
                    v.requestSave();
                }).open();
            } else {
                masterColorInput.click();
            }
        };
        this.makeInputInteractive(masterColorBtn);
        masterColorInput.oninput = (e: any) => {
            v.masterColor = e.target.value;
            masterColorBtn.style.backgroundColor = v.masterColor;
            v.updateActivePathColor();
        };
        masterColorInput.addEventListener('change', () => {
            v.requestSave();
        });

        const colorEyedropperBtn = this.createToolButton(editContent, { icon: 'pipette', title: t('tooltip.colorEyedropper') });
        colorEyedropperBtn.style.background = BUTTON_BG_DEFAULT;
        v.colorEyedropperBtn = colorEyedropperBtn;
        colorEyedropperBtn.onclick = () => {
            const wasActive = v.colorPickMode;
            v.exitPathEditMode();
            v.colorPickMode = !wasActive;
            colorEyedropperBtn.style.background = v.colorPickMode ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            colorEyedropperBtn.style.color = v.colorPickMode ? 'var(--text-on-accent)' : '';
            if (v.colorPickMode) new Notice(t('notice.tapToPickColor'));
        };

        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        this.createColorPalette(editContent);

        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        const hexColorBtn = this.createToolButton(editContent, { icon: 'hexagon', title: t('tooltip.hexColor'), dataset: { toolGroup: 'hexcolor' } });
        hexColorBtn.onclick = () => {
            const needsRender = v.currentToolGroup === 'pattern' || v.borderSettings.pickedHex;
            v.exitPathEditMode();
            if (v.currentToolGroup === 'hexcolor') {
                v.drawMode = 'pen';
            } else {
                v.currentToolGroup = 'hexcolor';
                v.drawMode = 'pen';
                v.masterColor = v.hexColorColor;
                if (v.masterColorInput) { v.masterColorInput.value = v.masterColor; if (v.masterColorBtn) v.masterColorBtn.style.backgroundColor = v.masterColor; }
            }
            this.updateToolbarState(toolbar);
            if (needsRender) v.render();
            v.requestSave();
        };

        this.createToolGroupButton(editContent, 'grass');
        this.createToolGroupButton(editContent, 'tree');
        this.createToolGroupButton(editContent, 'mountain');
        this.createToolGroupButton(editContent, 'building');

        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        this.createDrawModeButton(editContent, 'fill', 'paint-bucket', t('tooltip.fill'));

        const textBtn = this.createToolButton(editContent, { icon: 'type', title: t('tooltip.text'), dataset: { toolGroup: 'text' } });
        textBtn.onclick = () => {
            const needsRender = v.currentToolGroup === 'pattern' || v.borderSettings.pickedHex;
            v.exitPathEditMode();
            v.currentToolGroup = 'text';
            v.drawMode = 'none';
            this.updateToolbarState(toolbar);
            if (needsRender) v.render();
            v.requestSave();
        };

        this.createDrawModeButton(editContent, 'eraser', 'eraser', t('tooltip.eraser'));

        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        this.createPatternTool(editContent);

        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        this.createPathToolbar(editContent);
        this.createBorderButton(editContent);

        editContent.createEl('span', { cls: 'hex-toolbar-sep', text: '\u200B' });

        const undoBtn = this.createToolButton(editContent, { icon: 'undo-2', title: t('tooltip.undo') });
        undoBtn.onclick = () => v.historyManager.undo();

        const redoBtn = this.createToolButton(editContent, { icon: 'redo-2', title: t('tooltip.redo') });
        redoBtn.onclick = () => v.historyManager.redo();

        const fitBtn = this.createToolButton(toolbar, { icon: 'maximize-2', title: t('tooltip.fit') });
        fitBtn.onclick = () => v.fitMapToView();

        const hexOrientationBtn = this.createToolButton(toolbar, { icon: 'rotate-cw', title: t('tooltip.hexOrientation') });
        v.hexOrientationBtn = hexOrientationBtn;
        hexOrientationBtn.classList.toggle('active', v.hexOrientation);
        hexOrientationBtn.style.background = v.hexOrientation ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
        hexOrientationBtn.style.border = v.hexOrientation ? ACTIVE_BORDER : '';
        hexOrientationBtn.style.boxShadow = v.hexOrientation ? ACTIVE_BOX_SHADOW : '';
        hexOrientationBtn.onclick = () => {
            v.hexOrientation = !v.hexOrientation;
            hexOrientationBtn.classList.toggle('active', v.hexOrientation);
            hexOrientationBtn.style.background = v.hexOrientation ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            hexOrientationBtn.style.border = v.hexOrientation ? ACTIVE_BORDER : '';
            hexOrientationBtn.style.boxShadow = v.hexOrientation ? ACTIVE_BOX_SHADOW : '';
            v.render();
            v.requestSave();
        };

        const settingsBtn = this.createToolButton(toolbar, { icon: 'settings', title: t('tooltip.settings') });
        settingsBtn.onclick = () => {
            v.app.setting.open();
            v.app.setting.openTabById('hex-cartographer');
        };

        this.updateToolbarState(toolbar);
    }

    /**
     * Creates a draw-mode toggle button (`fill` or `eraser`) and appends it to
     * `toolbar`.  Clicking the button activates the mode; clicking it again
     * while already active returns to `'pen'`.  The eraser button is a no-op
     * when any pick mode (pattern, path, border, colour-eyedropper) is active.
     *
     * @param toolbar The container element to append the button to.
     * @param mode    Draw-mode string — `'fill'` or `'eraser'`.
     * @param icon    Lucide icon name to display on the button.
     * @param title   Tooltip string.
     */
    createDrawModeButton(toolbar: any, mode: string, icon: string, title: string): void {
        const v = this.view;
        const btn = this.createToolButton(toolbar, { icon, title, dataset: { drawMode: mode } });
        btn.onclick = () => {
            if (mode === 'eraser' && (v.patternPickMode || v.pathPickMode || v.borderPickMode || v.colorPickMode)) return;
            const needsRender = v.currentToolGroup === 'pattern' || v.borderSettings.pickedHex;
            if (mode !== 'eraser') v.exitPathEditMode();
            if (v.drawMode === mode && (mode === 'eraser' || mode === 'fill')) {
                v.drawMode = 'pen';
                this.updateToolbarState(toolbar);
                return;
            }
            v.drawMode = mode;

            if (mode === 'fill' && (!v.currentToolGroup || v.currentToolGroup === 'text' || v.currentToolGroup === 'river' || v.currentToolGroup === 'road' || v.currentToolGroup === 'border')) {
                v.exitPathEditMode();
                v.currentToolGroup = 'hexcolor';
            }
            else if (v.currentToolGroup === 'text') {
                v.currentToolGroup = null;
            }

            this.updateToolbarState(toolbar);

            if (needsRender && v.currentToolGroup !== 'pattern') {
                v.render();
            }
            v.requestSave();
        };
    }

    /**
     * Creates a compound symbol-tool button for `groupId` (one of `'grass'`,
     * `'tree'`, `'mountain'`, `'building'`) and appends it to `toolbar`.
     *
     * The button displays the currently-selected variant's SVG (or Lucide icon
     * fallback) and a small ▼ indicator.  Left-click activates the group;
     * right-click / long-press opens the variant selection menu.
     *
     * @param toolbar The container element to append the button wrapper to.
     * @param groupId One of the four symbol group keys.
     */
    createToolGroupButton(toolbar: any, groupId: string): void {
        const v = this.view;
        const config = v.toolConfigs[groupId];
        const wrapper = toolbar.createDiv({
            cls: 'tool-group-wrapper',
            style: 'display: inline-flex; flex-direction: column; align-items: center; gap: 2px;'
        });
        wrapper.dataset.toolGroupWrapper = groupId;

        const btnWrapper = wrapper.createDiv({ style: 'position: relative; display: inline-block;' });
        const btn = this.createToolButton(btnWrapper, {
            title: t('tooltip.toolGroup', { name: config.name }),
            dataset: { toolGroup: groupId },
            style: `position: relative; background: ${config.backgroundEnabled ? config.backgroundColor : BUTTON_BG_DEFAULT};`
        });

        const currentVariant = config.variants.find((variant: any) => variant.id === config.currentVariant);

        if (v.svgSymbols[currentVariant.id]) {
            const symbolInfo = v.svgSymbols[currentVariant.id];
            btn.innerHTML = `<svg viewBox="0 0 ${symbolInfo.viewBoxWidth} ${symbolInfo.viewBoxWidth}"
                                  width="16" height="16" style="vertical-align: middle;">
                <path d="${symbolInfo.pathData}" fill="currentColor"/>
            </svg>`;
        } else {
            setIcon(btn, currentVariant.icon);
        }

        if (config.symbolColor) {
            btn.style.color = config.symbolColor;
        }

        btnWrapper.createEl('span', {
            text: '▼',
            attr: {
                style: 'position: absolute; right: 2px; bottom: 2px; font-size: 8px; pointer-events: none; color: var(--text-muted);'
            }
        });

        btn.onclick = () => {
            const needsRender = v.currentToolGroup === 'pattern' || v.borderSettings.pickedHex;
            v.exitPathEditMode();
            v.currentToolGroup = groupId;
            v.drawMode = 'pen';
            v.masterColor = config.symbolColor;
            if (v.masterColorInput) { v.masterColorInput.value = v.masterColor; if (v.masterColorBtn) v.masterColorBtn.style.backgroundColor = v.masterColor; }

            this.updateToolbarState(toolbar);

            if (needsRender) {
                v.render();
            }
            v.requestSave();
        };

        btn.oncontextmenu = (e: any) => {
            e.preventDefault();
            this.showVariantMenu(groupId, wrapper);
        };
    }

    /**
     * Creates the two-button pattern section (stamp and eyedropper) and
     * appends it to `toolbar`.  The stamp button is a no-op when no pattern
     * has been captured yet.  The eyedropper button caches a reference to
     * itself on `view.patternPickerBtn` for later state updates.
     *
     * @param toolbar The container element to append the pattern tool to.
     */
    createPatternTool(toolbar: any): void {
        const v = this.view;
        const wrapper = toolbar.createDiv({ style: 'display: flex; align-items: center; gap: 4px;' });

        const patternBtn = this.createToolButton(wrapper, { icon: 'copy', title: t('tooltip.pattern'), dataset: { toolGroup: 'pattern' } });

        patternBtn.onclick = () => {
            if (!v.patternData) {
                new Notice(t('notice.noPattern'));
                return;
            }
            v.exitPathEditMode();
            v.currentToolGroup = 'pattern';
            v.drawMode = 'pen';
            this.updateToolbarState(toolbar);
            v.render();
            v.requestSave();
        };

        const pickerBtn = this.createToolButton(wrapper, { icon: 'pipette', title: t('tooltip.patternPicker'), style: 'width: 24px; padding: 2px;' });

        pickerBtn.onclick = () => {
            const wasActive = v.patternPickMode;
            v.exitPathEditMode();
            v.patternPickMode = !wasActive;
            pickerBtn.style.background = v.patternPickMode ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            if (v.patternPickMode) {
                v.currentToolGroup = null;
                new Notice(t('notice.clickToPickPattern'));
            }
            this.updateToolbarState(toolbar);
        };

        v.patternPickerBtn = pickerBtn;
    }

    /**
     * Renders a floating variant-selection dropdown for a symbol tool group
     * below its button.  Any existing dropdown is removed first.  Selecting a
     * variant updates `config.currentVariant`, refreshes the button icon, and
     * activates the group.  The dropdown is dismissed on the next outside click.
     *
     * @param groupId One of the four symbol group keys.
     * @param wrapper The `.tool-group-wrapper` element containing the button.
     */
    showVariantMenu(groupId: string, wrapper: any): void {
        const v = this.view;
        const config = v.toolConfigs[groupId];
        const btn = wrapper.querySelector('.hex-tool-btn');

        const oldMenu = document.querySelector('.hex-variant-menu');
        if (oldMenu) oldMenu.remove();

        const menu = document.body.createDiv({ cls: 'hex-variant-menu' });
        menu.style.position = 'absolute';
        menu.style.background = 'var(--background-primary)';
        menu.style.border = '1px solid var(--divider-color)';
        menu.style.borderRadius = '4px';
        menu.style.padding = '4px';
        menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        menu.style.zIndex = '1000';

        const rect = btn.getBoundingClientRect();
        menu.style.left = rect.left + 'px';
        menu.style.top = (rect.bottom + 4) + 'px';

        config.variants.forEach((variant: any) => {
            const item = menu.createDiv({
                text: variant.label,
                style: 'padding: 6px 12px; cursor: pointer; border-radius: 3px;'
            });

            if (variant.id === config.currentVariant) {
                item.style.background = 'var(--interactive-accent)';
                item.style.color = 'var(--text-on-accent)';
            }

            item.onmouseover = () => {
                if (variant.id !== config.currentVariant) {
                    item.style.background = 'var(--background-modifier-hover)';
                }
            };
            item.onmouseout = () => {
                if (variant.id !== config.currentVariant) {
                    item.style.background = '';
                }
            };

            item.onclick = () => {
                config.currentVariant = variant.id;

                if (v.svgSymbols[variant.id]) {
                    const symbolInfo = v.svgSymbols[variant.id];
                    btn.innerHTML = `<svg viewBox="0 0 ${symbolInfo.viewBoxWidth} ${symbolInfo.viewBoxWidth}"
                                          width="16" height="16" style="vertical-align: middle;">
                        <path d="${symbolInfo.pathData}" fill="currentColor"/>
                    </svg>`;
                } else {
                    setIcon(btn, variant.icon);
                }

                v.currentToolGroup = groupId;
                v.drawMode = 'pen';
                v.masterColor = config.symbolColor;
                if (v.masterColorInput) { v.masterColorInput.value = v.masterColor; if (v.masterColorBtn) v.masterColorBtn.style.backgroundColor = v.masterColor; }

                menu.remove();
                this.updateToolbarState(v.containerEl.querySelector('.hex-toolbar'));
                v.requestSave();
            };
        });

        setTimeout(() => {
            const closeMenu = (e: any) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        }, 10);
    }

    /**
     * Opens a modal dialog for editing the background colour of a symbol tool
     * group button.  The palette row is displayed as quick-pick swatches.
     * Changes are applied to `config.backgroundColor` and saved on confirm.
     *
     * @param groupId One of the four symbol group keys.
     * @param wrapper The `.tool-group-wrapper` element containing the button.
     */
    openColorPickerModal(groupId: string, wrapper: any): void {
        const v = this.view;
        const config = v.toolConfigs[groupId];
        const btn = wrapper.querySelector('.hex-tool-btn');

        const modal = new Modal(v.app);
        modal.contentEl.createEl('h3', { text: `${config.name} - Hintergrundfarbe` });

        const bgSection = modal.contentEl.createDiv({ style: 'margin: 15px 0;' });

        const bgRow = bgSection.createDiv({ style: 'display: flex; gap: 10px; align-items: center; margin-bottom: 10px;' });
        bgRow.createEl('label', { text: 'Farbe:' });
        const bgPicker = bgRow.createEl('input', { type: 'color', value: config.backgroundColor || BUTTON_BG_DEFAULT });

        const bgPaletteRow = bgSection.createDiv({ style: 'display: flex; gap: 5px; flex-wrap: wrap;' });
        bgPaletteRow.createEl('span', { text: 'Palette:', attr: { style: 'width: 100%; font-size: 11px; margin-bottom: 5px;' } });
        v.colorPalette.forEach((color: string) => {
            const paletteBtn = bgPaletteRow.createEl('button', {
                attr: {
                    style: `width: 30px; height: 30px; background: ${color}; border: 2px solid var(--divider-color); border-radius: 3px; cursor: pointer;`
                }
            });
            paletteBtn.onclick = () => {
                bgPicker.value = color;
            };
        });

        const btnRow = modal.contentEl.createDiv({ style: 'display: flex; gap: 10px; margin-top: 20px;' });

        const okBtn = btnRow.createEl('button', { text: 'OK', cls: 'mod-cta' });
        okBtn.onclick = () => {
            config.backgroundColor = bgPicker.value;
            if (config.backgroundEnabled) {
                btn.style.background = config.backgroundColor;
            }
            modal.close();
            v.requestSave();
            v.render();
        };

        const cancelBtn = btnRow.createEl('button', { text: 'Abbrechen' });
        cancelBtn.onclick = () => modal.close();

        modal.open();
    }

    // ─── Color palette ─────────────────────────────────────────────────────────

    /**
     * Creates the two-row colour palette section and appends it to `toolbar`.
     * The outer div reference is cached on `view.paletteOuter`.
     *
     * @param toolbar The container element to append the palette to.
     */
    createColorPalette(toolbar: any): void {
        const v = this.view;
        const outer = toolbar.createDiv({ style: 'display: inline-flex; flex-direction: column; gap: 2px; border-left: 1px solid #bbb; border-right: 1px solid #bbb; padding: 0 6px;' });
        v.paletteOuter = outer;

        this._createPaletteRow(outer, v.colorPalette, 'colorPalette');
        this._createPaletteRow(outer, v.colorPalette2, 'colorPalette2');
    }

    /**
     * Appends a single row of colour-slot buttons to `parent`.
     *
     * Each button applies its colour as the master colour on left-click and
     * opens a colour picker on right-click / long-press (touch).  The picker
     * updates `view[paletteKey][index]` and triggers a save.
     *
     * @param parent     The row container element.
     * @param palette    The colour array (`view.colorPalette` or `view.colorPalette2`).
     * @param paletteKey Property key used to read/write the array on the view (`'colorPalette'` or `'colorPalette2'`).
     */
    _createPaletteRow(parent: any, palette: string[], paletteKey: string): void {
        const v = this.view;
        const row = parent.createDiv({ style: 'display: flex; align-items: center; gap: 3px;' });

        palette.forEach((color: string, index: number) => {
            const btn = row.createEl('button', {
                cls: 'hex-color-slot',
                attr: {
                    title: t('tooltip.palette'),
                    style: 'width: 24px; height: 24px; min-width: 24px; border: none; border-radius: 3px; cursor: pointer; padding: 0;'
                }
            });
            btn.style.backgroundColor = color;
            btn.dataset.paletteKey = paletteKey;
            btn.dataset.paletteIndex = index;

            const hiddenInput = row.createEl('input', {
                type: 'color',
                value: color,
                attr: { style: 'position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none;' }
            });

            btn.onclick = () => {
                if (v.currentToolGroup === 'pattern' || v.patternPickMode || v.pathPickMode || v.borderPickMode || v.colorPickMode) {
                    v.exitPathEditMode();
                    v.currentToolGroup = 'hexcolor';
                    v.drawMode = 'pen';
                }
                v.masterColor = v[paletteKey][index];
                if (v.currentToolGroup === 'hexcolor') v.hexColorColor = v.masterColor;
                if (v.masterColorInput) { v.masterColorInput.value = v.masterColor; if (v.masterColorBtn) v.masterColorBtn.style.backgroundColor = v.masterColor; }
                v.updateActivePathColor();
                const toolbar = v.containerEl.querySelector('.hex-toolbar');
                if (toolbar) this.updateToolbarState(toolbar);
            };

            const openPaletteColorPicker = () => {
                if (v.isTouchDevice) {
                    new ColorPickerModal(v.app, v[paletteKey][index], (pickedColor: string) => {
                        v[paletteKey][index] = pickedColor;
                        btn.style.backgroundColor = pickedColor;
                        hiddenInput.value = pickedColor;
                        v.masterColor = pickedColor;
                        if (v.masterColorInput) { v.masterColorInput.value = v.masterColor; if (v.masterColorBtn) v.masterColorBtn.style.backgroundColor = v.masterColor; }
                        v.updateActivePathColor();
                        v.requestSave();
                    }).open();
                } else {
                    hiddenInput.click();
                }
            };

            btn.oncontextmenu = (e: any) => {
                e.preventDefault();
                openPaletteColorPicker();
            };

            let longPressTimer: any = null;
            btn.addEventListener('touchstart', (e: any) => {
                longPressTimer = setTimeout(() => {
                    e.preventDefault();
                    openPaletteColorPicker();
                    longPressTimer = null;
                }, 500);
            }, { passive: false });
            btn.addEventListener('touchend', () => {
                if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
            });
            btn.addEventListener('touchmove', () => {
                if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
            });

            hiddenInput.oninput = (e: any) => {
                v[paletteKey][index] = e.target.value;
                btn.style.backgroundColor = e.target.value;
                v.masterColor = e.target.value;
                if (v.masterColorInput) { v.masterColorInput.value = v.masterColor; if (v.masterColorBtn) v.masterColorBtn.style.backgroundColor = v.masterColor; }
                v.updateActivePathColor();
            };
            hiddenInput.addEventListener('change', () => {
                v.requestSave();
            });
        });
    }

    // ─── Path toolbar ──────────────────────────────────────────────────────────

    /**
     * Creates the river/road section — river button, road button, path-picker
     * button, and three numeric inputs (river width, road width, dash length) —
     * and appends it to `toolbar`.  Input widths are matched to their sibling
     * buttons via a deferred `setTimeout` call.
     *
     * Button and input references are cached on the view (`view.riverBtn`,
     * `view.roadBtn`, `view.pathPickerBtn`, `view.riverWidthInput`,
     * `view.roadWidthInput`, `view.pathDashesInput`).
     *
     * @param toolbar The container element to append the path section to.
     */
    createPathToolbar(toolbar: any): void {
        const v = this.view;
        const wrapper = toolbar.createDiv({
            style: 'display: inline-flex; flex-direction: column; gap: 2px;'
        });

        const topRow = wrapper.createDiv({ style: 'display: flex; gap: 2px; align-items: center;' });

        const riverBtn = this.createToolButton(topRow, { icon: 'waves', title: t('tooltip.river'), dataset: { toolGroup: 'river' } });
        v.riverBtn = riverBtn;
        riverBtn.onclick = () => {
            if (v.pathPickPending) {
                v.completePathPick(v.pathPickPending.river, 'river');
                return;
            }
            const needsRender = v.currentToolGroup === 'pattern' || v.borderSettings.pickedHex;
            v.exitPathEditMode();
            v.currentToolGroup = 'river';
            v.drawMode = 'pen';
            this.updateToolbarState(toolbar);
            if (needsRender) v.render();
            v.requestSave();
        };

        const roadBtn = this.createToolButton(topRow, { icon: 'route', title: t('tooltip.road'), dataset: { toolGroup: 'road' } });
        v.roadBtn = roadBtn;
        roadBtn.onclick = () => {
            if (v.pathPickPending) {
                v.completePathPick(v.pathPickPending.road, 'road');
                return;
            }
            const needsRender = v.currentToolGroup === 'pattern' || v.borderSettings.pickedHex;
            v.exitPathEditMode();
            v.currentToolGroup = 'road';
            v.drawMode = 'pen';
            this.updateToolbarState(toolbar);
            if (needsRender) v.render();
            v.requestSave();
        };

        const pickerBtn = this.createToolButton(topRow, { icon: 'mouse-pointer', title: t('tooltip.pathPicker') });
        v.pathPickerBtn = pickerBtn;
        pickerBtn.onclick = () => {
            if (v.pathPickPending) {
                v.pathPickPending = null;
                v.pathPickMode = false;
                v.currentToolGroup = v.lastToolGroup;
                v.lastToolGroup = null;
                pickerBtn.style.background = BUTTON_BG_DEFAULT;
                pickerBtn.style.color = '';
                this.updateToolbarState(toolbar);
                return;
            }
            const settings = v.currentToolGroup === 'river' ? v.riverSettings : v.roadSettings;
            if (settings.editMode) {
                v.exitPathEditMode();
                return;
            }
            v.pathPickMode = !v.pathPickMode;
            if (v.pathPickMode) {
                v.lastToolGroup = v.currentToolGroup;
                v.currentToolGroup = null;
                v.patternPickMode = false;
                if (v.patternPickerBtn) { v.patternPickerBtn.style.background = BUTTON_BG_DEFAULT; }
                v.borderPickMode = false;
                if (v.borderPickerBtn) { v.borderPickerBtn.style.background = BUTTON_BG_DEFAULT; v.borderPickerBtn.style.color = ''; }
            }
            v.drawMode = 'pen';
            pickerBtn.style.background = v.pathPickMode ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            pickerBtn.style.color = v.pathPickMode ? 'var(--text-on-accent)' : '';
            this.updateToolbarState(toolbar);
        };

        const bottomRow = wrapper.createDiv({ style: 'display: flex; gap: 2px;' });

        const riverWidthInput = bottomRow.createEl('input', {
            type: 'number',
            value: v.riverSettings.width.toString(),
            attr: { title: t('input.riverWidth'), min: '1', max: '999', style: `height: ${TOOLBAR_INPUT_HEIGHT}; font-size: ${TOOLBAR_INPUT_FONT_SIZE}; padding: 2px; box-sizing: border-box;` }
        });
        this.makeInputInteractive(riverWidthInput);
        v.riverWidthInput = riverWidthInput;
        riverWidthInput.oninput = (e: any) => {
            if (e.target.value.length > 3) e.target.value = e.target.value.slice(0, 3);
            v.riverSettings.width = Math.min(999, Math.max(1, parseInt(e.target.value) || DEFAULT_RIVER_WIDTH));
            e.target.value = v.riverSettings.width;
            const river = v.data.rivers && v.data.rivers.find((r: any) => r.id === v.riverSettings.activeRiverId);
            if (river) river.width = v.riverSettings.width;
            v.render();
        };

        const roadWidthInput = bottomRow.createEl('input', {
            type: 'number',
            value: v.roadSettings.width.toString(),
            attr: { title: t('input.roadWidth'), min: '1', max: '999', style: `height: ${TOOLBAR_INPUT_HEIGHT}; font-size: ${TOOLBAR_INPUT_FONT_SIZE}; padding: 2px; box-sizing: border-box;` }
        });
        this.makeInputInteractive(roadWidthInput);
        v.roadWidthInput = roadWidthInput;
        roadWidthInput.oninput = (e: any) => {
            if (e.target.value.length > 3) e.target.value = e.target.value.slice(0, 3);
            v.roadSettings.width = Math.min(999, Math.max(1, parseInt(e.target.value) || DEFAULT_ROAD_WIDTH));
            e.target.value = v.roadSettings.width;
            const road = v.data.roads && v.data.roads.find((r: any) => r.id === v.roadSettings.activeRoadId);
            if (road) road.width = v.roadSettings.width;
            v.render();
        };

        const dashesInput = bottomRow.createEl('input', {
            type: 'number',
            value: (v.pathDashes || DEFAULT_PATH_DASHES).toString(),
            attr: { title: t('input.pathDashes'), min: '1', max: '99', style: `height: ${TOOLBAR_INPUT_HEIGHT}; font-size: ${TOOLBAR_INPUT_FONT_SIZE}; padding: 2px; box-sizing: border-box;` }
        });
        this.makeInputInteractive(dashesInput);
        v.pathDashesInput = dashesInput;
        dashesInput.oninput = (e: any) => {
            if (e.target.value.length > 2) e.target.value = e.target.value.slice(0, 2);
            v.pathDashes = Math.min(99, Math.max(1, parseInt(e.target.value) || DEFAULT_PATH_DASHES));
            e.target.value = v.pathDashes;
            const river = v.data.rivers && v.data.rivers.find((r: any) => r.id === v.riverSettings.activeRiverId);
            if (river) river.dashes = v.pathDashes;
            const road = v.data.roads && v.data.roads.find((r: any) => r.id === v.roadSettings.activeRoadId);
            if (road) road.dashes = v.pathDashes;
            v.render();
        };

        setTimeout(() => {
            riverWidthInput.style.width = `${riverBtn.offsetWidth}px`;
            roadWidthInput.style.width = `${roadBtn.offsetWidth}px`;
            dashesInput.style.width = `${pickerBtn.offsetWidth}px`;
        }, 0);
    }

    // ─── Border toolbar ────────────────────────────────────────────────────────

    /**
     * Creates the border section — border button, region-picker button,
     * visibility toggle, and dash-length input — and appends it to `toolbar`.
     * Input width is matched to the border button via a deferred `setTimeout`.
     *
     * References are cached on the view (`view.borderBtn`, `view.borderPickerBtn`,
     * `view.borderVisBtn`, `view.borderDashesInput`).
     *
     * @param toolbar The container element to append the border section to.
     */
    createBorderButton(toolbar: any): void {
        const v = this.view;
        const wrapper = toolbar.createDiv({
            style: 'display: inline-flex; flex-direction: column; gap: 2px;'
        });

        const topRow = wrapper.createDiv({ style: 'display: flex; gap: 2px; align-items: center;' });

        const btn = this.createToolButton(topRow, { icon: 'shield', title: t('tooltip.border'), dataset: { toolGroup: 'border' } });
        v.borderBtn = btn;

        btn.onclick = () => {
            const wasPatternActive = v.currentToolGroup === 'pattern';
            const wasHidden = !v.borderSettings.visible;
            v.exitPathEditMode();
            v.borderPickMode = false;
            v.borderSettings.activeRegionId = null;
            v.borderSettings.pickedHex = null;
            v.currentToolGroup = 'border';
            v.drawMode = 'pen';
            if (wasHidden) v.borderSettings.visible = true;
            this.updateToolbarState(toolbar);
            if (wasPatternActive || wasHidden) {
                v.render();
            }
            v.requestSave();
        };

        const pickerBtn = this.createToolButton(topRow, { icon: 'mouse-pointer', title: t('tooltip.borderPicker') });
        v.borderPickerBtn = pickerBtn;
        pickerBtn.onclick = () => {
            if (v.borderSettings.activeRegionId !== null) {
                v.borderSettings.activeRegionId = null;
                v.borderSettings.pickedHex = null;
                if (v.drawMode === 'eraser') v.drawMode = 'pen';
                this.updateToolbarState(toolbar);
                v.render();
                return;
            }
            const wasActive = v.borderPickMode;
            v.exitPathEditMode();
            v.borderPickMode = !wasActive;
            v.currentToolGroup = v.borderPickMode ? null : 'border';
            v.drawMode = 'pen';
            pickerBtn.style.background = v.borderPickMode ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            pickerBtn.style.color = v.borderPickMode ? 'var(--text-on-accent)' : '';
            this.updateToolbarState(toolbar);
        };

        const visBtn = this.createToolButton(topRow, { icon: v.borderSettings.visible ? 'eye' : 'eye-off', title: t('tooltip.borderVisibility') });
        visBtn.style.opacity = v.borderSettings.visible ? '1' : '0.4';
        visBtn.onclick = () => {
            v.borderSettings.visible = !v.borderSettings.visible;
            setIcon(visBtn, v.borderSettings.visible ? 'eye' : 'eye-off');
            visBtn.style.opacity = v.borderSettings.visible ? '1' : '0.4';
            v.render();
            v.requestSave();
        };
        v.borderVisBtn = visBtn;

        const inputRow = wrapper.createDiv({ style: 'display: flex; gap: 2px;' });

        const dashesInput = inputRow.createEl('input', {
            type: 'number',
            value: (v.borderSettings.dashes || DEFAULT_BORDER_DASHES).toString(),
            attr: { title: t('input.borderDashes'), min: '1', max: '99', style: `height: ${TOOLBAR_INPUT_HEIGHT}; font-size: ${TOOLBAR_INPUT_FONT_SIZE}; padding: 2px; box-sizing: border-box;` }
        });
        this.makeInputInteractive(dashesInput);
        v.borderDashesInput = dashesInput;
        dashesInput.oninput = (e: any) => {
            if (e.target.value.length > 2) e.target.value = e.target.value.slice(0, 2);
            v.borderSettings.dashes = Math.min(99, Math.max(1, parseInt(e.target.value) || DEFAULT_BORDER_DASHES));
            e.target.value = v.borderSettings.dashes;
            const region = v.data.borders && v.data.borders.find((r: any) => r.id === v.borderSettings.activeRegionId);
            if (region) region.dashes = v.borderSettings.dashes;
            v.render();
        };

        setTimeout(() => {
            dashesInput.style.width = `${btn.offsetWidth}px`;
        }, 0);
    }

    // ─── Utility helpers ───────────────────────────────────────────────────────

    /**
     * Stops `mousedown`, `keydown`, and `pointerdown` events from bubbling out
     * of a toolbar input so they don't accidentally trigger canvas pan/zoom.
     *
     * @param input The `<input>` element to make interaction-safe.
     */
    makeInputInteractive(input: any): void {
        input.addEventListener('mousedown', (e: Event) => e.stopPropagation());
        input.addEventListener('keydown', (e: Event) => e.stopPropagation());
        input.addEventListener('pointerdown', (e: Event) => e.stopPropagation());
    }

    /**
     * Creates and returns a styled `<button>` with class `hex-tool-btn`.
     *
     * @param parent  The element to append the button to.
     * @param icon    Optional Lucide icon name rendered inside the button.
     * @param title   Optional tooltip string.
     * @param dataset Optional key/value pairs written to `button.dataset`.
     * @param style   Optional inline style string added to the `attr` object.
     * @returns The created button element.
     */
    createToolButton(parent: any, { icon, title, dataset, style }: any = {}): any {
        const btn = parent.createEl('button', {
            cls: 'hex-tool-btn',
            attr: { title, ...(style ? { style } : {}) }
        });
        btn.style.background = BUTTON_BG_DEFAULT;
        if (dataset) Object.assign(btn.dataset, dataset);
        if (icon) setIcon(btn, icon);
        return btn;
    }

    // ─── Toolbar state ─────────────────────────────────────────────────────────

    /**
     * Resizes the river-width, road-width, dash, and border-dash inputs to
     * match the pixel width of their sibling icon buttons.  Should be called
     * after layout has settled (e.g. inside a `setTimeout` callback or after
     * the toolbar becomes visible).
     */
    recalcToolbarWidths(): void {
        const v = this.view;
        if (v.riverBtn && v.roadBtn && v.riverWidthInput && v.roadWidthInput) {
            v.riverWidthInput.style.width = `${v.riverBtn.offsetWidth}px`;
            v.roadWidthInput.style.width = `${v.roadBtn.offsetWidth}px`;
            if (v.pathDashesInput && v.pathPickerBtn) v.pathDashesInput.style.width = `${v.pathPickerBtn.offsetWidth}px`;
        }
        if (v.borderBtn && v.borderDashesInput) {
            v.borderDashesInput.style.width = `${v.borderBtn.offsetWidth}px`;
        }
    }

    /**
     * Synchronises every toolbar button and input to the current view state.
     * Safe to call at any time; all DOM references are checked for existence
     * before use.  Called after every state-mutating user action.
     *
     * Covers: edit-mode button, content visibility, border visibility toggle,
     * river/road width inputs, path-picker icon, border-picker icon, border
     * dash input, all `[data-draw-mode]` buttons, all `[data-tool-group]`
     * buttons (including symbol groups with background colours), and palette
     * colour slots.
     *
     * @param toolbar The `.hex-toolbar` container element.
     */
    updateToolbarState(toolbar: any): void {
        const v = this.view;
        if (v.editModeBtn) {
            v.editModeBtn.classList.toggle('active', v.editMode);
            v.editModeBtn.style.background = v.editMode ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            v.editModeBtn.style.border = v.editMode ? ACTIVE_BORDER : '';
            v.editModeBtn.style.boxShadow = v.editMode ? ACTIVE_BOX_SHADOW : '';
        }
        if (v.editContent) v.editContent.style.display = v.editMode ? 'contents' : 'none';

        if (v.borderVisBtn) {
            setIcon(v.borderVisBtn, v.borderSettings.visible ? 'eye' : 'eye-off');
            v.borderVisBtn.style.opacity = v.borderSettings.visible ? '1' : '0.4';
        }

        if (v.riverWidthInput) v.riverWidthInput.value = v.riverSettings.width.toString();
        if (v.roadWidthInput) v.roadWidthInput.value = v.roadSettings.width.toString();

        const activePathSettings = v.currentToolGroup === 'river' ? v.riverSettings : v.roadSettings;
        if (v.pathPickerBtn) {
            if (activePathSettings.editMode) {
                setIcon(v.pathPickerBtn, 'check');
                v.pathPickerBtn.style.background = PICKER_ACTIVE_BG;
                v.pathPickerBtn.style.color = 'var(--text-on-accent)';
                v.pathPickerBtn.setAttribute('title', t('tooltip.pathFinish'));
            } else if (!v.pathPickMode) {
                setIcon(v.pathPickerBtn, 'mouse-pointer');
                v.pathPickerBtn.style.background = BUTTON_BG_DEFAULT;
                v.pathPickerBtn.style.color = '';
                v.pathPickerBtn.setAttribute('title', t('tooltip.pathPicker'));
            }
        }

        if (v.borderPickerBtn) {
            if (v.borderSettings.activeRegionId !== null) {
                setIcon(v.borderPickerBtn, 'check');
                v.borderPickerBtn.style.background = PICKER_ACTIVE_BG;
                v.borderPickerBtn.style.color = 'var(--text-on-accent)';
                v.borderPickerBtn.setAttribute('title', t('tooltip.borderFinish'));
            } else if (!v.borderPickMode) {
                setIcon(v.borderPickerBtn, 'mouse-pointer');
                v.borderPickerBtn.style.background = BUTTON_BG_DEFAULT;
                v.borderPickerBtn.style.color = '';
                v.borderPickerBtn.setAttribute('title', t('tooltip.borderPicker'));
            }
        }

        if (v.borderDashesInput) v.borderDashesInput.value = (v.borderSettings.dashes || DEFAULT_BORDER_DASHES).toString();

        toolbar.querySelectorAll('[data-draw-mode]').forEach((btn: any) => {
            const isActive = btn.dataset.drawMode === v.drawMode;
            btn.classList.toggle('active', isActive);
            btn.style.background = isActive ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
            btn.style.border = isActive ? ACTIVE_BORDER : '';
            btn.style.boxShadow = isActive ? ACTIVE_BOX_SHADOW : '';
        });

        ['grass', 'tree', 'mountain', 'building'].forEach(groupId => {
            const config = v.toolConfigs[groupId];
            const wrapper = toolbar.querySelector(`[data-tool-group-wrapper="${groupId}"]`);
            const btn = toolbar.querySelector(`[data-tool-group="${groupId}"]`);

            if (!btn || !config || !wrapper) return;

            const isActive = v.currentToolGroup === groupId;
            btn.classList.toggle('active', isActive);

            const currentVariant = config.variants.find((variant: any) => variant.id === config.currentVariant);
            if (currentVariant) {
                btn.setAttribute('title', t('tooltip.toolGroupVariant', { label: currentVariant.label }));
            }

            btn.style.background = isActive ? PICKER_ACTIVE_BG : (config.backgroundEnabled ? config.backgroundColor : BUTTON_BG_DEFAULT);
            btn.style.color = config.symbolColor;

            btn.style.border = isActive ? ACTIVE_BORDER : '';
            btn.style.boxShadow = isActive ? ACTIVE_BOX_SHADOW : '';
        });

        toolbar.querySelectorAll('[data-tool-group]').forEach((btn: any) => {
            const groupId = btn.dataset.toolGroup;
            if (!['grass', 'tree', 'mountain', 'building'].includes(groupId)) {
                const isPending = v.pathPickPending && (groupId === 'river' || groupId === 'road');
                const isActive = !isPending && btn.dataset.toolGroup === v.currentToolGroup;
                btn.classList.toggle('active', isActive);
                btn.style.background = isActive ? PICKER_ACTIVE_BG : BUTTON_BG_DEFAULT;
                btn.style.border = (isActive || isPending) ? ACTIVE_BORDER : '';
                btn.style.boxShadow = (isActive || isPending) ? ACTIVE_BOX_SHADOW : '';
                if (groupId === 'hexcolor') {
                    btn.style.color = v.hexColorColor;
                }
            }
        });

        toolbar.querySelectorAll('.hex-color-slot').forEach((slot: any) => {
            const pk = slot.dataset.paletteKey;
            const pi = parseInt(slot.dataset.paletteIndex);
            if (pk && v[pk]) {
                slot.style.backgroundColor = v[pk][pi];
            }
        });
    }
}
