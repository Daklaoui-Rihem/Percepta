/**
 * frontend/src/services/analysisPolling.ts
 *
 * Utility to poll analysis status until it reaches 'done' or 'error'.
 * Use this after uploading a file to track async processing.
 *
 * Usage:
 *   import { pollAnalysisStatus } from '../services/analysisPolling';
 *
 *   const { transcription } = await pollAnalysisStatus(analysisId, {
 *       onProgress: (status) => setStatus(status),
 *   });
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface StatusResponse {
    id: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    errorMessage: string | null;
    transcription: string | null;
}

interface PollOptions {
    /** Called every time a new status is received */
    onProgress?: (status: StatusResponse['status']) => void;
    /** Polling interval in ms (default: 3000) */
    intervalMs?: number;
    /** Max wait time in ms before giving up (default: 10 minutes) */
    timeoutMs?: number;
}

/**
 * Polls GET /api/analyses/:id/status until done or error.
 * Returns the final result or throws on timeout / error status.
 */
export async function pollAnalysisStatus(
    analysisId: string,
    options: PollOptions = {}
): Promise<{ transcription: string }> {
    const {
        onProgress,
        intervalMs = 3000,
        timeoutMs = 10 * 60 * 1000,
    } = options;

    const token = localStorage.getItem('token');
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
            // Timeout guard
            if (Date.now() - startTime > timeoutMs) {
                clearInterval(interval);
                reject(new Error('Analysis timed out. Please try again or contact support.'));
                return;
            }

            try {
                const res = await fetch(`${BASE_URL}/analyses/${analysisId}/status`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data: StatusResponse = await res.json();

                onProgress?.(data.status);

                if (data.status === 'done') {
                    clearInterval(interval);
                    resolve({
                        transcription: data.transcription ?? '',
                    });
                } else if (data.status === 'error') {
                    clearInterval(interval);
                    reject(new Error(data.errorMessage ?? 'Processing failed'));
                }
                // 'pending' and 'processing' — keep polling
            } catch (err) {
                // Network error — keep polling (don't reject yet)
                console.warn('[Polling] Network error, retrying...', err);
            }
        }, intervalMs);
    });
}