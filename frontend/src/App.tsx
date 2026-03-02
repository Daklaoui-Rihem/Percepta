
import LoginForm from './components/LoginForm';
import logo from './assets/logo.png'; 

export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',       // ← centers vertically
      justifyContent: 'center',   // ← centers horizontally
      background: '#e8f4fb',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',   // ← stacks children top to bottom
        alignItems: 'center',
        width: '100%',
        maxWidth: 420,
}}>
        <img 
          src={logo} 
          alt="IFBW Logo" 
          style={{ 
            width: 120,        // ← adjust size as needed
            marginBottom: 20,
          }} 
        /> 
        <LoginForm />
        <p style={{
          textAlign: 'center',
          padding: '16px',
          color: '#666',
          fontSize: 13,
          
        }}>
          © 2026 IFBW. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}