// Minimal stub for Obsidian classes used in unit-tested modules.
// Only the symbols actually imported in tests need to be present.
export class Modal {
    app: unknown;
    constructor(app: unknown) { this.app = app; }
    open() {}
    close() {}
}
export class App {}
export class Plugin {}
export class PluginSettingTab {
    app: unknown;
    containerEl: HTMLElement = document.createElement('div');
    constructor(app: unknown, _plugin: unknown) { this.app = app; }
    display() {}
    hide() {}
}
export class Setting {
    settingEl: HTMLElement = document.createElement('div');
    setName(_name: string) { return this; }
    setDesc(_desc: string) { return this; }
    addText(_cb: (text: any) => any) { return this; }
    addToggle(_cb: (toggle: any) => any) { return this; }
    addButton(_cb: (btn: any) => any) { return this; }
    addDropdown(_cb: (drop: any) => any) { return this; }
    addColorPicker(_cb: (picker: any) => any) { return this; }
}
export function setIcon(_el: unknown, _icon: string) {}
