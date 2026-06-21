export default class HexCartographerSidepanel {
    private containerEl: HTMLDivElement;
    
    constructor(private parentEl: HTMLElement) {
        this.containerEl = parentEl.createDiv({ cls: 'hex-sidepanel' });
    }
}