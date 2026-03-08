import { useNavigate } from 'react-router-dom';

import NavItem from '../Atoms/NavItem';

export default function Sidebar({ active, onNavigate }: { active: string; onNavigate: (page: string) => void }) {
  const navigate = useNavigate();


  const items = [
    { icon: '⊞', label: ('dashboard'), path: '/dashboard' },
    { icon: '👤', label: ('users'),     path: '/users' },
    { icon: '⚡', label: ('analyses'),  path: '/analyses' },
    { icon: '📊', label: ('reports'),   path: '/reports' },
    { icon: '🖥',  label: ('system'),   path: '/system' },
    { icon: '⚙️', label: ('settings'),  path: '/settings' },
  ];

  return (
    <div style={{
      width: 220, minHeight: '100vh',
      background: '#0f2d6b',
      display: 'flex', flexDirection: 'column',
      padding: '20px 12px', gap: 4, flexShrink: 0,
    }}>
      <div style={{ height: 80, marginBottom: 16 }} />
      {items.map(item => (
        <NavItem
          key={item.label}
          icon={item.icon}
          label={item.label}
          active={active === item.label}
          onClick={() => { onNavigate(item.label); navigate(item.path); }}
        />
      ))}
      <div style={{ marginTop: 'auto', color: '#aac4e8', fontSize: 12, padding: '0 8px' }}>
        © 2026 IFBW Platform<br />Version 1.0.0
      </div>
    </div>
  );
}