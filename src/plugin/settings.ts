export interface PluginSettings {
    exportWidth: number;
    showCrosshair: boolean;
    hideHexBorders: boolean;
    hexNumberingEnabled: boolean;
    hexNumberingDirection: string;
    hexNumberingAlpha: boolean;
    hexNumberingAlphaChess: boolean;
    hexNumberingPosition: string;
    hexNumberingColor: string;
    hexNumberingOutline: boolean;
    hexNumberingFontSize: number;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    exportWidth: 1024,
    showCrosshair: true,
    hideHexBorders: false,
    hexNumberingEnabled: false,
    hexNumberingDirection: 'horizontal',
    hexNumberingAlpha: false,
    hexNumberingAlphaChess: false,
    hexNumberingPosition: 'top',
    hexNumberingColor: '#ffffff',
    hexNumberingOutline: true,
    hexNumberingFontSize: 10,
};
