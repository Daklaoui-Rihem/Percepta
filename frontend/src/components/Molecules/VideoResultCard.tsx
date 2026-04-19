/**
 * VideoResultCard.tsx
 * Displays video analysis results with:
 *  - Violence detected / No violence banner
 *  - Danger level indicator
 *  - Person count (avg/max from YOLO)
 *  - Incident list with severity badges
 *  - Keyframe gallery with actual images loaded via API
 */

import { useState, useEffect, useRef } from 'react';
import {
    CheckCircle, XCircle, Clock, Loader2,
    Users, Film, FileText, ShieldAlert, ShieldCheck,
    Shield, Flame, Skull, AlertTriangle, AlertOctagon,
    Swords, Lock, ShieldOff, Home, Bomb, Target, 
    Car, Crosshair, ShoppingCart, Briefcase, Hammer,
    Activity, ArrowRight
} from 'lucide-react';
import { analysisApi } from '../../services/api';
import type { VideoAnalysisResult, VideoIncident } from '../../services/api';
import { useTranslation } from '../../context/TranslationContext';

type Props = {
    analysisId: string;
    originalName: string;
    onReset?: () => void;
};

interface SeverityConfig {
    bg: string;
    color: string;
    dot: React.ReactNode;
    label: string;
    gradient: string;
}

const SEVERITY_CFG: Record<string, SeverityConfig> = {
    critical: { bg: '#fff1f2', color: '#dc2626', dot: <AlertOctagon size={14} />, label: 'CRITICAL', gradient: 'linear-gradient(135deg, #dc2626, #991b1b)' },
    high:     { bg: '#fff7ed', color: '#c2410c', dot: <AlertTriangle size={14} />, label: 'HIGH',     gradient: 'linear-gradient(135deg, #ea580c, #c2410c)' },
    medium:   { bg: '#fefce8', color: '#ca8a04', dot: <Activity size={14} />, label: 'MEDIUM',   gradient: 'linear-gradient(135deg, #eab308, #a16207)' },
    low:      { bg: '#f0fdf4', color: '#16a34a', dot: <ArrowRight size={14} />, label: 'LOW',      gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
};

const DANGER_CFG: Record<string, { bg: string; border: string; color: string; icon: React.ReactNode; label: string; glow: string }> = {
    safe:     { bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '#86efac', color: '#166534', icon: <ShieldCheck size={28} />, label: 'SAFE', glow: '0 0 20px rgba(34,197,94,0.15)' },
    low:      { bg: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '#a7f3d0', color: '#15803d', icon: <Shield size={28} />,      label: 'LOW RISK', glow: '0 0 20px rgba(34,197,94,0.1)' },
    medium:   { bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '#fcd34d', color: '#92400e', icon: <ShieldAlert size={28} />, label: 'MEDIUM RISK', glow: '0 0 20px rgba(245,158,11,0.15)' },
    high:     { bg: 'linear-gradient(135deg, #fff7ed, #fed7aa)', border: '#fb923c', color: '#9a3412', icon: <Flame size={28} />,       label: 'HIGH RISK', glow: '0 0 20px rgba(249,115,22,0.2)' },
    critical: { bg: 'linear-gradient(135deg, #fef2f2, #fecaca)', border: '#f87171', color: '#991b1b', icon: <Skull size={28} />,       label: 'CRITICAL', glow: '0 0 24px rgba(239,68,68,0.25)' },
};

const INCIDENT_ICONS: Record<string, React.ReactNode> = {
    Abuse: <ShieldOff size={18} />, Arrest: <Lock size={18} />, Arson: <Flame size={18} />, Assault: <Swords size={18} />,
    Burglary: <Home size={18} />, Explosion: <Bomb size={18} />, Fighting: <Swords size={18} />, Normal: <CheckCircle size={18} />,
    RoadAccident: <Car size={18} />, Robbery: <Target size={18} />, Shooting: <Crosshair size={18} />,
    Shoplifting: <ShoppingCart size={18} />, Stealing: <Briefcase size={18} />, Vandalism: <Hammer size={18} />,
    Anomaly: <AlertTriangle size={18} />,
};

const POLL_INTERVAL = 4000;

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

    // Build keyframe image URL via the API
    const getKeyframeImgUrl = (filename: string) => {
        const token = localStorage.getItem('token');
        return `${BASE_URL}/analyses/${analysisId}/keyframe/${filename}?token=${token}`;
    };

    // ── PENDING / PROCESSING ────────────────────────────────────
    if (status !== 'done' && status !== 'error') {
        return (
            <div style={{ padding: 32, textAlign: 'center' }}>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
                <Loader2 size={48} color="#2563eb" style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
                <p style={{ color: '#1a3a6b', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
                    {status === 'pending' ? 'Queued for processing…' : 'Analyzing video…'}
                </p>
                <p style={{ color: '#64748b', fontSize: 13 }}>
                    Detecting violence & counting people. This may take several minutes.
                </p>
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
                                }}>{i < stepIndex ? '✓' : i + 1}</div>
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
    const violenceDetected = videoData?.violence_detected ?? incidents.length > 0;
    const dangerLevel = videoData?.danger_level || (violenceDetected ? 'high' : 'safe');
    const dangerCfg = DANGER_CFG[dangerLevel] || DANGER_CFG.safe;
    const avgPeople = videoData?.avg_people || 0;
    const maxPeople = videoData?.max_people || 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <style>{`
                @keyframes spin{to{transform:rotate(360deg)}}
                @keyframes pulseGlow { 0%,100%{box-shadow: ${dangerCfg.glow}} 50%{box-shadow: none} }
                @keyframes fadeSlideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
            `}</style>

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

            {/* ⚡ Violence / Safety Banner */}
            <div style={{
                background: dangerCfg.bg,
                border: `2px solid ${dangerCfg.border}`,
                borderRadius: 14, padding: '20px 24px',
                display: 'flex', alignItems: 'center', gap: 18,
                animation: violenceDetected ? 'pulseGlow 2s ease-in-out infinite' : undefined,
                boxShadow: dangerCfg.glow,
            }}>
                <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: violenceDetected ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: dangerCfg.color, flexShrink: 0,
                }}>
                    {violenceDetected ? <ShieldAlert size={30} /> : <ShieldCheck size={30} />}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 20, color: dangerCfg.color, marginBottom: 4 }}>
                        {violenceDetected ? 'Violence Detected' : 'No Violence Detected'}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                        {videoData?.summary}
                    </div>
                </div>
                {/* Danger Level Badge */}
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0,
                }}>
                    <div style={{
                        background: dangerCfg.color, color: 'white',
                        padding: '6px 16px', borderRadius: 20,
                        fontSize: 12, fontWeight: 800, letterSpacing: '0.5px',
                    }}>
                        {dangerCfg.label}
                    </div>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>DANGER LEVEL</span>
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                    {
                        icon: violenceDetected
                            ? <ShieldAlert size={20} color="#dc2626" />
                            : <ShieldCheck size={20} color="#16a34a" />,
                        value: violenceDetected ? 'Yes' : 'No',
                        label: 'Violence',
                        accent: violenceDetected ? '#dc2626' : '#16a34a',
                    },
                    { icon: <Film size={20} color="#2563eb" />, value: String(keyframes.length), label: 'Keyframes', accent: '#2563eb' },
                    { icon: <Clock size={20} color="#7c3aed" />, value: secondsToHMS(videoData?.duration || 0), label: 'Duration', accent: '#7c3aed' },
                    { icon: <Users size={20} color="#0d9488" />, value: `${avgPeople}`, label: `Avg People (Max: ${maxPeople})`, accent: '#0d9488' },
                ].map(s => (
                    <div key={s.label} style={{
                        background: 'white', border: '1px solid #e2e8f0', borderRadius: 10,
                        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                        animation: 'fadeSlideIn 0.3s ease',
                    }}>
                        <div style={{ background: '#f8fafc', borderRadius: 8, padding: 8, flexShrink: 0 }}>{s.icon}</div>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: s.accent || '#1a3a6b', lineHeight: 1 }}>{s.value}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Incidents count + Danger level row for incidents */}
            {incidents.length > 0 && (
                <div style={{
                    background: 'white', border: '1px solid #e2e8f0', borderRadius: 12,
                    padding: '14px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
                }}>
                    <span style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 14 }}>
                        {incidents.length} Incident{incidents.length > 1 ? 's' : ''} Detected
                    </span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {['critical', 'high', 'medium', 'low'].map(sev => {
                            const count = incidents.filter(i => i.severity === sev).length;
                            if (count === 0) return null;
                            const cfg = SEVERITY_CFG[sev as keyof typeof SEVERITY_CFG];
                            return (
                                <span key={sev} style={{
                                    background: cfg.bg, color: cfg.color,
                                    padding: '3px 10px', borderRadius: 20,
                                    fontSize: 12, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', gap: 4,
                                }}>
                                    {cfg.dot} {count} {cfg.label}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', padding: 24 }}>
                {/* ── KEYFRAMES SECTION ── */}
                <h4 style={{ margin: '0 0 16px', color: '#1a3a6b', fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Film size={18} /> Keyframes Gallery ({keyframes.length})
                </h4>
                {keyframes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', background: '#f8fafc', borderRadius: 8 }}>
                        <Film size={32} style={{ marginBottom: 8 }} />
                        <p style={{ margin: 0, fontSize: 14 }}>No keyframes available</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
                        {keyframes.slice(0, 20).map((frame, i) => (
                            <div key={i} style={{
                                background: '#f8fafc', borderRadius: 10, overflow: 'hidden',
                                border: `1.5px solid ${frame.is_incident ? '#fecaca' : '#e2e8f0'}`,
                                boxShadow: frame.is_incident ? '0 2px 12px rgba(220,38,38,0.1)' : '0 2px 8px rgba(0,0,0,0.04)',
                                animation: `fadeSlideIn 0.3s ease ${i * 0.05}s both`,
                            }}>
                                {/* Keyframe Image */}
                                {frame.filename && (
                                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#0f172a' }}>
                                        <img
                                            src={getKeyframeImgUrl(frame.filename)}
                                            alt={`Frame at ${frame.timestamp_str}`}
                                            style={{
                                                width: '100%', height: '100%',
                                                objectFit: 'cover', display: 'block',
                                            }}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                        {/* Overlay badges */}
                                        <div style={{
                                            position: 'absolute', top: 0, left: 0, right: 0,
                                            background: frame.is_incident
                                                ? 'linear-gradient(to bottom, rgba(220,38,38,0.85), transparent)'
                                                : 'linear-gradient(to bottom, rgba(71,85,105,0.7), transparent)',
                                            padding: '6px 10px',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        }}>
                                            <span style={{ color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {frame.is_incident ? <><AlertOctagon size={12}/> INCIDENT</> : <><Film size={12}/> FRAME</>}
                                            </span>
                                            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: 600 }}>
                                                {frame.timestamp_str || secondsToHMS(frame.timestamp || 0)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {/* Frame info */}
                                <div style={{ padding: '10px 12px' }}>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: '#475569' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> {frame.people_count} people</span>
                                        {frame.is_incident && frame.category && (
                                            <span style={{
                                                background: '#fee2e2', color: '#dc2626',
                                                padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                            }}>
                                                {frame.category}
                                            </span>
                                        )}
                                        {frame.is_incident && frame.confidence && (
                                            <span style={{ color: '#94a3b8', fontSize: 11 }}>
                                                {Math.round(frame.confidence * 100)}%
                                            </span>
                                        )}
                                    </div>
                                    {frame.detections && frame.detections.length > 0 && (
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
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
                )}
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