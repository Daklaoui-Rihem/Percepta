import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InputField from '../Molecules/InputField';
import Button from '../Atoms/Button';
import { authApi, saveSession } from '../../services/api';
import { useTranslation } from '../../context/TranslationContext';

export default function LoginForm() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  // Get the t() function and isRTL from context
  const { t, isRTL } = useTranslation();

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('fillAllFields')); // ← translated error
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await authApi.login(email, password);
      saveSession(res.token, res.user);

      if (res.user.role === 'SuperAdmin') {
        navigate('/superadmin/dashboard');
      } else if (res.user.role === 'Admin') {
        navigate('/dashboard');
      } else {
        navigate('/client/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('invalidCredentials')); // ← translated
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
      border: '1px solid rgba(198, 234, 255, 0.4)',
      // Flip text direction for Arabic
      direction: isRTL ? 'rtl' : 'ltr',
      textAlign: isRTL ? 'right' : 'left',
    }}>

      {/* Title — translated */}
      <h2 style={{
        color: '#1a3f5f',
        marginBottom: 32,
        textAlign: 'center',
        fontSize: 28,
        fontWeight: 800,
        letterSpacing: '-0.5px',
      }}>
        {t('welcome')}
      </h2>

      {/* Email field — translated label and placeholder */}
      <InputField
        label={t('email')}
        type="email"
        placeholder={t('emailPlaceholder')}
        value={email}
        onChange={e => { setEmail(e.target.value); setError(''); }}
      />

      {/* Password field — translated */}
      <InputField
        label={t('password')}
        type="password"
        placeholder={t('passwordPlaceholder')}
        value={password}
        onChange={e => { setPassword(e.target.value); setError(''); }}
      />

      {error && (
        <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
          {error}
        </p>
      )}

      {/* Forgot password — translated */}
      <p
        onClick={() => navigate('/forgot-password')}
        style={{
          display: 'block',
          textAlign: isRTL ? 'left' : 'right', // flip side for Arabic
          color: '#4a7090', fontSize: 13,
          margin: '-8px 0 24px', cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        {t('forgotPassword')}
      </p>

      {/* Login button — translated, shows loading state */}
      <Button
        label={loading ? t('loggingIn') : t('loginButton')}
        onClick={handleLogin}
      />
    </div>
  );
}