import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { clearSession, getSession } from '../../services/api';
import { useTranslation } from '../../context/TranslationContext';

export default function ClientProfile() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const session = getSession();
  const name = session?.name || t('clientUser');
  const initials = name.split(' ').map((p: string) => p[0]).join('').substring(0, 2).toUpperCase();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: 'white', fontWeight: 700 }}>
          {initials}
        </div>
        <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{name}</span>
        <ChevronDown
          size={16}
          style={{
            color: 'white',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </div>

      {open && (
        <div style={{ position: 'absolute', top: 50, right: 0, background: 'white', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', width: 180, zIndex: 100, overflow: 'hidden' }}>
          <div
            onClick={() => { setOpen(false); navigate('/client/profile'); }}
            style={{ padding: '14px 20px', fontSize: 14, color: '#1a3a6b', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 10 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            <User size={16} /> {t('myProfileMenu')}
          </div>
          <div
            onClick={() => setOpen(false)}
            style={{ padding: '14px 20px', fontSize: 14, color: '#1a3a6b', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 10 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            <Settings size={16} /> {t('settings')}
          </div>
          <div
            onClick={handleLogout}
            style={{ padding: '14px 20px', fontSize: 14, color: '#dc2626', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            <LogOut size={16} /> {t('logout')}
          </div>
        </div>
      )}
    </div>
  );
}