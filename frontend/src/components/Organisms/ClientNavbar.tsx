import { useNavigate } from 'react-router-dom';
import NavLink from '../Atoms/NavLink';
import ClientProfile from '../Molecules/ClientProfile';
import logo from '../../assets/Logo.png';

type Props = {
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function ClientNavbar({ activePage, onNavigate }: Props) {
  const navigate = useNavigate();

  const navItems = [
    { icon: '', label: '',             path: '' },
    { icon: '🏠', label: 'Home',             path: '/client/dashboard' },
    { icon: '📄', label: 'Transcriptions',   path: '/client/transcriptions' },
    { icon: '🎥', label: 'Video Analysis',   path: '/client/video-analysis' },
    { icon: '📊', label: 'Reports',          path: '/client/reports' },
    { icon: '👤', label: 'Profile',          path: '/client/profile' },
  ];

  return (
    <nav style={{
      background: '#1a3a6b',
      padding: '0 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 64,
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>

      {/* Left side: Logo placeholder + nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* Logo placeholder — you'll add your logo here later */}
        <img
          src={logo}
          alt="IFBW Logo"
          style={{
            height: 40,        // ← adjust if too big or too small
            marginRight: 24,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/client/dashboard')}
        />

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