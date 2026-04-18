/**
 * NewVideoAnalysisForm — with async status polling
 *
 * After upload, the form polls GET /api/analyses/:id/status
 * every 3 seconds and shows live feedback (pending → processing → done).
 */

import { useState, useRef } from 'react';
import { Home, Video, PlayCircle, XCircle, FolderOpen } from 'lucide-react';
import Breadcrumb from '../Atoms/Breadcrumb';
import FileDropZone from '../Molecules/FileDropZone';
import { useTranslation } from '../../context/TranslationContext';
import { analysisApi } from '../../services/api';
import VideoResultCard from '../Molecules/VideoResultCard';
export default function NewVideoAnalysisForm() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
        const res = await analysisApi.uploadVideo(file);
        setAnalysisId(res.analysis?.id || res.analysis?._id);
        setUploadedName(res.analysis?.originalName || file.name);
        setFile(null);
    } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t('uploadFailed'));
    } finally {
        setUploading(false);
    }
  };

  const handleReset = () => { setAnalysisId(null); setUploadedName(''); setFile(null); setError(''); };

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

        {/* Result card shown after upload */}
        {analysisId && (
            <VideoResultCard
                analysisId={analysisId}
                originalName={uploadedName}
                onReset={handleReset}
            />
        )}

        {/* Upload form shown before upload */}
        {!analysisId && (
            <>
                <FileDropZone
                  accept=".mp4,.avi,.mov,.mkv,.webm"
                  maxSizeMB={500}
                  formatLabel="MP4, AVI, MOV, MKV, WEBM"
                  icon={Video}
                  onFileSelected={(f) => {
                    setFile(f);
                    setError('');
                  }}
                />

                {error && (
                  <div style={{ marginTop: 16, padding: '12px 16px', background: '#fff1f1', border: '1px solid #ad1b1b', borderRadius: 8, color: '#ad1b1b', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <XCircle size={18} /> {error}
                  </div>
                )}

                {file && (
                  <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".mp4,.avi,.mov,.mkv,.webm"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { setFile(f); setError(''); }
                      }}
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={uploading}
                      style={{
                        flex: 1, padding: '14px',
                        background: uploading ? '#93c5fd' : '#2563eb', color: 'white',
                        border: 'none', borderRadius: 8,
                        fontSize: 16, fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        {uploading ? <>⏳ {t('uploading')}</> : <><PlayCircle size={20} /> {t('startVideoAnalysis')}</>}
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
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <FolderOpen size={16} /> {t('chooseAnotherFile')}
                    </button>
                  </div>
                )}
            </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}