import { useState } from 'react';

export default function ProfileInfoForm() {
  // Pre-filled with example data — will come from backend later
  const [firstName, setFirstName] = useState('Jean');
  const [lastName, setLastName]   = useState('Dupont');
  const [email, setEmail]         = useState('jean.dupont@example.com');

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      padding: '28px 32px', marginBottom: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <h3 style={{ color: '#1a3a6b', marginBottom: 24, fontSize: 18, fontWeight: 700 }}>
        Personal Information
      </h3>

      {/* First Name + Last Name side by side */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>First Name</label>
          <input
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Last Name</label>
          <input
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Email full width */}
      <div>
        <label style={labelStyle}>Email Address</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
        />
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
  border: '1.5px solid #d0e4f0', borderRadius: 8,
  fontSize: 15, outline: 'none', boxSizing: 'border-box',
  color: '#333',
};