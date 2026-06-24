import { App, Modal } from "obsidian";
import { LinearFeature, River, Road } from "../types/rivers-and-roads";

export default class PathPickerModal extends Modal {
    private _river: River;
    private _road: Road;
    private _callback: (selectedRiver: River | null, selectedRoad: Road | null) => void;

    constructor(app: App, river: River, road: Road, callback: (selectedRiver: River | null, selectedRoad: Road | null) => void) {
        super(app);

        this._river = river;
        this._road = road;
        this._callback = callback;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Select a road or river' });
        contentEl.createEl('p', { text: 'Multiple roads or rivers were found in the selected hex, please select which one you want.' });
        
        const actions = contentEl.createDiv({ cls: 'hex-path-picker-modal-actions' });
        actions
            .createEl('button', { text: `River (ID: ${this._river.id})`, attr: { style: `background-color: ${this._river.color}` } })
            .addEventListener('click', () => this.closeDialog(this._river, null));
        actions
            .createEl('button', { text: `Road (ID: ${this._road.id})`, attr: { style: `background-color: ${this._road.color}` } })
            .addEventListener('click', () => this.closeDialog(null, this._road));
    }

    private closeDialog(selectedRiver: River | null, selectedRoad: Road | null) {
        this._callback(selectedRiver, selectedRoad);
        this.close();
    }
}