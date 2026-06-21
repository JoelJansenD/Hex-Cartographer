import { Setting, SettingTab } from "obsidian";
import { SVG_SYMBOL_DATA } from "../data/svg-symbol-data";

interface HexCartographerToolbarConfig {
    onIconChanged?: (iconId: string) => void;
}

export default class HexCartographerSidepanel {
    private containerEl: HTMLDivElement;
    private config: HexCartographerToolbarConfig;

    private iconButtons: HTMLElement[];
    
    constructor(parentEl: HTMLElement, config: HexCartographerToolbarConfig = {}) {
        this.containerEl = parentEl.createDiv({ cls: 'hex-sidepanel' });
        this.config = config;

        this.iconButtons = this.initializeIconSelectionButtons();
    }

    private initializeIconSelectionButtons() {
        const icons = SVG_SYMBOL_DATA;
        const iconButtons: HTMLElement[] = [];

        this.containerEl.createEl('h1', { text: 'Icons' });
        
        this.containerEl.createEl('h2', { text: 'Generic' });
        const genericContainer = this.containerEl.createDiv({ cls: 'hex-sidepanel-icon-group' });
        iconButtons.push(this.createIconButton(genericContainer, {...icons.question, id: 'question'}));
        iconButtons.push(this.createIconButton(genericContainer, {...icons.exclamation, id: 'exclamation'}));
        iconButtons.push(this.createIconButton(genericContainer, {...icons.cross, id: 'cross'}));
        iconButtons.push(this.createIconButton(genericContainer, {...icons.dot, id: 'dot'}));
        iconButtons.push(this.createIconButton(genericContainer, {...icons.shield, id: 'shield'}));
        iconButtons.push(this.createIconButton(genericContainer, {...icons.pirateskull, id: 'pirateskull'}));

        this.containerEl.createEl('h2', { text: 'Nature' });
        const natureContainer = this.containerEl.createDiv({ cls: 'hex-sidepanel-icon-group' });
        iconButtons.push(this.createIconButton(natureContainer, {...icons.grass, id: 'grass'}));
        iconButtons.push(this.createIconButton(natureContainer, {...icons.swamp, id: 'swamp'}));
        iconButtons.push(this.createIconButton(natureContainer, {...icons.bush, id: 'bush'}));
        iconButtons.push(this.createIconButton(natureContainer, {...icons.tree, id: 'tree'}));
        iconButtons.push(this.createIconButton(natureContainer, {...icons.pine, id: 'pine'}));
        iconButtons.push(this.createIconButton(natureContainer, {...icons.palm, id: 'palm'}));

        this.containerEl.createEl('h2', { text: 'Biomes' });
        const biomesContainer = this.containerEl.createDiv({ cls: 'hex-sidepanel-icon-group' });
        iconButtons.push(this.createIconButton(biomesContainer, {...icons.hill, id: 'hill'}));
        iconButtons.push(this.createIconButton(biomesContainer, {...icons.mountain, id: 'mountain'}));

        this.containerEl.createEl('h2', { text: 'Buildings' });
        const buildingsContainer = this.containerEl.createDiv({ cls: 'hex-sidepanel-icon-group' });
        iconButtons.push(this.createIconButton(buildingsContainer, {...icons.tent, id: 'tent'}));
        iconButtons.push(this.createIconButton(buildingsContainer, {...icons.house, id: 'house'}));
        iconButtons.push(this.createIconButton(buildingsContainer, {...icons.village, id: 'village'}));
        iconButtons.push(this.createIconButton(buildingsContainer, {...icons.town, id: 'town'}));
        iconButtons.push(this.createIconButton(buildingsContainer, {...icons.castle, id: 'castle'}));
        iconButtons.push(this.createIconButton(buildingsContainer, {...icons.monastery, id: 'monastery'}));
        iconButtons.push(this.createIconButton(buildingsContainer, {...icons.harbor, id: 'harbor'}));
        iconButtons.push(this.createIconButton(buildingsContainer, {...icons.tower, id: 'tower'}));
        iconButtons.push(this.createIconButton(buildingsContainer, {...icons.ruins, id: 'ruins'}));
        iconButtons.push(this.createIconButton(buildingsContainer, {...icons.cave, id: 'cave'}));
        iconButtons.push(this.createIconButton(buildingsContainer, {...icons.oasis, id: 'oasis'}));

        return iconButtons;
    }

    private createIconButton(parentEl: HTMLElement, symbolInfo: { id: string, viewBoxWidth: number; pathData: string }) {
        const button = parentEl.createEl('div', { cls: 'hex-sidepanel-icon-button' });
        const svg = `<svg class="hex-sidepanel-icon" viewBox="0 0 ${symbolInfo.viewBoxWidth} ${symbolInfo.viewBoxWidth}" width="32" height="32" style="vertical-align: middle;">`;
        button.innerHTML = `${svg}<path d="${symbolInfo.pathData}" /></svg>`;
        button.onclick = () => this.setIcon(button, symbolInfo.id);

        return button;
    }

    private setIcon(buttonEl: HTMLElement, iconId: string) {
        this.iconButtons.forEach(btn => btn.removeClass('selected'));
        buttonEl.addClass('selected');
        this.config.onIconChanged?.(iconId);
    }
}