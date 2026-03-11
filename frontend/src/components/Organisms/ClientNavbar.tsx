import { useNavigate } from 'react-router-dom';
import { Home, FileText, Video, BarChart3 } from 'lucide-react';
import NavLink from '../Atoms/NavLink';
import ClientProfile from '../Molecules/ClientProfile';
import Logo from '../Atoms/Logo';

type Props = {
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function ClientNavbar({ activePage, onNavigate }: Props) {
  const navigate = useNavigate();

  const navItems = [
    { icon: Home, label: 'Home', path: '/client/dashboard' },
    { icon: FileText, label: 'Transcriptions', path: '/client/transcriptions' },
    { icon: Video, label: 'Video Analysis', path: '/client/video-analysis' },
    { icon: BarChart3, label: 'Reports', path: '/client/reports' },
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

      {/* Left side: Logo placeholder + nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        <div onClick={() => navigate('/client/dashboard')} style={{ marginRight: 24 }}>
          <Logo size="medium" light />
        </div>

        {/* Nav links */}
        {navItems.map(item => (
          <NavLink
            key={item.label}
            icon={item.icon}
            label={item.label}
            active={activePage === item.label}
            onClick={() => {
              onNavigate(item.label);
              navigate(item.path);
            }}
          />
        ))}
      </div>

      {/* Right side: Client profile dropdown */}
      <ClientProfile />
    </nav>
  );
}