import { useState } from 'react';

type Props = {
  // We pass the role so SuperAdmin sees "SuperAdmin" in the level field
  role?: 'Admin' | 'SuperAdmin';
}

export default function AdminInfoSection({ role = 'Admin' }: Props) {
  const [department, setDepartment] = useState('IT Operations');
  const [phone, setPhone]           = useState('+33 6 12 34 56 78');
  const [adminLevel, setAdminLevel] = useState(role === 'SuperAdmin' ? 'SuperAdmin' : 'Administrator');

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      padding: '28px 32px', marginBottom: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      {/* Section title */}
      <h3 style={{ color: '#1a3a6b', marginBottom: 24, fontSize: 18, fontWeight: 700 }}>
        🏢 Admin Information
      </h3>

      {/* Department + Phone side by side */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>

        {/* Department */}
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Department</label>
          <input
            value={department}
            onChange={e => setDepartment(e.target.value)}
            placeholder="e.g. IT Operations"
            style={inputStyle}
          />
        </div>

        {/* Phone Number */}
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Phone Number</label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="e.g. +33 6 12 34 56 78"
            style={inputStyle}
          />
        </div>

      </div>

      {/* Admin Level — full width */}
      <div>
        <label style={labelStyle}>Admin Level</label>

        {role === 'SuperAdmin' ? (
          // SuperAdmin level is read-only — can't be changed
          <div style={{
            ...inputStyle,
            background: '#f8fbff',
            color: '#1a3a6b',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            ⭐ SuperAdmin
            <span style={{
              background: '#dbeafe', color: '#1d4ed8',
              fontSize: 12, padding: '2px 10px',
              borderRadius: 20, fontWeight: 600,
            }}>
              Highest Level
            </span>
          </div>
        ) : (
          // Admin can have different levels
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

    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#1a3a6b',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: '1.5px solid #d0e4f0',
  borderRadius: 8,
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
  color: '#333',
  background: 'white',
};