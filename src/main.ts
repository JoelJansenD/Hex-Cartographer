// --- Obsidian type augmentations -------------------------------------------
declare module 'obsidian' {
    interface WorkspaceLeaf {
        updateHeader?: () => void;
        tabHeaderEl?: HTMLElement;
    }
    interface App {
        setting?: any;
    }
    interface View {
        file?: any;
    }
}

declare global {
    interface DomElementInfo {
        style?: any;
    }
}

import HexCartographerPlugin from './plugin/HexCartographerPlugin';
export { HexCartographerView } from './view/HexCartographerView';
export default HexCartographerPlugin;
