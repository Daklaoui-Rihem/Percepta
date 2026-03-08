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
    <div style={{ background: 'white', borderRadius: 12, padding: '32px 28px', width: '100%' }}>
      <h2 style={{ color: '#1a3a6b', marginBottom: 24, textAlign: 'center' }}>
        Connexion
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
        style={{ display: 'block', textAlign: 'center', color: '#888', fontSize: 14, margin: '12px 0 20px', textDecoration: 'none' }}
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