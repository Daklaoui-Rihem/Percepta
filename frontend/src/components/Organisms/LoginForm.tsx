import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InputField from '../Molecules/InputField';
import Button from '../Atoms/Button';
import { authApi, saveSession } from '../../services/api';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await authApi.login(email, password);
      saveSession(res.token, res.user);

      // Route based on role
      if (res.user.role === 'SuperAdmin') {
        navigate('/superadmin/dashboard');
      } else if (res.user.role === 'Admin') {
        navigate('/dashboard');
      } else {
        navigate('/client/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: '40px 32px',
      width: '100%',
      boxShadow: '0 10px 25px rgba(26, 63, 95, 0.1)',
      border: '1px solid rgba(198, 234, 255, 0.4)'
    }}>
      <h2 style={{
        color: '#1a3f5f',
        marginBottom: 32,
        textAlign: 'center',
        fontSize: 28,
        fontWeight: 800,
        letterSpacing: '-0.5px'
      }}>
        Bienvenue
      </h2>

      <InputField
        label="Email"
        type="email"
        placeholder="votre@email.com"
        value={email}
        onChange={e => { setEmail(e.target.value); setError(''); }}
      />

      <InputField
        label="Mot de passe"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={e => { setPassword(e.target.value); setError(''); }}
      />

      {error && (
        <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
          {error}
        </p>
      )}

      <a
        href="#"
        style={{
          display: 'block',
          textAlign: 'right',
          color: '#4a7090',
          fontSize: 13,
          margin: '-8px 0 24px',
          textDecoration: 'none',
          fontWeight: 500
        }}
      >
        Mot de passe oublié ?
      </a>

      <Button
        label={loading ? 'Connexion...' : 'Se connecter'}
        onClick={handleLogin}
      />
    </div>
  );
}