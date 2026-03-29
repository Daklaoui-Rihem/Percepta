/**
 * NewVideoAnalysisForm — with async status polling
 *
 * After upload, the form polls GET /api/analyses/:id/status
 * every 3 seconds and shows live feedback (pending → processing → done).
 */

import { useState, useRef } from 'react';
import { Home, Video, PlayCircle, CheckCircle, XCircle, FolderOpen, Loader2 } from 'lucide-react';
import Breadcrumb from '../Atoms/Breadcrumb';
import FileDropZone from '../Molecules/FileDropZone';
import { useTranslation } from '../../context/TranslationContext';
import { analysisApi } from '../../services/api';
import { pollAnalysisStatus } from '../../services/analysisPolling';

type ProcessingStatus = 'idle' | 'uploading' | 'pending' | 'processing' | 'done' | 'error';

export default function NewVideoAnalysisForm() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ transcription: string; summary: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isProcessing = ['uploading', 'pending', 'processing'].includes(processingStatus);

  const statusLabel: Record<ProcessingStatus, string> = {
    idle: '',
    uploading: t('uploading'),
    pending: 'En file d\'attente...',
    processing: 'Analyse vidéo en cours...',
    done: t('completed'),
    error: t('failed'),
  };

  const handleSubmit = async () => {
    if (!file) return;

    setProcessingStatus('uploading');
    setError('');
    setResult(null);

    try {
      // Step 1: Upload → server returns 202 + analysisId
      const uploadResponse = await analysisApi.uploadVideo(file);
      const analysisId = uploadResponse.analysis?.id;

      if (!analysisId) throw new Error('No analysis ID returned from server');

      setProcessingStatus('pending');

      // Step 2: Poll for completion
      const finalResult = await pollAnalysisStatus(analysisId, {
        onProgress: (status) => {
          if (status === 'processing') setProcessingStatus('processing');
          else if (status === 'pending') setProcessingStatus('pending');
        },
        intervalMs: 3000,
        timeoutMs: 15 * 60 * 1000, // 15 min timeout for large files
      });

      setResult(finalResult);
      setProcessingStatus('done');
      setFile(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('uploadFailed'));
      setProcessingStatus('error');
    }
  };

  return (
    <div>
      <Breadcrumb items={[
        { label: t('home'), path: '/client/dashboard', icon: Home },
        { label: t('videoAnalysis'), path: '/client/video-analysis' },
        { label: t('breadcrumbNew') },
      ]} />

      <h2 style={{ color: '#1a3a6b', marginBottom: 28, fontSize: 26, fontWeight: 700 }}>
        {t('newVideoAnalysis')}
      </h2>

      <div style={{ background: 'white', borderRadius: 16, padding: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>

        {/* Drop zone — hidden while processing */}
        {processingStatus === 'idle' || processingStatus === 'error' ? (
          <FileDropZone
            accept=".mp4,.avi,.mov,.mkv,.webm"
            maxSizeMB={500}
            formatLabel="MP4, AVI, MOV, MKV, WEBM"
            icon={Video}
            onFileSelected={(f) => {
              setFile(f);
              setError('');
              setProcessingStatus('idle');
            }}
          />
        ) : null}

        {/* Processing status card */}
        {isProcessing && (
          <div style={{
            padding: '32px',
            background: '#f0f9ff',
            border: '2px solid #bae6fd',
            borderRadius: 12,
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <Loader2 size={48} color="#0ea5e9" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <p style={{ color: '#0369a1', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              {statusLabel[processingStatus]}
            </p>
            <p style={{ color: '#64748b', fontSize: 13 }}>
              Vous pouvez fermer cette page. Le résultat sera disponible dans votre historique.
            </p>

            {/* Status stepper */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24, alignItems: 'center' }}>
              {(['uploading', 'pending', 'processing', 'done'] as const).map((step, idx, arr) => {
                const stepIndex = arr.indexOf(processingStatus as never);
                const isActive = idx === stepIndex;
                const isDone = idx < stepIndex;

                return (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: isDone ? '#22c55e' : isActive ? '#0ea5e9' : '#e2e8f0',
                      color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                      transition: 'background 0.3s',
                    }}>
                      {isDone ? '✓' : idx + 1}
                    </div>
                    {idx < arr.length - 1 && (
                      <div style={{
                        width: 32, height: 2,
                        background: isDone ? '#22c55e' : '#e2e8f0',
                        transition: 'background 0.3s',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#fff1f1', border: '1px solid #ad1b1b', borderRadius: 8, color: '#ad1b1b', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <XCircle size={18} /> {error}
          </div>
        )}

        {/* Result */}
        {processingStatus === 'done' && result && (
          <div style={{ marginTop: 16 }}>
            <div style={{ padding: '12px 16px', background: '#eef8f8', border: '1px solid #16757a', borderRadius: 8, color: '#16757a', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <CheckCircle size={18} /> Analyse vidéo terminée !
            </div>

            {result.transcription && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ color: '#1a3a6b', marginBottom: 12 }}>Transcription</h4>
                <div style={{ background: '#f8fbff', border: '1px solid #d0e4f0', borderRadius: 8, padding: '16px', fontSize: 14, color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {result.transcription}
                </div>
              </div>
            )}

            {result.summary && (
              <div>
                <h4 style={{ color: '#1a3a6b', marginBottom: 12 }}>Résumé</h4>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '16px', fontSize: 14, color: '#166534', lineHeight: 1.7 }}>
                  {result.summary}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit + choose another file buttons */}
        {file && !isProcessing && processingStatus !== 'done' && (
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.avi,.mov,.mkv,.webm"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setFile(f); setError(''); setProcessingStatus('idle'); }
              }}
            />
            <button
              onClick={handleSubmit}
              style={{
                flex: 1, padding: '14px',
                background: '#2563eb', color: 'white',
                border: 'none', borderRadius: 8,
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <PlayCircle size={20} /> {t('startVideoAnalysis')}
              </div>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '14px 18px', background: '#f0f4f8',
                color: '#1a3a6b', border: '1.5px solid #d0e4f0',
                borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                whiteSpace: 'nowrap',
              }}
            >
              <FolderOpen size={16} /> {t('chooseAnotherFile')}
            </button>
          </div>
        )}

        {/* New upload button after completion */}
        {processingStatus === 'done' && (
          <button
            onClick={() => { setProcessingStatus('idle'); setFile(null); setError(''); setResult(null); }}
            style={{
              marginTop: 24, width: '100%', padding: '14px',
              background: '#f0f4f8', color: '#1a3a6b',
              border: '1.5px solid #d0e4f0', borderRadius: 8,
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {t('uploadAnotherVideo')}
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}