import { Bell } from 'lucide-react';
import AdminProfile from '../Molecules/AdminProfile';
import LanguageSwitcher from '../Atoms/LanguageSwitcher';


export default function TopBar() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 28px',
      background: 'white',
      borderBottom: '1px solid #eee',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Notifications */}
        <button
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b'
          }}
          title="Notifications"
        >
          <Bell size={20} />
        </button>

        <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />

        <AdminProfile />
      </div>
    </div>
  );
}