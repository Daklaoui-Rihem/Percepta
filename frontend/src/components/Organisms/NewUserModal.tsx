import { useState } from 'react';

type Props = {
  onClose: () => void;   // called when modal should close
  onSubmit: (user: { firstName: string; lastName: string; email: string; role: string; password: string }) => void;
}

export default function NewUserModal({ onClose, onSubmit }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [role,      setRole]      = useState('Client');
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState('');

  const handleSubmit = () => {
    // Basic validation
    if (!firstName || !lastName || !email || !password) {
      setError('Please fill all fields');
      return;
    }
    onSubmit({ firstName, lastName, email, role, password });
    onClose();
  };

  return (
    // Dark overlay behind the modal
    <div
      onClick={onClose}  // click outside = close
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200,
      }}
    >
      {/* Modal box — stop click from bubbling to overlay */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 16,
          padding: '36px 32px', width: 520,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h3 style={{ color: '#1a3a6b', margin: 0, fontSize: 22, fontWeight: 700 }}>
            Create New User
          </h3>
          {/* X close button */}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none',
              fontSize: 20, cursor: 'pointer', color: '#888',
            }}
          >
            ✕
          </button>
        </div>

        {/* First Name + Last Name side by side */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>First Name</label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Last Name</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
        </div>

        {/* Role dropdown */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Role</label>
          <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="Client">Client</option>
            <option value="Admin">Admin</option>
          </select>
        </div>

        {/* Temporary Password */}
        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>Temporary Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
          <p style={{ color: '#888', fontSize: 12, marginTop: 6 }}>
            User will be prompted to change on first login
          </p>
        </div>

        {/* Error */}
        {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</p>}

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
            Cancel
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
            Create User
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
  width: '100%', padding: '11px 14px',
  border: '1.5px solid #d0e4f0', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
};