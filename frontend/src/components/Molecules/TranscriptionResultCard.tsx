/**
 * TranscriptionResultCard.tsx — Updated with Extracted Entities display
 *
 * When analysis is done, shows:
 *   1. ExtractedEntitiesCard (incident type, severity, location, phones, etc.)
 *   2. Metrics (language, confidence, word count, translation)
 *   3. Summary
 *   4. Full transcription (with tabs if translation exists)
 */

import { useState, useEffect, useRef } from 'react';
import {
    CheckCircle, XCircle, Clock, Copy,
    RefreshCw, Globe, FileText,
    Download, Loader2, Target, Hash, Sparkles, Languages
} from 'lucide-react';
import { analysisApi } from '../../services/api';
import type { ExtractedEntities } from '../../services/api';
import { useTranslation } from '../../context/TranslationContext';
import ExtractedEntitiesCard from './ExtractedEntitiesCard';

// ── Types ──────────────────────────────────────────────────────
type StatusData = {
    id: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    errorMessage: string | null;
    transcription: string | null;
    translatedText: string | null;
    translationLang: string | null;
    summary: string | null;
    extractedEntities: ExtractedEntities | null;
    hasPdf: boolean;
    pdfGeneratedAt: string | null;
};

type Props = {
    analysisId: string;
    originalName: string;
    onReset?: () => void;
};

const LANG_NAMES: Record<string, string> = {
    fr: 'French',
    en: 'English',
    ar: 'Arabic',
};

const LANG_DIR: Record<string, 'rtl' | 'ltr'> = {
    ar: 'rtl',
    fr: 'ltr',
    en: 'ltr',
};

const POLL_INTERVAL = 3000;

// ── Component ──────────────────────────────────────────────────
export default function TranscriptionResultCard({ analysisId, originalName, onReset }: Props) {
    const { t, isRTL } = useTranslation();

    const [data, setData] = useState<StatusData | null>(null);
    const [fetchError, setFetchError] = useState('');
    const [copied, setCopied] = useState(false);
    const [copiedTranslation, setCopiedTranslation] = useState(false);
    const [showSummary, setShowSummary] = useState(true);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState('');
    const [activeTab, setActiveTab] = useState<'original' | 'translation'>('original');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const detectedLang = data?.summary?.match(/Language:\s*([^|]+)/i)?.[1]?.trim() ?? '';
    const langLabel = LANG_NAMES[detectedLang.toLowerCase()] ?? detectedLang ?? 'Auto';

    // Generate fake timestamp segments for display
    const generateFakeSegments = (text: string, durationSec: number) => {
        if (!text) return [];
        const words = text.split(/\s+/).filter(Boolean);
        const segments = [];
        const chunkSize = 35;
        const numChunks = Math.ceil(words.length / chunkSize);
        const timePerChunk = durationSec / Math.max(numChunks, 1);
        let currentSec = 0;
        for (let i = 0; i < words.length; i += chunkSize) {
            const chunkText = words.slice(i, i + chunkSize).join(' ');
            const mins = Math.floor(currentSec / 60).toString().padStart(2, '0');
            const secs = Math.floor(currentSec % 60).toString().padStart(2, '0');
            segments.push({ time: `${mins}:${secs}`, text: chunkText });
            currentSec += timePerChunk;
        }
        return segments;
    };

    const summaryRaw = data?.summary || '';
    const durMatch = summaryRaw.match(/Duration:\s*(\d+)m\s*(\d+)s/i);
    let durationStr = "0:00";
    let durationSec = 0;
    if (durMatch) {
        const m = parseInt(durMatch[1] || '0');
        const s = parseInt(durMatch[2] || '0');
        durationStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        durationSec = m * 60 + s;
    }

    const wordsMatch = summaryRaw.match(/~(\d+)\s*words/i);
    const wordCount = wordsMatch ? parseInt(wordsMatch[1]).toLocaleString() : (data?.transcription?.split(/\s+/).filter(Boolean).length.toLocaleString() || '0');
    const confMatch = summaryRaw.match(/Confidence:\s*([\d.]+)%/i);
    const confidence = confMatch ? `${confMatch[1]}%` : '—';

    const segments = generateFakeSegments(data?.transcription || '', durationSec || 120);

    const handleDownloadTxt = (text: string, suffix = '') => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${originalName}${suffix}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // ── Polling ────────────────────────────────────────────────
    const poll = async () => {
        try {
            const res = await analysisApi.getAnalysisStatus(analysisId);
            setData(res as StatusData);
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

    // ── PDF ────────────────────────────────────────────────────
    const handleDownloadPDF = async () => {
        setPdfLoading(true);
        setPdfError('');
        try { await analysisApi.downloadReport(analysisId, originalName); }
        catch (err: unknown) { setPdfError(err instanceof Error ? err.message : 'Download failed'); }
        finally { setPdfLoading(false); }
    };

    const handleGeneratePDF = async () => {
        setPdfLoading(true);
        setPdfError('');
        try { await analysisApi.generateReport(analysisId); await poll(); }
        catch (err: unknown) { setPdfError(err instanceof Error ? err.message : 'Generation failed'); }
        finally { setPdfLoading(false); }
    };

    // ── Retry ──────────────────────────────────────────────────
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

    const handleCopy = (text: string, setFlag: (v: boolean) => void) => {
        navigator.clipboard.writeText(text).then(() => {
            setFlag(true);
            setTimeout(() => setFlag(false), 2000);
        });
    };

    const status = data?.status ?? 'pending';
    const hasTranslation = !!(data?.translatedText && data?.translationLang);
    const translationLang = data?.translationLang || '';
    const translationDir = LANG_DIR[translationLang] || 'ltr';

    const STATUS_CFG = {
        pending: {
            label: `${t('pending')} — ${t('waitingWorker')}`,
            bg: '#fef9c3', color: '#a16207', border: '#fde68a',
            icon: <Clock size={20} color="#a16207" />,
        },
        processing: {
            label: `${t('processing')} — ${t('whisperRunning')}`,
            bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe',
            icon: <SpinnerIcon />,
        },
        done: {
            label: t('completed'),
            bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0',
            icon: <CheckCircle size={20} color="#15803d" />,
        },
        error: {
            label: t('failed'),
            bg: '#fff1f2', color: '#dc2626', border: '#fecaca',
            icon: <XCircle size={20} color="#dc2626" />,
        },
    } as const;

    const cfg = STATUS_CFG[status];

    const actionBtnStyle: React.CSSProperties = {
        background: 'white', color: '#1a3a6b',
        border: '1px solid #e2e8f0', borderRadius: 8,
        padding: '8px 14px', fontSize: 13, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 6,
        cursor: 'pointer',
    };

    // ── DONE STATE ─────────────────────────────────────────────
    if (status === 'done') {
        return (
            <div style={{ direction: isRTL ? 'rtl' : 'ltr', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

                {/* Top Header */}
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h3 style={{ margin: '0 0 10px 0', color: '#1a3a6b', fontSize: 20, fontWeight: 700 }}>{originalName}</h3>
                        <div style={{ color: '#64748b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Clock size={14} />
                            {new Date().toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            &nbsp;·&nbsp; Duration: {durationStr}
                        </div>
                        {hasTranslation && (
                            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, color: '#60a5fa', fontSize: 12 }}>
                                <Languages size={14} />
                                {t('translationAvailable') || 'Translation available:'} {LANG_NAMES[translationLang] || translationLang}
                            </div>
                        )}
                    </div>
                    <div style={{ background: '#dcfce7', color: '#16a34a', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={15} /> {t('completed')}
                    </div>
                </div>

                {/* ── Extracted Entities Card (NEW) ─────────────── */}
                {data?.extractedEntities && (
                    <ExtractedEntitiesCard entities={data.extractedEntities} />
                )}

                {/* 2-Column Layout: Metrics + Transcription */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 320px) 1fr', gap: 24, alignItems: 'start' }}>

                    {/* Left Column: Metrics */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <MetricCard icon={<Globe size={20} color="#1d4ed8" />} title="Detected Language" value={langLabel} />
                        <MetricCard icon={<Target size={20} color="#1d4ed8" />} title="Average Confidence" value={confidence} />
                        <MetricCard icon={<Hash size={20} color="#1d4ed8" />} title="Word Count" value={wordCount} />

                        {/* Translation info */}
                        {hasTranslation && (
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ background: '#dbeafe', borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Languages size={20} color="#1d4ed8" />
                                </div>
                                <div>
                                    <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 3 }}>Translation</div>
                                    <div style={{ color: '#1a3a6b', fontSize: 16, fontWeight: 700 }}>{LANG_NAMES[translationLang] || translationLang}</div>
                                </div>
                            </div>
                        )}

                        {/* Summary toggle */}
                        <button
                            onClick={() => setShowSummary(s => !s)}
                            style={{ background: '#4b6884', color: 'white', border: 'none', padding: '14px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                            <Sparkles size={16} /> {showSummary ? 'Hide Summary' : 'Show Summary'}
                        </button>

                        {showSummary && data?.summary && (
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px', fontSize: 13, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                                {data.summary.replace(/Duration:.*?\n\n/i, '')}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Transcription */}
                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>

                        {/* Tab bar */}
                        {hasTranslation && (
                            <div style={{ display: 'flex', borderBottom: '2px solid #f1f5f9', padding: '0 24px' }}>
                                <TabButton active={activeTab === 'original'} onClick={() => setActiveTab('original')}>
                                    <FileText size={15} /> {t('originalTranscription') || 'Original'}
                                </TabButton>
                                <TabButton active={activeTab === 'translation'} onClick={() => setActiveTab('translation')}>
                                    <Languages size={15} /> {LANG_NAMES[translationLang] || 'Translation'}
                                </TabButton>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ padding: '16px 24px', display: 'flex', gap: 12, borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                            {activeTab === 'original' ? (
                                <>
                                    <button onClick={() => handleCopy(data?.transcription || '', setCopied)} style={actionBtnStyle}>
                                        {copied ? <CheckCircle size={15} color="#16a34a" /> : <Copy size={15} />} Copy
                                    </button>
                                    <button onClick={() => handleDownloadTxt(data?.transcription || '')} style={actionBtnStyle}>
                                        <Download size={15} /> Download TXT
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => handleCopy(data?.translatedText || '', setCopiedTranslation)} style={actionBtnStyle}>
                                        {copiedTranslation ? <CheckCircle size={15} color="#16a34a" /> : <Copy size={15} />} Copy
                                    </button>
                                    <button onClick={() => handleDownloadTxt(data?.translatedText || '', `_${translationLang}`)} style={actionBtnStyle}>
                                        <Download size={15} /> Download TXT
                                    </button>
                                </>
                            )}
                            {data?.hasPdf ? (
                                <button onClick={handleDownloadPDF} disabled={pdfLoading} style={{ ...actionBtnStyle, opacity: pdfLoading ? 0.6 : 1 }}>
                                    {pdfLoading ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FileText size={15} />}
                                    Download PDF
                                </button>
                            ) : (
                                <button onClick={handleGeneratePDF} disabled={pdfLoading} style={{ ...actionBtnStyle, opacity: pdfLoading ? 0.6 : 1 }}>
                                    {pdfLoading ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FileText size={15} />}
                                    Generate PDF
                                </button>
                            )}
                        </div>

                        {/* Content */}
                        <div style={{ padding: '24px' }}>
                            {activeTab === 'original' ? (
                                <>
                                    <h4 style={{ color: '#1a3a6b', margin: '0 0 24px 0', fontSize: 16, fontWeight: 700 }}>
                                        {t('fullTranscription') || 'Full Transcription'}
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                        {segments.map((seg, i) => (
                                            <div key={i} style={{ display: 'flex', gap: 16 }}>
                                                <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, height: 'fit-content', flexShrink: 0 }}>
                                                    {seg.time}
                                                </div>
                                                <div style={{ color: '#334155', fontSize: 14, lineHeight: 1.7, marginTop: 1 }}>
                                                    {seg.text}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                        <Languages size={18} color="#1d4ed8" />
                                        <h4 style={{ color: '#1a3a6b', margin: 0, fontSize: 16, fontWeight: 700 }}>
                                            {LANG_NAMES[translationLang] || 'Translation'}
                                        </h4>
                                        <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                                            AI Translated
                                        </span>
                                    </div>
                                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Languages size={14} />
                                        {t('translationDisclaimer') || 'This is an AI-generated translation. It may contain inaccuracies.'}
                                    </div>
                                    <div
                                        dir={translationDir}
                                        style={{
                                            background: '#f8fafc', border: '1px solid #e2e8f0',
                                            borderRadius: 10, padding: '20px',
                                            fontSize: 14.5, lineHeight: 1.9, color: '#334155',
                                            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                            textAlign: translationDir === 'rtl' ? 'right' : 'left',
                                        }}
                                    >
                                        {data?.translatedText}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* PDF download button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 4, marginBottom: 8 }}>
                    <button
                        onClick={data?.hasPdf ? handleDownloadPDF : handleGeneratePDF}
                        disabled={pdfLoading}
                        style={{ background: '#0047ff', color: 'white', border: 'none', padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center', cursor: pdfLoading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(0,71,255,0.2)', opacity: pdfLoading ? 0.8 : 1 }}
                    >
                        {pdfLoading ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Download size={18} />}
                        {data?.hasPdf ? 'Download PDF Report' : 'Generate PDF Report'}
                    </button>
                    {pdfError && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{pdfError}</div>}
                </div>

                {onReset && (
                    <button onClick={onReset} style={{ width: '100%', padding: '13px', background: '#f8fafc', color: '#1a3a6b', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                        {t('uploadAnotherAudio') || 'Upload another audio'}
                    </button>
                )}
            </div>
        );
    }

    // ── NON-DONE STATES ────────────────────────────────────────
    return (
        <div style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>

            <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 18px',
                background: cfg.bg, border: `1px solid ${cfg.border}`,
                borderRadius: 12, marginBottom: 16,
            }}>
                {cfg.icon}
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: cfg.color }}>{cfg.label}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{originalName}</div>
                </div>
                {status === 'error' && (
                    <button onClick={handleRetry} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        <RefreshCw size={13} /> {t('retry')}
                    </button>
                )}
            </div>

            {(status === 'pending' || status === 'processing') && (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '20px 0' }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#1d4ed8', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                </div>
            )}

            {status === 'error' && data?.errorMessage && (
                <div style={{ padding: '12px 16px', background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 10, color: '#991b1b', fontSize: 13, marginBottom: 16, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                    {data.errorMessage}
                </div>
            )}

            {status === 'error' && onReset && (
                <button onClick={onReset} style={{ marginTop: 20, width: '100%', padding: '13px', background: '#f8fafc', color: '#1a3a6b', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    {t('uploadAnotherAudio')}
                </button>
            )}

            {fetchError && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 10 }}>⚠️ {fetchError}</p>}
        </div>
    );
}

// ── Sub-components ─────────────────────────────────────────────
function MetricCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: React.ReactNode }) {
    return (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ background: '#eff6ff', borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {icon}
            </div>
            <div>
                <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 3 }}>{title}</div>
                <div style={{ color: '#1a3a6b', fontSize: 16, fontWeight: 700 }}>{value}</div>
            </div>
        </div>
    );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '14px 20px', border: 'none', background: 'none',
                cursor: 'pointer', fontSize: 14, fontWeight: active ? 700 : 500,
                color: active ? '#1a3a6b' : '#94a3b8',
                borderBottom: active ? '2px solid #1a3a6b' : '2px solid transparent',
                marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.2s',
            }}
        >
            {children}
        </button>
    );
}

function SpinnerIcon() {
    return (
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2.5px solid #bfdbfe', borderTopColor: '#1d4ed8', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
    );
}