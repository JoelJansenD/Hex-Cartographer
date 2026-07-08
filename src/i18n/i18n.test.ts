import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { t, currentLanguage, setCurrentLanguage, getObsidianLanguage } from './i18n';
import { TRANSLATIONS } from './translations';

// ── setCurrentLanguage / currentLanguage ─────────────────────────────────────

describe('setCurrentLanguage', () => {
    afterEach(() => setCurrentLanguage('en'));

    it('updates currentLanguage', () => {
        setCurrentLanguage('de');
        expect(currentLanguage).toBe('de');
    });

    it('resets to en', () => {
        setCurrentLanguage('de');
        setCurrentLanguage('en');
        expect(currentLanguage).toBe('en');
    });
});

// ── t() ──────────────────────────────────────────────────────────────────────

describe('t()', () => {
    afterEach(() => setCurrentLanguage('en'));

    it('returns the English string for a known key', () => {
        expect(t('tool.extras')).toBe('Extras');
    });

    it('returns a translated string after setCurrentLanguage', () => {
        setCurrentLanguage('de');
        expect(t('tool.mountain')).toBe('Berg');
    });

    it('falls back to English when the current language lacks the key', () => {
        // Temporarily inject a language with a missing key
        (TRANSLATIONS as Record<string, Record<string, string>>)['xx'] = {};
        setCurrentLanguage('xx');
        expect(t('tool.extras')).toBe('Extras');
        delete (TRANSLATIONS as Record<string, Record<string, string>>)['xx'];
    });

    it('returns the key itself when it is absent from all languages', () => {
        expect(t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('replaces a single placeholder', () => {
        expect(t('notice.riverSelected', { id: '42' })).toBe('River #42 selected');
    });

    it('replaces multiple placeholders', () => {
        // Use a key that actually has {id} in it; build a synthetic one to cover multi-param
        (TRANSLATIONS as Record<string, Record<string, string>>)['en']['test.multi'] =
            'Hello {name}, you are {age} years old';
        expect(t('test.multi', { name: 'Alice', age: '30' }))
            .toBe('Hello Alice, you are 30 years old');
        delete (TRANSLATIONS as Record<string, Record<string, string>>)['en']['test.multi'];
    });

    it('returns the unmodified string when params is omitted', () => {
        expect(t('notice.nothingToUndo')).toBe('Nothing to undo');
    });

    it('translates the same key across multiple languages', () => {
        const cases: [string, string][] = [
            ['de', 'Extras'],
            ['zh', '其他'],
            ['fr', 'Extras'],
            ['ja', 'その他'],
        ];
        for (const [lang, expected] of cases) {
            setCurrentLanguage(lang);
            expect(t('tool.extras')).toBe(expected);
        }
    });
});

// ── getObsidianLanguage() ─────────────────────────────────────────────────────

describe('getObsidianLanguage()', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        setCurrentLanguage('en');
    });

    it('returns the stored language when it exists in TRANSLATIONS', () => {
        vi.stubGlobal('window', {
            localStorage: { getItem: (_key: string) => 'de' },
        });
        expect(getObsidianLanguage()).toBe('de');
    });

    it('falls back to "en" when localStorage returns null', () => {
        vi.stubGlobal('window', {
            localStorage: { getItem: (_key: string) => null },
        });
        expect(getObsidianLanguage()).toBe('en');
    });

    it('falls back to "en" when the stored language is not in TRANSLATIONS', () => {
        vi.stubGlobal('window', {
            localStorage: { getItem: (_key: string) => 'klingon' },
        });
        expect(getObsidianLanguage()).toBe('en');
    });
});
