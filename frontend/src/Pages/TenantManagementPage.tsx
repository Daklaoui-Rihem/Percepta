import { useState, useEffect } from 'react';
import {
  Building2,
  Zap,
  Pause,
  Users,
  Search,
  Pencil,
  Trash2,
  Play
} from 'lucide-react';

import TenantManagementNavbar from '../components/Organisms/TenantManagementNavbar';
import AddTenantModal, { type Tenant } from '../components/Organisms/AddTenantModal';
import PlanBadge from '../components/Atoms/PlanBadge';
import ResourceBar from '../components/Atoms/ResourceBar';

import { userApi } from '../services/api';

export default function TenantManagementPage() {

  // ─── State ───────────────────────────────────────────────────────
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLicense, setFilterLicense] = useState('All Licenses');
  const [filterStatus, setFilterStatus] = useState('All Status');

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  // ─── Computed stats (update live when tenants change) ────────────
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.status === 'Active').length;
  const suspendedCount = tenants.filter(t => t.status === 'Suspended').length;
  const totalUsers = tenants.reduce((sum, t) => sum + t.users, 0);

  // ─── Actions ─────────────────────────────────────────────────────

  // Generate a mock resource visually if needed, but here we can just map and keep standard
  const fetchTenants = async () => {
    setLoading(true);
    try {
      const users = await userApi.getAllUsers();
      // Only "Admins" returned from getAllUsers (for SuperAdmin) act as Tenants
      const mapped: Tenant[] = users.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        license: (['Professional', 'Enterprise', 'Starter'].includes(u.department) ? u.department : 'Professional') as Tenant['license'],
        status: u.isActive ? 'Active' : 'Suspended',
        users: 10, // Mocked for UI, as user counts would require a separate aggregator
        resource: 40,
        expiry: '2027-01-01'
      }));
      setTenants(mapped);
    } catch (err) {
      console.error('Failed to load tenants', err);
      alert('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  // Add a brand new tenant
  const handleAddTenant = async (data: Omit<Tenant, 'id' | 'resource'> & { password?: string }) => {
    try {
      await userApi.createUser({
        name: data.name,
        email: data.email,
        password: data.password || 'Temporary123!',
        role: 'Admin', // SuperAdmin creating a Tenant means creating an 'Admin'
        department: data.license // Saving license choice in department field
      });
      fetchTenants();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create tenant');
    }
  };

  // Save edits to existing tenant
  const handleEditTenant = async (data: Omit<Tenant, 'id' | 'resource'>) => {
    if (!editingTenant) return;
    try {
      await userApi.updateUser(editingTenant.id.toString(), {
        name: data.name,
        email: data.email,
        department: data.license,
        isActive: data.status === 'Active'
      });
      setEditingTenant(null);
      fetchTenants();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to edit tenant');
    }
  };

  // Toggle suspend/active
  const handleToggleSuspend = async (tenant: Tenant) => {
    try {
      const newStatus = tenant.status === 'Active' ? false : true;
      await userApi.updateUser(tenant.id.toString(), { isActive: newStatus });
      fetchTenants();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to toggle status');
    }
  };

  // Delete tenant
  const handleDelete = async (id: string | number) => {
    try {
      await userApi.deleteUser(id.toString());
      setDeletingId(null);
      fetchTenants();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete tenant');
    }
  };

  // ─── Filtered list ────────────────────────────────────────────────
  const filtered = tenants.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase());
    const matchLicense = filterLicense === 'All Licenses' || t.license === filterLicense;
    const matchStatus = filterStatus === 'All Status' || t.status === filterStatus;
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
            { label: 'Total Tenants', value: totalTenants, icon: Building2, color: '#3b82f6' },
            { label: 'Active Tenants', value: activeTenants, icon: Zap, color: '#0d9488' },
            { label: 'Suspended', value: suspendedCount, icon: Pause, color: '#f97316' },
            { label: 'Total Users', value: totalUsers, icon: Users, color: '#6366f1' },
          ].map(card => (
            <div key={card.label} style={{
              background: 'white', borderRadius: 20, padding: '24px',
              flex: 1, boxShadow: '0 8px 30px rgba(26, 63, 95, 0.08)',
              border: '1px solid rgba(198, 234, 255, 0.5)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: card.color }} />
              <div>
                <div style={{ color: '#4a7090', fontSize: 13, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#1a3f5f', letterSpacing: '-1px' }}>{card.value}</div>
              </div>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: `${card.color}15`, fontSize: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <card.icon size={28} color={card.color} strokeWidth={2.5} />
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
              <Search size={18} color="#aaa" />
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
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#888' }}>
              Loading tenants...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#888' }}>
              No tenants found matching your filters.
            </div>
          ) : (
            filtered.map(tenant => (
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
                    <Pencil size={14} />
                  </button>

                  <button
                    onClick={() => handleToggleSuspend(tenant)}
                    title={tenant.status === 'Active' ? 'Suspend tenant' : 'Resume tenant'}
                    style={actionBtnStyle(
                      tenant.status === 'Active' ? '#fff7ed' : '#dcfce7',
                      tenant.status === 'Active' ? '#c2410c' : '#16a34a'
                    )}
                  >
                    {tenant.status === 'Active' ? <Pause size={14} /> : <Play size={14} />}
                  </button>

                  <button
                    onClick={() => setDeletingId(tenant.id)}
                    title="Delete tenant"
                    style={actionBtnStyle('#fee2e2', '#dc2626')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
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
            <div style={{ color: '#dc2626', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
              <Trash2 size={48} strokeWidth={1.5} />
            </div>
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
    </div >
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