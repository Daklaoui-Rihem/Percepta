import Logo from '../Atoms/Logo';
import LanguageSwitcher from '../Atoms/LanguageSwitcher';
import { useTranslation } from '../../context/TranslationContext';

type Props = { children: React.ReactNode }

export default function AuthTemplate({ children }: Props) {
  const { t, isRTL } = useTranslation();

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #dff5ff 0%, #c6eaff 100%)',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      // Flip layout direction for Arabic
      direction: isRTL ? 'rtl' : 'ltr',
    }}>

      {/* Decorative background blobs */}
      <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, #6ab7e4 0%, transparent 70%)', opacity: 0.1, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, #3c4a9d 0%, transparent 70%)', opacity: 0.05, pointerEvents: 'none' }} />

      {/* Language switcher — top right corner */}
      <div style={{
        position: 'absolute',
        top: 20,
        // Flip side for Arabic (RTL puts it on the left physically)
        right: isRTL ? 'auto' : 20,
        left: isRTL ? 20 : 'auto',
      }}>
        <LanguageSwitcher />
      </div>

      {/* Center content: logo + form + copyright */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', width: '100%',
        maxWidth: 420, zIndex: 1,
      }}>
        <div style={{ marginBottom: 32 }}>
          <Logo size="large" />
        </div>

        {children}

        {/* Copyright — now translated */}
        <p style={{ textAlign: 'center', padding: '16px', color: '#666', fontSize: 13 }}>
          {t('copyright')}
        </p>
      </div>
    </div>
  );
}