import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlusCircle, Bell, Star } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';
import LanguageSwitcher from '../Atoms/LanguageSwitcher';

type Props = {
  onAddTenant: () => void;
}

export default function TenantManagementNavbar({ onAddTenant }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <nav style={{
      background: '#0f2d6b',
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 64,
      position: 'sticky',
      top: 0, zIndex: 50,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }}>

      {/* LEFT: back arrow + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

        {/* Back button */}
        <button
          onClick={() => navigate('/superadmin/dashboard')}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white', borderRadius: 8,
            padding: '8px 14px', cursor: 'pointer',
            fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <ArrowLeft size={16} /> {t('backToDashboard')}
        </button>

        {/* Vertical divider */}
        <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.2)' }} />

        {/* Title */}
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>
            {t('tenantManagement')}
          </div>
          <div style={{ color: '#93c5fd', fontSize: 12 }}>
            {t('manageTenants')}
          </div>
        </div>
      </div>

      {/* RIGHT: language + add tenant + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Language switcher */}
        <LanguageSwitcher />

        {/* Notifications */}
        <button style={{ ...btnStyle, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={18} />
        </button>

        {/* Add New Tenant */}
        <button
          onClick={onAddTenant}
          style={{
            ...btnStyle,
            background: '#1d4ed8',
            border: '1px solid #1d4ed8',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <PlusCircle size={16} /> {t('addNewTenant')}
        </button>

        {/* SuperAdmin badge */}
        <div style={{
          background: '#1d4ed8', color: 'white',
          padding: '6px 14px', borderRadius: 8,
          fontSize: 13, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <Star size={14} fill="white" /> SuperAdmin
        </div>
      </div>
    </nav>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.25)',
  color: 'white', borderRadius: 8,
  padding: '8px 16px', fontSize: 13,
  cursor: 'pointer',
};