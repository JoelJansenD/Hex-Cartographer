import { App, Modal } from 'obsidian';
import { t } from '../i18n';

/** Returns files whose paths contain the search term (case-insensitive). Empty term matches all. */
export function filterFiles<T extends { path: string }>(files: T[], searchTerm: string): T[] {
    const val = searchTerm.toLowerCase();
    return val === '' ? files : files.filter(f => f.path.toLowerCase().includes(val));
}

export class FileSelectorModal extends Modal {
    [key: string]: any;
    constructor(app: App, onSelect: (path: string) => void, currentLink = '') {
        super(app);
        this.onSelect = onSelect;
        this.currentLink = currentLink;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: t('modal.selectFile') });

        const filter = contentEl.createEl('input', { value: this.currentLink, placeholder: t('modal.searchFile') });
        filter.style.width = '100%';
        filter.style.marginBottom = '10px';

        const listContainer = contentEl.createDiv({
            style: 'max-height: 400px; overflow-y: auto; overflow-x: hidden; border: 1px solid var(--divider-color); background: var(--background-primary); border-radius: 4px;'
        });

        const renderList = (searchTerm = '') => {
            listContainer.empty();
            const files = filterFiles(this.app.vault.getMarkdownFiles(), searchTerm);

            if (files.length === 0) {
                listContainer.createDiv({ text: t('modal.noFilesFound'), style: 'padding: 10px; color: var(--text-muted); text-align: center;' });
                return;
            }

            files.forEach(f => {
                const item = listContainer.createDiv({
                    text: f.path,
                    cls: 'suggestion-item',
                    style: 'padding: 8px; cursor: pointer; border-bottom: 1px solid var(--divider-color); font-size: 0.95em;'
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

        const btnRow = contentEl.createDiv({ style: 'display: flex; gap: 10px; margin-top: 15px;' });

        const clearBtn = btnRow.createEl('button', { text: t('modal.removeLink'), style: 'flex: 1;' });
        clearBtn.onclick = () => {
            this.onSelect('');
            setTimeout(() => {
                this.close();
                if (activeDocument.activeElement instanceof HTMLElement) {
                    activeDocument.activeElement.blur();
                }
            }, 50);
        };

        const cancelBtn = btnRow.createEl('button', { text: t('modal.cancel'), cls: 'mod-cta', style: 'flex: 1;' });
        cancelBtn.onclick = () => this.close();

        filter.focus();
    }
}
