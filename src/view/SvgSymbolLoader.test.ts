import { describe, it, expect, vi } from 'vitest';
import { SvgSymbolLoader, parseViewBoxWidth, resolveSymbolKey } from './SvgSymbolLoader';

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe('parseViewBoxWidth', () => {
    it('parses the third component of a standard viewBox string', () => {
        expect(parseViewBoxWidth('0 0 595.28 595.28')).toBeCloseTo(595.28);
    });

    it('parses an integer viewBox width', () => {
        expect(parseViewBoxWidth('0 0 100 100')).toBe(100);
    });

    it('returns 100 for null', () => {
        expect(parseViewBoxWidth(null)).toBe(100);
    });

    it('returns 100 for empty string (falsy)', () => {
        expect(parseViewBoxWidth('')).toBe(100);
    });
});

describe('resolveSymbolKey', () => {
    it('strips a single-digit variant suffix', () => {
        expect(resolveSymbolKey('tree-1.svg')).toBe('tree');
    });

    it('strips a multi-digit variant suffix', () => {
        expect(resolveSymbolKey('mountain-42.svg')).toBe('mountain');
    });

    it('strips only the final -N.svg suffix leaving earlier hyphens intact', () => {
        expect(resolveSymbolKey('my-symbol-3.svg')).toBe('my-symbol');
    });

    it('leaves a filename without the pattern unchanged', () => {
        expect(resolveSymbolKey('custom.svg')).toBe('custom.svg');
    });
});

// ---------------------------------------------------------------------------
// SvgSymbolLoader class
// ---------------------------------------------------------------------------

function makeView(overrides: Record<string, any> = {}) {
    return {
        svgSymbols: {} as Record<string, any>,
        svgSymbolsLoaded: false,
        toolConfigs: {} as Record<string, any>,
        containerEl: null as any,
        app: {
            vault: {
                adapter: {
                    list: vi.fn().mockResolvedValue({ files: [] }),
                    read: vi.fn(),
                },
            },
        },
        ...overrides,
    } as any;
}

describe('SvgSymbolLoader.load()', () => {
    it('seeds svgSymbols from bundled SVG_SYMBOL_DATA', async () => {
        const view = makeView();
        await new SvgSymbolLoader(view).load();
        expect(view.svgSymbols['tree']).toBeDefined();
        expect(view.svgSymbols['mountain']).toBeDefined();
        expect(view.svgSymbols['tree'].pathData).toBeTruthy();
        expect(view.svgSymbols['tree'].viewBoxWidth).toBeGreaterThan(0);
    });

    it('sets svgSymbolsLoaded to true on success', async () => {
        const view = makeView();
        await new SvgSymbolLoader(view).load();
        expect(view.svgSymbolsLoaded).toBe(true);
    });

    it('sets svgSymbolsLoaded to true even when the vault listing throws', async () => {
        const view = makeView({
            app: { vault: { adapter: { list: vi.fn().mockRejectedValue(new Error('no dir')) } } },
        });
        await new SvgSymbolLoader(view).load();
        expect(view.svgSymbolsLoaded).toBe(true);
    });

    it('sets svgSymbolsLoaded to true when listing returns no files', async () => {
        const view = makeView();
        await new SvgSymbolLoader(view).load();
        expect(view.svgSymbolsLoaded).toBe(true);
    });

    it('does not call read() for non-SVG files', async () => {
        const read = vi.fn();
        const view = makeView({
            app: {
                vault: {
                    adapter: {
                        list: vi.fn().mockResolvedValue({ files: ['symbols/readme.txt', 'symbols/icon.png'] }),
                        read,
                    },
                },
            },
        });
        await new SvgSymbolLoader(view).load();
        expect(read).not.toHaveBeenCalled();
    });

    it('calls read() only for .svg files', async () => {
        const read = vi.fn().mockRejectedValue(new Error('parse fail'));
        const view = makeView({
            app: {
                vault: {
                    adapter: {
                        list: vi.fn().mockResolvedValue({ files: ['symbols/tree-1.svg', 'symbols/notes.md'] }),
                        read,
                    },
                },
            },
        });
        await new SvgSymbolLoader(view).load();
        expect(read).toHaveBeenCalledTimes(1);
        expect(read).toHaveBeenCalledWith('symbols/tree-1.svg');
    });

    it('continues loading when reading an individual SVG file throws', async () => {
        const view = makeView({
            app: {
                vault: {
                    adapter: {
                        list: vi.fn().mockResolvedValue({ files: ['symbols/bad-1.svg'] }),
                        read: vi.fn().mockRejectedValue(new Error('read error')),
                    },
                },
            },
        });
        await new SvgSymbolLoader(view).load();
        expect(view.svgSymbolsLoaded).toBe(true);
    });
});

describe('SvgSymbolLoader.updateToolConfigDefaults()', () => {
    it('sets currentVariant to the first variant that has a loaded symbol', () => {
        const view = makeView({
            svgSymbols: { tree: { pathData: 'M0,0', viewBoxWidth: 100 } },
            toolConfigs: {
                tree: {
                    variants: [
                        { id: 'grass', label: 'Grass', icon: 'sprout' },
                        { id: 'tree', label: 'Tree', icon: 'trees' },
                    ],
                    currentVariant: 'grass',
                },
            },
        });
        new SvgSymbolLoader(view).updateToolConfigDefaults();
        expect(view.toolConfigs.tree.currentVariant).toBe('tree');
    });

    it('leaves currentVariant unchanged when no variants have loaded symbols', () => {
        const view = makeView({
            svgSymbols: {},
            toolConfigs: {
                grass: {
                    variants: [{ id: 'question', label: 'Question', icon: 'help-circle' }],
                    currentVariant: 'question',
                },
            },
        });
        new SvgSymbolLoader(view).updateToolConfigDefaults();
        expect(view.toolConfigs.grass.currentVariant).toBe('question');
    });

    it('skips groups whose config is null', () => {
        const view = makeView({
            toolConfigs: { grass: null, tree: null, mountain: null, building: null },
        });
        expect(() => new SvgSymbolLoader(view).updateToolConfigDefaults()).not.toThrow();
    });

    it('skips groups whose variants array is falsy', () => {
        const view = makeView({
            toolConfigs: {
                grass: { currentVariant: 'question' },
                tree: { variants: null, currentVariant: 'tree' },
                mountain: { variants: [], currentVariant: 'mountain' },
                building: { variants: [], currentVariant: 'house' },
            },
        });
        expect(() => new SvgSymbolLoader(view).updateToolConfigDefaults()).not.toThrow();
    });
});

describe('SvgSymbolLoader.updateButtonIcons()', () => {
    it('returns without throwing when containerEl is null', () => {
        const view = makeView({ containerEl: null });
        expect(() => new SvgSymbolLoader(view).updateButtonIcons()).not.toThrow();
    });

    it('returns without throwing when .hex-toolbar is not found', () => {
        const view = makeView({
            containerEl: { querySelector: vi.fn().mockReturnValue(null) },
        });
        expect(() => new SvgSymbolLoader(view).updateButtonIcons()).not.toThrow();
    });
});
