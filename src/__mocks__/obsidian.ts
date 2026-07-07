// Minimal stub for Obsidian classes used in unit-tested modules.
// Only the symbols actually imported in tests need to be present.
export class Modal {
    app: unknown;
    constructor(app: unknown) { this.app = app; }
    open() {}
    close() {}
}
export class App {}
