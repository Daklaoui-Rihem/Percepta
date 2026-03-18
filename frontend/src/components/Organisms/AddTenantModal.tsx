import { useState, useEffect } from 'react';
import { Pencil, PlusCircle, X, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';
import { validatePassword } from '../../utils/validatePassword';
import { generatePassword } from '../../utils/generatePassword';
import { userApi } from '../../services/api';

// This is the shape of one tenant object
export type Tenant = {
  id: string | number;
  name: string;
  email: string;
  license: 'Enterprise' | 'Professional' | 'Starter';
  status: 'Active' | 'Suspended';
  users: number;
  resource: number;
  expiry: string;
}

type Props = {
  onClose: () => void;
  onSubmit: (tenant: Omit<Tenant, 'id' | 'resource'> & { password?: string }) => void;
  existingTenant?: Tenant | null;
}

export default function AddTenantModal({ onClose, onSubmit, existingTenant }: Props) {
  const { t } = useTranslation();
  const isEdit = !!existingTenant;

  const [name, setName] = useState(existingTenant?.name || '');
  const [email, setEmail] = useState(existingTenant?.email || '');
  const [license, setLicense] = useState(existingTenant?.license || 'Professional');
  const [users, setUsers] = useState(existingTenant?.users?.toString() || '10');
  const [expiry, setExpiry] = useState(existingTenant?.expiry || '');
  const [status, setStatus] = useState<Tenant['status']>(existingTenant?.status || 'Active');
  const [password] = useState(generatePassword());
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passError, setPassError] = useState('');

  // Real-time Email check
  useEffect(() => {
    if (isEdit || !email || !email.includes('@')) {
      setEmailError('');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { exists } = await userApi.checkEmail(email);
        if (exists) {
          setEmailError('Email already in use');
        } else {
          setEmailError('');
        }
      } catch (err) {
        console.error('Email check failed', err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email, isEdit]);

  // Real-time Password check
  useEffect(() => {
    if (isEdit || !password) {
      setPassError('');
      return;
    }
    if (!validatePassword(password)) {
      setPassError('Password must be at least 8 characters with Uppercases, Lowercases and Special Characters');
    } else {
      setPassError('');
    }
  }, [password, isEdit]);

  const handleSubmit = () => {
    if (!name || !email || !expiry || (!isEdit && !password)) {
      setError(t('fillAllFields'));
      return;
    }
    if (!isEdit && (emailError || passError)) {
      setError('Please fix the errors before submitting');
      return;
    }
    onSubmit({
      name,
      email,
      password: !isEdit ? password : undefined,
      license: license as Tenant['license'],
      users: parseInt(users) || 0,
      expiry,
      status,
    });
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 200,
      }}
    >
      {/* Modal box */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 16,
          padding: '36px 32px', width: 540,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <h3 style={{ color: '#1a3a6b', margin: '0 0 6px', fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
              {isEdit ? <Pencil size={22} /> : <PlusCircle size={22} />}
              {isEdit ? t('editTenantTitle') : t('addTenantTitle')}
            </h3>
            <p style={{ color: '#60a5fa', fontSize: 13, margin: 0 }}>
              {isEdit ? t('editTenantDesc') : t('addTenantDesc')}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#888',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <X size={24} />
          </button>
        </div>

        <div style={{ marginTop: 24 }}>

          {/* Tenant Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t('tenantName')}</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Acme Corporation"
              style={inputStyle}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t('emailAddress')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@company.com"
              style={{
                ...inputStyle,
                borderColor: emailError ? '#dc2626' : '#e0eaf4'
              }}
            />
            {emailError && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{emailError}</p>}
          </div>

          {/* Password (CREATE ONLY) */}
          {!isEdit && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>{t('temporaryPassword')}</label>
              <input
                type="password"
                value={password}
                readOnly
                placeholder="Secure password"
                style={{
                  ...inputStyle,
                  borderColor: passError ? '#dc2626' : '#e0eaf4',
                  backgroundColor: '#f9fafb',
                  cursor: 'default'
                }}
              />
              {passError && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{passError}</p>}
            </div>
          )}

          {/* License Type */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t('licenseType')}</label>
            <select
              value={license}
              onChange={e => setLicense(e.target.value as Tenant['license'])}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="Professional">Professional</option>
              <option value="Enterprise">Enterprise</option>
              <option value="Starter">Starter</option>
            </select>
          </div>

          {/* Status (EDIT ONLY) */}
          {isEdit && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>{t('tenantStatus')}</label>
              <button
                onClick={() => setStatus(status === 'Active' ? 'Suspended' : 'Active')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', borderRadius: 8,
                  border: '1.5px solid',
                  background: status === 'Active' ? '#f0fdf4' : '#fef2f2',
                  borderColor: status === 'Active' ? '#bbf7d0' : '#fecaca',
                  color: status === 'Active' ? '#16a34a' : '#dc2626',
                  cursor: 'pointer', fontWeight: 600, fontSize: 14,
                  width: '100%',
                }}
              >
                {status === 'Active' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                {status === 'Active' ? t('activeOperations') : t('suspendedOperations')}
              </button>
            </div>
          )}

          {/* User Count */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              {isEdit ? t('userCount') : t('initialUserCount')}
            </label>
            <input
              type="number"
              value={users}
              onChange={e => setUsers(e.target.value)}
              min="1"
              style={inputStyle}
            />
          </div>

          {/* License Expiry Date */}
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>{t('licenseExpiryDate')}</label>
            <input
              type="date"
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: 13, margin: '8px 0' }}>{error}</p>}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '13px', borderRadius: 8,
              border: '1.5px solid #ddd', background: 'white',
              cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#555',
            }}
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1, padding: '13px', borderRadius: 8,
              border: 'none', background: '#1a3a6b',
              color: 'white', cursor: 'pointer',
              fontSize: 15, fontWeight: 700,
            }}
          >
            {isEdit ? t('saveChanges') : t('addTenantBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', color: '#1a3a6b',
  fontSize: 13, fontWeight: 600, marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px',
  border: '1.5px solid #e0eaf4', borderRadius: 8,
  fontSize: 14, outline: 'none',
  boxSizing: 'border-box', background: '#f8fbff', color: '#333',
};