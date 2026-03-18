import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { userApi } from '../../services/api';
import type { UpdateUserPayload } from '../../services/api';
import { useTranslation } from '../../context/TranslationContext';

interface Props {
  onProfileLoaded?: (name: string) => void;
}

export default function ProfileInfoForm({ onProfileLoaded }: Props) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    userApi.getMyProfile()
      .then(profile => {
        const parts = profile.name.split(' ');
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
        setEmail(profile.email);
        setPhone(profile.phone || '');
        onProfileLoaded?.(profile.name);
      })
      .catch(() => setError(t('failed')))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!firstName.trim()) {
      setError(t('fillAllFields'));
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const data: UpdateUserPayload = {
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        phone: phone.trim(),
      };
      await userApi.updateMyProfile(data);
      setSuccess(t('saveChanges') + ' ✓');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('failed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: 'white', borderRadius: 16, padding: '28px 32px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', color: '#888' }}>
        {t('loadingProfile')}
      </div>
    );
  }

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      padding: '28px 32px', marginBottom: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <h3 style={{ color: '#1a3a6b', marginBottom: 24, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
        <User size={20} /> {t('personalInfo')}
      </h3>

      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>{t('firstName')}</label>
          <input
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>{t('lastName')}</label>
          <input
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>{t('emailAddress')}</label>
          <input
            type="email"
            value={email}
            readOnly
            style={{ ...inputStyle, backgroundColor: '#f9f9f9', cursor: 'default' }}
          />
          <p style={{ fontSize: 12, color: '#888', marginTop: 6 }}>Email cannot be changed. Contact support for assistance.</p>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>{t('phone')}</label>
          <input
            type="text"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+33 6 00 00 00 00"
            style={inputStyle}
          />
        </div>
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{error}</p>}
      {success && <p style={{ color: '#16a34a', fontSize: 13, marginBottom: 10 }}>{success}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          background: saving ? '#93c5fd' : '#1a3a6b',
          color: 'white', border: 'none',
          borderRadius: 8, padding: '10px 24px',
          fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? t('saving') : t('savePersonalInfo')}
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
  fontSize: 15, outline: 'none', boxSizing: 'border-box', color: '#333',
};