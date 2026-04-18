// frontend/src/services/api.ts
// Central API service — all backend calls go through here

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ── Helpers ────────────────────────────────────────────────────
function getToken(): string | null {
    return localStorage.getItem('token');
}

async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    auth = true
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (auth) {
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || 'Request failed');
    }

    return data as T;
}

// ── Auth ───────────────────────────────────────────────────────
export interface LoginResponse {
    token: string;
    user: {
        id: string;
        name: string;
        email: string;
        role: 'Client' | 'Admin' | 'SuperAdmin';
        tenantId: string | null;
        photoUrl: string;
        hasFirstLogin: boolean;
    };
}

export const authApi = {
    login: (email: string, password: string) =>
        request<LoginResponse>('POST', '/auth/login', { email, password }, false),
};

// ── User / Profile ─────────────────────────────────────────────
export interface UserProfile {
    _id: string;
    name: string;
    email: string;
    role: 'Client' | 'Admin' | 'SuperAdmin';
    tenantId: string | null;
    department: string;
    phone: string;
    adminLevel: string;
    photoUrl: string;
    isActive: boolean;
    userType: 'Entreprise' | 'Single person';
    createdAt: string;
}

export interface CreateUserPayload {
    name: string;
    email: string;
    password: string;
    role: string;
    department?: string;
    phone?: string;
    adminLevel?: string;
    userType?: string;
}

export interface UpdateUserPayload {
    name?: string;
    email?: string;
    department?: string;
    phone?: string;
    adminLevel?: string;
    isActive?: boolean;
    photoUrl?: string;
    userType?: string;
}

export const userApi = {
    getMyProfile: () =>
        request<UserProfile>('GET', '/users/me'),

    updateMyProfile: (data: UpdateUserPayload) =>
        request<{ message: string; user: UserProfile }>('PUT', '/users/me', data),

    changeMyPassword: (currentPassword: string, newPassword: string) =>
        request<{ message: string }>('PUT', '/users/me/password', { currentPassword, newPassword }),

    uploadAvatar: (file: File) => {
        const formData = new FormData();
        formData.append('avatar', file);
        return fetch(`${BASE_URL}/users/me/avatar`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
            body: formData,
        }).then(async res => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Upload failed');
            return data as { message: string; photoUrl: string };
        });
    },

    getAllUsers: () =>
        request<UserProfile[]>('GET', '/users'),

    createUser: (data: CreateUserPayload) =>
        request<{ message: string; user: UserProfile }>('POST', '/users/create', data),

    updateUser: (id: string, data: UpdateUserPayload) =>
        request<{ message: string; user: UserProfile }>('PUT', `/users/${id}`, data),

    deleteUser: (id: string) =>
        request<{ message: string }>('DELETE', `/users/${id}`),

    bulkDeleteUsers: (userIds: string[]) =>
        request<{ message: string }>('POST', '/users/bulk-delete', { userIds }),

    bulkUpdateUsers: (userIds: string[], updates: unknown) =>
        request<{ message: string }>('POST', '/users/bulk-update', { userIds, updates }),

    checkEmail: (email: string) =>
        request<{ exists: boolean }>('GET', `/users/check-email?email=${encodeURIComponent(email)}`),
};

// ── Settings ───────────────────────────────────────────────────
export interface SmtpSettings {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    smtpFrom: string;
    smtpSecure: string;
}

export const settingsApi = {
    getSmtp: () =>
        request<SmtpSettings>('GET', '/settings/smtp'),

    saveSmtp: (data: SmtpSettings) =>
        request<{ message: string }>('PUT', '/settings/smtp', data),

    testSmtp: (testEmail: string) =>
        request<{ message: string }>('POST', '/settings/smtp/test', { testEmail }),
};

// ── Extracted Entities Type (NEW) ──────────────────────────────
export interface ExtractedEntities {
    location: string | null;
    phones: string[];
    people_count: number | null;
    incident_type: string | null;
    severity: 'low' | 'medium' | 'high' | 'critical' | null;
    victim_names: string[];
    caller_name: string | null;
    date_mentioned: string | null;
    time_mentioned: string | null;
    additional_details: string | null;
    confidence: number | null;
    extraction_method: 'llm_anthropic' | 'llm_openai' | 'rule_based' | null;
}

// ── Video analysis types ───────────────────────────────────────
export interface VideoDetection {
    class: string;
    confidence: number;
    bbox: [number, number, number, number];
}

export interface VideoKeyframe {
    frame_index: number;
    timestamp: number;
    timestamp_str: string;
    filename: string;
    is_incident: boolean;
    people_count: number;
    detections: VideoDetection[];
}

export interface VideoIncident {
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    timestamp: number;
    timestamp_str: string;
    frame_index?: number;
    frame_file?: string;
    details?: string;
}

export interface VideoAnalysisResult {
    incidents: VideoIncident[];
    keyframes: VideoKeyframe[];
    summary: string;
    incident_count: number;
    keyframe_count: number;
    duration: number;
    fps: number;
    total_frames: number;
    resolution: string;
    avg_people: number;
    detection_model: string;
}

// ── Analyses ───────────────────────────────────────────────────
export interface AnalysisRecord {
    _id: string;
    originalName: string;
    size: number;
    type: 'audio' | 'video' | 'groupActivity';
    status: 'pending' | 'processing' | 'done' | 'error';
    createdAt: string;
    transcription?: string;
    translatedText?: string;
    translationLang?: string;
    summary?: string;
    errorMessage?: string;
    hasPdf?: boolean;
    pdfGeneratedAt?: string | null;
    extractedEntities?: ExtractedEntities | null;   // ← NEW
}

export const analysisApi = {
    uploadAudio: (file: File, translateTo?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        if (translateTo) formData.append('translateTo', translateTo);
        return fetch(`${BASE_URL}/analyses/upload/audio`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
            body: formData,
        }).then(async res => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Upload failed');
            return data;
        });
    },

    uploadVideo: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return fetch(`${BASE_URL}/analyses/upload/video`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
            body: formData,
        }).then(async res => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Upload failed');
            return data;
        });
    },

    getMyAnalyses: () =>
        request<AnalysisRecord[]>('GET', '/analyses'),

    getAnalysisById: (id: string) =>
        request<AnalysisRecord>('GET', `/analyses/${id}`),

    deleteAnalysis: (id: string) =>
        request<{ message: string }>('DELETE', `/analyses/${id}`),

    getAnalysisStatus: (id: string) =>
        request<{
            id: string;
            status: 'pending' | 'processing' | 'done' | 'error';
            errorMessage: string | null;
            transcription: string | null;
            translatedText: string | null;
            translationLang: string | null;
            summary: string | null;
            extractedEntities: ExtractedEntities | null;   // ← NEW
            hasPdf: boolean;
            pdfGeneratedAt: string | null;
        }>('GET', `/analyses/${id}/status`),

    retryAnalysis: (id: string) =>
        request<{ message: string; queue: { jobId: string } }>('POST', `/analyses/${id}/retry`),

    downloadReport: async (id: string, originalName?: string): Promise<void> => {
        const token = getToken();
        const res = await fetch(`${BASE_URL}/analyses/${id}/report`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || 'Download failed');
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        const safeName = (originalName || 'report')
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .substring(0, 40);

        a.href = url;
        a.download = `Percepta_Report_${safeName}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    generateReport: (id: string) =>
        request<{ message: string; hasPdf: boolean }>('POST', `/analyses/${id}/report/generate`),

    getAllAnalyses: () =>
        request<AnalysisRecord[]>('GET', '/analyses/admin/all'),

    getUserAnalyses: (userId: string) =>
        request<AnalysisRecord[]>('GET', `/analyses/user/${userId}`),

    getVideoResult: (id: string) =>
        request<{ status: string; videoAnalysisData: VideoAnalysisResult | null }>(
            'GET', `/analyses/${id}/video-result`
        ),
};

// ── Auth helpers ───────────────────────────────────────────────
export function saveSession(token: string, user: LoginResponse['user']) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

export function clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

export function getSession(): LoginResponse['user'] | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
}