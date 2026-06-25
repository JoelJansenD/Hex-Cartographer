import { Modal } from 'obsidian';
import { localizeString } from '../functions/i18n';
import { FileSelectorModalCallback } from '../legacy/types-legacy';

export class FileSelectorModal extends Modal {
    onSelect: FileSelectorModalCallback;
    currentLink: string;

    constructor(app, onSelect: FileSelectorModalCallback, currentLink = '') {
        super(app);
        this.onSelect = onSelect;
        this.currentLink = currentLink;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: localizeString('modal.selectFile') });

        const filter = contentEl.createEl('input', { value: this.currentLink, placeholder: localizeString('modal.searchFile') });
        filter.style.width = '100%';
        filter.style.marginBottom = '10px';

        const listContainer = contentEl.createDiv({
            attr: { style: 'max-height: 400px; overflow-y: auto; overflow-x: hidden; border: 1px solid var(--divider-color); background: var(--background-primary); border-radius: 4px;' }
        });

        const renderList = (searchTerm = '') => {
            listContainer.empty();
            const val = searchTerm.toLowerCase();
            const files = this.app.vault.getMarkdownFiles().filter(f =>
                val === '' || f.path.toLowerCase().includes(val)
            );

            if (files.length === 0) {
                listContainer.createDiv({ text: localizeString('modal.noFilesFound'), attr: { style: 'padding: 10px; color: var(--text-muted); text-align: center;' } });
                return;
            }

            files.forEach(f => {
                const item = listContainer.createDiv({
                    text: f.path,
                    cls: 'suggestion-item',
                    attr: { style: 'padding: 8px; cursor: pointer; border-bottom: 1px solid var(--divider-color); font-size: 0.95em;' }
                });
                item.onmouseover = () => item.style.background = 'var(--background-modifier-hover)';
                item.onmouseout = () => item.style.background = '';
                item.onclick = () => {
                    this.onSelect(f.path);
                    this.close();
                };
            });
        };

        filter.oninput = () => renderList(filter.value);
        renderList(this.currentLink);

        const btnRow = contentEl.createDiv({ attr: { style: 'display: flex; gap: 10px; margin-top: 15px;' } });

        const clearBtn = btnRow.createEl('button', { text: localizeString('modal.removeLink'), attr: { style: 'flex: 1;' } });
        clearBtn.onclick = () => {
            this.onSelect('');
            setTimeout(() => {
                this.close();
                if (activeDocument.activeElement instanceof HTMLElement) {
                    activeDocument.activeElement.blur();
                }
            }, 50);
        };

        const cancelBtn = btnRow.createEl('button', { text: localizeString('modal.cancel'), cls: 'mod-cta', attr: { style: 'flex: 1;' } });
        cancelBtn.onclick = () => this.close();

        filter.focus();
    }
}
