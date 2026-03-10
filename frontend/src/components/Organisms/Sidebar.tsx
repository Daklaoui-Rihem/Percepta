import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Zap, BarChart3, Monitor, Settings } from 'lucide-react';

import NavItem from '../Atoms/NavItem';
import Logo from '../Atoms/Logo';

export default function Sidebar({ active, onNavigate }: { active: string; onNavigate: (page: string) => void }) {
  const navigate = useNavigate();


  const items = [
    { icon: LayoutDashboard, label: ('dashboard'), path: '/dashboard' },
    { icon: Users, label: ('users'), path: '/users' },
    { icon: Zap, label: ('analyses'), path: '/analyses' },
    { icon: BarChart3, label: ('reports'), path: '/reports' },
    { icon: Monitor, label: ('system'), path: '/system' },
    { icon: Settings, label: ('settings'), path: '/settings' },
  ];

  return (
    <div style={{
      width: 240, minHeight: '100vh',
      background: 'linear-gradient(180deg, #1a3f5f 0%, #00338e 100%)',
      display: 'flex', flexDirection: 'column',
      padding: '24px 16px', gap: 4, flexShrink: 0,
      boxShadow: '4px 0 15px rgba(0,0,0,0.1)',
      zIndex: 10
    }}>
      <div style={{ marginBottom: 40, padding: '0 8px' }}>
        <Logo size="small" light />
      </div>
      {items.map(item => (
        <NavItem
          key={item.label}
          icon={item.icon}
          label={item.label}
          active={active === item.label}
          onClick={() => { onNavigate(item.label); navigate(item.path); }}
        />
      ))}
      <div style={{ marginTop: 'auto', color: '#c6eaff', fontSize: 11, padding: '0 8px', opacity: 0.7, fontWeight: 500 }}>
        © 2026 IFBW Platform<br />Infrastructure v1.2
      </div>
    </div>
  );
}