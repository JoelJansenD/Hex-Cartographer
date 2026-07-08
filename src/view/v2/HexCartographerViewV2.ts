import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import HexCartographerPlugin from "../../main";
import SidebarView from "./SidebarView";
import { PaintActionBar } from "./PaintActionBar";

const MIN_WIDTH    = 2 * 54 + 1 * 6 + 2 * 12; // 138 px — 2 icons
const DEF_WIDTH    = 4 * 54 + 3 * 6 + 2 * 12; // 258 px — 4 icons (default)
const SNAP_THRESH  = MIN_WIDTH * 0.5;          //  ~69 px — snap-collapse zone
const REOPEN_THRESH = SNAP_THRESH + 50;        // ~119 px — re-open after snap

export default class HexCartographerViewV2 extends ItemView {
    private dragCleanup: (() => void) | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: HexCartographerPlugin) {
        super(leaf);
    }

    protected async onOpen(): Promise<void> {
        const { contentEl } = this;
        contentEl.addClass('hex-cartographer-container');
        const mapEl = contentEl.createDiv({ cls: 'hex-cartographer-map' });

        const paintBar = new PaintActionBar(mapEl);

        const sidebar  = new SidebarView(contentEl);
        sidebar.onSectionOpen = (id) => paintBar.setSection(id);
        // Initialise bar to match the default open section (terrain).
        paintBar.setSection('terrain');
        const sidebarEl = sidebar.el;
        sidebarEl.style.width = `${DEF_WIDTH}px`;

        const handle = contentEl.createDiv({ cls: 'hex-sidebar-handle' });
        contentEl.insertBefore(handle, sidebarEl);

        const setCollapsed = (collapsed: boolean) => {
            sidebarEl.classList.toggle('is-collapsed', collapsed);
            handle.classList.toggle('is-anchored', collapsed);
            if (collapsed) setIcon(handle, 'chevron-left');
            else           handle.empty();
        };

        let startX     = 0;
        let startWidth = 0;
        let active     = false;
        let snapDrag   = false; // collapsed mid-drag; track for re-open

        const onMouseMove = (e: MouseEvent) => {
            if (!active) return;
            const newWidth = startWidth - (e.clientX - startX);

            if (!sidebarEl.classList.contains('is-collapsed') && newWidth < SNAP_THRESH) {
                // Snap collapse — stay active so the user can reverse
                setCollapsed(true);
                sidebarEl.style.width = `${DEF_WIDTH}px`;
                snapDrag = true;
            } else if (snapDrag && newWidth > REOPEN_THRESH) {
                // Dragged back past hysteresis point — re-open
                setCollapsed(false);
                sidebarEl.style.width = `${Math.max(MIN_WIDTH, newWidth)}px`;
                snapDrag = false;
            } else if (!sidebarEl.classList.contains('is-collapsed') && newWidth > 0) {
                sidebarEl.style.width = `${Math.max(MIN_WIDTH, newWidth)}px`;
            }
        };

        const onMouseUp = () => { active = false; snapDrag = false; };

        handle.addEventListener('mousedown', (e) => {
            if (sidebarEl.classList.contains('is-collapsed')) {
                setCollapsed(false);
                sidebarEl.style.width = `${DEF_WIDTH}px`;
                e.preventDefault();
                return;
            }
            startX     = e.clientX;
            startWidth = sidebarEl.offsetWidth;
            active     = true;
            e.preventDefault();
        });

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup',   onMouseUp);
        this.dragCleanup = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup',   onMouseUp);
        };
    }

    async onClose() {
        this.dragCleanup?.();
    }

    public getViewType(): string {
        return 'hex-cartographer';
    }
    
    public getDisplayText(): string {
        if (!this.file) return 'Hex Cartographer';
        return this.file.basename.replace('.hexcartographer', '');
    }

}