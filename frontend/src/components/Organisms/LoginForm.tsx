import { useState } from 'react';
import InputField from '../Molecules/InputField';
import Button from '../Atoms/Button';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '32px 28px', width: '100%' }}>
      <h2 style={{ color: '#1a3a6b', marginBottom: 24, textAlign: 'center' }}>
        Connexion 
      </h2>

      <InputField
        label="Email"
        type="email"
        placeholder="votre@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <InputField
        label="Mot de passe"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <a 
  href="/forgot-password" 
  style={{ 
    display: 'block',
    textAlign: 'center', 
    color: '#888', 
    fontSize: 14, 
    margin: '12px 0 20px',
    textDecoration: 'none',
  }}
  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
>
  Mot de passe oublié ?
</a>
      <Button label="Se connecter" onClick={() => alert(`Connexion: ${email}`)} />
    </div>
  );
}