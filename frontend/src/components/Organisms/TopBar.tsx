import SearchBar from '../Molecules/SearchBar';
import AdminProfile from '../Molecules/AdminProfile';



export default function TopBar() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 28px',
      background: 'white',
      borderBottom: '1px solid #eee',
    }}>
      <SearchBar />
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* ← added here */}
         
        <span style={{ fontSize: 20, cursor: 'pointer' }}>🔔</span>
        <AdminProfile />

      

      </div>
    </div>
  );
}