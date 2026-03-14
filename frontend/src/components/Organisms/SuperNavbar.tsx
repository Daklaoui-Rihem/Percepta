import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Building2,
  ClipboardList,
  LogOut,
  Bell
} from 'lucide-react';
import { clearSession, getSession } from '../../services/api';
import Logo from '../Atoms/Logo';
import LanguageSwitcher from '../Atoms/LanguageSwitcher';
import { useTranslation } from '../../context/TranslationContext';

export default function SuperNavbar() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const session = getSession();
  const name = session?.name || 'Admin User';
  const email = session?.email || 'superadmin@ifbw.com';

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <nav style={{
      background: 'linear-gradient(90deg, #00338e 0%, #314a9c 100%)',
      padding: '0 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 88, position: 'sticky', top: 0, zIndex: 50,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div onClick={() => navigate('/superadmin/dashboard')}>
          <Logo size="medium" light />
        </div>
        <div style={{ height: 24, width: 1, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
        <div>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 14, letterSpacing: '0.5px' }}>Infrastructure</div>
          <div style={{ color: '#c6eaff', fontSize: 11, fontWeight: 500 }}>SuperAdmin Console</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LanguageSwitcher />
        <button onClick={() => navigate('/settings')} style={{ ...navBtnStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings size={16} /> {t('settings')}
        </button>
        <button
          onClick={() => navigate('/superadmin/tenants')}
          style={{ ...navBtnStyle, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Building2 size={16} /> {t('tenantManagement')}
        </button>
        <button style={{ ...navBtnStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardList size={16} /> {t('viewSystemLogs')}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          onClick={() => navigate('/superadmin/profile')}
          style={{ textAlign: 'right', cursor: 'pointer' }}
          title={t('myProfileMenu')}
        >
          <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{name}</div>
          <div style={{ color: '#93c5fd', fontSize: 12 }}>{email}</div>
        </div>

        <button
          style={{
            background: 'transparent', border: 'none', color: '#93c5fd',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          title="Notifications"
        >
          <Bell size={20} />
        </button>

        <div style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: '1px solid rgba(255,255,255,0.2)' }}>
          SUPERADMIN
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: 'transparent', border: '1px solid #93c5fd', color: '#93c5fd',
            borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          title={t('logout')}
        >
          <LogOut size={18} />
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