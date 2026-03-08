import TenantItem from '../Molecules/TenantItem';
import SystemCapacityPanel from '../Molecules/SystemCapacityPanel';

const tenants = [
  { name: 'Acme Corporation',  plan: 'Enterprise',   users: 145, resource: 87 },
  { name: 'TechStart Inc.',    plan: 'Professional', users: 82,  resource: 64 },
  { name: 'Global Services Ltd.', plan: 'Enterprise', users: 234, resource: 91 },
  { name: 'Innovate Solutions', plan: 'Professional', users: 45,  resource: 48 },
  { name: 'Digital Ventures',  plan: 'Starter',      users: 28,  resource: 32 },
];

export default function ActiveTenantsList() {
  return (
    <div style={{ display: 'flex', gap: 24, marginBottom: 28 }}>

      {/* LEFT: tenants list */}
      <div style={{
        flex: 2, background: 'white',
        borderRadius: 16, padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <h3 style={{ color: '#1a3a6b', marginBottom: 4, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚡ Active Tenants
        </h3>

        {tenants.map(t => <TenantItem key={t.name} {...t} />)}
      </div>

      {/* RIGHT: system capacity */}
      <div style={{ flex: 1 }}>
        <SystemCapacityPanel />
      </div>

    </div>
  );
}