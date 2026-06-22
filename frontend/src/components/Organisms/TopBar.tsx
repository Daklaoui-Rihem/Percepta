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

        <AdminProfile />
      </div>
    </div>
  );
}