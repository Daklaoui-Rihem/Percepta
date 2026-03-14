import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../../context/TranslationContext';
import type { Lang } from '../../i18n/translations';
import { Globe } from 'lucide-react';

const languages: { code: Lang; label: string; flag: string }[] = [
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'ar', label: 'AR', flag: '🇹🇳' },
];

export default function LanguageSwitcher() {
  const { lang, setLang } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeLang = languages.find(l => l.code === lang) || languages[1];

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Active Language Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.6)',
          border: '1px solid #e2e8f0', borderRadius: 8,
          padding: '8px 12px', cursor: 'pointer',
          color: '#1a3a6b', fontSize: 13, fontWeight: 600,
          transition: 'all 0.2s', outline: 'none',
        }}
      >
        <Globe size={18} />
        <span>{activeLang.label}</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute', top: '120%', right: 0,
          background: 'white', border: '1px solid #e2e8f0',
          borderRadius: 8, padding: 4, zIndex: 50,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex', flexDirection: 'column', gap: 2,
          minWidth: 100
        }}>
          {languages.map(({ code, label, flag }) => {
            const isActive = lang === code;
            return (
              <button
                key={code}
                onClick={() => {
                  setLang(code);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '8px 12px',
                  background: isActive ? '#f0f4f8' : 'transparent',
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                  textAlign: 'left', fontSize: 13, color: '#1a3a6b',
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                <span>{flag}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}