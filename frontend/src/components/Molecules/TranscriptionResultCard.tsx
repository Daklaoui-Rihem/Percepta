/**
 * TranscriptionResultCard.tsx
 *
 * Polls /api/analyses/:id/status every 3 seconds until the job
 * reaches a terminal state (done or error), then displays:
 *   - Detected language badge
 *   - Collapsible summary
 *   - Full transcription with copy / expand
 *   - Word count + duration
 *   - Retry button on error
 *
 * Place at: frontend/src/components/Molecules/TranscriptionResultCard.tsx
 */

import { useState, useEffect, useRef } from 'react';
import {
    CheckCircle, XCircle, Clock, Copy,
    ChevronDown, ChevronUp, RefreshCw, Globe,
} from 'lucide-react';
import { analysisApi } from '../../services/api';
import { useTranslation } from '../../context/TranslationContext';

// ── Types ──────────────────────────────────────────────────────
type StatusData = {
    id: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    errorMessage: string | null;
    transcription: string | null;
    summary: string | null;
};

type Props = {
    analysisId: string;
    originalName: string;
    onReset?: () => void;
};

// ── Language display names ─────────────────────────────────────
const LANG_NAMES: Record<string, string> = {
    fr: '🇫🇷 French',
    en: '🇬🇧 English',
    ar: '🇹🇳 Arabic',
};

// How often to poll (ms)
const POLL_INTERVAL = 3000;

// ── Component ───────────────────────────────────────────────────
export default function TranscriptionResultCard({ analysisId, originalName, onReset }: Props) {
    const { t, isRTL } = useTranslation();

    const [data, setData] = useState<StatusData | null>(null);
    const [fetchError, setFetchError] = useState('');
    const [copied, setCopied] = useState(false);
    const [showSummary, setShowSummary] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Detect language from summary line "Language detected: French"
    const detectedLang = data?.summary?.match(/Language detected:\s*(\w+)/i)?.[1]?.toLowerCase() ?? '';
    const langLabel = LANG_NAMES[detectedLang] ?? '';

    // ── Polling ─────────────────────────────────────────────────
    const poll = async () => {
        try {
            const res = await analysisApi.getAnalysisStatus(analysisId);
            setData(res);
            if (res.status === 'done' || res.status === 'error') {
                if (intervalRef.current) clearInterval(intervalRef.current);
            }
        } catch (err: unknown) {
            setFetchError(err instanceof Error ? err.message : 'Polling failed');
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
    };

    useEffect(() => {
        poll();
        intervalRef.current = setInterval(poll, POLL_INTERVAL);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [analysisId]);

    // ── Retry ───────────────────────────────────────────────────
    const handleRetry = async () => {
        try {
            await analysisApi.retryAnalysis(analysisId);
            setData(prev => prev ? { ...prev, status: 'pending', errorMessage: null } : null);
            setFetchError('');
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(poll, POLL_INTERVAL);
            poll();
        } catch (err: unknown) {
            setFetchError(err instanceof Error ? err.message : 'Retry failed');
        }
    };

    // ── Copy transcript ──────────────────────────────────────────
    const handleCopy = () => {
        if (!data?.transcription) return;
        navigator.clipboard.writeText(data.transcription).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // ── Status config ─────────────────────────────────────────────
    const status = data?.status ?? 'pending';

    const STATUS_CFG = {
        pending: {
            label: `${t('pending')} — waiting for worker…`,
            bg: '#fef9c3', color: '#a16207', border: '#fde68a',
            icon: <Clock size={20} color="#a16207" />,
            spinner: true,
        },
        processing: {
            label: `${t('processing')} — Whisper is running…`,
            bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe',
            icon: <SpinnerIcon />,
            spinner: false,
        },
        done: {
            label: t('completed'),
            bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0',
            icon: <CheckCircle size={20} color="#15803d" />,
            spinner: false,
        },
        error: {
            label: t('failed'),
            bg: '#fff1f2', color: '#dc2626', border: '#fecaca',
            icon: <XCircle size={20} color="#dc2626" />,
            spinner: false,
        },
    } as const;

    const cfg = STATUS_CFG[status];

    return (
        <div style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
            `}</style>

            {/* ── Status banner ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 18px',
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 12,
                marginBottom: 16,
            }}>
                {cfg.icon}
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: cfg.color }}>{cfg.label}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{originalName}</div>
                </div>

                {/* Language badge — shown when done */}
                {status === 'done' && langLabel && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: '#eff6ff', color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600,
                    }}>
                        <Globe size={12} /> {langLabel}
                    </div>
                )}

                {/* Retry on error */}
                {status === 'error' && (
                    <button onClick={handleRetry} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: '#dc2626', color: 'white',
                        border: 'none', borderRadius: 8,
                        padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>
                        <RefreshCw size={13} /> Retry
                    </button>
                )}
            </div>

            {/* ── Pending/processing animated dots ── */}
            {(status === 'pending' || status === 'processing') && (
                <div style={{
                    display: 'flex', gap: 6, justifyContent: 'center',
                    padding: '20px 0',
                }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: '#1d4ed8',
                            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }} />
                    ))}
                </div>
            )}

            {/* ── Error detail ── */}
            {status === 'error' && data?.errorMessage && (
                <div style={{
                    padding: '12px 16px',
                    background: '#fff1f2', border: '1px solid #fecaca',
                    borderRadius: 10, color: '#991b1b',
                    fontSize: 13, marginBottom: 16,
                    fontFamily: 'monospace', whiteSpace: 'pre-wrap',
                }}>
                    {data.errorMessage}
                </div>
            )}

            {/* ── Summary (collapsible) ── */}
            {status === 'done' && data?.summary && (
                <div style={{
                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                    borderRadius: 12, marginBottom: 16, overflow: 'hidden',
                }}>
                    <button
                        onClick={() => setShowSummary(s => !s)}
                        style={{
                            width: '100%', display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', padding: '12px 18px',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#166534', fontWeight: 700, fontSize: 14,
                        }}
                    >
                        <span>📝 Summary</span>
                        {showSummary ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {showSummary && (
                        <div style={{
                            padding: '0 18px 14px',
                            color: '#166534', fontSize: 13, lineHeight: 1.7,
                            whiteSpace: 'pre-line',
                        }}>
                            {data.summary}
                        </div>
                    )}
                </div>
            )}

            {/* ── Transcription ── */}
            {status === 'done' && data?.transcription && (
                <div style={{
                    background: 'white', border: '1px solid #e2e8f0',
                    borderRadius: 12, overflow: 'hidden',
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', padding: '12px 18px',
                        borderBottom: '1px solid #f1f5f9',
                    }}>
                        <span style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 14 }}>
                            Full Transcription
                        </span>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setExpanded(e => !e)} style={pillBtn}>
                                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                {expanded ? 'Collapse' : 'Expand'}
                            </button>
                            <button onClick={handleCopy} style={pillBtn}>
                                <Copy size={13} />
                                {copied ? '✓ Copied' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div style={{
                        padding: '16px 18px',
                        maxHeight: expanded ? 'none' : 280,
                        overflowY: expanded ? 'visible' : 'auto',
                        fontSize: 14, lineHeight: 1.85,
                        color: '#334155',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        direction: 'auto',        // browser detects RTL (Arabic)
                    }}>
                        {data.transcription}
                    </div>

                    {/* Footer stats */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '10px 18px',
                        borderTop: '1px solid #f1f5f9',
                        fontSize: 12, color: '#94a3b8',
                    }}>
                        <span>
                            {data.transcription.length.toLocaleString()} characters
                        </span>
                        <span>
                            ~{data.transcription.split(/\s+/).filter(Boolean).length.toLocaleString()} words
                        </span>
                    </div>
                </div>
            )}

            {/* ── Upload another ── */}
            {(status === 'done' || status === 'error') && onReset && (
                <button onClick={onReset} style={{
                    marginTop: 20, width: '100%', padding: '13px',
                    background: '#f8fafc', color: '#1a3a6b',
                    border: '1.5px solid #e2e8f0', borderRadius: 10,
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                    {t('uploadAnotherAudio')}
                </button>
            )}

            {/* ── Polling error ── */}
            {fetchError && (
                <p style={{ color: '#dc2626', fontSize: 12, marginTop: 10 }}>
                    ⚠️ {fetchError}
                </p>
            )}
        </div>
    );
}

// ── Inline spinner icon ──────────────────────────────────────────
function SpinnerIcon() {
    return (
        <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: '2.5px solid #bfdbfe',
            borderTopColor: '#1d4ed8',
            animation: 'spin 0.8s linear infinite',
            flexShrink: 0,
        }} />
    );
}

// ── Shared button style ──────────────────────────────────────────
const pillBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5,
    background: '#f1f5f9', color: '#475569',
    border: '1px solid #e2e8f0', borderRadius: 6,
    padding: '5px 10px', fontSize: 12,
    fontWeight: 600, cursor: 'pointer',
};