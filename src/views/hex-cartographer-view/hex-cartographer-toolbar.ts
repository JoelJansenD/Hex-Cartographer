import { ButtonComponent } from "obsidian";
import { ToolGroup } from "../../types/tool-group";
import { EditorInteractionState } from "./interactions/editor-interaction-state";

interface HexCartographerToolbarConfig {
    getState: () => EditorInteractionState;
    setState: (newState: EditorInteractionState) => void;
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
    // private paintButtons: ButtonComponent[];
    // private toolButtons: ButtonComponent[];
    private toolButtons: Record<ToolGroup, ButtonComponent> = {} as Record<ToolGroup, ButtonComponent>;

    private viewModeButton!: ButtonComponent;
    private paintBrushButton!: ButtonComponent;
    private paintBucketButton!: ButtonComponent;
    private eraserButton!: ButtonComponent;
    private textButton!: ButtonComponent;
    
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

    constructor(parentEl: HTMLElement, private config: HexCartographerToolbarConfig) {
        this.actionsContainerEl = parentEl.createDiv({ cls: 'hex-toolbar' });
        
        this.initializePaintButtons();
        this.initializePatternButtons();
        this.initializePathAndBorderButtons();
        
        this.initializeActionButtons();
        this.hideActions();
    }

    public updateState(state: EditorInteractionState) {
        // Enable correct buttons based on the current state
        const buttonKeys = Object.keys(this.toolButtons) as ToolGroup[];
        buttonKeys.forEach(key => {
            this.toolButtons[key]!.removeCta();
        });

        if(state.selectedToolGroup) {
            this.toolButtons[state.selectedToolGroup]?.setCta();
        }

        // Update displayed buttons based on edit mode
        if(state.editMode) {
            this.showActions();
        }
        else {
            this.hideActions();
        }
    }

    private setTool(toolGroup?: ToolGroup) {
        this.config.setState({
            ...this.config.getState(),
            selectedToolGroup: toolGroup || null,
        });
    }

    private enterEditMode() {
        this.config.setState({
            ...this.config.getState(),
            editMode: true,
        });
    }

    private enterViewMode() {
        this.config.setState({
            ...this.config.getState(),
            editMode: false,
        });
    }

    private hideActions() {
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

        this.paintBrushButton = new ButtonComponent(this.paintActions)
            .setIcon('brush')
            .onClick(() => this.setTool('brush'));
        this.toolButtons['brush'] = this.paintBrushButton;

        this.paintBucketButton = new ButtonComponent(this.paintActions)
            .setIcon('paint-bucket')
            .onClick(() => this.setTool('bucket'));
        this.toolButtons['bucket'] = this.paintBucketButton;

        this.eraserButton = new ButtonComponent(this.paintActions)
            .setIcon('eraser')
            .onClick(() => this.setTool('eraser'));
        this.toolButtons['eraser'] = this.eraserButton;

        this.textButton = new ButtonComponent(this.paintActions)
            .setIcon('type')
            .onClick(() => this.setTool('text'));
        this.toolButtons['text'] = this.textButton;
    }

    private initializePatternButtons() {
        this.patternActions = this.actionsContainerEl.createDiv({ cls: 'hex-toolbar-group' });
        
        this.stampPatternActionButton = new ButtonComponent(this.patternActions)
            .setIcon('copy')
            .onClick(() => this.setTool('pattern'));
        this.toolButtons['pattern'] = this.stampPatternActionButton;

        this.pickPatternActionButton = new ButtonComponent(this.patternActions)
            .setIcon('pipette')
            .onClick(() => this.setTool('pattern-picker'));
        this.toolButtons['pattern-picker'] = this.pickPatternActionButton;
    }

    private initializePathAndBorderButtons() {
        this.pathAndBorderActions = this.actionsContainerEl.createDiv({ cls: 'hex-toolbar-group' });
        
        this.riverActionButton = new ButtonComponent(this.pathAndBorderActions)
            .setIcon('droplet')
            .onClick(() => this.setTool('river'));
        this.toolButtons['river'] = this.riverActionButton;
        
        this.roadActionButton = new ButtonComponent(this.pathAndBorderActions)
            .setIcon('waypoints')
            .onClick(() => this.setTool('road'));
        this.toolButtons['road'] = this.roadActionButton;
        
        this.borderActionButton = new ButtonComponent(this.pathAndBorderActions)
            .setIcon('shield')
            .onClick(() => this.setTool('border'));
        this.toolButtons['border'] = this.borderActionButton;
        
        this.selectPathOrBorderActionButton = new ButtonComponent(this.pathAndBorderActions)
            .setIcon('pointer')
            .onClick(() => this.setTool('selectPathAndBorder'));
        this.toolButtons['selectPathAndBorder'] = this.selectPathOrBorderActionButton;
    }

    private showActions() {
        this.paintActions.removeClass('hidden');
        this.patternActions.removeClass('hidden');
        this.pathAndBorderActions.removeClass('hidden');
        this.undoActionButton.buttonEl.removeClass('hidden');
        this.redoActionButton.buttonEl.removeClass('hidden');
        this.editModeButton.buttonEl.addClass('hidden');

        if(this.config.getState().selectedToolGroup === null) {
            this.setTool('brush');
        }
    }
}