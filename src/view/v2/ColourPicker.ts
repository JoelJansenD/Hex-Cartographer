export class ColourPicker {
    private selectedColour: string;
    private readonly swatches = new Map<string, HTMLElement>();
    private readonly activeEl: HTMLElement;

    constructor(
        container: HTMLElement,
        colours: string[],
        initialColour: string,
        onChange: (colour: string) => void
    ) {
        this.selectedColour = initialColour;

        const wrapper = container.createDiv({ cls: 'hex-colour-picker' });

        this.activeEl = wrapper.createDiv({ cls: 'hex-colour-picker-active' });
        this.activeEl.style.backgroundColor = initialColour;

        const grid = wrapper.createDiv({ cls: 'hex-colour-picker-swatches' });

        for (const colour of colours) {
            const swatch = grid.createDiv({ cls: 'hex-colour-swatch' });
            swatch.style.backgroundColor = colour;
            this.swatches.set(colour, swatch);
            swatch.addEventListener('click', () => {
                this.select(colour);
                onChange(colour);
            });
        }

        this.select(initialColour);
    }

    private select(colour: string): void {
        this.swatches.get(this.selectedColour)?.classList.remove('is-selected');
        this.selectedColour = colour;
        this.activeEl.style.backgroundColor = colour;
        this.swatches.get(colour)?.classList.add('is-selected');
    }

    getColour(): string { return this.selectedColour; }
}
