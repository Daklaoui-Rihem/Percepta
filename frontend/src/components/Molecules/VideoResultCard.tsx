/**
 * VideoResultCard.tsx
 * Displays video analysis results with incident list and keyframe gallery.
 */

import { useState, useEffect, useRef } from 'react';
import {
    CheckCircle, XCircle, Clock, Loader2,
    AlertTriangle, Users, Film, Eye, RefreshCw,
    Download, FileText
} from 'lucide-react';
import { analysisApi } from '../../services/api';
import type { VideoAnalysisResult, VideoIncident } from '../../services/api';
import { useTranslation } from '../../context/TranslationContext';

type Props = {
    analysisId: string;
    originalName: string;
    onReset?: () => void;
};

const SEVERITY_CFG = {
    critical: { bg: '#fff1f2', color: '#dc2626', dot: '🔴', label: 'CRITICAL' },
    high: { bg: '#fff7ed', color: '#c2410c', dot: '🟠', label: 'HIGH' },
    medium: { bg: '#fefce8', color: '#ca8a04', dot: '🟡', label: 'MEDIUM' },
    low: { bg: '#f0fdf4', color: '#16a34a', dot: '🟢', label: 'LOW' },
} as const;

const INCIDENT_ICONS: Record<string, string> = {
    assault: '⚔️',
    fire: '🔥',
    crowd: '👥',
    suspicious: '👁',
    fall: '🩺',
};

const POLL_INTERVAL = 4000;

export default function VideoResultCard({ analysisId, originalName, onReset }: Props) {
    const { t } = useTranslation();

    const [status, setStatus] = useState<'pending' | 'processing' | 'done' | 'error'>('pending');
    const [videoData, setVideoData] = useState<VideoAnalysisResult | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [pdfLoading, setPdfLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'incidents' | 'frames'>('incidents');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const poll = async () => {
        try {
            const res = await analysisApi.getAnalysisStatus(analysisId);
            setStatus(res.status);

            if (res.status === 'done') {
                if (intervalRef.current) clearInterval(intervalRef.current);
                // Fetch video-specific data
                const vr = await analysisApi.getVideoResult(analysisId);
                setVideoData(vr.videoAnalysisData);
            } else if (res.status === 'error') {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setErrorMsg(res.errorMessage || 'Processing failed');
            }
        } catch (err) {
            console.warn('[VideoPoll] error', err);
        }
    };

    useEffect(() => {
        poll();
        intervalRef.current = setInterval(poll, POLL_INTERVAL);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [analysisId]);

    const handleDownloadPDF = async () => {
        setPdfLoading(true);
        try { await analysisApi.downloadReport(analysisId, originalName); }
        catch (err) { console.error(err); }
        finally { setPdfLoading(false); }
    };

    // ── PENDING / PROCESSING ────────────────────────────────────
    if (status !== 'done' && status !== 'error') {
        return (
            <div style={{ padding: 32, textAlign: 'center' }}>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
                <Loader2 size={48} color="#2563eb" style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
                <p style={{ color: '#1a3a6b', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
                    {status === 'pending' ? 'Queued for processing…' : 'Analyzing video with YOLO…'}
                </p>
                <p style={{ color: '#64748b', fontSize: 13 }}>This may take several minutes for long videos.</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                    {['Uploading', 'Queued', 'Detecting', 'Reporting'].map((step, i) => {
                        const stepIndex = status === 'pending' ? 1 : 2;
                        return (
                            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    background: i < stepIndex ? '#22c55e' : i === stepIndex ? '#2563eb' : '#e2e8f0',
                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 12, fontWeight: 700,
                                }}>
                                    {i < stepIndex ? '✓' : i + 1}
                                </div>
                                {i < 3 && <div style={{ width: 32, height: 2, background: i < stepIndex ? '#22c55e' : '#e2e8f0' }} />}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ── ERROR ────────────────────────────────────────────────────
    if (status === 'error') {
        return (
            <div style={{ padding: 24 }}>
                <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 10, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <XCircle size={18} color="#dc2626" />
                        <span style={{ color: '#dc2626', fontWeight: 700 }}>Analysis failed</span>
                    </div>
                    <p style={{ color: '#991b1b', fontSize: 13, fontFamily: 'monospace' }}>{errorMsg}</p>
                </div>
                {onReset && (
                    <button onClick={onReset} style={{ marginTop: 16, width: '100%', padding: 12, background: '#f8fafc', color: '#1a3a6b', border: '1.5px solid #e2e8f0', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                        Upload another video
                    </button>
                )}
            </div>
        );
    }

    // ── DONE ─────────────────────────────────────────────────────
    const incidents = videoData?.incidents || [];
    const keyframes = videoData?.keyframes || [];
    const hasCritical = incidents.some(i => i.severity === 'critical');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

            {/* Header */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 style={{ margin: '0 0 6px', color: '#1a3a6b', fontSize: 18, fontWeight: 700 }}>{originalName}</h3>
                    <div style={{ color: '#64748b', fontSize: 13 }}>
                        {videoData?.resolution} · {videoData?.fps} fps · {secondsToHMS(videoData?.duration || 0)}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={13} /> Completed
                    </span>
                    <button onClick={handleDownloadPDF} disabled={pdfLoading} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a3a6b', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        {pdfLoading ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FileText size={14} />}
                        PDF Report
                    </button>
                </div>
            </div>

            {/* Incident banner */}
            <div style={{
                background: incidents.length === 0 ? '#f0fdf4' : hasCritical ? '#fff1f2' : '#fff7ed',
                border: `1px solid ${incidents.length === 0 ? '#bbf7d0' : hasCritical ? '#fecaca' : '#fed7aa'}`,
                borderRadius: 12, padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 16,
            }}>
                {incidents.length === 0 ? <CheckCircle size={28} color="#16a34a" /> : <AlertTriangle size={28} color={hasCritical ? '#dc2626' : '#c2410c'} />}
                <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: incidents.length === 0 ? '#16a34a' : hasCritical ? '#dc2626' : '#c2410c' }}>
                        {incidents.length === 0 ? 'No incidents detected' : `${incidents.length} incident${incidents.length > 1 ? 's' : ''} detected`}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{videoData?.summary}</div>
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                    { icon: <AlertTriangle size={20} color="#dc2626" />, value: String(incidents.length), label: 'Incidents' },
                    { icon: <Film size={20} color="#2563eb" />, value: String(keyframes.length), label: 'Keyframes' },
                    { icon: <Clock size={20} color="#7c3aed" />, value: secondsToHMS(videoData?.duration || 0), label: 'Duration' },
                    { icon: <Users size={20} color="#0d9488" />, value: String(videoData?.avg_people || 0), label: 'Avg people' },
                ].map(s => (
                    <div key={s.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: '#f8fafc', borderRadius: 8, padding: 8, flexShrink: 0 }}>{s.icon}</div>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#1a3a6b', lineHeight: 1 }}>{s.value}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', borderBottom: '2px solid #f1f5f9' }}>
                    {([['incidents', `Incidents (${incidents.length})`], ['frames', `Keyframes (${keyframes.length})`]] as const).map(([tab, label]) => (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '14px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: activeTab === tab ? 700 : 500, color: activeTab === tab ? '#1a3a6b' : '#94a3b8', borderBottom: activeTab === tab ? '2px solid #1a3a6b' : '2px solid transparent', marginBottom: -2 }}>
                            {label}
                        </button>
                    ))}
                </div>

                <div style={{ padding: 20 }}>
                    {activeTab === 'incidents' && (
                        incidents.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                                <CheckCircle size={40} color="#16a34a" style={{ marginBottom: 12 }} />
                                <p style={{ fontSize: 15, fontWeight: 600 }}>No incidents detected</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {incidents.map((inc, i) => {
                                    const sev = SEVERITY_CFG[inc.severity] || SEVERITY_CFG.medium;
                                    return (
                                        <div key={i} style={{ background: sev.bg, border: `1px solid ${sev.color}30`, borderLeft: `4px solid ${sev.color}`, borderRadius: 8, padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr auto' }}>
                                            <div>
                                                <div style={{ fontWeight: 700, color: sev.color, fontSize: 15, marginBottom: 4 }}>
                                                    {INCIDENT_ICONS[inc.type] || '⚠️'} {inc.type?.charAt(0).toUpperCase() + inc.type?.slice(1) || 'Incident'}
                                                </div>
                                                <div style={{ fontSize: 12, color: '#64748b' }}>
                                                    Time: {inc.timestamp_str || secondsToHMS(inc.timestamp || 0)}
                                                    {inc.details && <span> · {inc.details}</span>}
                                                </div>
                                            </div>
                                            <span style={{ background: sev.color, color: 'white', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, height: 'fit-content', alignSelf: 'center' }}>
                                                {sev.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}

                    {activeTab === 'frames' && (
                        keyframes.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                                <Film size={40} style={{ marginBottom: 12 }} />
                                <p>No keyframes available</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
                                {keyframes.slice(0, 10).map((frame, i) => (
                                    <div key={i} style={{ background: '#f8fafc', borderRadius: 8, overflow: 'hidden', border: `1px solid ${frame.is_incident ? '#fecaca' : '#e2e8f0'}` }}>
                                        <div style={{ background: frame.is_incident ? '#dc2626' : '#475569', padding: '4px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: 'white', fontSize: 11, fontWeight: 600 }}>
                                                {frame.is_incident ? '⚠ INCIDENT' : '⬛ FRAME'}
                                            </span>
                                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>
                                                {frame.timestamp_str || secondsToHMS(frame.timestamp || 0)}
                                            </span>
                                        </div>
                                        <div style={{ padding: '8px 10px' }}>
                                            <div style={{ fontSize: 12, color: '#475569' }}>
                                                👥 {frame.people_count} people · {frame.detections?.length || 0} detections
                                            </div>
                                            {frame.detections && frame.detections.length > 0 && (
                                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                                                    {frame.detections.slice(0, 4).map((d, j) => (
                                                        <span key={j} style={{ background: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>
                                                            {d.class} {Math.round(d.confidence * 100)}%
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>

            {onReset && (
                <button onClick={onReset} style={{ width: '100%', padding: 12, background: '#f8fafc', color: '#1a3a6b', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    Upload another video
                </button>
            )}
        </div>
    );
}

function secondsToHMS(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}