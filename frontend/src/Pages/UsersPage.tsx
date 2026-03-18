import { useState, useEffect } from 'react';
import {
  Plus,
  Users,
  CheckCircle,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Pause,
  Play,
  Eye,
  FileText
} from 'lucide-react';
import DashboardTemplate from '../components/Templates/DashboardTemplate';
import { userApi, getSession } from '../services/api';
import type { UserProfile } from '../services/api';
import { useTranslation } from '../context/TranslationContext';
import { validatePassword } from '../utils/validatePassword';
import { generatePassword } from '../utils/generatePassword';
import { analysisApi } from '../services/api';
import type { AnalysisRecord } from '../services/api';

// ── New/Edit User Modal ─────────────────────────────────────────
interface ModalProps {
  mode: 'create' | 'edit';
  user?: UserProfile | null;
  currentUserRole: string;
  onClose: () => void;
  onSuccess: () => void;
}

function UserModal({ mode, user, currentUserRole, onClose, onSuccess }: ModalProps) {
  const { t } = useTranslation();
  const targetRole = currentUserRole === 'SuperAdmin' ? 'Admin' : 'Client';
  const targetRoleText = targetRole === 'Admin' ? t('adminRole') : t('clientRole');

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password] = useState(mode === 'create' ? generatePassword() : '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [adminLevel, setAdminLevel] = useState(user?.adminLevel || 'Administrator');
  const [userType, setUserType] = useState(user?.userType || 'Single person');
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passError, setPassError] = useState('');
  const [saving, setSaving] = useState(false);

  // Real-time Email check
  useEffect(() => {
    if (mode === 'edit' || !email || !email.includes('@')) {
      setEmailError('');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { exists } = await userApi.checkEmail(email);
        if (exists) {
          setEmailError(t('emailAlreadyInUse') || 'Email already in use');
        } else {
          setEmailError('');
        }
      } catch (err) {
        console.error('Email check failed', err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email, mode, t]);

  // Real-time Password check
  useEffect(() => {
    if (mode === 'edit' || !password) {
      setPassError('');
      return;
    }
    if (!validatePassword(password)) {
      setPassError(t('passwordPolicyError'));
    } else {
      setPassError('');
    }
  }, [password, mode, t]);

  const handleSubmit = async () => {
    if (!name || !email || (mode === 'create' && !password)) {
      setError(t('fillAllFields')); return;
    }
    if (mode === 'create' && (emailError || passError)) {
      setError(t('fixErrorsBeforeSubmit') || 'Please fix the errors before submitting'); return;
    }
    setSaving(true);
    setError('');
    try {
      if (mode === 'create') {
        await userApi.createUser({ name, email, password, role: targetRole, phone, adminLevel, userType });
      } else if (user) {
        await userApi.updateUser(user._id, { name, email, phone, adminLevel, isActive, userType });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('saving'));
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
            {mode === 'create' ? `${t('create') || 'Create'} ${targetRoleText}` : `${t('edit')} ${targetRoleText}`}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#888' }}>
            <X size={20} />
          </button>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>{t('fullName')}</label>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder={t('fullName')} />
        </div>

        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>{t('email')}</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              ...inputStyle,
              borderColor: emailError ? '#dc2626' : '#d0e4f0'
            }}
            placeholder="email@example.com"
          />
          {emailError && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{emailError}</p>}
        </div>

        {/* Password (create only) */}
        {mode === 'create' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t('temporaryPassword')}</label>
            <input
              type="password"
              value={password}
              readOnly
              style={{
                ...inputStyle,
                borderColor: passError ? '#dc2626' : '#d0e4f0',
                backgroundColor: '#f9fafb',
                cursor: 'default'
              }}
              placeholder={t('newPasswordPlaceholder')}
            />
            {passError && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{passError}</p>}
          </div>
        )}

        {/* Phone */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>{t('phone')}</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} placeholder="+33 6 00 00 00 00" />
        </div>

        {/* Admin Level (only for Admin creation by SuperAdmin) */}
        {targetRole === 'Admin' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t('adminLevel')}</label>
            <select value={adminLevel} onChange={e => setAdminLevel(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="Administrator">{t('adminLevelAdmin')}</option>
              <option value="Senior Administrator">{t('adminLevelSenior')}</option>
              <option value="Manager">{t('adminLevelManager')}</option>
            </select>
          </div>
        )}

        {/* User Type (only for Client creation by Admin or editing Clients) */}
        {targetRole === 'Client' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t('userType')}</label>
            <select value={userType} onChange={e => setUserType(e.target.value as any)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="Single person">{t('singlePerson')}</option>
              <option value="Entreprise">{t('enterprise')}</option>
            </select>
          </div>
        )}

        {/* Active toggle (edit only for Admins) */}
        {mode === 'edit' && targetRole === 'Admin' && (
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>{t('accountStatus')}</label>
            <button
              onClick={() => setIsActive(!isActive)}
              style={{
                padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: isActive ? '#dcfce7' : '#fee2e2',
                color: isActive ? '#16a34a' : '#dc2626',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isActive ? <CheckCircle size={14} /> : <X size={14} />}
                {isActive ? t('active') : t('suspended')}
              </div>
            </button>
          </div>
        )}

        {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '13px', borderRadius: 8, border: '1.5px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#555' }}
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{ flex: 1, padding: '13px', borderRadius: 8, border: 'none', background: saving ? '#93c5fd' : '#1a3a6b', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700 }}
          >
            {saving ? t('saving') : mode === 'create' ? `${t('create') || 'Create'} ${targetRoleText}` : t('saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── User Details Modal (Activities) ───────────────────────────
function UserDetailsModal({ user, onClose }: { user: UserProfile, onClose: () => void }) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analysisApi.getUserAnalyses(user._id)
      .then(res => setActivities(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [user._id]);

  const getActDetails = (act: AnalysisRecord) => {
    if (act.status === 'error') {
      return { 
        label: t('errorBadge'), 
        action: t('failedToProcess', { filename: act.originalName }), 
        color: '#ef4444', bg: '#fef2f2' 
      };
    }
    if (act.type === 'audio') {
      if (act.status === 'done') {
        return { 
          label: t('transcriptionBadge'), 
          action: t('completedTranscription'), 
          color: '#2563eb', bg: '#eff6ff' 
        };
      }
      return { 
        label: t('upload'), 
        action: t('uploadedAudioFile', { filename: act.originalName }), 
        color: '#0ea5e9', bg: '#f0f9ff' 
      };
    } else {
      // Video
      if (act.status === 'done') {
        return { 
          label: t('report'), 
          action: t('generatedPdfReport', { filename: act.originalName }), 
          color: '#10b981', bg: '#f0fdf4' 
        };
      }
      return { 
        label: t('analysis'), 
        action: t('startedVideoAnalysis'), 
        color: '#8b5cf6', bg: '#f5f3ff' 
      };
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: '36px 32px', width: 800, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h3 style={{ color: '#1a3a6b', margin: 0, fontSize: 22, fontWeight: 700 }}>
             {t('recentActivity')}: {user.name}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #f0f4f8', borderRadius: 12 }}>
          {/* Table Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', padding: '12px 24px', background: '#f8fbff', borderBottom: '1.5px solid #e0f2fe' }}>
            <span style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 13 }}>{t('type')}</span>
            <span style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 13 }}>{t('actionHeader')}</span>
          </div>

          {loading ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <RefreshCw size={32} className="animate-spin" style={{ color: '#60a5fa', marginBottom: 16 }} />
              <p style={{ color: '#888' }}>{t('loading')}...</p>
            </div>
          ) : activities.length === 0 ? (
            <div style={{ padding: 80, textAlign: 'center', color: '#94a3b8' }}>
              <FileText size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
              <p>{t('noResults')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activities.map(act => {
                const details = getActDetails(act);
                return (
                  <div key={act._id} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', padding: '16px 24px', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                    <div>
                      <span style={{ 
                        padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                        background: details.bg, color: details.color,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: 90
                      }}>
                        {details.label}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#334155', fontSize: 14, fontWeight: 500 }}>
                        {details.action}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ────────────────────────────────────────
function DeleteModal({ user, onClose, onConfirm }: { user: UserProfile; onClose: () => void; onConfirm: () => void }) {
  const { t } = useTranslation();
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
        <div style={{ color: '#dc2626', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
          <Trash2 size={48} strokeWidth={1.5} />
        </div>
        <h3 style={{ color: '#1a3a6b', marginBottom: 8 }}>{t('deleteUser')}</h3>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 28 }}>
          {t('deleteUserConfirm')} <strong>{user.name}</strong>? {t('deleteCannotUndo')}
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1.5px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 14, color: '#555' }}>{t('cancel')}</button>
          <button onClick={handleConfirm} disabled={deleting} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', cursor: deleting ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700 }}>
            {deleting ? t('deleting') : t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────
export default function UsersPage() {
  const { t } = useTranslation();
  const [activePage, setActivePage] = useState('Users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All Status');

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserProfile | null>(null);
  const [viewDetails, setViewDetails] = useState<UserProfile | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showBulkStatus, setShowBulkStatus] = useState<{ show: boolean, active: boolean }>({ show: false, active: true });

  const session = getSession();
  const currentRole = session?.role || 'Admin';
  const targetRole = currentRole === 'SuperAdmin' ? 'Admin' : 'Client';
  const managementText = currentRole === 'SuperAdmin' ? t('adminManagement') : t('clientManagement');
  const targetRoleText = currentRole === 'SuperAdmin' ? t('adminRole') : t('clientRole');
  const targetRolePlural = currentRole === 'SuperAdmin' ? t('admins') : t('clients');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await userApi.getAllUsers();
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('failed'));
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
      alert(err instanceof Error ? err.message : t('failed'));
    }
  };

  const handleBulkDelete = async () => {
    try {
      await userApi.bulkDeleteUsers(Array.from(selectedIds));
      setSelectedIds(new Set());
      setShowBulkDelete(false);
      fetchUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('failed'));
    }
  };

  const handleBulkStatusUpdate = async (active: boolean) => {
    try {
      await userApi.bulkUpdateUsers(Array.from(selectedIds), { isActive: active });
      setSelectedIds(new Set());
      setShowBulkStatus({ show: false, active: true });
      fetchUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('failed'));
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

  const handleToggleStatus = async (user: UserProfile) => {
    try {
      await userApi.updateUser(user._id, { isActive: !user.isActive });
      fetchUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('failed'));
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

  return (
    <DashboardTemplate active={activePage} onNavigate={setActivePage}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h2 style={{ color: '#1a3f5f', margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>
          {managementText}
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          style={{ background: '#1a3a6b', color: 'white', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={18} /> {t('create') || 'Create'} {targetRoleText}
        </button>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'inline-flex', gap: 20, marginBottom: 28 }}>
        {[
          { icon: Users, value: String(users.length), label: `${t('totalUsers')} (${targetRolePlural})`, border: '#60a5fa' },
          ...(targetRole === 'Admin' ? [{ icon: CheckCircle, value: String(activeCount), label: t('active'), border: '#22c55e' }] : []),
        ].map(card => (
          <div key={card.label} style={{ background: 'white', borderRadius: 16, padding: '24px', flex: 1, border: '1px solid rgba(198, 234, 255, 0.4)', borderLeft: `5px solid ${card.border}`, boxShadow: '0 4px 15px rgba(26, 63, 95, 0.05)', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: `${card.border}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.border }}>
              <card.icon size={26} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#1a3f5f', lineHeight: 1, marginBottom: 4 }}>{card.value}</div>
              <div style={{ fontSize: 13, color: '#4a7090', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ background: 'white', borderRadius: 16, padding: '20px', marginBottom: 24, boxShadow: '0 4px 15px rgba(26, 63, 95, 0.05)', display: 'flex', gap: 16, border: '1px solid rgba(198, 234, 255, 0.4)' }}>
        <div style={{ flex: 2, display: 'flex', alignItems: 'center', background: '#f8fbff', border: '1.5px solid #dff5ff', borderRadius: 10, padding: '12px 16px', gap: 12 }}>
          <Search size={20} color="#6ab7e4" />
          <input
            placeholder={`${t('fullName')} / ${t('email')}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 14, width: '100%', color: '#1a3f5f', fontWeight: 500 }}
          />
        </div>
        {targetRole === 'Admin' && (
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #d0e4f0', borderRadius: 8, fontSize: 14, color: '#444', cursor: 'pointer' }}
          >
            <option value="All Status">{t('allStatus')}</option>
            <option value="Active">{t('active')}</option>
            <option value="Suspended">{t('suspended')}</option>
          </select>
        )}
        <button
          onClick={fetchUsers}
          style={{ padding: '10px 18px', background: '#eff6ff', border: '1.5px solid #d0e4f0', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#1a3a6b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <RefreshCw size={14} /> {t('refresh')}
        </button>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div style={{ background: '#1a3a6b', color: 'white', padding: '12px 24px', borderRadius: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(26,58,107,0.3)' }}>
          <span style={{ fontWeight: 600 }}>{t('usersSelected', { count: selectedIds.size })}</span>
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

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>{t('loadingProfile')}...</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>{error}</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#dbeafe' }}>
                <th style={{ padding: '14px 18px', width: 40 }}>
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every(u => selectedIds.has(u._id))}
                    onChange={() => toggleSelectAll(filtered.map(u => u._id))}
                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                  />
                </th>
                {[t('name'), t('email'), ...(targetRole === 'Admin' ? [t('status'), t('adminLevel')] : [t('userType')]), t('phone'), t('created'), t('actions')].map(col => (
                  <th key={col} style={{ padding: '14px 18px', textAlign: 'left', color: '#1a3a6b', fontSize: 14, fontWeight: 700 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#888' }}>
                    {t('noTenantsFound')}
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u._id} style={{ borderBottom: '1px solid #f0f4f8', background: selectedIds.has(u._id) ? '#eff6ff' : 'white' }}
                  onMouseEnter={e => !selectedIds.has(u._id) && (e.currentTarget.style.background = '#f8fbff')}
                  onMouseLeave={e => !selectedIds.has(u._id) && (e.currentTarget.style.background = 'white')}
                >
                  <td style={{ padding: '14px 18px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(u._id)}
                      onChange={() => toggleSelect(u._id)}
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                    />
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#60a5fa', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                        {u.name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600, color: '#1a3a6b', fontSize: 14 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', color: '#555', fontSize: 14 }}>{u.email}</td>
                  {targetRole === 'Admin' && (
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        background: u.isActive ? '#dcfce7' : '#fee2e2',
                        color: u.isActive ? '#16a34a' : '#dc2626',
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      }}>
                        {u.isActive ? t('active') : t('suspended')}
                      </span>
                    </td>
                  )}
                  {targetRole === 'Admin' && (
                    <td style={{ padding: '14px 18px', color: '#555', fontSize: 13 }}>
                      {u.adminLevel === 'Administrator' ? t('adminLevelAdmin') :
                        u.adminLevel === 'Senior Administrator' ? t('adminLevelSenior') :
                          u.adminLevel === 'Manager' ? t('adminLevelManager') : '—'}
                    </td>
                  )}
                  {targetRole === 'Client' && (
                    <td style={{ padding: '14px 18px', color: '#555', fontSize: 13 }}>
                      <span style={{ fontSize: 13, background: u.userType === 'Entreprise' ? '#fff1f2' : '#f0f9ff', color: u.userType === 'Entreprise' ? '#e11d48' : '#0369a1', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>
                        {u.userType === 'Entreprise' ? t('enterprise') : t('singlePerson')}
                      </span>
                    </td>
                  )}
                  <td style={{ padding: '14px 18px', color: '#555', fontSize: 13 }}>{u.phone || '—'}</td>
                  <td style={{ padding: '14px 18px', color: '#888', fontSize: 13 }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setViewDetails(u)}
                        title={t('viewDetails') || 'View Details'}
                        style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d0e4f0', background: '#f0f9ff', cursor: 'pointer', fontSize: 13, color: '#0369a1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Eye size={12} /> {t('details') || 'Details'}
                      </button>
                      <button
                        onClick={() => setEditUser(u)}
                        style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d0e4f0', background: 'white', cursor: 'pointer', fontSize: 13, color: '#1a3a6b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Pencil size={12} /> {t('edit')}
                      </button>
                      {targetRole === 'Admin' && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          title={u.isActive ? t('suspended') : t('active')}
                          style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: u.isActive ? '#fff7ed' : '#dcfce7', cursor: 'pointer', fontSize: 13, color: u.isActive ? '#c2410c' : '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {u.isActive ? <Pause size={12} /> : <Play size={12} />}
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteUser(u)}
                        style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#fee2e2', cursor: 'pointer', fontSize: 13, color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={12} />
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
      {viewDetails && (
        <UserDetailsModal
          user={viewDetails}
          onClose={() => setViewDetails(null)}
        />
      )}
      {showBulkDelete && (
        <div onClick={() => setShowBulkDelete(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: '36px 32px', width: 420, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ color: '#dc2626', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
              <Trash2 size={48} strokeWidth={1.5} />
            </div>
            <h3 style={{ color: '#1a3a6b', marginBottom: 8 }}>{t('deleteSelected')}</h3>
            <p style={{ color: '#888', fontSize: 14, marginBottom: 28 }}>
              {t('deleteBulkConfirm')} <strong>{t('usersSelected', { count: selectedIds.size })}</strong>? {t('deleteCannotUndo')}
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
              {showBulkStatus.active ? t('activateBulkConfirm') : t('suspendBulkConfirm')} <strong>{t('usersSelected', { count: selectedIds.size })}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowBulkStatus({ show: false, active: true })} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1.5px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 14, color: '#555' }}>{t('cancel')}</button>
              <button
                onClick={() => handleBulkStatusUpdate(showBulkStatus.active)}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: showBulkStatus.active ? '#10b981' : '#f59e0b', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
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