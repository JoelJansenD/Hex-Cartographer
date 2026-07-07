import { setIcon } from 'obsidian';
import { SVG_SYMBOL_DATA } from '../data/svgSymbols';

/** Derives the symbol key from an SVG filename by stripping the trailing `-N.svg` variant suffix. */
export function resolveSymbolKey(filename: string): string {
    return filename.replace(/-\d+\.svg$/, '');
}

/**
 * Parses the width value from an SVG viewBox attribute string (e.g. `"0 0 595.28 595.28"`).
 * Returns 100 when the attribute is absent.
 */
export function parseViewBoxWidth(viewBox: string | null): number {
    if (!viewBox) return 100;
    return parseFloat(viewBox.split(' ')[2]);
}

/**
 * Handles loading SVG symbol path data (from bundled data and from the
 * vault's symbols directory) and updating toolbar button icons to reflect
 * the currently-selected variant for each tool group.
 */
export class SvgSymbolLoader {
    private view: any;

    constructor(view: any) {
        this.view = view;
    }

    async load(): Promise<void> {
        for (const [key, data] of Object.entries(SVG_SYMBOL_DATA)) {
            this.view.svgSymbols[key] = { pathData: data.pathData, viewBoxWidth: data.viewBoxWidth };
        }

        const symbolsDir = '.obsidian/plugins/hex-cartographer/symbols';
        try {
            const listing = await this.view.app.vault.adapter.list(symbolsDir);
            if (listing && listing.files && listing.files.length > 0) {
                for (const filePath of listing.files) {
                    if (!filePath.endsWith('.svg')) continue;
                    const filename = filePath.split('/').pop();
                    const key = resolveSymbolKey(filename);
                    try {
                        const svgContent = await this.view.app.vault.adapter.read(filePath);
                        const parser = new DOMParser();
                        const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
                        const svgElement = svgDoc.querySelector('svg');
                        const pathElement = svgDoc.querySelector('path');
                        if (pathElement && svgElement) {
                            const pathData = pathElement.getAttribute('d');
                            const viewBoxWidth = parseViewBoxWidth(svgElement.getAttribute('viewBox'));
                            this.view.svgSymbols[key] = { pathData, viewBoxWidth };
                            console.log(`SVG from file: ${key}`);
                        }
                    } catch (e) {
                        console.log(`Could not read SVG file: ${filename}`);
                    }
                }
            }
        } catch (e) {
        }

        this.view.svgSymbolsLoaded = true;
    }

    updateToolConfigDefaults(): void {
        ['grass', 'tree', 'mountain', 'building'].forEach(groupId => {
            const config = this.view.toolConfigs[groupId];
            if (config && config.variants) {
                const firstAvailableSVG = config.variants.find((v: any) => this.view.svgSymbols[v.id]);
                if (firstAvailableSVG) {
                    config.currentVariant = firstAvailableSVG.id;
                    console.log(`✓ Set default variant for ${groupId}: ${firstAvailableSVG.id}`);
                }
            }
        });
    }

    updateButtonIcons(): void {
        if (!this.view.containerEl) return;

        const toolbar = this.view.containerEl.querySelector('.hex-toolbar');
        if (!toolbar) return;

        ['grass', 'tree', 'mountain', 'building'].forEach(groupId => {
            const config = this.view.toolConfigs[groupId];
            if (!config) return;

            const wrapper = toolbar.querySelector(`[data-tool-group-wrapper="${groupId}"]`);
            if (!wrapper) return;

            const btn = wrapper.querySelector('.hex-tool-btn');
            if (!btn) return;

            const currentVariant = config.variants.find((v: any) => v.id === config.currentVariant);
            if (!currentVariant) return;

            if (this.view.svgSymbols[currentVariant.id]) {
                const symbolInfo = this.view.svgSymbols[currentVariant.id];
                btn.innerHTML = `<svg viewBox="0 0 ${symbolInfo.viewBoxWidth} ${symbolInfo.viewBoxWidth}"
                                      width="16" height="16" style="vertical-align: middle;">
                    <path d="${symbolInfo.pathData}" fill="currentColor"/>
                </svg>`;
                console.log(`✓ Updated button icon for ${groupId} to ${currentVariant.id}`);
            } else {
                btn.innerHTML = '';
                setIcon(btn as HTMLElement, currentVariant.icon);
            }
        });
    }
}
