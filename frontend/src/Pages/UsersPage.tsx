import { useState } from 'react';
import DashboardTemplate from '../components/Templates/DashboardTemplate';
import UsersTable from '../components/Organisms/UsersTable';
import NewUserModal from '../components/Organisms/NewUserModal';

export default function UsersPage() {
  const [activePage, setActivePage] = useState('Users');
  const [showModal, setShowModal] = useState(false);

  const handleCreateUser = (user: {
    firstName: string; lastName: string;
    email: string; role: string; password: string;
  }) => {
    // For now just log — later send to backend
    console.log('New user created:', user);
    alert(`User ${user.firstName} ${user.lastName} created successfully!`);
  };

  return (
    <DashboardTemplate active={activePage} onNavigate={setActivePage}>

      {/* Header row: title + button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h2 style={{ color: '#1a3a6b', margin: 0, fontSize: 24, fontWeight: 700 }}>
          User Management
        </h2>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: '#1a3a6b', color: 'white',
            border: 'none', borderRadius: 8,
            padding: '12px 20px', fontSize: 14,
            fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          + New User
        </button>
      </div>

      {/* 3 stat cards */}
      <div style={{ display:"inline-flex", gap: 20, marginBottom: 28 }}>
        {[
          { icon: '👥', value: '8', label: 'Total Users',  border: '#60a5fa' },
          { icon: '✅', value: '6', label: 'Active',       border: '#22c55e' },
        
        ].map(card => (
          <div key={card.label} style={{
            background: 'white', borderRadius: 12,
            padding: '20px 24px', flex: 1,
            borderLeft: `4px solid ${card.border}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: '#eff6ff',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 22,
            }}>
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#1a3a6b' }}>{card.value}</div>
              <div style={{ fontSize: 13, color: '#888' }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter row */}
      <div style={{
        background: 'white', borderRadius: 12,
        padding: '16px 20px', marginBottom: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex', gap: 12,
      }}>
        <div style={{
          flex: 2, display: 'flex', alignItems: 'center',
          border: '1.5px solid #d0e4f0', borderRadius: 8,
          padding: '10px 14px', gap: 8,
        }}>
          <span style={{ color: '#aaa' }}>🔍</span>
          <input
            placeholder="Search by name or email..."
            style={{ border: 'none', outline: 'none', fontSize: 14, width: '100%' }}
          />
        </div>
        <select style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #d0e4f0', borderRadius: 8, fontSize: 14, color: '#444', cursor: 'pointer' }}>
          <option>All Roles</option>
          <option>Admin</option>
          <option>Client</option>
        </select>
        <select style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #d0e4f0', borderRadius: 8, fontSize: 14, color: '#444', cursor: 'pointer' }}>
          <option>All Status</option>
          <option>Active</option>
          <option>Suspended</option>
        </select>
      </div>

      {/* Users table */}
      <UsersTable />

      {/* Modal — only shows when showModal is true */}
      {showModal && (
        <NewUserModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreateUser}
        />
      )}

    </DashboardTemplate>
  );
}