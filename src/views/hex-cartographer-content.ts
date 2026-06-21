export default class HexCartographerContent {
    private contentEl: HTMLDivElement;

    constructor(parentEl: HTMLElement) {
        this.contentEl = parentEl.createDiv({ cls: 'hex-content' });
    }

}