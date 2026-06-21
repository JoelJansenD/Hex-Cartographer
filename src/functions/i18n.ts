export type TranslationMap = Record<string, string>;
export type TranslationParams = Record<string, unknown>;

let translations: TranslationMap = {};

function getLanguage(): string {
    return window.localStorage.getItem('language') || 'en';
}

async function getLexicon(lang = getLanguage()): Promise<TranslationMap> {
    try {
        return (await import(`../resources/lang/lexicon.${lang}.json`)).default;
    } catch {
        if (lang !== 'en') {
            return (await import('../resources/lang/lexicon.en.json')).default;
        }
        return {};
    }
}

/**
 * Loads translations for the specified language and updates the global translations object.
 * @param lang The language code (e.g., 'en', 'de').
 */
export async function loadTranslations(lang = getLanguage()): Promise<void> {
    translations = await getLexicon(lang);
}

/**
 * Localizes a string based on the current translations and optional parameters.
 * @param key The key of the string to localize.
 * @param params Optional parameters to replace in the localized string.
 * @returns The localized string with parameters replaced.
 */
export function localizeString(key: string, params?: TranslationParams): string {
    let str = translations?.[key] ?? key;
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            str = str.replace(`{${k}}`, String(v));
        }
    }
    return str;
}
