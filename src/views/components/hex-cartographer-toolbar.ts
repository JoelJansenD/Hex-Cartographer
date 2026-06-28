import { ButtonComponent } from "obsidian";
import { PaintMode, ToolGroup } from "../../types/tool-group";
import HexCartographerComponentConfig from "./hex-cartographer-component-config";
import HexCartographerViewState from "../hex-cartographer-view-state";
import { localizeString } from "../../functions/i18n";

interface HexCartographerToolbarConfig extends HexCartographerComponentConfig {
    undo: () => void;
    redo: () => void;
}

export default class HexCartographerToolbar {

    private config: HexCartographerToolbarConfig;

    // ===================================================
    // Containers
    // ===================================================
    private actionsContainerEl: HTMLElement;
    private paintActions!: HTMLDivElement;
    private patternActions!: HTMLDivElement;
    private pathActions!: HTMLDivElement;
    private borderActions!: HTMLDivElement;

    // ===================================================
    // Buttons
    // ===================================================
    private toolButtons: Record<ToolGroup | PaintMode, ButtonComponent> = {} as Record<ToolGroup | PaintMode, ButtonComponent>;

    private viewModeButton!: ButtonComponent;
    private paintBrushButton!: ButtonComponent;
    private paintBucketButton!: ButtonComponent;
    private eraserButton!: ButtonComponent;
    private textButton!: ButtonComponent;
    
    private stampPatternActionButton!: ButtonComponent;
    private pickPatternActionButton!: ButtonComponent;
    
    private riverActionButton!: ButtonComponent;
    private roadActionButton!: ButtonComponent;
    private selectPathActionButton!: ButtonComponent;
    private borderActionButton!: ButtonComponent;
    private selectBorderActionButton!: ButtonComponent;
    
    private editModeButton!: ButtonComponent;
    private undoActionButton!: ButtonComponent;
    private redoActionButton!: ButtonComponent;
    private resizeActionButton!: ButtonComponent;
    private settingsActionButton!: ButtonComponent;

    constructor(parentEl: HTMLElement, config: HexCartographerToolbarConfig) {
        this.config = config;
        this.actionsContainerEl = parentEl.createDiv({ cls: 'hex-toolbar' });
        
        this.initializePaintButtons();
        this.initializePatternButtons();
        this.initializePathAndBorderButtons();
        
        this.initializeActionButtons();
        this.hideActions();
    }

    public updateState(state: HexCartographerViewState) {
        // Update displayed buttons based on edit mode
        if(state.editMode) {
            this.showActions();
        }
        else {
            this.hideActions();
        }

        // Enable correct buttons based on the current state
        const buttonKeys = Object.keys(this.toolButtons) as ToolGroup[];
        buttonKeys.forEach(key => {
            this.toolButtons[key]!.removeCta();
        });

        if(state.selectedToolGroup) {
            this.toolButtons[state.selectedToolGroup]?.setCta();
        }

        if(state.selectedPaintMode) {
            this.toolButtons[state.selectedPaintMode]?.setCta();
        }
    }

    private setPaintMode(paintMode: PaintMode) {
        this.config.setState({
            ...this.config.getState(),
            selectedPaintMode: paintMode,
        }, false);
    }

    private setTool(toolGroup: ToolGroup) {
        const state = this.config.getState();
        this.config.setState({
            ...state,
            selectedToolGroup: toolGroup === state.selectedToolGroup ? null : toolGroup,
        }, false);
    }

    private enterEditMode() {
        this.config.setState({
            ...this.config.getState(),
            editMode: true,
        }, false);
    }

    private enterViewMode() {
        this.config.setState({
            ...this.config.getState(),
            editMode: false,
        }, false);
    }

    private hideActions() {
        this.paintActions.addClass('hidden');
        this.patternActions.addClass('hidden');
        this.pathActions.addClass('hidden');
        this.borderActions.addClass('hidden');
        this.undoActionButton.buttonEl.addClass('hidden');
        this.redoActionButton.buttonEl.addClass('hidden');
        this.editModeButton.buttonEl.removeClass('hidden');  
    }

    private initializeActionButtons() {
        const actions = this.actionsContainerEl.createDiv({ cls: 'hex-toolbar-group' });

        this.editModeButton = new ButtonComponent(actions)
            .setIcon('pencil')
            .setTooltip(localizeString("tooltip.editMode"))
            .onClick(() => this.enterEditMode());

        this.undoActionButton = new ButtonComponent(actions)
            .setIcon('undo')
            .setTooltip(localizeString("tooltip.undo"))
            .onClick(() => this.config.undo());
        
        this.redoActionButton = new ButtonComponent(actions)
            .setIcon('redo')
            .setTooltip(localizeString("tooltip.redo"))
            .onClick(() => this.config.redo());

        this.resizeActionButton = new ButtonComponent(actions)
            .setTooltip(localizeString("tooltip.fit"))
            .setIcon('scaling');

        this.settingsActionButton = new ButtonComponent(actions)
            .setTooltip(localizeString("tooltip.settings"))
            .setIcon('settings');
    }

    private initializePaintButtons() {
        this.paintActions = this.actionsContainerEl.createDiv({ cls: 'hex-toolbar-group' });

        this.viewModeButton = new ButtonComponent(this.paintActions)
            .setIcon('eye')
            .setTooltip(localizeString("tooltip.editMode"))
            .onClick(() => this.enterViewMode());

        this.paintBrushButton = new ButtonComponent(this.paintActions)
            .setIcon('brush')
            .setTooltip(localizeString("tooltip.hexColor"))
            .onClick(() => this.setPaintMode('brush'));
        this.toolButtons['brush'] = this.paintBrushButton;

        this.paintBucketButton = new ButtonComponent(this.paintActions)
            .setIcon('paint-bucket')
            .setTooltip(localizeString("tooltip.fill"))
            .onClick(() => this.setPaintMode('bucket'));
        this.toolButtons['bucket'] = this.paintBucketButton;

        this.eraserButton = new ButtonComponent(this.paintActions)
            .setIcon('eraser')
            .setTooltip(localizeString("tooltip.eraser"))
            .onClick(() => this.setPaintMode('eraser'));
        this.toolButtons['eraser'] = this.eraserButton;

        this.textButton = new ButtonComponent(this.paintActions)
            .setIcon('type')
            .setTooltip(localizeString("tooltip.text"))
            .onClick(() => this.setPaintMode('text'));
        this.toolButtons['text'] = this.textButton;
    }

    private initializePatternButtons() {
        this.patternActions = this.actionsContainerEl.createDiv({ cls: 'hex-toolbar-group' });
        
        this.stampPatternActionButton = new ButtonComponent(this.patternActions)
            .setIcon('copy')
            .setTooltip(localizeString("tooltip.pattern"))
            .onClick(() => this.setTool('pattern'));
        this.toolButtons['pattern'] = this.stampPatternActionButton;

        this.pickPatternActionButton = new ButtonComponent(this.patternActions)
            .setIcon('pipette')
            .setTooltip(localizeString("tooltip.patternPicker"))
            .onClick(() => this.setTool('pattern-picker'));
        this.toolButtons['pattern-picker'] = this.pickPatternActionButton;
    }

    private initializePathAndBorderButtons() {
        this.pathActions = this.actionsContainerEl.createDiv({ cls: 'hex-toolbar-group' });
        
        this.riverActionButton = new ButtonComponent(this.pathActions)
            .setIcon('droplet')
            .setTooltip(localizeString("tooltip.river"))
            .onClick(() => this.setTool('river'));
        this.toolButtons['river'] = this.riverActionButton;
        
        this.roadActionButton = new ButtonComponent(this.pathActions)
            .setIcon('waypoints')
            .setTooltip(localizeString("tooltip.road"))
            .onClick(() => this.setTool('road'));
        this.toolButtons['road'] = this.roadActionButton;
        
        this.selectPathActionButton = new ButtonComponent(this.pathActions)
            .setIcon('pointer')
            .setTooltip(localizeString("tooltip.pathPicker"))
            .onClick(() => this.setTool('select-path'));
        this.toolButtons['select-path'] = this.selectPathActionButton;
        
        this.borderActions = this.actionsContainerEl.createDiv({ cls: 'hex-toolbar-group' });
        this.borderActionButton = new ButtonComponent(this.borderActions)
            .setIcon('shield')
            .setTooltip(localizeString("tooltip.border"))
            .onClick(() => this.setTool('border'));
        this.toolButtons['border'] = this.borderActionButton;
        
        this.selectBorderActionButton = new ButtonComponent(this.borderActions)
            .setIcon('pointer')
            .setTooltip(localizeString("tooltip.borderPicker"))
            .onClick(() => this.setTool('select-border'));
        this.toolButtons['select-border'] = this.selectBorderActionButton;
    }

    private showActions() {
        this.paintActions.removeClass('hidden');
        this.patternActions.removeClass('hidden');
        this.pathActions.removeClass('hidden');
        this.borderActions.removeClass('hidden');
        this.undoActionButton.buttonEl.removeClass('hidden');
        this.redoActionButton.buttonEl.removeClass('hidden');
        this.editModeButton.buttonEl.addClass('hidden');
    }
}