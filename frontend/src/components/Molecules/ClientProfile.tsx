import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ClientProfile() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear saved login info
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <div style={{ position: 'relative' }}>

      {/* The clickable profile button */}
      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
      >
        {/* Blue circle avatar */}
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: '#60a5fa',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: 'white', fontWeight: 700,
        }}>
          C
        </div>
        <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>Client User</span>
        <span style={{ color: 'white', fontSize: 12 }}>▾</span>
      </div>

      {/* Dropdown menu */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 50, right: 0,
          background: 'white',
          borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          width: 180,
          zIndex: 100,
          overflow: 'hidden',
        }}>
          {/* Mon Profil */}
          <div
            onClick={() => setOpen(false)}
            style={{ padding: '14px 20px', fontSize: 14, color: '#1a3a6b', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            Mon Profil
          </div>

          {/* Paramètres */}
          <div
            onClick={() => setOpen(false)}
            style={{ padding: '14px 20px', fontSize: 14, color: '#1a3a6b', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            Paramètres
          </div>

          {/* Déconnexion in red */}
          <div
            onClick={handleLogout}
            style={{ padding: '14px 20px', fontSize: 14, color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            Déconnexion
          </div>
        </div>
      )}
    </div>
  );
}