import {
    DEFAULT_BUILDING_BG_COLOR,
    DEFAULT_BUILDING_SYMBOL_COLOR,
    DEFAULT_EXTRAS_BG_COLOR,
    DEFAULT_EXTRAS_SYMBOL_COLOR,
    DEFAULT_MOUNTAIN_BG_COLOR,
    DEFAULT_MOUNTAIN_SYMBOL_COLOR,
    DEFAULT_VEGETATION_BG_COLOR,
    DEFAULT_VEGETATION_SYMBOL_COLOR,
} from '../constants';

export const SYMBOL_TOOL_GROUP_IDS = ['grass', 'tree', 'mountain', 'building'] as const;

const SYMBOL_TOOL_GROUP_DEFINITIONS = {
    grass: {
        nameKey: 'tool.extras',
        defaultVariant: 'question',
        defaultSymbolColor: DEFAULT_EXTRAS_SYMBOL_COLOR,
        defaultBackgroundColor: DEFAULT_EXTRAS_BG_COLOR,
        variants: [
            { id: 'question', labelKey: 'variant.question', icon: 'help-circle' },
            { id: 'exclamation', labelKey: 'variant.exclamation', icon: 'alert-circle' },
            { id: 'cross', labelKey: 'variant.cross', icon: 'x' },
            { id: 'dot', labelKey: 'variant.dot', icon: 'circle' },
            { id: 'shield', labelKey: 'variant.shield', icon: 'shield' },
            { id: 'pirateskull', labelKey: 'variant.pirateskull', icon: 'skull' },
        ],
    },
    tree: {
        nameKey: 'tool.vegetation',
        defaultVariant: 'tree',
        defaultSymbolColor: DEFAULT_VEGETATION_SYMBOL_COLOR,
        defaultBackgroundColor: DEFAULT_VEGETATION_BG_COLOR,
        variants: [
            { id: 'grass', labelKey: 'variant.grass', icon: 'sprout' },
            { id: 'swamp', labelKey: 'variant.swamp', icon: 'waves' },
            { id: 'bush', labelKey: 'variant.bush', icon: 'leaf' },
            { id: 'tree', labelKey: 'variant.tree', icon: 'trees' },
            { id: 'pine', labelKey: 'variant.pine', icon: 'triangle' },
            { id: 'palm', labelKey: 'variant.palm', icon: 'palmtree' },
        ],
    },
    mountain: {
        nameKey: 'tool.mountain',
        defaultVariant: 'mountain',
        defaultSymbolColor: DEFAULT_MOUNTAIN_SYMBOL_COLOR,
        defaultBackgroundColor: DEFAULT_MOUNTAIN_BG_COLOR,
        variants: [
            { id: 'hill', labelKey: 'variant.hill', icon: 'chevron-up' },
            { id: 'mountain', labelKey: 'variant.mountain', icon: 'mountain' },
        ],
    },
    building: {
        nameKey: 'tool.building',
        defaultVariant: 'house',
        defaultSymbolColor: DEFAULT_BUILDING_SYMBOL_COLOR,
        defaultBackgroundColor: DEFAULT_BUILDING_BG_COLOR,
        variants: [
            { id: 'tent', labelKey: 'variant.tent', icon: 'tent' },
            { id: 'house', labelKey: 'variant.house', icon: 'home' },
            { id: 'village', labelKey: 'variant.village', icon: 'school' },
            { id: 'town', labelKey: 'variant.town', icon: 'castle' },
            { id: 'castle', labelKey: 'variant.castle', icon: 'shield' },
            { id: 'monastery', labelKey: 'variant.monastery', icon: 'church' },
            { id: 'harbor', labelKey: 'variant.harbor', icon: 'ship' },
            { id: 'tower', labelKey: 'variant.tower', icon: 'tower' },
            { id: 'ruins', labelKey: 'variant.ruins', icon: 'archive' },
            { id: 'cave', labelKey: 'variant.cave', icon: 'circle' },
            { id: 'oasis', labelKey: 'variant.oasis', icon: 'droplet' },
        ],
    },
} as const;

export function buildToolConfigs(existing: any, localize: (key: string) => string) {
    const ex = existing || {};

    return Object.fromEntries(
        Object.entries(SYMBOL_TOOL_GROUP_DEFINITIONS).map(([groupId, def]) => [
            groupId,
            {
                name: localize(def.nameKey),
                variants: def.variants.map((variant) => ({
                    id: variant.id,
                    label: localize(variant.labelKey),
                    icon: variant.icon,
                })),
                currentVariant: ex[groupId]?.currentVariant || def.defaultVariant,
                symbolColor: ex[groupId]?.symbolColor || def.defaultSymbolColor,
                backgroundColor: ex[groupId]?.backgroundColor || def.defaultBackgroundColor,
                backgroundEnabled: ex[groupId]?.backgroundEnabled || false,
            },
        ]),
    );
}
