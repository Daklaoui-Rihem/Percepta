import TenantItem from '../Molecules/TenantItem';
import SystemCapacityPanel from '../Molecules/SystemCapacityPanel';
import { useTranslation } from '../../context/TranslationContext';

interface Tenant {
  name: string;
  plan: string;
  users: number;
  resource: number;
}

interface ActiveTenantsListProps {
  tenants: Tenant[];
}

export default function ActiveTenantsList({ tenants }: ActiveTenantsListProps) {
  const { t } = useTranslation();

  return (
    <div style={{ display: 'flex', gap: 24, marginBottom: 28 }}>

      {/* LEFT: tenants list */}
      <div style={{
        flex: 2, background: 'white',
        borderRadius: 16, padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <h3 style={{ color: '#1a3a6b', marginBottom: 20, fontSize: 16, fontWeight: 700 }}>
          {t('activeTenantsList')}
        </h3>

        {tenants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
            Aucun locataire actif
          </div>
        ) : (
          tenants.map(tenant => <TenantItem key={tenant.name} {...tenant} />)
        )}
      </div>

      {/* RIGHT: system capacity */}
      <div style={{ flex: 1 }}>
        <SystemCapacityPanel />
      </div>

    </div>
  );
}