
import { User, Certificate } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
    const token = localStorage.getItem('token'); // Assuming you store JWT in localStorage on login
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
};

export const api = {
    // Auth
    register: async (userData: any) => {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    login: async (credentials: any) => {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    // Certificates
    getCertificates: async (filters?: { studentId?: string; teacherId?: string }): Promise<Certificate[]> => {
        const params = new URLSearchParams(filters as any).toString();
        const res = await fetch(`${API_URL}/certificates?${params}`, {
            headers: getHeaders()
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    uploadCertificate: async (data: any) => {
        const res = await fetch(`${API_URL}/certificates`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    updateCertificate: async (id: string, updates: any) => {
        const res = await fetch(`${API_URL}/certificates/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    // Users
    getUsers: async (role?: string): Promise<User[]> => {
        const params = role ? `?role=${role}` : '';
        const res = await fetch(`${API_URL}/users${params}`, {
            headers: getHeaders()
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    // AI
    analyzeCertificate: async (imageBase64: string) => {
        const res = await fetch(`${API_URL}/analyze`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ imageBase64 })
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    // Platforms
    getPlatforms: async (): Promise<any[]> => {
        const res = await fetch(`${API_URL}/platforms`, { headers: getHeaders() });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    addPlatform: async (platform: any) => {
        const res = await fetch(`${API_URL}/platforms`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(platform)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    // Classes
    getClasses: async (teacherId?: string): Promise<any[]> => {
        const params = teacherId ? `?teacherId=${teacherId}` : '';
        const res = await fetch(`${API_URL}/classes${params}`, { headers: getHeaders() });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    createClass: async (cls: any) => {
        const res = await fetch(`${API_URL}/classes`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(cls)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    enrollStudents: async (classId: string, studentIds: string[]) => {
        const res = await fetch(`${API_URL}/classes/${classId}/enroll`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ studentIds })
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    getClassStudents: async (classId: string) => {
        const res = await fetch(`${API_URL}/classes/${classId}/students`, { headers: getHeaders() });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }
};
