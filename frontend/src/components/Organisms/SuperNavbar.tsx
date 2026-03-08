import { useNavigate } from 'react-router-dom';
import { clearSession, getSession } from '../../services/api';
import logo from '../../assets/Logo.png';

export default function SuperNavbar() {
  const navigate = useNavigate();
  const session = getSession();
  const name = session?.name || 'Admin User';
  const email = session?.email || 'superadmin@ifbw.com';

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <nav style={{
      background: '#0f2d6b', padding: '0 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 64, position: 'sticky', top: 0, zIndex: 50,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <img src={logo} alt="IFBW Logo" style={{ height: 40, cursor: 'pointer' }} onClick={() => navigate('/superadmin/dashboard')} />
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>IFBW Infrastructure</div>
          <div style={{ color: '#93c5fd', fontSize: 12 }}>SuperAdmin Dashboard</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={navBtnStyle}>🌐 EN English</button>
        <button style={navBtnStyle}>⚙️ Settings</button>
        <button
  onClick={() => navigate('/superadmin/tenants')}
  style={navBtnStyle}
>
  🏢 Tenant Management
</button>
        <button style={navBtnStyle}>📋 View System Logs</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          onClick={() => navigate('/superadmin/profile')}
          style={{ textAlign: 'right', cursor: 'pointer' }}
          title="My Profile"
        >
          <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{name}</div>
          <div style={{ color: '#93c5fd', fontSize: 12 }}>{email}</div>
        </div>

        <div style={{ background: '#3b82f6', color: 'white', padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
          SuperAdmin
        </div>

        <button
          onClick={handleLogout}
          style={{ background: 'transparent', border: '1px solid #93c5fd', color: '#93c5fd', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 16 }}
          title="Logout"
        >
          →
        </button>
      </div>
    </nav>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.2)',
  color: 'white', borderRadius: 8,
  padding: '8px 14px', fontSize: 13,
  cursor: 'pointer', fontWeight: 500,
};