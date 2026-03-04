import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminProfile() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div style={{ position: 'relative' }}>
      
      {/* Profile button */}
      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: '#1a3a9f', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>A</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1a3a6b' }}>Admin User</div>
          <div style={{ fontSize: 12, color: '#888' }}>Administrator</div>
        </div>
        <span style={{ color: '#888', marginLeft: 4 }}>▾</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 50,
          right: 0,
          background: 'white',
          borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          width: 200,
          zIndex: 100,
          overflow: 'hidden',
        }}>
          {[
            { label: 'Profile Settings', color: '#1a3a6b' },
            { label: 'System Logs',      color: '#1a3a6b' },
          ].map(item => (
            <div key={item.label} style={{
              padding: '14px 20px',
              fontSize: 14,
              color: item.color,
              cursor: 'pointer',
              borderBottom: '1px solid #f0f0f0',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
            >
              {item.label}
            </div>
          ))}

          {/* Logout in red */}
          <div
            onClick={() => navigate('/login')}
            style={{
              padding: '14px 20px',
              fontSize: 14,
              color: '#dc2626',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            Logout
          </div>
        </div>
      )}
    </div>
  );
}