import { useNavigate } from 'react-router-dom';
import { Home, FileText, Video, History } from 'lucide-react';
import NavLink from '../Atoms/NavLink';
import ClientProfile from '../Molecules/ClientProfile';
import Logo from '../Atoms/Logo';
import LanguageSwitcher from '../Atoms/LanguageSwitcher';
import { useTranslation } from '../../context/TranslationContext';

type Props = {
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function ClientNavbar({ activePage, onNavigate }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navItems = [
    { icon: Home, label: 'Home', translatedLabel: t('home'), path: '/client/dashboard' },
    { icon: FileText, label: 'Transcriptions', translatedLabel: t('transcriptions'), path: '/client/transcriptions/new' },
    { icon: Video, label: 'Video Analysis', translatedLabel: t('videoAnalysis'), path: '/client/video-analysis/new' },
    { icon: History, label: 'Audio History', translatedLabel: t('audioHistory') || 'Audio History', path: '/client/history' },
    { icon: History, label: 'Video History', translatedLabel: t('videoHistory') || 'Video History', path: '/client/video-history' },
  ];

  return (
    <nav style={{
      background: 'linear-gradient(90deg, #1a3f5f 0%, #3c4a9d 100%)',
      padding: '0 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 88,
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div onClick={() => navigate('/client/dashboard')} style={{ marginRight: 24, cursor: 'pointer' }}>
          <Logo size="medium" light />
        </div>

        {navItems.map(item => (
          <NavLink
            key={item.label}
            icon={item.icon}
            label={item.translatedLabel}
            active={activePage === item.label}
            onClick={() => {
              onNavigate(item.label);
              navigate(item.path);
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <LanguageSwitcher />
        <ClientProfile />
      </div>
    </nav>
  );
}