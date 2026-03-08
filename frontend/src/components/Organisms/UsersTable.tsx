import { useState } from 'react';

import Avatar from '../Atoms/Avatar';
import RoleBadge from '../Atoms/RoleBadge';
import UserActionMenu from '../Molecules/UserActionMenu';

type User = {
  initials: string;
  name: string;
  email: string;
  role: string;
  lastLogin: string;
}

const initialUsers: User[] = [
  { initials: 'JD', name: 'Jean Dupont',    email: 'jean.dupont@example.com',    role: 'Client', lastLogin: '2026-02-22 14:32' },
  { initials: 'MC', name: 'Marie Claire',   email: 'marie.claire@example.com',   role: 'Client', lastLogin: '2026-02-22 13:10' },
  { initials: 'PM', name: 'Pierre Martin',  email: 'pierre.martin@example.com',  role: 'Admin',  lastLogin: '2026-02-22 12:45' },
  { initials: 'SB', name: 'Sophie Bernard', email: 'sophie.bernard@example.com', role: 'Client', lastLogin: '2026-02-20 09:30' },
  { initials: 'LM', name: 'Luc Moreau',     email: 'luc.moreau@example.com',     role: 'Client', lastLogin: '2026-02-21 16:20' },
  { initials: 'AP', name: 'Anne Petit',     email: 'anne.petit@example.com',     role: 'Admin',  lastLogin: '2026-02-22 10:05' },
  { initials: 'TD', name: 'Thomas Dubois',  email: 'thomas.dubois@example.com',  role: 'Client', lastLogin: '2026-02-19 15:40' },
];

export default function UsersTable() {

  const [users, setUsers] = useState<User[]>(initialUsers);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const handleEditClick = (user: User, index: number) => {
    setEditingUser({ ...user });
    setEditIndex(index);
  };

  const handleEditSave = () => {
    if (editingUser === null || editIndex === null) return;
    const updated = [...users];
    const parts = editingUser.name.trim().split(' ');
    const initials = parts.length >= 2
      ? parts[0][0] + parts[1][0]
      : parts[0].substring(0, 2);
    updated[editIndex] = { ...editingUser, initials: initials.toUpperCase() };
    setUsers(updated);
    setEditingUser(null);
    setEditIndex(null);
  };

  const handleDeleteConfirm = () => {
    if (deleteIndex === null) return;
    setUsers(users.filter((_, i) => i !== deleteIndex));
    setDeleteIndex(null);
  };

  return (
    <>
      {/* ── TABLE ───────────────────────────────── */}
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#dbeafe' }}>
              {[('avatar'), ('user'), ('email'), ('role'), ('lastLogin'), ('actions')].map(col => (
                <th key={col} style={{ padding: '14px 18px', textAlign: 'left', color: '#1a3a6b', fontSize: 14, fontWeight: 700 }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr key={i}
                style={{ borderBottom: '1px solid #f0f4f8' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8fbff')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
              >
                <td style={{ padding: '16px 18px' }}><Avatar initials={user.initials} /></td>
                <td style={{ padding: '16px 18px', fontWeight: 600, color: '#1a3a6b', fontSize: 14 }}>{user.name}</td>
                <td style={{ padding: '16px 18px', color: '#555', fontSize: 14 }}>{user.email}</td>
                <td style={{ padding: '16px 18px' }}><RoleBadge role={user.role} /></td>
                <td style={{ padding: '16px 18px', color: '#555', fontSize: 14 }}>{user.lastLogin}</td>
                <td style={{ padding: '16px 18px' }}>
                  <UserActionMenu
                    onEdit={() => handleEditClick(user, i)}
                    onDelete={() => setDeleteIndex(i)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── EDIT MODAL ──────────────────────────── */}
      {editingUser && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200,
        }}>
          <div style={{
            background: 'white', borderRadius: 16,
            padding: '36px 32px', width: 440,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ color: '#1a3a6b', marginBottom: 24, fontSize: 20 }}>{('editUser')}</h3>

            <label style={labelStyle}>{('fullName')}</label>
            <input
              value={editingUser.name}
              onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
              style={inputStyle}
            />

            <label style={labelStyle}>{('email')}</label>
            <input
              value={editingUser.email}
              onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
              style={inputStyle}
            />

            <label style={labelStyle}>{('role')}</label>
            <select
              value={editingUser.role}
              onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="Client">Client</option>
              <option value="Admin">Admin</option>
            </select>

            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <button
                onClick={() => setEditingUser(null)}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: '1.5px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 14, color: '#555' }}
              >
                {('cancel')}
              </button>
              <button
                onClick={handleEditSave}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#1a3a6b', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
              >
                {('saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ────────────── */}
      {deleteIndex !== null && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200,
        }}>
          <div style={{
            background: 'white', borderRadius: 16,
            padding: '36px 32px', width: 380, textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
            <h3 style={{ color: '#1a3a6b', marginBottom: 8 }}>{('deleteUser')}</h3>
            <p style={{ color: '#888', fontSize: 14, marginBottom: 28 }}>
              {('deleteConfirm')} <strong>{users[deleteIndex]?.name}</strong>? {('deleteWarning')}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setDeleteIndex(null)}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: '1.5px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 14, color: '#555' }}
              >
                {('cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
              >
                {('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', color: '#555', fontSize: 13, marginBottom: 6, fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #d0e4f0',
  borderRadius: 8, fontSize: 14, marginBottom: 16, boxSizing: 'border-box', outline: 'none',
};