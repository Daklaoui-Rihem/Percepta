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
}

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

export interface UpdateUserPayload {
    name?: string;
    email?: string;
    department?: string;
    phone?: string;
    adminLevel?: string;
    isActive?: boolean;
    photoUrl?: string;
}

export const userApi = {
    // Profile
    getMyProfile: () =>
        request<UserProfile>('GET', '/users/me'),

    updateMyProfile: (data: UpdateUserPayload) =>
        request<{ message: string; user: UserProfile }>('PUT', '/users/me', data),

    changeMyPassword: (currentPassword: string, newPassword: string) =>
        request<{ message: string }>('PUT', '/users/me/password', { currentPassword, newPassword }),

    // User management
    getAllUsers: () =>
        request<UserProfile[]>('GET', '/users'),

    createUser: (data: CreateUserPayload) =>
        request<{ message: string; user: UserProfile }>('POST', '/users/create', data),

    updateUser: (id: string, data: UpdateUserPayload) =>
        request<{ message: string; user: UserProfile }>('PUT', `/users/${id}`, data),

    deleteUser: (id: string) =>
        request<{ message: string }>('DELETE', `/users/${id}`),
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