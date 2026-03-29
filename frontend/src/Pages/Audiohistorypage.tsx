/**
 * AudioHistoryPage.tsx
 *
 * Full audio analysis history for Clients.
 * Features:
 *  - List all audio analyses with status badges
 *  - Download PDF report
 *  - Re-generate PDF if missing
 *  - Retry failed analyses
 *  - Delete with confirmation
 *  - Search + filter by status
 *  - View full transcription inline
 *
 * Route: /client/history  (add to App.tsx)
 */

import { useState, useEffect, useCallback } from 'react';
import {
    FileAudio, Download, Trash2, RefreshCw, Search,
    ChevronDown, ChevronUp, FileText, Clock, CheckCircle,
    XCircle, Loader2, AlertTriangle, Eye, EyeOff,
    Filter, RotateCcw,
} from 'lucide-react';
import ClientTemplate from '../components/Templates/ClientTemplate';
import { analysisApi, type AnalysisRecord } from '../services/api';
import { useTranslation } from '../context/TranslationContext';

// ── Extended record with hasPdf ────────────────────────────────
interface AnalysisRecordExt extends AnalysisRecord {
    hasPdf?: boolean;
    pdfGeneratedAt?: string | null;
}

// ── Status config ──────────────────────────────────────────────
const STATUS_CFG: Record<string, { bg: string; color: string; icon: React.ReactNode; label?: string }> = {
    done: { bg: '#dcfce7', color: '#16a34a', icon: <CheckCircle size={14} /> },
    processing: { bg: '#dbeafe', color: '#2563eb', icon: <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> },
    pending: { bg: '#fef9c3', color: '#a16207', icon: <Clock size={14} /> },
    error: { bg: '#fee2e2', color: '#dc2626', icon: <XCircle size={14} /> },
};

// ── Delete Confirm Modal ───────────────────────────────────────
function DeleteModal({
    name, onCancel, onConfirm, deleting,
}: { name: string; onCancel: () => void; onConfirm: () => void; deleting: boolean }) {
    const { t } = useTranslation();
    return (
        <div
            onClick={onCancel}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
                zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'white', borderRadius: 16, padding: '36px 32px',
                    width: 420, textAlign: 'center',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                    animation: 'slideUp 0.18s ease',
                }}
            >
                <div style={{
                    width: 56, height: 56, borderRadius: '50%', background: '#fee2e2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                }}>
                    <Trash2 size={26} color="#dc2626" />
                </div>
                <h3 style={{ color: '#1a3a6b', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                    {t('deleteAnalysis') || 'Delete Analysis'}
                </h3>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
                    <strong>"{name}"</strong><br />
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>{t('deleteCannotUndo')}</span>
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={onCancel}
                        disabled={deleting}
                        style={{ flex: 1, padding: 12, borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#475569' }}
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={deleting}
                        style={{
                            flex: 1, padding: 12, borderRadius: 10, border: 'none',
                            background: deleting ? '#fca5a5' : '#dc2626', color: 'white',
                            cursor: deleting ? 'not-allowed' : 'pointer', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                    >
                        <Trash2 size={15} />
                        {deleting ? (t('deleting') || 'Deleting…') : t('delete')}
                    </button>
                </div>
            </div>
            <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
        </div>
    );
}

// ── Analysis Row ───────────────────────────────────────────────
function AnalysisRow({
    record,
    onDelete,
    onRetry,
    onPdfAction,
}: {
    record: AnalysisRecordExt;
    onDelete: (id: string, name: string) => void;
    onRetry: (id: string) => void;
    onPdfAction: (id: string, hasPdf: boolean, name: string) => void;
}) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const [showTranscription, setShowTranscription] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);

    const cfg = STATUS_CFG[record.status] || STATUS_CFG.pending;
    const sizeMB = (record.size / (1024 * 1024)).toFixed(2);
    const dateStr = new Date(record.createdAt).toLocaleDateString(undefined, {
        day: '2-digit', month: 'short', year: 'numeric',
    });
    const timeStr = new Date(record.createdAt).toLocaleTimeString(undefined, {
        hour: '2-digit', minute: '2-digit',
    });

    const handlePdf = async () => {
        setPdfLoading(true);
        await onPdfAction(record._id, !!record.hasPdf, record.originalName);
        setPdfLoading(false);
    };

    return (
        <div style={{
            background: 'white', borderRadius: 14,
            boxShadow: '0 2px 10px rgba(26,63,95,0.06)',
            border: '1px solid #e8f0fa',
            marginBottom: 12,
            overflow: 'hidden',
            transition: 'box-shadow 0.2s',
        }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 18px rgba(26,63,95,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 10px rgba(26,63,95,0.06)')}
        >
            {/* Main row */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr auto',
                alignItems: 'center',
                padding: '16px 20px',
                gap: 14,
            }}>
                {/* File icon */}
                <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: '#eff6ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <FileAudio size={22} color="#2563eb" />
                </div>

                {/* Main info */}
                <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{
                            fontWeight: 700, color: '#1a3a6b', fontSize: 15,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            maxWidth: 340,
                        }}>
                            {record.originalName}
                        </span>

                        {/* Status badge */}
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: cfg.bg, color: cfg.color,
                            padding: '3px 10px', borderRadius: 20,
                            fontSize: 12, fontWeight: 600,
                        }}>
                            {cfg.icon}
                            {record.status === 'done' ? t('completed') :
                                record.status === 'processing' ? t('processing') :
                                    record.status === 'error' ? t('failed') : t('pending')}
                        </span>

                        {/* PDF badge */}
                        {record.hasPdf && (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                background: '#f0fdf4', color: '#16a34a',
                                border: '1px solid #bbf7d0',
                                padding: '3px 8px', borderRadius: 20,
                                fontSize: 11, fontWeight: 600,
                            }}>
                                <FileText size={11} /> PDF
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 16, color: '#94a3b8', fontSize: 12 }}>
                        <span>📅 {dateStr} · {timeStr}</span>
                        <span>💾 {sizeMB} MB</span>
                        {record.status === 'done' && record.transcription && (
                            <span>
                                📝 ~{record.transcription.split(/\s+/).filter(Boolean).length.toLocaleString()} {t('wordsLabel')}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    {/* Expand / collapse row */}
                    <button
                        onClick={() => setExpanded(e => !e)}
                        style={iconBtn('#eff6ff', '#1a3a6b')}
                        title={expanded ? 'Collapse' : 'Expand'}
                    >
                        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>

                    {/* PDF download / generate */}
                    {record.status === 'done' && (
                        <button
                            onClick={handlePdf}
                            disabled={pdfLoading}
                            style={iconBtn(record.hasPdf ? '#dcfce7' : '#f1f5f9', record.hasPdf ? '#16a34a' : '#64748b')}
                            title={record.hasPdf ? t('downloadPdf') || 'Download PDF' : t('generatePdf') || 'Generate PDF'}
                        >
                            {pdfLoading
                                ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
                                : <Download size={15} />
                            }
                        </button>
                    )}

                    {/* Retry on error */}
                    {record.status === 'error' && (
                        <button
                            onClick={() => onRetry(record._id)}
                            style={iconBtn('#fff7ed', '#c2410c')}
                            title={t('retry')}
                        >
                            <RotateCcw size={15} />
                        </button>
                    )}

                    {/* Delete */}
                    <button
                        onClick={() => onDelete(record._id, record.originalName)}
                        style={iconBtn('#fee2e2', '#dc2626')}
                        title={t('delete')}
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            {/* Expanded section */}
            {expanded && (record.status === 'done' || record.status === 'error') && (
                <div style={{
                    borderTop: '1px solid #f1f5f9',
                    padding: '16px 20px',
                    background: '#fafcff',
                }}>
                    {/* Summary */}
                    {record.summary && (
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {t('summary')}
                            </div>
                            <div style={{
                                background: '#f0fdf4', border: '1px solid #bbf7d0',
                                borderRadius: 8, padding: '12px 14px',
                                fontSize: 13, color: '#166534', lineHeight: 1.6,
                                whiteSpace: 'pre-line',
                            }}>
                                {record.summary}
                            </div>
                        </div>
                    )}

                    {/* Transcription toggle */}
                    {record.transcription && (
                        <div>
                            <button
                                onClick={() => setShowTranscription(s => !s)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: '#1a3a6b', fontSize: 13, fontWeight: 600,
                                    padding: '4px 0', marginBottom: showTranscription ? 10 : 0,
                                }}
                            >
                                {showTranscription ? <EyeOff size={14} /> : <Eye size={14} />}
                                {showTranscription ? (t('hideTranscription') || 'Hide transcription') : (t('showTranscription') || 'Show transcription')}
                            </button>

                            {showTranscription && (
                                <div
                                    dir="auto"
                                    style={{
                                        background: 'white', border: '1px solid #e2e8f0',
                                        borderRadius: 8, padding: '14px 16px',
                                        maxHeight: 240, overflowY: 'auto',
                                        fontSize: 13.5, lineHeight: 1.8, color: '#334155',
                                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                    }}
                                >
                                    {record.transcription}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error detail */}
                    {record.status === 'error' && record.errorMessage && (
                        <div style={{
                            background: '#fff1f2', border: '1px solid #fecaca',
                            borderRadius: 8, padding: '12px 14px',
                            fontSize: 13, color: '#991b1b',
                            fontFamily: 'monospace',
                        }}>
                            {record.errorMessage}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────
export default function AudioHistoryPage() {
    const { t } = useTranslation();
    const [activePage, setActivePage] = useState('Transcriptions');

    const [records, setRecords] = useState<AnalysisRecordExt[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [notification, setNotification] = useState<{ msg: string; ok: boolean } | null>(null);

    const showNotif = (msg: string, ok = true) => {
        setNotification({ msg, ok });
        setTimeout(() => setNotification(null), 3500);
    };

    // ── Load data ────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await analysisApi.getMyAnalyses();
            // Only audio analyses
            const audioOnly = data.filter((r: AnalysisRecord) => r.type === 'audio');
            setRecords(audioOnly as AnalysisRecordExt[]);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // ── Delete ───────────────────────────────────────────────────
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await analysisApi.deleteAnalysis(deleteTarget.id);
            setRecords(prev => prev.filter(r => r._id !== deleteTarget.id));
            showNotif(t('deleteSuccess') || 'Analysis deleted.');
        } catch (err: unknown) {
            showNotif(err instanceof Error ? err.message : 'Delete failed', false);
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    // ── Retry ────────────────────────────────────────────────────
    const handleRetry = async (id: string) => {
        try {
            await analysisApi.retryAnalysis(id);
            setRecords(prev => prev.map(r => r._id === id ? { ...r, status: 'pending' as const } : r));
            showNotif(t('retryQueued') || 'Analysis re-queued.');
        } catch (err: unknown) {
            showNotif(err instanceof Error ? err.message : 'Retry failed', false);
        }
    };

    // ── PDF action (download or generate) ────────────────────────
    const handlePdfAction = async (id: string, hasPdf: boolean, name: string) => {
        if (hasPdf) {
            try {
                await analysisApi.downloadReport(id, name);
            } catch (err: unknown) {
                showNotif(err instanceof Error ? err.message : 'Download failed', false);
            }
        } else {
            try {
                await analysisApi.generateReport(id);
                setRecords(prev => prev.map(r => r._id === id
                    ? { ...r, hasPdf: true, pdfGeneratedAt: new Date().toISOString() }
                    : r
                ));
                showNotif(t('pdfGenerated') || 'PDF report generated!');
            } catch (err: unknown) {
                showNotif(err instanceof Error ? err.message : 'PDF generation failed', false);
            }
        }
    };

    // ── Filter ───────────────────────────────────────────────────
    const filtered = records.filter(r => {
        const matchSearch = !search || r.originalName.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'all' || r.status === filterStatus;
        return matchSearch && matchStatus;
    });

    // ── Stats ────────────────────────────────────────────────────
    const total = records.length;
    const doneCount = records.filter(r => r.status === 'done').length;
    const errorCount = records.filter(r => r.status === 'error').length;
    const pdfCount = records.filter(r => r.hasPdf).length;

    return (
        <ClientTemplate activePage={activePage} onNavigate={setActivePage}>
            <style>{`
                @keyframes spin    { to { transform: rotate(360deg); } }
                @keyframes fadeIn  { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
            `}</style>

            {/* Toast notification */}
            {notification && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 2000,
                    background: notification.ok ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${notification.ok ? '#bbf7d0' : '#fecaca'}`,
                    color: notification.ok ? '#166534' : '#dc2626',
                    padding: '12px 20px', borderRadius: 10,
                    fontWeight: 600, fontSize: 14,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                    animation: 'fadeIn 0.2s ease',
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    {notification.ok ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                    {notification.msg}
                </div>
            )}

            {/* Delete modal */}
            {deleteTarget && (
                <DeleteModal
                    name={deleteTarget.name}
                    onCancel={() => setDeleteTarget(null)}
                    onConfirm={handleConfirmDelete}
                    deleting={deleting}
                />
            )}

            {/* Page header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div>
                    <h2 style={{ color: '#1a3a6b', fontSize: 26, fontWeight: 800, margin: 0, marginBottom: 4 }}>
                        {t('audioHistory') || 'Audio History'}
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
                        {t('audioHistoryDesc') || 'All your audio transcriptions and reports'}
                    </p>
                </div>
                <button
                    onClick={load}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: '#f1f5f9', color: '#1a3a6b',
                        border: '1.5px solid #e2e8f0', borderRadius: 8,
                        padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                >
                    <RefreshCw size={15} /> {t('refresh')}
                </button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
                {[
                    { label: t('totalAnalyses') || 'Total', value: total, color: '#3b82f6', bg: '#eff6ff' },
                    { label: t('completed'), value: doneCount, color: '#16a34a', bg: '#f0fdf4' },
                    { label: t('failed'), value: errorCount, color: '#dc2626', bg: '#fef2f2' },
                    { label: t('pdfReports') || 'PDF Reports', value: pdfCount, color: '#7c3aed', bg: '#f5f3ff' },
                ].map(s => (
                    <div key={s.label} style={{
                        flex: 1, background: 'white', borderRadius: 12,
                        padding: '18px 20px',
                        border: '1px solid #e8f0fa',
                        boxShadow: '0 2px 8px rgba(26,63,95,0.05)',
                        borderLeft: `4px solid ${s.color}`,
                    }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#1a3a6b', lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Search + filter bar */}
            <div style={{
                background: 'white', borderRadius: 12,
                padding: '16px 20px', marginBottom: 20,
                boxShadow: '0 2px 8px rgba(26,63,95,0.05)',
                border: '1px solid #e8f0fa',
                display: 'flex', gap: 12, alignItems: 'center',
            }}>
                {/* Search */}
                <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12 }} />
                    <input
                        type="text"
                        placeholder={t('searchReports') || 'Search by filename…'}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 12px 10px 36px',
                            border: '1.5px solid #e2e8f0', borderRadius: 8,
                            fontSize: 13, outline: 'none', color: '#1e293b',
                        }}
                    />
                </div>

                {/* Status filter */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Filter size={14} color="#94a3b8" style={{ position: 'absolute', left: 12 }} />
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        style={{
                            padding: '10px 12px 10px 32px',
                            border: '1.5px solid #e2e8f0', borderRadius: 8,
                            fontSize: 13, outline: 'none', background: 'white',
                            cursor: 'pointer', color: '#1e293b',
                        }}
                    >
                        <option value="all">{t('allStatus')}</option>
                        <option value="done">{t('completed')}</option>
                        <option value="processing">{t('processing')}</option>
                        <option value="pending">{t('pending')}</option>
                        <option value="error">{t('failed')}</option>
                    </select>
                </div>

                <span style={{ color: '#94a3b8', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {t('showing')} <strong style={{ color: '#1a3a6b' }}>{filtered.length}</strong> {t('of')} {total}
                </span>
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                    <Loader2 size={40} style={{ animation: 'spin 0.8s linear infinite', marginBottom: 12 }} />
                    <p>{t('loading')}</p>
                </div>
            ) : error ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#dc2626', background: 'white', borderRadius: 12 }}>
                    <AlertTriangle size={40} style={{ marginBottom: 12 }} />
                    <p>{error}</p>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '80px', background: 'white',
                    borderRadius: 16, color: '#94a3b8',
                    border: '2px dashed #e2e8f0',
                }}>
                    <FileAudio size={56} style={{ opacity: 0.2, marginBottom: 16 }} />
                    <p style={{ fontSize: 16, fontWeight: 600 }}>
                        {search || filterStatus !== 'all'
                            ? (t('noResults') || 'No results found')
                            : (t('noAudioHistoryYet') || 'No audio analyses yet')
                        }
                    </p>
                    <p style={{ fontSize: 13, marginTop: 8 }}>
                        {!search && filterStatus === 'all' && (t('uploadFirstAudio') || 'Upload your first audio file to get started.')}
                    </p>
                </div>
            ) : (
                filtered.map(record => (
                    <AnalysisRow
                        key={record._id}
                        record={record}
                        onDelete={(id, name) => setDeleteTarget({ id, name })}
                        onRetry={handleRetry}
                        onPdfAction={handlePdfAction}
                    />
                ))
            )}
        </ClientTemplate>
    );
}

const iconBtn = (bg: string, color: string): React.CSSProperties => ({
    width: 34, height: 34, borderRadius: 8,
    background: bg, border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color, flexShrink: 0,
    transition: 'transform 0.15s',
});