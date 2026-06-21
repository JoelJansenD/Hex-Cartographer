import { SVG_SYMBOL_DATA } from "../data/svg-symbol-data";

interface HexCartographerToolbarConfig {
    /**
     * Triggers whenever the edit mode is toggled. The callback will be provided with the icon ID of the selected icon, or undefined if no icon is currently selected.
     */
    onIconChanged?: (iconId?: string) => void;
}

export default class HexCartographerSidepanel {
    private editMode = false;
    private containerEl: HTMLDivElement;
    private config: HexCartographerToolbarConfig;

    private iconButtons: Record<string, HTMLElement> = {} as Record<string, HTMLElement>;
    
    constructor(parentEl: HTMLElement, config: HexCartographerToolbarConfig = {}) {
        this.containerEl = parentEl.createDiv({ cls: 'hex-sidepanel hidden' });
        this.config = config;
        this.initializeIconSelectionButtons();
    }

    /**
     * Set the currently active icon.
     * @param iconId The icon ID which was activated.
     * @param propagateEvent If true, the onIconChanged callback will be triggered. If false, the callback will not be triggered. Defaults to true.
     */
    public setIcon(iconId?: string, propagateEvent = true) {
        Object.values(this.iconButtons).forEach(btn => btn.removeClass('selected'));
        if(iconId) {
            this.iconButtons[iconId]?.addClass('selected');
        }

        if(propagateEvent) {
            this.config.onIconChanged?.(iconId);
        }
    }

    /**
     * Set the edit mode state to reveal or hide the side panel. When edit mode is enabled, the side panel will be visible. When edit mode is disabled, the side panel will be hidden.
     * @param enabled If true, edit mode is enabled. If false, edit mode is disabled.
     */
    public setEditMode(enabled: boolean) {
        this.editMode = enabled;

        if(this.editMode) {
            this.containerEl.removeClass('hidden');
        }
        else {
            this.containerEl.addClass('hidden');
        }
    }

    private initializeIconSelectionButtons() {
        const icons = SVG_SYMBOL_DATA;
        const iconButtons: HTMLElement[] = [];

        this.containerEl.createEl('h2', { text: 'Generic Icons' });
        const iconContainer = this.containerEl.createDiv({ cls: 'hex-sidepanel-icon-group' });
        iconButtons.push(this.createIconButton(iconContainer, {...icons.hexagon, id: 'hexagon'}, true));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.exclamation, id: 'exclamation'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.cross, id: 'cross'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.dot, id: 'dot'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.shield, id: 'shield'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.pirateskull, id: 'pirateskull'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.grass, id: 'grass'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.swamp, id: 'swamp'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.bush, id: 'bush'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.tree, id: 'tree'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.pine, id: 'pine'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.palm, id: 'palm'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.hill, id: 'hill'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.mountain, id: 'mountain'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.tent, id: 'tent'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.house, id: 'house'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.village, id: 'village'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.town, id: 'town'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.castle, id: 'castle'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.monastery, id: 'monastery'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.harbor, id: 'harbor'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.tower, id: 'tower'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.ruins, id: 'ruins'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.cave, id: 'cave'}));
        iconButtons.push(this.createIconButton(iconContainer, {...icons.oasis, id: 'oasis'}));

        return iconButtons;
    }

    private createIconButton(parentEl: HTMLElement, symbolInfo: { id: string, viewBoxWidth: number; pathData: string }, selected = false) {
        const button = parentEl.createEl('div', { cls: 'hex-sidepanel-icon-button' });
        const svg = `<svg class="hex-sidepanel-icon" viewBox="0 0 ${symbolInfo.viewBoxWidth} ${symbolInfo.viewBoxWidth}" width="32" height="32" style="vertical-align: middle;">`;
        button.innerHTML = `${svg}<path d="${symbolInfo.pathData}" /></svg>`;
        button.onclick = () => this.setIcon(symbolInfo.id);
        this.iconButtons[symbolInfo.id] = button;

        if(selected) {
            button.addClass('selected');
        }

        return button;
    }
}