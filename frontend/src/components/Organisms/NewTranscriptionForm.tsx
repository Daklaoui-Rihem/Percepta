/**
 * NewTranscriptionForm.tsx — Updated with optional translation language selector
 */

import { useState, useRef } from 'react';
import { Home, Music, AudioLines, XCircle, FolderOpen, Globe, ChevronDown, Ban, Languages } from 'lucide-react';
import Breadcrumb from '../Atoms/Breadcrumb';
import FileDropZone from '../Molecules/FileDropZone';
import TranscriptionResultCard from '../Molecules/TranscriptionResultCard';
import { useTranslation } from '../../context/TranslationContext';
import { analysisApi } from '../../services/api';

const TRANSLATION_LANGUAGES = [
    { code: '', label: 'No translation', icon: <Ban size={18} /> },
    { code: 'fr', label: 'French', icon: <Languages size={18} /> },
    { code: 'en', label: 'English', icon: <Languages size={18} /> },
    { code: 'ar', label: 'Arabic', icon: <Languages size={18} /> },
];

export default function NewTranscriptionForm() {
    const { t } = useTranslation();

    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [translateTo, setTranslateTo] = useState('');
    const [langDropdownOpen, setLangDropdownOpen] = useState(false);

    // After upload: store analysisId → switch to result card
    const [analysisId, setAnalysisId] = useState<string | null>(null);
    const [uploadedName, setUploadedName] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedLang = TRANSLATION_LANGUAGES.find(l => l.code === translateTo) || TRANSLATION_LANGUAGES[0];

    const handleSubmit = async () => {
        if (!file) return;
        setUploading(true);
        setError('');
        try {
            const res = await analysisApi.uploadAudio(file, translateTo || undefined);
            setAnalysisId(res.analysis.id);
            setUploadedName(res.analysis.originalName);
            setFile(null);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t('uploadFailed'));
        } finally {
            setUploading(false);
        }
    };

    const handleReset = () => {
        setAnalysisId(null);
        setUploadedName('');
        setFile(null);
        setError('');
        setTranslateTo('');
    };

    return (
        <div>
            <Breadcrumb items={[
                { label: t('home'), path: '/client/dashboard', icon: Home },
                { label: t('transcriptions'), path: '/client/transcriptions' },
                { label: t('breadcrumbNew') },
            ]} />

            <h2 style={{ color: '#1a3a6b', marginBottom: 28, fontSize: 26, fontWeight: 700 }}>
                {t('newAudioTranscription')}
            </h2>

            <div style={{
                background: 'white', borderRadius: 16,
                padding: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
                {/* ── Upload mode ── */}
                {!analysisId && (
                    <>
                        <FileDropZone
                            accept=".mp3,.wav,.m4a,.ogg,.mpeg,.mpga"
                            maxSizeMB={100}
                            formatLabel="MP3, WAV, M4A, OGG, MPEG"
                            icon={Music}
                            onFileSelected={(f) => { setFile(f); setError(''); }}
                        />

                        {/* ── Translation Language Selector ── */}
                        <div style={{ marginTop: 24 }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                marginBottom: 10,
                            }}>
                                <Globe size={18} color="#1a3a6b" />
                                <span style={{ color: '#1a3a6b', fontWeight: 700, fontSize: 14 }}>
                                    {t('translateResultTo') || 'Translate result to'}{' '}
                                    <span style={{ color: '#60a5fa', fontWeight: 400, fontSize: 13 }}>
                                        ({t('optional') || 'optional'})
                                    </span>
                                </span>
                            </div>

                            <div style={{ position: 'relative', display: 'inline-block', minWidth: 240 }}>
                                <button
                                    onClick={() => setLangDropdownOpen(o => !o)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        background: translateTo ? '#eff6ff' : '#f8fbff',
                                        border: `1.5px solid ${translateTo ? '#3b82f6' : '#d0e4f0'}`,
                                        borderRadius: 10, padding: '10px 16px',
                                        cursor: 'pointer', fontSize: 14, fontWeight: 600,
                                        color: translateTo ? '#1d4ed8' : '#555',
                                        width: '100%',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center' }}>{selectedLang.icon}</span>
                                    <span style={{ flex: 1, textAlign: 'left' }}>{selectedLang.label}</span>
                                    <ChevronDown
                                        size={16}
                                        style={{
                                            transform: langDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s',
                                            color: '#888',
                                        }}
                                    />
                                </button>

                                {langDropdownOpen && (
                                    <div style={{
                                        position: 'absolute', top: '110%', left: 0,
                                        background: 'white', borderRadius: 10,
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                        border: '1px solid #e0eaf4',
                                        zIndex: 100, overflow: 'hidden',
                                        minWidth: '100%',
                                        animation: 'fadeIn 0.15s ease',
                                    }}>
                                        {TRANSLATION_LANGUAGES.map(lang => (
                                            <button
                                                key={lang.code}
                                                onClick={() => {
                                                    setTranslateTo(lang.code);
                                                    setLangDropdownOpen(false);
                                                }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                    width: '100%', padding: '11px 16px',
                                                    background: translateTo === lang.code ? '#eff6ff' : 'white',
                                                    border: 'none',
                                                    borderBottom: '1px solid #f0f4f8',
                                                    cursor: 'pointer', fontSize: 14,
                                                    color: translateTo === lang.code ? '#1d4ed8' : '#333',
                                                    fontWeight: translateTo === lang.code ? 700 : 400,
                                                    textAlign: 'left',
                                                    transition: 'background 0.15s',
                                                }}
                                                onMouseEnter={e => {
                                                    if (translateTo !== lang.code) e.currentTarget.style.background = '#f8fbff';
                                                }}
                                                onMouseLeave={e => {
                                                    if (translateTo !== lang.code) e.currentTarget.style.background = 'white';
                                                }}
                                            >
                                                <span style={{ display: 'flex', alignItems: 'center' }}>{lang.icon}</span>
                                                <span>{lang.label}</span>
                                                {translateTo === lang.code && (
                                                    <span style={{ marginLeft: 'auto', color: '#3b82f6' }}>✓</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {translateTo && (
                                <p style={{
                                    marginTop: 8, fontSize: 12, color: '#60a5fa',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                }}>
                                    <Globe size={12} />
                                    {t('willTranslateTo') || 'The transcription will also be translated to'}{' '}
                                    <strong>{selectedLang.label}</strong>
                                </p>
                            )}
                        </div>

                        {error && (
                            <div style={{
                                marginTop: 16, padding: '12px 16px',
                                background: '#fff1f1', border: '1px solid #fecaca',
                                borderRadius: 8, color: '#dc2626',
                                fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <XCircle size={18} /> {error}
                            </div>
                        )}

                        {file && (
                            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".mp3,.wav,.m4a,.ogg,.mpeg,.mpga"
                                    style={{ display: 'none' }}
                                    onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) { setFile(f); setError(''); }
                                    }}
                                />
                                <button
                                    onClick={handleSubmit}
                                    disabled={uploading}
                                    style={{
                                        flex: 1, padding: '14px',
                                        background: uploading ? '#93c5fd' : '#1a3a6b',
                                        color: 'white', border: 'none', borderRadius: 8,
                                        fontSize: 16, fontWeight: 700,
                                        cursor: uploading ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        {uploading
                                            ? <>⏳ {t('uploading')}</>
                                            : <><AudioLines size={20} /> {t('startTranscription')}</>}
                                    </div>
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    style={{
                                        padding: '14px 18px', background: '#f0f4f8',
                                        color: '#1a3a6b', border: '1.5px solid #d0e4f0',
                                        borderRadius: 8, fontSize: 14, fontWeight: 600,
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                    }}
                                >
                                    <FolderOpen size={16} /> {t('chooseAnotherFile')}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* ── Result / polling mode ── */}
                {analysisId && (
                    <TranscriptionResultCard
                        analysisId={analysisId}
                        originalName={uploadedName}
                        onReset={handleReset}
                    />
                )}
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
            `}</style>
        </div>
    );
}