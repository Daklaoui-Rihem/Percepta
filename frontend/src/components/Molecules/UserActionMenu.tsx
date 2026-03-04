import { useState } from "react";

type Props = {
  onEdit: () => void;
  onDelete: () => void;
}

export default function UserActionMenu({ onEdit, onDelete }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => setOpen(!open)} style={{ cursor: 'pointer', fontSize: 20, color: '#888', padding: '0 8px' }}>
        ⋮
      </div>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 28,
          background: 'white', borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          width: 180, zIndex: 100, overflow: 'hidden',
        }}>
          <div onClick={() => { onEdit(); setOpen(false); }}
            style={{ padding: '13px 18px', fontSize: 14, color: '#1a3a6b', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            ✏️  Edit
          </div>
          <div onClick={() => setOpen(false)}
            style={{ padding: '13px 18px', fontSize: 14, color: '#1a3a6b', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            🔑  Reset Password
          </div>
          <div onClick={() => { onDelete(); setOpen(false); }}
            style={{ padding: '13px 18px', fontSize: 14, color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            🗑️  Delete
          </div>
        </div>
      )}
    </div>
  );
}