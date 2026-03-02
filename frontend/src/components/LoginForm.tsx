import { useState } from 'react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    alert(`Connexion avec : ${email}`);
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      padding: '32px 28px',
      width: '100%', 
     
    }}>
      <h2 style={{ color: '#1a3a6b', marginBottom: 24 , textAlign: 'center'  }}>Connexion</h2>

      <label style={labelStyle}>Email</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="votre@email.com"
        style={inputStyle}
      />

      <label style={labelStyle}>Mot de passe</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        style={inputStyle}
      />

      <p style={{ textAlign: 'center', color: '#555', fontSize: 14, margin: '12px 0 20px' }}>
        Mot de passe oublié ?
      </p>

      <button onClick={handleLogin} style={buttonStyle}>
        Se connecter
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#333',
  marginBottom: 6,
  fontSize: 14,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1.5px solid #d0e4f0',
  borderRadius: 8,
  fontSize: 15,
  marginBottom: 16,
  boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: 16,
  background: '#1a3a6b',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 'bold',
  cursor: 'pointer',
};