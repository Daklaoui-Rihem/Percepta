/**
 * NewTranscriptionForm.tsx — UPDATED
 *
 * Changes: after upload succeeds, captures analysisId and switches
 * to TranscriptionResultCard (polling mode). "Upload another" resets.
 *
 * Replace: frontend/src/components/Organisms/NewTranscriptionForm.tsx
 */

import { useState, useRef } from 'react';
import { Home, Music, AudioLines, XCircle, FolderOpen } from 'lucide-react';
import Breadcrumb from '../Atoms/Breadcrumb';
import FileDropZone from '../Molecules/FileDropZone';
import TranscriptionResultCard from '../Molecules/TranscriptionResultCard';
import { useTranslation } from '../../context/TranslationContext';
import { analysisApi } from '../../services/api';

export default function NewTranscriptionForm() {
    const { t } = useTranslation();

    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    // After upload: store analysisId → switch to result card
    const [analysisId, setAnalysisId] = useState<string | null>(null);
    const [uploadedName, setUploadedName] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async () => {
        if (!file) return;
        setUploading(true);
        setError('');
        try {
            // Backend returns { analysis: { id, originalName, ... }, queue: {...} }
            const res = await analysisApi.uploadAudio(file);
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
        </div>
    );
}