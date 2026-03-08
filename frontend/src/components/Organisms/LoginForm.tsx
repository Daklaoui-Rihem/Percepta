import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InputField from '../Molecules/InputField';
import Button from '../Atoms/Button';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    const emailLower = email.toLowerCase();

    // ⚠️ TEMPORARY — replace with real API call when backend is ready
    if (emailLower.includes('superadmin')) {
      navigate('/superadmin/dashboard');   // → SuperAdmin
    } else if (emailLower.includes('admin')) {
      navigate('/dashboard');              // → Admin
    } else {
      navigate('/client/dashboard');       // → Client
    }
  };

  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '32px 28px', width: '100%' }}>
      <h2 style={{ color: '#1a3a6b', marginBottom: 24, textAlign: 'center' }}>
        Connexion
      </h2>

      <InputField label="Email" type="email" placeholder="votre@email.com"
        value={email} onChange={e => { setEmail(e.target.value); setError(''); }} />

      <InputField label="Mot de passe" type="password" placeholder="••••••••"
        value={password} onChange={e => { setPassword(e.target.value); setError(''); }} />

      {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</p>}

      <a href="#" style={{ display: 'block', textAlign: 'center', color: '#888', fontSize: 14, margin: '12px 0 20px', textDecoration: 'none' }}>
        Mot de passe oublié ?
      </a>

      <Button label="Se connecter" onClick={handleLogin} />

      <p style={{ textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 16 }}>
        💡 "superadmin" → super dashboard | "admin" → admin | autre → client
      </p>
    </div>
  );
}