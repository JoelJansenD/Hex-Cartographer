import { setIcon } from 'obsidian';

export type PaintAction = 'pointer' | 'brush' | 'bucket' | 'eraser';

/** Which painting actions are available for each sidebar section. */
const SECTION_ACTIONS: Record<string, PaintAction[]> = {
    terrain:  ['pointer', 'brush', 'bucket', 'eraser'],
    icons:    ['pointer', 'brush', 'bucket', 'eraser'],
    text:     ['pointer'],
    rivers:   ['pointer'],
    roads:    ['pointer'],
    factions: ['pointer', 'brush', 'bucket', 'eraser'],
};

const ACTION_ICON: Record<PaintAction, string> = {
    pointer: 'mouse-pointer-2',
    brush:   'brush',
    bucket:  'paint-bucket',
    eraser:  'eraser',
};

const ACTION_LABEL: Record<PaintAction, string> = {
    pointer: 'Select',
    brush:   'Brush',
    bucket:  'Fill',
    eraser:  'Eraser',
};

const ALL_ACTIONS: PaintAction[] = ['pointer', 'brush', 'bucket', 'eraser'];

/**
 * Floating column of painting-action buttons anchored to the bottom-right of
 * the map canvas area.  Visibility of each button adapts to the active sidebar
 * section; active state is tracked internally.
 */
export class PaintActionBar {
    readonly el: HTMLElement;
    private activeAction: PaintAction = 'pointer';
    private readonly buttons = new Map<PaintAction, HTMLElement>();

    constructor(container: HTMLElement) {
        this.el = container.createDiv({ cls: 'hex-paint-action-bar' });

        for (const action of ALL_ACTIONS) {
            const btn = this.el.createDiv({
                cls: 'hex-paint-action-btn',
                attr: { title: ACTION_LABEL[action] },
            });
            const iconEl = btn.createDiv({ cls: 'hex-paint-action-icon' });
            setIcon(iconEl, ACTION_ICON[action]);
            btn.addEventListener('click', () => this.setActive(action));
            this.buttons.set(action, btn);
        }

        this.setActive('pointer');
    }

    /** Update the bar to show only the actions relevant to `sectionId`. */
    setSection(sectionId: string): void {
        const allowed = SECTION_ACTIONS[sectionId] ?? ['pointer'];

        for (const [action, btn] of this.buttons) {
            btn.classList.toggle('is-hidden', !allowed.includes(action));
        }

        if (!allowed.includes(this.activeAction)) {
            this.setActive('pointer');
        }
    }

    private setActive(action: PaintAction): void {
        this.buttons.get(this.activeAction)?.classList.remove('is-active');
        this.activeAction = action;
        this.buttons.get(action)?.classList.add('is-active');
    }

    getActiveAction(): PaintAction {
        return this.activeAction;
    }
}
