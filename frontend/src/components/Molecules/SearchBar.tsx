export default function SearchBar() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: 8,
      padding: '10px 16px',
      width: 400,
      gap: 10,
    }}>
      <span style={{ color: '#aaa' }}>🔍</span>
      <input
        placeholder="Search users, analyses, reports..."
        style={{ border: 'none', outline: 'none', fontSize: 14, width: '100%', color: '#444' }}
      />
    </div>
  );
}