import { useState, useEffect } from 'react';
import DashboardTemplate from '../components/Templates/DashboardTemplate';
import { userApi, getSession } from '../services/api';
import type { UserProfile } from '../services/api';

// ── New/Edit User Modal ─────────────────────────────────────────
interface ModalProps {
  mode: 'create' | 'edit';
  user?: UserProfile | null;
  currentUserRole: string;
  onClose: () => void;
  onSuccess: () => void;
}

function UserModal({ mode, user, currentUserRole, onClose, onSuccess }: ModalProps) {
  const targetRole = currentUserRole === 'SuperAdmin' ? 'Admin' : 'Client';

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState(user?.department || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [adminLevel, setAdminLevel] = useState(user?.adminLevel || 'Administrator');
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email || (mode === 'create' && !password)) {
      setError('Name, email and password are required'); return;
    }
    setSaving(true);
    setError('');
    try {
      if (mode === 'create') {
        await userApi.createUser({ name, email, password, role: targetRole, department, phone, adminLevel });
      } else if (user) {
        await userApi.updateUser(user._id, { name, email, department, phone, adminLevel, isActive });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 16, padding: '36px 32px', width: 560, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h3 style={{ color: '#1a3a6b', margin: 0, fontSize: 22, fontWeight: 700 }}>
            {mode === 'create' ? `Create New ${targetRole}` : `Edit ${targetRole}`}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Full Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Full name" />
        </div>

        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="email@example.com" />
        </div>

        {/* Password (create only) */}
        {mode === 'create' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Temporary Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} placeholder="Min 6 characters" />
          </div>
        )}

        {/* Department + Phone */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Department</label>
            <input value={department} onChange={e => setDepartment(e.target.value)} style={inputStyle} placeholder="e.g. IT" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} placeholder="+33 6 00 00 00 00" />
          </div>
        </div>

        {/* Admin Level (only for Admin creation by SuperAdmin) */}
        {targetRole === 'Admin' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Admin Level</label>
            <select value={adminLevel} onChange={e => setAdminLevel(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="Administrator">Administrator</option>
              <option value="Senior Administrator">Senior Administrator</option>
              <option value="Manager">Manager</option>
            </select>
          </div>
        )}

        {/* Active toggle (edit only) */}
        {mode === 'edit' && (
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Account Status</label>
            <button
              onClick={() => setIsActive(!isActive)}
              style={{
                padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: isActive ? '#dcfce7' : '#fee2e2',
                color: isActive ? '#16a34a' : '#dc2626',
              }}
            >
              {isActive ? '✅ Active' : '🚫 Suspended'}
            </button>
          </div>
        )}

        {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '13px', borderRadius: 8, border: '1.5px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#555' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{ flex: 1, padding: '13px', borderRadius: 8, border: 'none', background: saving ? '#93c5fd' : '#1a3a6b', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700 }}
          >
            {saving ? 'Saving...' : mode === 'create' ? 'Create User' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ────────────────────────────────────────
function DeleteModal({ user, onClose, onConfirm }: { user: UserProfile; onClose: () => void; onConfirm: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: '36px 32px', width: 380, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
        <h3 style={{ color: '#1a3a6b', marginBottom: 8 }}>Delete User</h3>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 28 }}>
          Are you sure you want to delete <strong>{user.name}</strong>? This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1.5px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 14, color: '#555' }}>Cancel</button>
          <button onClick={handleConfirm} disabled={deleting} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', cursor: deleting ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700 }}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────
export default function UsersPage() {
  const [activePage, setActivePage] = useState('Users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All Status');

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserProfile | null>(null);

  const session = getSession();
  const currentRole = session?.role || 'Admin';
  const targetRoleLabel = currentRole === 'SuperAdmin' ? 'Admin' : 'Client';

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await userApi.getAllUsers();
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      await userApi.deleteUser(deleteUser._id);
      setDeleteUser(null);
      fetchUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // Filter
  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All Status' ||
      (filterStatus === 'Active' && u.isActive) ||
      (filterStatus === 'Suspended' && !u.isActive);
    return matchSearch && matchStatus;
  });

  const activeCount = users.filter(u => u.isActive).length;
  const suspendedCount = users.filter(u => !u.isActive).length;

  return (
    <DashboardTemplate active={activePage} onNavigate={setActivePage}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h2 style={{ color: '#1a3a6b', margin: 0, fontSize: 24, fontWeight: 700 }}>
          {targetRoleLabel} Management
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          style={{ background: '#1a3a6b', color: 'white', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          + New {targetRoleLabel}
        </button>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'inline-flex', gap: 20, marginBottom: 28 }}>
        {[
          { icon: '👥', value: String(users.length), label: `Total ${targetRoleLabel}s`, border: '#60a5fa' },
          { icon: '✅', value: String(activeCount), label: 'Active', border: '#22c55e' },
        
        ].map(card => (
          <div key={card.label} style={{ background: 'white', borderRadius: 12, padding: '20px 24px', flex: 1, borderLeft: `4px solid ${card.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{card.icon}</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#1a3a6b' }}>{card.value}</div>
              <div style={{ fontSize: 13, color: '#888' }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 12 }}>
        <div style={{ flex: 2, display: 'flex', alignItems: 'center', border: '1.5px solid #d0e4f0', borderRadius: 8, padding: '10px 14px', gap: 8 }}>
          <span style={{ color: '#aaa' }}>🔍</span>
          <input
            placeholder={`Search ${targetRoleLabel.toLowerCase()}s by name or email...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: 14, width: '100%' }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #d0e4f0', borderRadius: 8, fontSize: 14, color: '#444', cursor: 'pointer' }}
        >
          <option>All Status</option>
          <option>Active</option>
       
        </select>
        <button
          onClick={fetchUsers}
          style={{ padding: '10px 18px', background: '#eff6ff', border: '1.5px solid #d0e4f0', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#1a3a6b', fontWeight: 600 }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading {targetRoleLabel.toLowerCase()}s...</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>{error}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#dbeafe' }}>
                {['Name', 'Email', 'Status', ...(targetRoleLabel === 'Admin' ? ['Level'] : []), 'Phone', 'Created', 'Actions'].map(col => (
                  <th key={col} style={{ padding: '14px 18px', textAlign: 'left', color: '#1a3a6b', fontSize: 14, fontWeight: 700 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#888' }}>
                    No {targetRoleLabel.toLowerCase()}s found
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u._id} style={{ borderBottom: '1px solid #f0f4f8' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8fbff')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                >
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#60a5fa', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                        {u.name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600, color: '#1a3a6b', fontSize: 14 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', color: '#555', fontSize: 14 }}>{u.email}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{
                      background: u.isActive ? '#dcfce7' : '#fee2e2',
                      color: u.isActive ? '#16a34a' : '#dc2626',
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    }}>
                      {u.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  {targetRoleLabel === 'Admin' && (
                    <td style={{ padding: '14px 18px', color: '#555', fontSize: 13 }}>{u.adminLevel || '—'}</td>
                  )}
                  <td style={{ padding: '14px 18px', color: '#555', fontSize: 13 }}>{u.phone || '—'}</td>
                  <td style={{ padding: '14px 18px', color: '#888', fontSize: 13 }}>
                    {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setEditUser(u)}
                        style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d0e4f0', background: 'white', cursor: 'pointer', fontSize: 13, color: '#1a3a6b', fontWeight: 600 }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => setDeleteUser(u)}
                        style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#fee2e2', cursor: 'pointer', fontSize: 13, color: '#dc2626', fontWeight: 600 }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <UserModal
          mode="create"
          currentUserRole={currentRole}
          onClose={() => setShowCreate(false)}
          onSuccess={fetchUsers}
        />
      )}
      {editUser && (
        <UserModal
          mode="edit"
          user={editUser}
          currentUserRole={currentRole}
          onClose={() => setEditUser(null)}
          onSuccess={fetchUsers}
        />
      )}
      {deleteUser && (
        <DeleteModal
          user={deleteUser}
          onClose={() => setDeleteUser(null)}
          onConfirm={handleDelete}
        />
      )}
    </DashboardTemplate>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', color: '#1a3a6b', fontSize: 13, fontWeight: 600, marginBottom: 8,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #d0e4f0',
  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 4,
};