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
import { useTranslation } from '../context/TranslationContext';

export default function TenantManagementPage() {
  const { t } = useTranslation();

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showBulkStatus, setShowBulkStatus] = useState<{ show: boolean, active: boolean }>({ show: false, active: true });

  // ─── Computed stats (update live when tenants change) ────────────
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.status === 'Active').length;
  const suspendedCount = tenants.filter(t => t.status === 'Suspended').length;
  const totalUsers = tenants.reduce((sum, t) => sum + t.users, 0);

  // ─── Actions ─────────────────────────────────────────────────────
  const fetchTenants = async () => {
    setLoading(true);
    try {
      const users = await userApi.getAllUsers();
      const mapped: Tenant[] = users.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        license: (['Professional', 'Enterprise', 'Starter'].includes(u.department) ? u.department : 'Professional') as Tenant['license'],
        status: u.isActive ? 'Active' : 'Suspended',
        users: 10,
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

  const handleAddTenant = async (data: Omit<Tenant, 'id' | 'resource'> & { password?: string }) => {
    try {
      await userApi.createUser({
        name: data.name,
        email: data.email,
        password: data.password || 'Temporary123!',
        role: 'Admin',
        department: data.license
      });
      fetchTenants();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create tenant');
    }
  };

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

  const handleToggleSuspend = async (tenant: Tenant) => {
    try {
      const newStatus = tenant.status === 'Active' ? false : true;
      await userApi.updateUser(tenant.id.toString(), { isActive: newStatus });
      fetchTenants();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to toggle status');
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await userApi.deleteUser(id.toString());
      setDeletingId(null);
      fetchTenants();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete tenant');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await userApi.bulkDeleteUsers(Array.from(selectedIds));
      setSelectedIds(new Set());
      setShowBulkDelete(false);
      fetchTenants();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete tenants');
    }
  };

  const handleBulkStatusUpdate = async (active: boolean) => {
    try {
      await userApi.bulkUpdateUsers(Array.from(selectedIds), { isActive: active });
      setSelectedIds(new Set());
      setShowBulkStatus({ show: false, active: true });
      fetchTenants();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update tenants');
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = (filteredIds: string[]) => {
    if (filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id))) {
      const next = new Set(selectedIds);
      filteredIds.forEach(id => next.delete(id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filteredIds.forEach(id => next.add(id));
      setSelectedIds(next);
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
            { label: t('totalTenants'), value: totalTenants, icon: Building2, color: '#3b82f6' },
            { label: t('activeTenants'), value: activeTenants, icon: Zap, color: '#0d9488' },
            { label: t('suspended'), value: suspendedCount, icon: Pause, color: '#f97316' },
            { label: t('totalUsers'), value: totalUsers, icon: Users, color: '#6366f1' },
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
          <h4 style={{ color: '#1a3a6b', margin: '0 0 16px', fontSize: 15 }}>{t('searchFilters')}</h4>
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
                placeholder={t('searchTenants')}
                style={{ border: 'none', outline: 'none', fontSize: 14, background: 'transparent', width: '100%' }}
              />
            </div>

            <select
              value={filterLicense}
              onChange={e => setFilterLicense(e.target.value)}
              style={selectStyle}
            >
              <option value="All Licenses">{t('allLicenses')}</option>
              <option value="Enterprise">{t('enterprise')}</option>
              <option value="Professional">{t('professional')}</option>
              <option value="Starter">{t('starter')}</option>
            </select>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={selectStyle}
            >
              <option value="All Status">{t('allStatus')}</option>
              <option value="Active">{t('active')}</option>
              <option value="Suspended">{t('suspended')}</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div style={{ background: '#1e3a8a', color: 'white', padding: '12px 24px', borderRadius: 12, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(30,58,138,0.2)' }}>
            <span style={{ fontWeight: 600 }}>{t('tenantsSelected', { count: selectedIds.size })}</span>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowBulkStatus({ show: true, active: true })}
                style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Play size={16} /> {t('activate')}
              </button>
              <button
                onClick={() => setShowBulkStatus({ show: true, active: false })}
                style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Pause size={16} /> {t('suspend')}
              </button>
              <button
                onClick={() => setShowBulkDelete(true)}
                style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Trash2 size={16} /> {t('deleteSelected') || 'Delete Selected'}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '8px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}

        {/* ── Tenants Table ── */}
        <div style={{
          background: 'white', borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ color: '#1a3a6b', margin: 0, fontSize: 16, fontWeight: 700 }}>{t('allTenants')}</h3>
            <span style={{ color: '#888', fontSize: 13 }}>
              {t('showing')} {filtered.length} {t('of')} {tenants.length} {t('tenants')}
            </span>
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 2fr 1.2fr 1.2fr 0.8fr 1.5fr 1.2fr 1fr', padding: '12px 24px', background: '#f8fbff', borderBottom: '1px solid #f0f4f8' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={filtered.length > 0 && filtered.every(t => selectedIds.has(t.id.toString()))}
                onChange={() => toggleSelectAll(filtered.map(t => t.id.toString()))}
                style={{ cursor: 'pointer', width: 16, height: 16 }}
              />
            </div>
            {[t('tenantName'), t('email'), t('license'), t('status'), t('users'), t('resourceUsage'), t('expiryDate'), t('action')].map(h => (
              <span key={h} style={{ fontSize: 13, fontWeight: 700, color: '#1a3a6b' }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#888' }}>
              {t('loadingTenants')}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#888' }}>
              {t('noTenantsFound')}
            </div>
          ) : (
            filtered.map(tenant => (
              <div key={tenant.id} style={{
                display: 'grid',
                gridTemplateColumns: '40px 2fr 2fr 1.2fr 1.2fr 0.8fr 1.5fr 1.2fr 1fr',
                padding: '16px 24px',
                borderBottom: '1px solid #f8f8f8',
                alignItems: 'center',
                background: selectedIds.has(tenant.id.toString()) ? '#eff6ff' : 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(tenant.id.toString())}
                    onChange={() => toggleSelect(tenant.id.toString())}
                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                  />
                </div>
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
                    {tenant.status === 'Active' ? `● ${t('active')}` : `⏸ ${t('suspended')}`}
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
                  <button
                    onClick={() => setEditingTenant(tenant)}
                    title={t('edit')}
                    style={actionBtnStyle('#dbeafe', '#1d4ed8')}
                  >
                    <Pencil size={14} />
                  </button>

                  <button
                    onClick={() => handleToggleSuspend(tenant)}
                    title={tenant.status === 'Active' ? t('suspended') : t('active')}
                    style={actionBtnStyle(
                      tenant.status === 'Active' ? '#fff7ed' : '#dcfce7',
                      tenant.status === 'Active' ? '#c2410c' : '#16a34a'
                    )}
                  >
                    {tenant.status === 'Active' ? <Pause size={14} /> : <Play size={14} />}
                  </button>

                  <button
                    onClick={() => setDeletingId(tenant.id)}
                    title={t('delete')}
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

      {/* ── Edit Tenant Modal ── */}
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
            <h3 style={{ color: '#1a3a6b', marginBottom: 8 }}>{t('deleteTenant')}</h3>
            <p style={{ color: '#888', marginBottom: 28, fontSize: 14 }}>
              {t('deleteTenantDesc')}
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
                {t('cancel')}
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
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Delete Confirmation ── */}
      {showBulkDelete && (
        <div onClick={() => setShowBulkDelete(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: '36px 32px', width: 420, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ color: '#dc2626', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
              <Trash2 size={48} strokeWidth={1.5} />
            </div>
            <h3 style={{ color: '#1a3a6b', marginBottom: 8 }}>{t('deleteSelected')}</h3>
            <p style={{ color: '#888', fontSize: 14, marginBottom: 28 }}>
              {t('deleteBulkConfirm') || 'Are you sure you want to delete'} <strong>{selectedIds.size} {t('usersSelected')}</strong>? {t('deleteCannotUndo')}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowBulkDelete(false)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1.5px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 14, color: '#555' }}>{t('cancel')}</button>
              <button onClick={handleBulkDelete} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Status Update Confirmation ── */}
      {showBulkStatus.show && (
        <div onClick={() => setShowBulkStatus({ show: false, active: true })} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: '36px 32px', width: 420, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ color: showBulkStatus.active ? '#10b981' : '#f59e0b', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
              {showBulkStatus.active ? <Play size={48} strokeWidth={1.5} /> : <Pause size={48} strokeWidth={1.5} />}
            </div>
            <h3 style={{ color: '#1a3a6b', marginBottom: 8 }}>{showBulkStatus.active ? t('activateSelected') || 'Activate Selected' : t('suspendSelected') || 'Suspend Selected'}</h3>
            <p style={{ color: '#888', fontSize: 14, marginBottom: 28 }}>
              {showBulkStatus.active ? t('activateBulkConfirm') || 'Are you sure you want to activate' : t('suspendBulkConfirm') || 'Are you sure you want to suspend'} <strong>{selectedIds.size} {t('usersSelected')}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowBulkStatus({ show: false, active: true })} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1.5px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 14, color: '#555' }}>{t('cancel')}</button>
              <button
                onClick={() => handleBulkStatusUpdate(showBulkStatus.active)}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: showBulkStatus.active ? '#10b981' : '#f59e0b', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
              >
                {t('confirm') || 'Confirm'}
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