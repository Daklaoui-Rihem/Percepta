import { useState, useEffect } from 'react';
import { Building2, Star } from 'lucide-react';
import { userApi } from '../../services/api';
import { useTranslation } from '../../context/TranslationContext';

type Props = {
  role?: 'Admin' | 'SuperAdmin';
}

export default function AdminInfoSection({ role = 'Admin' }: Props) {
  const { t } = useTranslation();
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [adminLevel, setAdminLevel] = useState(role === 'SuperAdmin' ? 'SuperAdmin' : 'Administrator');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    userApi.getMyProfile().then(profile => {
      setDepartment(profile.department || '');
      setPhone(profile.phone || '');
      if (role !== 'SuperAdmin') {
        setAdminLevel(profile.adminLevel || 'Administrator');
      }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await userApi.updateMyProfile({ department, phone, adminLevel });
      setSuccess(t('saveChanges') + ' ✓');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      padding: '28px 32px', marginBottom: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <h3 style={{ color: '#1a3a6b', marginBottom: 24, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Building2 size={20} /> {t('adminInfo')}
      </h3>

      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>{t('department')}</label>
          <input
            value={department}
            onChange={e => setDepartment(e.target.value)}
            placeholder="e.g. IT Operations"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>{t('phoneNumber')}</label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="e.g. +33 6 12 34 56 78"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>{t('adminLevel')}</label>
        {role === 'SuperAdmin' ? (
          <div style={{
            ...inputStyle,
            background: '#f8fbff', color: '#1a3a6b',
            fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Star size={16} fill="#fbbf24" color="#fbbf24" /> SuperAdmin
            <span style={{
              background: '#dbeafe', color: '#1d4ed8',
              fontSize: 12, padding: '2px 10px',
              borderRadius: 20, fontWeight: 600,
            }}>
              {t('highestLevel')}
            </span>
          </div>
        ) : (
          <select
            value={adminLevel}
            onChange={e => setAdminLevel(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="Administrator">Administrator</option>
            <option value="Senior Administrator">Senior Administrator</option>
            <option value="Manager">Manager</option>
          </select>
        )}
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{error}</p>}
      {success && <p style={{ color: '#16a34a', fontSize: 13, marginBottom: 10 }}>{success}</p>}

      <button
        onClick={handleSave}
        disabled={saving || role === 'SuperAdmin'}
        style={{
          background: (saving || role === 'SuperAdmin') ? '#93c5fd' : '#1a3a6b',
          color: 'white', border: 'none',
          borderRadius: 8, padding: '10px 24px',
          fontSize: 14, fontWeight: 600,
          cursor: (saving || role === 'SuperAdmin') ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? t('saving') : t('saveAdminInfo')}
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', color: '#1a3a6b',
  fontSize: 13, fontWeight: 600, marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px',
  border: '1.5px solid #d0e4f0', borderRadius: 8,
  fontSize: 15, outline: 'none', boxSizing: 'border-box',
  color: '#333', background: 'white',
};