import { useTranslation } from '../../context/TranslationContext';
import type { Lang } from '../../i18n/translations';

const languages: { code: Lang; label: string; flag: string }[] = [
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'ar', label: 'AR', flag: '🇹🇳' },
];

export default function LanguageSwitcher() {
  const { lang, setLang } = useTranslation();

  return (
    <div style={{
      display: 'flex',
      gap: 6,
      background: 'rgba(255,255,255,0.6)',
      padding: '4px',
      borderRadius: 10,
      backdropFilter: 'blur(8px)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      {languages.map(({ code, label, flag }) => {
        const isActive = lang === code;
        return (
          <button
            key={code}
            onClick={() => setLang(code)}
            style={{
              padding: '6px 12px',
              borderRadius: 7,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              // Active = solid blue background, inactive = transparent
              background: isActive ? '#1a3a6b' : 'transparent',
              color: isActive ? 'white' : '#555',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>{flag}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}