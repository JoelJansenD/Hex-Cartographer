import { TRANSLATIONS } from './translations';

export function getObsidianLanguage(): string {
    const lang = window.localStorage.getItem('language');
    return (lang && TRANSLATIONS[lang]) ? lang : 'en';
}

export let currentLanguage = 'en';

export function setCurrentLanguage(lang: string) {
    currentLanguage = lang;
}

export function t(key: string, params?: Record<string, string>): string {
    let str = TRANSLATIONS[currentLanguage]?.[key]
           ?? TRANSLATIONS['en'][key]
           ?? key;
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            str = str.replace(`{${k}}`, v);
        }
    }
    return str;
}
