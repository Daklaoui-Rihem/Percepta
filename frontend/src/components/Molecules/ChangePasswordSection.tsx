import { useState } from 'react';
import { userApi } from '../../services/api';

export default function ChangePasswordSection() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!current || !newPass || !confirm) {
      setError('Please fill all fields'); return;
    }
    if (newPass !== confirm) {
      setError('Passwords do not match'); return;
    }
    if (newPass.length < 6) {
      setError('Password must be at least 6 characters'); return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await userApi.changeMyPassword(current, newPass);
      setSuccess('Password changed successfully!');
      setCurrent(''); setNewPass(''); setConfirm('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      <div
        onClick={() => { setOpen(!open); setError(''); setSuccess(''); }}
        style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '24px 32px', cursor: 'pointer',
        }}
      >
        <h3 style={{ color: '#1a3a6b', margin: 0, fontSize: 18, fontWeight: 700 }}>
          🔒 Change Password
        </h3>
        <span style={{
          color: '#1a3a6b', fontSize: 18,
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s', display: 'inline-block',
        }}>›</span>
      </div>

      {open && (
        <div style={{ padding: '0 32px 28px' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Current Password</label>
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>New Password</label>
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Confirm New Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} style={inputStyle} />
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          {success && <p style={{ color: '#16a34a', fontSize: 13, marginBottom: 12 }}>{success}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saving ? '#93c5fd' : '#1a3a6b',
              color: 'white', border: 'none', borderRadius: 8,
              padding: '12px 24px', fontSize: 14,
              fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      )}
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
};