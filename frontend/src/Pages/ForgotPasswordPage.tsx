import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound, Lock, CheckCircle, RefreshCw } from 'lucide-react';
import Logo from '../components/Atoms/Logo';
import LanguageSwitcher from '../components/Atoms/LanguageSwitcher';
import { useTranslation } from '../context/TranslationContext';
import { validatePassword } from '../utils/validatePassword';

// ── API calls for password reset ──────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function apiPost(path: string, body: object) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
}

// ── Step indicator ────────────────────────────────────────────
function StepDots({ step }: { step: 1 | 2 | 3 }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
            {[1, 2, 3].map(n => (
                <div key={n} style={{
                    width: n === step ? 28 : 10,
                    height: 10,
                    borderRadius: 5,
                    background: n === step ? '#1a3a6b' : n < step ? '#60a5fa' : '#d0e4f0',
                    transition: 'all 0.3s',
                }} />
            ))}
        </div>
    );
}

// ── 6-digit code input ────────────────────────────────────────
function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !value[i] && i > 0) {
            inputs.current[i - 1]?.focus();
        }
    };

    const handleChange = (i: number, char: string) => {
        if (!/^\d*$/.test(char)) return;
        const arr = value.split('');
        arr[i] = char.slice(-1);
        const next = arr.join('').padEnd(6, '').slice(0, 6);
        onChange(next.trimEnd());
        if (char && i < 5) {
            inputs.current[i + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        onChange(pasted);
        const lastIdx = Math.min(pasted.length, 5);
        inputs.current[lastIdx]?.focus();
    };

    return (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '24px 0' }}>
            {Array.from({ length: 6 }).map((_, i) => (
                <input
                    key={i}
                    ref={el => { inputs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value[i] || ''}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKey(i, e)}
                    onPaste={handlePaste}
                    style={{
                        width: 48, height: 56,
                        textAlign: 'center',
                        fontSize: 24, fontWeight: 800,
                        border: `2px solid ${value[i] ? '#1a3a6b' : '#d0e4f0'}`,
                        borderRadius: 10,
                        outline: 'none',
                        color: '#1a3a6b',
                        background: value[i] ? '#eff6ff' : 'white',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                    }}
                />
            ))}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const { t, isRTL } = useTranslation();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendTimer, setResendTimer] = useState(0);
    const [done, setDone] = useState(false);

    // Start a 60s countdown after sending a code
    const startResendTimer = () => {
        setResendTimer(60);
        const interval = setInterval(() => {
            setResendTimer(prev => {
                if (prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    // ── Step 1: Send code ──────────────────────────────────────
    const handleSendCode = async () => {
        if (!email.trim()) { setError(t('fillAllFields')); return; }

        setLoading(true);
        setError('');
        try {
            await apiPost('/auth/forgot-password', { email: email.toLowerCase() });
            setStep(2);
            startResendTimer();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t('sendingCode'));
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: Verify code ────────────────────────────────────
    const handleVerifyCode = async () => {
        if (code.length !== 6) { setError(t('fillAllFields')); return; }

        setLoading(true);
        setError('');
        try {
            await apiPost('/auth/verify-reset-code', { email, code });
            setStep(3);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t('invalidCredentials'));
        } finally {
            setLoading(false);
        }
    };

    // Resend code
    const handleResend = async () => {
        if (resendTimer > 0) return;
        setLoading(true);
        setError('');
        setCode('');
        try {
            await apiPost('/auth/forgot-password', { email });
            startResendTimer();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t('sendingCode'));
        } finally {
            setLoading(false);
        }
    };

    // ── Step 3: Reset password ─────────────────────────────────
    const handleFinalSubmit = async () => {
        if (!newPassword) { setError(t('fillAllFields')); return; }
        if (newPassword !== confirmPassword) { setError(t('passwordMismatch')); return; }
        if (!validatePassword(newPassword)) {
            setError(t('passwordPolicyError')); return;
        }

        setLoading(true);
        setError('');
        try {
            await apiPost('/auth/reset-password', { email, code, newPassword });
            setDone(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t('savingPassword'));
        } finally {
            setLoading(false);
        }
    };

    // ── Password strength indicator ────────────────────────────
    const getStrength = (p: string) => {
        if (!p) return null;
        if (p.length < 8) return { label: t('pwStrengthTooShort'), color: '#dc2626', width: '25%' };
        
        const hasUpper = /[A-Z]/.test(p);
        const hasLower = /[a-z]/.test(p);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(p);
        
        let score = 0;
        if (hasUpper) score++;
        if (hasLower) score++;
        if (hasSpecial) score++;

        if (score < 2) return { label: t('pwStrengthWeak'), color: '#f97316', width: '40%' };
        if (score === 2) return { label: t('pwStrengthFair'), color: '#eab308', width: '70%' };
        return { label: t('pwStrengthStrong'), color: '#16a34a', width: '100%' };
    };
    const strength = getStrength(newPassword);

    return (
        <div style={{
            minHeight: '100vh', width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #dff5ff 0%, #c6eaff 100%)',
            flexDirection: 'column', padding: '24px',
            position: 'relative', overflow: 'hidden',
            direction: isRTL ? 'rtl' : 'ltr',
        }}>
            {/* Background decorations */}
            <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, #6ab7e4 0%, transparent 70%)', opacity: 0.1, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, #3c4a9d 0%, transparent 70%)', opacity: 0.05, pointerEvents: 'none' }} />

            {/* Language switcher */}
            <div style={{ position: 'absolute', top: 20, right: isRTL ? 'auto' : 20, left: isRTL ? 20 : 'auto' }}>
                <LanguageSwitcher />
            </div>

            {/* Logo */}
            <div style={{ marginBottom: 28, zIndex: 1 }}>
                <Logo size="large" />
            </div>

            {/* Card */}
            <div style={{
                background: 'white', borderRadius: 16,
                padding: '40px 36px', width: '100%', maxWidth: 420,
                boxShadow: '0 10px 25px rgba(26, 63, 95, 0.1)',
                border: '1px solid rgba(198, 234, 255, 0.4)',
                zIndex: 1,
            }}>

                {/* Back to login */}
                <button
                    onClick={() => navigate('/login')}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                        color: '#4a7090', fontSize: 13, marginBottom: 20, padding: 0,
                    }}
                >
                    <ArrowLeft size={15} /> {t('backToLogin')}
                </button>

                {/* Step dots */}
                <StepDots step={step} />

                {/* ── SUCCESS ── */}
                {done ? (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                            <CheckCircle size={64} color="#16a34a" strokeWidth={1.5} />
                        </div>
                        <h2 style={{ color: '#1a3f5f', marginBottom: 12, fontSize: 22, fontWeight: 800 }}>
                            {t('passwordChanged')}
                        </h2>
                        <p style={{ color: '#555', fontSize: 14, marginBottom: 8 }}>
                            {t('passwordChangedDesc')}
                        </p>
                        <p style={{ color: '#60a5fa', fontSize: 13 }}>
                            {t('redirecting')}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* ── STEP 1: Email ── */}
                        {step === 1 && (
                            <>
                                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Mail size={28} color="#1a3a6b" strokeWidth={1.8} />
                                        </div>
                                    </div>
                                    <h2 style={{ color: '#1a3f5f', margin: '0 0 8px', fontSize: 22, fontWeight: 800 }}>
                                        {t('forgotPasswordTitle')}
                                    </h2>
                                    <p style={{ color: '#555', fontSize: 14, margin: 0 }}>
                                        {t('forgotPasswordDesc')}
                                    </p>
                                </div>

                                <div style={{ marginBottom: 20 }}>
                                    <label style={labelStyle}>{t('emailAddress')}</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => { setEmail(e.target.value); setError(''); }}
                                        onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                                        placeholder={t('emailPlaceholder')}
                                        style={inputStyle}
                                        autoFocus
                                    />
                                </div>

                                {error && <p style={errorStyle}>{error}</p>}

                                <button
                                    onClick={handleSendCode}
                                    disabled={loading}
                                    style={{ ...btnStyle, background: loading ? '#93c5fd' : '#1a3a6b' }}
                                >
                                    {loading ? t('sendingCode') : t('sendCode')}
                                </button>
                            </>
                        )}

                        {/* ── STEP 2: Code verification ── */}
                        {step === 2 && (
                            <>
                                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <KeyRound size={28} color="#1a3a6b" strokeWidth={1.8} />
                                        </div>
                                    </div>
                                    <h2 style={{ color: '#1a3f5f', margin: '0 0 8px', fontSize: 22, fontWeight: 800 }}>
                                        {t('verificationTitle')}
                                    </h2>
                                    <p style={{ color: '#555', fontSize: 14, margin: 0 }}>
                                        {t('verificationDesc')}
                                    </p>
                                    <p style={{ color: '#1a3a6b', fontSize: 14, fontWeight: 700, margin: '4px 0 0' }}>
                                        {email}
                                    </p>
                                </div>

                                <CodeInput value={code} onChange={v => { setCode(v); setError(''); }} />

                                {error && <p style={errorStyle}>{error}</p>}

                                <button
                                    onClick={handleVerifyCode}
                                    disabled={loading || code.length < 6}
                                    style={{
                                        ...btnStyle,
                                        background: (loading || code.length < 6) ? '#93c5fd' : '#1a3a6b',
                                        cursor: (loading || code.length < 6) ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {loading ? t('verifying') : t('verifyCode')}
                                </button>

                                {/* Resend */}
                                <div style={{ textAlign: 'center', marginTop: 16 }}>
                                    <button
                                        onClick={handleResend}
                                        disabled={resendTimer > 0 || loading}
                                        style={{
                                            background: 'none', border: 'none', cursor: resendTimer > 0 ? 'default' : 'pointer',
                                            color: resendTimer > 0 ? '#aaa' : '#1a3a6b',
                                            fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                                            margin: '0 auto',
                                        }}
                                    >
                                        <RefreshCw size={13} />
                                        {resendTimer > 0
                                            ? `${t('resendIn')} ${resendTimer}s`
                                            : t('resendCode')}
                                    </button>
                                </div>

                                {/* Change email */}
                                <div style={{ textAlign: 'center', marginTop: 8 }}>
                                    <button
                                        onClick={() => { setStep(1); setCode(''); setError(''); }}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: '#4a7090', fontSize: 13,
                                        }}
                                    >
                                        {t('changeEmail')}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ── STEP 3: New password ── */}
                        {step === 3 && (
                            <>
                                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Lock size={28} color="#1a3a6b" strokeWidth={1.8} />
                                        </div>
                                    </div>
                                    <h2 style={{ color: '#1a3f5f', margin: '0 0 8px', fontSize: 22, fontWeight: 800 }}>
                                        {t('newPasswordTitle')}
                                    </h2>
                                    <p style={{ color: '#555', fontSize: 14, margin: 0 }}>
                                        {t('newPasswordDesc')}
                                    </p>
                                </div>

                                <div style={{ marginBottom: 16 }}>
                                    <label style={labelStyle}>{t('newPassword')}</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => { setNewPassword(e.target.value); setError(''); }}
                                        placeholder={t('newPasswordPlaceholder')}
                                        style={inputStyle}
                                        autoFocus
                                    />
                                    {/* Strength bar */}
                                    {strength && (
                                        <div style={{ marginTop: 8 }}>
                                            <div style={{ background: '#e5e7eb', borderRadius: 4, height: 5 }}>
                                                <div style={{ width: strength.width, background: strength.color, height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
                                            </div>
                                            <span style={{ fontSize: 12, color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                                        </div>
                                    )}
                                </div>

                                <div style={{ marginBottom: 20 }}>
                                    <label style={labelStyle}>{t('confirmPassword')}</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                                        onKeyDown={e => e.key === 'Enter' && handleFinalSubmit()}
                                        placeholder={t('repeatPassword')}
                                        style={{
                                            ...inputStyle,
                                            borderColor: confirmPassword && confirmPassword !== newPassword ? '#dc2626' : '#d0e4f0',
                                        }}
                                    />
                                    {confirmPassword && confirmPassword !== newPassword && (
                                        <p style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{t('passwordMismatch')}</p>
                                    )}
                                </div>

                                {error && <p style={errorStyle}>{error}</p>}

                                <button
                                    onClick={handleFinalSubmit}
                                    disabled={loading}
                                    style={{ ...btnStyle, background: loading ? '#93c5fd' : '#1a3a6b' }}
                                >
                                    {loading ? t('savingPassword') : t('savePassword')}
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>

            <p style={{ textAlign: 'center', color: '#666', fontSize: 13, marginTop: 20, zIndex: 1 }}>
                {t('copyright')}
            </p>
        </div>
    );
}

// ── Shared styles ─────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
    display: 'block', color: '#1a3a6b',
    fontSize: 13, fontWeight: 600, marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px',
    border: '1.5px solid #d0e4f0', borderRadius: 8,
    fontSize: 15, outline: 'none', boxSizing: 'border-box',
    color: '#333', background: 'white',
};

const btnStyle: React.CSSProperties = {
    width: '100%', padding: '14px',
    border: 'none', borderRadius: 8,
    color: 'white', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', marginTop: 4,
};

const errorStyle: React.CSSProperties = {
    color: '#dc2626', fontSize: 13,
    background: '#fff5f5', border: '1px solid #fecaca',
    borderRadius: 6, padding: '8px 12px', marginBottom: 12,
};