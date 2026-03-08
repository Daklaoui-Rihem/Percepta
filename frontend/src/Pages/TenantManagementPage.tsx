import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TenantManagementNavbar from '../components/Organisms/TenantManagementNavbar';
import AddTenantModal, { type Tenant } from '../components/Organisms/AddTenantModal';
import PlanBadge from '../components/Atoms/PlanBadge';
import ResourceBar from '../components/Atoms/ResourceBar';

// ─── Initial demo data ───────────────────────────────────────────
const initialTenants: Tenant[] = [
  { id: 1, name: 'Acme Corporation',    email: 'admin@acme.com',          license: 'Enterprise',   status: 'Suspended', users: 245, resource: 67, expiry: '2027-01-15' },
  { id: 2, name: 'TechStart Inc.',      email: 'contact@techstart.com',   license: 'Professional', status: 'Active',    users: 89,  resource: 45, expiry: '2026-03-20' },
  { id: 3, name: 'Global Services Ltd.',email: 'info@globalservices.com', license: 'Enterprise',   status: 'Active',    users: 512, resource: 89, expiry: '2026-11-10' },
  { id: 4, name: 'Innovate Solutions',  email: 'hello@innovate.com',      license: 'Professional', status: 'Active',    users: 45,  resource: 48, expiry: '2026-08-01' },
  { id: 5, name: 'Digital Ventures',   email: 'admin@digitalv.com',      license: 'Starter',      status: 'Active',    users: 28,  resource: 32, expiry: '2026-06-15' },
];

export default function TenantManagementPage() {
  const navigate = useNavigate();

  // ─── State ───────────────────────────────────────────────────────
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [search,  setSearch]  = useState('');
  const [filterLicense, setFilterLicense] = useState('All Licenses');
  const [filterStatus,  setFilterStatus]  = useState('All Status');

  // Modal state
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deletingId,    setDeletingId]    = useState<number | null>(null);

  // ─── Computed stats (update live when tenants change) ────────────
  const totalTenants    = tenants.length;
  const activeTenants   = tenants.filter(t => t.status === 'Active').length;
  const suspendedCount  = tenants.filter(t => t.status === 'Suspended').length;
  const totalUsers      = tenants.reduce((sum, t) => sum + t.users, 0);

  // ─── Actions ─────────────────────────────────────────────────────

  // Add a brand new tenant
  const handleAddTenant = (data: Omit<Tenant, 'id' | 'status' | 'resource'>) => {
    const newTenant: Tenant = {
      ...data,
      id: Date.now(), // temporary unique id
      status: 'Active',
      resource: Math.floor(Math.random() * 40 + 20), // random resource for demo
    };
    setTenants(prev => [newTenant, ...prev]);
  };

  // Save edits to existing tenant
  const handleEditTenant = (data: Omit<Tenant, 'id' | 'status' | 'resource'>) => {
    setTenants(prev => prev.map(t =>
      t.id === editingTenant?.id ? { ...t, ...data } : t
    ));
    setEditingTenant(null);
  };

  // Toggle suspend/active
  const handleToggleSuspend = (id: number) => {
    setTenants(prev => prev.map(t =>
      t.id === id
        ? { ...t, status: t.status === 'Active' ? 'Suspended' : 'Active' }
        : t
    ));
  };

  // Delete tenant
  const handleDelete = (id: number) => {
    setTenants(prev => prev.filter(t => t.id !== id));
    setDeletingId(null);
  };

  // ─── Filtered list ────────────────────────────────────────────────
  const filtered = tenants.filter(t => {
    const matchSearch  = t.name.toLowerCase().includes(search.toLowerCase()) ||
                         t.email.toLowerCase().includes(search.toLowerCase());
    const matchLicense = filterLicense === 'All Licenses' || t.license === filterLicense;
    const matchStatus  = filterStatus  === 'All Status'   || t.status  === filterStatus;
    return matchSearch && matchLicense && matchStatus;
  });

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>

      {/* Custom navbar for this page */}
      <TenantManagementNavbar onAddTenant={() => setShowAddModal(true)} />

      <div style={{ padding: '28px 32px' }}>

        {/* ── 4 Stat Cards ── */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 28 }}>
          {[
            { label: 'Total Tenants',   value: totalTenants,  icon: '🏢', color: '#3b82f6' },
            { label: 'Active Tenants',  value: activeTenants, icon: '⚡', color: '#0d9488' },
            { label: 'Suspended',       value: suspendedCount,icon: '⏸️', color: '#f97316' },
            { label: 'Total Users',     value: totalUsers,    icon: '👥', color: '#6366f1' },
          ].map(card => (
            <div key={card.label} style={{
              background: 'white', borderRadius: 16, padding: '20px 24px',
              flex: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>{card.label}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#1a3a6b' }}>{card.value}</div>
              </div>
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: '#eff6ff', fontSize: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {card.icon}
              </div>
            </div>
          ))}
        </div>

        {/* ── Search & Filters ── */}
        <div style={{
          background: 'white', borderRadius: 16,
          padding: '20px 24px', marginBottom: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <h4 style={{ color: '#1a3a6b', margin: '0 0 16px', fontSize: 15 }}>Search & Filters</h4>
          <div style={{ display: 'flex', gap: 16 }}>

            {/* Search input */}
            <div style={{
              flex: 2, display: 'flex', alignItems: 'center',
              border: '1.5px solid #e0eaf4', borderRadius: 8,
              padding: '10px 14px', gap: 8, background: '#f8fbff',
            }}>
              <span style={{ color: '#aaa' }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tenants..."
                style={{ border: 'none', outline: 'none', fontSize: 14, background: 'transparent', width: '100%' }}
              />
            </div>

            {/* License filter */}
            <select
              value={filterLicense}
              onChange={e => setFilterLicense(e.target.value)}
              style={selectStyle}
            >
              <option>All Licenses</option>
              <option>Enterprise</option>
              <option>Professional</option>
              <option>Starter</option>
            </select>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={selectStyle}
            >
              <option>All Status</option>
              <option>Active</option>
              <option>Suspended</option>
            </select>
          </div>
        </div>

        {/* ── Tenants Table ── */}
        <div style={{
          background: 'white', borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ color: '#1a3a6b', margin: 0, fontSize: 16, fontWeight: 700 }}>All Tenants</h3>
            <span style={{ color: '#888', fontSize: 13 }}>
              Showing {filtered.length} of {tenants.length} tenants
            </span>
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.2fr 1.2fr 0.8fr 1.5fr 1.2fr 1fr', padding: '12px 24px', background: '#f8fbff', borderBottom: '1px solid #f0f4f8' }}>
            {['Tenant Name', 'Email', 'License', 'Status', 'Users', 'Resource Usage', 'Expiry Date', 'Action'].map(h => (
              <span key={h} style={{ fontSize: 13, fontWeight: 700, color: '#1a3a6b' }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {filtered.map(tenant => (
            <div key={tenant.id} style={{
              display: 'grid',
              gridTemplateColumns: '2fr 2fr 1.2fr 1.2fr 0.8fr 1.5fr 1.2fr 1fr',
              padding: '16px 24px',
              borderBottom: '1px solid #f8f8f8',
              alignItems: 'center',
            }}>
              {/* Name */}
              <span style={{ fontWeight: 600, color: '#1a3a6b', fontSize: 14 }}>{tenant.name}</span>

              {/* Email */}
              <span style={{ color: '#555', fontSize: 13 }}>{tenant.email}</span>

              {/* License badge */}
              <span><PlanBadge plan={tenant.license} /></span>

              {/* Status badge */}
              <span>
                <span style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: tenant.status === 'Active' ? '#dcfce7' : '#fff7ed',
                  color: tenant.status === 'Active' ? '#16a34a' : '#c2410c',
                  border: `1px solid ${tenant.status === 'Active' ? '#bbf7d0' : '#fed7aa'}`,
                }}>
                  {tenant.status === 'Active' ? '● Active' : '⏸ Suspended'}
                </span>
              </span>

              {/* Users */}
              <span style={{ color: '#555', fontSize: 14 }}>{tenant.users}</span>

              {/* Resource bar + % */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ResourceBar percent={tenant.resource} />
                <span style={{ color: '#555', fontSize: 13 }}>{tenant.resource}%</span>
              </div>

              {/* Expiry */}
              <span style={{ color: '#555', fontSize: 13 }}>{tenant.expiry}</span>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>

                {/* Edit button */}
                <button
                  onClick={() => setEditingTenant(tenant)}
                  title="Edit tenant"
                  style={actionBtnStyle('#dbeafe', '#1d4ed8')}
                >
                  ✏️
                </button>

                {/* Suspend / Resume button */}
                <button
                  onClick={() => handleToggleSuspend(tenant.id)}
                  title={tenant.status === 'Active' ? 'Suspend tenant' : 'Resume tenant'}
                  style={actionBtnStyle(
                    tenant.status === 'Active' ? '#fff7ed' : '#dcfce7',
                    tenant.status === 'Active' ? '#c2410c' : '#16a34a'
                  )}
                >
                  {tenant.status === 'Active' ? '⏸' : '▶'}
                </button>

                {/* Delete button */}
                <button
                  onClick={() => setDeletingId(tenant.id)}
                  title="Delete tenant"
                  style={actionBtnStyle('#fee2e2', '#dc2626')}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: '#888' }}>
              No tenants found matching your filters.
            </div>
          )}
        </div>
      </div>

      {/* ── Add Tenant Modal ── */}
      {showAddModal && (
        <AddTenantModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddTenant}
        />
      )}

      {/* ── Edit Tenant Modal — same component, pre-filled ── */}
      {editingTenant && (
        <AddTenantModal
          onClose={() => setEditingTenant(null)}
          onSubmit={handleEditTenant}
          existingTenant={editingTenant}
        />
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deletingId !== null && (
        <div
          onClick={() => setDeletingId(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 200,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 16,
              padding: '36px 32px', width: 400,
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
            <h3 style={{ color: '#1a3a6b', marginBottom: 8 }}>Delete Tenant?</h3>
            <p style={{ color: '#888', marginBottom: 28, fontSize: 14 }}>
              This action cannot be undone. The tenant and all their data will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setDeletingId(null)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  border: '1.5px solid #ddd', background: 'white',
                  cursor: 'pointer', fontSize: 14, fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  border: 'none', background: '#dc2626',
                  color: 'white', cursor: 'pointer',
                  fontSize: 14, fontWeight: 700,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper: style for the action icon buttons
const actionBtnStyle = (bg: string, color: string): React.CSSProperties => ({
  width: 32, height: 32, borderRadius: 8,
  background: bg, border: 'none',
  cursor: 'pointer', fontSize: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color,
});

const selectStyle: React.CSSProperties = {
  flex: 1, padding: '10px 14px',
  border: '1.5px solid #e0eaf4', borderRadius: 8,
  fontSize: 14, color: '#444', cursor: 'pointer',
  background: '#f8fbff', outline: 'none',
};