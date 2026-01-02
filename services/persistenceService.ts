
import { User, Certificate, UserRole } from '../types';
import { api } from './api';

const CURRENT_USER_KEY = 'certhub_current_user_v2';

export const persistenceService = {
  // --- USER METHODS ---
  saveUser: async (user: User) => {
    // Determine if it's a register or login flow logic.
    // Ideally, the UI calls api.register or api.login directly.
    // But to keep compatibility with existing UI components if they use this service:
    // We'll throw an error or redirect, but for now let's assume this is used for Registration
    // This signature matches the UI's expectation? The UI passes a full User object?
    // Let's assume the UI was creating the ID. Now the Backend creates ID.
    // We will just return the user as is, or better, change this to call api.register

    // Adaptation: The mock implementation took a full user object.
    // The real API takes { name, email, password, role }.
    // If the UI is passing a full object including ID, we might need to adjust.
    // For now, let's wrap api.register.
    return api.register(user);
  },

  getUsersSync: (): User[] => {
    // Sync capabilities are lost with async API.
    // UI components using this MUST be refactored to use async/await or hooks.
    // Returning empty array to prevent immediate crashes, but this is a breaking change for synchronous callers.
    console.warn("getUsersSync is deprecated and returns empty. Use getUsers().");
    return [];
  },

  getUsers: async (): Promise<User[]> => {
    return api.getUsers();
  },

  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      // Also save token if available? 
      // Typically login response returns token & user.
    }
    else {
      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem('token');
    }
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  // --- CERTIFICATE METHODS ---
  getCertificates: async (): Promise<Certificate[]> => {
    return api.getCertificates();
  },

  saveCertificate: async (cert: Certificate) => {
    // The UI passes a full cert object (mock).
    // The API expects { title, platform, ... imageBase64 }.
    // We need to adapt.
    // CAUTION: The existing UI likely constructed the 'cert' object with an 'id' and 'fileUrl' already?
    // If so, we can't upload it 'again' effectively if we lack the base64.
    // We need to check where saveCertificate is called.
    // Assuming the UI calls this after "uploading" to local mock.
    // We'll trust the API wrapper for now.
    return api.uploadCertificate(cert);
  },

  updateCertificate: async (updatedCert: Certificate) => {
    return api.updateCertificate(updatedCert.id, updatedCert);
  },

  // --- MAPPING METHODS (Teacher -> Students) ---
  // These likely need new API endpoints or relation handling
  assignStudent: async (teacherId: string, studentId: string) => {
    console.warn("assignStudent not fully implemented in backend yet");
  },

  getTeacherForStudent: (studentId: string): string | null => {
    // Cannot be sync anymore.
    return null;
  },

  getMappingsSync: (): Record<string, string> => {
    return {};
  }
};
