import { ButtonComponent } from "obsidian";
import { ToolGroup } from "../types";

interface HexCartographerToolbarConfig {
    onToolChanged?: (tool: ToolGroup) => void;
}

export default class HexCartographerToolbar {

    // ===================================================
    // Containers
    // ===================================================
    private actionsContainerEl: HTMLElement;
    private paintActions!: HTMLDivElement;
    private patternActions!: HTMLDivElement;
    private pathAndBorderActions!: HTMLDivElement;

    // ===================================================
    // Buttons
    // ===================================================
    private toolButtons: ButtonComponent[];

    private viewModeButton!: ButtonComponent;
    private paintActionButton!: ButtonComponent;
    private bucketActionButton!: ButtonComponent;
    private eraserActionButton!: ButtonComponent;
    private textActionButton!: ButtonComponent;
    
    private stampPatternActionButton!: ButtonComponent;
    private pickPatternActionButton!: ButtonComponent;
    
    private riverActionButton!: ButtonComponent;
    private roadActionButton!: ButtonComponent;
    private borderActionButton!: ButtonComponent;
    private selectPathOrBorderActionButton!: ButtonComponent;
    
    private editModeButton!: ButtonComponent;
    private undoActionButton!: ButtonComponent;
    private redoActionButton!: ButtonComponent;
    private resizeActionButton!: ButtonComponent;
    private settingsActionButton!: ButtonComponent;

    constructor(parentEl: HTMLElement, private config: HexCartographerToolbarConfig = {}) {
        console.log('Initializing toolbar with');

        this.actionsContainerEl = parentEl.createDiv({ cls: 'hex-toolbar' });
        
        this.toolButtons = [];
        this.toolButtons.push(...this.initializePaintButtons());
        this.toolButtons.push(...this.initializePatternButtons());
        this.toolButtons.push(...this.initializePathAndBorderButtons());
        
        this.initializeActionButtons();
        this.enterViewMode();
    }

    private enterEditMode() {
        this.paintActions.removeClass('hidden');
        this.patternActions.removeClass('hidden');
        this.pathAndBorderActions.removeClass('hidden');
        this.undoActionButton.buttonEl.removeClass('hidden');
        this.redoActionButton.buttonEl.removeClass('hidden');
        this.editModeButton.buttonEl.addClass('hidden');

        this.setTool(this.paintActionButton, 'hexcolor');
    }

    private enterViewMode() {
        this.paintActions.addClass('hidden');
        this.patternActions.addClass('hidden');
        this.pathAndBorderActions.addClass('hidden');
        this.undoActionButton.buttonEl.addClass('hidden');
        this.redoActionButton.buttonEl.addClass('hidden');
        this.editModeButton.buttonEl.removeClass('hidden');
    }

    private initializeActionButtons() {
        const actions = this.actionsContainerEl.createDiv({ cls: 'hex-toolbar-group' });

        this.editModeButton = new ButtonComponent(actions)
            .setIcon('pencil')
            .onClick(() => this.enterEditMode());

        this.undoActionButton = new ButtonComponent(actions)
            .setIcon('undo');
        
        this.redoActionButton = new ButtonComponent(actions)
            .setIcon('redo');

        this.resizeActionButton = new ButtonComponent(actions)
            .setIcon('scaling');

        this.settingsActionButton = new ButtonComponent(actions)
            .setIcon('settings');
    }

    private initializePaintButtons() {
        this.paintActions = this.actionsContainerEl.createDiv({ cls: 'hex-toolbar-group' });

        this.viewModeButton = new ButtonComponent(this.paintActions)
            .setIcon('eye')
            .onClick(() => this.enterViewMode());

        this.paintActionButton = new ButtonComponent(this.paintActions)
            .setIcon('hexagon')
            .onClick(() => this.setTool(this.paintActionButton, 'hexcolor'));

        this.bucketActionButton = new ButtonComponent(this.paintActions)
            .setIcon('paint-bucket')
            .onClick(() => this.setTool(this.bucketActionButton, 'bucket'));

        this.eraserActionButton = new ButtonComponent(this.paintActions)
            .setIcon('eraser')
            .onClick(() => this.setTool(this.eraserActionButton, 'eraser'));

        this.textActionButton = new ButtonComponent(this.paintActions)
            .setIcon('type')
            .onClick(() => this.setTool(this.textActionButton, 'text'));

        return [ this.paintActionButton, this.bucketActionButton, this.eraserActionButton, this.textActionButton ];
    }

    private initializePatternButtons() {
        this.patternActions = this.actionsContainerEl.createDiv({ cls: 'hex-toolbar-group' });
        
        this.stampPatternActionButton = new ButtonComponent(this.patternActions)
            .setIcon('copy')
            .onClick(() => this.setTool(this.stampPatternActionButton, 'pattern'));

        this.pickPatternActionButton = new ButtonComponent(this.patternActions)
            .setIcon('pipette')
            .onClick(() => this.setTool(this.pickPatternActionButton, 'pickPattern'));

        return [ this.stampPatternActionButton, this.pickPatternActionButton ];
    }

    private initializePathAndBorderButtons() {
        this.pathAndBorderActions = this.actionsContainerEl.createDiv({ cls: 'hex-toolbar-group' });
        
        this.riverActionButton = new ButtonComponent(this.pathAndBorderActions)
            .setIcon('droplet')
            .onClick(() => this.setTool(this.riverActionButton, 'river'));
        
        this.roadActionButton = new ButtonComponent(this.pathAndBorderActions)
            .setIcon('waypoints')
            .onClick(() => this.setTool(this.roadActionButton, 'road'));
        
        this.borderActionButton = new ButtonComponent(this.pathAndBorderActions)
            .setIcon('shield')
            .onClick(() => this.setTool(this.borderActionButton, 'border'));
        
        this.selectPathOrBorderActionButton = new ButtonComponent(this.pathAndBorderActions)
            .setIcon('pointer')
            .onClick(() => this.setTool(this.selectPathOrBorderActionButton, 'selectPathAndBorder'));

        return [ this.riverActionButton, this.roadActionButton, this.borderActionButton, this.selectPathOrBorderActionButton ];
    }

    private setTool(button: ButtonComponent, toolGroup: ToolGroup) {
        this.toolButtons.forEach(btn => btn = btn.removeCta());
        button = button.setCta();

        this.config.onToolChanged?.(toolGroup);
    }
}