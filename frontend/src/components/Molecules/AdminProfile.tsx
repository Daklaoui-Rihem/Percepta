import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, User, Monitor, LogOut } from 'lucide-react';
import { clearSession, getSession } from '../../services/api';
import { useTranslation } from '../../context/TranslationContext';

export default function AdminProfile() {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const session = getSession();
  const name = session?.name || 'Admin User';
  const initials = name.split(' ').map((p: string) => p[0]).join('').substring(0, 2).toUpperCase();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const SERVER_URL = API_URL.replace('/api', '');
  const photoUrl = session?.photoUrl ? (session.photoUrl.startsWith('http') ? session.photoUrl : `${SERVER_URL}/${session.photoUrl}`) : null;

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <div style={{ 
          width: 38, height: 38, borderRadius: '50%', 
          background: '#1a3a9f', color: 'white', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          fontSize: 15, fontWeight: 700,
          overflow: 'hidden', border: '1.5px solid #f0f9ff'
        }}>
          {photoUrl ? (
            <img src={photoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            initials
          )}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1a3a6b' }}>{name}</div>
          <div style={{ fontSize: 12, color: '#888' }}>
            {session?.role === 'SuperAdmin' ? t('adminRole') :
             session?.role === 'Admin' ? t('adminRole') :
             session?.role === 'Client' ? t('clientRole') : t('adminRole')}
          </div>
        </div>
        <ChevronDown
          size={16}
          style={{
            color: '#888',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </div>

      {open && (
        <div style={{ position: 'absolute', top: 50, right: 0, background: 'white', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', width: 200, zIndex: 100, overflow: 'hidden' }}>
          <div
            onClick={() => { setOpen(false); navigate('/admin/profile'); }}
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
            <Monitor size={16} /> {t('viewSystemLogs')}
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