import { createContext, useContext, useState, useEffect } from 'react';
import translations, { type Lang } from '../i18n/translations';

// Shape of what the context provides
type TranslationContextType = {
  lang: Lang;                        // current language: 'fr' | 'en' | 'ar'
  setLang: (l: Lang) => void;        // function to change language
  t: (key: keyof typeof translations) => string; // translate a key
  isRTL: boolean;                    // true when Arabic is selected
}

const TranslationContext = createContext<TranslationContextType>({
  lang: 'fr',
  setLang: () => {},
  t: (key) => String(key),
  isRTL: false,
});

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  // Default language is French — change to 'en' if you prefer
  const [lang, setLangState] = useState<Lang>(() => {
    // Remember user's language preference across page refreshes
    return (localStorage.getItem('lang') as Lang) || 'fr';
  });

  const isRTL = lang === 'ar';

  // When language changes:
  // 1. Save to localStorage so preference is remembered
  // 2. Set document direction for Arabic (RTL = right-to-left)
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('lang', l);
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
  };

  // Apply direction on first load too
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, []);

  // The t() function: looks up the key and returns the text for current language
  const t = (key: keyof typeof translations): string => {
    return translations[key]?.[lang] ?? String(key);
    // If key doesn't exist, shows the key itself (helps debug missing translations)
  };

  return (
    <TranslationContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </TranslationContext.Provider>
  );
}

// Custom hook — components call: const { t, lang, setLang } = useTranslation();
export const useTranslation = () => useContext(TranslationContext);